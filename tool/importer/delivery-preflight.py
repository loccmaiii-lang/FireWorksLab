"""私有交付边界：消费 23 的包级规则，不连接或写入 UE。"""
import argparse
import base64
import importlib.util
import json
import os
import sys
from pathlib import Path

GATE = Path('F:/FireWorksLab/tool/local_delivery/fx_gate.py')

def inspect(directory, register=False, proofs=None, root=None):
    if proofs is not None and not isinstance(proofs, dict):
        raise ValueError('贴图核验记录必须是JSON对象，尚未登记')
    directory = Path(directory).resolve()
    package = next((p for p in [directory, *directory.parents] if (p/'workspace-resource.json').is_file()), directory)
    if root is None:
        settings = json.loads((Path.home()/'.fireworkslab/delivery-settings.json').read_text(encoding='utf-8-sig'))
        root = settings['outputRoot']
    root = Path(root).resolve()
    if os.path.commonpath([root, package]) != str(root):
        raise ValueError('交付目录必须位于已配置的资源根目录内')
    spec = importlib.util.spec_from_file_location('fwl_gate', GATE)
    gate = importlib.util.module_from_spec(spec); spec.loader.exec_module(gate)
    result = gate.check(package, root)
    if register and result['ok']:
        gate.register(result, root, package.name)
        registry = gate.load_registry(root)
        registry['ueProofs'] = {**registry.get('ueProofs', {}), **(proofs or {})}
        target=root/gate.REGISTRY;temp=target.with_suffix('.private.tmp')
        temp.write_text(json.dumps(registry,ensure_ascii=False,indent=1),encoding='utf-8');temp.replace(target)
    result.update(root=str(root),package=str(package),registry=gate.load_registry(root))
    return result

def main(argv=None):
    p=argparse.ArgumentParser();p.add_argument('directory',nargs='?');p.add_argument('--directory-base64');p.add_argument('--register',action='store_true')
    inputs=p.add_mutually_exclusive_group();inputs.add_argument('--proofs');inputs.add_argument('--proofs-stdin',action='store_true')
    a=p.parse_args(argv)
    try:
        if a.proofs_stdin and not a.register:
            raise ValueError('标准输入证明仅供交付登记使用')
        raw=sys.stdin.buffer.read().decode('utf-8') if a.proofs_stdin else (a.proofs or '{}')
        proofs=json.loads(raw)
        if not isinstance(proofs,dict):
            raise ValueError('贴图核验记录必须是JSON对象，尚未登记')
        directory=base64.b64decode(a.directory_base64).decode('utf-8') if a.directory_base64 else a.directory
        result=inspect(directory,a.register,proofs);print(json.dumps(result,ensure_ascii=False));return 0 if result['ok'] else 1
    except (OSError,ValueError) as error:
        print(str(error),file=sys.stderr);return 2

if __name__ == '__main__':
    raise SystemExit(main())
