# -*- coding: utf-8 -*-
"""配置读取 / 路径解析等公共函数（宿主机 Python 3.8+）。"""
import copy
import hashlib
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # 交接包根目录
OUT_DIR = os.path.join(ROOT, 'out')
BACKUP_DIR = os.path.join(ROOT, 'backup')
UE_DIR = os.path.join(ROOT, 'ue')


def load_config(path=None):
    path = path or os.path.join(ROOT, 'config.json')
    with open(path, encoding='utf-8') as f:
        cfg = json.load(f)
    cfg['_path'] = os.path.abspath(path)
    cfg['_base'] = os.path.dirname(os.path.abspath(path))
    return cfg


def resolve(cfg, p):
    """相对路径以 config.json 所在目录为基准。"""
    if p is None:
        return None
    p = os.path.expanduser(p)
    if not os.path.isabs(p):
        p = os.path.join(cfg['_base'], p)
    return os.path.normpath(p)


def model_params(cfg, light):
    m = copy.deepcopy(cfg['model'])
    m.update(cfg.get('model_overrides', {}).get(light, {}) or {})
    return m


def light_info(cfg, light):
    lights = cfg.get('lights', {})
    if light not in lights:
        raise SystemExit('config.json 的 lights 中没有 "%s"，可选: %s' % (light, ', '.join(lights)))
    li = dict(lights[light])
    li.setdefault('binding', light)
    li.setdefault('component', 'LightComponent0')
    li.setdefault('level_actor', None)
    li.setdefault('curve_from', None)
    li.setdefault('intensity_scale', 1.0)
    li.setdefault('intensity_offset', 0.0)
    return li


def asset_to_file(cfg, asset_path, exts=('.uasset', '.umap')):
    """/Game/A/B -> <project_root>/Content/A/B.uasset|.umap"""
    ap = asset_path.split('.')[0]
    if not ap.startswith('/Game/'):
        raise ValueError('只支持 /Game/ 开头的资产路径: %s' % asset_path)
    rel = ap[len('/Game/'):]
    base = os.path.join(cfg['ue']['project_root'], 'Content', *rel.split('/'))
    for e in exts:
        if os.path.exists(base + e):
            return os.path.normpath(base + e)
    return os.path.normpath(base + exts[0])


def ensure_dirs():
    for d in (OUT_DIR, BACKUP_DIR):
        os.makedirs(d, exist_ok=True)


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def is_ascii(s):
    try:
        s.encode('ascii')
        return True
    except UnicodeEncodeError:
        return False


def write_json(path, obj, indent=None):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=indent)


def read_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)
