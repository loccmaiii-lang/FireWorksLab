#!/usr/bin/env python3
"""打对外包：烟花烘焙器对外版（tool/build.py --team）+ 数据 + 案例 + 导入器 + 先读我 → tool/team/dist/烟花烘焙器_对外版_<日期>/ 和同名 zip。

用法：
  python3 tool/team/打包对外版.py                         # 重新构建对外版、打包、检查（含 file:// 首屏检查）
  python3 tool/team/打包对外版.py --importer <导入器.html 或文件夹>   # 把本机导入器复制进包的「导入器」文件夹
  python3 tool/team/打包对外版.py --no-build --no-browser  # 只打包 + 文本检查（不重新构建、不开浏览器）
  python3 tool/team/打包对外版.py --open-case 小金花       # 首屏检查后再打开一个案例（会烘焙一次，软件渲染慢）
包里：
  烟花烘焙器.html   对外版成品（双击打开，Chrome / Edge）
  data/             它加载的数据（缩略图、尺寸标定、案例），review.js / standard.js 不带
  案例/             案例原文件（fwl.mybundle/1），换浏览器 / 清了缓存时「我的效果 → 导入…」它
  导入器/           用户本机导入器（--importer 给了才有；没给只放一个说明）
  先读我.txt
检查：本地引用都在；包里文本扫不到本机路径 / 内部字样（导入器单独列）；file:// 打开首屏：控制台错误、藏起来的入口、案例组、没有连 8034。
截图和检查结果写 analysis/local/<日期>_团队版_对外包/（过程证据，不进 Git）。
"""
import argparse
import datetime as dt
import html.parser
import json
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TOOL = ROOT / 'tool'
HERE = Path(__file__).resolve().parent
TEAM_HTML = TOOL / '烟花烘焙器_对外版.html'
FORBID = ['F:/', 'E:/', 'F:\\', 'E:\\', 'loc_ma5', 'LOCMAI', '对话框']
LOCAL_PATH = re.compile(r'(?<![A-Za-z0-9])[A-Za-z]:[\\/][^\s"\'<>`]{0,80}|\\\\[A-Za-z0-9_.-]+\\[^\s"\'<>`]{0,60}|/(?:Users|home)/[^\s"\'<>`]{1,60}|loc_ma5|LOCMAI[^\s"\'<>`]{0,20}')
TEXT_EXT = {'.html', '.htm', '.js', '.mjs', '.json', '.txt', '.md', '.css', '.csv'}


def team_scrub(t):
    """和 tool/build.py --team 同一套：内部协作字样换成中性写法（数据文件也过一遍）。"""
    t = re.sub(r'编排对话框', '编排', t)
    t = re.sub(r'对话框(?:\d+|[A-Za-z][A-Za-z0-9]*|新花型|相机渲染|手游编排)', '内部', t)
    return t.replace('对话框', '弹窗')


class Refs(html.parser.HTMLParser):
    """页面标记里的本地引用（script src / link href / img src / iframe src）；脚本内容里的字符串不算。"""
    def __init__(self):
        super().__init__(); self.refs = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        for k in ('src', 'href'):
            v = a.get(k)
            if v and not re.match(r'^(?:[a-z]+:|#|//)', v, re.I) and tag in ('script', 'link', 'img', 'iframe', 'source', 'video', 'audio'):
                self.refs.append((tag, v))


def scan_text(path):
    try:
        return path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        return None


def browser_check(page_path, out_dir, n_cases, open_case):
    """file:// 打开对外版首屏（截停 requestAnimationFrame，只放前 3 帧，省软件渲染）。"""
    from playwright.sync_api import sync_playwright
    res = {'console': [], 'pageerrors': [], 'requests': [], 'checks': [], 'shots': []}
    with sync_playwright() as pw:
        try:
            sys.path.insert(0, str(ROOT / 'analysis' / 'scripts')); from browser_runtime import chromium_options     # 和其它页面检查同一套启动参数（Linux 软件渲染 / Windows 显卡）
            opts = chromium_options()
        except Exception:  # noqa: BLE001
            opts = {'args': ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']}
        br = pw.chromium.launch(**opts)
        ctx = br.new_context(viewport={'width': 1600, 'height': 900}, accept_downloads=True)
        # 截停 requestAnimationFrame（只放前 3 帧）：软件渲染下实时模拟每帧很慢，截图会等不到帧；烘焙不靠它
        ctx.add_init_script('(() => { const raf = window.requestAnimationFrame.bind(window); let n = 0; window.requestAnimationFrame = cb => (++n <= 3 ? raf(cb) : 0); })();')
        page = ctx.new_page()
        page.on('console', lambda m: res['console'].append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
        page.on('pageerror', lambda e: res['pageerrors'].append(str(e)))
        page.on('request', lambda r: res['requests'].append(r.url) if not r.url.startswith(('file:', 'data:', 'blob:')) else None)
        page.goto(page_path.as_uri(), wait_until='load')
        page.wait_for_timeout(2500)
        info = page.evaluate('''() => {
          const vis = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
          const groups = [...document.querySelectorAll('#libBody > details')].map(d => ({ cls: d.className, title: (d.querySelector('summary .lt') || {}).textContent, open: d.open, items: d.querySelectorAll(':scope > .li').length }));
          const st = window.__fw && window.__fw.state;
          return { title: document.title, team: document.documentElement.classList.contains('team-mode'), brand: vis('#brandTeam'),
            hidden: Object.fromEntries(['#updBtn', '#rvCopy', '#ptabs [data-tab="review"]', '#pReview', '#vtNote', '#abCopyDiff', '#abRepo', '#abRepoRead', '#deliveryWorkspace'].map(s => [s, vis(s)])),
            groups, welcome: vis('#teamWelcome'), deliveryOpen: (document.querySelector('#deliveryOpen') || {}).textContent, frameSrc: (document.querySelector('#deliveryFrame') || {}).getAttribute && document.querySelector('#deliveryFrame').getAttribute('src'),
            libText: document.querySelector('#libBody').innerText, gpu: (document.querySelector('#gpu') || {}).textContent,
            baking: st ? !!st.baking : null, bake: st ? !!st.bake : null, key: typeof lib !== 'undefined' ? lib.key : null,
            storeKeys: Object.keys(localStorage).slice(0, 40) };
        }''')
        res['info'] = info
        shot = out_dir / '首屏.png'; page.screenshot(path=str(shot)); res['shots'].append(str(shot))
        ck = res['checks']
        ck.append(('标题有「对外版」', '对外版' in info['title'], info['title']))
        ck.append(('对外模式（html.team-mode）', info['team'], ''))
        ck.append(('顶栏「对外版」标记', bool(info['brand']), ''))
        shown = [s for s, v in info['hidden'].items() if v]
        ck.append(('内部入口都藏了（更新记录、复制我的意见、审阅页签 / 卡、记录到意见、发给 AI、仓库文件夹、交付页）', not shown, '还看得见：' + '、'.join(shown) if shown else ''))
        g = info['groups']
        ck.append(('左栏第一组是「案例」并展开', bool(g) and 'lg-cases' in g[0]['cls'] and g[0]['open'], ' / '.join(f"{x['title']}({x['items']}{'' if x['open'] else ',收起'})" for x in g)))
        ck.append((f'案例 {n_cases} 个都在', bool(g) and g[0]['items'] == n_cases, f"案例组 {g[0]['items'] if g else 0} 个"))
        bad_groups = [x['title'] for x in g if any(k in x['cls'] for k in ('lg-review', 'lg-wip', 'lg-tools'))]
        ck.append(('没有待我验收 / 制作中 / 工具组', not bad_groups, '、'.join(bad_groups)))
        words = [w for w in ('待我验收', '复制我的意见', 'AI 待看', 'AI 自检', 'AI 版', '未就绪') if w in info['libText']]
        ck.append(('左栏没有内部字样（待我验收 / AI 标签 / 就绪）', not words, '、'.join(words)))
        ck.append(('启动没烘焙、没自动打开', info['baking'] is False and info['bake'] is False and not info['key'], f"baking={info['baking']} bake={info['bake']} key={info['key']!r}"))
        ck.append(('首屏提示在', bool(info['welcome']), ''))
        ck.append(('「资源交付」换成「导入 UE」、交付页没加载', info['deliveryOpen'] == '导入 UE' and not info['frameSrc'], f"按钮={info['deliveryOpen']!r} iframe={info['frameSrc']!r}"))
        ck.append(('存储用对外版前缀（fwbteam.）', all(not k.startswith('fwb.') for k in info['storeKeys']) and any(k.startswith('fwbteam.') for k in info['storeKeys']), ', '.join(info['storeKeys'][:8])))
        # 导出的交付一步（不烘焙）：对外版目的地恒为 zip；就算传「指定目录」也只下载，不连 8034；下载后底部提示怎么导入
        with page.expect_download(timeout=30000) as dl:
            dest = page.evaluate("() => { const d = DeliveryWorkspace.destination(); deliverResource(new Blob(['test'], { type: 'application/zip' }), '对外版下载测试.zip', {}, 'directory'); return d; }")
        bar = page.evaluate('() => ({ shown: !document.querySelector("#teamExportBar").hidden, name: document.querySelector("#teamExportName").textContent, ws: !document.querySelector("#deliveryWorkspace").hidden })')
        ck.append(('导出只下载 ZIP（目的地 zip、给「指定目录」也下载）、下载后底部提示', dest == 'zip' and dl.value.suggested_filename == '对外版下载测试.zip' and bar['shown'] and not bar['ws'], f"destination={dest} 下载={dl.value.suggested_filename} 提示={bar}"))
        page.evaluate('() => document.querySelector("#teamExportHelp").click()'); page.wait_for_timeout(300)
        ck.append(('「怎么导入」打开离线导入说明', page.evaluate('() => document.querySelector("#teamImportDlg").open'), ''))
        shot3 = out_dir / '离线导入说明.png'; page.screenshot(path=str(shot3)); res['shots'].append(str(shot3))
        page.evaluate('() => document.querySelector("#teamImportDlg").close()')
        if open_case:
            key = page.locator('#libBody details.lg-cases .li', has_text=open_case).first.get_attribute('data-key')
            page.evaluate('k => { openMyEffect(k.slice(3)); }', key); page.wait_for_timeout(1000)     # 软件渲染时 Playwright 的 click 会等帧超时，直接调打开
            page.wait_for_function('() => window.__fw && window.__fw.idle() && !!(window.__fw.state.bake || (window.__fw.state.lib || []).some(e => e.bake))', polling=2000, timeout=600000)     # rAF 截停了：按时间轮询
            page.wait_for_timeout(1500)
            info2 = page.evaluate('() => ({ key: lib.key, name: (document.querySelector("#abIdName") || {}).textContent, welcome: !document.querySelector("#teamWelcome").hidden, bake: !!(window.__fw.state.bake || (window.__fw.state.lib || []).some(e => e.bake)), src: [...document.querySelectorAll("#abSrc option")].map(o => o.textContent) })')
            res['open'] = info2
            shot2 = out_dir / '打开案例.png'; page.screenshot(path=str(shot2)); res['shots'].append(str(shot2))
            ck.append((f'打开案例「{open_case}」：烘好、首屏提示收起', info2["bake"] and not info2['welcome'], json.dumps(info2, ensure_ascii=False)[:200]))
        br.close()
    errs = [c for c in res['console'] if c.startswith('error')] + res['pageerrors']
    res['checks'].append(('控制台没有错误', not errs, '；'.join(errs)[:600]))
    net = [u for u in res['requests']]
    res['checks'].append(('没有网络请求（没连 8034 / 外网）', not net, '、'.join(net[:5])))
    return res


def main():
    today = dt.date.today().strftime('%Y%m%d')
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--date', default=today)
    ap.add_argument('--importer', default='', help='用户本机导入器 HTML（或它所在的文件夹），复制进包的「导入器」')
    ap.add_argument('--no-build', action='store_true', help='不重新跑 tool/build.py --team')
    ap.add_argument('--no-browser', action='store_true', help='不开浏览器做首屏检查')
    ap.add_argument('--open-case', default='', help='首屏检查后再打开名字含这几个字的案例（会烘焙一次）')
    ap.add_argument('--no-zip', action='store_true')
    a = ap.parse_args()

    if not a.no_build:
        r = subprocess.run([sys.executable, str(TOOL / 'build.py'), '--team'], capture_output=True, text=True)
        print(r.stdout.strip().splitlines()[0] if r.stdout.strip() else '', '·', '构建通过' if r.returncode == 0 else '❌ 构建失败')
        if r.returncode != 0:
            print(r.stdout, r.stderr); return 1
    if not TEAM_HTML.exists():
        print('❌ 没有', TEAM_HTML, '（先跑 python3 tool/build.py --team）'); return 1

    name = f'烟花烘焙器_对外版_{a.date}'
    dist = HERE / 'dist'; out = dist / name
    if out.exists(): shutil.rmtree(out)
    (out / 'data').mkdir(parents=True)
    page = out / '烟花烘焙器.html'
    shutil.copyfile(TEAM_HTML, page)
    html_text = page.read_text(encoding='utf-8')
    p = Refs(); p.feed(html_text)
    missing = []
    for tag, ref in p.refs:
        if ref.startswith('data/'):
            src = TOOL / ref
            if not src.exists(): missing.append(ref); continue
            (out / ref).write_text(team_scrub(src.read_text(encoding='utf-8')), encoding='utf-8')
    cases = HERE / 'cases_bundle.json'
    n_cases = 0
    if cases.exists():
        (out / '案例').mkdir()
        shutil.copyfile(cases, out / '案例' / f'对外版案例_{a.date}.json')
        n_cases = len(json.loads(cases.read_text(encoding='utf-8')).get('effects') or [])
    else:
        print('⚠ 没有 tool/team/cases_bundle.json（先跑 python3 tool/team/build_cases.py）')
    imp = out / '导入器'; imp.mkdir()
    importer_files = []
    if a.importer:
        src = Path(a.importer)
        if src.is_dir():
            shutil.copytree(src, imp, dirs_exist_ok=True)
        elif src.is_file():
            shutil.copyfile(src, imp / src.name)
        else:
            print('❌ 找不到导入器：', src); return 1
        importer_files = [f for f in imp.rglob('*') if f.is_file()]
    else:
        (imp / '请把导入器放在这里.txt').write_text('这个文件夹放导入器网页（用户本机的导入器 HTML）。\n打包时用：python3 tool/team/打包对外版.py --importer <导入器.html>\n', encoding='utf-8')
    readme = HERE / '先读我.txt'
    if readme.exists():
        shutil.copyfile(readme, out / '先读我.txt')
    else:
        print('⚠ 没有 tool/team/先读我.txt')

    # ---- 检查 ----
    checks = []
    for tag, ref in p.refs:
        if not (out / ref).exists() and ref not in missing: missing.append(ref)
    checks.append(('本地引用文件都在', not missing, '缺：' + '、'.join(missing) if missing else '、'.join(r for _, r in p.refs)))
    checks.append(('不带 review.js / standard.js', not (out / 'data' / 'review.js').exists() and not (out / 'data' / 'standard.js').exists() and 'review.js' not in ''.join(r for _, r in p.refs), ''))
    hits = []
    for f in sorted(out.rglob('*')):
        if not f.is_file() or f.suffix.lower() not in TEXT_EXT or imp in f.parents: continue
        t = scan_text(f)
        if t is None: continue
        for tok in FORBID:
            if tok in t:
                i = t.index(tok); hits.append(f'{f.relative_to(out)}：「{tok}」…{t[max(0, i - 30):i + 30]!r}')
    checks.append(('包里扫不到本机路径 / 内部字样（' + '、'.join(FORBID) + '；导入器另列）', not hits, '\n      '.join(hits[:10])))
    imp_paths = []
    for f in importer_files:
        t = scan_text(f) if f.suffix.lower() in TEXT_EXT else None
        if t is None: continue
        found = sorted(set(m.group(0) for m in LOCAL_PATH.finditer(t)))
        found += [tok for tok in FORBID if tok in t and not any(tok in x for x in found)]
        if found: imp_paths.append((f.relative_to(out).as_posix(), found))

    check_dir = ROOT / 'analysis' / 'local' / f'{a.date}_团队版_对外包'
    check_dir.mkdir(parents=True, exist_ok=True)
    br = None
    if not a.no_browser:
        try:
            br = browser_check(page, check_dir, n_cases, a.open_case)
            checks += br['checks']
        except Exception as e:  # noqa: BLE001
            checks.append(('file:// 首屏检查', False, f'没跑成：{e}'))

    zpath = dist / f'{name}.zip'
    if not a.no_zip:
        if zpath.exists(): zpath.unlink()
        with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
            for f in sorted(out.rglob('*')):
                if f.is_file(): z.write(f, (Path(name) / f.relative_to(out)).as_posix())

    size = sum(f.stat().st_size for f in out.rglob('*') if f.is_file())
    print(f'\n对外包：{out.relative_to(ROOT)}（{size / 1e6:.1f} MB）' + (f'；zip {zpath.relative_to(ROOT)}（{zpath.stat().st_size / 1e6:.1f} MB）' if zpath.exists() and not a.no_zip else ''))
    for f in sorted(out.rglob('*')):
        if f.is_file(): print(f'   {f.relative_to(out).as_posix():<40} {f.stat().st_size / 1024:>8.0f} KB')
    print('\n检查：')
    for k, ok, d in checks:
        print(f"  {'✅' if ok else '❌'} {k}" + (f'\n      {d}' if d and (not ok or len(d) < 160) else ''))
    if a.importer:
        print('\n导入器里的本机路径（不拦，给用户看要不要改）：' if imp_paths else '\n导入器里没扫到本机路径')
        for f, found in imp_paths:
            print(f'  {f}：' + '、'.join(found[:12]) + (f' 等 {len(found)} 处' if len(found) > 12 else ''))
    else:
        print('\n导入器：这次没给（--importer），包里只放了说明文件')
    if br:
        (check_dir / '检查结果.json').write_text(json.dumps({'date': a.date, 'package': str(out.relative_to(ROOT)), 'checks': checks, 'browser': {k: v for k, v in br.items() if k != 'checks'}}, ensure_ascii=False, indent=1), encoding='utf-8')
        print('\n截图：', '、'.join(Path(s).relative_to(ROOT).as_posix() for s in br['shots']))
    return 0 if all(ok for _, ok, _ in checks) else 1


if __name__ == '__main__':
    sys.exit(main())
