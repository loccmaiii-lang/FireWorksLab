"""按平台整理已核验的原生文件，不改写文件内容。"""
import hashlib
import json
import shutil
from pathlib import PurePosixPath

CATEGORIES = {'firework': '烟花', 'tail': '尾缀'}
SIZES = {'small': '小', 'medium': '中', 'large': '大', 'unclassified': '未分类'}
PLATFORMS = {'pc': 'PC', 'mobile': '手机', 'low': '低配'}


def classification(metadata):
    value = metadata.get('classification') or {}
    if not isinstance(value, dict):
        raise ValueError('资源分类格式不正确')
    category = value.get('category', 'firework')
    size = value.get('size', 'unclassified')
    if category not in CATEGORIES or size not in SIZES:
        raise ValueError('资源分类必须使用已定义的类型与尺寸')
    return {'category': category, 'size': size}


def container(name, value):
    return '/'.join((CATEGORIES[value['category']], SIZES[value['size']], name))


def arrange_platforms(source, destination, files, packages):
    """每个平台放完整配置和引用贴图。

    原导入器禁止跨包目录引用，因此共用贴图在各平台保留副本。
    其余配方、曲线和说明文件保留原名，放在资料目录。
    """
    by_path = {f['path']: f for f in files}
    consumed, written, result = set(), {}, []

    def copy(original, relative):
        item = by_path[original]
        key = relative.casefold()
        if key in written:
            if written[key]['sha256'] != item['sha256']:
                raise ValueError('平台分类产生重名文件：' + relative)
            return
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source / original, target)
        # 发布索引和 ZIP 前读回核验复制文件。
        if hashlib.sha256(target.read_bytes()).hexdigest() != item['sha256']:
            raise ValueError('平台文件写入校验失败：' + relative)
        written[key] = {**item, 'path': relative}

    for package in packages:
        original_dir = PurePosixPath(package['relativeDirectory'])
        output_dir = PurePosixPath(PLATFORMS[package['platform']]) / original_dir
        config_name = (original_dir / package['configFile']).as_posix()
        config = json.loads((source / config_name).read_text(encoding='utf-8-sig'))
        names = {config_name}
        for texture in [*config.get('textures', {}).values(), *config.get('extras', {}).values()]:
            if isinstance(texture, dict) and texture.get('file'):
                names.add((original_dir / texture['file']).as_posix())
        for name in sorted(names):
            relative = PurePosixPath(name).relative_to(original_dir)
            copy(name, (output_dir / relative).as_posix())
        consumed.update(names)
        result.append({**package, 'relativeDirectory': output_dir.as_posix()})

    for item in files:
        if item['path'] not in consumed:
            copy(item['path'], '资料/' + item['path'])
    return sorted(written.values(), key=lambda f: f['path']), result
