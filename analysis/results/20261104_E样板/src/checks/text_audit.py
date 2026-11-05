"""E 样板 v3.1 制作区：文案自查（文案规则.md 最后一节）。

把制作区所有可见文字和悬停提示（data-tip / title / placeholder / aria-label 里的说明）、参数说明、菜单、提示条、对话框、空状态
导出成一张表，逐条核对：1 有没有超出字数上限；2 同一概念有没有用两个词；3 语气和标点（不写「你可以」「请」，不用问句、感叹号、
括号补充、「·」串联，按钮和提示不加句号）。

python3 text_audit.py [/tmp/E_A.html] [说明.md]
给了说明.md 时，把表写进 <!-- 文案自查表 开始 --> 和 <!-- 文案自查表 结束 --> 之间。外壳的文字（#shell、资源交付、资源编排）不在这里查。
"""
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ARGS = sys.argv[1:]
HTML = next((a for a in ARGS if a.endswith('.html')), '/tmp/E_A.html')
DOC = next((a for a in ARGS if a.endswith('.md')), None)
URL = Path(HTML).resolve().as_uri()

# 字数上限（文案规则.md）
LIMIT = {'按钮': 4, '标签': 6, '菜单项': 6, '悬停提示': 16, '说明行': 10, '原因': 16, '提示条': 20, '对话框正文': 25, '空状态': 14, '参数说明': 16, '占位': 8, '读数': 20, '标题': 12}
# 同一概念只用一个词：左边是用词，右边是不该出现的别的说法
TERMS = [('只看', ['独看', '单独显示', '仅显示']), ('导出范围', ['输出范围', '导出区间']), ('恢复', ['重置', '复位到默认']), ('缩略图', ['封面图', '预览图']),
         ('需重新导出', ['待导出', '需要重新导出', '未导出']), ('发射时段', ['发射区间', '发射范围']), ('撤销', ['撤回', '取消上一步']), ('烘焙', ['渲染帧']),
         ('预览设置', ['显示设置', '视图设置']), ('导出文件夹', ['输出文件夹', '导出目录']), ('另存', ['另存为']), ('入点', ['起点']), ('出点', ['终点'])]
STYLE = [(r'[？?](?!\S*\.)', '问句'), (r'[！!]', '感叹号'), (r'[（(][^）)]*[）)]', '括号补充'), (r'(?<!烟花工坊 )·', '间隔号串联'), (r'请|你可以|会帮你|哦', '口语')]

COLLECT = r"""(cat) => {
  const out = [], vis = e => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none'; };
  const own = e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').replace(/\s+/g, ' ').trim();
  const roots = [...document.querySelectorAll('#wsBaker, #ovlApp')];
  const kind = e => e.closest('.dis-why') ? '原因' : e.closest('#saveSt, .mod-h .ms, .msum .mline, .ci, .fbk, .time, .cnt, .pager, #delivZoom, .dh .lbl') ? '读数' : e.closest('#modeTabs') ? '标签' : e.closest('.toast') ? '提示条' : e.closest('.dialog p') ? '对话框正文' : e.closest('.dialog h2, .keys h2, .tip b') ? '标题' : e.closest('.empty') ? (e.closest('button') ? '按钮' : '空状态')
    : e.closest('.ms2, .mnote, .hint2, .dep-t') ? '说明行' : e.closest('.menu .mi, .menu .mh') ? '菜单项' : e.closest('.tip') ? '悬停提示' : e.closest('button, .tab, .seg, .chip') ? '按钮'
    : e.closest('.ci, .fbk, .time, #saveSt, .cnt, .pager, #delivZoom, .dh .lbl') ? '读数' : '标签';
  for (const R of roots) for (const e of R.querySelectorAll('*')) {
    if (e.closest('#shell, .sh-toast')) continue;
    if (vis(e)) { const t = own(e); if (t && /[一-鿿]/.test(t)) out.push([kind(e), t]); }
    for (const [a, k] of [['data-tip', '悬停提示'], ['title', '悬停提示'], ['placeholder', '占位'], ['aria-description', '原因']]) { const v = e.getAttribute(a); if (v && /[一-鿿]/.test(v) && !(a === 'title' && v === e.textContent.trim())) out.push([k, v.trim()]); }
  }
  return out;
}"""


def count(t):
    """字数：一个汉字算 1，一串字母或数字算 1"""
    return len(re.findall(r'[一-鿿]', t)) + len(re.findall(r'[A-Za-z0-9.]+', t))


def main():
    rows, names = [], set()
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 1920, 'height': 1080})
        pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith(('file:', 'data:')) else r.abort())
        pg.goto(URL); pg.add_style_tag(content='#sampleBar{display:none!important}'); pg.wait_for_timeout(300)
        S = pg.evaluate('KIT.strings()')
        names = set(S['names'])
        rows += [('参数说明', v) for v in S['help'].values()]
        rows += [('悬停提示', v) for v in S['view'].values()]
        rows += [('说明行', d) for _, d in S['keys']]
        grab = lambda: rows.extend((k, t) for k, t in pg.evaluate(COLLECT, ''))
        states = [
            "", "KIT.set('scene','spk')", "KIT.mode('贴图与交付')", "KIT.set('scene','kiku'); KIT.mode('贴图与交付')", "KIT.mode('引擎回放')",
            "KIT.openExport(); document.querySelector('.menu [data-r=det]').click()", "document.body.click(); document.querySelector('#viewbar [data-act=preview]').click()",
            "document.body.click(); document.querySelector('#transport [data-act=tlOpts]').click()", "document.body.click(); document.querySelector('#viewOpt').click()",
            "document.body.click(); document.querySelector('[data-act=addLayer]').click()", "document.body.click(); KIT.tip('缩放')",
            "KIT.del('点灭星')", "KIT.askDeleteEffect()", "document.querySelector('.dialog [data-r=\"0\"]').click(); KIT.set('size','1366')",
            "KIT.set('size','1920'); document.querySelector('#pq input').value = '银柳'; document.querySelector('#pq input').dispatchEvent(new Event('input', {bubbles: true}))",
        ]
        for js in states:
            if js:
                pg.evaluate(js); pg.wait_for_timeout(200)
            grab()
        for sel in ['#expSt', '#tree .stl', '#tlw .film-c', '#transport .fbk']:
            loc = pg.locator(sel).first
            if loc.count():
                loc.hover(); pg.wait_for_timeout(600); grab()
        b.close()
    seen, table, over, flagged = set(), [], [], []
    for k, t in rows:
        t = re.sub(r'\s+', ' ', t).strip()
        if not t or (k, t) in seen or t in names:
            continue
        seen.add((k, t))
        n, lim = count(t), LIMIT.get(k, 16)
        notes = []
        if n > lim and not any(nm in t for nm in names if len(nm) > 2):
            notes.append(f'超长（{n} > {lim}）'); over.append((k, t))
        for use, bad in TERMS:
            for w in bad:
                if w in t:
                    notes.append(f'用词：「{w}」统一写「{use}」')
        for pat, lab in STYLE:
            if re.search(pat, t) and not (lab == '括号补充' and (re.search(r'^[^（(]*[（(](PC|手机|仙女棒)[）)]', t) or re.fullmatch(r'导出本层（[^（）]+）', t))):   # v3.1 第 21 条：层名放进操作名
                notes.append(lab)
        if k not in ('对话框正文',) and t.endswith('。'):
            notes.append('句末句号')
        if len(notes) > (1 if notes and notes[0].startswith('超长') else 0):
            flagged.append((k, t, notes))
        table.append((k, t, n, lim, '；'.join(notes) or '—'))
    table.sort(key=lambda r: (list(LIMIT).index(r[0]) if r[0] in LIMIT else 99, r[1]))
    print(f'条目 {len(rows)}，去重后 {len(table)}，超长 {len(over)}，用词 / 语气 {len([f for f in flagged if any(not x.startswith("超长") for x in f[2])])}')
    for k, t, *_ in over:
        print('  超长：', k, t)
    for k, t, nts in flagged:
        print('  核对：', k, t, nts)
    if DOC:
        md = ['| 位置 | 文字 | 字数 | 上限 | 核对 |', '| --- | --- | --- | --- | --- |'] + [f'| {k} | {t.replace("|", "｜")} | {n} | {lim} | {r} |' for k, t, n, lim, r in table]
        doc = Path(DOC); s = doc.read_text(encoding='utf-8')
        a, z = '<!-- 文案自查表 开始 -->', '<!-- 文案自查表 结束 -->'
        if a in s and z in s:
            s = s[:s.index(a) + len(a)] + '\n' + '\n'.join(md) + '\n' + s[s.index(z):]
            doc.write_text(s, encoding='utf-8'); print('写进', doc)


if __name__ == '__main__':
    main()
