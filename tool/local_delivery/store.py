"""Immutable local publication of the baker's final ZIP (no engine execution)."""
import hashlib
import io
import json
import os
import re
import shutil
import stat
import threading
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

FORMAT = 'df.firework-resource/1'
MAX_EXPANDED = 2 * 1024 ** 3


def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + '.tmp-' + uuid.uuid4().hex)
    try:
        temp.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')
        os.replace(temp, path)
    finally:
        temp.unlink(missing_ok=True)


def safe_relative(value):
    if not isinstance(value, str) or '\\' in value or ':' in value:
        raise ValueError('资源路径无效')
    p = PurePosixPath(value)
    if p.is_absolute() or not p.parts or any(x in ('..', '.') for x in value.split('/')):
        raise ValueError('资源路径不能离开交付目录')
    for part in p.parts:
        if not part or part.rstrip(' .') != part or re.search(r'[<>"|?*\x00-\x1f]', part):
            raise ValueError('资源文件名不适用于 Windows')
        if re.fullmatch(r'(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?', part, re.I):
            raise ValueError('资源文件名为保留名称')
    return p


class Store:
    def __init__(self, config):
        self.config = Path(config)
        self.lock = threading.RLock()
        self.root = None
        if self.config.exists():
            value = json.loads(self.config.read_text(encoding='utf-8'))
            self.root = Path(value['outputRoot']).resolve()

    def set_root(self, value):
        p = Path(value)
        if not p.is_absolute():
            raise ValueError('请选择绝对路径')
        p.mkdir(parents=True, exist_ok=True)
        p = p.resolve()
        probe = p / ('.write-check-' + uuid.uuid4().hex)
        try:
            probe.write_bytes(b'')
        finally:
            probe.unlink(missing_ok=True)
        with self.lock:
            atomic_json(self.config, {'outputRoot': str(p)})
            self.root = p
        return {'outputRoot': str(p)}

    def settings(self):
        return {'outputRoot': str(self.root) if self.root else None}

    def _index(self):
        if not self.root:
            return []
        p = self.root / 'workspace-resources.json'
        return json.loads(p.read_text(encoding='utf-8')).get('resources', []) if p.exists() else []

    def resources(self):
        with self.lock:
            return {'format': FORMAT, 'resources': [self.receipt(r['deliveryId']) for r in self._index()]}

    def receipt(self, delivery_id):
        with self.lock:
            r = next((x for x in self._index() if x['deliveryId'] == delivery_id), None)
            if not r:
                raise FileNotFoundError('交付记录不存在')
            base = self.root.joinpath(*safe_relative(r['relativeDirectory']).parts)
            if not base.resolve().is_relative_to(self.root.resolve()) or any(p.is_symlink() for p in [base, *base.parents]):
                raise ValueError('资源目录不可通过链接离开交付根目录')
            data = json.loads((base / 'workspace-resource.json').read_text(encoding='utf-8'))
            for item in data['files']:
                p = base.joinpath(*safe_relative(item['path']).parts)
                if not p.resolve().is_relative_to(base.resolve()) or not p.is_file() or any(x.is_symlink() for x in [p, *p.parents]) or hashlib.sha256(p.read_bytes()).hexdigest() != item['sha256']:
                    raise ValueError('资源已缺失或变更：' + item['path'])
            data['directory'] = str(base)
            for package in data['packages']:
                package['directory'] = str(base / package['relativeDirectory'])
            receipt = self.root / '.workspace' / 'receipts' / (delivery_id + '.json')
            data['importReceipt'] = json.loads(receipt.read_text(encoding='utf-8')) if receipt.exists() else None
            return data

    def record_import(self, delivery_id, state):
        r = self.receipt(delivery_id)
        if not isinstance(state, dict) or not isinstance(state.get('rows'), list):
            raise ValueError('导入回执格式不正确')
        # Reported by the existing importer UI; this is never engine verification.
        value = {'deliveryId': r['deliveryId'], 'reportedAt': datetime.now(timezone.utc).isoformat(),
                 'source': 'existing-importer-ui', 'enginePlaybackVerified': False, 'rows': state['rows']}
        atomic_json(self.root / '.workspace' / 'receipts' / (delivery_id + '.json'), value)
        return value

    def publish(self, raw, name, metadata=None):
        metadata = metadata or {}
        if not isinstance(metadata, dict):
            raise ValueError('元数据格式不正确')
        name = re.sub(r'\.zip$', '', name, flags=re.I)
        safe_relative(name)
        if '/' in name:
            raise ValueError('包名不能含目录')
        with self.lock:
            if not self.root:
                raise ValueError('请先设置资源导出目录')
            root = self.root
            stage = root / '.workspace' / 'staging' / uuid.uuid4().hex
            if not stage.resolve().is_relative_to(root.resolve()) or any(p.is_symlink() for p in [stage, *stage.parents]):
                raise ValueError('交付临时目录不可通过链接离开根目录')
            stage.mkdir(parents=True)
            try:
                files, seen = [], set()
                with zipfile.ZipFile(io.BytesIO(raw)) as z:
                    if sum(x.file_size for x in z.infolist()) > MAX_EXPANDED or len(z.infolist()) > 10000:
                        raise ValueError('资源包过大')
                    for info in z.infolist():
                        if info.is_dir():
                            safe_relative(info.filename.rstrip('/'))
                            continue
                        p = safe_relative(info.filename)
                        if p.as_posix().casefold() in seen or stat.S_ISLNK(info.external_attr >> 16):
                            raise ValueError('资源包含重名文件或链接')
                        seen.add(p.as_posix().casefold())
                        if p.name == 'workspace-resource.json':
                            raise ValueError('资源包不能覆盖交付索引')
                        payload = z.read(info)  # ZIP CRC verified here, before publication.
                        target = stage.joinpath(*p.parts)
                        target.parent.mkdir(parents=True, exist_ok=True)
                        target.write_bytes(payload)
                        files.append({'path': p.as_posix(), 'bytes': len(payload), 'sha256': hashlib.sha256(payload).hexdigest()})
                packages = []
                for item in files:
                    if not re.search(r'(^|/)cascade(_mobile|_low)?\.json$', item['path']):
                        continue
                    config_path = PurePosixPath(item['path'])
                    config = json.loads((stage / item['path']).read_text(encoding='utf-8-sig'))
                    if config.get('format') != 'fwl.cascade/1' or not config.get('emitters'):
                        raise ValueError('不是完整的 Cascade 资源配置：' + item['path'])
                    for texture in [*config.get('textures', {}).values(), *config.get('extras', {}).values()]:
                        if not isinstance(texture, dict) or not texture.get('file'):
                            continue
                        ref = config_path.parent / safe_relative(texture['file'])
                        if ref.as_posix().casefold() not in seen:
                            raise ValueError('配置引用缺文件：' + ref.as_posix())
                    packages.append({'relativeDirectory': config_path.parent.as_posix(), 'configFile': config_path.name,
                                     'platform': 'mobile' if '_mobile' in config_path.name else 'low' if '_low' in config_path.name else 'pc',
                                     'name': config.get('name') or name})
                if not packages:
                    raise ValueError('资源包中没有完整的 cascade.json 配置')
                canonical = json.dumps(sorted(files, key=lambda x: x['path']), sort_keys=True).encode()
                revision = hashlib.sha256(canonical).hexdigest()[:20]
                resource_id = hashlib.sha256(name.casefold().encode()).hexdigest()[:16]
                delivery_id = resource_id + '-' + revision
                existing = next((r for r in self._index() if r['deliveryId'] == delivery_id), None)
                if existing:
                    return self.receipt(delivery_id)
                relative = name + '/revisions/' + revision
                target = root / relative
                if not target.resolve().is_relative_to(root.resolve()) or any(p.is_symlink() for p in [target, *target.parents] if p != root.parent):
                    raise ValueError('修订目录不可通过链接离开交付根目录')
                if target.exists():
                    raise ValueError('该修订目录已存在但无完整索引，请核对目录')
                data = {'format': FORMAT, 'resourceId': resource_id, 'revisionId': revision, 'deliveryId': delivery_id,
                        'name': name, 'createdAt': datetime.now(timezone.utc).isoformat(), 'status': 'complete',
                        'relativeDirectory': relative, 'files': files, 'packages': packages, 'metadata': metadata,
                        'thumbnail': {'status': 'missing', 'reason': '尚未生成同修订引擎回放缩略图'}}
                thumb = metadata.pop('thumbnailData', None)
                if thumb:
                    import base64
                    if not isinstance(thumb, str) or not thumb.startswith('data:image/png;base64,'):
                        raise ValueError('缩略图格式无效')
                    pixels = base64.b64decode(thumb.split(',', 1)[1], validate=True)
                    if len(pixels) > 8 * 1024 ** 2 or not pixels.startswith(b'\x89PNG\r\n\x1a\n'):
                        raise ValueError('缩略图格式无效')
                    (stage / 'workspace-thumbnail.png').write_bytes(pixels)
                    data['files'].append({'path': 'workspace-thumbnail.png', 'bytes': len(pixels), 'sha256': hashlib.sha256(pixels).hexdigest()})
                    data['thumbnail'] = {'status': 'ready', 'file': 'workspace-thumbnail.png', 'source': 'baker-final-product-replay', 'revisionId': revision}
                atomic_json(stage / 'workspace-resource.json', data)
                target.parent.mkdir(parents=True, exist_ok=True)
                os.rename(stage, target)
                try:
                    index = self._index()
                    index.append({k: data[k] for k in ('deliveryId', 'resourceId', 'revisionId', 'relativeDirectory', 'name')})
                    atomic_json(root / 'workspace-resources.json', {'format': FORMAT, 'resources': index})
                except Exception:
                    # Roll back only this new, verified task directory.
                    if target.resolve().is_relative_to(root.resolve()) and not target.is_symlink():
                        shutil.rmtree(target)
                    raise
                return self.receipt(delivery_id)
            finally:
                if stage.exists() and stage.resolve().is_relative_to(root.resolve()) and not stage.is_symlink():
                    shutil.rmtree(stage)

    def resource_file(self, delivery_id, relative):
        r = self.receipt(delivery_id)
        p = safe_relative(relative).as_posix()
        if p not in {x['path'] for x in r['files']}:
            raise FileNotFoundError('资源文件不存在')
        return Path(r['directory']) / p
