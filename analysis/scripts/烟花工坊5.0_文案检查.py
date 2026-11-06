"""烟花工坊 5.0 文案自查（文案规则.md）：真实烘焙器版（从 E 样板 text_audit.py 改的）。

python -X utf8 analysis/scripts/烟花工坊5.0_文案检查.py [--html tool/烟花工坊.html] [--md 输出表.md] [--states 主要|全部]
走几个主要状态（单层各发射器、多层效果级 / 层级、输出、序列贴图、引擎回放、导出菜单、画面右键菜单、⋯ 菜单、筛选菜单），
收集看得见的文字和悬停提示（data-tip / title / placeholder），按位置定字数上限，查：超长、同一概念两个词、语气标点。
不查：参数说明面板（点参数名才出来的说明，属于文档，另起一轮）、外壳的资源交付页（外壳自己的检查管）、效果库条目名（效果名字是专有名词）。
用 file:// 打开（不起服务）；本机走显卡 Chrome。
"""
import json, re, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
ARGS = sys.argv[1:]
def arg(k, d=None):
    return ARGS[ARGS.index(k) + 1] if k in ARGS else d
HTML = Path(arg('--html', ROOT / 'tool' / '烟花工坊.html')).resolve()
MD = arg('--md')

LIMIT = {'按钮': 4, '标签': 8, '菜单项': 6, '悬停提示': 16, '原因': 16, '提示条': 20, '空状态': 14, '占位': 8, '读数': 24, '摘要': 24, '标题': 12, '选项': 6}
TERMS = [('只看', ['独看', '单独显示', '仅显示']), ('导出范围', ['输出范围', '导出区间']), ('恢复', ['重置', '复位到默认', '还原到打开时']), ('缩略图', ['封面图']),
         ('需重新导出', ['待导出', '需要重新导出']), ('撤销', ['撤回']), ('导出文件夹', ['输出文件夹', '导出目录']), ('另存', ['另存为']),
         ('序列贴图', ['贴图流转']), ('实机窗口', ['游戏内大小']), ('预览曝光', ['显示曝光'])]
STYLE = [(r'[？?]', '问句'), (r'[！!]', '感叹号'), (r'请|你可以|会帮你|哦|吧', '口语')]

STATES = [
    ('金芒菊 · 星', "const ef = EFFS().find(e => e.名 === '金芒菊'); await openEffect(ef); selectEmitTab('星');", 15000),
    ('金芒菊 · 层', "selectEmitTab('效果'); document.querySelectorAll('#params details.mod').forEach(d => d.open = true); const m = document.querySelector('#params .e51-out .e51-more'); if (m) m.hidden = false;", 1200),
    ('金芒菊 · 火花', "selectEmitTab('火花');", 800),
    ('金芒菊 · 余烬', "selectEmitTab('余烬');", 800),
    ('金芒菊 · 输出', "selectEmitTab('输出'); document.querySelectorAll('#params details.mod').forEach(d => d.open = true);", 1200),
    ('金芒菊 · 全部参数', "selectEmitTab('全部'); document.querySelectorAll('#params details.mod').forEach(d => d.open = true);", 1500),
    ('金芒菊 · 序列贴图', "selectEmitTab('星'); document.querySelector('#viewSeg [data-view=flow]').click();", 2500),
    ('金芒菊 · 引擎回放', "document.querySelector('#viewSeg [data-view=export]').click();", 2500),
    ('金芒菊 · 导出菜单', "document.querySelector('#viewSeg [data-view=live]').click(); document.querySelector('#expMenuBtn').click();", 800),
    ('金芒菊 · 右键菜单', "document.body.click(); const b = document.getElementById('box').getBoundingClientRect(); document.getElementById('box').dispatchEvent(new MouseEvent('contextmenu', {bubbles: true, clientX: b.left + 200, clientY: b.top + 200}));", 500),
    ('金芒菊 · 筛选与⋯', "document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'})); const f = document.querySelector('#params .e50-filt'); if (f) f.open = true; const m = document.querySelector('#params .e50-more'); if (m) m.open = true;", 500),
    ('金蕊柠 · 效果级', "document.querySelectorAll('#params details[open].ab-more').forEach(d => d.open = false); const ef = EFFS().find(e => (e.名 || '').includes('金蕊柠')); await openEffect(ef); selectComboLayer(-1);", 18000),
    ('金蕊柠 · 第 2 层效果', "selectComboLayer(1); selectEmitTab('效果'); document.querySelectorAll('#params details').forEach(d => d.open = true);", 2000),
    ('金蕊柠 · 第 2 层输出', "selectEmitTab('输出'); document.querySelectorAll('#params details.mod').forEach(d => d.open = true);", 1500),
    ('金蕊柠 · 层菜单', "document.querySelector('#tree .trow[data-layer=\"1\"] [data-ta=more]').click();", 500),
    # 4.9.132 起加：尾缀、分簇、分层粒子图、自定义发射器（选项最长的几处）
    ('尾缀 · 星头', "document.body.click(); const ef = EFFS().find(e => (e.名 || '').includes('升空尾缀') && (e.名 || '').includes('循环层')); await openEffect(ef); selectEmitTab('星头'); document.querySelectorAll('#params details.mod').forEach(d => d.open = true);", 15000),
    ('尾缀 · 火花共用', "selectEmitTab('火花共用'); document.querySelectorAll('#params details.mod').forEach(d => d.open = true);", 1000),
    ('尾缀 · 输出', "selectEmitTab('输出'); document.querySelectorAll('#params details.mod').forEach(d => d.open = true);", 1500),
    ('分簇火星 · 星', "const ef = EFFS().find(e => (e.名 || '').includes('分簇火星')); await openEffect(ef); selectEmitTab('星'); document.querySelectorAll('#params details.mod').forEach(d => d.open = true);", 15000),
    ('仙女棒 · 分层粒子图', "const ef = EFFS().find(e => (e.名 || '').includes('仙女棒') && (e.名 || '').includes('全形态')); await openEffect(ef); selectEmitTab('分层粒子图'); document.querySelectorAll('#params details.mod').forEach(d => d.open = true);", 12000),
    ('仙女棒 · 燃烧核心', "selectEmitTab('燃烧核心'); document.querySelectorAll('#params details.mod').forEach(d => d.open = true);", 1000),
    ('金芒菊 · 自定义 1', "const ef = EFFS().find(e => e.名 === '金芒菊'); await openEffect(ef); await new Promise(r => setTimeout(r, 3000)); exAddSlot(); document.querySelectorAll('#params details.mod').forEach(d => d.open = true);", 3000),
]

COLLECT = r"""() => {
  // 收起的 details 里的东西在 Chromium 里照样有位置（W15 也踩过）：不在 summary 里的都算看不见
  const shut = e => { for (let d = e.closest('details:not([open])'); d; d = d.parentElement && d.parentElement.closest('details:not([open])')) { const s = d.querySelector(':scope > summary'); if (!s || !s.contains(e)) return true; } return false; };
  const out = [], vis = e => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none' && +c.opacity !== 0 && !shut(e); };
  const own = e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').replace(/\s+/g, ' ').trim();
  const kind = e => e.closest('#vfRead, .vf-foot, #tlabel, .tlx-v, #path .cur, .infohost p.hint, #delivView small, #delivView p.hint, #delivView td, #dvSizeLine') ? '读数' : e.closest('summary .msum') ? '摘要' : e.closest('.e40-pop .mi, .ab-menu .mi, .ab-menu > button, .e50-menu .mi, .e50-ctx, .exp .mi') ? '菜单项'
    : e.closest('#rtLayerBar button') ? '标签'     /* 尾缀分层看的开关写的是段名（像结构树行名），按标签算 */
    : e.closest('option') ? '选项' : e.closest('.e50-warn, p.hint.warn, .ow') ? '原因' : e.closest('#status, .flash') ? '提示条' : e.closest('summary') ? '标题'
    : e.closest('button, .tab, .seg, .chip, .btn') ? '按钮' : '标签';
  const roots = [...document.querySelectorAll('#wsBaker, #vfCtx, .e40-pop')];
  const skip = e => e.closest('#shell, .sh-toast, #libBody, #pHelp, script, style, #iconDefs, canvas, .tlb-n, #tree .nm, #tree .tx, #abName, #abIdName, #path, #enName, .tb-txt, .dv-prod td:first-child, .dv-prod td small, #dvSizeSpec, .e51-size select');     /* 交付清单产物表的规格读数、尺寸档名（spec/尺寸标定.json 的名字）不按文案限长：盘点表偏离 D14 */     /* 效果名是专有名词（结构树根行也是），不按标签限长 */
  for (const R of roots) for (const e of R.querySelectorAll('*')) {
    if (skip(e)) continue;
    if (e.tagName === 'SELECT') { if (vis(e)) for (const o of e.options) if (!o.hidden && /[一-鿿]/.test(o.text)) out.push(['选项', o.text.trim()]); continue; }
    if (e.tagName === 'OPTION') continue;
    if (vis(e)) { const t = own(e); if (t && /[一-鿿]/.test(t)) out.push([kind(e), t]); }
    if (vis(e)) for (const [a, k] of [['data-tip', '悬停提示'], ['title', '悬停提示'], ['data-tip-t', '悬停提示'], ['placeholder', '占位']]) { const v = e.getAttribute(a); if (v && /[一-鿿]/.test(v)) out.push([k, v.split('\n')[0]]); }
  }
  return out;
}"""


def count(t):
    return len(re.findall(r'[一-鿿]', t)) + len(re.findall(r'[A-Za-z0-9.×%–-]+', t))


def main():
    rows = []
    with sync_playwright() as p:
        b = p.chromium.launch(channel='chrome', headless=False, args=['--use-angle=d3d11', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'])
        pg = b.new_page(viewport={'width': 1920, 'height': 1080})
        pg.route('http*://**', lambda r: r.abort() if '127.0.0.1:17780' not in r.request.url else r.continue_())
        pg.goto(HTML.as_uri() + '?fast', wait_until='load', timeout=0)
        pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0); time.sleep(1.5)
        for name, js, wait in STATES:
            try: pg.evaluate('(async () => { ' + js + ' })()')
            except Exception as e: print('状态出错', name, str(e)[:160])
            pg.wait_for_timeout(wait)
            for k, t in pg.evaluate(COLLECT): rows.append((name, k, t))
        b.close()
    seen, table, over, flag = set(), [], [], []
    for st, k, t in rows:
        t = re.sub(r'\s+', ' ', t).strip()
        if not t or (k, t) in seen: continue
        seen.add((k, t)); n, lim = count(t), LIMIT.get(k, 16); notes = []
        if n > lim: notes.append(f'超长（{n} > {lim}）'); over.append((st, k, t))
        for use, bad in TERMS:
            for w in bad:
                if w in t: notes.append(f'用词：「{w}」→「{use}」')
        for pat, lab in STYLE:
            if re.search(pat, t): notes.append(lab)
        if t.endswith('。') and k != '对话框正文': notes.append('句末句号')
        if any(not x.startswith('超长') for x in notes): flag.append((st, k, t, notes))
        table.append((st, k, t, n, lim, '；'.join(notes) or '—'))
    print(f'条目 {len(rows)}，去重 {len(table)}，超长 {len(over)}，用词 / 语气 {len(flag)}')
    for st, k, t in over: print('  超长：', st, '|', k, '|', t[:120])
    for st, k, t, nt in flag: print('  核对：', st, '|', k, '|', t[:120], nt)
    if MD:
        Path(MD).write_text('| 状态 | 位置 | 文字 | 字数 | 上限 | 核对 |\n| --- | --- | --- | --- | --- | --- |\n'
                            + '\n'.join(f'| {st} | {k} | {t.replace("|", "｜")} | {n} | {lim} | {r} |' for st, k, t, n, lim, r in table) + '\n', encoding='utf-8')
    sys.exit(1 if over or flag else 0)


if __name__ == '__main__':
    main()
