"""同一源码生成离线包，再覆盖固定工具文件；不操作个人节目或浏览器草稿。"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile

SOURCE = Path(__file__).resolve().parent
TOOL = SOURCE.parent
REPO = TOOL.parent
HTML = '烟花编排工作台.html'
MANUAL = '烟花编排工作台_使用说明.html'
ZIP = '烟花编排工作台-离线包.zip'
FILES = [HTML, HTML + '.build.json', MANUAL]
SETUP = Path.home() / '.fireworkslab/workbench-release.json'
# 16.0.10：云端编排不带音乐；本机固定入口旁放一份仓库原曲，file 页能直接播。不进 ZIP、不进 Git。
MUSIC = TOOL.parent / '协作' / '编排工作台资料' / '2026-10-10' / 'music' / 'music.wav'


def sha256(file):
    return hashlib.sha256(Path(file).read_bytes()).hexdigest()


def source_fingerprints(file, scheme):
    """16.0.19 起清单写 fingerprint: sha256-lf（换行按 LF 归一），Windows CRLF 工作区和云端 LF 检出算出同一个值。
    旧清单（没写 fingerprint）按原字节；构建机是整篇 CRLF 时，LF 检出换回 CRLF 也认。"""
    data = Path(file).read_bytes()
    lf = data.replace(b'\r\n', b'\n')
    if scheme == 'sha256-lf':
        return {hashlib.sha256(lf).hexdigest()}
    return {hashlib.sha256(data).hexdigest(), hashlib.sha256(lf.replace(b'\n', b'\r\n')).hexdigest()}


def verify_artifact(html, source):
    manifest = json.loads(Path(str(html) + '.build.json').read_text(encoding='utf-8'))
    if manifest['sha256'] != sha256(html):
        raise ValueError('HTML指纹不一致，停止覆盖。')
    scheme = manifest.get('fingerprint')
    for name, expected in manifest['sourceFiles'].items():
        file = (source / name).resolve()
        if not file.is_relative_to(source.resolve()) or not file.is_file() or expected not in source_fingerprints(file, scheme):
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


def publish_music(target, music=MUSIC):
    """原曲放到固定入口旁（同名 music.wav）；目标已有 music.wav 就不动，不覆盖其他文件。"""
    music, dest = Path(music), Path(target) / 'music.wav'
    if not music.is_file():
        return False
    if dest.exists():
        # 已有同名文件：是同一份就不动；不是同一份也不覆盖（可能是使用者自己的音乐）。
        return False
    partial = dest.with_name('.music.wav.partial')
    shutil.copy2(music, partial)
    os.replace(partial, dest)
    return True


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


# ── 只换编排（--data-only，16.0.19 起）────────────────────────────────
# 云端装不了 npm 依赖（vite / esbuild / react / 图标库），但出新编排不需要重编工具：成品 HTML 里的 cloud-latest
# 只是一块内嵌 JSON。前提是工具源码自上次成品以来没改过——用 Git 判断；改过就必须本机完整构建。
CLOUD_LATEST = 'public/data/cloud-latest.json'
# 决定成品字节的输入（相对仓库根）。build.mjs 是构建器本身，改它不改变已有成品的字节，不在这里。
BUILD_INPUTS = ['tool/workbench/src', 'tool/workbench/package.json', 'tool/workbench/package-lock.json',
                'tool/workbench/public/data', 'tool/workbench/fixtures',
                'tool/offline-workbench/bootstrap.js', 'tool/offline-workbench/light-project.mjs',
                'tool/offline-workbench/audio-blob.mjs']


def data_only_blockers(changed):
    """自成品以来改过、且会改变成品字节的文件；只允许 cloud-latest.json 变。"""
    allowed = 'tool/workbench/' + CLOUD_LATEST
    return sorted(p for p in changed if p != allowed and any(p == x or p.startswith(x + '/') for x in BUILD_INPUTS))


def git(*args):
    return subprocess.run(['git', '-c', 'core.quotepath=off', *args], cwd=REPO, check=True,
                          capture_output=True, text=True, encoding='utf-8').stdout


def changed_since_product():
    commit = git('log', '-1', '--format=%H', '--', 'tool/' + HTML).strip()
    if not commit:
        raise RuntimeError('Git 里找不到上一次成品提交，不能只换编排。')
    changed = git('diff', '--name-only', '-z', commit, '--', *BUILD_INPUTS)
    untracked = git('ls-files', '--others', '--exclude-standard', '-z', '--', *BUILD_INPUTS)
    return commit, {p for p in (changed + untracked).split('\0') if p}


def app_version(source=SOURCE):
    text = (source / 'src/connection.mjs').read_text(encoding='utf-8')
    match = re.search(r"export const WORKBENCH_VERSION='([^']+)';", text)
    if not match:
        raise RuntimeError('找不到 WORKBENCH_VERSION')
    return match.group(1)


def version_key(version):
    return tuple(int(x) for x in version.split('.'))


def version_guard(source=SOURCE):
    """只换编排占用过的号，工具不能再用：完整构建前工具版本必须比它新（不复用、不回退）。"""
    file = source / CLOUD_LATEST
    if not file.exists():
        return
    cloud = json.loads(file.read_text(encoding='utf-8'))
    version = app_version(source)
    if cloud.get('publishMode') == 'data-only' and version_key(version) <= version_key(cloud['version']):
        raise ValueError(f'工具版本 {version} 不比云端编排 {cloud["version"]}（只换编排）新；'
                         f'把 src/connection.mjs 的 WORKBENCH_VERSION 改成更大的号再构建。')


def data_only_release(stage, node):
    """把仓库成品复制到 stage，只换内嵌 cloud-latest，更新清单、跑打包检查、重打 ZIP。返回新清单。"""
    commit, changed = changed_since_product()
    blockers = data_only_blockers(changed)
    if blockers:
        raise ValueError('工具源码在成品（' + commit[:8] + '）之后改过，不能只换编排，要本机完整构建（npm run release）：'
                         + '、'.join(blockers[:8]) + (' 等' if len(blockers) > 8 else ''))
    manifest = json.loads((TOOL / (HTML + '.build.json')).read_text(encoding='utf-8'))
    previous_sha = sha256(TOOL / HTML)
    if manifest['sha256'] != previous_sha:
        raise ValueError('仓库成品和它的构建清单对不上，不能在它上面只换编排。')
    scheme = manifest.get('fingerprint')
    by_hash, by_git = 0, []
    for name, expected in manifest['sourceFiles'].items():
        if name == CLOUD_LATEST:
            continue
        if expected in source_fingerprints(SOURCE / name, scheme):
            by_hash += 1
        else:
            # 旧清单在混合换行的 Windows 工作区里算的，云端 LF 检出复原不了；上面的 Git 检查已确认它自成品以来没改。
            by_git.append(name)
    candidate = stage / HTML
    out = subprocess.run([node, str(TOOL / 'offline-workbench/patch-data.mjs'), '--html', str(TOOL / HTML),
                          '--source', str(SOURCE), '--output', str(candidate)],
                         check=True, stdout=subprocess.PIPE, text=True, encoding='utf-8').stdout
    patched = json.loads(out.strip().splitlines()[-1])
    if patched['previousHtmlSha256'] != previous_sha or patched['sha256'] != sha256(candidate):
        raise ValueError('只换编排后的成品指纹核对失败')
    cloud = json.loads((SOURCE / CLOUD_LATEST).read_text(encoding='utf-8'))
    if cloud.get('publishMode') != 'data-only' or cloud.get('appVersion') != app_version():
        raise ValueError('cloud-latest.json 不是按「只换编排」发布的（先 node scripts/publish-show.mjs --data-only ...）')
    files = dict(manifest['sourceFiles'])
    files.setdefault(CLOUD_LATEST, '')
    manifest['sha256'] = patched['sha256']
    manifest['bytes'] = patched['bytes']
    manifest['cloudLatest'] = patched['cloudLatest']
    manifest['fingerprint'] = 'sha256-lf'
    manifest['sourceFiles'] = {name: next(iter(source_fingerprints(SOURCE / name, 'sha256-lf'))) for name in files}
    manifest.setdefault('dataPatches', []).append({
        'time': datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z'),
        'key': 'cloud-latest', 'version': cloud['version'], 'name': cloud['name'],
        'programmeSha256': cloud['programmeSha256'], 'appVersion': cloud['appVersion'],
        'previousVersion': (patched.get('previous') or {}).get('version'),
        'previousHtmlSha256': previous_sha, 'productCommit': commit,
        'sourceCheck': {'byHash': by_hash, 'byGitOnly': by_git},
        'environment': {'platform': sys.platform, 'python': sys.version.split()[0]},
    })
    (stage / (HTML + '.build.json')).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    checks = sorted(str(p) for p in (TOOL / 'offline-workbench/tests').glob('*.test.mjs'))
    env = {**os.environ, 'DF_HTML_TEST_PATH': str(candidate), 'DF_SOURCE_TEST_PATH': str(SOURCE),
           'DF_PROGRAMME_TEST_PATH': str(SOURCE / 'fixtures/demo.dfshow')}
    subprocess.run([node, '--test', *checks], cwd=TOOL / 'offline-workbench', env=env, check=True)
    return manifest


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
    parser.add_argument('--data-only', action='store_true',
                        help='只换编排：工具源码没改时，把成品里的云端编排换成 cloud-latest.json（不需要 npm 依赖）')
    args = parser.parse_args(argv)
    if args.data_only and args.deploy_only:
        parser.error('--data-only 与 --deploy-only 不能同时用')
    if args.data_only:
        node = shutil.which('node')
        if not node:
            raise RuntimeError('只换编排也需要 Node.js（不需要 npm 依赖）。')
        subprocess.run([sys.executable, '-X', 'utf8', '-m', 'unittest', 'test_release'], cwd=SOURCE, check=True)
        with tempfile.TemporaryDirectory(prefix='df-offline-data-') as temporary:
            stage = Path(temporary)
            manifest = data_only_release(stage, node)
            shutil.copy2(TOOL / MANUAL, stage / MANUAL)
            verify_artifact(stage / HTML, SOURCE)
            make_zip(stage, FILES, ZIP)
            publish_files(stage, TOOL, FILES + [ZIP])
        print('已只换编排：云端编排 ' + manifest['cloudLatest']['version'] + ' · ' + manifest['cloudLatest']['name']
              + '（工具仍是 ' + app_version() + '）')
    elif not args.deploy_only:
        version_guard()
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
            if publish_music(target):
                print('已放原曲（file 页播放用）：' + str(target / 'music.wav'))
    else:
        print('仓库离线包已就绪：' + str(TOOL / HTML))
    print('检查入口：http://127.0.0.1:8025/release/；个人节目、音乐及浏览器历史未改动。')


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError, zipfile.BadZipFile) as error:
        print('更新未完成：' + str(error), file=sys.stderr)
        raise SystemExit(1)
