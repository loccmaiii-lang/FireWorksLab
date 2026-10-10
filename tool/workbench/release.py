"""同一源码生成离线包，再覆盖固定工具文件；不操作个人节目或浏览器草稿。"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import zipfile

SOURCE = Path(__file__).resolve().parent
TOOL = SOURCE.parent
HTML = '烟花编排工作台.html'
MANUAL = '烟花编排工作台_使用说明.html'
ZIP = '烟花编排工作台-离线包.zip'
FILES = [HTML, HTML + '.build.json', MANUAL]
SETUP = Path.home() / '.fireworkslab/workbench-release.json'


def sha256(file):
    return hashlib.sha256(Path(file).read_bytes()).hexdigest()


def verify_artifact(html, source):
    manifest = json.loads(Path(str(html) + '.build.json').read_text(encoding='utf-8'))
    if manifest['sha256'] != sha256(html):
        raise ValueError('HTML指纹不一致，停止覆盖。')
    for name, expected in manifest['sourceFiles'].items():
        file = (source / name).resolve()
        if not file.is_relative_to(source.resolve()) or not file.is_file() or sha256(file) != expected:
            raise ValueError('源码与离线产物不一致，请先运行 npm run release：' + name)
    return manifest


def publish_files(source, target, names):
    """先备齐新旧文件；覆盖失败回滚，目录内其他文件完全不动。"""
    source, target = Path(source).resolve(), Path(target).resolve()
    if source == target:
        return
    target.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.df-update-', dir=target) as temporary:
        scratch = Path(temporary)
        fresh, backup = scratch / 'new', scratch / 'old'
        fresh.mkdir()
        backup.mkdir()
        for name in names:
            if Path(name).name != name:
                raise ValueError('只允许更新明确命名的工具文件')
            shutil.copy2(source / name, fresh / name)
            if (target / name).exists():
                shutil.copy2(target / name, backup / name)
        changed = []
        try:
            for name in names:
                os.replace(fresh / name, target / name)
                changed.append(name)
        except OSError:
            for name in reversed(changed):
                if (backup / name).exists():
                    os.replace(backup / name, target / name)
                else:
                    (target / name).unlink()
            raise


def make_zip(directory, names, archive):
    with zipfile.ZipFile(directory / archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
        for name in names:
            bundle.write(directory / name, name)
    with zipfile.ZipFile(directory / archive) as bundle:
        if bundle.testzip() is not None or set(bundle.namelist()) != set(names):
            raise ValueError('离线包完整性检查失败')
        for name in names:
            if bundle.read(name) != (directory / name).read_bytes():
                raise ValueError('离线包内容不一致：' + name)


def delivery_targets(explicit, setup):
    """工作区内固定入口；旧路径仅作兼容镜像，保留原浏览器历史入口。"""
    if explicit:
        return [Path(explicit).resolve()]
    targets = [TOOL.parent / 'FXtools' / '烟花编排工作台']
    if setup.get('deliveryDir'):
        targets.append(Path(setup['deliveryDir']))
    return list(dict.fromkeys(path.resolve() for path in targets))


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--deploy-only', action='store_true', help='Git拉取后校验并同步已有离线包，不重建')
    parser.add_argument('--no-deploy', action='store_true', help='只生成仓库产物，用于云端/隔离验证')
    parser.add_argument('--delivery-dir', type=Path, help='显式指定固定离线文件所在目录')
    args = parser.parse_args(argv)
    if not args.deploy_only:
        node = shutil.which('node')
        if not node or not (SOURCE / 'node_modules/vite').is_dir():
            raise RuntimeError('需要 Node.js 与依赖；先在 tool/workbench 运行 npm ci。')
        subprocess.run([sys.executable, '-X', 'utf8', '-m', 'unittest', 'test_release'], cwd=SOURCE, check=True)
        # 所有检查在临时目录完成后才覆盖上一份完整产物。
        with tempfile.TemporaryDirectory(prefix='df-offline-release-') as temporary:
            stage = Path(temporary)
            subprocess.run([node, str(TOOL / 'offline-workbench/release.mjs'), '--source', str(SOURCE),
                            '--programme', str(SOURCE / 'fixtures/demo.dfshow'), '--output', str(stage / HTML)], check=True)
            shutil.copy2(TOOL / MANUAL, stage / MANUAL)
            verify_artifact(stage / HTML, SOURCE)
            make_zip(stage, FILES, ZIP)
            publish_files(stage, TOOL, FILES + [ZIP])
    verify_artifact(TOOL / HTML, SOURCE)
    # 即使只同步，也核对ZIP中HTML与当前产物相同，避免旧包混入。
    with zipfile.ZipFile(TOOL / ZIP) as bundle:
        for name in FILES:
            if bundle.read(name) != (TOOL / name).read_bytes():
                raise ValueError('ZIP未与当前产物同步，请运行 npm run release。')
    setup = json.loads(SETUP.read_text(encoding='utf-8-sig')) if SETUP.exists() else {}
    if not args.no_deploy:
        for target in delivery_targets(args.delivery_dir, setup):
            publish_files(TOOL, target, FILES + [ZIP])
            print('已更新固定离线入口：' + str(target / HTML))
    else:
        print('仓库离线包已就绪：' + str(TOOL / HTML))
    print('检查入口：http://127.0.0.1:8025/release/；个人节目、音乐及浏览器历史未改动。')


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError, zipfile.BadZipFile) as error:
        print('更新未完成：' + str(error), file=sys.stderr)
        raise SystemExit(1)
