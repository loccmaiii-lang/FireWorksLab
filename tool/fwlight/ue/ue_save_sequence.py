# -*- coding: utf-8 -*-
# 在 UE4.24 编辑器内运行（Python 2.7）。保存序列资产。
#   job = {"sequence_asset": "/Game/...", "out": "<结果.json>", "only_if_dirty": true}
# 资产注册表加载中（刚打开大地图/刚启动编辑器）时 EditorAssetLibrary 会拒绝保存，
# 这里返回 code=ASSET_REGISTRY_LOADING，由宿主机 fwlight.py 等待后重试。
from __future__ import print_function
import io
import json
import sys

import unreal


def registry_loading():
    try:
        return bool(unreal.AssetRegistryHelpers.get_asset_registry().is_loading_assets())
    except Exception:
        return False


def main(job_path):
    job = json.load(io.open(job_path, encoding='utf-8'))
    res = {'ok': False, 'job': job}
    try:
        seq = unreal.load_asset(job['sequence_asset'])
        if seq is None:
            raise RuntimeError('load_asset 失败')
        pkg = seq.get_outermost().get_name()
        dirty = pkg in [p.get_name() for p in unreal.EditorLoadingAndSavingUtils.get_dirty_content_packages()]
        res['was_dirty'] = dirty
        if job.get('only_if_dirty', True) and not dirty:
            res['ok'] = True
            res['saved'] = False
            res['note'] = 'not dirty'
        elif registry_loading():
            res['code'] = 'ASSET_REGISTRY_LOADING'
            res['error'] = 'AssetRegistry is loading'
        else:
            ok = unreal.EditorAssetLibrary.save_loaded_asset(seq, False)
            res['saved'] = bool(ok)
            res['ok'] = bool(ok)
            if not ok:
                res['error'] = 'save_loaded_asset 返回 False（查看 Output Log 的 LogEditorScripting / LogSavePackage）'
    except Exception:
        import traceback
        res['error'] = traceback.format_exc()
    with io.open(job['out'], 'w', encoding='utf-8') as f:
        f.write(unicode(json.dumps(res, indent=1, ensure_ascii=True)))
    print('save ok=%s saved=%s %s' % (res['ok'], res.get('saved'), res.get('code', '')))


main(sys.argv[1])
