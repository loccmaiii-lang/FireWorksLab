#!/usr/bin/env python3
"""E 样板对比页（对话框9，2026-11-05）：v2.3 → v3（--rows spec），v3 → v3.1（--rows v31），v3.1 → v3.2（--rows v32），v3.2 → v3.3（--rows v33），v3.3 → v3.4（--rows v34），v3.4 → v3.5（--rows v35），v3.5 → v3.6（--rows v36）

每一行对应 E 设计规范 v3 的一节（§1 字号 … §12 浮层，§13 自查的三种画面），外壳顶栏单独一行（用户 2026-11-05 改定，
另附资源交付页、资源编排页）。两列是 v2.3、v3：同一个状态下截 #app，按同一块区域裁图——区域取两版里那几个元素外框的并集，
所以同一格两张图的位置和尺寸完全一样。

用法（在 src/ 下）：
  python3 build.py /tmp/E_v3.html
  python3 checks/compare.py [--base ../E样板_v2.3.html] [--new /tmp/E_v3.html] [--out ../对比_v23_v3.html]
  python3 checks/compare.py --rows v31 --base ../E样板_v3.html --base-label v3 --new ../E样板_v3.1.html --new-label v3.1 --out ../对比_v3_v31.html
  --rows spec：按设计规范 v3 的节号排；--rows v31 … v36：按 E样板_v3.1 … v3.6_改动单.md 的编号排
只开一个浏览器。图片用 WebP 内嵌进一个 HTML 文件。
"""
import argparse, base64, html, io, os, sys, time
from PIL import Image
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
RES = os.path.dirname(os.path.dirname(HERE))
ap = argparse.ArgumentParser()
ap.add_argument('--base', default=os.path.join(RES, 'E样板_v2.3.html'))
ap.add_argument('--new', default='/tmp/E_v3.html')
ap.add_argument('--out', default=os.path.join(RES, '对比_v23_v3.html'))
ap.add_argument('--q', type=int, default=84, help='WebP 质量')
ap.add_argument('--base-label', default='v2.3')
ap.add_argument('--new-label', default='v3')
ap.add_argument('--rows', choices=['spec', 'v31', 'v32', 'v33', 'v34', 'v35', 'v36'], default='spec')
A = ap.parse_args()

VERS = [(A.base_label, A.base), (A.new_label, A.new)]

# ---------------------------------------------------------------- 状态：每个状态重新载入一次，再做这一步
CLOSE_POP = "document.body.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))"
STATES = {
    'main': {},
    'import': {'js': "SHELL.ws('import')"},
    'wb': {'js': "SHELL.ws('wb')"},
    'worst': {'js': f"SHELL.set('ue', 'off'); SHELL.set('exp', 'perm'); SHELL.set('bak', 'perm'); {CLOSE_POP}"},
    'expmenu': {'js': 'KIT.openExport()', 'wait': 400},
    'tip': {'hover': '#pbody .pl[data-help]', 'wait': 900},
    'spk': {'js': "KIT.set('scene', 'spk')", 'wait': 600},
    'deliv': {'js': "try { KIT.mode('贴图与交付') } catch (e) {} try { KIT.mode('序列贴图') } catch (e) {}", 'wait': 600},   # v3.4 改名「序列贴图」
    'm1366': {'size': 1366, 'wait': 400},
    'kit': {'kit': True, 'wait': 300},          # 样板控制条不藏（v3.3 第 15 条）
}

# ---------------------------------------------------------------- 行：(编号, 标题, 规范要点, [(状态, 区域, 图注, 选项)])
# 区域：'app' = 整屏；选择器列表 = 两版外框的并集（pad 外扩）；split = 横向切成几段（太宽的条）
ROWS = [
    ('改定', '外壳顶栏（用户 2026-11-05 改定）',
     '去掉「制作 / 导入 / 编排」切换，默认就是制作；右上角 UE ｜ 导出、备份 ｜「资源交付」「资源编排」 ｜ 显卡；更新记录放到版本号上；两页工具行左端「← 返回制作」，再点亮着的标签也回到制作。',
     [('main', ['#shell'], '顶栏', {'split': 2, 'pad': 0}), ('import', 'app', '资源交付页' + ('（v2.3 是「导入」工作区）' if A.base_label == 'v2.3' else ''), {}), ('wb', 'app', '资源编排页' + ('（v2.3 是「编排」工作区）' if A.base_label == 'v2.3' else ''), {})]),
    ('§1', '字号与字重',
     '三级字号 12 / 13 / 15（1366 下 11 / 12 / 14），效果库大号标签 15；字重只有 400 和 600，600 只给当前位置、模块标题、当前标签、产品名；数值主文字色，单位弱色小一级。',
     [('main', ['#insp'], '检查器上半', {'h': 330})]),
    ('§2', '网格与间距',
     '基本单位 4；行高 28、控件 24、点击区 ≥ 28；面板内边距 12，组内 8、组间 20；栏宽 300 / 460（1366 下 260 / 380）；检查器五列：参数名 112 ｜ 控件 ｜ 数值 72 ｜ 单位 28 ｜ 操作 24，滑杆结束在同一条线上。',
     [('main', ['#pbody'], '检查器参数行', {'y0': 120, 'h': 420})]),
    ('§3', '面与线',
     '面四级：画面 ＜ 面板 ＜ 栏头 ＜ 浮层；线只有一种：1 px、亮一级；不用底色条做标题，也不用 4 px 的缝；填底色只表示「选中 / 开着」。',
     [('main', 'app', '主屏 1920 × 1080', {})]),
    ('§4', '控件语法',
     '一种意思一种样子：主操作薄荷实底，每页一个；命令静止无底、悬停出浮层底色；分段控件只有一种（M / S）；「保存 •」不填底色。',
     [('main', ['#toolRow'], '制作区工具行', {'split': 2, 'pad': 0})]),
    ('§5', '状态与颜色',
     '薄荷只给每页唯一的主操作、播放头、结构树当前行细框、一级标签和当前页标签下划线、UE 已连接圆点；琥珀只给「需重新导出」和会挡住操作的设置；红只给错误；效果库状态词要处理的主文字色，其余弱色。',
     [('main', ['#left'], '左栏：结构树（需重新导出三角）+ 效果库状态词', {'h': 560}), ('main', ['#expBtn'], '导出按钮和「⚠ 1」', {'x0': -300, 'pad': 6})]),
    ('§6', '图标',
     '16 px 画布、1.5 px 线、方头、只画线框；一种形状一个意思：圆箭头只表示恢复默认，循环是首尾相接的矩形环，版本记录是三张纸，需重新导出是琥珀三角。',
     [('main', ['#tree'], '结构树类型图标', {}), ('main', ['#transport'], '播放条', {'split': 2, 'pad': 0})]),
    ('§7', '一个信息只出现一次',
     '当前层名只在结构树和面包屑；单格大小、张数、帧数只在检查器「输出」；画面读数只留平台、fps、tick，距离和曝光收进「预览设置」，不是默认值时才在右下出小标记。',
     [('main', ['#stage'], '画面与读数', {})]),
    ('§8', '时间轴',
     '播放条三组；导出范围画在刻度尺上（浅底 + 两端把手，上方写范围）；胶片条 28 px 只覆盖导出范围；层行 6 px、发射器行 2 px，超出范围降到 40 %；1920 下至少 6 行。',
     [('main', ['#transport', '#tlw'], '播放条 + 时间轴', {})]),
    ('§9', '检查器',
     '顶部面包屑（末项大号 600），下一行搜索、「筛选 ▾」「全部折叠」；模块标题行 28 px、600，摘要右对齐到数值列，模块之间 1 px 线；改动标记在左边槽位；区间写「1.2–2.0」，分布收进展开箭头。',
     [('main', ['#insp'], '检查器整列', {})]),
    ('§10', '左栏',
     '结构树第一行是效果名，行高 28，显示 / 只看 / ⋯ 只在悬停、当前行或非默认时出现；效果库大号标签「效果 / 模板」→ 搜索 → 筛选块 + 「6 个」+「新建」；列表行缩略图 40、副信息「代号　N 层」。',
     [('main', ['#left'], '左栏整列', {})]),
    ('§11', '外壳顶栏的状态',
     '高 40（1366 下 36），栏头面色、底边 1 px 线；四组之间 1 px 竖线，组内 12、组间 20；「导出 未选」「需允许访问」琥珀，「备份 未选」弱色 +「设置」；当前页标签薄荷下划线。',
     [('worst', ['#shell'], '1920：UE 未连接，导出、备份都需允许访问', {'split': 2, 'pad': 0}), ('m1366', ['#shell'], '1366 × 768：正常状态', {'split': 2, 'pad': 0})]),
    ('§12', '浮层与提示',
     '提示框浮层面色、6 px 小三角、离触发点 8 px、最宽 260；导出 ▾ 菜单分三段：一行摘要（详情点开）→ 操作（右侧写数字）→ 选项（平台分段、「同时放进编排」）；提示条统一出在外壳提示区。',
     [('expmenu', ['.menu', '#expBtn'], '导出 ▾ 菜单', {'pad': 16}), ('tip', ['.ovl > .tip', '#pbody .pl[data-help]'], '参数说明提示框', {'pad': 20})]),
    ('§13', '自查：1366 × 768', '字号小一级，栏宽 260 / 380；时间轴至少 4 行。', [('m1366', 'app', '主屏 1366 × 768', {})]),
    ('§13', '自查：仙女棒', '第二个场景（发射器多、层少）。', [('spk', 'app', '主屏，场景「仙女棒」', {})]),
    ('§13', '自查：贴图与交付', '工作模式「贴图与交付」：交付表 PC / 手机两格、胶片、导出浮层的入口。', [('deliv', 'app', '主屏，「贴图与交付」', {})]),
]

# v3 → v3.1：按改动单条目排（E样板_v3.1_改动单.md）；同一块区域放在一起看的几条并成一行
ROWS_V31 = [
    ('4、10、11', '外壳顶栏：状态、命令、页面入口分开样子；计数框',
     '状态（UE、导出、备份）前面小圆点（好 = 薄荷、要处理 = 琥珀、其他 = 灰）、文字弱色；「备份 未选」琥珀 +「设置」（命令样子）；页面入口是标签样子，悬停出底色，当前页薄荷下划线 + 加粗；组间只靠 24 px 间距；计数一律是 1 px 方框里的小号数字。',
     [('main', ['#shell'], '顶栏（制作）', {'split': 2, 'pad': 0}), ('import', ['#shell'], '顶栏（打开着资源交付）', {'split': 2, 'pad': 0}), ('import', 'app', '资源交付页', {}), ('wb', 'app', '资源编排页', {})]),
    ('1、12、13', '时间轴：入点出点、刻度尺、胶片条',
     '「导出范围」那一行行名格里放设为入点 / 设为出点 / 恢复三个图标命令，范围数字写在它们左边；刻度尺上不压字，播放头头部在刻度数字上方；没烘焙的胶片格是平的暗底，已烘焙的缩略图最亮。',
     [('main', ['#transport', '#tlw'], '播放条 + 时间轴', {})]),
    ('2、3', '面包屑、画面读数',
     '面包屑恢复「金曜菊-B › 金锦层」，末项大号；画面右下角常驻「距离 1000 m　预览曝光 1.00 倍」（弱色、可拖可输入），左下角「PC　30 fps　tick 60」。',
     [('main', ['#path'], '面包屑', {'pad': 8}), ('main', ['#ciBL', '#ciView'], '画面下沿的读数（左下、右下）', {'pad': 16})]),
    ('5、11', '导出按钮旁的计数',
     '「⚠ 1」改成「⚠ 1 层」，计数写法和顶栏一致。',
     [('main', ['#expBtn'], '导出按钮和需重新导出计数', {'x0': -300, 'pad': 6})]),
    ('6、15、16、17', '检查器参数行',
     '停用参数的原因用弱色小字写在数值列；滑杆到数值的空隙 8 px（区间数值格加宽、单值滑杆向右延伸）；一行最多一个改动标记（左侧竖条），非默认值只靠常显的恢复按钮；开关「开」轨道明显更亮。',
     [('main', ['#pbody'], '检查器参数行', {'h': 620})]),
    ('7、8、18', '效果库',
     '大号标签「效果 / 模板」等宽两半，下划线横跨整个标签，折叠箭头在标签行最右；搜索框静止时就有 1 px 线框；当前项很淡的底色 + 主文字色，比结构树当前行弱。',
     [('main', ['#libPane'], '效果库', {})]),
    ('9、19', '粗体与结构树',
     '粗体只给当前位置和模块标题：选中的分段、筛选块、标签页、时间轴层名都不加粗；层行去掉叠层图标（根行保留）。',
     [('main', ['#treePane'], '结构树', {}), ('main', ['#toolRow'], '工具行（分段不加粗）', {'split': 2, 'pad': 0})]),
    ('14', '工具图标',
     '网格、批注、精简布局、左栏、右栏重画，分成「画面叠加」「面板」两组，组间 12 px；「建议曝光」改成「A」加小三角。',
     [('main', ['#viewbar'], '画面叠加与面板', {'pad': 8})]),
    ('20', '空白',
     '时间轴高度按内容定，1920 下金曜菊-B 三层和所有发射器放得下；左栏效果库往下长，占满空白。',
     [('main', 'app', '主屏 1920 × 1080', {})]),
    ('21', '导出 ▾ 菜单',
     '摘要只留「1 层需重新导出　详情」；右列只放数字，层名进操作名「导出本层（金锦层）」；菜单左边缘对齐检查器左栏线。',
     [('expmenu', ['.menu', '#expBtn'], '导出 ▾ 菜单', {'pad': 16})]),
    ('自查', '1366 × 768', '字号小一级，栏宽 260 / 380。', [('m1366', 'app', '主屏 1366 × 768', {})]),
    ('自查', '仙女棒', '第二个场景（发射器多、层少）。', [('spk', 'app', '主屏，场景「仙女棒」', {})]),
    ('自查', '贴图与交付', '工作模式「贴图与交付」。', [('deliv', 'app', '主屏，「贴图与交付」', {})]),
]
# v3.1 → v3.2：按 E样板_v3.2_改动单.md 的编号排（同一块区域的几条并成一行）
ROWS_V32 = [
    ('1', '没在编辑的层自动折叠',
     '结构树和时间轴里只展开当前编辑的层及其上级，其余层折成一行；省出的高度还给画面；时间轴按内容定高，最多占中栏 1/3。',
     [('main', ['#treePane'], '结构树', {}), ('main', 'app', '主屏 1920 × 1080', {})]),
    ('2、3、4', '检查器：滑杆右端对齐、建议曝光图标、开关开态',
     '单值行和区间行的数值格同宽，所有滑杆结束在同一条线，滑杆到数值 8 px；曝光行的「建议曝光」画成图标，不再是「A.」；开关开态轨道接近次文字色、方块主文字色，开、关、停用一眼分得开。',
     [('main', ['#pbody'], '检查器参数行（金曜菊-B）', {'h': 760})]),
    ('5', '导出浮层',
     '右对齐挂在导出按钮的下拉箭头下面，浮层底色 + 1 px 线 + 阴影；不盖住检查器的参数名；右侧计数列只放数字。',
     [('expmenu', ['.menu', '#expBtn'], '导出 ▾ 菜单', {'pad': 16})]),
    ('6', '画面读数',
     '左下、右下两组在同一条基线上；标签、数值、单位紧贴成一组，组和组之间留空。',
     [('main', ['#ciBL', '#ciView'], '画面下沿的读数（左下、右下）', {'pad': 16})]),
    ('7', '胶片条',
     '没烘焙的部分画成一条平的暗轨，不再分格子。',
     [('main', ['#transport', '#tlw'], '播放条 + 胶片条 + 刻度尺', {'h': 120})]),
    ('8', '曲线',
     '轴说明「寿命 0–100 %」只写一次，放进曲线下面那行读数；读数一行「关键点 2/5　寿命 15 %　大小 0.90 倍」。',
     [('spk', ['#pbody'], '检查器（仙女棒，有曲线）', {})]),
    ('9', '薄荷只用在三处',
     '导出按钮、结构树当前行细框、当前标签下划线；播放头改成次文字色的线，只有顶上的小头是薄荷；UE 已连接不再画薄荷点。',
     [('main', ['#transport', '#tlw'], '时间轴（播放头）', {}), ('main', ['#shell'], '顶栏', {'split': 2, 'pad': 0})]),
    ('10', '效果库状态',
     '「待验收」用琥珀色（要你处理），其余状态弱色；太暗的缩略图按最亮的一帧自动提亮。',
     [('main', ['#libPane'], '效果库', {})]),
    ('11、12、13', '外壳顶栏：圆点只给例外、三组加竖线、方框只表示数量',
     '正常状态不画圆点、弱色字，只有要处理的画琥珀圆点 + 琥珀字；三组（状态 + 设置 ｜ 页面入口 ｜ 显卡）之间各一条 1 px 竖线，「设置」在状态组末尾；版本号计数悬停写「2 条未读更新」；状态栏「快捷键」不加方框。',
     [('main', ['#shell'], '顶栏（正常 + 备份未选）', {'split': 2, 'pad': 0}), ('worst', ['#shell'], '顶栏（UE 未连接、导出和备份都需允许访问）', {'split': 2, 'pad': 0}),
      ('main', ['#status .st-r'], '状态栏右端（快捷键）', {'x0': -200, 'pad': 4}), ('import', 'app', '资源交付页', {}), ('wb', 'app', '资源编排页', {})]),
    ('自查', '1366 × 768', '字号小一级，栏宽 260 / 380。', [('m1366', 'app', '主屏 1366 × 768', {})]),
    ('自查', '仙女棒', '第二个场景（发射器多、层少）。', [('spk', 'app', '主屏，场景「仙女棒」', {})]),
    ('自查', '贴图与交付', '工作模式「贴图与交付」。', [('deliv', 'app', '主屏，「贴图与交付」', {})]),
]
# v3.2 → v3.3：按 E样板_v3.3_改动单.md 的编号排（同一块区域的几条并成一行）
ROWS_V33 = [
    ('1、5、8、10、11、14', '检查器参数行：数字对齐、颜色模块对列、隐藏项进标题行、开关、滑杆拖块、折叠箭头',
     '数值右对齐、小数点对齐、数字等宽；曝光数值和色带落在同一套 5 列网格；「N 项已隐藏」变成标题行右侧「+N」；开关 26 × 14 以上，开 = 实心轨道、关 = 线框、停用 40 %；滑杆拖块 4 × 14 实心；折叠箭头离面板边 12 px。',
     [('main', ['#pbody'], '检查器参数行（金曜菊-B）', {'h': 760}), ('spk', ['#pbody'], '检查器参数行（仙女棒）', {'h': 760})]),
    ('6、13', '字号层级、检查器不留空',
     '三个字号分用途：大号只给面包屑末项和效果名，中号给参数和正文，小号给读数和计数；模块标题上空 16、下空 6；1920 下常用模块按「运动 → 颜色 → 寿命」默认展开到放满。',
     [('main', ['#insp'], '检查器整列（金曜菊-B）', {}), ('spk', ['#insp'], '检查器整列（仙女棒）', {})]),
    ('2', '效果库：「待验收」不用琥珀',
     '「待验收」改成主文字色，琥珀只给异常和要处理的警告。',
     [('main', ['#libPane'], '效果库', {})]),
    ('3、4、12', '时间轴：播放头一个颜色、不悄悄藏行、胶片条',
     '播放头头和线都是薄荷、线宽 1 px；默认滚到顶，放不下时上下边缘写「上面还有 N 行」「下面还有 N 行」；已烘焙的格子显示真缩略图（行高 ≥ 28），没烘焙的是平的暗轨。',
     [('main', ['#transport', '#tlw'], '播放条 + 时间轴（金曜菊-B）', {}), ('spk', ['#transport', '#tlw'], '播放条 + 时间轴（仙女棒）', {})]),
    ('7', '工具图标重画',
     '16 px 网格、1.5 px 线、方头方角、光学大小一致；制作区工具行、画面叠加与面板、播放条都换掉。',
     [('main', ['#toolRow'], '制作区工具行', {'split': 2, 'pad': 0}), ('main', ['#viewbar'], '画面叠加与面板', {'pad': 8}), ('main', ['#transport'], '播放条', {'split': 2, 'pad': 0})]),
    ('9', '帧计数一致',
     '界面上的帧号一律从 1 数，「烘焙」和画面读数用同一个词，同一时刻两个数不矛盾。',
     [('main', ['#transport'], '播放条', {'split': 2, 'pad': 0}), ('main', ['#ciBL', '#ciView'], '画面下沿的读数', {'pad': 16})]),
    ('15', '样板控制条',
     '收起时只留左下角一个小按钮，不盖住检查器（这一格不藏样板控制条）。',
     [('kit', 'app', '主屏 1920 × 1080（显示样板控制条）', {})]),
    ('16、19', '外壳顶栏：「设置」并进状态项、图标',
     '删掉单独的「设置」；「备份 未选」「导出 …」整项可点，悬停出底色；顶栏图标按第 7 条画法。',
     [('main', ['#shell'], '顶栏（正常 + 备份未选）', {'split': 2, 'pad': 0}), ('worst', ['#shell'], '顶栏（UE 未连接、导出和备份都需允许访问）', {'split': 2, 'pad': 0})]),
    ('17、18', '资源交付页',
     '选中的包在中间放大显示回放缩略图、修订和检查摘要；没选中时写一行「选一个包查看」；「待验收」主文字色。',
     [('import', 'app', '资源交付页', {}), ('wb', 'app', '资源编排页', {})]),
    ('自查', '主屏 1920 × 1080', '整屏。', [('main', 'app', '主屏 1920 × 1080', {})]),
    ('自查', '1366 × 768', '字号小一级，栏宽 260 / 380。', [('m1366', 'app', '主屏 1366 × 768', {})]),
    ('自查', '仙女棒', '第二个场景（发射器多、层少）。', [('spk', 'app', '主屏，场景「仙女棒」', {})]),
    ('自查', '贴图与交付', '工作模式「贴图与交付」。', [('deliv', 'app', '主屏，「贴图与交付」', {})]),
]
# v3.3 → v3.4：按 E样板_v3.4_改动单.md 的编号排（用户 15:50 的 18 条 + 盲比退步 3 条）
ROWS_V34 = [
    ('1、2、3', '外壳：顶栏只放三项，文件夹到左下角，资源交付进导出菜单',
     '右上「UE 已连接 ｜ GeForce RTX 5080 ｜ 编排工作台 →」；UE 断开原地出「重新连接」；导出、备份文件夹在左下角状态栏；「资源交付」从顶栏去掉，放进「导出 ▾」第一项。',
     [('main', ['#shell'], '顶栏', {'split': 2, 'pad': 0}), ('worst', ['#shell'], '顶栏（UE 断开、文件夹需允许访问）', {'split': 2, 'pad': 0}),
      ('main', ['#status'], '左下角状态栏', {'split': 2, 'pad': 0}), ('expmenu', ['.menu', '#expBtn'], '导出 ▾ 菜单', {'pad': 16}), ('wb', 'app', '编排工作台页', {})]),
    ('4、6、8、9、10', '工具行：未保存点、撤销保存加框、左右栏开关回原位、精简和网格图标、分段不挤、「序列贴图」',
     '「保存」后面薄荷点；撤销 / 重做 / 还原、保存 / 另存各一个 1 px 线框；隐藏左栏在最左、隐藏右栏在最右，精简只放方块图标；网格是方块网格；分段每段左右 16 px。',
     [('main', ['#toolRow'], '制作区工具行', {'split': 2, 'pad': 0})]),
    ('7、12、14、15', '结构树：只看图标、当前层竖线、加层加发射器、少箭头',
     '只看 = 四边断开的方块加中间小实心块；当前层左边 2 px 薄荷竖线；去掉底部「加层 / 加发射器」行，效果名行右端「+」，层行悬停「+」；展开箭头静止时不画。',
     [('main', ['#treePane'], '结构树（金曜菊-B）', {}), ('spk', ['#treePane'], '结构树（仙女棒）', {})]),
    ('10、11、15、16、19、21', '检查器：不挤、薄荷、少箭头、恢复按钮只在悬停时出现、区间写法、摘要',
     '标题行 32、上空 20；开关开 / 勾选 / 滑杆已填用薄荷；模块标题前不画箭头；恢复按钮只在悬停时出现，默认值用次文字色；区间「a – b」；折叠摘要写成连贯短语。',
     [('main', ['#insp'], '检查器（金曜菊-B）', {}), ('spk', ['#insp'], '检查器（仙女棒）', {})]),
    ('17、20', '播放条与导出范围行',
     '左组 ▷ |◁ 1× ⟳；当前时间大号；秒表；帧数挪到画面左下；最右「选项 ▾」和小相机；导出范围行的入点出点图标只在悬停时出现。',
     [('main', ['#transport', '#tlw'], '播放条 + 时间轴', {'h': 160}), ('main', ['#ciBL', '#ciView'], '画面下沿读数', {'pad': 16})]),
    ('15、18', '效果库：筛选块变大、去掉数量、去掉模板旁箭头',
     '筛选块高 28、字号 13；不写「10 个」；「模板」右边不画箭头。',
     [('main', ['#libPane'], '效果库', {})]),
    ('自查', '主屏 1920 × 1080', '整屏。', [('main', 'app', '主屏 1920 × 1080', {})]),
    ('自查', '1366 × 768', '字号小一级。', [('m1366', 'app', '主屏 1366 × 768', {})]),
    ('自查', '仙女棒', '第二个场景。', [('spk', 'app', '主屏，场景「仙女棒」', {})]),
    ('自查', '序列贴图', '原「贴图与交付」模式。', [('deliv', 'app', '主屏，「序列贴图」', {})]),
    ('自查', '资源交付页', '从「导出 ▾」进入。', [('import', 'app', '资源交付页', {})]),
]
# v3.4 → v3.5：按 E样板_v3.5_改动单.md 的编号排（用户 17:05 的 12 条）
ROWS_V35 = [
    ('9、10', '外壳顶栏：显卡写法、UE 已连接高亮、「编排节目」加框',
     '「显卡 · GeForce RTX 5080」；UE 已连接前面薄荷圆点；「编排节目 →」1 px 线框，悬停箭头右移变薄荷。',
     [('main', ['#shell'], '顶栏', {'split': 2, 'pad': 0}), ('worst', ['#shell'], '顶栏（UE 断开）', {'split': 2, 'pad': 0}), ('wb', 'app', '编排节目页', {})]),
    ('1、4、8、12', '工具行：图标统一、两组分段一样大、右栏工具行重排、改名',
     '图标 16 px 画布、12 px 可画区、1.5 线、方头；两组分段同高同内边距；「适应窗口 / 1:1 / 实机窗口」；右栏：撤销 重做 版本记录 ⚠ 意见 …… 还原 保存 另存 导出。',
     [('main', ['#toolRow'], '工具行', {'split': 2, 'pad': 0}), ('m1366', ['#toolRow'], '工具行（1366）', {'split': 2, 'pad': 0})]),
    ('1、6、11', '结构树：眼睛换回、只看改圆圈、最后一层下面「+ 加层」',
     '显示用 v3.3 的眼睛；只看是一个圆圈；每个效果最后一层下面留「+ 加层」。',
     [('main', ['#treePane'], '结构树（金曜菊-B）', {}), ('spk', ['#treePane'], '结构树（仙女棒）', {})]),
    ('2', '效果库层级',
     '一级「效果 / 模板」；二级花型筛选一整行等宽分段；三级搜索 + 新建；左边缘对齐。',
     [('main', ['#libPane'], '效果库', {})]),
    ('3', '检查器：不悬停也看得出层级和能折叠',
     '模块标题 600、贴左；参数行缩进 12；标题行最右常驻弱色折叠箭头。',
     [('main', ['#insp'], '检查器（金曜菊-B）', {}), ('spk', ['#insp'], '检查器（仙女棒）', {})]),
    ('5、7', '播放条与导出范围行：去掉胶片行，出入点设置露出来，秒表和相机放最右',
     '没有「烘焙」胶片行；导出范围那一行放范围、入点出点恢复图标和原「选项」里的开关；播放条最右是秒表和相机。',
     [('main', ['#transport', '#tlw'], '播放条 + 时间轴', {'h': 200}), ('m1366', ['#transport', '#tlw'], '播放条 + 时间轴（1366）', {'h': 200})]),
    ('自查', '主屏 1920 × 1080', '整屏。', [('main', 'app', '主屏 1920 × 1080', {})]),
    ('自查', '1366 × 768', '字号小一级。', [('m1366', 'app', '主屏 1366 × 768', {})]),
    ('自查', '仙女棒', '第二个场景。', [('spk', 'app', '主屏，场景「仙女棒」', {})]),
    ('自查', '导出 ▾ 菜单', '第一项「资源交付」。', [('expmenu', ['.menu', '#expBtn'], '导出 ▾ 菜单', {'pad': 16})]),
]
# v3.5 → v3.6：按 E样板_v3.6_改动单.md 的编号排（用户 17:51 的三处 + v3.5 审查）
ROWS_V36 = [
    ('1、8、9、10', '导出范围那一行',
     '「导出范围」在行名列，数值从刻度 0 s 开始，入点 / 出点 / 恢复跟在后面；「一并移动」「同刻联动」改成勾选框，右对齐到刻度尺末端；和播放条之间不画线。',
     [('main', ['#transport', '#tlw'], '播放条 + 时间轴（金曜菊-B）', {'h': 140}), ('spk', ['#transport', '#tlw'], '播放条 + 时间轴（仙女棒，选中发射器）', {'h': 140}), ('m1366', ['#transport', '#tlw'], '播放条 + 时间轴（1366）', {'h': 140})]),
    ('2、11', '导出按钮带上「▲1」，版本记录图标重画',
     '去掉单独的「⚠ 1 层」；导出主段「导出 ▲1」，琥珀垫深色小块；菜单摘要「▲ 1 层需重新导出」并展开原因；版本记录 = 时钟加逆时针箭头。',
     [('main', ['#toolRow'], '工具行', {'split': 2, 'pad': 0}), ('expmenu', ['.menu', '#expBtn'], '导出 ▾ 菜单', {'pad': 16}), ('m1366', ['#toolRow'], '工具行（1366）', {'split': 2, 'pad': 0})]),
    ('3、7', '图标按钮位置、竖线对齐',
     '画面工具行中段左边只放文字分段，右边只放图标开关；网格在「精简」左边 20 px；序列贴图的格子线用同一个位置；三条竖线 x312 / x468 / x1442。',
     [('main', 'app', '主屏 1920', {}), ('deliv', 'app', '序列贴图模式', {})]),
    ('4、10', '检查器：设曝光按钮挪位、基线对齐',
     '「按最亮时刻设曝光」挪到标签和控件之间，改过曝光后也点得到；折叠模块的标题和摘要按基线对齐。',
     [('main', ['#insp'], '检查器', {})]),
    ('5', '画面读数加暗晕', '读数加两层暗晕，花扫过时也看得清。', [('main', ['#ciBL', '#ciView'], '画面下沿读数', {'pad': 16})]),
    ('6', '1366 下小字不再缩到 11', '小号保持 12，中号、大号各减 1。', [('m1366', 'app', '主屏 1366 × 768', {})]),
    ('12、13', '资源交付页', '资产表按内容定宽；「UE 路径」写文字；列头「名称」；多行文字行高 1.5。', [('import', 'app', '资源交付页', {})]),
    ('14', '效果库缩略图', '按花的外接框裁切，再统一曝光。', [('main', ['#libPane'], '效果库', {})]),
    ('自查', '仙女棒', '第二个场景。', [('spk', 'app', '主屏，场景「仙女棒」', {})]),
]
if A.rows == 'v31':
    ROWS = ROWS_V31
elif A.rows == 'v32':
    ROWS = ROWS_V32
elif A.rows == 'v33':
    ROWS = ROWS_V33
elif A.rows == 'v34':
    ROWS = ROWS_V34
elif A.rows == 'v35':
    ROWS = ROWS_V35
elif A.rows == 'v36':
    ROWS = ROWS_V36

RECT_JS = """sels => { const A = document.querySelector('#app').getBoundingClientRect();
  return sels.map(s => { const e = [...document.querySelectorAll(s)].find(x => x.getClientRects().length); if (!e) return null; const r = e.getBoundingClientRect();
    return [r.left - A.left, r.top - A.top, r.right - A.left, r.bottom - A.top]; }); }"""


def shoot(pw):
    """两版各走一遍所有状态：返回 {版本: {状态: (PIL 图, {选择器: 外框})}}"""
    need = {}
    for _, _, _, items in ROWS:
        for st, reg, _, _ in items:
            need.setdefault(st, set())
            if reg != 'app':
                need[st].update(reg)
    out, errs = {}, []
    b = pw.chromium.launch()
    for ver, path in VERS:
        pg = b.new_page(viewport={'width': 1920, 'height': 1200}, device_scale_factor=1)
        pg.on('pageerror', lambda e, v=ver: errs.append(f'{v}: {e}'))
        pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith(('file:', 'data:')) else r.abort())
        url = 'file://' + os.path.abspath(path)
        out[ver] = {}
        for st, cfg in STATES.items():
            if st not in need:
                continue
            size = cfg.get('size', 1920)
            pg.set_viewport_size({'width': 1920 if size == 1920 else 1366, 'height': 1200 if size == 1920 else 860})
            pg.goto(url)
            pg.wait_for_function('window.SHELL && window.KIT', timeout=15000)
            if not cfg.get('kit'):
                pg.add_style_tag(content='#sampleBar{visibility:hidden!important}')
            if size == 1366:
                pg.evaluate("KIT.set('size', '1366')")
            pg.mouse.move(600, 1180 if size == 1920 else 840)   # 停在 #app 外面，不出悬停
            pg.wait_for_timeout(250)
            if cfg.get('js'):
                pg.evaluate(f"(() => {{ {cfg['js']}; }})()")
            if cfg.get('hover'):
                pg.hover(cfg['hover'])
            pg.wait_for_timeout(cfg.get('wait', 250))
            img = Image.open(io.BytesIO(pg.locator('#app').screenshot())).convert('RGB')
            sels = sorted(need[st])
            rects = dict(zip(sels, pg.evaluate(RECT_JS, sels))) if sels else {}
            out[ver][st] = (img, rects)
        pg.close()
    b.close()
    return out, errs


def region(shots, st, sels, o):
    """两版外框的并集，外扩 pad，按 x0 / y0 / h 调整，夹在 #app 里"""
    boxes = [shots[v][st][1].get(s) for v, _ in VERS for s in sels]
    boxes = [x for x in boxes if x]
    W = min(shots[v][st][0].width for v, _ in VERS)
    H = min(shots[v][st][0].height for v, _ in VERS)
    if not boxes:
        return None
    pad = o.get('pad', 8)
    l, t = min(b[0] for b in boxes) - pad, min(b[1] for b in boxes) - pad
    r, bt = max(b[2] for b in boxes) + pad, max(b[3] for b in boxes) + pad
    l += o.get('x0', 0)
    t += o.get('y0', 0)
    if o.get('h'):
        bt = t + o['h']
    l, t, r, bt = max(0, round(l)), max(0, round(t)), min(W, round(r)), min(H, round(bt))
    return (l, t, r, bt)


def webp(im):
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=A.q, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()


def cells(shots, items):
    """每个版本一串 <figure>；同一项两版裁同一块"""
    col = {v: [] for v, _ in VERS}
    for st, reg, cap, o in items:
        if reg == 'app':
            boxes = [(0, 0, min(shots[v][st][0].width for v, _ in VERS), min(shots[v][st][0].height for v, _ in VERS))]
        else:
            box = region(shots, st, reg, o)
            if not box:
                for v, _ in VERS:
                    col[v].append(f'<figure><figcaption>{html.escape(cap)}：没找到 {html.escape(" ".join(reg))}</figcaption></figure>')
                continue
            n = o.get('split', 1)
            l, t, r, b = box
            w = (r - l) / n
            boxes = [(round(l + i * w), t, round(l + (i + 1) * w), b) for i in range(n)]
        for v, _ in VERS:
            imgs = ''.join(f'<img src="{webp(shots[v][st][0].crop(bx))}" width="{bx[2] - bx[0]}" height="{bx[3] - bx[1]}" alt="{html.escape(v + " " + cap)}" loading="lazy">' for bx in boxes)
            size = f'{boxes[0][2] - boxes[0][0]} × {boxes[0][3] - boxes[0][1]}' + (f' × {len(boxes)} 段' if len(boxes) > 1 else '')
            col[v].append(f'<figure>{imgs}<figcaption>{html.escape(cap)}<span>{size}</span></figcaption></figure>')
    return col


CSS = """
:root{--bg:#0c1518;--panel:#111d21;--chrome:#16242a;--line:#2b4149;--t1:#e4edef;--t2:#b4c5cb;--t3:#8da3ac;--p4:#00d49b;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--t1);font:13px/20px Inter,"Noto Sans SC","Noto Sans CJK SC",sans-serif;font-variant-numeric:tabular-nums}
header{padding:24px 32px 16px;background:var(--chrome);border-bottom:1px solid var(--line)}
h1{margin:0 0 6px;font-size:20px;line-height:28px;font-weight:600}
.lead{margin:0;max-width:1180px;color:var(--t2)}
.lead code{color:var(--t1)}
table{width:100%;border-collapse:collapse;table-layout:fixed}
thead th{position:sticky;top:0;z-index:2;padding:8px 16px;background:var(--panel);border-bottom:1px solid var(--line);text-align:left;font-weight:600}
thead th:first-child{width:260px}
tbody th{padding:16px;text-align:left;vertical-align:top;font-weight:400}
tbody th .no{display:block;color:var(--t3);font-size:12px}
tbody th b{display:block;margin-bottom:6px;font-size:15px;line-height:22px;font-weight:600}
tbody th p{margin:0;color:var(--t2)}
td{padding:16px;vertical-align:top;border-left:1px solid var(--line)}
tbody tr>*{border-top:1px solid var(--line)}
figure{margin:0 0 16px}
figure:last-child{margin-bottom:0}
figure img{display:block;max-width:100%;height:auto;margin-bottom:4px;background:#000;outline:1px solid var(--line);cursor:zoom-in}
figcaption{display:flex;gap:12px;color:var(--t3);font-size:12px;line-height:16px}
figcaption span{margin-left:auto}
#zoom{position:fixed;inset:0;z-index:9;display:none;overflow:auto;background:rgba(0,0,0,.88);cursor:zoom-out}
#zoom.on{display:block}
#zoom img{display:block;margin:24px auto;max-width:none}
@media (max-width:900px){thead{display:none}table,tbody,tr,th,td{display:block;width:auto}td{border-left:0}td::before{content:attr(data-v);display:block;margin-bottom:8px;color:var(--t3);font-weight:600}header{padding:16px}tbody th,td{padding:12px 16px}}
"""

JS = """
const z = document.getElementById('zoom'), zi = z.querySelector('img');
document.addEventListener('click', e => { const im = e.target.closest('figure img'); if (im) { zi.src = im.src; zi.alt = im.alt; z.classList.add('on'); } else if (e.target.closest('#zoom')) z.classList.remove('on'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') z.classList.remove('on'); });
"""


def main():
    for v, p in VERS:
        if not os.path.exists(p):
            sys.exit(f'找不到 {v}：{p}')
    t0 = time.time()
    with sync_playwright() as pw:
        shots, errs = shoot(pw)
    body = []
    for no, title, desc, items in ROWS:
        col = cells(shots, items)
        body.append(f'<tr><th scope="row"><span class="no">{html.escape(no)}</span><b>{html.escape(title)}</b><p>{html.escape(desc)}</p></th>'
                    + ''.join(f'<td data-v="{v}">{"".join(col[v])}</td>' for v, _ in VERS) + '</tr>')
    rel = lambda p: os.path.relpath(os.path.abspath(p), RES) if os.path.abspath(p).startswith(RES) else p
    BL, NL = VERS[0][0], VERS[1][0]
    basis = ('按 <code>协作/方案/E设计规范_v3_2026-11-05.md</code> 的节号排；外壳顶栏按用户 2026-11-05 改定单独一行。' if A.rows == 'spec'
             else f'按 <code>E样板_{ {"v31": "v3.1", "v32": "v3.2", "v33": "v3.3", "v34": "v3.4", "v35": "v3.5", "v36": "v3.6"}[A.rows]}_改动单.md</code> 的编号排，同一块区域的几条并成一行；最后三行是自查用的整屏。')
    doc = f"""<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>E 样板 {BL} → {NL} 对比</title><style>{CSS}</style></head>
<body><header><h1>E 样板 {BL} → {NL} 对比</h1>
<p class="lead">{basis}左列 {BL}（<code>{html.escape(rel(A.base))}</code>），右列 {NL}（<code>{html.escape(rel(A.new))}</code>）。
同一格两张图是同一个状态、同一块区域、同样大小（区域取两版元素外框的并集）；点图看原尺寸，Esc 或再点一下关掉。由 <code>src/checks/compare.py</code> 生成，{time.strftime('%Y-%m-%d %H:%M')}。</p></header>
<table><thead><tr><th>{'规范' if A.rows == 'spec' else '改动单'}</th>{''.join(f'<th>{v}</th>' for v, _ in VERS)}</tr></thead><tbody>
{chr(10).join(body)}
</tbody></table>
<div id="zoom" role="dialog" aria-label="原尺寸"><img alt=""></div>
<script>{JS}</script></body></html>
"""
    open(A.out, 'w', encoding='utf-8').write(doc)
    print(f'写了 {A.out}（{len(doc) / 1e6:.1f} MB，{len(ROWS)} 行，{time.time() - t0:.0f} 秒）')
    if errs:
        print('页面报错：', *errs[:5], sep='\n  ')
        sys.exit(1)


if __name__ == '__main__':
    main()
