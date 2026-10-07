"""界面状态检查（走查 4.2 A1–A6：会做错东西的状态切换）：真页面 + 假烘焙，几十秒跑完，云端就能跑

为什么用假烘焙：这里查的是「参数 / 版本 / 身份 / 重烘排队」这些状态对不对，不看像素。
假烘焙按真的取景 + 取帧计划（measure + plan）造一个烘焙结果，记下每次烘的参数，不碰显卡，所以快、而且结果可以逐项断言。

用法：python3 analysis/scripts/界面状态检查.py [--only A1,A4] [--out 结果.json] [--html 别的版本的 FireworkBaker.html] [--real]
  --real：不用假烘焙，真的烘（本机显卡任务 type "smoke" + "state": true 时这样跑，等待时间放长）
每项：pass / fail + 说明；有不过的项退出码 1。
  A1 新建效果不继承上一个效果的身份（资产栏名字、版本归属、导出名）（4.3 组合编辑器去掉了，改查「＋ 新建效果」）
  A2 4.3：以前组合编辑器里存的版本，打开烘焙器后搬进「我的效果」，能打开、层和参数都在；改了保存、刷新后还在
  A3 同一个效果里两层用同一个模板：改一层不带着另一层变
  A4 改完一层马上切到别的层：这一层的重烘不丢（贴图和参数一致）
  A5 切到别的效果：没保存的改动自动存成草稿，回来能选
  A6 切走再回来：带改动的状态不能被当成 AI 版基准（要么回到 AI 版，要么亮「参数已变」）
  A7 新建效果：新建 → 加层 → 改名 → 复制 → 勾同一批星 → 保存 → 刷新 → 打开：层、名字、参数、同一批星都在
  P1 4.4 参数面板按发射器分（用户 10-04 16:17 / 17:13）：发射器标签（效果 / 星 / 火花 / … / 输出 / 全部），打开菊默认只看「星」（≤ 30 项）；
     每一行都在发射器表里、没有「更多」；星的寿命叫「燃烧时间」；搜索 / 只看改过的跨发射器、标签上标改过几项；点标签换页、记住；
     说明点参数名才出（4.9.8：鼠标停多久都不弹；再点关、Esc 关、F1 看光标所在参数）；多层时每一层的参数也一样
  U1 撤销 / 重做：单层改两步 → Ctrl+Z 两次一步步回去 → Ctrl+Shift+Z 重做；多层改一层 → 撤销只回这一层、只重烘这一层、贴图和参数一致；
     切到别的效果后撤销不会改到新效果；资产栏有撤销 / 重做按钮
  B1 滑杆和拖动同一套规则（走查 B10–B12）：滑杆改燃烧，序列时长跟着变（和拖燃烧结束一样）；滑杆改引线层的「火花停」，接力的锦层点火跟着动；
     改点火时入点跟着内容走；「恢复」回到打开时的版本（AI 版），不是花型模板默认
  V1 版本只留一套（走查 B8）：工具页没有「版本与回滚」「派生配方」；导出时在资产栏「版本」里自动存一份（每个效果最多 3 份），能选回来、不串到别的效果
  X1 导出方案（4.2.12）：层页头选「PC：GPU 光点 / 手机：序列」→ 层记住、参数已变、交付页那一层写光点、引擎回放那一层画光点；撤销能回到序列；
     光点大小 / 亮度（4.2.15）只在选光点时出现，改了导出跟着变，改回 1 层里不留字段
  G1 待我验收的「最新导出」按导出时间取（4.2.12：任务号字面排序时 HN2E9 排在 HN2E12 后面，误判未就绪）
  K1 按需烘焙（4.2.16，用户 10-03 12:59「abc 一起做」）：自动烘焙关时改参数不烘、贴图标旧；切到引擎回放 / 按 B 才烘（手动烘做收紧取景）；
     烘到一半参数又变，这次直接丢掉（不等烘完再烘一遍）；自动烘焙开时改完自动烘、不收紧；多层导出不会拿到旧贴图；开关记住
  K2 按需烘焙 · 真烘焙（只在 --real）：真的显卡烘焙烘到一半改参数 → 这次作废、最后的贴图是最新参数、没有页面错误；自动烘焙关时按 B 烘到最新并收紧取景
  R1 「恢复到打开时」（单层）把被接力带动的另一层也恢复（10-03 复现：恢复第 1 层后第 2 层的延时点火还停在被带动的位置）
  S1 4.3.2 收尾：子花那几个「负数 = 默认」的参数是联动（H16；4.9.0 起是链条）；只剩 GPU 模拟内核、存档 / 旧母版的 CPU 换成 GPU（H12）；物理尾缀过顶后按下落段算、开花晚于到顶有提示（E11③ / H15②）
  S2 4.3.3 新建效果：打开就在第 1 层的参数上；加的层是这个效果自己的一份，改了不动原条目；保存再打开还在；不写「AI 版」
  S3 4.4：打开菊 / 空白发射器 / 升空尾缀，默认页的参数、各发射器标签（星 / 火花 / 尾缀各层…）、空白发射器的「+ 火花」看得见；模块开合、选的标签记得住
  N1 4.4 面板：发射器 → 模块的顺序、短名来自发射器表、英文名开关、「××随机」收在本体参数的「随机」下（点开才出、记住）、
     不起作用的参数变灰写原因（菊：点火延迟随机；牡丹：火花寿命）、搜索认短名 / 全名 / 英文名 / 模块名、说明条第一行「English · 中文 — 说明」、
     爆裂星的「爆裂」发射器、尾缀档位在「效果 › 规格」、空白发射器「+ 火花」/「去掉」
  S4 4.4：旧搜索 / 只看改过的时点发射器标签 = 清掉筛选、换到那一页，不改配方；「全部」把发射器都排出来
  E1 5.0 第 2 步（4.7.0）：一套物理——空中类火花按实际年龄冷却、结尾等火花自然灭完，「结尾」「冷却方式」开关删了；模板序列时长盖到火花灭完；缺省固定机位 + 匀速帧（4.4.3 的火花闪烁频率照查）
  X2 4.4.2：单层效果（牡丹）也有导出方案（4.4.3 加：点灭星的光点 Color Over Life 是方波、菊没有）：PC 序列 / 单束 / GPU 光点 / 不出、手机 序列 / 不出；选光点后 cascade.json 是 GPU 光点、引擎回放画光点；多层效果的层里不显示（在层页头选）
  N3 排查第 1 步：SCHEMA ↔ 默认值 ↔ 参数名称表 ↔ 发射器表 ↔ INERT / RAND_OF / SPARK_KEYS / PHASE_KEY / TIMING_KEYS / BLANK_MODS 对得上
  W2 4.5.3：左栏没有「我的版本」「已通过」（通过的进「我的效果」最上面）、我的效果每项没有删除；出点提示 + 一键清除；没烘时时间轴按新时长；远段面片上移
  R6 4.5.1 升空尾缀 RT6 近段 + 远段：缺省关 = RT5；开了贴图有粗 / 中 / 细、GPU 按档预算（上限一起降、降掉的回贴图）、贴图 + GPU = 出生率；交接权重相加 = 1；闪烁层；远看直径光量不变；
     TrailFar 导出、没有 RiseFade、命名 Loop + Far；近段贴图曝光 k → RiseLoop Color Over Life × 1 / k²；面板；4.5.2 分层看（近段 / 远段 / 每个 GPU 层开关、双击只看、全部恢复）
  R5 4.4.5 升空尾缀 RT5 选项：缺省旧做法；物理弹道到设定高度、第 1 秒减速够猛、星头光晕跟弹道（Velocity Over Life）；GPU 兼容（无 Acceleration、≤ 2 个 Initial Velocity）、
     GPU 粒子上限、细 / 中火花进贴图、H4 新口径和温度偏移无关；循环层长度起步不伸到发射点以下；面板「弹道」在星头 › 弹道、选物理后升空时间藏起
  W1 4.5.0 工作台快改：时间轴无发射器行 / 曲线、精简布局收层轨道；时长跟随 / 粘连开关；AI 效果保存 = 派生成我的效果、能加层；存模板 → 花型库能打开；
     删除不弹框、能撤销；AI 效果从左栏隐藏；只还原一个发射器、回到模板默认
  W3 4.5.8（9 处 bug + 5 条小修，用户 10-05 21:40 / 21:55）：删效果撤销连版本一起回来；连删两个都能撤销；删层进 Ctrl+Z、不弹框；删当前模板后顶栏不剩「更新模板」；
     多层某层新参数烘焙失败时导出拦住；显示强度 0 导出也是 0；关自动烘焙时同一批星的层马上同步；内置效果「暂时不联动」不带进我的效果；组合说明按最终贴图写；
     贴图结尾全黑被裁掉要写明；换版本前先存草稿；浏览器存不进去要报错（读坏了先备份）；尾缀 S / M / L 模板导出 GPU 安全写法；子花继承标签写对
  W4 4.6.0（5.0 第 1 步）：每个发射器都列 9 个标准模块（没参数的写跟谁 / 为什么没有）；爆裂 / 开花闪光 / 子花 / 点灭 / 余烬 / 分叉火花 / 辉星以前写死的数变成参数且真起作用；
     「＋ 加发射器」：加、改、在模拟里生成光点 / 星、曲线几行时刻→值、去掉；「游戏内大小」按真实米数（四尺玉 1000 m 占 1/3，别的按真实大小）
  W5 4.8.0（5.0 第 3 步一部分）：星 / 子星 / 火花 / 余烬 / 分叉火花 / 爆裂 / 开花闪光都有「大小 / 亮度随寿命」曲线行（几行 时刻:倍数），空 = 不乘；填了真起作用（模拟里的星头、小闪、闪光；火花着色器的曲线参数接上）
  W6 4.8.1（走查 20-05）：导出可以取消（进度条旁「取消」，上次结果还在）；导出没做完再点导出不会叠第二个
  W7 4.9.0（5.0 第 3 步，Q1「物理给默认，每个值都能改」+ 参数表「删」）：联动的值都有链条——接着时灰字显示算出来的值、直接改就断开存你填的数、点链条接回去存哨兵值，
     模拟按哨兵值算出来和按算出来的数填进去一样；旧（待删）参数这个效果没用上时收进模块底下的「旧（待删）」开关、用着的照常显示带「旧」，搜索找得到；所有花型打开时参数值不变
  W8 4.9.1（交互宪章 5 身份条）：顶栏有名字、来源、版本；改了参数标「● 没保存」；自己的效果导出后标「素材包 ✓」、再改标「素材包要重导」；
     AI 待验收效果（就绪的）标「素材包 ✓」；自动烘焙关时改参数，顶栏写「贴图是旧的」不写「烘焙中…」
  W9 4.9.2（梳理 6.2 / 6.4、隐性耦合 T01）：改一个时刻、别的时刻被规则推着走时提示「跟着变了：× a → b s」；数值超出滑杆范围时数值框标出来并写明照样起作用；
     单束导出菜单写明贴图里的星不受力、随机关了；预览设置里能开关「预览泛光（引擎里没有）」，不触发烘焙
  W10 4.9.4（交互宪章 5 收尾）：起名 / 确认是应用内对话框（页面脚本里没有原生 prompt / confirm）；快捷键都登记在一张表、每个都挂了处理、? 弹出的表就是这张；
     Esc 先关菜单不切精简布局；预览烘焙中点「取消」马上停、贴图留着上次的、同一组参数不自己重烘，按 B 再烘
  W11 4.9.4（交互宪章 5「所有发射器的按寿命曲线」）：空中类的余烬 / 分叉火花 / 开花闪光补了大小；升空尾缀 RT6 每个粒子发射器都有大小 / 亮度随寿命，
     填了就乘在导出的 Size By Life / Color Over Life 上、空的时候导出逐位不变；地面火花、彗星也认曲线，没寿命的喷口亮点标不起作用
  W12 4.9.4（交互宪章 5「一个效果只留一个英文名」）：右栏没有可改的「母版名称」，只显示英文名、点了去交付清单改；交付清单所有产物都能改英文名；
     改了右栏、导出文件名跟着变，恢复默认回去
  W13 4.9.5（宪章遗漏 1 / 2 / 5）：输出栏「直接调」就是那 9 个、「算出来的」帧率 / 张数 / 单格灰字可改（固定机位填了每帧停几 tick 帧计划照办）、大面片别的输出模块默认收起；
     发射器表每个参数都有类别（物理量 / 引擎字段 / 预览设置 / 旧（待删）/ 只读），物理量有单位，说明条显示类别；打开旧存档（结尾淡出、冷却按各自寿命）画面上方写明不再起作用
  W14 4.9.5（宪章遗漏 3 / 4）：对象 × 动作表里的入口都在；1366×768 / 1440×900 / 1920×1080 首屏看得到顶栏主动作、左栏第一个条目、画布、播放、发射器标签和第一行参数；4.9.14 第一屏按参考稿口径（模块摘要、对齐、一屏看得到几个模块）；
  W16 4.9.14 主链路八步连着走（用户 10-06 15:15）：选效果与图层 → 调参数 → 调色并返回 → 调层延迟 → 撤销 / 重做 → 保存刷新 → 烘焙回放 → 导出 PC / 手机，鼠标 / 键盘点真的控件
  W17 4.9.20 贴图 / 流转：这一层导出的每一张序列都能切（分张、星头 / 尾迹、循环层 / 消散 / 远段；不为哪种效果单做）
  W18 4.9.21 效果 › 整体调整（用户 10-06 21:51，每层一份）：位置和 9 项顺序、全是 1 时原样、改尾长后实时模拟 / 测量 / 烘焙 / 尾迹终点 / 层结束 / 光点都跟着、
      存的原值不动、乘完不再乘、闪烁最多 1、摘要、撤销；多层只动这一层；地面 / 升空没有这个模块
  W20 4.9.24 GPU / 软圆点颜色（用户 10-07 09:20：材质 Translucent、A 接透明度）：RGB 不随寿命变暗、淡出 / 闪烁 / 冷却在 Alpha、黑底上 RGB × Alpha = 原亮度；
      RT6 每层、光点（点灭方波在 Alpha）；单层 / 多层 / 升空尾缀的 cascade.json 每个发射器都有 Scale Color/Life（1、1）
  W21 4.9.25 产物表（用户 10-07 09:20「4.可以，我很着急使用」）：交付清单顶上每层 PC / 手机出什么，改了不重烘、进撤销；贴图 / 流转 / 引擎回放按产物看
      （PC 单束看单束那张、光点 / 不出写明没有贴图、手机看序列）；旧存档「单元序列」迁成 大面片 + PC 单束；产物下拉没有单束；单束只出合并的一张
  W22 4.9.26 帧账本（用户 10-07 09:20「2.可以，你标定完」）：金芒菊标定线复算一致；「输出」写游戏里每帧最多跳几像素 + 试算几档（用这个 = 改贴图张数）；
      RT6 远段帧对齐 tick、上升段最慢 10 fps、每帧位移不超过标定线（或已是每 tick 一帧）、格子用满不超、帧号曲线点少且和烘焙时刻对得上
  W23 4.9.27 单束合不合适（用户 10-07 09:20「还是用断尾快星或者没有什么下坠直线星用」；对话框新花型 10:43 窜天猴冠 / 柳 / 时差的证据）：菊 / Crackle 适合，锦冠 / 柳 / 椰子、
      窜天猴冠 / 柳 / 时差第 1 层不适合（时差按先后点亮），原样那档适合；产物下拉写（不适合）、选了单束格子写偏几像素、层页头说明也写
  W24 4.9.28 单束变体数 / 随机感（用户 10-07 11:45 选）：缺省一张和以前一样；3 张 + 随机感 0.6 → 不重烘大面片、星数平分、种子 / 粗细 / 尾长倍数、
      三个发射器 + Initial Size 随机、多层 L1_ 前缀、文件 _V2 → 序号 02、贴图能切三张、引擎回放、交付清单（假烘焙也造单束）
  W25 4.9.29 单帧 + 功能图（用户 10-07 09:41 / 09:54 / 12:40；4.9.35 并进产物表，用户 18:50）：假的「圆环往外扩」序列 → 自动单帧取最大那一刻、取景收紧、D / A 里先外后、没亮过 D 0 A 255、
      通道 / 后缀、错落只动 D、Size By Life / Alpha、cascade.json 里的单帧层（现有序列材质 1 × 1、extras、第 2 层序列、手机引用 PC 那张）、_HD 命名不加 _MB、产物表只有 PC / 手机两列且选单帧不重烘、引擎回放不分平台直接画单帧
  W26 4.9.31（用户 10-07 14:56 / 14:34）：RT6 远段从交接开始 a0 出现、第一帧几乎空（以前中点一出现就半亮）；导出缩放 × k 只改长度（时间 / 阻力 / Size By Life 不动）、系统名 _S50、
  W27 4.9.32（用户 10-07 16:15「缩小到0.8/0.5，升空的高度还是之前正确的吗？」→ 16:2x「两种都要，导出时选」）：升空尾缀「升空高度：不变」只缩粗细——序列面片只缩宽、粒子大小 / 随机散开 / 球面半径 × k，位置 / 弹道 / 加速度 / 时间 / 预览距离不变、系统名 _W50；引擎回放的出生表和导出同一套（esKeepScale ↔ fwlScaleJSON keep 逐模块对上）；面板只在升空尾缀 + 缩放 < 1 时出现；等比缩时 V5 尾缀 / 单束的游戏内大小也按缩放画；
  W28 4.9.33（用户 10-07 17:26「点位实在太多了，可以简化一下点位吗？」「它最后会忽然放大一下再消失」「单帧输出模式我想要个引擎回放」）：Zoom 阶梯最多 12 级、每级不小于这一段每帧需要的大小、关键点 ≤ 2 × 级数；几乎全黑的末帧跟前一帧一样大（不跳回大取景），自己的火星放不下才放大；OUTPUT_VER.zoom 只让 Zoom 效果过期；产物表单帧「在引擎回放里看」回到画面切引擎回放（4.9.35 不分平台）；
  W29 4.9.35（用户 10-07 18:50「低端这个分类应该不需要，直接合入产物表里」；18:5x「手机列保留，手机也可以选序列或者单帧或者单束，但没有GPU」「单帧放主包、名字不加 _MB」）：层 / 单层的导出方案没有低端、手机能出单束 / 单帧（引用 PC 那几张）、单帧设置 PC 或手机选单帧才出现、旧存档低端选过的提示不静默、手机单帧的正式名不带 _HD；
  W30 4.9.35（用户 10-07 18:50「贴图与流转我也认为可以合并，现在只有一个正方形，画布利用空间不够，两个页面合成一个」）：标签只剩「贴图流转」（没有「贴图」「流转」「整张 / 流转动画」）、画布铺满画面区（不是正方形）、左边当前格 / 右边整张贴图 + 曲线、标签和曲线画布跟着布局、离开这一页画布回正方形；
      只改 cascade*.json、菊右栏有、引擎回放游戏内大小按缩放画不重烘；护栏 Ramp 第 255 格黑、编码封顶 253
  W19 4.9.21 入点前放大一律绕爆点（用户 21:51 选）：「放大的中心」删了；cascade.json 写 Pivot Offset、Initial Location 0；回放绕爆点；存过「面片中心」的打开时提示
      4.9.8 加：顶上「现在改的是」和搜索入口看得到，第一屏至少 8 行参数（菊 › 星、引菊 → 锦 金锦层 › 火花）
  W15 4.9.7 起（对话框23 参数栏交互）：4.9.8 引菊 → 锦六步（定位 / 改寿命 / 改颜色 / 调接力 / 撤销保存刷新重开）；切「工具」「审阅」再回来时间 / 层 / 发射器 / 模块开合 / 滚动位置都在、多层里有「工具」页；撤销一次操作一步（两个参数紧挨着改 = 两步、拖动中途停 = 一步、数值框回车 = 一步）
  L1 HN2 闭环（只在 --real）：改一层立刻切层 → 保存 → 刷新 → 打开这个版本 → 导出 PC + 手机：参数、贴图、文件名、两套 cascade、缩放抖动
"""
import argparse, asyncio, json, sys, time, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from browser_runtime import launch_async

ROOT = pathlib.Path(__file__).resolve().parents[2]
HTML = (ROOT / 'tool' / 'FireworkBaker.html').as_uri() + '?fast'

FAKE = r"""(() => {
  window.__bakes = [];
  if (!window.__realBake) window.__realBake = bake;     // 4.9.21 W18：查真烘焙入口乘了整体调整
  const chk = { clipFrames: [], edgeFrames: [], chanUse: [true, true, true, true], emptyMid: [], similar: 0, seam: null, maxClip: 0 };
  bake = async (P, scale, onProg) => {
    if (!['master', 'segments'].includes(P.form)) throw new Error('假烘焙只造大面片 / 分段；「' + P.form + '」要真烘焙（--real）');
    const Pc = structuredClone(typeof fxP === 'function' ? fxP(P) : P), fm = measure(Pc), pl = plan(Pc, fm), pages = typeof splitPlan40 === 'function' ? splitPlan40(pl) : [pl];
    const parts = pages.map(meta => ({ P: Pc, form: Pc.form, N: 4, NH: 4, cw: 1, chh: 1, scale: 1, fm, head: { dispose() { } }, tail: null,
      meta: { ...meta, check: chk, lightKeys: [[0, 1], [1, 0]], darkTail: 0, frameMaxes: [], quality: qualityOf(Pc), expoH: 1, expoT: 1, bakeMs: 1, sparkSlots: 0 } }));
    parts.forEach((b, i) => b.next = parts[i + 1]);
    window.__bakes.push({ P: Pc, at: performance.now() });
    if (onProg) onProg(1);
    await new Promise(r => setTimeout(r, 40));
    return parts[0];
  };
  bakeMobileFor = async b => null;
  return 0;
})()"""

# 真烘焙（--real）时只记录每次烘焙用的参数（U1 等要看「最后一次烘的是什么」），不替换烘焙本身
REC = r"""(() => {
  window.__bakes = [];
  const ob = bake;
  bake = async (P, scale, onProg) => { const Pc = structuredClone(typeof fxP === 'function' ? fxP(P) : P); const b = await ob(P, scale, onProg); window.__bakes.push({ P: Pc, at: performance.now() }); return b; };
  return 0;
})()"""

IDLE = "window.__fw.idle() && !state.baking && !(state.layerQueue && state.layerQueue.size) && $('#busy').hidden && !window.__opening"


REAL = False


async def idle(pg, ms=None):
    ms = ms or (240000 if REAL else 20000)
    t0 = time.time()
    while time.time() - t0 < ms / 1000:
        if await pg.evaluate(IDLE): await pg.wait_for_timeout(250); return True
        await pg.wait_for_timeout(150)
    return False


# 4.9.4：起名 / 改名 / 确认换成应用内对话框（askSaveName / askText / askConfirm），不再弹浏览器原生框。
# 检查里直接替换成自动回答：名字用 window.__ans（没设就用对话框里的默认名），确认一律「是」。原生 dialog 监听留着兜底。
def ask_stub(ans=None):
    a = json.dumps(ans, ensure_ascii=False) if ans is not None else 'null'
    return "window.__ans = " + a + "; window.askSaveName = async (t, n, init) => (window.__ans != null ? window.__ans : init); window.askConfirm = async () => true; 0"


async def fresh(p, b):
    ctx = await b.new_context(viewport={'width': 1440, 'height': 900})
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('dialog', lambda d: asyncio.ensure_future(d.accept('检查版本')))
    await pg.add_init_script("window.requestAnimationFrame = () => 0;")
    await pg.goto(HTML, wait_until='load', timeout=0)
    await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
    await pg.evaluate(REC if REAL else FAKE)
    await pg.evaluate(ask_stub('检查版本'))
    return ctx, pg, errs


async def open_effect(pg, key):
    await pg.evaluate(f"(() => {{ window.__opening = true; Promise.resolve(openEffect(EFFS().find(e => e.key === {json.dumps(key)}))).finally(() => window.__opening = false); return 0; }})()")
    await idle(pg)


async def new_effect(pg, key='kiku'):
    # 和用户点左下「＋ 新建效果」→ 选第一层同一个入口（myCreate 会问名字，对话框答「检查版本」）
    await pg.evaluate(f"(() => {{ window.__opening = true; Promise.resolve(myCreate({json.dumps(key)})).finally(() => window.__opening = false); return 0; }})()")
    await idle(pg)


async def set_layer_param(pg, i, key, val):
    await pg.evaluate(f"(() => {{ selectComboLayer({i}); state.P[{json.dumps(key)}] = {json.dumps(val)}; onParam(); return 0; }})()")


async def a1(pg):
    await open_effect(pg, 'hiki_nishiki')
    await new_effect(pg, 'kiku')
    r = await pg.evaluate("({ key: wbKey(), effect: lib.effect ? lib.effect.key : null, name: $('#abName').textContent, deliv: delivName(), review: lib.review ? lib.review.id : null })")
    bad = []
    if r['effect']: bad.append(f"lib.effect 还是 {r['effect']}")
    if not str(r['key']).startswith('my:'): bad.append(f"版本归属 {r['key']}（应为 my:…）")
    if r['name'] != '检查版本': bad.append(f"资产栏名字「{r['name']}」")
    if r['review']: bad.append(f"审阅条目还是 {r['review']}")
    if 'HikiNishiki' in r['deliv'] or 'HN2' in r['deliv']: bad.append(f"导出名 {r['deliv']}")
    return not bad, '；'.join(bad) or json.dumps(r, ensure_ascii=False)


OLD_SAVE = r"""(() => {
  const d = defaultsFor('kiku'), e = defaultsFor('botan');
  const snap = { kind: 'combo', name: '八重芯变色菊', layers: [
    { id: null, type: 'kiku', L: { scale: 1, delay: 0, rate: 1, mirror: false }, P: { ...derive(structuredClone(d.P)), stars: 77 }, M: structuredClone(d.M) },
    { id: null, type: 'botan', L: { scale: 0.5, delay: 0, rate: 1, mirror: false }, P: derive(structuredClone(e.P)), M: structuredClone(e.M) }] };
  const all = store.get('mySaves', {}); all.combo = [{ id: 'old1', name: '旧编辑器版本', at: '2026-10-03 12:00', snap }]; store.set('mySaves', all); store.set('myEffects', {});
  return 0; })()"""


async def a2_same(p, b):
    ctx = await b.new_context(viewport={'width': 1440, 'height': 900})
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('dialog', lambda d: asyncio.ensure_future(d.accept('检查版本')))
    await pg.add_init_script("window.requestAnimationFrame = () => 0;")
    bad, info = [], {}
    try:
        for rnd in range(3):
            await pg.goto(HTML, wait_until='load', timeout=0)
            await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
            if not REAL: await pg.evaluate(FAKE)
            await pg.evaluate(ask_stub('检查版本'))
            if rnd == 0: await pg.evaluate(OLD_SAVE); continue          # 模拟 4.2.x 的浏览器里组合编辑器存过一个版本
            mig = await pg.evaluate("(() => { const r = Object.values(myAll()).find(x => x.name === '组合编辑器 · 旧编辑器版本'); return { id: r ? r.id : null, left: !!(store.get('mySaves', {}).combo), li: r ? !![...document.querySelectorAll('#libBody .li')].find(x => x.dataset.key === 'my:' + r.id) : false }; })()")
            if not mig['id']: bad.append('旧的组合编辑器版本没搬进「我的效果」'); break
            if rnd == 1 and mig['left']: bad.append('mySaves 里旧的 combo 还在（会每次都搬一遍）')
            if not mig['li']: bad.append('左栏「我的效果」里没有它')
            await pg.evaluate(f"(() => {{ window.__opening = true; Promise.resolve(openMyEffect({json.dumps(mig['id'])})).finally(() => window.__opening = false); return 0; }})()")
            await idle(pg); await pg.wait_for_timeout(500); await idle(pg)
            r = await pg.evaluate("({ key: lib.key, tab: state.tab, n: state.layers.length, stars: state.layers.map(L => { const e = layerEntryOf(L); return e && e.P.stars; }) })")
            info[f'第 {rnd} 次打开'] = r
            if r['tab'] != 'combo' or r['n'] != 2 or r['stars'][0] != 77: bad.append(f'打开后层或参数不对：{r}'); break
            if rnd == 1:
                await set_layer_param(pg, 1, 'stars', 55); await idle(pg)
                await pg.evaluate("selectComboLayer(-1); wbSave(false).then(() => 0)"); await pg.wait_for_timeout(800)
            elif r['stars'][1] != 55: bad.append(f'改了第 2 层保存、刷新后星数是 {r["stars"][1]}（应为 55）')
    finally:
        await ctx.close()
    return not bad, ('；'.join(bad) or json.dumps(info, ensure_ascii=False)) + ('' if not errs else ' 错误：' + errs[0][:200])


async def a3(pg):
    await new_effect(pg, 'botan')
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(myAddLayerFrom('botan')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r0 = await pg.evaluate("state.layers.map(L => layerEntryOf(L).P.stars)")
    await set_layer_param(pg, 0, 'stars', 55); await idle(pg)
    r = await pg.evaluate("({ same: layerEntryOf(state.layers[0]) === layerEntryOf(state.layers[1]), stars: state.layers.map(L => layerEntryOf(L).P.stars) })")
    ok = len(r0) == 2 and not r['same'] and r['stars'][0] == 55 and r['stars'][1] == r0[1]
    return ok, json.dumps({'before': r0, **r}, ensure_ascii=False)


async def a4(pg):
    await open_effect(pg, 'hiki_nishiki')
    old = await pg.evaluate("layerEntryOf(state.layers[0]).P.burn")
    new = round(old + 0.31, 3)
    await set_layer_param(pg, 0, 'burn', new)
    await pg.evaluate("selectComboLayer(1); 0")          # 防抖 380 ms 还没到就切走
    await idle(pg); await pg.wait_for_timeout(600); await idle(pg)
    r = await pg.evaluate("(() => { const e = layerEntryOf(state.layers[0]); return { p: e.P.burn, baked: e.bake && e.bake.P.burn }; })()")
    # 第二种：烘到一半切走
    old2 = await pg.evaluate("layerEntryOf(state.layers[1]).P.burn")
    await set_layer_param(pg, 1, 'burn', round(old2 + 0.17, 3))
    await pg.wait_for_timeout(450)                         # 防抖过了、正在烘
    await pg.evaluate("selectComboLayer(0); 0")
    await idle(pg); await pg.wait_for_timeout(600); await idle(pg)
    r2 = await pg.evaluate("(() => { const e = layerEntryOf(state.layers[1]); return { p: e.P.burn, baked: e.bake && e.bake.P.burn }; })()")
    ok = abs(r['p'] - new) < 1e-9 and r['baked'] is not None and abs(r['baked'] - new) < 1e-9 and r2['baked'] is not None and abs(r2['baked'] - r2['p']) < 1e-9
    return ok, json.dumps({'切层前没开烘': r, '烘到一半切层': r2}, ensure_ascii=False)


async def a5(pg):
    await open_effect(pg, 'jinmangju')
    await pg.wait_for_timeout(1500); await idle(pg)
    await pg.evaluate("state.P.stars = (state.P.stars || 100) + 13; onParam(); 0"); await idle(pg)
    want = await pg.evaluate("state.P.stars")
    await open_effect(pg, 'hongchao')
    drafts = await pg.evaluate("(store.get('mySaves', {})['ef:jinmangju'] || []).filter(s => s.draft).map(s => ({ name: s.name, stars: s.snap && s.snap.P && s.snap.P.stars }))")
    await open_effect(pg, 'jinmangju'); await pg.wait_for_timeout(1500); await idle(pg)
    opt = await pg.evaluate("[...$('#abSrc').options].map(o => o.textContent)")
    ok = any(d['stars'] == want for d in drafts) and any('草稿' in o for o in opt)
    return ok, json.dumps({'草稿': drafts, '版本选项': opt}, ensure_ascii=False)


async def a6(pg):
    await open_effect(pg, 'hiki_nishiki'); await pg.wait_for_timeout(1500); await idle(pg)
    ai = await pg.evaluate("layerEntryOf(state.layers[0]).P.burn")
    await set_layer_param(pg, 0, 'burn', round(ai + 0.23, 3)); await idle(pg)
    await pg.evaluate("selectComboLayer(-1); 0")
    await open_effect(pg, 'jinmangju'); await pg.wait_for_timeout(800); await idle(pg)
    await open_effect(pg, 'hiki_nishiki'); await pg.wait_for_timeout(2500); await idle(pg)
    r = await pg.evaluate("({ burn: layerEntryOf(state.layers[0]).P.burn, chg: !$('#abChg').hidden, gate: gateReasons(), src: wb.src.kind })")
    clean = abs(r['burn'] - ai) < 1e-9
    ok = clean or (r['chg'] and len(r['gate']) > 0)
    return ok, json.dumps({'AI 版 burn': ai, **r}, ensure_ascii=False)


async def a7(p, b):
    """新建效果（4.2.7，走查 B18）：新建 → 选第一层 → 加一层（现有效果的层）→ 改名 → 复制 → 勾同一批星 → 保存 → 刷新 → 左栏打开：
    层数、层名、每层参数、同一批星、名字都在；改一层不带着复制出来的那层变（除非勾了同一批星）"""
    ctx = await b.new_context(viewport={'width': 1440, 'height': 900})
    pg = await ctx.new_page(); errs = []; answers = ['金锦冠测试']
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('dialog', lambda d: asyncio.ensure_future(d.accept(answers[0] if d.type == 'prompt' else None)))
    await pg.add_init_script("window.requestAnimationFrame = () => 0;")
    try:
        for rnd in range(2):
            await pg.goto(HTML, wait_until='load', timeout=0)
            await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
            if not REAL: await pg.evaluate(FAKE)
            await pg.evaluate(ask_stub(answers[0]))
            if rnd == 0:
                await pg.evaluate("(() => { window.__opening = true; $('#newRecipe').click(); const c = [...document.querySelectorAll('#pkGrid .pk-card')].find(x => x.textContent.includes('菊') && !x.textContent.includes('锦冠')); c.click(); setTimeout(() => window.__opening = false, 2500); return 0; })()")
                await idle(pg); await pg.wait_for_timeout(800); await idle(pg)
                r0 = await pg.evaluate("({ key: lib.key, n: state.layers.length, name: $('#abName').textContent })")
                if not str(r0['key']).startswith('my:') or r0['n'] != 1: return False, '新建没打开我的效果：' + json.dumps(r0, ensure_ascii=False)
                # 加一层：现有效果的层（引菊 → 锦 的第 1 层）
                await pg.evaluate("(() => { window.__opening = true; $('#myAdd').click(); setTimeout(() => { pk.cat = 'fx'; pkRender(); const c = [...document.querySelectorAll('#pkGrid .pk-card')].find(x => x.textContent.includes('引菊')); c.click(); setTimeout(() => window.__opening = false, 2500); }, 50); return 0; })()")
                await idle(pg); await pg.wait_for_timeout(800); await idle(pg)
                answers[0] = '中心'
                await pg.evaluate("(async () => { window.__ans = '中心'; await myRenameLayer(0); return 0; })()")
                await pg.evaluate("(() => { window.__opening = true; Promise.resolve(myDupLayer(0)).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
                # 改第 1 层（中心）的星数：复制出来的第 2 层不能跟着变
                await set_layer_param(pg, 0, 'stars', 123); await idle(pg)
                indep = await pg.evaluate("[layerEntryOf(state.layers[0]).P.stars, layerEntryOf(state.layers[1]).P.stars]")
                # 勾「同一批星」：第 1、2 层
                await pg.evaluate("selectComboLayer(0); mySetLinked(0, 1, true); 0"); await idle(pg)
                await set_layer_param(pg, 0, 'v0', 77); await idle(pg)
                linked = await pg.evaluate("[layerEntryOf(state.layers[0]).P.v0, layerEntryOf(state.layers[1]).P.v0]")
                answers[0] = '金锦冠测试'
                await pg.evaluate("window.__ans = '金锦冠测试'; selectComboLayer(-1); wbSave(false).then(() => 0)"); await pg.wait_for_timeout(800)
                before = await pg.evaluate("({ id: lib.my.id, titles: state.layers.map((L, i) => layerName(i)), stars: state.layers.map(L => layerEntryOf(L).P.stars), links: myLinksLid().length, n: state.layers.length })")
            else:
                await pg.evaluate(f"(() => {{ window.__opening = true; const it = [...document.querySelectorAll('#libBody .li')].find(x => x.dataset.key === 'my:{before['id']}'); it.click(); setTimeout(() => window.__opening = false, 3000); return 0; }})()")
                await idle(pg); await pg.wait_for_timeout(800); await idle(pg)
                after = await pg.evaluate("({ key: lib.key, name: $('#abName').textContent, titles: state.layers.map((L, i) => layerName(i)), stars: state.layers.map(L => layerEntryOf(L).P.stars), links: (state.links || []).length, n: state.layers.length })")
                bad = []
                if indep[0] == indep[1]: bad.append(f'复制的层跟着变了 {indep}')
                if linked[0] != 77 or linked[1] != 77: bad.append(f'同一批星没联动 {linked}')
                if after['n'] != before['n'] or after['titles'] != before['titles']: bad.append(f"刷新后层不对 {after['titles']} ≠ {before['titles']}")
                if after['stars'] != before['stars']: bad.append(f"刷新后参数不对 {after['stars']} ≠ {before['stars']}")
                if after['links'] != 1: bad.append('刷新后同一批星没了')
                if after['name'] != '金锦冠测试': bad.append('名字不对：' + after['name'])
                return not bad, ('；'.join(bad) or f"{after['n']} 层 {after['titles']}、星数 {after['stars']}、同一批星 ✓、复制的层独立 ✓") + ('' if not errs else ' · 页面错误：' + errs[0][:200])
    finally:
        await ctx.close()


PULSE_JS = r"""(c) => { // 和 回放检查.py zoom_pulse 同一口径：同一帧停着的几个 tick 里 Size By Life 的变化（%）
  const cv = (d, u) => { if ('const' in d) return d.const; const k = d.curve; if (u <= k[0][0]) return k[0][1]; for (let i = 1; i < k.length; i++) if (u <= k[i][0]) { const a = (u - k[i-1][0]) / Math.max(1e-9, k[i][0] - k[i-1][0]), x = k[i-1][1], y = k[i][1]; return Array.isArray(x) ? x.map((v, j) => v + (y[j] - v) * a) : x + (y - x) * a; } return k[k.length-1][1]; };
  let worst = 0;
  for (const e of c.emitters) { const mods = {}; for (const m of e.modules) if (!m.preRoll) mods[m.m] = m; const sb = mods.SizeByLife, dp = mods.DynamicParameter; if (!sb || !dp) continue;
    const life = mods.Lifetime ? cv(mods.Lifetime.Lifetime, 0) : e.required.duration_s, n = Math.max(1, Math.floor(life * 30 + 1e-6)); let i = 0;
    const fr = [], sz = []; for (let t = 0; t < n; t++) { const u = Math.min(1, (t + .5) / 30 / life); fr.push(Math.floor(cv(dp.params.frame, u))); const v = cv(sb.LifeMultiplier, u); sz.push(Math.max(v[0], v[1])); }
    while (i < n) { let j = i; while (j + 1 < n && fr[j + 1] === fr[i]) j++; if (j > i) { const seg = sz.slice(i, j + 1); worst = Math.max(worst, (Math.max(...seg) / Math.min(...seg) - 1) * 100); } i = j + 1; } }
  return +worst.toFixed(3); }"""


async def l1(p, b):
    """HN2 闭环（用户 23:34：修完 A1–A6 用 HN2 走一遍）：改一层后立刻切层 → 保存 → 刷新 → 打开这个版本 → 导出 PC + 手机。
    只在 --real（真烘焙）时跑：要真的贴图才能导出。查：版本参数在、贴图是新参数烘的、文件名按命名规则、两套 cascade.json、缩放抖动 0、取景收紧过。"""
    if not REAL: return None, '要真烘焙（--real，本机显卡任务里跑）'
    ctx = await b.new_context(viewport={'width': 1440, 'height': 900})
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('dialog', lambda d: asyncio.ensure_future(d.accept('闭环检查')))
    try:
        for rnd in range(2):
            await pg.goto(HTML, wait_until='load', timeout=0)
            await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
            await pg.evaluate(ask_stub('闭环检查'))     # 4.5.0：保存 = 存成我的效果（起名对话框直接用这个名）
            if rnd == 0:
                await open_effect(pg, 'hiki_nishiki')
                ai = await pg.evaluate("layerEntryOf(state.layers[0]).P.burn"); want = round(ai + 0.1, 3)
                await set_layer_param(pg, 0, 'burn', want)
                await pg.evaluate("selectComboLayer(1); 0")              # 改完马上切层（A4 那条路）
                await idle(pg); await pg.wait_for_timeout(1500); await idle(pg)
                baked = await pg.evaluate("layerEntryOf(state.layers[0]).bake.srcP.burn")
                await pg.evaluate("selectComboLayer(-1); wbSave(true).then(() => 0)"); await idle(pg)
                sid = await pg.evaluate("lib.my ? lib.my.id : null")
                if not sid: return False, '保存没有成功（4.5.0：AI 效果保存 = 存成我的效果）'
            else:
                await pg.evaluate(f"(() => {{ window.__opening = true; Promise.resolve(openMyEffect('{sid}')).finally(() => window.__opening = false); return 0; }})()")
                await idle(pg); await pg.wait_for_timeout(1500); await idle(pg)
                got = await pg.evaluate("({ burn: layerEntryOf(state.layers[0]).P.burn, src: lib.my ? 'mine' : wb.src.kind, key: lib.key })")
                files = await pg.evaluate("""(async () => { const fs = await comboPackFiles('HikiNishiki', state.layers); const c = fs.find(f => f[0] === 'cascade.json'), cm = fs.find(f => f[0] === 'cascade_mobile.json');
                  const dec = x => JSON.parse(new TextDecoder().decode(x[1]));
                  return { names: fs.map(f => f[0]), pc: c ? dec(c) : null, mob: cm ? dec(cm) : null, fitted: state.layers.map(L => { const e = layerEntryOf(L); return e && e.bake.meta.fitted ? e.bake.meta.fitted.mode : null; }) }; })()""")
                pulse = [await pg.evaluate(PULSE_JS, files['pc']) if files['pc'] else None, await pg.evaluate(PULSE_JS, files['mob']) if files['mob'] else None]
                names = files['names']
                bad = []
                if abs(got['burn'] - want) > 1e-9: bad.append(f"版本里的 burn {got['burn']}（应为 {want}）")
                if abs(baked - want) > 1e-9: bad.append(f"切层后贴图是按 burn {baked} 烘的")
                if got['src'] != 'mine': bad.append('刷新后没打开这个版本')
                if not files['pc'] or not files['mob']: bad.append('缺 cascade.json / cascade_mobile.json')
                tex = [n for n in names if n.endswith('.png')]
                if not any(n.startswith('T_EFX_FireWorks_HikiNishiki_Hiki_') for n in tex) or not any(n.startswith('T_EFX_FireWorks_HikiNishiki_Nishiki_') for n in tex): bad.append('贴图文件名不按命名规则：' + '、'.join(tex[:6]))
                if any(v is None or v > 0.2 for v in pulse): bad.append(f'缩放抖动 {pulse}')
                await pg.evaluate(f"(() => {{ myDelete('{sid}'); return 0; }})()")   # 收拾：删掉检查用的效果
                why = '；'.join(bad) or f"版本 burn {got['burn']} ✓、切层后贴图按新参数 ✓、{len(tex)} 张贴图按命名规则 ✓、PC + 手机 cascade ✓、缩放抖动 {pulse} ✓、取景收紧 {files['fitted']}"
                return not bad, why + ('' if not errs else ' · 页面错误：' + errs[0][:200])
    finally:
        await ctx.close()


# 4.3：只有一个面板（没有新旧开关）。「看得见」= 没被藏、所在的模块 / 「更多」都是打开的（关着的 <details> 里的行 offsetParent 也不是 null，不能用它判断）
P1_SHOWN = r"""const shown = el => { if (!el || el.hidden || el.closest('[hidden]')) return false; for (let d = el.parentElement && el.parentElement.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) if (!d.open) return false; return true; };"""
P1_STATE = r"""(() => { const host = $('#params'); """ + P1_SHOWN + r"""
  const secs = [...host.querySelectorAll('details.sec')];
  // 4.9.14：模块默认收起（标题写摘要、点一下就展开），所以「这一页有哪些参数」按列在页上（没被藏）算，不按模块开没开
  const listed = el => !!el && !el.hidden && !el.closest('[hidden]');
  const rows = panelRows.filter(([r]) => r._lab != null && listed(r)), labs = rows.map(([r, it]) => ({ k: Array.isArray(it) ? it[0] : it.sel || it.text, t: r._lab, e: r._x && r._x.e }));
  const on = host.querySelector('.etabs .on');
  return { tools: !!host.querySelector('.ptools input[type=search]') && !!host.querySelector('.ptools input[type=checkbox]'), toggle: !!host.querySelector('[data-v43]'),
    tabs: [...host.querySelectorAll('.etabs [data-e]')].filter(b => !b.hidden).map(b => b.dataset.e), on: on ? on.dataset.e : '',
    egrps: [...host.querySelectorAll('section.egrp')].filter(g => !g.hidden).map(g => g.dataset.g),
    orphan: secs.filter(d => !d.closest('section.egrp')).map(d => d.querySelector('summary').textContent),
    unmapped: panelRows.filter(([r]) => r._x && !(r._x.i < 9999)).map(([r, it]) => Array.isArray(it) ? it[0] : it.sel || it.text),
    more: host.querySelectorAll('details.more').length, hintsShown: [...host.querySelectorAll('details.sec > p.hint')].filter(p => shown(p)).length,
    labs, long: labs.filter(x => x.t.length > 12).map(x => x.t), noName: panelRows.filter(([r, it]) => r._lab != null && !r._nm).map(([r, it]) => Array.isArray(it) ? it[0] : it.sel || it.text) }; })()"""
P1_SEARCH = r"""(q) => { const i = $('#params .ptools input[type=search]'); i.value = q; i.dispatchEvent(new Event('input', { bubbles: true })); """ + P1_SHOWN + r"""
  return panelRows.filter(([r, it]) => Array.isArray(it) && shown(r)).map(([r, it]) => it[0]); }"""
P1_CHANGED = r"""(on) => { const c = $('#params .ptools input[type=checkbox]'); if (c.checked !== on) c.click(); """ + P1_SHOWN + r"""
  return panelRows.filter(([r, it]) => Array.isArray(it) && shown(r)).map(([r, it]) => it[0]); }"""


async def p1(pg):
    """4.4 参数面板：发射器标签（效果 / 星 / 火花 / … / 输出 / 全部）一次看一个；每一行都在发射器表里；没有「更多」；搜索 / 只看改过的跨发射器"""
    bad, info = [], {}
    await pg.evaluate("(() => { store.set('pEmitTab', {}); pview.ready = false; pviewInit(); window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    st = await pg.evaluate(P1_STATE)
    info['标签'] = st['tabs']; info['默认'] = st['on']
    if not st['tools']: bad.append('没有搜索框 / 「只看改过的」')
    if st['toggle']: bad.append('还有新旧面板开关（4.3 只有一个面板）')
    if st['tabs'][:3] != ['效果', '星', '火花'] or st['tabs'][-2:] != ['输出', '全部']: bad.append(f"发射器标签不对：{st['tabs']}")
    if st['on'] != '星' or st['egrps'] != ['星']: bad.append(f"打开菊默认不是只看「星」：标签 {st['on']}，显示 {st['egrps']}")
    if st['orphan']: bad.append(f"没归进发射器的模块：{st['orphan'][:4]}")
    if st['unmapped']: bad.append(f"发射器表里没有的参数：{st['unmapped'][:5]}")
    if st['more']: bad.append(f"还有「更多」{st['more']} 处（4.4 不再藏参数）")
    if st['hintsShown']: bad.append(f"模块说明默认展开了 {st['hintsShown']} 段")
    if st['long']: bad.append(f"参数名太长 {len(st['long'])} 个：{st['long'][:3]}")
    if st['noName']: bad.append(f"参数没有命名表里的名字：{st['noName'][:5]}")
    info['第一眼参数'] = len(st['labs']); info['参数名平均字数'] = round(sum(len(x['t']) for x in st['labs']) / max(1, len(st['labs'])), 1)
    if len(st['labs']) > 30: bad.append(f"打开菊「星」一页就有 {len(st['labs'])} 项（要 ≤ 30）")
    if any(x['e'] != '星' for x in st['labs']): bad.append(f"「星」一页里有别的发射器的参数：{[x for x in st['labs'] if x['e'] != '星'][:3]}")
    burn = next((x['t'] for x in st['labs'] if x['k'] == 'burn'), None); info['星的寿命叫'] = burn
    if burn != '燃烧时间': bad.append(f'星的寿命显示「{burn}」（用户 10-04 改回「燃烧时间」）')
    if not bad:
        r = await pg.evaluate(P1_SEARCH, '粗细')
        if 'tailWidth' not in r or 'stars' in r: bad.append(f'搜「粗细」（在火花发射器里，当前看的是星）结果不对：{r[:6]}')
        info['搜粗细'] = r
        r = await pg.evaluate(P1_SEARCH, '末段生成')
        if 'sparkRateEnd' not in r: bad.append(f'搜「末段生成」没找到末段生成率：{r[:6]}')
        r = await pg.evaluate(P1_SEARCH, '')
        if 'stars' not in r or 'sparkRateEnd' in r: bad.append(f'清空搜索后没回到「星」一页：{r[:8]}')
        r = await pg.evaluate(P1_CHANGED, True)
        if r: bad.append(f'没改过任何参数，「只看改过的」还显示 {r[:4]}')
        await pg.evaluate("(() => { state.P.sparkRateEnd = (+state.P.sparkRateEnd || 0) + 0.2; onParam(); return 0; })()"); await idle(pg)
        r = await pg.evaluate(P1_CHANGED, True)
        if r != ['sparkRateEnd']: bad.append(f'改了末段生成率后「只看改过的」显示 {r[:4]}（应为 sparkRateEnd，跨发射器也要翻出来）')
        await pg.evaluate(P1_CHANGED, False)
        n = await pg.evaluate("(+(document.querySelector('#params .etabs [data-e=\"火花\"] .et-n') || {}).textContent || 0)")
        if n != 1: bad.append(f'「火花」标签上没标改过 1 项（{n}）')
        # 点标签换发射器
        r = await pg.evaluate("(() => { document.querySelector('#params .etabs [data-e=\"火花\"]').click(); " + P1_SHOWN + " return { on: document.querySelector('#params .etabs .on').dataset.e, rows: panelRows.filter(([r, it]) => Array.isArray(it) && !r.hidden && !r.closest('[hidden]')).map(([r, it]) => it[0]), saved: store.get('pEmitTab', {}).aerial }; })()")
        info['点火花'] = {'on': r['on'], 'n': len(r['rows']), 'saved': r['saved']}
        if r['on'] != '火花' or 'sparkSize' not in r['rows'] or 'stars' in r['rows'] or r['saved'] != '火花': bad.append(f'点「火花」标签不对：{info["点火花"]}')
        # 4.9.8 说明（交互宪章 3.5；用户 10-04 偏好「频繁移动鼠标时不得自动弹参数说明；主动点 ? / F1 后打开固定说明区，关闭 / Esc 收起」）：
        # 鼠标停多久都不弹；点参数名打开（固定在右栏底部）、再点同一个名字关；Esc 关；F1 = 光标所在参数的说明，再按关
        hv = "(() => { const h = $('#pHelp'); return { on: h.classList.contains('on'), pin: h.classList.contains('pinned'), txt: h.classList.contains('on') ? h.textContent : '' }; })()"
        nm = "panelRows.find(([r, it]) => it[0] === 'tailWidth')[0].querySelector('.k')"
        await pg.evaluate(f"(() => {{ helpHide(true); {nm}.dispatchEvent(new PointerEvent('pointerenter')); }})()"); await pg.wait_for_timeout(1900)
        a = await pg.evaluate(hv); await pg.evaluate(f"{nm}.dispatchEvent(new PointerEvent('pointerleave'))")
        await pg.evaluate(f"{nm}.click()"); await pg.wait_for_timeout(200); b = await pg.evaluate(hv)
        bottom = await pg.evaluate("(() => { const h = $('#pHelp'), R = $('#right').getBoundingClientRect(), r = h.getBoundingClientRect(); return getComputedStyle(h).position === 'sticky' && r.bottom <= Math.min(R.bottom, innerHeight) + 1; })()")
        await pg.evaluate(f"{nm}.click()"); await pg.wait_for_timeout(100); c = await pg.evaluate(hv)
        await pg.evaluate(f"{nm}.click()"); await pg.wait_for_timeout(100); await pg.keyboard.press('Escape'); d = await pg.evaluate(hv)
        await pg.evaluate("(() => { const r = panelRows.find(([r, it]) => it[0] === 'sparkSize')[0]; r.closest('details').open = true; r.querySelector('.num').focus(); return 0; })()"); await pg.keyboard.press('F1'); await pg.wait_for_timeout(100); e = await pg.evaluate(hv)     # 4.9.14：模块默认收起，先点开
        await pg.keyboard.press('F1'); await pg.wait_for_timeout(100); f = await pg.evaluate(hv)
        reg = await pg.evaluate("KEYMAP.some(k => k.id === 'help' && k.label === 'F1') && (KEY_FNS.help || []).length > 0")
        info['说明'] = {'停 1.9s': a['on'], '点名字': [b['on'], b['pin']], '底部固定': bottom, '再点': c['on'], 'Esc': d['on'], 'F1': e['on'], 'F1 再按': f['on'], 'KEYMAP': reg}
        if a['on']: bad.append('鼠标停在参数名上说明自己弹出来了（应点了才出）')
        if not b['on'] or '横向散开' not in b['txt']: bad.append(f'点参数名说明没出来或不是「粗细」的：{b}')
        if not bottom: bad.append('说明不在右栏底部固定')
        if c['on']: bad.append('再点同一个参数名说明没关')
        if d['on']: bad.append('按 Esc 说明没关')
        if not e['on'] or '大小' not in e['txt']: bad.append(f'光标在「火花 › 大小」上按 F1 没出它的说明：{e}')
        if f['on']: bad.append('再按 F1 说明没关')
        if not reg: bad.append('F1 没登记在快捷键表（68_keys.js KEYMAP）或没挂处理')
        await pg.evaluate("selectEmitTab('星'); 0")
    if not bad:     # 多层效果：选中某一层时右栏也是同一套
        await open_effect(pg, 'hiki_nishiki')
        await pg.evaluate("(() => { selectComboLayer(1); return 0; })()"); await idle(pg)
        st = await pg.evaluate(P1_STATE)
        if not st['tools'] or st['orphan'] or not st['egrps'] or st['noName']: bad.append(f"多层效果里第 2 层的面板不对：工具 {st['tools']}、没归类 {st['orphan'][:3]}、没名字 {st['noName'][:3]}")
    return not bad, '；'.join(bad) or json.dumps(info, ensure_ascii=False)


async def u1(pg):
    bad, info = [], {}
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg); await pg.wait_for_timeout(900)
    btn = await pg.evaluate("!!$('#abUndo') && !!$('#abRedo')")
    if not btn: bad.append('资产栏没有撤销 / 重做按钮')
    s0 = await pg.evaluate("({ stars: state.P.stars, burn: state.P.burn })")
    await pg.evaluate("(() => { state.P.stars += 20; onParam(); return 0; })()"); await pg.wait_for_timeout(900); await idle(pg)
    await pg.evaluate("(() => { state.P.burn = +(state.P.burn + 0.4).toFixed(2); onParam(); return 0; })()"); await pg.wait_for_timeout(900); await idle(pg)
    await pg.mouse.click(700, 400)      # 焦点不在输入框里
    await pg.keyboard.press('Control+z'); await idle(pg); await pg.wait_for_timeout(300)
    s1 = await pg.evaluate("({ stars: state.P.stars, burn: state.P.burn, baked: window.__bakes.length ? window.__bakes[window.__bakes.length - 1].P.burn : null })")
    await pg.keyboard.press('Control+z'); await idle(pg); await pg.wait_for_timeout(300)
    s2 = await pg.evaluate("({ stars: state.P.stars, burn: state.P.burn })")
    await pg.keyboard.press('Control+Shift+z'); await idle(pg); await pg.wait_for_timeout(300)
    s3 = await pg.evaluate("({ stars: state.P.stars, burn: state.P.burn })")
    info['单层'] = [s0, s1, s2, s3]
    if not (s1['burn'] == s0['burn'] and s1['stars'] == s0['stars'] + 20): bad.append(f'第一次撤销没回到改燃烧时间之前：{s1}')
    if s1['baked'] is None or abs(s1['baked'] - s0['burn']) > 1e-9: bad.append(f"撤销后没按撤回的参数重烘（最后一次烘 burn={s1['baked']}）")
    if s2 != s0: bad.append(f'第二次撤销没回到最初：{s2}（应为 {s0}）')
    if not (s3['stars'] == s0['stars'] + 20 and s3['burn'] == s0['burn']): bad.append(f'重做不对：{s3}')
    # 多层：改第 2 层，撤销只动这一层
    await open_effect(pg, 'hiki_nishiki'); await pg.wait_for_timeout(900); await idle(pg)
    L0 = await pg.evaluate("layerEntryOf(state.layers[0]).P.stars"); L1 = await pg.evaluate("layerEntryOf(state.layers[1]).P.burn")
    n0 = await pg.evaluate("state.layers.length")
    await set_layer_param(pg, 1, 'burn', round(L1 + 0.27, 3)); await pg.wait_for_timeout(900); await idle(pg)
    nb = await pg.evaluate("window.__bakes.length")
    await pg.mouse.click(700, 400); await pg.keyboard.press('Control+z'); await idle(pg); await pg.wait_for_timeout(600); await idle(pg)
    r = await pg.evaluate("(() => { const e0 = layerEntryOf(state.layers[0]), e1 = layerEntryOf(state.layers[1]); return { n: state.layers.length, s0: e0.P.stars, b1: e1.P.burn, baked1: e1.bake && e1.bake.P.burn, bakes: window.__bakes.slice(%d).map(x => x.P.burn) }; })()" % 0)
    r['新烘'] = (await pg.evaluate("window.__bakes.length")) - nb
    info['多层'] = r
    if abs(r['b1'] - L1) > 1e-9: bad.append(f"多层撤销后第 2 层 burn={r['b1']}（应为 {L1}）")
    if r['baked1'] is None or abs(r['baked1'] - L1) > 1e-9: bad.append(f"第 2 层贴图没按撤回的参数重烘（{r['baked1']}）")
    if r['s0'] != L0 or r['n'] != n0: bad.append('撤销动到了别的层 / 层数')
    if r['新烘'] > 1: bad.append(f"撤销一层重烘了 {r['新烘']} 次（应只烘这一层）")
    # 切到别的效果：撤销不能改到新效果
    await pg.evaluate("(() => { selectComboLayer(1); state.P.burn = +(state.P.burn + 0.2).toFixed(2); onParam(); return 0; })()"); await pg.wait_for_timeout(900); await idle(pg)
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('botan')).finally(() => window.__opening = false); return 0; })()"); await idle(pg); await pg.wait_for_timeout(900)
    b0 = await pg.evaluate("JSON.stringify(state.P)")
    await pg.mouse.click(700, 400); await pg.keyboard.press('Control+z'); await idle(pg); await pg.wait_for_timeout(300)
    if await pg.evaluate("JSON.stringify(state.P)") != b0: bad.append('切到别的效果后按撤销，新效果的参数被改了')
    return not bad, '；'.join(bad) or json.dumps(info, ensure_ascii=False)


SLIDE = r"""([k, dv]) => { const el = document.querySelector(`#params input[type=range][id^="p-${k}-"]`); if (!el) return null;
  const v = +(+el.value + dv).toFixed(3); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); return v; }"""


async def b1(pg):
    bad, info = [], {}
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r0 = await pg.evaluate("({ d: state.P.duration, end: layerEndOf(state.P) })")
    await pg.evaluate(SLIDE, ['burn', 1.0]); await idle(pg)
    r1 = await pg.evaluate("({ d: state.P.duration, end: layerEndOf(state.P) })")
    info['滑杆改燃烧'] = [r0, r1]
    if abs((r1['d'] - r0['d']) - (r1['end'] - r0['end'])) > 0.02: bad.append(f"滑杆把燃烧 +1 s 后序列时长 {r0['d']} → {r1['d']}（拖动时会跟着加 {r1['end'] - r0['end']:.2f} s）")
    await pg.evaluate("(() => { state.P.cutIn = 0.6; onParam(); buildMasterPanel(); return 0; })()"); await idle(pg)
    await pg.evaluate(SLIDE, ['ignDelay', 0.3]); await idle(pg)
    c = await pg.evaluate("state.P.cutIn"); info['点火 +0.3 后入点'] = c
    if abs(c - 0.9) > 0.011: bad.append(f'点火推后 0.3 s，入点还在 {c}（应跟着到 0.9）')
    await open_effect(pg, 'hiki_nishiki')
    await pg.evaluate("selectComboLayer(0); 0"); await idle(pg)
    g0 = await pg.evaluate("({ stop: layerEntryOf(state.layers[0]).P.sparkStop, ign1: layerEntryOf(state.layers[1]).P.ignDelay })")
    await pg.evaluate(SLIDE, ['sparkStop', 0.2]); await idle(pg); await pg.wait_for_timeout(600); await idle(pg)
    g1 = await pg.evaluate("(() => { const e1 = layerEntryOf(state.layers[1]); return { stop: layerEntryOf(state.layers[0]).P.sparkStop, ign1: e1.P.ignDelay, baked1: e1.bake && e1.bake.P.ignDelay }; })()")
    info['接力'] = [g0, g1]
    if abs((g1['ign1'] - g0['ign1']) - (g1['stop'] - g0['stop'])) > 0.011: bad.append(f"滑杆把引线火花停 +0.2，锦层点火 {g0['ign1']} → {g1['ign1']}（拖动时会一起动）")
    elif g1['baked1'] is None or abs(g1['baked1'] - g1['ign1']) > 1e-9: bad.append('锦层点火跟着动了，但没有重烘')
    await open_effect(pg, 'jinmangju'); await pg.wait_for_timeout(900); await idle(pg)     # 打开后等烘焙稳定、记下「打开时」的样子（wbArm）
    ai = await pg.evaluate("state.P.burn"); tpl = await pg.evaluate("defaultsFor(state.P.type).P.burn")
    await pg.evaluate("(() => { state.P.burn = +(state.P.burn + 0.5).toFixed(2); onParam(); return 0; })()"); await idle(pg)
    await pg.evaluate("$('#btnReset').click(); 0"); await idle(pg)
    rb = await pg.evaluate("state.P.burn"); info['恢复'] = {'AI 版': ai, '模板': tpl, '恢复后': rb}
    if abs(rb - ai) > 1e-9: bad.append(f'「恢复」后燃烧 {rb}（打开时的 AI 版是 {ai}，模板默认 {tpl}）')
    return not bad, '；'.join(bad) or json.dumps(info, ensure_ascii=False)


async def v1(pg):
    bad, info = [], {}
    secs = await pg.evaluate("[...document.querySelectorAll('#pIter details.sec > summary')].map(x => x.textContent.trim())")
    old = [x for x in secs if x in ('版本与回滚', '派生配方', 'A/B 分屏对比', '实拍 / 实机截图对比', '数值测量对比')]
    if old: bad.append(f'工具页还有去掉的东西：{old}')
    if '导入 / 导出 JSON' not in secs: bad.append(f'工具页没有「导入 / 导出 JSON」：{secs}')
    btn = await pg.evaluate("['toolImport', 'toolExport', 'toolImportRecipe'].filter(i => !document.getElementById(i))")
    if btn: bad.append(f'工具页少了按钮 {btn}')
    hooks = await pg.evaluate("({ single: typeof exportMaster === 'function' && exportMaster.toString().includes('wbAutoExport'), combo: typeof exportCombo === 'function' && exportCombo.toString().includes('wbAutoExport'), fn: typeof wbAutoExport === 'function' })")
    if not all(hooks.values()): bad.append(f'导出时没有存进资产栏版本：{hooks}')
    if not bad:
        await open_effect(pg, 'jinmangju'); await pg.wait_for_timeout(900); await idle(pg)
        b0 = await pg.evaluate("state.P.burn")
        for i in range(4):
            await pg.evaluate(f"(() => {{ state.P.burn = +({b0} + {i + 1} * 0.1).toFixed(2); onParam(); return 0; }})()"); await idle(pg)
            await pg.evaluate("wbAutoExport('test'); 0")
        r = await pg.evaluate("(() => { const l = wbList(); return { auto: l.filter(s => s.auto).map(s => [s.name, s.snap.P.burn]), opts: [...$('#abSrc').options].map(o => o.textContent) }; })()")
        info['导出时'] = r
        if len(r['auto']) != 3: bad.append(f"导出时自动存了 {len(r['auto'])} 份（应只留最近 3 份）")
        if r['auto'] and abs(r['auto'][-1][1] - round(b0 + 0.4, 2)) > 1e-9: bad.append(f"最近一份导出存的燃烧 {r['auto'][-1][1]}（应为 {round(b0 + 0.4, 2)}）")
        first = await pg.evaluate("(() => { const s = wbList().filter(s => s.auto)[0]; $('#abSrc').value = s.id; $('#abSrc').dispatchEvent(new Event('change')); return s.snap.P.burn; })()"); await idle(pg)
        cur = await pg.evaluate("state.P.burn")
        if abs(cur - first) > 1e-9: bad.append(f'选回「导出时」那一份，燃烧 {cur}（应为 {first}）')
        await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
        n = await pg.evaluate("wbList().filter(s => s.auto).length")
        if n: bad.append(f'菊模板的版本里出现了金芒菊的导出存档 {n} 份')
    return not bad, '；'.join(bad) or json.dumps(info, ensure_ascii=False)


async def x1(pg):
    bad, info = [], {}
    await open_effect(pg, 'hiki_nishiki'); await pg.wait_for_timeout(900); await idle(pg)
    await pg.evaluate("selectComboLayer(1); selectEmitTab('输出'); 0"); await idle(pg)     # 4.9.8：这一层的导出方案在「输出」发射器顶上（交互宪章第 7 节）
    has = await pg.evaluate("!!document.querySelector('#lhOut select[data-out=pc]') && !!$('#lhOut').closest('section.egrp[data-g=\"输出\"]')")
    if not has: return False, '这一层的「输出」顶上没有导出方案'
    await pg.select_option('#lhOut select[data-out=pc]', 'dots'); await pg.wait_for_timeout(900)
    r = await pg.evaluate("({ out: state.layers[1].out || null, chg: !$('#abChg').hidden, note: $('#lhOutNote').textContent, undo: !$('#abUndo').disabled })")
    info['选了光点'] = r
    if not r['out'] or r['out'].get('pc') != 'dots': bad.append(f"层没记住方案：{r['out']}")
    if not r['chg']: bad.append('改了方案「参数已变」没亮')
    if '尾迹' not in r['note']: bad.append(f"有尾迹的层选光点没提示：{r['note'][:60]}")
    # 4.2.15 光点大小 / 亮度：只在选光点时出现；改了导出的发射器跟着变，回到 1 层里不留字段
    SZ = "(() => { const xs = state.layers.map(L => ({ L, b: layerEntryOf(L).bake })); const pc = fwlCombo('T', comboEntries(xs, false), false), e = pc.emitters.find(e => e.layer === 2); return e ? e.modules.find(m => m.m === 'InitialSize').StartSize.uniform : null; })()"
    s0 = await pg.evaluate(SZ)
    vis = await pg.evaluate("(() => { const d = $('#lhDots'); return !!d && !d.hidden && !!d.querySelector('input[id$=dotSize]') && !!d.querySelector('input[id$=dotBright]'); })()")
    if not vis: bad.append('选了光点，层页头没出现光点大小 / 亮度')
    else:
        await pg.fill('#lhDots input[id$=dotSize] ~ input.num', '2'); await pg.press('#lhDots input[id$=dotSize] ~ input.num', 'Enter'); await pg.wait_for_timeout(200)
        s2 = await pg.evaluate(SZ); info['光点大小 1 → 2'] = [s0, s2, await pg.evaluate("state.layers[1].dotSize")]
        if not (s0 and s2 and abs(s2[0][0] / s0[0][0] - 2) < 0.02): bad.append(f'光点大小改成 2，导出的大小没翻倍：{s0} → {s2}')
        await pg.fill('#lhDots input[id$=dotSize] ~ input.num', '1'); await pg.press('#lhDots input[id$=dotSize] ~ input.num', 'Enter'); await pg.wait_for_timeout(200)
        if await pg.evaluate("'dotSize' in state.layers[1]"): bad.append('光点大小改回 1，层里还留着 dotSize')
    # 4.2.15 光点个数 = 模拟里会亮的星数（引菊 → 锦两层炭头亮度都是 0 → 0 颗，层页头要提示）；另拿第 1 层把炭头亮度临时设成 1 查画得出来
    dr = await pg.evaluate("(() => { selectComboLayer(-1); const pc = state.layers.map(comboLayerDraw); state.platform = 'mobile'; const mb = state.layers.map(comboLayerDraw); state.platform = 'pc'; const n = (i, o) => { const L = { ...state.layers[i], out: { pc: 'dots', mobile: 'seq' } }, e0 = layerEntryOf(state.layers[i]), e = o ? { P: { ...e0.P, ...o } } : e0, v = dotVis(e.P); return [dotsTables(e, L)[0].list.length, v ? v.n : 0, e.P.stars]; }; return { pc, mb, l2: n(1), l1: n(0, { headBright: 1 }) }; })()")
    info['引擎回放'] = dr
    if dr['pc'][1] != 'dots' or dr['mb'][1] != 'seq': bad.append(f"引擎回放第 2 层：PC {dr['pc'][1]}、手机 {dr['mb'][1]}（应为光点 / 序列）")
    for k in ('l1', 'l2'):
        if dr[k][0] != dr[k][1]: bad.append(f"引擎回放光点数 {dr[k][0]}（模拟里会亮的星 {dr[k][1]}）")
    if not dr['l1'][1]: bad.append(f"第 1 层（炭头亮度设 1）模拟里没有亮的星：{dr['l1']}")
    if not dr['l2'][1] and '星头不发光' not in r['note']: bad.append('第 2 层星头不发光，层页头没提示')
    await pg.evaluate("toggleDeliv(true); 0"); await pg.wait_for_timeout(200)
    dv = await pg.evaluate("$('#delivView').textContent"); await pg.evaluate("toggleDeliv(false); 0")
    if 'GPU 光点' not in dv: bad.append('交付页没写第 2 层是 GPU 光点')
    cas = await pg.evaluate("(() => { const xs = state.layers.map(L => ({ L, b: layerEntryOf(L).bake })); const pc = fwlCombo('T', comboEntries(xs, false), false); return pc.emitters.filter(e => e.layer === 2).map(e => [e.name, e.gpu, pc.materials[e.material].role]); })()")
    info['PC 第 2 层发射器'] = cas
    if cas != [['L2_Dots', True, 'soft_dot']]: bad.append(f'cascade.json 第 2 层不是一个 GPU 光点发射器：{cas}')
    # 4.9.7 起撤销按一次操作一步：选光点、光点大小 1 → 2、2 → 1 是三步，撤三次一步步回到序列（以前按停手 0.6 s 并步，后两步并成一步、净变化为零就不记）
    steps = []
    for _ in range(3):
        await pg.mouse.click(700, 400); await pg.keyboard.press('Control+z'); await idle(pg); await pg.wait_for_timeout(300)
        steps.append(await pg.evaluate("({ pc: (state.layers[1].out || {}).pc || 'seq', dot: state.layers[1].dotSize == null ? 1 : state.layers[1].dotSize })"))
    info['撤三次'] = steps
    if vis and steps[:2] != [{'pc': 'dots', 'dot': 2}, {'pc': 'dots', 'dot': 1}]: bad.append(f'撤销没按一次操作一步回去：{steps}')
    if steps[-1]['pc'] == 'dots': bad.append('撤销没回到序列')
    # 4.2.13 单束
    await pg.evaluate("selectComboLayer(1); 0"); await idle(pg)
    u = await pg.evaluate("(() => { const opt = document.querySelector('#lhOut select[data-out=pc] option[value=unit]'); return { has: !!opt, disabled: opt ? opt.disabled : null, allowed: unitAllowed(layerEntryOf(state.layers[1]).P) }; })()")
    info['单束选项'] = u
    if not u['has']: bad.append('PC 方案里没有单束')
    elif u['allowed']:
        await pg.select_option('#lhOut select[data-out=pc]', 'unit'); await pg.wait_for_timeout(300)
        r2 = await pg.evaluate("({ out: state.layers[1].out, note: $('#lhOutNote').textContent, draw: comboLayerDraw(state.layers[1]) })")
        info['选了单束'] = r2
        if r2['draw'] != 'unit' or '单束' not in r2['note']: bad.append(f'选单束后：{r2}')
    return not bad, '；'.join(bad) or json.dumps(info, ensure_ascii=False)


async def g1(pg):
    r = await pg.evaluate("""(() => { const ef = EFFS().find(e => e.key === 'hiki_nishiki'), e = entryById(ef.待验收版 || ef.主条目), cur = entryVer(e);
      const fake = { ...ef, exports: [{ job: 'X10', entry: e.id, ver: cur, time: '2026-10-03 03:13', check: { passed: true } }, { job: 'X9', entry: e.id, ver: 'old', time: '2026-10-02 18:42', check: { passed: true } }] };
      const r = effReady(fake); return { exJob: r.ex && r.ex.job, why: r.why }; })()""")
    ok = r['exJob'] == 'X10' and not any('导出' in w for w in r['why'])
    return ok, json.dumps(r, ensure_ascii=False)


# ---- 4.2.16 按需烘焙 ----
K1_FAKE = r"""(() => {
  window.__k = { done: [], aborted: 0, refine: 0 };
  const chk = { clipFrames: [], edgeFrames: [], chanUse: [true, true, true, true], emptyMid: [], similar: 0, seam: null, maxClip: 0 };
  bake = async (P, scale, onProg) => {
    const Pc = structuredClone(P), fm = measure(Pc), pl = plan(Pc, fm), pages = splitPlan40(pl);
    try { for (let i = 1; i <= 8; i++) { if (onProg) onProg(i / 8); await new Promise(r => setTimeout(r, 60)); } }
    catch (e) { window.__k.aborted++; throw e; }
    const parts = pages.map(meta => ({ P: Pc, form: Pc.form, N: 4, NH: 4, cw: 1, chh: 1, scale: 1, fm, head: { dispose() { } }, tail: null,
      meta: { ...meta, check: chk, lightKeys: [[0, 1], [1, 0]], darkTail: 0, frameMaxes: [], quality: qualityOf(Pc), expoH: 1, expoT: 1, bakeMs: 1, sparkSlots: 0 } }));
    parts.forEach((b, i) => b.next = parts[i + 1]); parts[0].meta.plan = pl; parts[0].srcP = Pc;
    window.__k.done.push({ stars: Pc.stars, burn: Pc.burn }); return parts[0];
  };
  refineBake = async b => { window.__k.refine++; for (let s = b; s; s = s.next) s.meta.fitted = { mode: 'none' }; return null; };
  return 0;
})()"""
SETTLE = "!state.baking && !(state.layerQueue && state.layerQueue.size) && !state.refineDue && !(state.layerRefine && state.layerRefine.size) && $('#busy').hidden && !window.__opening"


async def settle(pg, ms=20000):
    t0 = time.time()
    while time.time() - t0 < ms / 1000:
        await pg.wait_for_timeout(250)
        if await pg.evaluate(SETTLE):
            await pg.wait_for_timeout(900)          # 防抖 / 收紧排队（0.38 / 0.7 s）都过了还是静的才算
            if await pg.evaluate(SETTLE): return True
    return False


async def k1(pg):
    bad, info = [], {}
    have = await pg.evaluate("typeof setAutoBake === 'function' && typeof bakeNow === 'function' && !!document.getElementById('bakeNow') && !!document.getElementById('staleBar')")
    if not have: return False, '还没有按需烘焙（setAutoBake / bakeNow / #bakeNow / #staleBar）'
    await pg.evaluate(K1_FAKE)
    # 单层
    await open_effect(pg, 'jinmangju'); await settle(pg)
    # 4.5.0（用户 10-05 #14）：打开效果不换视图，页面打开时是实时模拟（4.3 曾让候选一打开就切引擎回放）
    v = await pg.evaluate("state.view"); info['打开候选时的视图'] = v
    if v != 'live': bad.append(f'打开待验收候选后不在实时模拟（{v}）')
    await pg.click('#viewSeg button[data-view=live]'); await settle(pg)
    await pg.evaluate("setAutoBake(false); 0")
    n0 = await pg.evaluate("__k.done.length")
    await pg.evaluate("state.P.stars = (state.P.stars || 100) + 7; onParam(); 0"); await pg.wait_for_timeout(1500)
    r = await pg.evaluate("({ n: __k.done.length, stale: bakeStale(), btn: $('#bakeNow').textContent, bar: !$('#staleBar').hidden, want: state.P.stars })")
    info['自动烘焙关 · 改参数'] = r
    if r['n'] != n0: bad.append(f"自动烘焙关时改参数还是烘了（{r['n'] - n0} 次）")
    if not r['stale']: bad.append('改了参数，贴图没标「旧」')
    if r['bar']: bad.append('实时模拟视图不该出「贴图是旧的」横条')
    rf0 = await pg.evaluate("__k.refine")
    await pg.click('#viewSeg button[data-view=export]'); await settle(pg)
    r = await pg.evaluate("({ n: __k.done.length, last: __k.done[__k.done.length - 1], stale: bakeStale(), bar: !$('#staleBar').hidden, refine: __k.refine })")
    info['切到引擎回放'] = r
    if r['n'] != n0 + 1 or r['last']['stars'] != info['自动烘焙关 · 改参数']['want']: bad.append(f"切到引擎回放没按新参数烘一次：{r}")
    if r['stale'] or r['bar']: bad.append('烘完还标着旧')
    if r['refine'] <= rf0: bad.append('手动烘（切视图）没做收紧取景')
    await pg.evaluate("state.P.stars += 5; onParam(); 0"); await pg.wait_for_timeout(1500)
    r = await pg.evaluate("({ n: __k.done.length, bar: !$('#staleBar').hidden, txt: $('#staleBar').textContent, want: state.P.stars })")
    info['引擎回放里改参数'] = r
    if r['n'] != n0 + 1: bad.append('引擎回放视图里改参数也自动烘了')
    if not r['bar']: bad.append('引擎回放视图里贴图旧了，没有横条提示')
    await pg.evaluate("document.activeElement && document.activeElement.blur(); 0"); await pg.keyboard.press('b'); await settle(pg)
    r = await pg.evaluate("({ n: __k.done.length, last: __k.done[__k.done.length - 1], bar: !$('#staleBar').hidden })")
    info['按 B'] = r
    if r['n'] != n0 + 2 or r['last']['stars'] != info['引擎回放里改参数']['want'] or r['bar']: bad.append(f"按 B 没烘到最新：{r}")
    # 自动烘焙开：改完自动烘、不收紧；烘到一半又改 → 丢掉这次
    await pg.evaluate("setAutoBake(true); 0")
    n1, rf1, ab1 = await pg.evaluate("[__k.done.length, __k.refine, __k.aborted]")
    await pg.evaluate("state.P.stars += 3; onParam(); 0"); await pg.wait_for_timeout(650)
    await pg.evaluate("state.P.stars += 2; onParam(); 0"); await settle(pg)
    r = await pg.evaluate("({ n: __k.done.length, last: __k.done[__k.done.length - 1], aborted: __k.aborted, refine: __k.refine, want: state.P.stars, stale: bakeStale() })")
    info['自动烘焙开 · 烘到一半又改'] = r
    if r['aborted'] <= ab1: bad.append('烘到一半参数又变，旧的那次没丢掉（等它烘完了）')
    if r['n'] != n1 + 1 or r['last']['stars'] != r['want']: bad.append(f"自动烘焙：应只完整烘一次、按最新参数（完成 {r['n'] - n1} 次）")
    if r['refine'] != rf1: bad.append('自动烘焙也做了收紧取景（应只在手动烘 / 导出时做）')
    if r['stale']: bad.append('自动烘完还标着旧')
    # 多层：自动烘焙关时改一层，导出拿到的是新参数
    await pg.evaluate("setAutoBake(false); 0")
    await open_effect(pg, 'hiki_nishiki'); await settle(pg)
    n2 = await pg.evaluate("__k.done.length")
    old = await pg.evaluate("layerEntryOf(state.layers[0]).P.burn")
    await set_layer_param(pg, 0, 'burn', round(old + 0.2, 3)); await pg.wait_for_timeout(1500)
    r = await pg.evaluate("({ n: __k.done.length, baked: layerEntryOf(state.layers[0]).bake.P.burn, stale: bakeStale() })")
    info['多层 · 自动烘焙关 · 改第 1 层'] = r
    if r['n'] != n2: bad.append('多层：自动烘焙关时改一层还是烘了')
    if not r['stale']: bad.append('多层：改了一层没标旧')
    r = await pg.evaluate("(async () => { const x = await comboLayerBakes(state.layers); const b = x.layers[0].b.P.burn; x.own.forEach(disposeBake); return { b, want: layerEntryOf(state.layers[0]).P.burn, stale: bakeStale() }; })()")
    info['多层导出'] = r
    if abs(r['b'] - r['want']) > 1e-9: bad.append(f"多层导出拿到了旧贴图（{r['b']} vs 参数 {r['want']}）")
    pref = await pg.evaluate("store.get('autoBake', null)")
    if pref is not False: bad.append(f'开关没记住（{pref}）')
    await pg.evaluate("setAutoBake(true); 0")
    return not bad, json.dumps(info, ensure_ascii=False) if not bad else '；'.join(bad) + ' ｜ ' + json.dumps(info, ensure_ascii=False)


async def k2(pg):
    if not REAL: return None, '要真烘焙（--real，本机显卡任务里跑）'
    bad, info = [], {}
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    t0 = time.time()
    await pg.evaluate("Object.assign(state.P, { texW: 1024, texH: 1024 }); onParam(); 0"); await idle(pg); one = time.time() - t0
    # 烘到一半改参数：在第一次进度回调（0 < p < 1）里改，保证真的「烘到一半」（本机显卡烘得快，按时间估会改在烘完之后）
    await pg.evaluate("""(() => { window.__ab = 0; window.__hit = 0; const ob = bake;
      bake = async (P, s, onProg) => { try { return await ob(P, s, p => { if (!window.__hit && p > 0 && p < 1) { window.__hit = 1; state.P.stars += 4; onParam(); } return onProg && onProg(p); }); }
        catch (e) { if (e && e.abort) window.__ab++; throw e; } }; return 0; })()""")
    await pg.evaluate("state.P.stars += 9; onParam(); 0"); await idle(pg)
    r = await pg.evaluate("({ want: state.P.stars, baked: state.bake && state.bake.P.stars, aborted: window.__ab, hit: window.__hit, err: state.bakeError && state.bakeError.message })")
    info['一次烘焙秒数（含 0.38 s 防抖）'] = round(one, 2); info['烘到一半改参数'] = r
    if r['baked'] != r['want']: bad.append(f"最后的贴图不是最新参数（{r['baked']} vs {r['want']}）")
    if r['err']: bad.append('烘焙报错：' + r['err'])
    if not r['hit']: bad.append('烘焙没有中间进度（没法在烘到一半时改参数）')
    elif not r['aborted']: bad.append('烘到一半改参数，这次烘焙没作废')
    await pg.evaluate("setAutoBake(false); state.P.stars += 2; onParam(); 0"); await pg.wait_for_timeout(1500)
    r = await pg.evaluate("({ want: state.P.stars, baked: state.bake.P.stars, stale: bakeStale() })"); info['自动烘焙关 · 改参数'] = r
    if r['baked'] == r['want'] or not r['stale']: bad.append('自动烘焙关时改参数还是烘了 / 没标旧')
    await pg.evaluate("document.activeElement && document.activeElement.blur(); 0"); await pg.keyboard.press('b'); await idle(pg)
    r = await pg.evaluate("({ want: state.P.stars, baked: state.bake.P.stars, fitted: !!(state.bake.meta && state.bake.meta.fitted), stale: bakeStale() })"); info['按 B'] = r
    if r['baked'] != r['want'] or r['stale']: bad.append('按 B 没烘到最新')
    if not r['fitted']: bad.append('按 B 没做收紧取景')
    await pg.evaluate("setAutoBake(true); 0")
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)


async def r1(pg):
    await open_effect(pg, 'hiki_nishiki'); await pg.wait_for_timeout(900); await idle(pg)
    o = await pg.evaluate("state.layers.map(L => { const P = layerEntryOf(L).P; return [P.burn, P.sparkStop, P.ignDelay]; })")
    await pg.evaluate("selectComboLayer(0); 0"); await idle(pg)
    await pg.evaluate("setTimingParam('burn', 1.0); 0"); await idle(pg)
    m = await pg.evaluate("state.layers.map(L => { const P = layerEntryOf(L).P; return [P.burn, P.sparkStop, P.ignDelay]; })")
    await pg.evaluate("resetToOpened(); 0"); await idle(pg)
    r = await pg.evaluate("state.layers.map(L => { const P = layerEntryOf(L).P; return [P.burn, P.sparkStop, P.ignDelay]; })")
    moved = abs(m[1][2] - o[1][2]) > 1e-6
    ok = moved and all(abs(a - b) < 1e-9 for x, y in zip(o, r) for a, b in zip(x, y))
    return ok, json.dumps({'打开时': o, '改第 1 层燃烧 1.0 后': m, '恢复第 1 层后': r}, ensure_ascii=False)


async def n1(pg):
    """4.4 面板：发射器 → 模块的顺序、短名来自发射器表、随机折叠、不起作用变灰、说明条、搜索（短名 / 全名 / 英文名 / 模块名）、英文名开关、空白发射器加 / 去掉"""
    bad, info = [], {}
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    await pg.evaluate("selectEmitTab('全部'); 0")
    lab = "(k) => { const x = panelRows.find(([r, it]) => (Array.isArray(it) ? it[0] : it.sel) === k); return x ? x[0]._lab : null; }"
    on = await pg.evaluate("({ emit: [...document.querySelectorAll('#params section.egrp')].filter(d => !d.hidden).map(d => d.dataset.g), mods: [...document.querySelectorAll('#params details.mod')].filter(d => !d.hidden).map(d => d._key), burn: (%s)('burn'), v0: (%s)('v0') })" % (lab, lab))
    info['打开'] = {'emit': on['emit']}
    if on['emit'][:3] != ['效果', '星', '火花'] or on['emit'][-1:] != ['输出']: bad.append(f"发射器顺序不对：{on['emit']}")
    for k in ('星›生成', '星›初速', '星›受力', '星›寿命', '火花›生成', '火花›寿命', '火花›受力'):
        if k not in on['mods']: bad.append(f'没有模块「{k}」')
    if on['mods'].index('星›生成') > on['mods'].index('星›寿命'): bad.append('星的模块顺序不对（生成应在寿命前）')
    for old in ('阻力重力', '烟花特性', '尾迹外形'):
        if any(m.endswith('›' + old) for m in on['mods']): bad.append(f'还有旧模块「{old}」')
    want = await pg.evaluate("[PEMIT.P[pnameOf('开花与燃烧', 'burn').id][2], PEMIT.P[pnameOf('开花与燃烧', 'v0').id][2], pnameOf('开花与燃烧', 'burn').en]")
    if on['burn'] != want[0] or on['v0'] != want[1] or want[0] != '燃烧时间': bad.append(f"名字不是发射器表里的：{on['burn']} / {on['v0']}（表：{want[:2]}）")
    # 所有短名和名称表全名不一样的行（例：火花 › 寿命 › 「寿命」，全名「火花寿命」）：面板上必须是短名
    sh = await pg.evaluate("(() => { const out = { n: 0, bad: [] }; for (const [r, it] of panelRows) { const nm = r._nm, x = nm && nm.id ? PEMIT.P[nm.id] : null; if (!x || !x[2] || x[2] === nm.cn) continue; out.n++; if (r._lab !== x[2]) out.bad.push([nm.key, r._lab, x[2]]); } return out; })()")
    info['短名'] = sh['n']
    if sh['n'] < 10 or sh['bad']: bad.append(f"面板名字不是发射器表的短名（{len(sh['bad'])} / {sh['n']}）：{sh['bad'][:4]}")
    folded = await pg.evaluate("panelRows.filter(([r]) => r._randOf).map(([r, it]) => it[0])"); info['收起的随机'] = folded
    if 'burnJit' not in folded or 'speedJit' not in folded: bad.append(f'燃烧时间随机 / 初速随机没收到本体下面：{folded}')
    r = await pg.evaluate("(() => { const b = panelRows.find(([r, it]) => it[0] === 'burn')[0], j = panelRows.find(([r, it]) => it[0] === 'burnJit')[0]; const h0 = j.hidden; b.querySelector('.rndb').click(); const h1 = j.hidden, next = b.nextElementSibling === j; return { h0, h1, next, txt: b.querySelector('.rndb').textContent, stored: !!store.get('pRandOpen', {}).burn }; })()")
    info['随机'] = r
    if not r['h0'] or r['h1'] or not r['next'] or not r['stored']: bad.append(f'燃烧时间随机折叠不对：{r}')
    r = await pg.evaluate("(() => { const b = panelRows.find(([r, it]) => it[0] === 'ignDelay')[0]; if (b.querySelector('.rndb') && !pview.ropen.ignDelay) b.querySelector('.rndb').click(); const j = panelRows.find(([r, it]) => it[0] === 'ignJit')[0]; panelHelp(j); return { inert: j.classList.contains('inert'), why: j._inert, help: $('#pHelp').textContent }; })()")
    info['菊 点火延迟随机'] = {k: r[k] for k in ('inert', 'why')}
    if not r['inert'] or '点火延迟' not in (r['why'] or '') or '现在不起作用' not in r['help']: bad.append(f'菊的点火延迟随机没标不起作用：{r}')
    if 'Ignition' not in r['help'] or '·' not in r['help']: bad.append('说明条第一行不是「English · 中文」')
    r = await pg.evaluate("(() => { const x = panelRows.find(([r, it]) => it[0] === 'headDimUntil'); return x ? { inert: x[0].classList.contains('inert'), why: x[0]._inert, dim: state.P.headDim } : null; })()")
    info['菊 前段结束'] = r
    if not r or not r['inert'] or '前段亮度' not in (r['why'] or ''): bad.append(f'前段亮度 = 1 时「前段结束」没标不起作用：{r}')
    h = await pg.evaluate("(() => { panelHelp(panelRows.find(([r, it]) => it[0] === 'burn')[0]); return $('#pHelp').textContent; })()")
    full = await pg.evaluate("pnameOf('开花与燃烧', 'burn').cn")
    if not h.startswith(want[2] + ' · ' + full): bad.append(f'说明条第一行：{h[:40]}')
    for w in ('调大', 'UE', '星 › 寿命'):
        if w not in h: bad.append(f'说明条没有「{w}」')
    SR = "(q) => { const i = $('#params .ptools input[type=search]'); i.value = q; i.dispatchEvent(new Event('input')); return panelRows.filter(([r]) => !r.hidden).map(([r, it]) => it[0]); }"
    for q, k in (('Lifetime', 'burn'), ('燃烧时间', 'burn'), ('寿命', 'sparkLife'), ('Spawn Burst', 'stars')):
        r = await pg.evaluate(SR, q)
        if k not in r: bad.append(f'搜「{q}」找不到 {k}（{r[:6]}）')
    await pg.evaluate("(() => { const i = $('#params .ptools input[type=search]'); i.value = ''; i.dispatchEvent(new Event('input')); return 0; })()")
    await pg.evaluate("document.querySelector('#params [data-en]').click(); 0"); await pg.wait_for_timeout(200)
    en = await pg.evaluate("(%s)('burn')" % lab)
    if en != want[2]: bad.append(f'英文名开关：燃烧时间显示「{en}」')
    await pg.evaluate("document.querySelector('#params [data-en]').click(); 0")
    # 牡丹：没有火花 → 火花寿命变灰
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('botan')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate("(() => { const x = panelRows.find(([r, it]) => it[0] === 'sparkLife'); return x ? { inert: x[0].classList.contains('inert'), why: x[0]._inert, rate: state.P.sparkRate } : null; })()")
    info['牡丹 火花寿命'] = r
    if not r or not r['inert']: bad.append(f'牡丹（火花 0）的火花寿命没标不起作用：{r}')
    # 爆裂星：「爆裂」发射器里有数量 / 延迟 / 范围 / 速度
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('crackle')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate("(() => { selectEmitTab('爆裂'); const g = document.querySelector('#params section.egrp[data-g=\"爆裂\"]'); const has = k => { const x = panelRows.find(([r, it]) => it[0] === k); return !!x && !x[0].hidden && !!g && g.contains(x[0]); }; return { shown: !!g && !g.hidden, N: has('crackle'), R: has('crackleR'), V: has('crackleV') }; })()")
    info['爆裂星 爆裂'] = r
    if not all(r.values()): bad.append(f'爆裂星的「爆裂」发射器不对：{r}')
    # 升空尾缀：一个入口，档位在「效果 › 规格」里
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('trailM')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate("(() => { selectEmitTab('全部'); const x = panelRows.find(([r, it]) => it.sel === '_trailTier'); return x ? { mod: x[0].closest('details.mod') && x[0].closest('details.mod')._key, lab: x[0]._lab, hidden: x[0].hidden, emit: [...document.querySelectorAll('#params section.egrp')].filter(d => !d.hidden).map(d => d.dataset.g) } : null; })()")
    info['尾缀档位'] = r
    if not r or r['mod'] != '效果›规格' or r['hidden'] or not r['lab']: bad.append(f'升空尾缀的档位不在「效果 › 规格」里：{r}')
    elif not all(e in r['emit'] for e in ('星头', '白热火花', '金火花', '橙色火花', '丝状火花')): bad.append(f"升空尾缀的发射器不全：{r['emit']}")
    # 空白发射器：只有星；「+ 火花」加上火花发射器（生成率按菊的模板）、「去掉」回到 0
    MODS = "(() => ({ tabs: [...document.querySelectorAll('#params .etabs [data-e]')].filter(b => !b.hidden).map(b => b.dataset.e), add: [...document.querySelectorAll('#params [data-addmod]')].map(b => b.dataset.addmod), rm: [...document.querySelectorAll('#params [data-rmmod]')].map(b => b.dataset.rmmod), rate: state.P.sparkRate, pm: state.P.mods }))()"
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('blank')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r0 = await pg.evaluate(MODS)
    await pg.evaluate("document.querySelector('#params [data-addmod=\"火花\"]').click(); 0"); await idle(pg)
    r1 = await pg.evaluate(MODS)
    await pg.evaluate("document.querySelector('#params [data-rmmod=\"火花\"]').click(); 0"); await idle(pg)
    r2 = await pg.evaluate(MODS)
    info['空白发射器'] = {'打开': r0, '加火花': r1, '去掉': r2}
    if '火花' in r0['tabs'] or r0['rate'] != 0 or sorted(r0['add']) != sorted(['火花', '尾迹外形', '烟花特性']) or '星' not in r0['tabs']: bad.append(f'空白发射器打开时不对：{r0}')
    if '火花' not in r1['tabs'] or not r1['rate'] or '火花' in r1['add'] or '火花' not in r1['rm']: bad.append(f'加「火花」不对：{r1}')
    if '火花' in r2['tabs'] or r2['rate'] != 0 or '火花' not in r2['add']: bad.append(f'去掉「火花」不对：{r2}')
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)


# N2（4.3 清理清单 B1 / B2）：每个花型的每个参数都在命名表里有名字；命名表的名字、说明和模块说明里不再出现词汇表「不用」的词
OLD_WORDS = ['炭头', '火星', '火粉', '光丝', '长尾', '小割', '离散', '炸开', '尾巴', '旧名']     # 「燃烧时间」10-04 用户改回，不再算旧词
N2_SCAN = r"""(OLD) => { const miss = {}, hits = [];
  for (const t of Object.keys(TYPES)) { const P = defaultsFor(t).P;
    for (const sec of SCHEMA) { if (sec.show && !sec.show(P)) continue;
      for (const it of sec.items) { const k = Array.isArray(it) ? it[0] : it.sel || it.text; if (!k) continue;
        if (!pnameOf(sec.sec, k, Array.isArray(it) ? (typeof it[1] === 'function' ? it[1](P) : it[1]) : it.label)) (miss[t] = miss[t] || new Set()).add(k); } } }
  for (const r of PNAMES) for (const f of ['cn', 'desc', 'updown', 'note', 'random', 'mcn']) { const v = r[f] || ''; for (const w of OLD) if (v.includes(w)) hits.push(`${r.key}.${f}：${w}`); }
  for (const m of (typeof PMODULES !== 'undefined' ? PMODULES : [])) for (const w of OLD) if ((m.what || '').includes(w) || m.cn.includes(w)) hits.push(`模块 ${m.cn}：${w}`);
  for (const sec of SCHEMA) for (const w of OLD) if ((sec.hint || '').includes(w)) hits.push(`节说明 ${sec.sec}：${w}`);
  const out = {}; for (const t in miss) out[t] = [...miss[t]];
  return { miss: out, hits, types: Object.keys(TYPES).length, rows: PNAMES.length }; }"""


async def n2(pg):
    r = await pg.evaluate(N2_SCAN, OLD_WORDS)
    bad = []
    if r['miss']: bad.append('没有命名表名字的参数：' + '；'.join(f'{t} {v[:4]}' for t, v in list(r['miss'].items())[:4]))
    if r['hits']: bad.append(f"还有旧词 {len(r['hits'])} 处：{r['hits'][:5]}")
    return not bad, '；'.join(bad) or f"{r['types']} 个花型的参数都有名字（命名表 {r['rows']} 行）、没有旧词"


S1_JS = r'''async () => {
  const out = {}, bad = [];
  // H16：「负数 = 默认」的参数（4.9.0 起是链条：接着 = 灰字显示算出来的值、滑杆照样能拖；点链条断开 / 接回）
  await openType('senrin'); await new Promise(r => setTimeout(r, 300));
  const rowOf = k => (panelRows.find(([r, it]) => Array.isArray(it) && it[0] === k) || [])[0];
  for (const [k, want] of [['subKeep', 0.35], ['subGrav', +state.P.grav], ['subFlash', +(state.P.flash * 0.3).toFixed(3)], ['subSpeedJit', +state.P.speedJit]]) {
    const row = rowOf(k); if (!row) { bad.push(k + ' 没有这一行'); continue; }
    const bt = row.querySelector('.chain'), rg = row.querySelector('input[type=range]'), num = row.querySelector('.num');
    if (!bt) { bad.push(k + ' 没有链条'); continue; }
    const r = { on: bt.getAttribute('aria-pressed') === 'true', dis: rg.disabled, min: +rg.min, shown: +num.value };
    bt.click(); r.off = { v: state.P[k], dis: rg.disabled, on: bt.getAttribute('aria-pressed') === 'true' };
    bt.click(); r.back = state.P[k];
    out[k] = r;
    if (!(r.on && !r.dis && r.min >= 0)) bad.push(k + ' 打开时链条没接着 / 滑杆不能拖 / 下限还是负数 ' + JSON.stringify(r));
    if (Math.abs(r.shown - want) > 0.011 * Math.max(1, Math.abs(want))) bad.push(`${k} 接着时显示 ${r.shown}，算出来的值是 ${want}`);
    if (!(Math.abs(r.off.v - want) < 1e-6 && !r.off.dis && !r.off.on)) bad.push(`${k} 断开后 = ${r.off.v}（应固定在算出来的 ${want}、滑杆可调）`);
    if (r.back !== -1) bad.push(`${k} 再接回去后 = ${r.back}（应存 -1）`);
  }
  // H12：只剩 GPU 模拟内核
  out.engineSelect = !!document.querySelector('#x-engine');
  out.stored = storedParams({ type: 'kiku', engine: 'cpu', renderVer: 40 }).engine;
  importParams({ params: { type: 'kiku', stars: 120 } }, 'old.json'); out.imported = state.P.engine;
  if (out.engineSelect) bad.push('还有「模拟内核」选择');
  if (out.stored !== 'gpu' || out.imported !== 'gpu') bad.push(`存档 / 旧母版没换成 GPU（${out.stored} / ${out.imported}）`);
  // E11③：物理尾缀过顶后按下落段（tanh）算，速度不超过终端速度、位置连续
  const tp = Object.keys(TYPES).find(t => TYPES[t].p && TYPES[t].p.form === 'phys');
  if (tp) {
    const P = { ...defaultsFor(tp).P, type: tp }, pt = new PhysTrail(P), ta = pt.ba / pt.bw, vt = Math.sqrt(G / P.phK);
    const a = pt.shell(ta - 1e-4), b = pt.shell(ta + 1e-4), c = pt.shell(ta + 40);
    out.phys = { type: tp, ta: +ta.toFixed(3), dz: +(b.z - a.z).toFixed(5), vzLate: +c.vz.toFixed(2), vt: +vt.toFixed(2) };
    if (Math.abs(b.z - a.z) > 0.01) bad.push('物理尾缀到顶前后位置不连续 ' + JSON.stringify(out.phys));
    if (!(c.vz < 0 && Math.abs(c.vz) <= vt * 1.001)) bad.push('物理尾缀过顶 40 s 后下落速度超过终端速度 ' + JSON.stringify(out.phys));
    out.lateWarn = physStats({ ...P, phT: +(ta + 1).toFixed(2) }).includes('开花晚于到顶');
    if (!out.lateWarn) bad.push('开花晚于到顶没有提示（H15②）');
  } else bad.push('找不到物理尾缀模板');
  return { ok: !bad.length, bad, out };
}'''


async def s1(pg):
    """4.3.2 收尾：「用默认」勾选（H16）、只剩 GPU 模拟内核（H12）、物理尾缀过顶后弹道 + 开花晚于到顶提示（E11③ / H15②）"""
    r = await pg.evaluate(S1_JS)
    return r['ok'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)


async def s2(p, b):
    """4.3.3（用户 10-04 11:56）：新建效果 → 选牡丹模板 → 加引菊 → 锦的引菊层：打开就在第 1 层的参数上（不是「整体」）；
    每层的模拟参数能改，改的是这个效果自己的一份（原条目、原效果不变）；保存再打开还在"""
    ctx = await b.new_context(viewport={'width': 1440, 'height': 900}); pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('dialog', lambda d: asyncio.ensure_future(d.accept('检查新建' if d.type == 'prompt' else None)))
    await pg.goto(HTML, wait_until='domcontentloaded', timeout=0); await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
    await pg.evaluate(REC if REAL else FAKE); await pg.evaluate('state.playing = false'); await pg.evaluate(ask_stub('检查新建'))
    bad, info = [], {}
    rows = "(() => [...document.querySelectorAll('#params .sl')].filter(r => r.offsetParent && !r.querySelector('input[type=range]').disabled).map(r => r._lab || r.querySelector('.k').textContent))()"
    await pg.click('#newRecipe'); await pg.wait_for_timeout(500)
    await pg.evaluate("(() => { pk.cat = 'all'; pkRender(); const c = [...document.querySelectorAll('#pkGrid .pk-card')].find(x => x.querySelector('.nm').textContent.startsWith('牡丹')); c.click(); return 0; })()")
    await pg.wait_for_timeout(1500); await idle(pg)
    info['新建后'] = await pg.evaluate(f"({{ sel: state.comboSel, type: state.P.type, n: state.layers.length, rows: {rows}.length }})")
    if info['新建后']['sel'] != 0 or info['新建后']['type'] != 'botan': bad.append(f"新建后没停在第 1 层的参数上（{info['新建后']}）")
    if info['新建后']['rows'] < 8: bad.append(f"新建后看得到的参数只有 {info['新建后']['rows']} 个")
    await pg.evaluate("(() => { $('#myAdd').click(); setTimeout(() => { pk.cat = 'fx'; pkRender(); const c = [...document.querySelectorAll('#pkGrid .pk-card')].find(x => x.textContent.includes('引菊') && x.textContent.includes('HN2-O')); c.click(); }, 50); return 0; })()")
    await pg.wait_for_timeout(2500); await idle(pg)
    o0 = await pg.evaluate("replicaPM('HN2-O').P.stars")
    info['加层后'] = await pg.evaluate(f"({{ sel: state.comboSel, n: state.layers.length, own: state.layers.map(L => !!(layerEntryOf(L) || {{}}).own), rows: {rows}.length, stars: state.P.stars }})")
    if info['加层后']['sel'] != 1 or not all(info['加层后']['own']): bad.append(f"加层后没选新层或层不是自己的一份（{info['加层后']}）")
    await pg.evaluate("state.P.stars = 77; refreshPanelValues(); onParam(); 0"); await pg.wait_for_timeout(600); await idle(pg)
    info['改星数'] = await pg.evaluate("({ layer: layerEntryOf(state.layers[1]).P.stars, orig: replicaPM('HN2-O').P.stars, other: state.layers.map(L => layerEntryOf(L).P.stars) })")
    if info['改星数']['layer'] != 77 or info['改星数']['orig'] != o0: bad.append(f"改星数没改到这一层或改到了原条目（{info['改星数']}，原来 {o0}）")
    await pg.evaluate("mySave(false)"); await pg.wait_for_timeout(800)
    rid = await pg.evaluate("lib.my.id")
    await pg.evaluate(f"openType('kiku')"); await pg.wait_for_timeout(1000); await idle(pg)
    await pg.evaluate(f"openMyEffect('{rid}')"); await pg.wait_for_timeout(1500); await idle(pg)
    info['再打开'] = await pg.evaluate("({ sel: state.comboSel, stars: state.layers.map(L => layerEntryOf(L).P.stars), label: typeof srcLabel === 'function' ? srcLabel() : '' })")
    if info['再打开']['stars'][1] != 77: bad.append(f"保存再打开第 2 层星数不是 77（{info['再打开']}）")
    if 'AI 版' in info['再打开']['label']: bad.append(f"自己的效果写着「{info['再打开']['label']}」")
    if errs: bad.append('页面错误：' + errs[0][:150])
    await ctx.close()
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)


S3_JS = r"""async () => {
  // 4.4：打开菊 / 空白 / 升空尾缀，默认那一页看得见（4.9.14：模块一行一个写摘要、第一个展开）；各发射器标签点了就看得见它的模块；模块收起和选的标签重建面板后记得住
  const out = {}, bad = [];
  const shown = el => { if (!el || !el.offsetParent) return false; for (let a = el.parentElement, c = el; a; c = a, a = a.parentElement) { if (a.hidden) return false; if (a.tagName === 'DETAILS' && !a.open && c.tagName !== 'SUMMARY') return false; } return true; };
  const vis = () => [...document.querySelectorAll('#params .sl')].filter(shown).length;
  const tabOk = async e => { const b = document.querySelector(`#params .etabs [data-e="${e}"]`); if (!b || b.hidden) return false; b.click(); await new Promise(r => setTimeout(r, 30));
    const g = document.querySelector(`#params section.egrp[data-g="${e}"]`); return !!g && !g.hidden && [...g.querySelectorAll(':scope > details.mod')].some(d => shown(d.querySelector('summary'))) && [...g.querySelectorAll('.sl')].some(shown); };
  // 4.9.14（照 01_顺手调参_深化）：默认一页 = 这个发射器的模块一行一个（收起的写摘要），第一个模块展开、看得见参数（4.4 起要「≥ 15 个参数」，那是模块全展开时的口径）
  const modsOf = () => { const g = [...document.querySelectorAll('#params section.egrp')].find(x => !x.hidden); const ms = g ? [...g.querySelectorAll(':scope > details.mod')].filter(d => !d.hidden) : [];
    return { n: ms.length, titled: ms.filter(d => shown(d.querySelector('summary'))).length, sum: ms.filter(d => d.open || ((d.querySelector('summary .msum') || {}).textContent || '').trim()).length, open: ms.filter(d => d.open).length }; };
  for (const [t, need, emits] of [['kiku', 1, ['星', '火花', '余烬', '爆裂']], ['blank', 1, ['星']], ['trailM', 1, ['星头', '白热火花', '金火花', '橙色火花', '丝状火花']]]) {
    store.set('pEmitTab', {}); pview.tab = {};
    await openType(t); await new Promise(r => setTimeout(r, 400));
    const n = vis(), mm = modsOf(), m = {}; for (const e of emits) m[e] = await tabOk(e);
    out[t] = { sliders: n, mods: mm, emits: m };
    if (n < need || mm.open < 1) bad.push(`${t} 默认一页没有展开的模块 / 看不见参数（${n} 个）`);
    if (mm.titled !== mm.n || mm.sum !== mm.n) bad.push(`${t} 默认一页的模块没都列出来 / 收起的没写摘要：${JSON.stringify(mm)}`);
    for (const [k, v] of Object.entries(m)) if (!v) bad.push(`${t} 的「${k}」发射器点了看不见`);
    if (t === 'blank') { const b = document.querySelector('#blankAdd [data-addmod="火花"]'); out.blankAdd = shown(b); if (!out.blankAdd) bad.push('空白发射器的「+ 火花」看不见'); }
  }
  // 手动收起模块、选的标签：重建面板后记得住
  await openType('kiku'); await new Promise(r => setTimeout(r, 300)); selectEmitTab('火花');
  const mod = [...document.querySelectorAll('#params section.egrp[data-g="火花"] > details.mod')].find(d => !d.hidden), key = mod._key;
  mod.querySelector('summary').click(); await new Promise(r => setTimeout(r, 20));
  const savedClosed = store.get('pModOpen', {})[key] === false;
  buildMasterPanel(); await new Promise(r => setTimeout(r, 20));
  const rebuilt = [...document.querySelectorAll('#params details.mod')].find(d => d._key === key), keptClosed = !rebuilt.open, keptTab = (document.querySelector('#params .etabs .on') || {}).dataset.e === '火花';
  rebuilt.querySelector('summary').click(); await new Promise(r => setTimeout(r, 20));
  const savedOpen = store.get('pModOpen', {})[key] === true;
  out.memory = { key, savedClosed, keptClosed, savedOpen, keptTab };
  if (!savedClosed || !keptClosed || !savedOpen) bad.push('手动收起 / 展开模块后没有记住，重建面板会恢复默认');
  if (!keptTab) bad.push('重建面板后没停在刚选的「火花」');
  selectEmitTab('星');
  return { ok: !bad.length, bad, out };
}"""


async def s3(pg):
    """4.4：打开菊 / 空白发射器 / 升空尾缀，默认页和各发射器标签的参数可访问、空白的「+ 火花」可达、模块开合和标签记得住"""
    await pg.evaluate("store.set('pModOpen', {}); store.set('pEmitTab', {}); pview.ready = false; pviewInit(); 0")     # 没有存过展开状态的新用户
    r = await pg.evaluate(S3_JS)
    return r['ok'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)


S4_JS = r"""async () => {
  // 4.4：旧搜索 / 只看改过的 / 收起的模块不能把参数藏得找不回来：点发射器标签 = 清掉筛选、换到那一页；不改配方
  const out = {}, bad = [], wait = () => new Promise(r => setTimeout(r, 30));
  const saved = { mopen: structuredClone(store.get('pModOpen', {})), changed: store.get('pChanged', false), q: pview.q, tab: structuredClone(store.get('pEmitTab', {})) };
  const snapshot = () => JSON.stringify([state.P, state.M, state.gen]);
  const shown = el => { if (!el || !el.offsetParent) return false; for (let a = el.parentElement, c = el; a; c = a, a = a.parentElement) { if (a.hidden) return false; if (a.tagName === 'DETAILS' && !a.open && c.tagName !== 'SUMMARY') return false; } return true; };
  try {
    await openType('kiku'); await new Promise(r => setTimeout(r, 400));
    selectEmitTab('星');
    pview.changed = true; store.set('pChanged', true); pview.q = '没有匹配的旧搜索'; buildMasterPanel(); await wait();
    const tabsShown = [...document.querySelectorAll('#params .etabs [data-e]')].filter(b => !b.hidden).map(b => b.dataset.e), before = snapshot();
    document.querySelector('#params .etabs [data-e="火花"]').click(); await wait();
    const g = document.querySelector('#params section.egrp[data-g="火花"]');
    out.spark = { tabsWhileFiltered: tabsShown.includes('火花'), filtersCleared: !pview.q && !pview.changed && !$('#params .ptools input[type=search]').value, shown: !!g && !g.hidden,
      rows: [...g.querySelectorAll('.sl')].filter(shown).length, recipeUnchanged: snapshot() === before, onlyThis: [...document.querySelectorAll('#params section.egrp')].filter(x => !x.hidden).length === 1 };
    for (const [k, v] of Object.entries(out.spark)) if (!v) bad.push('火花找回失败：' + k);
    document.querySelector('#params .etabs [data-e="全部"]').click(); await wait();
    out.all = { emitters: [...document.querySelectorAll('#params section.egrp')].filter(x => !x.hidden).length };
    if (out.all.emitters < 5) bad.push('「全部」没把发射器都排出来：' + out.all.emitters);
  } finally {
    store.set('pModOpen', saved.mopen); store.set('pChanged', saved.changed); store.set('pEmitTab', saved.tab); pview.ready = false; pviewInit(); pview.q = saved.q; buildMasterPanel();
  }
  return { ok: !bad.length, bad, out };
}"""


async def s4(pg):
    r = await pg.evaluate(S4_JS)
    return r['ok'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)


E1_JS = r"""async () => {
  // 5.0 第 2 步（4.7.0，用户 10-05 19:40「全按推荐」、21:55「直接开 5.0」）：一套物理——空中类火花只按实际年龄冷却（老的先暗）、结尾等火花自然灭完；
  // 「结尾」「冷却方式」两个旧 / 新开关从面板删掉；花型模板的序列时长盖到最后一批火花；帧计划缺省按运动分（4.9.13 起；4.7.0–4.9.12 是匀速帧）、Zoom 缺省关
  const out = {}, bad = [];
  await openType('kiku'); await new Promise(r => setTimeout(r, 300));
  const endMul = () => { const pl = displayPlan40(state.P); return +frameFade40(pl, (pl.t0 || 0) + pl.duration - 0.05, false).toFixed(3); };
  const pl = displayPlan40(state.P);
  out.defaults = { noFade: !!pl.noEndFade, endMul: endMul(), fb: state.P.frameBudget, zoom: state.P.zoom, mode: pl.budget && pl.budget.mode, holds: pl.budget ? [pl.budget.holdMin, pl.budget.holdMax] : null };
  if (!out.defaults.noFade || out.defaults.endMul !== 1) bad.push('结尾还在整体淡出：' + JSON.stringify(out.defaults));
  // 4.9.13（用户 10-06 15:15「把帧数分配默认改回按运动分」）：缺省按运动分（开花段每 tick 一帧）、Zoom 关；匀速帧仍可选、每帧停一样多
  if (out.defaults.fb !== 'motion' || out.defaults.zoom !== 'off') bad.push('缺省不是按运动分 + 固定取景：' + JSON.stringify(out.defaults));
  { const t = pl.ticks || (pl.budget && pl.budget.ticks) || null; const pl2 = displayPlan40(state.P);
    out.motion = { F: pl2.L && pl2.L.F, fps0: pl2.dur && pl2.dur.length ? +(1 / Math.max(pl2.dur[0], 1 / 30)).toFixed(1) : null };
    if (out.motion.fps0 != null && out.motion.fps0 < 29.9) bad.push('按运动分：开花第一帧不是 30 fps：' + JSON.stringify(out.motion)); }
  { const keep = state.P.frameBudget; state.P.frameBudget = 'fixed'; const pf = displayPlan40(state.P); state.P.frameBudget = keep;
    out.fixed = { mode: pf.budget && pf.budget.mode, holds: pf.budget ? [pf.budget.holdMin, pf.budget.holdMax] : null };
    if (!out.fixed.holds || out.fixed.holds[0] !== out.fixed.holds[1]) bad.push('匀速帧：每帧停的 tick 数不一样：' + JSON.stringify(out.fixed)); }
  { const fr = panelRows.find(([r, it]) => it && it.sel === 'frameBudget'), opt = fr ? [...fr[0].querySelectorAll('select option')].map(o => o.textContent) : [];
    out.fbOpts = opt.length ? opt.map(t => t.slice(0, 8)) : null; if (opt.length && /旧/.test(opt[0] || '')) bad.push('「帧数」第一项还标着旧：' + opt[0]); }
  out.sel = ['endMode', 'coolMode'].filter(k => panelRows.some(([r, it]) => it.sel === k));
  if (out.sel.length) bad.push('面板上还有旧 / 新开关：' + out.sel);
  const e = sparkTailEnd(state.P); out.end = { dur: state.P.duration, spark: e };
  if (e > state.P.duration + 0.051) bad.push('菊模板的序列时长没盖住最后一批火花：' + JSON.stringify(out.end));
  // 冷却：空中类着色器按实际年龄（uCoolAbs = 1），不管存档里的 coolMode
  const pr = particleProgram40('spk'); out.coolAbs = !!pr.u.uCoolAbs;
  // 4.4.3 E6：火花闪烁频率在「火花 › 亮度」、跟着闪烁收在随机下面；闪烁 0 时不显示，> 0 显示；缺省 0
  const tw = () => { const x = panelRows.find(([r, it]) => Array.isArray(it) && it[0] === 'twinkleHz'); return x ? { at: x[0]._x.e + '›' + x[0]._x.m, rand: x[0]._randOf, vis: itemVisible(x[1], state.P) } : null; };
  out.twHz = { def: +state.P.twinkleHz, on: tw() }; const tw0 = state.P.twinkle; state.P.twinkle = 0; out.twHz.off = tw(); state.P.twinkle = tw0;
  if (out.twHz.def !== 0 || !out.twHz.on || out.twHz.on.at !== '火花›亮度' || out.twHz.on.rand !== 'sparkBright' || !out.twHz.on.vis || out.twHz.off.vis) bad.push('火花闪烁频率不对：' + JSON.stringify(out.twHz));
  selectEmitTab('星');
  return { ok: !bad.length, bad, out };
}"""


async def e1(pg):
    """5.0 第 2 步：一套物理（按实际年龄冷却、自然灭完，旧 / 新开关删了）、模板序列时长盖到火花灭完、缺省固定机位 + 匀速帧"""
    r = await pg.evaluate(E1_JS)
    return r['ok'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)


R5_JS = r"""async () => {
  // 4.4.5 RT5（用户 10-04 14:58 / 17:27 / 17:41 UE 反馈）：物理弹道、循环层长度跟尾迹、GPU 兼容、中火花进贴图、贴图亮度口径、GPU 粒子上限。缺省 = 旧做法
  const out = {}, bad = [];
  await openType('tailL'); await new Promise(r => setTimeout(r, 300));
  const P0 = derive(structuredClone(state.P));
  out.defaults = ['rtBall', 'rtLoopSize', 'rtGpuSafe', 'rtMTex', 'rtTexCal', 'rtGpuMax'].map(k => +P0[k]);
  // 4.5.8（用户 10-05 21:40 小修 4）：尾缀 S / M / L 模板缺省改 GPU 安全写法（rtGpuSafe 1），其余照旧
  if (out.defaults.some((v, i) => v !== (i === 2 ? 1 : 0))) bad.push('缺省不对（除 GPU 兼容 = 1 外应是旧做法）：' + out.defaults);
  const ES0 = rtBuildES(P0); if (ES0.emitters.some(e => e.gpu && e.accelCurve)) bad.push('缺省（GPU 安全写法）GPU 火花不该再写乱流 Acceleration');
  const ESo = rtBuildES({ ...P0, rtGpuSafe: 0 }); if (!ESo.emitters.some(e => e.gpu && e.accelCurve)) bad.push('旧做法（GPU 兼容 0）GPU 火花应该还有乱流 Acceleration');
  // 物理弹道
  const Q = { ...P0, rtBall: 1 }, b = rtBallistic(Q), sp = t => { const v = b.vel(t); return Math.hypot(v[0], v[2]); };
  out.phys = { v0: +b.v0.toFixed(1), T: +b.T.toFixed(2), H: +b.H.toFixed(1), want: Q.rtH, s1: +sp(1).toFixed(1), vb: +b.vb.toFixed(2) };
  if (!b.quad || Math.abs(b.H - Q.rtH) > 0.01 * Q.rtH || Math.abs(b.vb - Q.rtVb) > 0.05) bad.push('物理弹道没到设定的开花高度 / 速度：' + JSON.stringify(out.phys));
  if (!(sp(1) < 0.8 * b.v0)) bad.push('物理弹道第 1 秒减速不够（平方阻力应该前段减速猛）：' + JSON.stringify(out.phys));
  const lin = rtBallistic(P0); out.lin = { v0: +lin.v0.toFixed(1), s1: +Math.hypot(...[0, 2].map(i => lin.vel(1)[i])).toFixed(1) };
  if (Math.abs(rtDuration(Q) - (b.T + (rtDuration(P0) - P0.rtT))) > 0.02) bad.push('物理弹道的总时长没按算出来的升空时间');
  // 星头光晕按 Velocity Over Life 走，和弹道重合
  const ESq = rtBuildES(Q), hg = ESq.emitters.find(e => e.name === 'HeadGlow');
  if (hg) { const tab = esSpawn({ emitters: [hg] })[0], q = tab.list[0], pos = [0, 0, 0]; esPos(q, [0, 0, 0], b.T * 0.6, pos); const want = b.pos(b.T * 0.6);
    out.glow = [+pos[2].toFixed(1), +want[2].toFixed(1)]; if (Math.abs(pos[2] - want[2]) > 0.01 * Math.max(10, want[2])) bad.push('星头光晕没跟着物理弹道：' + out.glow);
    const j = esFwlEmitter(hg, false, 1).modules.map(m => m.m); if (!j.includes('VelocityOverLife') || j.includes('Drag')) bad.push('星头光晕导出模块不对：' + j); }
  // GPU 兼容 + 上限 + 中火花进贴图
  const Z = { ...Q, rtGpuSafe: 1, rtFTex: 1, rtMTex: 1, rtGpuMax: 800 }, ESz = rtBuildES(Z);
  out.gpu = ESz.gpuEst; out.emit = ESz.emitters.map(e => e.name);
  for (const e of ESz.emitters) { if (!e.gpu) continue; const m = esFwlEmitter(e, false, 1).modules; const nv = m.filter(x => x.m === 'InitialVelocity').length;
    if (m.some(x => x.m === 'Acceleration')) bad.push(e.name + ' GPU 还写了 Acceleration'); if (nv > 2) bad.push(e.name + ' 有 ' + nv + ' 个 Initial Velocity'); }
  if (ESz.emitters.some(e => e.name === 'SparksFine' || e.name === 'SparksMid')) bad.push('细 / 中火花全进贴图了，还有 GPU 发射器：' + out.emit);
  if (!(ESz.gpuEst.est <= 800)) bad.push('GPU 粒子估算超上限：' + JSON.stringify(ESz.gpuEst));
  const LI = rtLoopInfo(Z), CL = rtTexClasses(Z, LI); out.tex = CL.map(C => C.k);
  if (out.tex.join() !== 'F,M') bad.push('贴图火花档不对：' + out.tex);
  // H4 口径：新口径燃烧温度处 = 0.01 × 亮度，温度偏移只改曲线形状（几个百分点），不再整体 ×7.5；旧口径照旧
  const cal = (dT, c) => { const C = rtTexClasses({ ...Z, rtTexCal: c, rtTexI: 100, rtFdT: dT }, LI).find(c => c.k === 'F'); return Math.max(...C.lum.filter(([u]) => u > 0.3 && u < 0.7).map(k => k[1])); };
  out.cal = [+cal(0, 1).toFixed(3), +cal(-400, 1).toFixed(3), +cal(-400, 0).toFixed(3)];
  if (out.cal[1] / out.cal[0] > 1.25 || out.cal[0] / out.cal[1] > 1.25 || out.cal[0] > 2) bad.push('新口径下温度偏移还在改贴图火花亮度：' + out.cal);
  if (!(out.cal[2] > 5 * out.cal[1])) bad.push('旧口径（缺省）变了：' + out.cal);
  // 循环层长度：起步很短、不伸到发射点以下，长满后不低于最短
  const sk = rtLoopSizeKeys({ ...Q, rtLoopMin: 0.15 }, b, b.v0, 300, 290); out.sk = [sk[0][1], Math.max(...sk.map(k => k[1])), sk[sk.length - 1][1]];
  if (!(sk[0][1] < 0.05) || !(out.sk[1] <= 1) || !(sk[sk.length - 1][1] >= 0.149)) bad.push('循环层长度曲线不对：' + out.sk);
  for (const [u, v] of sk) { const z = Math.hypot(...[0, 2].map(i => b.pos(u * b.T)[i] - b.pos(0)[i])); if (v * 290 > z + 3 * (+Q.rtHeadSize || 0.5) + 0.5) { bad.push(`循环层第 ${(u * b.T).toFixed(2)} s 伸到发射点以下：${(v * 290).toFixed(0)} m > ${z.toFixed(0)} m`); break; } }
  // 面板：选物理后升空时间藏起来、终端速度和结果行出来
  const row = panelRows.find(([r, it]) => it.sel === 'rtBall'); if (!row) bad.push('面板没有「弹道」选项'); else {
    out.where = row[0]._x.e + '›' + row[0]._x.m; if (out.where !== '星头›弹道') bad.push('「弹道」不在星头 › 弹道：' + out.where);
    const s = row[0].querySelector('select'); s.value = '1'; s.dispatchEvent(new Event('change')); await new Promise(r => setTimeout(r, 200));
    const vis = k => { const x = panelRows.find(([r, it]) => Array.isArray(it) && it[0] === k); return x ? itemVisible(x[1], state.P) : null; };
    out.panel = { rtT: vis('rtT'), rtVt: vis('rtVt'), info: ((document.querySelector('#params [data-info=ballInfo]') || {}).textContent || '').slice(0, 40), dur: state.P.duration };
    if (out.panel.rtT !== false || out.panel.rtVt !== true || !/物理弹道/.test(out.panel.info)) bad.push('选物理弹道后面板不对：' + JSON.stringify(out.panel));
    s.value = '0'; s.dispatchEvent(new Event('change')); }
  selectEmitTab('星');
  return { ok: !bad.length, bad, out };
}"""


async def r5(pg):
    """4.4.5 RT5：升空尾缀的物理弹道、循环层长度、GPU 兼容、中火花进贴图、贴图亮度口径（H4）、GPU 粒子上限都在，缺省 = 旧做法"""
    r = await pg.evaluate(R5_JS)
    return r['ok'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)


R6_JS = r"""async () => {
  // 4.5.1 RT6（用户 10-05 01:28「合并渲染再加 800 个 cascade 粒子」、14:35「近段 RT4 主体循环 + 远段一次性大量粒子序列 + ≤ 800 GPU」）
  const out = {}, bad = [];
  const e = entryById('RT6L') || entryById('RT5L'), d = defaultsFor(e.base), P5 = derive({ ...d.P, ...e.p, rtFar: 0, rtGpuDisp: 0, rtGpuGain: 1, rtNearExpo: 1 });     // 左栏只放当前版本：有 RT6 用 RT6 的参数（关掉近段 + 远段 = RT5 的做法）
  // 缺省（rtFar 0）= RT5：贴图只有细 / 中、没有近段权重、没有闪烁层
  out.def = { far: +P5.rtFar, tex: rtTexClasses(P5, rtLoopInfo(P5)).map(C => C.k).join(), nw: rtNearW(P5) === null, em: rtBuildES(P5).emitters.map(x => x.name) };
  if (out.def.far !== 0 || out.def.tex !== 'F,M' || !out.def.nw || out.def.em.includes('SparksTwinkle')) bad.push('缺省不是 RT5 的做法：' + JSON.stringify(out.def));
  // 近段 + 远段：贴图有粗火花；GPU 三档 = 预算；贴图 + GPU = 出生率（一颗不多一颗不少）
  const chk = (Z, tag) => {
    const LI = rtLoopInfo(Z), CL = rtTexClasses(Z, LI), ES = rtBuildES(Z), sp = rtGpuSplit(Z), o = { tex: CL.map(C => C.k).join(), est: ES.gpuEst.est, f: +sp.f.toFixed(3), cls: {} };
    for (const [k, nm] of [['F', 'SparksFine'], ['M', 'SparksTwinkle'], ['C', 'SparksCoarse']]) {
      const R = +Z['rt' + k + 'Rate'], C = CL.find(c => c.k === k), em = ES.emitters.find(x => x.name === nm), L = +Z['rt' + k + 'Life'];
      const g = em ? em.spawn[0][1] : 0,     /* 4.5.4 近段 + 远段时 GPU 出生率是常数（不跟脉动） */ tx = C ? C.rate : 0, alive = g * sp.pk * L;
      o.cls[k] = { R, tex: +tx.toFixed(1), gpu: +g.toFixed(1), alive: Math.round(alive), budget: +Z['rtGpu' + k] };
      if (Math.abs(tx + g - R) > Math.max(1.5 / LI.Tl, 0.005 * R)) bad.push(`${tag} ${k} 档贴图 + GPU ≠ 出生率：${tx.toFixed(1)} + ${g.toFixed(1)} ≠ ${R}`);
      if (sp.f >= 1 && Math.abs(alive - Math.min(+Z['rtGpu' + k], R * sp.pk * L)) > 0.03 * Math.max(10, +Z['rtGpu' + k])) bad.push(`${tag} ${k} 档 GPU 同时活着 ${alive.toFixed(0)} ≠ 预算 ${Z['rtGpu' + k]}`);
    }
    if (o.tex !== 'F,M,C') bad.push(tag + ' 贴图火花档应该是细 / 中 / 粗：' + o.tex);
    if (+Z.rtGpuMax > 0 && !(ES.gpuEst.est <= +Z.rtGpuMax * 1.001)) bad.push(tag + ' GPU 估算超上限：' + JSON.stringify(ES.gpuEst));
    return o;
  };
  const Z = { ...P5, rtFar: 1 };
  out.far = chk(Z, '近段 + 远段');
  out.cap = chk({ ...Z, rtGpuMax: 400 }, '上限 400');
  if (!(out.cap.f < 1)) bad.push('上限 400 时 GPU 应该一起降：' + out.cap.f);
  // 交接权重：近段 + 远段 = 1，交接前全在近段、交接完全在远段
  const nw = rtNearW(Z), [a0, a1] = rtNearA(Z); out.w = [0, a0, (a0 + a1) / 2, a1, 3].map(a => +nw(a).toFixed(3));
  if (out.w[0] !== 1 || out.w[1] !== 1 || Math.abs(out.w[2] - 0.5) > 0.01 || out.w[3] !== 0 || out.w[4] !== 0) bad.push('近段权重不对：' + out.w);
  // 闪烁层：Color Over Life 中段一亮一暗；远看直径：尺寸放大、光量（中心亮度 × 尺寸²）不变
  const ESz = rtBuildES(Z), tw = ESz.emitters.find(x => x.name === 'SparksTwinkle');
  if (!tw) bad.push('没有闪烁层 SparksTwinkle'); else { const lum = tw.col.filter(([u]) => u > 0.2 && u < 0.75).map(([, c]) => rtLum(c)); let alt = 0; for (let i = 2; i < lum.length; i++) if ((lum[i] - lum[i - 1]) * (lum[i - 1] - lum[i - 2]) < 0) alt++; out.twAlt = alt; if (alt < 2) bad.push('闪烁层没有一亮一暗：' + lum.map(x => x.toFixed(2))); }
  const ESd = rtBuildES({ ...Z, rtGpuDisp: 2 }), c0 = ESz.emitters.find(x => x.name === 'SparksCoarse'), c1 = ESd.emitters.find(x => x.name === 'SparksCoarse');
  const lt = x => Math.max(...x.col.map(([u, c]) => rtLum(c) * (x.stretchLife ? esCurve(x.stretchLife, u) : 1))) * ((x.size[0] + x.size[1]) / 2) ** 2;     // 光量 = 中心亮度 × 宽 × 高（拉长的 Y 再 × 拉长倍数）
  out.disp = { size: [c0.size, c1.size].map(s => +((s[0] + s[1]) / 2).toFixed(2)), light: [+lt(c0).toFixed(4), +lt(c1).toFixed(4)] };
  if (Math.abs(out.disp.size[1] - 2) > 0.01 || Math.abs(out.disp.light[1] / out.disp.light[0] - 1) > 0.02) bad.push('远看直径不对（尺寸 = 2 m、光量不变）：' + JSON.stringify(out.disp));
  // 导出：有远段时 cascade.json 多 TrailFar（速度朝向竖直面片、帧号曲线、立在发射点上）、命名多一张 Far
  const ball = rtBallistic(Z), LIz = rtLoopInfo(Z), F = 64, keys = [...Array(F).keys()].map(f => [+(f / F).toFixed(4), f]).concat([[1, F - 0.01]]);
  const fa = { t0: 0.8, Dtot: ball.T + 3, Df: 3.8, Fr: 48, Fd: 16, cols: 16, rows: 1, F, cx: 1, cz: 200, vz: 0.5, HX: 15, HY: 215, Ww: 30, Wh: 430, keys };
  const Lf = layoutOf({ ...Z, cols: 16, rows: 1, chans: 4 }), meta = { L: Lf, far: fa };
  const lay = { L: layoutOf(Z), T: ball.T, Tl: LIz.Tl, nRev: LIz.nRev, Ww: 10, Wh: 100, hb: 0.9, sizeKeysRise: [[0, 0.1], [1, 0.2]], grow: true, fadeSeconds: 1, fadeFps: 20, ball: { ...ball, pos: undefined, vel: undefined }, nearA: [a0, a1], gpuSplit: rtGpuSplit(Z), nearExpo: 0.8 };
  const b = { form: 'emitset', P: Z, es: ESz, meta: lay, fades: [], far: { meta, P: { ...Z, cols: 16, rows: 1, chans: 4 } } };     // 近段 + 远段：开花后归远段，没有消散层
  const j = fwlEmitSet('T', b, defaultsFor('tailL').M, false), tf = j.emitters.find(x => x.name === 'TrailFar'), rl = j.emitters.find(x => x.name === 'RiseLoop');
  const j1 = fwlEmitSet('T', { ...b, meta: { ...lay, nearExpo: 1 } }, defaultsFor('tailL').M, false), rl1 = j1.emitters.find(x => x.name === 'RiseLoop');
  const cl = x => x.modules.find(q => q.m === 'ColorOverLife').ColorOverLife.curve[0][1][0];
  out.exp = { em: j.emitters.map(x => x.name).slice(0, 4), tex: Object.keys(j.textures), sheets: namingSheets(b).map(x => x[0]), nearComp: +(cl(rl) / cl(rl1)).toFixed(3) };
  if (j.emitters.some(x => x.name === 'RiseFade') || j.textures.fade) bad.push('近段 + 远段时不该有 RiseFade：' + out.exp.em);
  if (Math.abs(out.exp.nearComp - 1 / 0.64) > 0.01) bad.push('近段贴图曝光 0.8 时 RiseLoop 的 Color Over Life 应该 × 1 / 0.64：' + out.exp.nearComp);
  if (!tf) bad.push('cascade.json 没有 TrailFar'); else {
    const mods = Object.fromEntries(tf.modules.map(x => [x.m, x])); out.exp.far = { align: tf.required.screen_alignment, delay: tf.required.delay_s, life: mods.Lifetime.Lifetime.const, size: mods.InitialSize.StartSize.const, loc: mods.InitialLocation.StartLocation.const, vel: mods.InitialVelocity.StartVelocity.const, keys: mods.DynamicParameter.params.frame.curve.length };
    if (out.exp.far.vel[2] !== 50) bad.push('TrailFar 向上初速应该 = 远段上移速度 0.5 m/s = 50 cm/s（UE 里 1 cm/s 定不住朝向）：' + out.exp.far.vel);
    if (tf.required.screen_alignment !== 'Velocity' || Math.abs(tf.required.delay_s - 0.8) > 1e-6 || mods.InitialSize.StartSize.const[1] !== 43000 || mods.InitialLocation.StartLocation.const[2] !== 20000 || mods.DynamicParameter.params.frame.curve.length !== F + 1 || j.textures[j.materials[tf.material].textures.main].file.indexOf('_Far') < 0)
      bad.push('TrailFar 导出不对：' + JSON.stringify(out.exp.far)); }
  if (out.exp.sheets.join() !== 'Loop,Far') bad.push('命名应该是循环层 + 远段：' + out.exp.sheets);
  // 4.5.4 曲线点数（用户 10-05 19:31「没变化就 2 个点，有变化的加几个变化的点」）：GPU / 软圆点发射器出生率 2 个点、出生位置 / 初速十几个点、星头光晕颜色几个点；远段帧号曲线几个拐点
  out.keys = Object.fromEntries(j.emitters.filter(x => x.material === 'dot').map(x => [x.name, [x.spawn.rate.curve ? x.spawn.rate.curve.length : 0, ...['InitialLocation', 'InitialVelocity', 'ColorOverLife'].map(m => { const q = x.modules.find(y => y.m === m); const v = q && (q.StartLocation || q.StartVelocity || q.ColorOverLife); return v && v.curve ? v.curve.length : 0; })]]));
  for (const [nm, [sp, lo, ve, co]] of Object.entries(out.keys)) if (sp > 2 || lo > 40 || ve > 40 || co > 16) bad.push(`${nm} 曲线点太多（出生率 / 位置 / 初速 / 颜色）：${[sp, lo, ve, co]}`);
  { const ball2 = rtBallistic(Z), fa2 = rtLayoutFar(Z, ball2, rtLoopInfo(Z)); out.farKeys = fa2.keys.length; out.farFade = +(fa2.Fd / fa2.Df).toFixed(2);
    if (fa2.keys.length > 12) bad.push('远段帧号曲线点太多：' + fa2.keys.length);
    if (fa2.Fd / fa2.Df < 7.5 - 1e-6 && fa2.Fd < fa2.F / 2) bad.push('远段开花后帧率低于 7.5 fps：' + out.farFade);
    let okF = true; for (let f = 0; f < fa2.F; f++) { const u = ((fa2.times[f] - fa2.dur[f] / 2) + fa2.dur[f] * 0.5) / fa2.Dtot; if (Math.floor(evalKeys(fa2.keys, u) + 1e-6) !== f) { okF = false; out.farBad = [f, u, evalKeys(fa2.keys, u)]; break; } }
    if (!okF) bad.push('远段帧号曲线和每帧烘焙时刻对不上：' + out.farBad); }
  // 面板：「贴图怎么分」在火花共用 › 贴图；选近段 + 远段后旧的「烘进贴图的比例」藏起来、交接年龄 / GPU 颗数出来
  await openType('tailL'); await new Promise(r => setTimeout(r, 300));
  const row = panelRows.find(([r, it]) => it.sel === 'rtFar'); if (!row) bad.push('面板没有「贴图怎么分」'); else {
    out.where = row[0]._x.e + '›' + row[0]._x.m; if (out.where !== '火花共用›贴图') bad.push('「贴图怎么分」不在火花共用 › 贴图：' + out.where);
    const vis = k => { const x = panelRows.find(([r, it]) => Array.isArray(it) && it[0] === k); return x ? itemVisible(x[1], state.P) : null; };
    const s = row[0].querySelector('select'); s.value = '1'; s.dispatchEvent(new Event('change')); await new Promise(r => setTimeout(r, 200));
    out.panel = { rtFTex: vis('rtFTex'), rtNearA0: vis('rtNearA0'), rtGpuC: vis('rtGpuC'), rtGpuDisp: vis('rtGpuDisp') };
    if (out.panel.rtFTex !== false || out.panel.rtNearA0 !== true || out.panel.rtGpuC !== true || out.panel.rtGpuDisp !== true) bad.push('选近段 + 远段后面板不对：' + JSON.stringify(out.panel));
    s.value = '0'; s.dispatchEvent(new Event('change')); }
  // 4.5.2 分层看（用户 10-05 17:39「没法单独看近段、远段和 GPU 粒子层」）：工具条一排近段 / 远段 / 每个 GPU 层 + 颗数；关掉远段 → 远段 0 颗、HUD 写着；「全部」恢复
  Object.assign(state.P, { rtFar: 1 }); state.gen++; const v0 = state.view, t0 = state.t; state.view = 'live'; state.t = 3; ensureTargets();
  try {
    renderEmitLive(); const bar = document.querySelector('#rtLayerBar'), keys = [...bar.querySelectorAll('[data-k]')].map(x => x.dataset.k), n0 = hudText;
    bar.querySelector('[data-k="far"]').click(); renderEmitLive(); const n1 = hudText, offCls = bar.querySelector('[data-k="far"]').classList.contains('off');
    bar.querySelector('[data-k="far"]').dispatchEvent(new MouseEvent('dblclick')); renderEmitLive(); const n2 = hudText;
    bar.querySelector('[data-all]').click(); renderEmitLive(); const n3 = hudText;
    out.layers = { keys, off: offCls, hud: [n0, n1, n2, n3].map(h => (h.match(/近段 [\d,]+ \+ 远段 [\d,]+/) || [''])[0]) };
    const num = (h, w) => +((h.match(new RegExp(w + ' ([\\d,]+)')) || [0, '-1'])[1].replace(/,/g, ''));
    if (!['near', 'far', 'SparksCoarse', 'SparksTwinkle', 'SparksFine'].every(k => keys.includes(k))) bad.push('分层看没有近段 / 远段 / GPU 层：' + keys);
    if (!(num(n0, '远段') > 0) || num(n1, '远段') !== 0 || !offCls || !/分层看/.test(n1)) bad.push('关掉远段不对：' + JSON.stringify(out.layers));
    if (num(n2, '近段') !== 0 || !(num(n2, '远段') > 0)) bad.push('双击远段应该只看远段：' + JSON.stringify(out.layers));
    if (/分层看/.test(n3) || !(num(n3, '近段') > 0)) bad.push('「全部」没恢复：' + JSON.stringify(out.layers));
  } finally { state.P.rtFar = 0; state.gen++; state.view = v0; state.t = t0; rtShow.off.clear(); }
  selectEmitTab('星');
  return { ok: !bad.length, bad, out };
}"""


async def r6(pg):
    """4.5.1 RT6：近段 + 远段（rtFar）缺省关 = RT5；开了：粗 / 中 / 细都进贴图、GPU 按档预算（含上限一起降）、贴图 + GPU = 出生率；交接权重相加 = 1；
    闪烁层带闪烁；远看直径光量不变；cascade.json 多 TrailFar、命名多 Far；面板「贴图怎么分」"""
    r = await pg.evaluate(R6_JS)
    return r['ok'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)


async def w1(pg):
    """4.5.0 工作台快改（用户 10-05 01:28 / 02:25）：时间轴没有发射器行和曲线、精简布局收起层轨道；AI 效果调了保存 = 存成我的效果（派生）、能加层；
    单层存模板 → 花型库「我的模板」、能打开；删除不弹框、8 秒内能撤销；AI 效果能从左栏隐藏；只还原一个发射器 / 回到模板默认；时长跟随 / 同一时刻粘连两个开关"""
    bad, info = [], {}
    await pg.evaluate("window.askSaveName = async (t, n, init) => '检查 · ' + init; 0")       # 起名对话框：直接用默认名
    # 1 时间轴、精简布局
    await open_effect(pg, 'hiki_nishiki'); await idle(pg)
    r = await pg.evaluate("(() => { stage2.tlSig = ''; buildTlBars(); return { tle: document.querySelectorAll('#tlBars .tle, #tlBars .tle-box').length, curves: !!document.querySelector('#tlCurves'), rows: document.querySelectorAll('#tlBars .tlb').length, opts: [...document.querySelectorAll('#tlBars [data-tlopt]')].map(c => c.dataset.tlopt) }; })()")
    info['时间轴'] = r
    if r['tle'] or r['curves']: bad.append(f'时间轴还有发射器行 / 曲线：{r}')
    if r['rows'] != 2: bad.append(f"引菊 → 锦应该两条层轨道：{r['rows']}")
    if r['opts'] != ['follow', 'glue']: bad.append(f"时间轴下面没有「时长跟着走 / 同一时刻一起动」两个开关：{r['opts']}")
    r = await pg.evaluate("(() => { const p0 = { ...panels }; setPanels({ side: false, right: false }); const hid = getComputedStyle($('#tlBars')).display === 'none'; setPanels(p0); const back = getComputedStyle($('#tlBars')).display !== 'none'; return { hid, back }; })()")
    info['精简布局'] = r
    if not r['hid'] or not r['back']: bad.append(f'精简布局没收起 / 恢复层轨道：{r}')
    # 2 开关：时长跟随 / 粘连
    r = await pg.evaluate("""(async () => { selectComboLayer(0); const P = state.P, P2 = layerEntryOf(state.layers[1]).P, d0 = P.duration, i0 = P2.ignDelay, s0 = P.sparkStop;
      state.followOff = false; state.glueOff = false; setTimingParam('sparkStop', +(s0 + 0.2).toFixed(2)); const on = { dur: P.duration, ign2: P2.ignDelay };
      setTimingParam('sparkStop', s0); const back = { dur: P.duration, ign2: P2.ignDelay };
      state.followOff = true; state.glueOff = true; setTimingParam('sparkStop', +(s0 + 0.2).toFixed(2)); const off = { dur: P.duration, ign2: P2.ignDelay };
      setTimingParam('sparkStop', s0); state.followOff = false; state.glueOff = false;
      return { d0, i0, s0, on, back, off }; })()""")
    info['开关'] = r
    if abs(r['on']['ign2'] - (r['i0'] + 0.2)) > 0.011 or not (r['on']['dur'] > r['d0']): bad.append(f'开着跟随 / 粘连时，改引线火花停锦层点火 / 时长没跟着动：{r}')
    if abs(r['off']['dur'] - r['back']['dur']) > 1e-6 or abs(r['off']['ign2'] - r['back']['ign2']) > 1e-6: bad.append(f'关掉跟随 / 粘连后，改火花停还是带着时长或锦层点火动了：{r}')
    await idle(pg)
    # 3 派生成我的效果 + 加层
    r = await pg.evaluate("""(async () => { selectComboLayer(1); state.P.sparkLife = +(state.P.sparkLife + 0.3).toFixed(2); onParam(); const n0 = state.layers.length;
      const rec = await wbDeriveMine(); if (!rec) return null; const my = !!lib.my, n1 = state.layers.length, sl = layerEntryOf(state.layers[1]).P.sparkLife;
      await myAddLayerFrom('botan'); return { my, from: lib.my && lib.my.from && lib.my.from.name, n0, n1, n2: state.layers.length, sl, id: rec.id, links: (lib.my.links || []).length }; })()""")
    await idle(pg)
    info['派生'] = r
    if not r or not r['my'] or r['n1'] != r['n0'] or r['n2'] != r['n0'] + 1: bad.append(f'保存 AI 效果没变成我的效果 / 加不了层：{r}')
    elif not r['from'] or r['links'] < 1: bad.append(f'派生出来的效果没记来源 / 同一批星：{r}')
    # 4 存模板 → 花型库 → 打开
    t = await pg.evaluate("""(async () => { selectComboLayer(0); await saveLayerAsTemplate(); const ts = Object.values(tplAll()); const t = ts[ts.length - 1];
      pk.mode = 'open'; const items = pkItems().filter(i => i.cat === 'mytpl').map(i => i.key); openTemplate(t.id);
      return { n: ts.length, id: t.id, type: t.type, inPicker: items.includes('tpl:' + t.id), tpl: !!lib.tpl, key: lib.key, stars: state.P.stars, want: t.P.stars, del: $('#abDel').hidden ? '' : $('#abDel').title }; })()""")
    await idle(pg)
    info['模板'] = t
    if not t['inPicker'] or not t['tpl'] or t['stars'] != t['want']: bad.append(f'存的模板没出现在花型库 / 打不开：{t}')
    # 5 删除能撤销（模板、我的效果）
    r = await pg.evaluate(f"""(async () => {{ removeTemplate('{t['id']}'); const gone = !tplAll()['{t['id']}']; document.querySelector('#undoToast button').click(); const back = !!tplAll()['{t['id']}'];
      removeMyFx('{r['id'] if r else ''}'); const g2 = !myAll()['{r['id'] if r else ''}']; document.querySelector('#undoToast button').click(); await new Promise(z => setTimeout(z, 50)); const b2 = !!myAll()['{r['id'] if r else ''}'];
      return {{ gone, back, g2, b2 }}; }})()""")
    info['删除撤销'] = r
    if not all(r.values()): bad.append(f'删除 / 撤销不对：{r}')
    # 6 还原：只还原一个发射器、回到模板默认
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate("""(() => { const d = defaultsFor('kiku').P; state.P.sparkLife = +(state.P.sparkLife + 0.5).toFixed(2); state.P.v0 = +(state.P.v0 + 20).toFixed(1); onParam(); refreshVisibility();
      resetScope('火花'); const a = { sl: state.P.sparkLife, v0: state.P.v0 }; resetToDefaults(); return { a, b: { v0: state.P.v0 }, d: { sl: d.sparkLife, v0: d.v0 } }; })()""")
    info['还原'] = r
    if abs(r['a']['sl'] - r['d']['sl']) > 1e-6 or abs(r['a']['v0'] - r['d']['v0']) < 1: bad.append(f'只还原「火花」不对（火花寿命该回去、初速不该动）：{r}')
    if abs(r['b']['v0'] - r['d']['v0']) > 1e-6: bad.append(f'回到模板默认后初速没回去：{r}')
    # 7 AI 效果从左栏隐藏、撤销
    await open_effect(pg, 'jinmangju'); await idle(pg)
    r = await pg.evaluate("""(() => { hideCurrentEffect(); const hid = !document.querySelector('#libBody .li[data-key="ef:jinmangju"]'); document.querySelector('#undoToast button').click(); const back = !!document.querySelector('#libBody .li[data-key="ef:jinmangju"]'); return { hid, back }; })()""")
    info['隐藏'] = r
    if not r['hid'] or not r['back']: bad.append(f'从左栏隐藏 / 撤销不对：{r}')
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)


async def w2(pg):
    """4.5.3（用户 10-05 18:02）：左栏没有「我的版本」「已通过」组，通过的效果在「我的效果」最上面；我的效果每项没有「删除」（删除在资产栏 ⋯）；
    设了出点时「火花灭完」写明出点在哪、能一键清除；自动烘焙关、改了序列时长还没烘时，时间轴按新的时长画（不停在旧贴图的长度）；远段面片上移时贴图内容补回（引擎回放位置 = 世界位置）"""
    bad, info = [], {}
    r = await pg.evaluate("""(() => { renderLib(); const g = [...document.querySelectorAll('#libBody details.lg')].map(d => d.className.replace('lg lg-', ''));
      const my = document.querySelector('#libBody details.lg-myfx'), passed = FW_EFFECTS.filter(ef => ef.阶段 === '已通过' || ef.已通过版).map(ef => 'ef:' + ef.key);
      const keys = my ? [...my.querySelectorAll('.li')].map(x => x.dataset.key) : [];
      return { groups: g, passed, inMy: passed.filter(k => keys.includes(k)).length, first: keys.slice(0, passed.length), del: my ? [...my.querySelectorAll('.li .li-act button')].filter(b => b.textContent === '删除').length : -1 }; })()""")
    info['左栏'] = r
    if 'mine' in r['groups'] or 'passed' in r['groups']: bad.append(f"左栏还有「我的版本」/「已通过」组：{r['groups']}")
    if r['inMy'] != len(r['passed']) or sorted(r['first']) != sorted(r['passed']): bad.append(f'通过的效果没排在「我的效果」最上面：{r}')
    if r['del']: bad.append(f"我的效果里每项还有「删除」：{r['del']}")
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('crackle')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate("""(async () => { const P = state.P; P.cutOut = 2.83; P.duration = 9; onParam(); refreshVisibility(); await new Promise(z => setTimeout(z, 100));
      const box = document.querySelector('#params [data-info=endInfo]'), txt = box ? box.textContent : '', btn = box && box.querySelector('[data-cutclear]');
      if (btn) btn.click(); await new Promise(z => setTimeout(z, 100)); return { txt: txt.slice(0, 90), btn: !!btn, after: state.P.cutOut }; })()""")
    info['出点'] = r
    if not r['btn'] or '出点在 2.83' not in r['txt'] or r['after'] != 0: bad.append(f'设了出点时没说清楚 / 清除不了：{r}')
    await idle(pg)
    r = await pg.evaluate("""(() => { setAutoBake(false); const b0 = state.bake ? bakeTotal(state.bake) : null; state.P.duration = 7; onParam();
      const x = curLayerBakes()[0], sp = layerSpans(x); setAutoBake(true); return { bake: b0, end: sp && sp.end }; })()""")
    info['时间轴'] = r
    if not r['end'] or abs(r['end'] - 7) > 1e-6: bad.append(f'改了序列时长、还没烘时，时间轴没按新的时长画：{r}')
    await idle(pg)
    r = await pg.evaluate("""(() => { const ball = { T: 5 }, fa = { t0: 0.8, Dtot: 10, F: 64, keys: [[0, 0], [1, 63.99]], cx: 0, cz: 100, vz: 0.5, Ww: 20, Wh: 400 };
      const s = rtFarStateAt({ far: { meta: { far: fa } } }, 4.8); return { z: s && s.z }; })()""")
    info['远段上移'] = r
    if not r['z'] or abs(r['z'] - (100 + 0.5 * 4)) > 1e-6: bad.append(f'引擎回放里远段面片没按上移速度走：{r}')
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)


async def w3(pg):
    """4.5.8：那 9 处 bug（协作/筛查/汇总_要你定的.md §6）+ 5 条小修（协作/5.0_需求梳理.md §6.7）。每项先在 4.5.7 上失败，再修到通过"""
    bad, info = [], {}
    cur = ["?"]
    async def ev(js):
        try: return await pg.evaluate(js)
        except Exception as e: raise RuntimeError(f"{cur[0]}：{str(e)[:300]}")
    await pg.evaluate("window.askSaveName = async (t, n, init) => '检查 · ' + init; window.__confirms = 0; window.confirm = () => { window.__confirms++; return true; }; window.__flashes = []; const _f = flash; flash = (m, e) => { window.__flashes.push([String(m), !!e]); return _f(m, e); }; 0")
    clicks = "(async () => { for (const b of [...document.querySelectorAll('#undoToast button')]) { b.click(); await new Promise(z => setTimeout(z, 80)); } return 0; })()"
    cur[0] = '20-01'
    # 20-01 删当前打开的我的效果：撤销后版本也回来
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(myCreate('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await ev("""(async () => { const id = lib.my.id, key = 'my:' + id; const all = wbAll(); all[key] = [{ id: 'v1', name: '检查版本 1', at: wbNow(), snap: wbSnap() }, { id: 'draft', name: '草稿', draft: true, at: wbNow(), snap: wbSnap() }]; store.set('mySaves', all);
      removeMyFx(id); const gone = !myAll()[id], n0 = (wbAll()[key] || []).length; return { id, key, gone, n0 }; })()""")
    await idle(pg); await pg.evaluate(clicks); await idle(pg)
    r2 = await ev(f"(() => ({{ back: !!myAll()['{r['id']}'], n1: (wbAll()['{r['key']}'] || []).length, open: lib.key }}))()")
    info['20-01'] = {**r, **r2}
    if not r2['back'] or r2['n1'] != 2: bad.append(f'20-01 删当前我的效果后撤销，版本没一起回来：{info["20-01"]}')
    cur[0] = '20-02'
    # 20-02 连删两个模板，两个都能撤销
    r = await ev("""(async () => { const a = { id: 'tA' + Date.now().toString(36), name: '检查模板 A', type: 'kiku', P: structuredClone(defaultsFor('kiku').P), M: structuredClone(defaultsFor('kiku').M), at: wbNow() };
      const b = { ...structuredClone(a), id: a.id + 'b', name: '检查模板 B' }; tplPut(a); tplPut(b); removeTemplate(a.id); removeTemplate(b.id);
      const gone = !tplAll()[a.id] && !tplAll()[b.id], btns = document.querySelectorAll('#undoToast button').length; return { a: a.id, b: b.id, gone, btns }; })()""")
    await pg.evaluate(clicks)
    r2 = await ev(f"(() => ({{ a: !!tplAll()['{r['a']}'], b: !!tplAll()['{r['b']}'] }}))()")
    info['20-02'] = {**r, **r2}
    if not (r['gone'] and r2['a'] and r2['b']): bad.append(f'20-02 连删两个模板，没有两个都能撤销：{info["20-02"]}')
    cur[0] = '20-04'
    # 20-04 删当前打开的模板：顶栏不再是「更新模板」
    r = await ev(f"""(async () => {{ openTemplate('{r['a']}'); await new Promise(z => setTimeout(z, 300)); const before = !$('#abUpdTpl').hidden; removeTemplate('{r['a']}'); await new Promise(z => setTimeout(z, 300));
      return {{ before, tpl: !!lib.tpl, upd: !$('#abUpdTpl').hidden, key: lib.key }}; }})()""")
    await idle(pg)
    info['20-04'] = r
    if r['tpl'] or r['upd']: bad.append(f'20-04 删了当前模板，顶栏还认它 / 还显示「更新模板」：{r}')
    cur[0] = '20-03'
    # 20-03 删层进 Ctrl+Z、不弹确认框
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(myCreate('kiku')).then(() => myAddLayerFrom('botan')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    await pg.wait_for_timeout(900)
    r = await ev("""(async () => { selectComboLayer(1); state.P.stars = 77; onParam(); await new Promise(z => setTimeout(z, 900)); const c0 = window.__confirms, n0 = state.layers.length;
      myDelLayer(1); await new Promise(z => setTimeout(z, 900)); const n1 = state.layers.length; await undoStep(-1); await new Promise(z => setTimeout(z, 300));
      const n2 = state.layers.length, st = n2 > 1 ? layerEntryOf(state.layers[1]).P.stars : null; return { n0, n1, n2, st, confirms: window.__confirms - c0 }; })()""")
    await idle(pg)
    info['20-03'] = r
    if r['confirms'] or r['n1'] != r['n0'] - 1 or r['n2'] != r['n0'] or r['st'] != 77: bad.append(f'20-03 删层没进 Ctrl+Z（或还弹确认框）：{r}')
    cur[0] = '19-C03'
    # 19-C03 关自动烘焙：同一批星的层马上同步（不等源层烘完）
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(myCreate('kiku')).then(() => myAddLayerFrom('kiku')).then(() => { mySetLinked(0, 1, true); return mySave(false); }).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    await pg.wait_for_timeout(900)
    r = await ev("""(async () => { setAutoBake(false); selectComboLayer(0); state.P.v0 = +(state.P.v0 + 13).toFixed(1); onParam();
      const a = state.P.v0, b = layerEntryOf(state.layers[1]).P.v0; setAutoBake(true); return { a, b }; })()""")
    await idle(pg)
    info['19-C03'] = r
    if abs(r['a'] - r['b']) > 1e-9: bad.append(f'19-C03 关自动烘焙时同一批星的层没马上同步：{r}')
    cur[0] = '19-C04'
    # 19-C04 内置效果里「暂时不联动」不带进我的效果
    r = await ev("""(async () => { const id = lib.my.id; state.linkOff = true; await openMyEffect(id); await new Promise(z => setTimeout(z, 600));
      selectComboLayer(0); state.P.v0 = +(state.P.v0 + 7).toFixed(1); onParam(); await new Promise(z => setTimeout(z, 200));
      return { off: !!state.linkOff, a: state.P.v0, b: layerEntryOf(state.layers[1]).P.v0 }; })()""")
    await idle(pg)
    info['19-C04'] = r
    if abs(r['a'] - r['b']) > 1e-9: bad.append(f'19-C04 内置效果关了联动，打开我的效果后勾着的同一批星不联动：{r}')
    cur[0] = '19-C01'
    # 19-C01 某层按新参数烘焙失败：导出要拦住，不拿旧贴图
    r = await ev("""(async () => { const ob = bake; bake = async (P, ...a) => { if (P.stars === 66) throw new Error('检查：故意烘焙失败'); return ob(P, ...a); };
      selectComboLayer(1); state.P.stars = 66; onParam(); await new Promise(z => setTimeout(z, 1500)); let err = '';
      try { await comboLayerBakes(state.layers); } catch (e) { err = e.message || String(e); } bake = ob; state.P.stars = 77; onParam(); return { err }; })()""")
    await idle(pg)
    info['19-C01'] = r
    if not r['err']: bad.append(f'19-C01 有一层新参数烘焙失败，导出没拦住（会拿旧贴图）：{r}')
    cur[0] = '19-C05'
    # 19-C05 组合说明按最终贴图写（导出过程中贴图变了，说明跟着变）
    r = await ev("""(async () => { const oz = makeZip, od = download, oc = comboPackFiles; let got = null;
      comboPackFiles = async (name, layers) => { for (const L of layers) { const e = layerEntryOf(L); e.bake.meta.Ww = 12.34; } return []; };
      makeZip = async files => { got = files; return new Blob([]); }; download = () => 0;
      try { await exportCombo(); } finally { makeZip = oz; download = od; comboPackFiles = oc; }
      const f = got && got.find(([n]) => n.endsWith('_组合说明.json')); if (!f) return { json: null };
      const j = JSON.parse(new TextDecoder().decode(f[1])); return { cm: j.layers.map(l => l.spriteSizeCm && l.spriteSizeCm[0]), sc: state.layers.map(L => L.scale) }; })()""")
    info['19-C05'] = r
    if not r.get('cm') or any(abs(c - 1234 * s) > 0.6 for c, s in zip(r['cm'], r['sc'])): bad.append(f'19-C05 组合说明没按导出时最终的贴图写：{r}')
    cur[0] = '19-C02'
    # 19-C02 显示强度 0：导出的 Color Over Life 也是 0
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await ev("""(() => { const M = { ...state.M, headInt: 0, tailInt: 0 }; const c = fwlCascade('Chk', state.bake, M);
      const col = c.emitters.flatMap(e => e.modules.filter(m => m.m === 'ColorOverLife').map(m => m.ColorOverLife.curve)); const mx = Math.max(0, ...col.flat().map(k => Math.max(...k[1])));
      return { n: col.length, max: mx }; })()""")
    info['19-C02'] = r
    if not r['n'] or r['max'] > 0: bad.append(f'19-C02 显示强度 0，导出的 Color Over Life 不是 0：{r}')
    cur[0] = '小修 1'
    # 小修 1：贴图结尾全黑被裁掉，「火花灭完」那行要写明
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('crackle')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await ev("""(async () => {
      const b = state.bake; if (!b) return { txt: 'no bake' }; b.meta.trim = { reqEnd: 9, end: 2.73, t0: 0 }; state.P.duration = 9; refreshVisibility(); await new Promise(z => setTimeout(z, 100));
      const box = document.querySelector('#params [data-info=endInfo]'); return { txt: box ? box.textContent.slice(0, 160) : '' }; })()""")
    await idle(pg)
    info['小修1'] = r
    if '全黑' not in r['txt'] or '2.73' not in r['txt']: bad.append(f'小修 1：结尾全黑帧被裁掉，「火花灭完」那行没写明：{r}')
    cur[0] = '小修 2'
    # 小修 2：换版本前先存草稿
    await open_effect(pg, 'jinmangju'); await idle(pg)
    r = await ev("""(async () => { let n = 0; while (!wb.sig && n++ < 100) await new Promise(z => setTimeout(z, 100)); const list = wbList(); list.push({ id: 'vchk', name: '检查版本', at: wbNow(), snap: wbSnap() }); wbPut(list);
      selectComboLayer(0); state.P.stars = 211; onParam(); await new Promise(z => setTimeout(z, 300)); await wbLoad('vchk'); await new Promise(z => setTimeout(z, 300));
      const d = wbList().find(x => x.draft); return { draft: !!d, stars: d ? (d.snap.P ? d.snap.P.stars : d.snap.layers[0].P.stars) : null }; })()""")
    await idle(pg)
    info['小修2'] = r
    if not r['draft'] or r['stars'] != 211: bad.append(f'小修 2：换版本前没把没保存的改动存成草稿：{r}')
    cur[0] = '小修 3'
    # 小修 3：浏览器存不进去要报错（不能说「已保存」）；读坏了先备份原文
    r = await ev("""(async () => { const os = Storage.prototype.setItem; window.__flashes = [];
      Storage.prototype.setItem = function (k, v) { if (String(k).startsWith('fwb.myEffects')) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; } return os.call(this, k, v); };
      let ok = null; try { ok = store.set('myEffects', { x: 1 }); } finally { Storage.prototype.setItem = os; }
      const errFlash = window.__flashes.some(([m, e]) => e && /存不进|没存上|保存失败/.test(m));
      localStorage.setItem('fwb.myTemplates', '{坏的'); const v = store.get('myTemplates', {}); const bak = Object.keys(localStorage).some(k => k.startsWith('fwb.myTemplates.坏') || k.startsWith('fwb.myTemplates.corrupt'));
      localStorage.removeItem('fwb.myTemplates'); return { ok, errFlash, bak }; })()""")
    info['小修3'] = r
    if r['ok'] is not False or not r['errFlash']: bad.append(f'小修 3：浏览器存不进去时没报错：{r}')
    if not r['bak']: bad.append(f'小修 3：读坏了没先备份原文（下次保存会把整张表覆盖）：{r}')
    cur[0] = '小修 4'
    # 小修 4：尾缀 S / M / L 模板默认 GPU 安全写法
    r = await ev("(() => ({ s: defaultsFor('tailS').P.rtGpuSafe, m: defaultsFor('tailM').P.rtGpuSafe, l: defaultsFor('tailL').P.rtGpuSafe }))()")
    info['小修4'] = r
    if not (r['s'] == 1 and r['m'] == 1 and r['l'] == 1): bad.append(f'小修 4：尾缀 S / M / L 模板导出还是 GPU 写 Acceleration 的旧写法：{r}')
    cur[0] = '小修 5'
    # 小修 5：子花继承标签写对（十字 0.25）
    r = await ev("(() => { for (const sec of SCHEMA) for (const it of sec.items) if (Array.isArray(it) && it[0] === 'subKeep') return typeof it[1] === 'function' ? it[1](state.P) : it[1]; return ''; })()")
    info['小修5'] = r
    if '0.25' not in r: bad.append(f'小修 5：子花继承标签没写十字排布 0.25：{r}')
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)


async def w4(pg):
    """4.6.0（5.0 第 1 步，用户 10-05 20:22「每一个子发射器拥有的参数都是全的」）"""
    bad, info = [], {}
    STD = ['生成', '形状', '初速', '受力', '寿命', '大小', '颜色', '亮度', '闪烁']
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('crackle')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    # 4.9.8（用户 10-06 12:30）：没参数的模块合成发射器末尾的一块灰字（.mod-empties，原因相同的一行）；有参数的模块照 9 个模块的顺序排，两边合起来 9 个都在、每个没参数的都写了原因
    r = await pg.evaluate("""(() => { const out = {}; for (const e of ['星', '火花', '余烬', '分叉火花', '爆裂', '开花闪光']) { const g = document.querySelector(`#params section.egrp[data-g="${e}"]`);
      out[e] = g ? { real: [...g.querySelectorAll(':scope > details.mod > summary')].map(x => x.firstChild.textContent.trim()), empty: [...g.querySelectorAll(':scope > .mod-empties .me-row')].map(p => ({ ms: [...p.querySelectorAll('.me-m')].map(x => x.dataset.m), why: (p.querySelector('.me-why') || {}).textContent || '' })),
        emptyDetails: g.querySelectorAll(':scope > details.mod-empty').length } : null; } return out; })()""")
    info['模块'] = r
    for e, x in r.items():
        if not x: bad.append(f'「{e}」没有这个发射器'); continue
        ms = x['real'] + [m for row in x['empty'] for m in row['ms']]
        if [m for m in STD if m not in ms]: bad.append(f'「{e}」9 个模块没列全：{ms}')
        if [m for m in x['real'] if m in STD] != [m for m in STD if m in x['real']]: bad.append(f"「{e}」有参数的模块顺序不对：{x['real']}")
        if [row for row in x['empty'] if len(row['why'].strip('： ')) < 2]: bad.append(f"「{e}」没参数的模块没写原因：{x['empty']}")
        if len({row['why'] for row in x['empty']}) != len(x['empty']): bad.append(f"「{e}」原因相同的没合成一行：{x['empty']}")
        if x['emptyDetails']: bad.append(f"「{e}」还有一个个占位的空模块（{x['emptyDetails']} 个）")
    # 爆裂 / 开花闪光的新参数真起作用（模拟里的小闪）
    r = await pg.evaluate("""(() => { const P = derive({ ...structuredClone(state.P), crackle: 12, crackleSize: 2, crackleSizeJit: 0, crackleBright: 5, crackleBrightJit: 0, crackleLife: 0.2, crackleTau: 0.05, flashR: 10, flashSize: 1 });
      const s = new Sim(P); for (let i = 0; i < Math.ceil((P.burn + 1.5) / H_STEP); i++) s.step(H_STEP);
      const cr = s.flashes.filter(f => f.abs != null), fl = s.flashes[0]; const avg = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
      return { n: cr.length, sig: +avg(cr.map(f => f.sig)).toFixed(3), abs: +avg(cr.map(f => f.abs)).toFixed(3), cut: cr[0] && cr[0].cut, tau: cr[0] && cr[0].tau, flashSig: fl.sig }; })()""")
    info['爆裂 / 开花闪光'] = r
    if not r['n'] or abs(r['sig'] - 2) > 1e-6 or abs(r['abs'] - 5) > 1e-6 or r['cut'] != 0.2 or r['tau'] != 0.05: bad.append(f'爆裂的大小 / 亮度 / 寿命 / 衰减参数没起作用：{r}')
    if abs(r['flashSig'] - 10) > 1e-6: bad.append(f'开花闪光半径没起作用：{r}')
    r = await pg.evaluate("""(() => { const row = panelRows.find(([r, it]) => Array.isArray(it) && it[0] === 'flashR'), bt = row && row[0].querySelector('.chain'); return { row: !!row, chain: !!bt, on: !!bt && bt.getAttribute('aria-pressed') === 'true' }; })()""")
    info['开花闪光半径跟初速'] = r
    if not (r['row'] and r['chain'] and r['on']): bad.append(f'开花闪光半径没有链条（跟初速）：{r}')
    # 子花：子星大小 / 亮度
    r = await pg.evaluate("""(() => { const P = derive({ ...structuredClone(defaultsFor('senrin').P), type: 'senrin', subSize: 2.5, subBright: 0.4 }); const s = new Sim(P);
      for (let i = 0; i < Math.ceil((P.subDelay + 0.3) / H_STEP); i++) s.step(H_STEP); const k = s.all.filter(x => x.kind === 2); return { n: k.length, sz: k[0] && k[0].sz, I: k[0] && k[0].I }; })()""")
    info['子花'] = r
    if not r['n'] or r['sz'] != 2.5 or abs(r['I'] - 0.4) > 1e-9: bad.append(f'子星大小 / 亮度没起作用：{r}')
    # 火花 / 余烬 / 分叉 / 辉星的着色器参数都接上了
    r = await pg.evaluate("(() => { const pr = particleProgram40('spk'); return ['uInhA', 'uT0J', 'uEmbDk', 'uEmbFa', 'uBrL', 'uBrV', 'uBrKd', 'uBrT', 'uBrB', 'uBrS', 'uGlW', 'uGlPk', 'uGlDim'].filter(k => !pr.u[k]); })()")
    info['着色器参数缺'] = r
    if r: bad.append(f'火花着色器里这些参数没接上：{r}')
    # ＋ 加发射器
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate("""(async () => { const b = document.querySelector('#exAdd'); if (!b) return { btn: false }; b.click(); await new Promise(z => setTimeout(z, 300));
      const g = document.querySelector('#params section.egrp[data-g="自定义 1"]'), tab = document.querySelector('#params .etabs [data-e="自定义 1"]');
      return { btn: true, on: state.P.x1On, tab: !!tab && !tab.hidden, sel: tab && tab.classList.contains('on'), vis: !!g && !g.hidden, mods: g ? [...g.querySelectorAll(':scope > details.mod > summary')].map(x => x.firstChild.textContent.trim()) : [] }; })()""")
    info['加发射器'] = r
    if not r.get('btn') or r.get('on') != 1 or not r.get('tab') or not r.get('vis'): bad.append(f'「＋ 加发射器」没加出「自定义 1」：{r}')
    elif [m for m in STD if m not in r['mods']]: bad.append(f'「自定义 1」没有列全 9 个模块：{r["mods"]}')
    r = await pg.evaluate("""(() => { const P = derive({ ...structuredClone(state.P), x1On: 1, x1Event: 'death', x1N: 5, x1Kind: 'dot', x1BrightCurve: '0:1, 0.5:2, 1:0' }); const s = new Sim(P);
      for (let i = 0; i < Math.ceil((P.burn * 1.4 + 0.2) / H_STEP); i++) s.step(H_STEP); const n = s.exDots.length, bh = new Float32Array(4 * 200000), bt = new Float32Array(4 * 4);
      const P0 = derive({ ...structuredClone(state.P), x1On: 0 }), s0 = new Sim(P0); for (let i = 0; i < Math.ceil((P.burn * 1.4 + 0.2) / H_STEP); i++) s0.step(H_STEP);
      const [nh] = s.gather(bh, bt), [nh0] = s0.gather(new Float32Array(4 * 200000), bt);
      const P2 = derive({ ...P, x1Kind: 'star', x1Spark: 50, x1Size: 1.7 }), s2 = new Sim(P2); for (let i = 0; i < Math.ceil((P.burn * 1.4 + 0.2) / H_STEP); i++) s2.step(H_STEP);
      const k7 = s2.all.filter(x => x.kind === 7); return { stars: P.stars, dots: n, drawn: nh - nh0, k7: k7.length, k7sz: k7[0] && k7[0].sz, curve: parseCurve(P.x1BrightCurve), mid: lifeCurveAt(parseCurve(P.x1BrightCurve), 0.25) }; })()""")
    info['自定义 1 模拟'] = r
    if r['dots'] < r['stars'] * 4 or r['drawn'] <= 0: bad.append(f'「自定义 1」星熄灭时没生成 / 没画光点：{r}')
    if r['k7'] < r['stars'] * 4 or r['k7sz'] is None: bad.append(f'「自定义 1」选「星」时没生成星：{r}')
    if not r['curve'] or len(r['curve']) != 3 or abs(r['mid'] - 1.5) > 1e-9: bad.append(f'曲线「时刻:值」没按几行点算：{r}')
    r = await pg.evaluate("""(async () => { selectEmitTab('自定义 1'); const row = panelRows.find(([r, it]) => it.curve === 'x1SizeCurve'); if (!row) return { row: false }; const inp = row[0].querySelector('input');
      inp.value = '0:1, 1:0.2'; inp.dispatchEvent(new Event('change')); await new Promise(z => setTimeout(z, 100)); const t = row[0].querySelector('.cv-keys').textContent;
      exRemoveSlot(1); await new Promise(z => setTimeout(z, 200)); const tab = document.querySelector('#params .etabs [data-e="自定义 1"]');
      return { row: true, val: state.P.x1SizeCurve, keys: t, off: state.P.x1On, tab: !!tab && !tab.hidden }; })()""")
    info['曲线 / 去掉'] = r
    if not r.get('row') or r.get('val') != '0:1, 1:0.2' or '2 个点' not in r.get('keys', ''): bad.append(f'曲线输入不对：{r}')
    if r.get('off') != 0 or r.get('tab'): bad.append(f'「去掉这个发射器」没去掉：{r}')
    # 游戏内大小：真实米数
    r = await pg.evaluate("(() => { const k = gamePixelsPerMeter({}, 300, 1080, 1000), k2 = gamePixelsPerMeter({}, 780, 1080, 1000), old = gamePixelsPerMeter({ screenFrac: 1 / 3 }, 300, 1080, 1000); return { same: Math.abs(k - k2) < 1e-12, yon: +(780 * k2).toFixed(3), d300: +(300 * k).toFixed(3), old300: +(300 * old).toFixed(3) }; })()")
    info['游戏内大小'] = r
    if not r['same'] or abs(r['yon'] - 360) > 1e-6 or abs(r['d300'] - 360 * 300 / 780) > 1e-3 or abs(r['old300'] - 360) > 1e-6: bad.append(f'游戏内大小不是真实米数（四尺玉 1000 m 占 1/3）：{r}')
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)


async def w5(pg):
    """4.8.0：每个发射器的大小 / 亮度按寿命曲线"""
    bad, info = [], {}
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('crackle')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate("""(() => { const want = ['starSizeCurve', 'starBrightCurve', 'sparkSizeCurve', 'sparkBrightCurve', 'emberBrightCurve', 'branchBrightCurve', 'crackleSizeCurve', 'crackleBrightCurve', 'flashBrightCurve', 'subSizeCurve', 'subBrightCurve'];
      const rows = new Map(panelRows.filter(([r, it]) => it.curve).map(([r, it]) => [it.curve, r._x ? r._x.e + '›' + r._x.m : '?'])); return { miss: want.filter(k => !rows.has(k)), where: Object.fromEntries(rows), def: want.map(k => state.P[k]).filter(v => v) }; })()""")
    info['曲线行'] = r
    if r['miss']: bad.append(f'这些曲线行没有：{r["miss"]}')
    if r['def']: bad.append(f'曲线缺省不是空：{r["def"]}')
    r = await pg.evaluate("""(() => { const run = q => { const P = derive({ ...structuredClone(state.P), crackle: 6, ...q }), s = new Sim(P); const T = P.burn * 0.5;
        for (let i = 0; i < Math.ceil(T / H_STEP); i++) s.step(H_STEP); const st = s.stars.find(x => x.alive && x.kind === 0); return { I: st ? s.headI(st) : null }; };
      const a = run({}), b = run({ starBrightCurve: '0:0.25, 1:0.25' });
      const c = (q => { const P = derive({ ...structuredClone(state.P), crackle: 6, crackleSizeJit: 0, crackleBrightJit: 0, ...q }), s = new Sim(P); for (let i = 0; i < Math.ceil((P.burn * 1.3 + 0.5) / H_STEP); i++) s.step(H_STEP);
        const f = s.flashes.find(f => f.crk); if (!f) return null; s.t = f.t0 + f.cut * 0.5; const bh = new Float32Array(4 * 400000), [nh] = s.gather(bh, new Float32Array(8)); for (let i = 0; i < nh; i++) if (Math.abs(bh[i * 4] - f.x) < 1e-3 && Math.abs(bh[i * 4 + 1] - f.y) < 1e-3) return { I: bh[i * 4 + 2], sz: bh[i * 4 + 3] }; return 'notfound'; });
      return { star: [a.I, b.I], crk: [c({}), c({ crackleBrightCurve: '0:2, 1:2', crackleSizeCurve: '0:3, 1:3' })] }; })()""")
    info['模拟'] = r
    if not (r['star'][0] and r['star'][1] and abs(r['star'][1] / r['star'][0] - 0.25) < 1e-6): bad.append(f'星头亮度随寿命没起作用：{r["star"]}')
    k = r['crk']
    if not (isinstance(k[0], dict) and isinstance(k[1], dict) and abs(k[1]['I'] / k[0]['I'] - 2) < 1e-6 and abs(k[1]['sz'] / k[0]['sz'] - 3) < 1e-6): bad.append(f'爆裂小闪大小 / 亮度随寿命没起作用：{k}')
    r = await pg.evaluate("(() => { const pr = particleProgram40('spk'); return ['uCvSpS[0]', 'uCvSpSN', 'uCvSpB[0]', 'uCvSpBN', 'uCvEmB[0]', 'uCvEmBN', 'uCvBrB[0]', 'uCvBrBN'].filter(k => !pr.u[k]); })()")
    info['着色器缺'] = r
    if r: bad.append(f'火花着色器里曲线参数没接上：{r}')
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)


async def w6(pg):
    """4.8.1：导出可以取消、不叠两个"""
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate("""(async () => { window.__fl = []; const of = flash; flash = (m, e) => { window.__fl.push([String(m), !!e]); return of(m, e); };
      const ob = bakeFinal, orf = refineBake, od = download; let dl = 0; download = () => { dl++; };
      bakeFinal = async (P, sc, onProg) => { for (let i = 0; i <= 40; i++) { onProg && onProg(i / 40); await new Promise(z => setTimeout(z, 25)); } return ob(P, sc); };
      refineBake = async () => null; const keep = state.bake; state.bake = null;
      const run = exportMaster(); await new Promise(z => setTimeout(z, 120));
      const btn = document.querySelector('#busy .busy-cancel'), shown = !!btn && !btn.hidden;
      await exportMaster(); const blocked = window.__fl.some(([m, e]) => e && /正在导出/.test(m));
      if (btn) btn.click(); await run; const cancelled = window.__fl.some(([m, e]) => e && /已取消/.test(m));
      const after = { on: busyJob.on, hidden: $('#busy').hidden };
      bakeFinal = ob; refineBake = orf; download = od; flash = of; state.bake = keep;
      return { shown, blocked, cancelled, dl, after }; })()""")
    bad = []
    if not r['shown']: bad.append('导出时进度条旁没有「取消」')
    if not r['blocked']: bad.append('导出没做完再点导出，没拦住')
    if not r['cancelled'] or r['dl'] or r['after']['on'] or not r['after']['hidden']: bad.append(f'点了取消没停下 / 停下后状态没复原：{r}')
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(r, ensure_ascii=False)


W7_JS = r'''async () => {
  const bad = [], out = {};
  const rowOf = k => (panelRows.find(([r, it]) => Array.isArray(it) && it[0] === k) || [])[0];
  // 链条：每个联动的值；senrin 有子花，rtVt / rtFadeFps 在升空尾缀
  const fams = { senrin: ['subKeep', 'subSpeedJit', 'subGrav', 'subFlash', 'flashR', 'subSize', 'subBright', 'subFlashR', 'subVt'], tailM: ['rtFadeFps', 'rtVt'] };
  for (const [t, ks] of Object.entries(fams)) {
    await openType(t); await new Promise(r => setTimeout(r, 200));
    if (t === 'tailM') { state.P.rtBall = 1; buildMasterPanel(); onParam(); }     // 终端速度只在平方阻力弹道时有
    for (const k of ks) {
      const row = rowOf(k), a = AUTO_DEF[k]; if (!row || !a) { bad.push(`${t} ${k} 没有这一行 / 不在联动表`); continue; }
      if (row.hidden && !(state.P.rtBall === 1 && k === 'rtVt')) { /* 当前发射器标签外的行是藏着的，不影响 */ }
      const bt = row.querySelector('.chain'), num = row.querySelector('.num'), rg = row.querySelector('input[type=range]'), tx = (row.querySelector('.adef-t') || {}).textContent || '';
      const P0 = structuredClone(state.P), v0 = state.P[k], want = a[1](state.P);
      const r = { linked: bt && bt.getAttribute('aria-pressed') === 'true', gray: row.classList.contains('adef-on'), dis: rg.disabled || num.disabled, shown: +num.value, want, tx };
      if (!bt) { bad.push(`${t} ${k} 没有链条`); continue; }
      if (!autoLinked(k, v0)) { out[t + '.' + k] = { note: '这个模板填了数（断开）', v0 }; state.P[k] = a[3]; onParam(); row._refresh(); r.linked = bt.getAttribute('aria-pressed') === 'true'; r.shown = +num.value; r.gray = row.classList.contains('adef-on'); }
      if (!r.linked || !r.gray || r.dis) bad.push(`${t} ${k} 接着时链条 / 灰字 / 能拖不对 ${JSON.stringify(r)}`);
      if (Math.abs(r.shown - want) > 0.051 * Math.max(1, Math.abs(want))) bad.push(`${t} ${k} 接着时显示 ${r.shown}，算出来是 ${want}`);
      // 直接输入 → 断开，存你填的数
      const typed = +(Math.max(a[0], want) * 1.5 + 1).toFixed(2); num.value = String(typed); num.dispatchEvent(new Event('change'));
      r.typed = { v: state.P[k], linked: bt.getAttribute('aria-pressed') === 'true', tx: (row.querySelector('.adef-t') || {}).textContent };
      if (Math.abs(r.typed.v - typed) > 1e-9 || r.typed.linked || !/跟着算是/.test(r.typed.tx)) bad.push(`${t} ${k} 直接输入没断开 / 没存你填的数 ${JSON.stringify(r.typed)}`);
      bt.click(); r.relink = { v: state.P[k], linked: bt.getAttribute('aria-pressed') === 'true' };
      if (r.relink.v !== a[3] || !r.relink.linked) bad.push(`${t} ${k} 点链条没接回去 ${JSON.stringify(r.relink)}`);
      bt.click(); r.unlink = { v: state.P[k], linked: bt.getAttribute('aria-pressed') === 'true' };
      if (Math.abs(r.unlink.v - Math.max(a[0], want)) > 1e-9 || r.unlink.linked) bad.push(`${t} ${k} 点链条断开没固定在算出来的值 ${JSON.stringify(r.unlink)}`);
      state.P = derive(P0); buildMasterPanel(); onParam();
      out[t + '.' + k] = Object.assign(out[t + '.' + k] || {}, { want: +(+want).toFixed(3), ok: true });
    }
  }
  // 联动 = 填进算出来的数：子花的几项按哨兵值和按算出来的数模拟，子星一模一样
  { const base = derive({ ...structuredClone(defaultsFor('senrin').P), type: 'senrin' }), fill = { ...structuredClone(base) };
    for (const k of ['subKeep', 'subSpeedJit', 'subGrav', 'subSize', 'subBright', 'subVt']) fill[k] = AUTO_DEF[k][1](base);
    const run = P => { const s = new Sim(derive(P)); for (let i = 0; i < Math.ceil((P.subDelay + 0.6) / H_STEP); i++) s.step(H_STEP); return s.all.filter(x => x.kind === 2).slice(0, 6).map(x => [x.x, x.y, x.z, +x.sz > 0 ? x.sz : P.headSize, x.I].map(v => +(+v).toFixed(4)).join(',')).join(' '); };
    const a = run(base), b = run(fill); out.sub = a === b; if (a !== b) bad.push('子花按「跟着算」和按算出来的数模拟不一样'); }
  // 旧（待删）：菊没用上的收起来、发射器末尾有开关；搜索能找到；用着的照常显示带「旧」（4.9.11：空中花型的形状旋钮用户 14:24 定留下，换「输出 › 裁掉开头空白」查）
  await openType('kiku'); await new Promise(r => setTimeout(r, 200)); selectEmitTab('输出');
  const L = k => (panelRows.find(([r, it]) => (Array.isArray(it) ? it[0] : it.sel) === k) || [])[0];
  const pinch = L('trimLead'), sw = pinch && pinch.closest('section.egrp').querySelector(':scope > .oldb');
  out.kiku = { pinchHidden: pinch && pinch.hidden, tag: !!(pinch && pinch.querySelector('.old-tag')), btn: sw && !sw.hidden ? sw.textContent : null };
  if (!pinch || !pinch.hidden || !out.kiku.tag || !out.kiku.btn) bad.push('菊的「裁掉开头空白」（旧）没收起来 / 没「旧」标记 / 发射器末尾没开关 ' + JSON.stringify(out.kiku));
  if (sw) { sw.click(); out.kiku.open = !pinch.hidden; sw.click(); out.kiku.closed = pinch.hidden; if (!out.kiku.open || !out.kiku.closed) bad.push('「旧（待删）」开关点了不显示 / 再点不收起 ' + JSON.stringify(out.kiku)); }
  const q = document.querySelector('#params .ptools input[type=search]'); q.value = '开头空白'; q.dispatchEvent(new Event('input')); out.kiku.search = !pinch.hidden; q.value = ''; q.dispatchEvent(new Event('input'));
  if (!out.kiku.search) bad.push('搜「开头空白」找不到收起来的旧参数');
  const tl0 = state.P.trimLead; state.P.trimLead = 0; onParam(); out.kiku.inUse = !pinch.hidden; state.P.trimLead = tl0; onParam();
  if (!out.kiku.inUse) bad.push('改了「裁掉开头空白」以后它还收着（用着的旧参数应照常显示）');
  // 4.9.11（用户 10-06 14:24「整体调粗细，头部这些……是可以保留的」）：空中花型 14 项不再是旧（待删）：照常显示（常用的直接看到、别的在「更多」里）、名字前没有「旧」
  selectEmitTab('火花'); const keep = ['tailWidth', 'tailPinchHead', 'tailPinchTail', 'tailBellyAt', 'tailJit', 'tailShoulder', 'tailHaze', 'tailHazeR', 'sparkLifeEnd'];
  out.kept = keep.filter(k => { const r = L(k); return !r || r.querySelector('.old-tag') || r._legacy || typeof LEGACY[k] !== 'undefined'; });
  if (out.kept.length) bad.push('用户说留下的旋钮还标着「旧」：' + out.kept.join('、'));
  // 所有花型打开时参数值不变（链条、收起只是界面）
  const changed = [];
  for (const t of Object.keys(TYPES)) { if (t === 'blank') continue; const d = derive({ ...structuredClone(defaultsFor(t).P), type: t }); await openType(t); const P = state.P;
    for (const k of Object.keys(AUTO_DEF).concat(Object.keys(LEGACY))) if (String(P[k]) !== String(d[k])) changed.push(`${t}.${k} ${d[k]}→${P[k]}`); }
  out.changed = changed.slice(0, 8); if (changed.length) bad.push('打开花型时联动 / 旧参数的值变了：' + changed.slice(0, 5).join('；'));
  return { ok: !bad.length, bad, out };
}'''


async def w7(pg):
    """4.9.0：链条（Q1）+ 旧（待删）收起"""
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate(W7_JS)
    return r['ok'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)[:900]


async def w8(pg):
    """4.9.1：身份条"""
    bad, info = [], {}
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    rd = "(() => { wbSync(); return { name: $('#abIdName').textContent, chips: [...document.querySelectorAll('#abIdChips .idc')].map(c => c.textContent), hidden: $('#abId').hidden, ab: $('#abState').textContent }; })()"
    r = await pg.evaluate(rd); info['菊'] = r
    if r['hidden'] or '菊' not in r['name'] or '花型模板' not in r['chips'] or '原始' not in r['chips']: bad.append(f'菊打开时身份条不对：{r}')
    await pg.evaluate("(() => { bakeMode.auto = false; state.P.stars += 3; onParam(); return 0; })()"); await pg.wait_for_timeout(900)
    r = await pg.evaluate(rd); info['改了'] = r
    if '● 没保存' not in r['chips']: bad.append(f'改了参数，身份条没标「没保存」：{r}')
    if '烘焙中' in r['ab'] or '贴图是旧的' not in r['ab']: bad.append(f"自动烘焙关时改参数，顶栏写的是「{r['ab']}」（应写贴图是旧的）")
    await pg.evaluate("(() => { wbAutoExport('检查'); return 0; })()")
    r = await pg.evaluate(rd); info['导出后'] = r['chips']
    if '素材包 ✓' not in r['chips']: bad.append(f'导出后身份条没标素材包一致：{r}')
    await pg.evaluate("(() => { state.P.stars += 2; onParam(); return 0; })()")
    r = await pg.evaluate(rd); info['导出后又改'] = r['chips']
    if '素材包要重导' not in r['chips']: bad.append(f'导出后又改，身份条没标「素材包要重导」：{r}')
    await pg.evaluate("(() => { state.P.stars -= 5; onParam(); bakeMode.auto = null; return 0; })()")
    key = await pg.evaluate("(() => { const ef = EFFS().find(f => f.阶段 === '待验收' && f.待验收版 && effReady(f).ok); return ef ? ef.key : null; })()")
    if key:
        await pg.evaluate(f"(() => {{ window.__opening = true; Promise.resolve(openEffect(EFFS().find(e => e.key === {json.dumps(key)}))).finally(() => window.__opening = false); return 0; }})()"); await idle(pg)
        r = await pg.evaluate(rd); info['AI ' + key] = r['chips']
        if not any(c.startswith('AI · ') for c in r['chips']) or '素材包 ✓' not in r['chips']: bad.append(f'就绪的待验收效果身份条不对：{r}')
    else: bad.append('找不到就绪的待验收效果')
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)[:900]


async def w9(pg):
    """4.9.2：时间约束提示、超出滑杆范围、单束说明"""
    bad, info = [], {}
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate("""(() => { const fl = []; const of = flash; flash = (m, e, ms) => { fl.push(String(m)); return of(m, e, ms); };
      const P = state.P, b = +P.burn; setTimingParam('sparkStop', +(b * 0.6).toFixed(2)); stage2.tnote = null;     // 先把火花停止时刻打开（填一个数），再往后推
      setTimingParam('sparkStop', +(b + 0.8).toFixed(2)); const a1 = { burn: +P.burn, stop: +P.sparkStop, msg: fl.slice(-1)[0] || '' };
      stage2.tnote = null; setTimingParam('burn', +(b * 0.5).toFixed(2)); const a2x = 0; const a2 = { burn: +P.burn, stop: +P.sparkStop, msg: fl.slice(-1)[0] || '' };
      flash = of; return { b, a1, a2 }; })()""")
    info['时间约束'] = r
    if not (r['a1']['burn'] > r['b'] + 1e-6 and '燃烧时间' in r['a1']['msg'] and '跟着变了' in r['a1']['msg']): bad.append(f"火花停止时刻推后、燃烧时间被推着走，没提示：{r['a1']}")
    if not ('火花停止时刻' in r['a2']['msg'] and '跟着变了' in r['a2']['msg']): bad.append(f"燃烧时间缩短、火花停止时刻被收回来，没提示：{r['a2']}")
    r = await pg.evaluate("""(() => { const x = panelRows.find(([r, it]) => Array.isArray(it) && it[0] === 'crackle'); if (!x) return null; const row = x[0], num = row.querySelector('.num'), max = +row.querySelector('input[type=range]').max;
      num.value = String(max * 2.5); num.dispatchEvent(new Event('change')); const o = { v: state.P.crackle, max, over: row.classList.contains('over'), tip: num.title };
      num.value = String(max / 2); num.dispatchEvent(new Event('change')); o.back = row.classList.contains('over'); state.P.crackle = 0; onParam(); row._refresh(); return o; })()""")
    info['超出滑杆'] = r
    if not r or not r['over'] or '照样起作用' not in r['tip'] or r['back'] or abs(r['v'] - r['max'] * 2.5) > 1e-6: bad.append(f'数值超出滑杆范围没标出来 / 没写明：{r}')
    r = await pg.evaluate("(() => { toggleDeliv(true); const t = $('#delivView').textContent; toggleDeliv(false); return t; })()")     # 4.9.25 单束菜单并进交付清单的产物表
    if '不受力' not in r: bad.append('交付清单的产物表没写明单束贴图里的星不受力、随机关了')
    r = await pg.evaluate("""(() => { const d = $('#previewSettings'), c = $('#previewBloomChk'); if (!c) return null; const g0 = state.gen, b0 = !!+state.P.previewBloom;
      d.open = true; d.dispatchEvent(new Event('toggle')); const shown = c.checked === b0; c.checked = !b0; c.dispatchEvent(new Event('change'));
      const o = { shown, after: +state.P.previewBloom, want: b0 ? 0 : 1, gen: state.gen - g0, label: c.closest('label').textContent };
      c.checked = b0; c.dispatchEvent(new Event('change')); d.open = false; return o; })()""")
    info['预览泛光'] = r
    if not r or not r['shown'] or r['after'] != r['want'] or r['gen'] or '引擎里没有' not in r['label']: bad.append(f'预览设置里的「预览泛光」不对（要能开关、不触发烘焙、写明引擎里没有）：{r}')
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)[:900]


W10_JS = r'''async () => {
  const bad = [], out = {}, wait = ms => new Promise(r => setTimeout(r, ms));
  // 1 应用内对话框：页面脚本里没有原生 prompt / confirm（askConfirm 和隔离检查的退路除外）
  const src = [...document.scripts].map(x => x.textContent).join('\n');
  out.prompt = (src.match(/[^.\w]prompt\(/g) || []).length; out.confirm = (src.match(/[^.\w:]\s?confirm\(/g) || []).filter(m => !/:\s?confirm/.test(m)).length;
  if (out.prompt) bad.push(`页面里还有 ${out.prompt} 处原生 prompt`);
  { const pr = askText('起个名字', '说明', '旧名', '改名'); await wait(50); const open = $('#saveNameDlg').open, act = $('#saveNameSubmit').textContent;
    $('#saveNameInput').value = '新名'; $('#saveNameSubmit').click(); const v = await pr; out.askText = { open, act, v };
    if (!open || v !== '新名' || act !== '改名') bad.push('askText 不是应用内对话框 / 没拿到填的名字 ' + JSON.stringify(out.askText)); }
  { const pr = askConfirm('要不要', '说明', '要', '不要'); await wait(50); const open = $('#confirmDlg').open; $('#confirmYes').click(); const y = await pr;
    const pr2 = askConfirm('要不要', ''); await wait(50); $('#confirmNo').click(); const n = await pr2; out.askConfirm = { open, y, n };
    if (!open || y !== true || n !== false) bad.push('askConfirm 不对 ' + JSON.stringify(out.askConfirm)); }
  { const pr = askText('起个名字', '', '默认名'); await wait(50); $('#saveNameDlg').close(); const v = await pr; if (v !== null) bad.push('关掉起名对话框（Esc）应当等于取消，拿到的是 ' + v); }
  // 2 快捷键登记表：每个都挂了处理；工具页和 ? 弹出的表就是这张
  out.unbound = KEYMAP.filter(k => !(KEY_FNS[k.id] || []).length).map(k => k.id);
  if (out.unbound.length) bad.push('快捷键表里有没挂处理的：' + out.unbound.join(','));
  out.toolsRows = document.querySelectorAll('#keysTools .keys-tbl tr').length;
  if (out.toolsRows !== KEYMAP.length) bad.push(`工具页快捷键表 ${out.toolsRows} 行，登记表 ${KEYMAP.length} 个`);
  return { bad, out };
}'''


async def w10(p, b):
    """4.9.4：应用内对话框、快捷键登记表、预览烘焙可取消"""
    ctx = await b.new_context(viewport={'width': 1440, 'height': 900}); pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    natives = []
    pg.on('dialog', lambda d: (natives.append(d.type), asyncio.ensure_future(d.dismiss())))
    try:
        await pg.add_init_script("window.requestAnimationFrame = () => 0;")
        await pg.goto(HTML, wait_until='load', timeout=0); await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
        await pg.evaluate(REC if REAL else FAKE)
        await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
        r = await pg.evaluate(W10_JS); bad, info = r['bad'], r['out']
        # ? 弹出快捷键表，Esc 关掉
        await pg.evaluate("document.activeElement && document.activeElement.blur(); 0"); await pg.keyboard.press('?'); await pg.wait_for_timeout(200)
        k = await pg.evaluate("({ open: $('#keysDlg').open, rows: document.querySelectorAll('#keysBody .keys-tbl tr').length, n: KEYMAP.length })")
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200); k['closed'] = not await pg.evaluate("$('#keysDlg').open"); info['?'] = k
        if not k['open'] or k['rows'] != k['n'] or not k['closed']: bad.append(f'? 没弹出快捷键表 / 行数不对 / Esc 关不掉：{k}')
        # L 收左栏、再按放回；菜单开着按 Esc 只关菜单、不切精简布局
        s0 = await pg.evaluate("panels.side"); await pg.keyboard.press('l'); s1 = await pg.evaluate("panels.side"); await pg.keyboard.press('l'); s2_ = await pg.evaluate("panels.side")
        info['L'] = [s0, s1, s2_]
        if s1 == s0 or s2_ != s0: bad.append(f'L 收 / 放左栏不对：{info["L"]}')
        await pg.evaluate("setPanels({ side: false, right: false }); $('#abMore').open = true; 0"); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(100)
        e1 = await pg.evaluate("({ menu: $('#abMore').open, side: panels.side, right: panels.right })"); info['Esc 关菜单'] = e1
        if e1['menu'] or e1['side'] or e1['right']: bad.append(f'菜单开着按 Esc：菜单没关，或者顺带切了精简布局 {e1}')
        await pg.evaluate("setPanels({ side: true, right: true }); 0")
        # 预览烘焙取消
        r = await pg.evaluate("""(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); const ob = bake; let calls = 0;
          bake = async (P, s, onProg) => { calls++; for (let i = 0; i <= 20; i++) { onProg && onProg(i / 20); await wait(40); } return ob(P, s, onProg); };
          const old = state.bake, s0 = old && old.P ? old.P.stars : null; state.P.stars += 4; onParam(); bakeNow({ quiet: true }); await wait(250);
          abStateSync(); const mid = { baking: state.baking, btn: !$('#abBakeCancel').hidden, ab: $('#abState').textContent };
          $('#abBakeCancel').click(); await wait(400); abStateSync();
          const after = { baking: state.baking, same: state.bake === old, stale: bakeStale(), ab: $('#abState').textContent, btn: !$('#abBakeCancel').hidden };
          const c1 = calls; await wait(900); const idle = { calls: calls - c1, baking: state.baking };
          bakeNow({ quiet: true }); for (let i = 0; i < 100 && (state.baking || bakesPending()); i++) await wait(50);
          const again = { stale: bakeStale(), stars: state.bake && state.bake.P ? state.bake.P.stars : null, want: state.P.stars };
          bake = ob; state.P.stars -= 4; onParam(); return { s0, mid, after, idle, again }; })()""")
        info['取消烘焙'] = r
        if not (r['mid']['baking'] and r['mid']['btn']): bad.append(f"烘焙中顶栏没有「取消」：{r['mid']}")
        if r['after']['baking'] or not r['after']['same'] or not r['after']['stale'] or '旧' not in r['after']['ab'] or r['after']['btn']: bad.append(f"点了取消没停下 / 贴图不是上次的 / 没标旧：{r['after']}")
        if r['idle']['calls'] or r['idle']['baking']: bad.append(f"取消后同一组参数又自己烘了：{r['idle']}")
        if r['again']['stale'] or r['again']['stars'] != r['again']['want']: bad.append(f"取消后按 B 没按新参数烘完：{r['again']}")
        if natives: bad.append(f'弹出了浏览器原生对话框：{natives}')
        if errs: bad.append('页面报错：' + '；'.join(errs[:3]))
        return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)[:900]
    finally:
        await ctx.close()


W11_JS = r'''async () => {
  const bad = [], out = {};
  // 1 每个发射器都有大小 / 亮度随寿命（行在、放在对的发射器 › 模块）
  const want = { emberSizeCurve: '余烬›大小', branchSizeCurve: '分叉火花›大小', flashSizeCurve: '开花闪光›大小',
    rtFSizeCurve: '细火花›大小', rtFBrightCurve: '细火花›亮度', rtMSizeCurve: '中火花›大小', rtMBrightCurve: '中火花›亮度', rtCSizeCurve: '粗火花›大小', rtCBrightCurve: '粗火花›亮度',
    rtESizeCurve: '落火›大小', rtEBrightCurve: '落火›亮度', rtPopSizeCurve: '爆亮›大小', rtPopBrightCurve: '爆亮›亮度', rtSmokeSizeCurve: '烟带›大小', rtSmokeBrightCurve: '烟带›亮度',
    rtLaunchSizeCurve: '发射口›闪光', rtLaunchBrightCurve: '发射口›闪光', rtLaunchSparkSizeCurve: '发射口›火花', rtLaunchSparkBrightCurve: '发射口›火花', rtGlowSizeCurve: '星头›光晕', rtGlowBrightCurve: '星头›光晕' };
  const where = Object.fromEntries(panelRows.filter(([r, it]) => it.curve).map(([r, it]) => [it.curve, r._x ? r._x.e + '›' + r._x.m : '?']));
  out.wrong = Object.entries(want).filter(([k, w]) => where[k] !== w).map(([k, w]) => `${k}: ${where[k] || '没有'}（应在 ${w}）`);
  if (out.wrong.length) bad.push('曲线行不对：' + out.wrong.join('；'));
  out.notEmpty = Object.keys(want).filter(k => BASE[k] !== '');
  if (out.notEmpty.length) bad.push('缺省不是空：' + out.notEmpty.join(','));
  // 2 开花闪光大小随寿命：模拟里闪光变大（峰值不变）
  { const run = q => { const P = derive({ ...structuredClone(defaultsFor('kiku').P), type: 'kiku', ...q }), s = new Sim(P); s.step(H_STEP); const f = s.flashes.find(x => x.main); if (!f) return null;
      s.t = f.t0 + (f.cut || 0.25) * 0.4; const bh = new Float32Array(4 * 400000), [nh] = s.gather(bh, new Float32Array(8)); let best = null;
      for (let i = s.gFlash; i < nh; i++) if (Math.abs(bh[i * 4] - f.x) < 1e-3 && Math.abs(bh[i * 4 + 1] - f.y) < 1e-3) { best = { sz: bh[i * 4 + 3], I: bh[i * 4 + 2] }; break; } return best; };
    const a = run({}), b = run({ flashSizeCurve: '0:2, 1:2' }); out.flash = [a, b];
    if (!a || !b || Math.abs(b.sz / a.sz - 2) > 1e-6 || Math.abs(b.I / a.I - 4) > 1e-6) bad.push('开花闪光大小随寿命没起作用（大小应 ×2、总光量 ×4、峰值不变）：' + JSON.stringify(out.flash)); }
  // 3 着色器：余烬 / 分叉大小、地面火花、彗星的曲线参数接上
  { const miss = [];
    for (const [kind, ks] of [['spk', ['uCvEmS[0]', 'uCvEmSN', 'uCvBrS[0]', 'uCvBrSN']], ['emit', ['uCvSpS[0]', 'uCvSpSN', 'uCvSpB[0]', 'uCvSpBN']], ['ehead', ['uCvStS[0]', 'uCvStSN', 'uCvStB[0]', 'uCvStBN']]]) {
      const pr = particleProgram40(kind); for (const k of ks) if (!pr.u[k]) miss.push(kind + '.' + k); }
    out.shader = miss; if (miss.length) bad.push('着色器里曲线参数没接上：' + miss.join(',')); }
  // 4 升空尾缀：乘到导出的 Size By Life / Color Over Life 上；空的时候逐位不变
  { const P0 = derive({ ...structuredClone(defaultsFor('tailM').P), type: 'tailM', rtERate: 20, rtPopRate: 10, rtSmoke: 0.2, rtLaunch: 1, rtLaunchN: 20, rtGlow: 1 });
    const es0 = rtBuildES(P0), em0 = Object.fromEntries(es0.emitters.map(e => [e.name, e]));
    const es1 = rtBuildES({ ...P0 }); out.same = JSON.stringify(es0.emitters) === JSON.stringify(es1.emitters);
    const q = {}; for (const k of Object.keys(want)) if (k.startsWith('rt')) q[k] = /Size/.test(k) ? '0:2, 1:2' : '0:0.5, 1:0.5';
    const es2 = rtBuildES({ ...P0, ...q }), em2 = Object.fromEntries(es2.emitters.map(e => [e.name, e])), at = (k, u) => esCurve(k, u);
    const chk = {};
    for (const n of Object.keys(em0)) { const a = em0[n], b = em2[n]; if (!b || !a.col) continue;
      const u = 0.3, ca = at(a.col, u), cb = at(b.col, u), sa = at(a.sizeLife || [[0, 1], [1, 1]], u), sb = at(b.sizeLife || [[0, 1], [1, 1]], u);
      const cr = Array.isArray(ca) ? (ca[0] > 1e-6 ? cb[0] / ca[0] : null) : null;
      chk[n] = { size: +(sb / sa).toFixed(3), col: cr == null ? null : +cr.toFixed(3) }; }
    out.rt = chk;
    const sizeX = { Embers: 2, SparkPops: 2, Smoke: 2, LaunchGlow: 2, LaunchSparks: 2, HeadGlow: 2, SparksCoarse: 2, SparksFine: 2 };
    for (const [n, c] of Object.entries(chk)) {
      if (sizeX[n] && Math.abs(c.size - 2) > 0.02) bad.push(`升空尾缀 ${n} 大小随寿命没乘上（×${c.size}）`);
      if (c.col != null && n !== 'SparksFine' && n !== 'SparksCoarse' && n !== 'SparksMid' && n !== 'SparksTwinkle' && Math.abs(c.col - 0.5) > 0.02) bad.push(`升空尾缀 ${n} 亮度随寿命没乘上（×${c.col}）`);
    }
    if (!out.same) bad.push('同一组参数建两次发射器，结果不一样'); }
  // 5 地面：喷泉的星头曲线标不起作用，扇形（有彗星）的不标
  out.inert = { fountain: inertWhy('starSizeCurve', { ...defaultsFor('fountain').P, type: 'fountain' }), fan: inertWhy('starSizeCurve', { ...defaultsFor('fan').P, type: 'fan' }) };
  if (!out.inert.fountain || out.inert.fan) bad.push('地面的星头曲线「不起作用」标得不对：' + JSON.stringify(out.inert));
  return { bad, out };
}'''


async def w11(pg):
    """4.9.4：所有发射器的按寿命曲线"""
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate(W11_JS)
    return not r['bad'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)[:900]


async def w12(pg):
    """4.9.4：一个效果只留一个英文名"""
    bad, info = [], {}
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate("""(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); const o = { mname: !!document.querySelector('#mname'), shown: $('#enName').textContent, eff: effEnName(), safe0: safeName() };
      $('#enNameEdit').click(); await wait(80); o.deliv = !$('#delivView').hidden; o.focus = document.activeElement && document.activeElement.id;
      $('#dvBase').value = 'Kiku Check 9'; $('#dvSaveNames').click(); await wait(80);
      o.after = { shown: $('#enName').textContent, safe: safeName(), eff: effEnName() };
      const rs = $('#dvResetNames'); if (rs) rs.click(); await wait(80); o.reset = { shown: $('#enName').textContent, safe: safeName() };
      toggleDeliv(false); return o; })()""")
    info['菊'] = r
    if r['mname']: bad.append('右栏还有可改的「母版名称」输入框')
    if r['shown'] != r['eff']: bad.append(f"右栏显示的英文名 {r['shown']} 和素材包用的 {r['eff']} 不一样")
    if not r['deliv'] or r['focus'] != 'dvBase': bad.append(f'点「在交付清单里改」没打开交付清单 / 没把光标放到英文名：{r}')
    if r['after']['shown'] != 'Kiku_Check_9' or r['after']['safe'] != 'Kiku_Check_9': bad.append(f"交付清单改了英文名，右栏 / 导出文件名没跟着：{r['after']}")
    if r['reset']['shown'] != r['shown'] or r['reset']['safe'] != r['safe0']: bad.append(f"恢复默认没回去：{r['reset']}（原来 {r['shown']} / {r['safe0']}）")
    # 沿用旧命名的产物（升空尾缀 V5）交付清单里也能改英文名
    tr = await pg.evaluate("Object.keys(TYPES).find(t => familyOf(t) === 'rise' && (defaultsFor(t).P.form === 'trail'))")
    if tr:
        await pg.evaluate(f"(() => {{ window.__opening = true; Promise.resolve(openType('{tr}')).finally(() => window.__opening = false); return 0; }})()"); await idle(pg)
        r2 = await pg.evaluate("(async () => { toggleDeliv(true); await new Promise(r => setTimeout(r, 80)); const o = { base: !!$('#dvBase'), name: $('#enName').textContent }; toggleDeliv(false); return o; })()")
        info['V5'] = r2
        if not r2['base']: bad.append('升空尾缀 V5 的交付清单里不能改英文名')
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)[:700]


W13_JS = r'''async (rec) => {
  const bad = [], out = {}, wait = ms => new Promise(r => setTimeout(r, ms));
  // 1 输出栏：直接调 9 个控件 + 算出来的 3 个
  store.set('pModOpen', {}); pview.mopen = {};
  await openType('kiku'); await wait(300); selectEmitTab('输出');
  const g = document.querySelector('#params section.egrp[data-g="输出"]'), mods = [...g.querySelectorAll('details.mod')].filter(d => !d.hidden);
  out.mods = mods.map(d => [d.querySelector('summary').firstChild.textContent.trim(), d.open]);
  const dmod = mods.find(d => d._mod === '直接调'), cmod = mods.find(d => d._mod === '算出来的');
  if (!dmod || !cmod || mods.indexOf(dmod) !== 0 || mods.indexOf(cmod) !== 1) bad.push('输出的前两个模块不是「直接调」「算出来的」：' + JSON.stringify(out.mods));
  if (mods.slice(2).some(d => d.open)) bad.push('大面片的其它输出模块没有默认收起：' + JSON.stringify(out.mods));
  const ctl = d => [...d.querySelectorAll('input[type=range], select, .num')].filter(x => x.offsetParent && !x.closest('.adef') && !(x.classList.contains('num'))).map(x => x.id || (x.closest('[data-info]') || {}).dataset?.info || x.closest('.sl, .field')?._lab || '?');
  const dkeys = panelRows.filter(([r]) => !r.hidden && r.closest('details') === dmod).map(([r, it]) => Array.isArray(it) ? it[0] : it.sel || it.info);
  const spec = ['x-texW', 'x-texH', 'x-cols', 'x-rows'].filter(id => dmod.contains(document.getElementById(id)));
  out.direct = { rows: dkeys, spec };
  const want = ['outPC', 'outMobile', 'cutIn', 'cutOut', 'exposure', 'cellPad'];
  // 4.9.31：顶上多一项「导出缩放」（用户 10-07 14:56「导出可以让我选0.5/0.8/1这样」，宪章「直接调」那条）
  if (want.some(k => !dkeys.includes(k)) || spec.length !== 4 || dkeys.filter(k => k !== 'specBox' && k !== 'exportScale').length !== 6 || dkeys[0] !== 'exportScale') bad.push('「直接调」不是那 9 个 + 导出缩放（PC / 手机怎么出、入点、出点、贴图宽 × 高、列 × 行、曝光、留边）：' + JSON.stringify(out.direct));
  const ckeys = panelRows.filter(([r]) => !r.hidden && r.closest('details') === cmod).map(([r, it]) => Array.isArray(it) ? it[0] : it.sel || it.info);
  out.calc = ckeys; if (!['pageTarget', 'outCell'].every(k => ckeys.includes(k))) bad.push('「算出来的」缺张数 / 单格：' + JSON.stringify(ckeys));
  // 4.9.13：缺省按运动分（帧率按运动自动分，没有「每帧停几 tick」）；换成固定机位 + 匀速帧时「算出来的」多一行帧率
  state.P.frameBudget = 'fixed'; refreshVisibility();
  const ck2 = panelRows.filter(([r]) => !r.hidden && r.closest('details') === cmod).map(([r, it]) => Array.isArray(it) ? it[0] : it.sel || it.info); out.calcFixed = ck2;
  if (!ck2.includes('holdTicks') || ckeys.includes('holdTicks')) bad.push('「每帧停几 tick」应只在匀速帧时出现：' + JSON.stringify({ motion: ckeys, fixed: ck2 }));
  const hrow = panelRows.find(([r, it]) => Array.isArray(it) && it[0] === 'holdTicks')[0], hb = hrow.querySelector('.chain');
  out.hold = { linked: hb && hb.getAttribute('aria-pressed') === 'true', gray: hrow.classList.contains('adef-on'), shown: +hrow.querySelector('.num').value, calc: outCalc().hold };
  if (!out.hold.linked || !out.hold.gray || out.hold.shown !== out.hold.calc) bad.push('帧率没有灰字显示算出来的值 / 没链条：' + JSON.stringify(out.hold));
  const oc = panelRows.find(([r, it]) => it.sel === 'outCell')[0].querySelector('option[value="0"]').textContent; out.cellLabel = oc;
  if (!/自动：现在 \d+ px/.test(oc)) bad.push('单格没写现在算出来的是多少：' + oc);
  // 填了每帧停几 tick：帧计划照办（k = 2 → 帧号每次跳 2 个 tick）；0 = 自动和以前一样
  { const P0 = derive({ ...structuredClone(state.P), frameBudget: 'fixed' }), fm = measure(P0), p0 = plan(P0, fm), p2 = plan({ ...P0, holdTicks: 2 }, fm);
    const step = pl => pl.ticks && pl.ticks.length > 1 ? pl.ticks[1] - pl.ticks[0] : null; out.plan = { auto: step(p0), two: step(p2), F0: p0.L.F, F2: p2.L.F };
    if (out.plan.two !== 2) bad.push('填了每帧停 2 tick，帧计划没照办：' + JSON.stringify(out.plan)); }
  // 开花段时长：按运动分要读（4.9.13 不再是旧），匀速帧不读、不显示
  { const r = panelRows.find(([r, it]) => Array.isArray(it) && it[0] === 'burstSec'); const hidFixed = r && r[0].hidden; state.P.frameBudget = 'motion'; refreshVisibility(); const hidMotion = r && r[0].hidden;
    out.burstSec = { fixed: hidFixed ? '不显示' : '显示', motion: hidMotion ? '不显示' : '显示', legacy: !!(r && r[0]._legacy) };
    if (!r || !hidFixed || hidMotion || r[0]._legacy) bad.push('「开花段时长」应是按运动分时显示（不标旧）、匀速帧时不显示：' + JSON.stringify(out.burstSec)); }
  // 2 类别：说明条显示
  selectEmitTab('星'); const sr = panelRows.find(([r, it]) => Array.isArray(it) && it[0] === 'stars')[0]; panelHelp(sr); out.help = $('#pHelp').textContent.slice(-40);
  if (!/物理量（颗）|物理量（个）|物理量（/.test($('#pHelp').textContent)) bad.push('说明条没写类别 / 单位：' + out.help);
  out.cats = (() => { const c = {}; for (const id in PEMIT.P) { const k = PEMIT.P[id][4] || '（空）'; c[k] = (c[k] || 0) + 1; } return c; })();
  if (out.cats['（空）']) bad.push(`发射器表还有 ${out.cats['（空）']} 行没类别`);
  // 5 不静默：打开存着「结尾淡出 / 冷却按各自寿命」的旧存档，画面上方写明
  if (rec) { myPut({ id: rec.id, name: rec.name, created: '', updated: '', links: rec.links || [], snap: rec.snap }); await openMyEffect(rec.id); await wait(500);
    out.mig = { shown: !$('#migNote').hidden, text: $('#migNoteText').textContent.slice(0, 160) };
    if (!out.mig.shown || !/结尾/.test(out.mig.text) || !/冷却方式/.test(out.mig.text)) bad.push('打开旧存档没写明「结尾 / 冷却方式」不再起作用：' + JSON.stringify(out.mig));
    if (/\bfade\b|\bnatural\b|存的是 0/.test($('#migNoteText').textContent)) bad.push('旧存档提示里还有内部值（fade / 存的是 0），要写中文（4.9.7）：' + JSON.stringify(out.mig));
    $('#migNoteOk').click(); out.mig.closed = $('#migNote').hidden; await openType('kiku'); await wait(200); out.mig.afterTemplate = $('#migNote').hidden;
    if (!out.mig.closed || !out.mig.afterTemplate) bad.push('「知道了」关不掉 / 换到模板还挂着'); }
  else bad.push('找不到旧存档样本（analysis/我的配方 里结尾 = 淡出的）');
  return { bad, out };
}'''


async def w13(pg):
    """4.9.5：输出栏收口、参数类别、不静默"""
    import glob
    rec = None
    for f in sorted(glob.glob(str(ROOT / 'analysis' / '我的配方' / 'my_*' / '*.json'))):
        try:
            d = json.load(open(f, encoding='utf-8'))
            if any(L['P'].get('endMode') == 'fade' and str(L['P'].get('coolMode')) == '0' for L in d['snap']['layers']): rec = d; break
        except Exception: pass
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate(W13_JS, rec)
    return not r['bad'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)[:900]


W14_FS = r'''async () => { await openType('kiku'); await new Promise(r => setTimeout(r, 400)); selectEmitTab('星'); $('#right').scrollTop = 0; $('#libBody').scrollTop = 0;
  const vh = innerHeight, vw = innerWidth, R = el => { if (!el) return null; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom <= vh + 1 && r.top >= -1 && r.right <= vw + 1 && r.left >= -1; };
  const firstRow = panelRows.map(([r]) => r).find(r => !r.hidden && r.offsetParent && r.closest('section.egrp:not([hidden])') && r.closest('details.mod') && r.closest('details.mod').open);
  return { name: R($('#abIdName')), save: R($('#abSave')), exportPack: R($('#abExportPack')), more: R(document.querySelector('#abMore > summary')), tabs: R($('#params .etabs')),
    firstRow: R(firstRow), review: R(document.querySelector('#libBody .li')), newRecipe: R($('#newRecipe')), canvas: R(document.querySelector('.canvas-wrap')), play: R($('#play')),
    scope: R($('#params .pscope .ps-path')), search: R($('#params .ptools input[type=search]')), foot: R($('#pFoot')) }; }'''
# 4.9.14（对话框23，用户 10-06 15:15「回滚再来」，照 01_顺手调参_深化）：第一屏的「舒适」口径——不再数参数行（4.9.8 的「≥ 8 行」把模块全展开往下堆）：
# 这个发射器的模块一屏看得到几个（收起的都写了摘要）、参数行的滑杆和数值框各在一条竖线上、底部「和打开时比」那一条在
W14_LAYOUT = r'''(() => { const R = $('#right').getBoundingClientRect(), vh = innerHeight, foot = $('#pFoot'), fb = foot && foot.offsetParent ? foot.getBoundingClientRect().top : Math.min(R.bottom, vh);
  const inView = el => { const b = el.getBoundingClientRect(); return b.height > 0 && b.top >= R.top - 1 && b.bottom <= Math.min(fb, vh) + 1; };
  const g = [...document.querySelectorAll('#params section.egrp')].find(x => !x.hidden), mods = g ? [...g.querySelectorAll(':scope > details.mod')].filter(d => !d.hidden) : [];
  const rows = [...document.querySelectorAll('#params details.mod[open] > .sl:not(.rnd-row)')].filter(r => !r.hidden && r.offsetParent && inView(r));     // 收起的 details 里的行在 Chromium 里照样有位置，要按 open 筛
  const xs = sel => [...new Set(rows.map(r => r.querySelector(sel)).filter(Boolean).map(e => Math.round(e.getBoundingClientRect().left)))];
  return { emit: g && g.dataset.g, mods: mods.length, seen: mods.map(d => d.querySelector(':scope > summary')).filter(inView).length, open: mods.filter(d => d.open).map(d => d._mod),
    noSum: mods.filter(d => !d.open && !((d.querySelector(':scope > summary .msum') || {}).textContent || '').trim()).map(d => d._mod), rows: rows.length, numX: xs(':scope > .num'), rangeX: xs(':scope > input[type=range]') }; })()'''


async def w14(p, b):
    """4.9.5：对象 × 动作的入口、首屏（1366×768 / 1920×1080）"""
    bad, info = [], {}
    # 对象 × 动作（交互宪章第 7 节）：表里写的入口在页面上都有
    ctx = await b.new_context(viewport={'width': 1440, 'height': 900}); pg = await ctx.new_page()
    try:
        await pg.add_init_script("window.requestAnimationFrame = () => 0;")
        await pg.goto(HTML, wait_until='load', timeout=0); await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
        await pg.evaluate(REC if REAL else FAKE); await pg.evaluate(ask_stub('检查入口'))
        await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
        r = await pg.evaluate("""(async () => { const has = s => !!document.querySelector(s), miss = [];
          const need = { 花型模板: ['#libBody', '#newRecipe', '#abSave', '#abReset', '#abSaveTpl', '#abExportPack', '#abExportFile'], AI效果: ['#abHide', '#abCopyDiff', '#delivView'],
            我的效果: ['#abSaveAs', '#abMyRename', '#abMyDelete', '#abRepo', '#abRepoRead'], 版本: ['#versionHistory', '#abSrc', '#abRename', '#abDelete'],
            层: ['#abAddLayer'], 我的模板: ['#abUpdTpl'], 配方文件: ['#abImportFile', '#abFile', '#toolImport', '#toolExport'], 素材包: ['#abExportPack', '#abDeliv', '#enNameEdit', '#busy'],
            发射器: ['#exAdd'], 对话框: ['#saveNameDlg', '#confirmDlg', '#keysDlg'], 缩略图: ['#thGrab', '#thRestore'] };     // 4.9.6 缩略图（对话框新花型排队：交互宪章第 7 节那一行）
          for (const [o, ss] of Object.entries(need)) for (const s of ss) if (!has(s)) miss.push(o + ' ' + s);
          pkOpen({ mode: 'open', title: '检查' }); await new Promise(r => setTimeout(r, 200)); if (!document.querySelector('#pkGrid .pk-card .fav')) miss.push('收藏 星标'); if (!document.querySelector('#pkCats')) miss.push('收藏 分类'); pkClose();
          const fns = ['myRename', 'myRemove', 'myRenameLayer', 'myDupLayer', 'myMoveLayer', 'renameTemplate', 'removeTemplate', 'removeVersion', 'exRemoveSlot', 'wbImportFile', 'exportCombo', 'exportMaster', 'bakeCancel', 'undoStep'];
          for (const f of fns) if (typeof window[f] !== 'function') miss.push('函数 ' + f);
          return miss; })()""")
        info['入口缺'] = r
        if r: bad.append('对象 × 动作表里的入口缺：' + '、'.join(r))
    finally:
        await ctx.close()
    for vw, vh in [(1366, 768), (1440, 900), (1920, 1080)]:
        ctx = await b.new_context(viewport={'width': vw, 'height': vh}); pg = await ctx.new_page()
        try:
            await pg.add_init_script("window.requestAnimationFrame = () => 0;")
            await pg.goto(HTML, wait_until='load', timeout=0); await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
            await pg.evaluate(REC if REAL else FAKE)
            r = await pg.evaluate(W14_FS); info[f'{vw}×{vh}'] = [k for k, v in r.items() if not v]
            if info[f'{vw}×{vh}']: bad.append(f'{vw}×{vh} 首屏看不到：' + '、'.join(info[f'{vw}×{vh}']))
            # 4.9.14：菊 › 星、引菊 → 锦 金锦 › 火花：收起的模块都写了摘要；滑杆、数值框各对齐成一条竖线；一屏看得到的模块——
            # 1920×1080 两个都全部、1440×900 菊全部、1366×768 至少 6 个（参考稿 941 高时 9 个模块 3 个展开一屏看完）
            need = {(1366, 768): (6, 6), (1440, 900): (99, 6), (1920, 1080): (99, 99)}[(vw, vh)]
            l1 = await pg.evaluate(W14_LAYOUT)
            await open_effect(pg, 'hiki_nishiki'); await pg.evaluate("(() => { state.playing = false; selectComboLayer(1); selectEmitTab('火花'); $('#right').scrollTop = 0; return 0; })()"); await pg.wait_for_timeout(300)
            l2 = await pg.evaluate(W14_LAYOUT); sc = await pg.evaluate("$('#params .pscope .ps-path').textContent")
            info[f'{vw}×{vh} 第一屏'] = {'菊 › 星': l1, '金锦 › 火花': l2, '顶上': sc}
            for nm, l, n in (('菊 › 星', l1, need[0]), ('金锦 › 火花', l2, need[1])):
                if l['seen'] < min(n, l['mods']): bad.append(f"{vw}×{vh} {nm}：一屏只看得到 {l['seen']} / {l['mods']} 个模块（应 ≥ {min(n, l['mods'])}）")
                if l['noSum']: bad.append(f"{vw}×{vh} {nm}：收起的模块没写摘要：{l['noSum']}")
                if len(l['numX']) > 1 or len(l['rangeX']) > 1: bad.append(f"{vw}×{vh} {nm}：参数行没对齐（数值框 x {l['numX']}、滑杆 x {l['rangeX']}）")
                if not l['rows']: bad.append(f'{vw}×{vh} {nm}：第一屏没有一行参数（默认该展开第一个模块）')
            if sc.replace(' ', '') != '金锦›火花': bad.append(f'顶上没写「金锦 › 火花」：{sc}')
        finally:
            await ctx.close()
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)


async def x2(pg):
    """4.4.2（用户 10-04 21:17）：单层效果（牡丹模板）也有「导出方案」：输出 › 导出方案里 PC 能选 GPU 光点 / 单束 / 不出，手机能选不出；选光点后 cascade.json 是一个 GPU 光点发射器、引擎回放画光点、说明写有尾迹没了"""
    bad, info = [], {}
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('botan')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate("""(() => { selectEmitTab('输出'); const x = panelRows.find(([r, it]) => it.sel === 'outPC'); if (!x) return null; const s = x[0].querySelector('select');
      return { mod: x[0]._x.e + '›' + x[0]._x.m, shown: !x[0].hidden, opts: [...s.options].map(o => o.value) }; })()""")
    info['牡丹'] = r
    if not r or r['mod'] != '输出›直接调' or not r['shown'] or r['opts'] != ['seq', 'unit', 'dots', 'frame', 'off']: return False, f'单层的导出方案不对：{r}'     # 4.9.35 PC 加单帧
    await pg.evaluate("(() => { const s = panelRows.find(([r, it]) => it.sel === 'outPC')[0].querySelector('select'); s.value = 'dots'; s.dispatchEvent(new Event('change')); return 0; })()"); await idle(pg)
    r = await pg.evaluate("""(() => { const so = singleOut(state.P), b = state.bake, pc = b ? fwlCombo('T', [{ L: singleLayer(state.P, state.M), b, i: 0, dots: true }], false) : null;
      const dot = panelRows.find(([r, it]) => Array.isArray(it) && it[0] === 'dotSize');
      return { so, em: pc ? pc.emitters.map(e => [e.name, e.gpu, pc.materials[e.material].role]) : null, dotRow: !!dot && !dot[0].hidden, note: ((document.querySelector('#params [data-info=schemeNote]') || {}).textContent || ''), n: dotsCount(state.P) }; })()""")
    info['选光点'] = r
    if {k: r['so'].get(k) for k in ('pc', 'mobile')} != {'pc': 'dots', 'mobile': 'seq'} or r['so'].get('low', 'off') != 'off': bad.append(f"方案没记住：{r['so']}")     # 4.9.29 多了低端（缺省不出）
    if r['em'] != [['L1_Dots', True, 'soft_dot']]: bad.append(f"cascade.json 不是一个 GPU 光点发射器：{r['em']}")
    if not r['dotRow']: bad.append('选了光点，没出现光点大小 / 亮度')
    if 'GPU 光点' not in r['note']: bad.append(f"导出说明没写 GPU 光点：{r['note'][:60]}")
    # 引擎回放（云端快速模式不真画）：单层 PC 按光点画、手机按序列；光点数 = 模拟里会亮的星
    r = await pg.evaluate("(() => { const so = singleOut(state.P), v = dotVis(state.P); return { pc: so.pc, mobile: so.mobile, n: singleDotsTables(state.P, state.M, state.bake)[0].list.length, lit: v ? v.n : 0 }; })()")
    info['引擎回放'] = r
    if r['pc'] != 'dots' or r['mobile'] != 'seq' or not r['n'] or r['n'] != r['lit']: bad.append(f'引擎回放的光点不对：{r}')
    await pg.evaluate("(() => { state.P.outPC = 'seq'; buildMasterPanel(); onParam(); selectEmitTab('星'); return 0; })()"); await idle(pg)
    # 4.4.4 点灭：光点的 Color Over Life 写成方波（以前按相对寿命平均掉了、不闪）；不点灭的花型照旧。
    # 亮的时间占比 ≈ 点灭占空比（以前取整对不上时亮边拖成斜坡、亮得晚）
    r = await pg.evaluate("""(() => { const flips = t => { const d = defaultsFor(t, 40, true), P = derive({ ...structuredClone(d.P), type: t }), e = dotsES({ ...d.M, delay: 0, rate: 1, scale: 1 }, P, d.M, null);
        const l = e.col.map(([u, c]) => c[0] + c[1] + c[2]); let n = 0; for (let i = 1; i < l.length; i++) if (Math.max(l[i], l[i - 1]) > 0.05 && Math.abs(l[i] - l[i - 1]) > 0.5 * Math.max(l[i], l[i - 1])) n++;
        let on = 0, m = 0; if (+P.strobeHz > 0) { const v0 = dotVis({ ...P, strobeHz: 0 }), env = [[0, v0.alpha[0][1]], ...v0.alpha, [1, v0.alpha[v0.alpha.length - 1][1]]], u0 = +P.strobeStart || 0;
          for (let i = 0; i < 2000; i++) { const u = u0 + (1 - u0) * (i + .5) / 2000, en = esCurve(env, u); if (en < 1e-3) continue; m++; if (esCurve(e.ak, u) > en * 0.8) on++; } }
        return { n, on: m ? +(on / m).toFixed(3) : null, duty: +P.strobeDuty || 0.35 }; };
      return { strobe: flips('strobe'), kiku: flips('kiku') }; })()""")
    info['光点点灭'] = r
    if r['strobe']['n'] < 10: bad.append(f"点灭星的光点 Color Over Life 没有亮灭（翻转 {r['strobe']['n']} 次）")
    elif abs(r['strobe']['on'] - r['strobe']['duty']) > 0.06: bad.append(f"点灭星的光点亮的时间占比 {r['strobe']['on']}，和占空比 {r['strobe']['duty']} 对不上")
    if r['kiku']['n'] > 4: bad.append(f"菊（不点灭）的光点亮度曲线多出了亮灭（翻转 {r['kiku']['n']} 次）")
    # 多层效果里不显示（多层在层页头选）
    await open_effect(pg, 'hiki_nishiki'); await idle(pg)
    r = await pg.evaluate("(() => { selectComboLayer(1); const x = panelRows.find(([r, it]) => it.sel === 'outPC'); return x ? !x[0].hidden : false; })()")
    if r: bad.append('多层效果的层里也显示了单层的导出方案（多层应在层页头选）')
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)


async def w15(p, b):
    """4.9.7 起（对话框23 参数栏交互，验收任务「引菊 → 锦」）：
    4.9.8 引菊 → 锦六步：1 定位（顶上「金锦层 › 火花」、固定不随滚动消失、不改观察）、2 改寿命（数值框、状态「改过」、时间不动、贴图标旧）、3 改颜色（去改 → 本层颜色写明管整层 → 回到火花原位置、别的层不动）、
    4 调接力（效果 › 这一层在整朵里 › 开始时间、图层管理那一格和时间轴跟着动）、6 撤销一次回一步 / 保存 → 刷新 → 重开一样（第 5 步对比 5.0 后）；
    切页：多层效果里选了层 / 发射器、暂停在某一刻、收起一个模块、滚到中间 → 切「工具」「审阅」再回来：时间、选中的层、发射器、模块开合、滚动位置都还在；多层里「工具」页也能打开；
    撤销一次操作一步：两个参数紧挨着改（间隔远小于 0.6 s）是两步；拖滑杆中途停 0.9 s 再拖是一步；数值框回车是一步；撤销一次只回一步"""
    bad, info = [], {}
    ctx = await b.new_context(viewport={'width': 1440, 'height': 900}); pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    try:
        await pg.add_init_script("window.requestAnimationFrame = () => 0;")
        await pg.goto(HTML, wait_until='load', timeout=0); await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
        await pg.evaluate(REC if REAL else FAKE); await pg.evaluate(ask_stub('检查'))
        # ---- 切页不丢上下文 ----
        await open_effect(pg, 'hiki_nishiki'); await pg.wait_for_timeout(600); await idle(pg)
        r0 = await pg.evaluate("""(async () => { state.playing = false; selectComboLayer(1); selectEmitTab('火花'); state.layerView.solo = 1; state.t = 1.23;
          const d = [...document.querySelectorAll('#params details.mod')].find(x => x._key === '火花›生成'); if (d) { d.open = false; await new Promise(r => setTimeout(r, 30)); }
          const R = $('#right'); R.scrollTop = 0; R.scrollTop = Math.min(260, R.scrollHeight - R.clientHeight - 1);
          const mods = Object.fromEntries([...document.querySelectorAll('#params section.egrp:not([hidden]) > details.mod:not(.mod-empty)')].map(x => [x._key, x.open]));
          return { t: state.t, sel: state.comboSel, tab: pview.tab[emitTabFamily()], solo: state.layerView.solo, mods, scroll: R.scrollTop, tools: !$('#ptabs [data-tab=iter]').hidden }; })()""")
        info['切走前'] = {k: v for k, v in r0.items() if k != 'mods'}
        if not r0['tools']: bad.append('多层效果里看不到「工具」页')
        await pg.evaluate("$('#ptabs [data-tab=iter]').click()"); await pg.wait_for_timeout(200)     # 用 click() 而不是鼠标：旧版多层里这个按钮藏着，照样要查出切页丢上下文
        tv = await pg.evaluate("({ tools: !!$('#pIter').offsetParent, params: !!$('#pMaster').offsetParent, layers: !!$('#layerCard').offsetParent, tab: state.tab, t: state.t })")
        info['工具页'] = tv
        if not tv['tools'] or tv['params'] or tv['layers']: bad.append(f'切到「工具」页显示不对：{tv}')
        if tv['tab'] != 'combo': bad.append(f"切到「工具」页把打开的东西换了（state.tab = {tv['tab']}）")
        await pg.evaluate("$('#ptabs [data-tab=review]').click()"); await pg.wait_for_timeout(200)
        await pg.evaluate("$('#ptabs [data-tab=master]').click()"); await pg.wait_for_timeout(300)
        r1 = await pg.evaluate("""(() => { const R = $('#right'); const mods = Object.fromEntries([...document.querySelectorAll('#params section.egrp:not([hidden]) > details.mod:not(.mod-empty)')].map(x => [x._key, x.open]));
          return { t: state.t, sel: state.comboSel, tab: pview.tab[emitTabFamily()], solo: state.layerView.solo, mods, scroll: R.scrollTop, params: !!$('#pMaster').offsetParent }; })()""")
        info['切回来'] = {k: v for k, v in r1.items() if k != 'mods'}
        for k in ('t', 'sel', 'tab', 'solo'):
            if r1[k] != r0[k]: bad.append(f'切「工具」「审阅」再回来，{k} 变了：{r0[k]} → {r1[k]}')
        if r1['mods'] != r0['mods']: bad.append(f"模块开合变了：{[k for k in r0['mods'] if r0['mods'].get(k) != r1['mods'].get(k)]}")
        if abs(r1['scroll'] - r0['scroll']) > 2: bad.append(f"滚动位置没回来：{r0['scroll']} → {r1['scroll']}")
        if not r1['params']: bad.append('切回「参数」页没显示参数')
        # ---- 4.9.8 引菊 → 锦 六步（提示词验收表；第 5 步「和打开时对比」用户 10-06 12:30 定 5.0 后做，不查）----
        await pg.evaluate("(() => { setAutoBake(false); state.layerView = { solo: -1, mute: [] }; selectComboLayer(0); return 0; })()"); await idle(pg)
        # 1 定位：选金锦层（图层管理那一行 / 收起时的层名按钮），再选火花 → 顶上写「金锦层 › 火花」，画布照常看整体（不独看、不静音）
        await pg.evaluate("(() => { const b = document.querySelector('#layerCard .lrow[data-i=\"1\"]') && document.querySelector('#layerCard').open ? document.querySelector('#layerCard .lrow[data-i=\"1\"]') : document.querySelector('#layerCard .lc-chip[data-i=\"1\"]'); b.click(); return 0; })()"); await pg.wait_for_timeout(200)
        await pg.click('#params .etabs [data-e="火花"]'); await pg.wait_for_timeout(200)
        s1 = await pg.evaluate("({ sel: state.comboSel, scope: $('#params .pscope .ps-path').textContent.replace(/\\s/g, ''), solo: state.layerView.solo, mute: state.layerView.mute.length, sticky: getComputedStyle($('#params .pscope')).position })")
        info['1 定位'] = s1
        if s1['sel'] != 1 or s1['scope'] != '金锦›火花': bad.append(f'第 1 步定位不对：{s1}')
        if s1['solo'] != -1 or s1['mute']: bad.append(f'第 1 步选层改了观察（独看 / 静音）：{s1}')
        if s1['sticky'] != 'sticky': bad.append('顶上那块没固定（滚动时会消失）')
        sc = await pg.evaluate("(() => { const R = $('#right'); R.scrollTop = R.scrollHeight; const a = $('#params .pscope').getBoundingClientRect(), r = R.getBoundingClientRect(); return a.top >= r.top - 1 && a.bottom <= r.bottom + 1; })()")
        if not sc: bad.append('右栏滚到底时看不到「现在改的是」')
        await pg.evaluate("$('#right').scrollTop = 0; 0")
        # 2 改寿命：暂停在 1.2 s，用数值框改火花寿命 → 数值、状态「改过」更新；时间不动；这一层排进重烘、贴图标旧（自动烘焙关）
        r2 = await pg.evaluate("""(() => { state.playing = false; state.t = 1.2; const row = panelRows.find(([r, it]) => Array.isArray(it) && it[0] === 'sparkLife')[0], n = row.querySelector('.num');
          const v0 = state.P.sparkLife, g0 = state.gen; n.focus(); n.value = String(+(v0 + 0.4).toFixed(2)); n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })); n.blur();
          const L = layerEntryOf(state.layers[1]);
          abStateSync(); return { v0, v: state.P.sparkLife, layerP: L.P.sparkLife, st: row.querySelector('.st').textContent, chg: row.classList.contains('chg'), t: state.t, gen: state.gen > g0, stale: bakeStale(), ab: $('#abState').textContent }; })()""")
        await pg.wait_for_timeout(200)
        info['2 改寿命'] = r2
        if abs(r2['v'] - r2['v0'] - 0.4) > 1e-6 or r2['layerP'] != r2['v']: bad.append(f'第 2 步寿命没改到金锦层：{r2}')
        if r2['st'] != '改过' or not r2['chg']: bad.append(f"第 2 步状态列没写「改过」：{r2['st']}")
        if abs(r2['t'] - 1.2) > 1e-9 or not r2['gen']: bad.append(f'第 2 步时间被动了 / 实时模拟没换代：{r2}')
        if not r2['stale'] or '旧' not in r2['ab']: bad.append(f"第 2 步自动烘焙关时贴图没标旧：{r2['ab']}")
        # 3 改颜色：火花 › 颜色「去改」→ 本层颜色（写明管整层）→ 改第一段颜色 → 「← 回到 火花 › 颜色」回到原来的位置；另一层颜色不动
        r3 = await pg.evaluate("""(async () => { const R = $('#right'), d = [...document.querySelectorAll('#params section.egrp[data-g="火花"] > details.mod')].find(x => x._mod === '颜色'); d.open = true; await new Promise(r => setTimeout(r, 30));
          d.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 30)); const s0 = R.scrollTop, c0 = JSON.stringify(state.layers[0].stages);
          d.querySelector('.clink button').click(); await new Promise(r => setTimeout(r, 50));
          const cc = $('#colorControls'), b = cc.getBoundingClientRect(), rr = R.getBoundingClientRect(), inView = b.top < rr.bottom && b.bottom > rr.top;
          const col = cc.querySelector('#stages input[type=color]'), before = state.layers[1].stages[0][1]; col.value = before === '#123456' ? '#654321' : '#123456'; col.dispatchEvent(new Event('input', { bubbles: true })); col.dispatchEvent(new Event('change', { bubbles: true }));
          const after = state.layers[1].stages[0][1], other = JSON.stringify(state.layers[0].stages) === c0, sum = cc.querySelector('summary').textContent, back = cc.querySelector('.cback');
          back.click(); await new Promise(r => setTimeout(r, 50));
          return { inView, sum, changed: after !== before, other, backText: back.textContent, s0, s1: R.scrollTop, tab: pview.tabNow }; })()""")
        info['3 改颜色'] = r3
        if not r3['inView']: bad.append('第 3 步「去改」没滚到本层颜色')
        if '所有发射器' not in r3['sum']: bad.append(f"第 3 步本层颜色没写明管整层：{r3['sum']}")
        if not r3['changed'] or not r3['other']: bad.append(f'第 3 步颜色没改到金锦层 / 改到了别的层：{r3}')
        if abs(r3['s1'] - r3['s0']) > 2 or r3['tab'] != '火花': bad.append(f'第 3 步回不到火花原来的位置：{r3}')
        # 4 调接力：效果 › 这一层在整朵里 › 开始时间 → 层的延迟、图层管理那一格、时间轴上金锦层的条一起动；橙引线不动
        r4 = await pg.evaluate("""(async () => { selectEmitTab('效果'); await new Promise(r => setTimeout(r, 30)); const pos = $('#lhPos'), inEff = !!pos && !!pos.closest('section.egrp[data-g="效果"]');
          const bar = () => { stage2.tlSig = ''; buildTlBars(); const m = document.querySelector('#tlBars .tlb-t[data-i="1"] i.main'); return m ? parseFloat(m.style.left) : null; };
          const L0 = state.layers[0].delay, d0 = state.layers[1].delay, b0 = bar(), n = pos.querySelector('input[id$="-delay"]').closest('.sl').querySelector('.num');
          n.value = String(+(d0 + 0.5).toFixed(2)); n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true }));
          await new Promise(r => setTimeout(r, 30)); const cell = document.querySelector('#layerCard [data-st="1"]');
          return { inEff, d0, d: state.layers[1].delay, cell: cell ? +cell.value : null, b0, b1: bar(), other: state.layers[0].delay === L0 }; })()""")
        await pg.wait_for_timeout(200)
        info['4 调接力'] = r4
        if not r4['inEff']: bad.append('第 4 步「这一层在整朵里」不在效果标签里')
        if abs(r4['d'] - r4['d0'] - 0.5) > 1e-6 or r4['cell'] is None or abs(r4['cell'] - r4['d']) > 1e-6: bad.append(f'第 4 步开始时间没改到 / 图层管理那一格没跟着变：{r4}')
        if r4['b0'] is None or r4['b1'] is None or not r4['b1'] > r4['b0']: bad.append(f"第 4 步时间轴上金锦层的条没往后挪：{r4['b0']} → {r4['b1']}")
        if not r4['other']: bad.append('第 4 步改到了橙引线的开始时间')
        # 6 撤销 / 保存：撤销一次只回开始时间（颜色、寿命还在）；保存（AI 效果 → 存成我的效果）→ 刷新 → 打开：和保存的一样
        await pg.mouse.click(700, 400); await pg.keyboard.press('Control+z'); await idle(pg); await pg.wait_for_timeout(300)
        r6 = await pg.evaluate("({ d: state.layers[1].delay, life: layerEntryOf(state.layers[1]).P.sparkLife, col: state.layers[1].stages[0][1] })")
        info['6 撤销一次'] = r6
        if abs(r6['d'] - r4['d0']) > 1e-6 or abs(r6['life'] - r2['v']) > 1e-6: bad.append(f'第 6 步撤销一次没正好回一步（开始时间回去、寿命 / 颜色还在）：{r6}')
        await pg.evaluate("window.__ans = '六步检查'; wbSave(false).then(() => 0)"); await pg.wait_for_timeout(1200); await idle(pg)
        saved = await pg.evaluate("({ id: lib.my && lib.my.id, life: layerEntryOf(state.layers[1]).P.sparkLife, d: state.layers[1].delay, col: state.layers[1].stages[0][1], n: state.layers.length })")
        info['6 保存'] = saved
        if not saved['id']: bad.append('第 6 步保存没存成我的效果')
        else:
            await pg.reload(wait_until='load'); await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
            await pg.evaluate(REC if REAL else FAKE); await pg.evaluate(ask_stub('检查'))
            await pg.evaluate(f"(() => {{ window.__opening = true; Promise.resolve(openMyEffect({json.dumps(saved['id'])})).finally(() => window.__opening = false); return 0; }})()"); await idle(pg); await pg.wait_for_timeout(600)
            again = await pg.evaluate("({ id: lib.my && lib.my.id, life: layerEntryOf(state.layers[1]).P.sparkLife, d: state.layers[1].delay, col: state.layers[1].stages[0][1], n: state.layers.length })")
            info['6 刷新重开'] = again
            if again != saved: bad.append(f'第 6 步刷新重开和保存的不一样：{saved} → {again}')
        # ---- 4.9.8「改过」和打开时比：打开后还在等烘焙稳定时就改了参数，稳定后也不能把这个改动当成「打开时」（本机真烘焙 SMOKE38 P1 查出）----
        ra = await pg.evaluate("""(async () => { await openType('kiku'); const armed0 = !!wb.sig, v0 = state.P.sparkRateEnd; state.P.sparkRateEnd = +(v0 + 0.33).toFixed(2); onParam();
          const row = panelRows.find(([r, it]) => Array.isArray(it) && it[0] === 'sparkRateEnd')[0]; return { armed0, during: row.classList.contains('chg') }; })()""")
        await pg.wait_for_timeout(1500); await idle(pg); await pg.wait_for_timeout(800)
        ra['armed'] = await pg.evaluate("!!wb.sig"); ra['after'] = await pg.evaluate("(() => { refreshVisibility(); return panelRows.find(([r, it]) => Array.isArray(it) && it[0] === 'sparkRateEnd')[0].classList.contains('chg'); })()")
        info['等烘焙时改'] = ra
        if ra['armed0']: info['等烘焙时改']['note'] = '打开时已经记好（这次没碰上等的那一会儿）'
        elif not ra['during'] or not ra['after']: bad.append(f'打开后等烘焙稳定时改的参数，没标「改过」/ 稳定后被当成打开时：{ra}')
        # ---- 撤销：一次操作一步 ----
        await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg); await pg.wait_for_timeout(900); await idle(pg)
        await pg.evaluate("(() => { state.playing = false; selectEmitTab('星'); return 0; })()"); await pg.wait_for_timeout(200)
        async def box(k):
            return await pg.evaluate("""(k => { const el = document.querySelector(`#params input[type=range][id^="p-${k}-"]`); if (!el) return null; const d = el.closest('details.mod'); if (d && !d.open) d.open = true;     // 4.9.14 模块默认收起：先点开
              el.scrollIntoView({ block: 'center' }); const b = el.getBoundingClientRect(); return { x: b.left, y: b.top + b.height / 2, w: b.width }; })""", k)
        n0 = await pg.evaluate("undo.back.length")
        v0 = await pg.evaluate("({ stars: state.P.stars, burn: state.P.burn })")
        bs = await box('stars'); await pg.mouse.click(bs['x'] + bs['w'] * 0.3, bs['y']); await pg.wait_for_timeout(60)
        bb = await box('burn'); await pg.mouse.click(bb['x'] + bb['w'] * 0.6, bb['y']); await pg.wait_for_timeout(200)
        n1 = await pg.evaluate("undo.back.length")
        bs = await box('stars'); await pg.mouse.move(bs['x'] + bs['w'] * 0.3, bs['y']); await pg.mouse.down(); await pg.mouse.move(bs['x'] + bs['w'] * 0.4, bs['y'], steps=4)
        await pg.wait_for_timeout(900); await pg.mouse.move(bs['x'] + bs['w'] * 0.55, bs['y'], steps=4); await pg.mouse.up(); await pg.wait_for_timeout(200)
        n2 = await pg.evaluate("undo.back.length")
        v2 = await pg.evaluate("({ stars: state.P.stars, burn: state.P.burn })")
        await pg.evaluate("""(() => { const el = document.querySelector('#params input[type=range][id^="p-burn-"]').closest('.sl').querySelector('.num'); el.focus(); el.value = '2.71'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); return 0; })()""")
        await pg.wait_for_timeout(200)
        n3 = await pg.evaluate("undo.back.length")
        info['撤销步数'] = {'两个参数紧挨着': n1 - n0, '拖动中途停 0.9 s': n2 - n1, '数值框回车': n3 - n2}
        if n1 - n0 != 2: bad.append(f'两个参数紧挨着改，记成了 {n1 - n0} 步（应 2 步）')
        if n2 - n1 != 1: bad.append(f'一次拖动（中途停 0.9 s），记成了 {n2 - n1} 步（应 1 步）')
        if n3 - n2 != 1: bad.append(f'数值框输入一次，记成了 {n3 - n2} 步（应 1 步）')
        await pg.mouse.click(700, 400); await pg.keyboard.press('Control+z'); await idle(pg); await pg.wait_for_timeout(200)
        v3 = await pg.evaluate("({ stars: state.P.stars, burn: state.P.burn })")
        info['撤销一次'] = [v2, v3]
        if v3 != v2: bad.append(f'撤销一次没正好回到数值框输入之前：{v3}（应 {v2}）')
        if v0 == v2: bad.append('滑杆没改到参数（检查本身不对）')
    finally:
        await ctx.close()
    if errs: bad.append('页面错误：' + errs[0][:160])
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)


async def w16(p, b):
    """4.9.14 主链路八步连着走（用户 10-06 15:15：「选效果与图层 → 调参数 → 调色并返回 → 调层延迟 → 撤销/重做 → 保存刷新 → 烘焙回放 → 导出 PC/手机」；
    GPT 方案的首条纵向链）。引菊 → 锦，1440×900，鼠标点、键盘敲真的控件（不直接改 state）：
    1 左栏点「引菊 → 锦」→ 图层那一行点「金锦」→ 发射器点「火花」：顶上「金锦 › 火花」、不改独看 / 静音
    2 点开「寿命」→ 数值框输入回车：参数改到金锦层、行尾 ↺、标签「火花 1」、底部「相对打开时改过 1 项」
    3 颜色那一行点「定位 ↗」→ 本层颜色展开、看得见 → 改第一段颜色 →「← 回到 火花 › 颜色」：回到原位置、只改金锦层
    4 点「效果」→「这一层在整朵里」开始时间输入回车：层的延迟、图层管理那一格、时间轴的条一起动
    5 Ctrl+Z：只回开始时间（寿命、颜色还在）；Ctrl+Shift+Z：重做回来
    6 点「保存」（AI 效果存成我的效果）→ 刷新 → 重开：寿命、颜色、开始时间都在
    7 点「引擎回放」→ 按 B 烘焙：每层贴图按最新参数、不标旧
    8 点「导出素材包」：包里有 PC cascade.json + 手机 cascade_mobile.json、两层贴图，按最新参数（云端是假烘焙，本机 --real 是真烘焙）"""
    bad, info = [], {}
    ctx = await b.new_context(viewport={'width': 1440, 'height': 900}); pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    async def tag(js, name):     # 用页面里的逻辑找到控件，打上 data-w16，再用 Playwright 真的点
        ok = await pg.evaluate("(([js, name]) => { document.querySelectorAll(`[data-w16='${name}']`).forEach(x => x.removeAttribute('data-w16')); const el = (0, eval)(js); if (!el) return false; el.setAttribute('data-w16', name); el.scrollIntoView({ block: 'nearest' }); return true; })", [js, name])
        return ok
    async def click(js, name):
        if not await tag(js, name): return False
        await pg.click(f"[data-w16='{name}']"); await pg.wait_for_timeout(150); return True
    async def type_num(js, name, val):
        if not await tag(js, name): return False
        await pg.click(f"[data-w16='{name}']"); await pg.keyboard.press('Control+a'); await pg.keyboard.type(str(val)); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(200); return True
    try:
        await pg.add_init_script("window.requestAnimationFrame = () => 0;")
        await pg.goto(HTML, wait_until='load', timeout=0); await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
        await pg.evaluate(REC if REAL else FAKE); await pg.evaluate(ask_stub('主链路检查'))
        await pg.evaluate("setAutoBake(false); 0")
        # 1 选效果与图层
        ok = await click("[...document.querySelectorAll('#libBody .li')].find(x => /引菊/.test(x.textContent))", 'lib')
        await idle(pg); await pg.wait_for_timeout(600); await idle(pg)
        await pg.evaluate("state.playing = false; 0")
        ok = ok and await click("document.querySelector('#layerCard .lc-chip[data-i=\"1\"]') || document.querySelector('#layerCard .lrow[data-i=\"1\"]')", 'layer')
        ok = ok and await click("document.querySelector('#params .etabs [data-e=\"火花\"]')", 'tab')
        s1 = await pg.evaluate("({ key: lib.key, sel: state.comboSel, scope: $('#params .pscope .ps-path').textContent.replace(/\\s/g, ''), solo: state.layerView.solo, mute: state.layerView.mute.length })")
        info['1 选效果与图层'] = s1
        if not ok or s1['sel'] != 1 or s1['scope'] != '金锦›火花': bad.append(f'第 1 步没选到「金锦 › 火花」：{s1}')
        if s1['solo'] != -1 or s1['mute']: bad.append('第 1 步选层改了独看 / 静音')
        # 2 调参数：点开「寿命」模块（默认收起），数值框输入
        life0 = await pg.evaluate("layerEntryOf(state.layers[1]).P.sparkLife"); want = round(life0 + 0.4, 2)
        ok = await click("[...document.querySelectorAll('#params section.egrp[data-g=\"火花\"] > details.mod')].find(d => d._mod === '寿命').querySelector(':scope > summary')", 'lifesum')
        ok = ok and await type_num("panelRows.find(([r, it]) => Array.isArray(it) && it[0] === 'sparkLife')[0].querySelector('.num')", 'lifenum', want)
        s2 = await pg.evaluate("""(() => { const row = panelRows.find(([r, it]) => Array.isArray(it) && it[0] === 'sparkLife')[0];
          return { life: layerEntryOf(state.layers[1]).P.sparkLife, chg: row.classList.contains('chg'), rr: !row.querySelector('.rrst').hidden, n: +((document.querySelector('#params .etabs [data-e="火花"] .et-n') || {}).textContent || 0),
            foot: $('#pFoot .pf-chg').textContent, stale: bakeStale() }; })()""")
        info['2 调参数'] = s2
        if not ok or abs(s2['life'] - want) > 1e-6: bad.append(f'第 2 步寿命没改到金锦层：{s2}（应 {want}）')
        if not (s2['chg'] and s2['rr'] and s2['n'] == 1 and '改过 1 项' in s2['foot']): bad.append(f'第 2 步「改过」没标全（行尾 ↺ / 标签数 / 底部）：{s2}')
        # 3 调色并返回
        c0 = await pg.evaluate("[JSON.stringify(state.layers[0].stages), state.layers[1].stages[0][1]]")
        ok = await click("[...document.querySelectorAll('#params section.egrp[data-g=\"火花\"] > details.mod')].find(d => d._mod === '颜色').querySelector('.mgo')", 'mgo')
        await pg.wait_for_timeout(150)
        s3a = await pg.evaluate("(() => { const cc = $('#colorControls'), R = $('#right').getBoundingClientRect(), r = cc.getBoundingClientRect(); return { open: cc.open, inView: r.top < R.bottom && r.bottom > R.top, sum: cc.querySelector('summary').textContent }; })()")
        await pg.evaluate("""(() => { const col = $('#colorControls #stages input[type=color]'); col.value = state.layers[1].stages[0][1] === '#123456' ? '#654321' : '#123456'; col.dispatchEvent(new Event('input', { bubbles: true })); col.dispatchEvent(new Event('change', { bubbles: true })); return 0; })()""")
        ok = ok and await click("$('#colorControls .cback')", 'back')
        await pg.wait_for_timeout(150)
        s3 = await pg.evaluate("""(() => { const d = [...document.querySelectorAll('#params section.egrp[data-g="火花"] > details.mod')].find(d => d._mod === '颜色'), R = $('#right').getBoundingClientRect(), r = d.querySelector('summary').getBoundingClientRect();
          return { col: state.layers[1].stages[0][1], other: JSON.stringify(state.layers[0].stages), tab: pview.tabNow, back: r.top >= R.top - 1 && r.bottom <= R.bottom + 1 }; })()""")
        info['3 调色并返回'] = {**s3a, 'tab': s3['tab'], 'back': s3['back'], 'changed': s3['col'] != c0[1], 'other': s3['other'] == c0[0]}
        if not ok or not s3a['open'] or not s3a['inView'] or '所有发射器' not in s3a['sum']: bad.append(f'第 3 步「定位」没把本层颜色（写明整层共用）展开到眼前：{s3a}')
        if s3['col'] == c0[1] or s3['other'] != c0[0]: bad.append('第 3 步颜色没改到金锦层 / 改到了别的层')
        if s3['tab'] != '火花' or not s3['back']: bad.append(f"第 3 步「← 回到」没回到火花 › 颜色：{info['3 调色并返回']}")
        # 4 调层延迟
        ok = await click("document.querySelector('#params .etabs [data-e=\"效果\"]')", 'efftab')
        d0 = await pg.evaluate("state.layers[1].delay"); dw = round(d0 + 0.5, 2)
        bar = "(() => { stage2.tlSig = ''; buildTlBars(); const m = document.querySelector('#tlBars .tlb-t[data-i=\"1\"] i.main'); return m ? parseFloat(m.style.left) : null; })()"
        b0 = await pg.evaluate(bar)
        await pg.evaluate("(() => { const pos = $('#lhPos'); if (pos && pos.tagName === 'DETAILS') pos.open = true; return 0; })()")
        ok = ok and await type_num("$('#lhPos input[id$=\"-delay\"]').closest('.sl').querySelector('.num')", 'delay', dw)
        s4 = await pg.evaluate("({ d: state.layers[1].delay, other: state.layers[0].delay, cell: +(document.querySelector('#layerCard [data-st=\"1\"]') || {}).value })")
        s4['b0'] = b0; s4['b1'] = await pg.evaluate(bar)
        info['4 调层延迟'] = s4
        if not ok or abs(s4['d'] - dw) > 1e-6: bad.append(f'第 4 步开始时间没改到：{s4}（应 {dw}）')
        if s4['b0'] is None or s4['b1'] is None or not s4['b1'] > s4['b0']: bad.append(f'第 4 步时间轴上金锦层的条没往后挪：{s4}')
        # 5 撤销 / 重做
        await pg.mouse.click(700, 420); await pg.keyboard.press('Control+z'); await idle(pg); await pg.wait_for_timeout(250)
        u = await pg.evaluate("({ d: state.layers[1].delay, life: layerEntryOf(state.layers[1]).P.sparkLife, col: state.layers[1].stages[0][1] })")
        await pg.keyboard.press('Control+Shift+z'); await idle(pg); await pg.wait_for_timeout(250)
        r = await pg.evaluate("({ d: state.layers[1].delay, life: layerEntryOf(state.layers[1]).P.sparkLife, col: state.layers[1].stages[0][1] })")
        info['5 撤销 / 重做'] = {'撤销': u, '重做': r}
        if abs(u['d'] - d0) > 1e-6 or abs(u['life'] - want) > 1e-6 or u['col'] != s3['col']: bad.append(f'第 5 步撤销一次没正好回一步（开始时间回去、寿命 / 颜色还在）：{u}')
        if abs(r['d'] - dw) > 1e-6 or abs(r['life'] - want) > 1e-6: bad.append(f'第 5 步重做没回来：{r}')
        # 6 保存刷新
        ok = await click("$('#abSave')", 'save'); await pg.wait_for_timeout(1200); await idle(pg)
        saved = await pg.evaluate("({ id: lib.my && lib.my.id, life: layerEntryOf(state.layers[1]).P.sparkLife, d: state.layers[1].delay, col: state.layers[1].stages[0][1], n: state.layers.length })")
        info['6 保存'] = saved
        if not ok or not saved['id']: bad.append('第 6 步保存没存成我的效果')
        else:
            await pg.reload(wait_until='load'); await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
            await pg.evaluate(REC if REAL else FAKE); await pg.evaluate(ask_stub('主链路检查')); await pg.evaluate("setAutoBake(false); 0")
            await pg.evaluate(f"(() => {{ window.__opening = true; Promise.resolve(openMyEffect({json.dumps(saved['id'])})).finally(() => window.__opening = false); return 0; }})()"); await idle(pg); await pg.wait_for_timeout(600); await idle(pg)
            again = await pg.evaluate("({ id: lib.my && lib.my.id, life: layerEntryOf(state.layers[1]).P.sparkLife, d: state.layers[1].delay, col: state.layers[1].stages[0][1], n: state.layers.length })")
            info['6 刷新重开'] = again
            if again != saved: bad.append(f'第 6 步刷新重开和保存的不一样：{saved} → {again}')
        # 7 烘焙回放
        await pg.evaluate("state.playing = false; 0")
        ok = await click("document.querySelector('.viewbar [data-view=\"export\"]')", 'engine')
        await pg.mouse.click(700, 420); await pg.keyboard.press('b'); await pg.wait_for_timeout(500); await idle(pg)
        if REAL: await pg.wait_for_timeout(1500); await idle(pg)
        s7 = await pg.evaluate("""(() => { const ls = state.layers.map(L => layerEntryOf(L)); return { view: state.view, stale: bakeStale(), layers: ls.map(e => ({ baked: !!(e && e.bake), old: layerStale(e) })),
          life: ls[1] && ls[1].bake ? (ls[1].bake.srcP || ls[1].bake.P || {}).sparkLife : null, want: ls[1] && ls[1].P.sparkLife }; })()""")
        info['7 烘焙回放'] = s7
        if not ok or s7['view'] != 'export': bad.append(f"第 7 步没切到引擎回放：{s7['view']}")
        if s7['stale'] or any(not x['baked'] or x['old'] for x in s7['layers']) or s7['life'] is None or abs(s7['life'] - s7['want']) > 1e-6: bad.append(f'第 7 步烘焙后贴图不是最新参数 / 还标着旧：{s7}')
        # 8 导出 PC / 手机：截下素材包（不真下载）
        await pg.evaluate("""(() => { window.__zip = null; window.__mz = makeZip; window.__dl = download; makeZip = async files => { window.__zip = files.map(([n, d]) => [n, n.endsWith('.json') ? new TextDecoder().decode(d) : d.length || d.byteLength || 0]); return new Blob([]); }; download = () => 0; return 0; })()""")
        if not REAL:     # 云端假烘焙没有真贴图：只把「贴图编码成 PNG」「手机版重烘」换成占位，导出流程（每层是不是最新、PC / 手机 cascade、命名）照旧走
            await pg.evaluate("(() => { window.__tf = texFiles; window.__bm = bakeMobileFor; texFiles = async (b, name) => [[TN(name, 'Seq', b.meta && b.meta.L, 1) + '.png', new Uint8Array(4)]]; bakeMobileFor = async b => b; return 0; })()")
        ok = await click("$('#abExportPack')", 'export'); st8 = []
        for _ in range(240 if REAL else 60):
            if await pg.evaluate("!!window.__zip"): break
            st8.append(await pg.evaluate("$('#status').textContent")); await pg.wait_for_timeout(500)
        info['8 导出时的提示'] = [x for x in dict.fromkeys(st8) if x][:3]
        s8 = await pg.evaluate("""(() => { const z = window.__zip || [], nm = z.map(f => f[0]); makeZip = window.__mz; download = window.__dl; if (window.__tf) { texFiles = window.__tf; bakeMobileFor = window.__bm; }
          const pc = z.find(f => /\\/cascade\\.json$/.test(f[0])), mb = z.find(f => /\\/cascade_mobile\\.json$/.test(f[0])), J = f => { try { return JSON.parse(f[1]); } catch (e) { return null; } };
          const e2 = layerEntryOf(state.layers[1]);
          return { status: $('#status').textContent, busy: $('#busy').hidden ? '' : $('#busyText').textContent, job: busyJob.on, idle: typeof wbIdle === 'function' ? wbIdle() : null, dis: $('#abExportPack').disabled, files: nm.length, pc: !!pc, mobile: !!mb, png: nm.filter(n => n.endsWith('.png')).length, pcEm: pc && J(pc) ? (J(pc).emitters || []).length : 0, mbEm: mb && J(mb) ? (J(mb).emitters || []).length : 0,
            hiki: nm.some(n => /_Hiki_/.test(n)), nishiki: nm.some(n => /_Nishiki_/.test(n)), life: e2 && e2.bake ? (e2.bake.srcP || e2.bake.P || {}).sparkLife : null, want: e2 && e2.P.sparkLife }; })()""")
        info['8 导出 PC / 手机'] = s8
        if not ok or not s8['files']: bad.append('第 8 步点「导出素材包」没出包')
        elif not (s8['pc'] and s8['mobile'] and s8['pcEm'] >= 2 and s8['mbEm'] >= 1 and s8['png'] >= 2 and (not REAL or (s8['hiki'] and s8['nishiki']))): bad.append(f'第 8 步素材包不全（PC + 手机 cascade、两层贴图）：{s8}')
        elif s8['life'] is None or abs(s8['life'] - s8['want']) > 1e-6: bad.append(f'第 8 步导出拿的不是最新参数的贴图：{s8}')
        if saved.get('id'): await pg.evaluate(f"(() => {{ myDelete({json.dumps(saved['id'])}); return 0; }})()")     # 收拾：删掉检查用的效果
    finally:
        await ctx.close()
    if errs: bad.append('页面错误：' + errs[0][:160])
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)


W17_JS = r"""async () => {
  // 4.9.20（用户 10-06 21:12「不要单独只为这个尾缀添加功能，切换的时候有好几张贴图，就都可以切换」）：贴图 / 流转能切这一层导出的每一张序列
  // 假烘焙没有真贴图：给每张序列挂一张 4×4 的小贴图（Target），再造「分两张 + 星头 / 尾迹」「循环层 + 消散 + 远段」两种，看清单、按钮、HUD、帧号都跟着这一张
  const out = {}, bad = [], wait = ms => new Promise(r => setTimeout(r, ms));
  const tex = () => new Target(4, 4, gl.RGBA8);
  const hud = () => { loop(performance.now()); return $('#hud').textContent; };
  const btns = () => [...$('#texSeg').querySelectorAll('button')].map(b => b.textContent);
  const click = async label => { const b = [...$('#texSeg').querySelectorAll('button')].find(x => x.textContent === label); if (!b) return false; b.click(); await wait(30); return true; };
  const baked = async prev => { for (let i = 0; i < 100 && (!state.bake || state.bake === prev || state.baking); i++) await wait(100); };
  await openType('kiku'); await baked(); state.playing = false;
  // 1 大面片分两张、星头 / 尾迹分开（导出是 A_Head / A_Tail / B_Head / B_Tail 四张）
  const b0 = state.bake, b1 = { ...b0, meta: { ...b0.meta, t0: b0.meta.t0 + 1 }, next: null };
  b0.head = tex(); b0.tail = tex(); b1.head = tex(); b1.tail = tex(); b0.next = b1; b0.N = b0.NH = b1.N = b1.NH = 4;
  selectStageView('atlas'); await wait(50); state.t = 0.2; hud();
  out.master = { list: btns(), shown: !$('#texSeg').hidden };
  const want1 = ['自动（跟时间）', '第 1 张 · 星头', '第 1 张 · 尾迹', '第 2 张 · 星头', '第 2 张 · 尾迹'];
  if (JSON.stringify(out.master.list) !== JSON.stringify(want1) || !out.master.shown) bad.push('分两张 + 星头 / 尾迹时清单不对：' + JSON.stringify(out.master));
  await click('第 2 张 · 尾迹'); out.master.pick = { hud: hud().slice(0, 20), sheet: state.texSheetNow && state.texSheetNow.key, isTail: state.texSheetNow && state.texSheetNow.show === b1.tail };
  if (!out.master.pick.isTail || !/^贴图流转 · 第 2 张 · 尾迹/.test(out.master.pick.hud)) bad.push('点「第 2 张 · 尾迹」没换过去：' + JSON.stringify(out.master.pick));
  await click('自动（跟时间）'); state.t = 0.2; hud(); out.master.auto0 = state.texSheetNow.key; state.t = b1.meta.t0 + 0.1; hud(); out.master.auto1 = state.texSheetNow.key;
  if (out.master.auto0 !== 'p0h' || out.master.auto1 !== 'p1h') bad.push('「自动」没跟着时间换张：' + JSON.stringify(out.master));
  // 流转动画也按这一张
  await click('第 1 张 · 尾迹'); selectStageView('flow'); await wait(30); state.t = 0.3; out.master.flow = hud().slice(0, 40);
  if (!/第 1 张 · 尾迹/.test(out.master.flow)) bad.push('流转动画没写 / 没用选中的那张：' + out.master.flow);
  // 2 循环层 + 消散 + 远段（升空尾缀、地面循环这类的几张；远段有自己的开始时刻和帧号曲线）
  const m = b0.meta, loopB = { ...b0, form: 'emitset', next: null, tail: null, head: tex(), meta: { ...m, loop: true, duration: 2.5 } };
  loopB.fades = [{ head: tex(), N: 4, NH: 4, P: b0.P, meta: { ...m, loop: false, t0: 4, duration: 2, keys: [[0, 0], [1, m.L.F]] } }];
  loopB.far = { head: tex(), N: 4, NH: 4, P: b0.P, meta: { ...m, loop: false, t0: 0.8, duration: 6, keys: [[0, 0], [1, m.L.F]] } };
  state.bake = loopB; selectStageView('atlas'); await wait(30); state.texSheet = ''; state.t = 1; hud();
  out.emitset = { list: btns() };
  if (JSON.stringify(out.emitset.list) !== JSON.stringify(['自动（跟时间）', '循环层', '消散', '远段'])) bad.push('循环层 + 消散 + 远段时清单不对：' + JSON.stringify(out.emitset.list));
  await click('远段'); state.t = 0.5; out.emitset.before = { hud: hud().slice(0, 30), f: frameIdx(state.texSheetNow.b.meta, state.t - state.texSheetNow.b.meta.t0) };
  state.t = 3.8; out.emitset.mid = { f: frameIdx(state.texSheetNow.b.meta, state.t - state.texSheetNow.b.meta.t0), key: state.texSheetNow.key };
  if (out.emitset.mid.key !== 'far' || out.emitset.before.f !== -1 || !(out.emitset.mid.f > 0)) bad.push('选「远段」没按远段自己的开始时刻 / 帧号走：' + JSON.stringify(out.emitset));
  if (!/^贴图流转 · 远段/.test(out.emitset.before.hud)) bad.push('选「远段」HUD 没写：' + out.emitset.before.hud);     // 4.9.35 贴图 + 流转合成一页，HUD 先写看的是哪一张
  // 3 只有一张序列：不显示切换
  { const prev = state.bake; await openType('botan'); await baked(prev); } state.bake.head = tex(); state.bake.N = state.bake.NH = 4; state.texSheet = ''; selectStageView('atlas'); await wait(30); hud();
  out.single = { shown: !$('#texSeg').hidden, list: btns() };
  if (out.single.shown) bad.push('只有一张贴图时也显示了切换：' + JSON.stringify(out.single));
  selectStageView('live');
  return { ok: !bad.length, bad, out };
}"""


async def w17(pg):
    """4.9.20 贴图 / 流转：这一层导出的每一张序列都能切（分张、星头 / 尾迹、循环层 / 消散 / 远段），自动跟时间，流转动画跟着选的那张"""
    r = await pg.evaluate(W17_JS)
    return r['ok'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)


W18_JS = r"""async () => {
  // 4.9.21（用户 10-06 21:51「就按照之前的全局风格帮我加回去，放在效果层里，类似一个最后的全局调整」，选「每层一份」）
  const out = {}, bad = [], wait = ms => new Promise(r => setTimeout(r, ms)), key = it => Array.isArray(it) ? it[0] : it.sel;
  const idle = async () => { for (let i = 0; i < 300 && !(window.__fw.idle() && !state.baking && !(state.layerQueue && state.layerQueue.size) && $('#busy').hidden); i++) await wait(50); };
  const modOf = (g, m) => [...document.querySelectorAll(`section.egrp[data-g="${g}"] > details.mod`)].find(d => d._mod === m);
  const setNum = async (row, v) => { const n = row.querySelector('.num'); n.focus(); n.value = String(v); n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })); n.blur(); await wait(450); await idle(); };
  state.playing = false; selectEmitTab('效果'); await wait(30);
  // 1 位置：效果 › 整体调整，照 4.1.1 全局风格层 9 项的顺序
  const mod = modOf('效果', '整体调整'); out.where = !!mod && !mod.hidden;
  if (!mod) { bad.push('「效果」里没有「整体调整」模块'); return { ok: false, bad, out }; }
  const rows = [...mod.children].filter(r => r._lab != null && r._applies && !r._randOf && !r.hidden);
  out.rows = rows.map(r => r._lab);
  const want = ['tempo', 'adjTailLen', 'adjSparkSize', 'adjSpread', 'adjHeadSize', 'adjSparkBright', 'adjTwinkle', 'tailJit', 'tailShoulder', 'headTear'];     // 4.9.30 第一行加了「节奏」（对话框新花型）
  if (JSON.stringify(rows.map(r => key(r._it))) !== JSON.stringify(want)) bad.push('整体调整的 10 项不对 / 顺序不对：' + JSON.stringify(rows.map(r => key(r._it))));
  const order = (EMIT_DEF['效果'] || {}).mods || []; out.modOrder = order; if (order[order.length - 1] !== '整体调整') bad.push('整体调整不是「效果」最后一个模块：' + JSON.stringify(order));
  modSetOpen(mod, false); modSummarySync(); out.sum0 = (mod.querySelector('.msum') || {}).textContent;
  if (out.sum0 !== '原样') bad.push('全是原样时摘要应写「原样」：' + out.sum0);
  // 2 全是 1：fxP 原样返回（逐像素不变的前提）
  const P0 = state.P, life0 = +P0.sparkLife, emb0 = +P0.emberLife, ref = { m: measure(P0), end: layerEndOf(P0), tail: sparkTailEnd(P0) };
  if (fxP(P0) !== P0) bad.push('全是 1 时 fxP 没原样返回');
  // 3 面板上把尾长改成 2
  modSetOpen(mod, true); await setNum(rows.find(r => key(r._it) === 'adjTailLen') || rows[0], 2);     // 4.9.30 第一行是节奏，按键找尾长
  out.stored = { adj: state.P.adjTailLen, life: state.P.sparkLife, emb: state.P.emberLife };
  if (+state.P.adjTailLen !== 2) bad.push('面板改尾长没存进参数：' + JSON.stringify(out.stored));
  if (Math.abs(state.P.sparkLife - life0) > 1e-9 || Math.abs(state.P.emberLife - emb0) > 1e-9) bad.push('改尾长把存的火花 / 余烬寿命改了（应该只在最后乘）：' + JSON.stringify(out.stored));
  const F = fxP(state.P); out.eff = { life: F.sparkLife, emb: F.emberLife, adj: F.adjTailLen };
  if (Math.abs(F.sparkLife - 2 * life0) > 1e-9 || Math.abs(F.emberLife - 2 * emb0) > 1e-9 || F.adjTailLen !== 1) bad.push('fxP 没把火花、余烬寿命都乘 2（或倍数没写回 1）：' + JSON.stringify(out.eff));
  if (fxP(F) !== F) bad.push('乘完的那份再 fxP 又乘了一次');
  if (fxP(state.P) !== F) bad.push('同一份参数 fxP 每次给新对象（实时模拟会每帧重建）');
  { const sim = new Sim(state.P); out.sim = sim.P.sparkLife; if (Math.abs(sim.P.sparkLife - 2 * life0) > 1e-9) bad.push('模拟（Sim）没乘尾长：' + out.sim); }
  { const m1 = measure(state.P); out.measure = [+(ref.m.y1 - ref.m.y0).toFixed(2), +(m1.y1 - m1.y0).toFixed(2), +(ref.m.x1 - ref.m.x0).toFixed(2), +(m1.x1 - m1.x0).toFixed(2)];
    if (JSON.stringify(m1.prof) === JSON.stringify(ref.m.prof) && out.measure[0] === out.measure[1] && out.measure[2] === out.measure[3]) bad.push('测量（取景 / 帧计划用的）没跟着尾长变'); }
  out.end = [+ref.end.toFixed(2), +layerEndOf(state.P).toFixed(2)]; if (!(out.end[1] > out.end[0])) bad.push('层结束时刻没跟着尾长变长：' + JSON.stringify(out.end));
  out.tail = [+ref.tail.toFixed(2), +sparkTailEnd(state.P).toFixed(2)]; if (!(out.tail[1] > out.tail[0] + 0.1)) bad.push('最后一批火花灭完的时刻没跟着变：' + JSON.stringify(out.tail));
  const last = window.__bakes[window.__bakes.length - 1]; out.baked = last && { life: last.P.sparkLife, adj: last.P.adjTailLen };
  if (!last || Math.abs(last.P.sparkLife - 2 * life0) > 1e-6 || +last.P.adjTailLen !== 1) bad.push('烘焙用的参数没乘尾长：' + JSON.stringify(out.baked));
  if (window.__realBake && !/fxP\(/.test(String(window.__realBake))) bad.push('真烘焙入口没乘整体调整');
  // 实时模拟：画一帧，实时的那份参数是乘完的
  selectStageView('live'); state.t = 0.5; loop(performance.now()); out.live = live.A40 && live.A40.P && live.A40.P.sparkLife;
  if (!(Math.abs(out.live - 2 * life0) < 1e-9)) bad.push('实时模拟没乘尾长：' + out.live);
  { loop(performance.now()); const s0 = { P: live.A40.P, R: live.A40.R40 }; loop(performance.now()); if (live.A40.P !== s0.P || live.A40.R40 !== s0.R) bad.push('参数没变时实时模拟每帧重建'); }
  // 火花 › 寿命行显示的还是存的原值
  selectEmitTab('火花'); await wait(30); { const lr = panelRows.find(([r, it]) => key(it) === 'sparkLife'); out.lifeRow = lr && +lr[0].querySelector('.num').value; if (!(Math.abs(out.lifeRow - life0) < 0.011)) bad.push('「火花 › 寿命」显示的不是存的原值：' + out.lifeRow); }
  selectEmitTab('效果'); await wait(30); modSetOpen(mod, false); modSummarySync(); out.sum1 = (mod.querySelector('.msum') || {}).textContent;
  if (!/^尾长 2/.test(out.sum1 || '')) bad.push('摘要没写改过的那项：' + out.sum1);
  // 其余几项：星头大小 → 光点直径；尾缀粗细 → 火花大小（余烬按比例）；闪烁乘完最多 1
  { const Q = { ...state.P, adjTailLen: 1, adjHeadSize: 2, adjSparkSize: 1.5, adjSpread: 0.5, adjSparkBright: 2, adjTwinkle: 3 }, G = fxP(Q);
    out.others = { head: [P0.headSize, G.headSize], size: [P0.sparkSize, G.sparkSize], spread: [P0.sparkSpread, G.sparkSpread], bright: [P0.sparkBright, G.sparkBright], tw: [P0.twinkle, G.twinkle] };
    if (Math.abs(G.headSize - 2 * P0.headSize) > 1e-9 || Math.abs(G.sparkSize - 1.5 * P0.sparkSize) > 1e-9 || Math.abs(G.sparkSpread - 0.5 * P0.sparkSpread) > 1e-9 || Math.abs(G.sparkBright - 2 * P0.sparkBright) > 1e-9) bad.push('星头大小 / 尾缀粗细 / 散布 / 亮度没按倍数乘：' + JSON.stringify(out.others));
    if (!(G.twinkle <= 1) || G.emberSize !== P0.emberSize) bad.push('闪烁乘完超过 1，或余烬大小（比例）被改了：' + JSON.stringify(out.others));
    try { const M = normalizeM({}, 'kiku'), fm = measure(P0), L = { scale: 1, rate: 1, delay: 0 }, a = dotsES(L, P0, M, fm), b = dotsES(L, Q, M, fm); out.dots = [a.size[0], b.size[0]];
      if (!(Math.abs(b.size[0] - 2 * a.size[0]) < 1e-6)) bad.push('导出成 GPU 光点时光点直径没乘星头大小：' + JSON.stringify(out.dots)); } catch (e) { bad.push('光点：' + e.message); } }
  // 撤销：回到 1
  await undoStep(-1); await wait(300); await idle(); out.undo = state.P.adjTailLen; if (+state.P.adjTailLen !== 1) bad.push('撤销没把尾长回到 1：' + out.undo);
  return { ok: !bad.length, bad, out };
}"""

W18_COMBO_JS = r"""async () => {
  // 多层：每层一份，改第 1 层的整体调整，第 2 层不动、实时模拟里只有第 1 层乘
  const out = {}, bad = [], wait = ms => new Promise(r => setTimeout(r, ms)), key = it => Array.isArray(it) ? it[0] : it.sel;
  const idle = async () => { for (let i = 0; i < 300 && !(window.__fw.idle() && !state.baking && !(state.layerQueue && state.layerQueue.size) && $('#busy').hidden); i++) await wait(50); };
  state.playing = false; selectComboLayer(0); await wait(50); selectEmitTab('效果'); await wait(30);
  const e0 = layerEntryOf(state.layers[0]), e1 = layerEntryOf(state.layers[1]);
  const x = panelRows.find(([r, it]) => key(it) === 'adjSparkBright'); if (!x) { bad.push('多层第 1 层没有「火花亮度」整体调整'); return { ok: false, bad, out }; }
  modSetOpen(x[0].closest('details'), true); const n = x[0].querySelector('.num'); n.focus(); n.value = '2'; n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })); n.blur(); await wait(450); await idle();
  out.l0 = e0.P.adjSparkBright; out.l1 = e1.P.adjSparkBright;
  if (+e0.P.adjSparkBright !== 2 || +(e1.P.adjSparkBright == null ? 1 : e1.P.adjSparkBright) !== 1) bad.push('每层一份：改第 1 层带动了第 2 层（或没存进第 1 层）：' + JSON.stringify(out));
  if (fxP(e1.P) !== e1.P) bad.push('第 2 层全是 1 也被改了');
  selectStageView('live'); state.t = 1; loop(performance.now());
  out.live = [live.combo0 && live.combo0.P && live.combo0.P.sparkBright, live.combo1 && live.combo1.P && live.combo1.P.sparkBright, e0.P.sparkBright, e1.P.sparkBright];
  if (!(Math.abs(out.live[0] - 2 * e0.P.sparkBright) < 1e-9) || out.live[1] !== e1.P.sparkBright) bad.push('多层实时模拟没按每层自己的整体调整：' + JSON.stringify(out.live));
  await undoStep(-1); await wait(300); await idle(); out.undo = e0.P.adjSparkBright; if (+e0.P.adjSparkBright !== 1) bad.push('多层撤销没回到 1：' + out.undo);
  // 地面 / 升空：没有这个模块
  for (const t of ['fountain', 'trailM']) { await openType(t); await wait(100); selectEmitTab('效果'); await wait(30);
    const d = [...document.querySelectorAll('section.egrp[data-g="效果"] > details.mod')].find(d => d._mod === '整体调整');
    const on = !!d && !d.hidden && [...d.children].some(r => r._applies && !r.hidden); out[t] = on; if (on) bad.push(t + ' 也显示了整体调整（只管空中花型）'); }
  return { ok: !bad.length, bad, out };
}"""


async def w18(pg):
    """4.9.21 效果 › 整体调整：每层一份、叠在最后、实时 / 测量 / 烘焙 / 光点都跟着、默认原样"""
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate(W18_JS)
    await open_effect(pg, 'hiki_nishiki')
    r2 = await pg.evaluate(W18_COMBO_JS)
    bad = r['bad'] + r2['bad']
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps({**r['out'], 'combo': r2['out']}, ensure_ascii=False)[:1400]


W19_JS = r"""async (rec) => {
  // 4.9.21（用户 10-06 21:51「为什么有些效果我调了入点，引擎回放与UE中会先从下往上生长这样跳一下」，选「一律绕爆点」）
  const out = {}, bad = [], wait = ms => new Promise(r => setTimeout(r, ms));
  const baked = async prev => { for (let i = 0; i < 100 && (!state.bake || state.bake === prev || state.baking); i++) await wait(100); };
  // 1 选项删了
  if (SCHEMA.some(s => s.items.some(it => it.sel === 'prePivot'))) bad.push('「放大的中心」选项还在');
  if ('prePivot' in BASE) bad.push('BASE 里还有 prePivot');
  // 2 导出：设了入点 + 从小放大 → Pivot Offset 绕爆点、Initial Location 0
  { const prev = state.bake; await openType('kiku'); await baked(prev); } state.playing = false;
  { const prev = state.bake; state.P.cutIn = 0.3; state.P.preRoll = 1; onParam(); await baked(prev); }
  // 假烘焙按自动入点排帧：这里照 bakeMaster 按入点 0.3 s 重排第一张的帧计划，再算入点前放大（和 bakeMaster 同一个函数）
  const b = state.bake, fm = measure(b.P), pl0 = plan(b.P, fm, +b.P.cutIn), pg0 = typeof splitPlan40 === 'function' ? splitPlan40(pl0)[0] : pl0;
  b.meta = { ...b.meta, ...pg0 }; b.next = null; const m = b.meta; m.pre = preRollOf(b.P, fm, m.t0);
  out.pre = m.pre && { from: m.pre.from, dur: +m.pre.dur.toFixed(3), s0: m.pre.s0, pivot: m.pre.pivot, cy: +m.cy.toFixed(2), t0: m.t0 };
  if (!m.pre) { bad.push('设了入点 0.3 s 没有入点前放大'); return { ok: false, bad, out }; }
  if ('pivot' in m.pre) bad.push('入点前放大还带「中心」选择');
  if (!(Math.abs(m.cy) > 1)) bad.push('菊的面片中心应在爆点下面（cy 不是 0），这条查不出来：' + m.cy);
  const cj = fwlCascade('T', b, state.M), e = cj.emitters[0], loc = (e.modules.find(q => q.m === 'InitialLocation') || {}).StartLocation;
  out.export = { pivot: e.required.pivot_offset, loc: loc && loc.const, notes: (e.notes || []).join(' ').slice(0, 80), sizeByLife: e.modules.filter(q => q.m === 'SizeByLife').length };
  const py = -0.5 - m.cy / m.Wh;
  if (!e.required.pivot_offset || Math.abs(e.required.pivot_offset[1] - py) > 1e-3 || e.required.pivot_offset[0] !== -0.5) bad.push('入点前放大没写 Pivot Offset（爆点）：' + JSON.stringify(out.export));
  if (!loc || loc.const[2] !== 0) bad.push('Initial Location Z 应为 0（爆点靠 Pivot Offset 对齐）：' + JSON.stringify(out.export));
  if (!/绕爆点/.test(out.export.notes)) bad.push('说明没写绕爆点：' + out.export.notes);
  if (out.export.sizeByLife !== 1) bad.push('入点前放大应有一条 Size By Life：' + out.export.sizeByLife);
  // 没设入点的同一个效果：Pivot Offset 一样
  { const b2 = { ...b, meta: { ...m, pre: null } }, e2 = fwlCascade('T', b2, state.M).emitters[0]; out.noCut = e2.required.pivot_offset;
    if (JSON.stringify(e2.required.pivot_offset) !== JSON.stringify(e.required.pivot_offset)) bad.push('设入点和没设入点的 Pivot Offset 不一样：' + JSON.stringify([out.noCut, out.export.pivot])); }
  // 3 引擎回放：入点前那段绕爆点放大（面片坐标原点 = 爆点）
  { const r = preRect([-10, -30, 10, 2], 0.5); out.rect = r; if (JSON.stringify(r) !== JSON.stringify([-5, -15, 5, 1])) bad.push('回放的入点前放大不是绕爆点：' + JSON.stringify(r)); }
  { const tex = () => new Target(4, 4, gl.RGBA8); for (let s = b; s; s = s.next) { s.head = tex(); s.N = s.NH = 4; }
    selectStageView('export'); await wait(30); state.t = (m.pre.from + m.t0) / 2; loop(performance.now()); out.hud = $('#hud').textContent.slice(0, 40);
    if (!/入点前.*绕爆点/.test(out.hud)) bad.push('引擎回放入点前 HUD 没写绕爆点：' + out.hud); selectStageView('live'); }
  // 4 存过「面片中心」的效果：打开时提示，参数里不再有 prePivot
  if (rec) { myPut({ id: rec.id, name: rec.name, created: '', updated: '', links: rec.links || [], snap: rec.snap }); await openMyEffect(rec.id); await wait(500);
    out.mig = { shown: !$('#migNote').hidden, text: $('#migNoteText').textContent };
    if (!out.mig.shown || !/入点前放大的中心/.test(out.mig.text) || !/面片中心/.test(out.mig.text)) bad.push('打开存过「面片中心」的效果没提示：' + JSON.stringify(out.mig).slice(0, 300));
    const Ps = state.tab === 'combo' ? state.layers.map(L => (layerEntryOf(L) || {}).P).filter(Boolean) : [state.P];
    if (Ps.some(P => 'prePivot' in P)) bad.push('打开后参数里还有 prePivot');
    out.mig.text = out.mig.text.slice(0, 120); $('#migNoteOk').click(); }
  else bad.push('找不到存过「面片中心」+ 入点的样本（analysis/我的配方）');
  return { ok: !bad.length, bad, out };
}"""


async def w19(pg):
    """4.9.21 入点前放大一律绕爆点：删「放大的中心」、导出 Pivot Offset、回放同口径、旧存档提示"""
    import glob
    rec = None
    for f in sorted(glob.glob(str(ROOT / 'analysis' / '我的配方' / 'my_*' / '*.json'))):
        try:
            d = json.load(open(f, encoding='utf-8'))
            if any(float(L['P'].get('cutIn') or 0) > 0 and str(L['P'].get('prePivot')) == '0' and str(L['P'].get('preRoll', 1)) != '0' for L in d['snap']['layers']): rec = d; break
        except Exception: pass
    r = await pg.evaluate(W19_JS, rec)
    return r['ok'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)[:1200]


W20_JS = r"""async () => {
  // 4.9.24（用户 10-07 09:20「是Translucent,透明度有接a通道，color over life就可以控制alpha曲线，颜色倍增给我都加上去吧，Scale Color/Life这个」）
  const out = {}, bad = [], wait = ms => new Promise(r => setTimeout(r, ms));
  const baked = async prev => { for (let i = 0; i < 100 && (!state.bake || state.bake === prev || state.baking); i++) await wait(100); };
  // 1 拆法：RGB 每个点的最大通道 = M（不变暗），Alpha 0–1，RGB × Alpha = 原来那条
  const chkEm = (x, tag) => { const j = esFwlEmitter(x, false, 1), c = j.modules.find(q => q.m === 'ColorOverLife'); if (!c) return tag + ' 没有 Color Over Life';
    const rgb = c.ColorOverLife.curve || x.col.map(([u]) => [u, c.ColorOverLife.const]), a = c.AlphaOverLife.curve || x.col.map(([u]) => [u, c.AlphaOverLife.const]);
    const M = Math.max(...rgb.map(k => Math.max(...k[1]))), P = Math.max(...x.col.map(k => Math.max(...k[1])));
    if (!(P > 0)) return null;
    if (rgb.some(k => Math.max(...k[1]) < M * 0.999)) return tag + ' RGB 随寿命变暗了（半透明材质会发黑）';
    if (a.some(k => !(k[1] >= 0 && k[1] <= 1))) return tag + ' Alpha 超出 0–1';
    for (let i = 0; i < x.col.length; i++) { const u = x.col[i][0], ra = esCurve(rgb, u), aa = esCurve(a, u), want = x.col[i][1];
      for (let ch = 0; ch < 3; ch++) if (Math.abs(ra[ch] * aa - want[ch]) > 2e-3 * Math.max(1, P)) return `${tag} RGB × Alpha ≠ 原亮度（u ${u}，${ch}：${(ra[ch] * aa).toFixed(4)} vs ${want[ch].toFixed(4)}）`; }
    return null; };
  { const e = entryById('RT6L'), d = defaultsFor(e.base), P = derive({ ...d.P, ...e.p }), ES = rtBuildES(P); out.rt6 = ES.emitters.map(x => x.name);
    for (const x of ES.emitters) { const m = chkEm(x, 'RT6 ' + x.name); if (m) bad.push(m); } }
  // 光点：点灭方波在 Alpha 里（RGB 常数），亮灭次数和以前 RGB 方波一样
  { const d = defaultsFor('strobe', 40, true), P = derive({ ...structuredClone(d.P), type: 'strobe' }), e = dotsES({ ...d.M, delay: 0, rate: 1, scale: 1 }, P, d.M, null), m = chkEm(e, '点灭光点'); if (m) bad.push(m);
    const j = esFwlEmitter(e, false, 1), c = j.modules.find(q => q.m === 'ColorOverLife'), a = c.AlphaOverLife.curve || [];
    let n = 0; for (let i = 1; i < a.length; i++) if (Math.max(a[i][1], a[i - 1][1]) > 0.02 && Math.abs(a[i][1] - a[i - 1][1]) > 0.5 * Math.max(a[i][1], a[i - 1][1])) n++;
    out.strobe = { flips: n, rgbConst: !!c.ColorOverLife.const }; if (n < 10) bad.push('点灭光点的 Alpha 没有亮灭：' + JSON.stringify(out.strobe)); }
  // 2 Scale Color/Life：每个出口的每个发射器都有，缺省 1 / 1
  const scaleOk = (j, tag) => { const miss = j.emitters.filter(x => { const q = x.modules.filter(y => y.m === 'ColorScaleOverLife'); return q.length !== 1 || JSON.stringify(q[0].ColorScaleOverLife) !== JSON.stringify({ const: [1, 1, 1] }) || JSON.stringify(q[0].AlphaScaleOverLife) !== JSON.stringify({ const: 1 }); });
    out[tag] = { n: j.emitters.length, miss: miss.map(x => x.name) }; if (!j.emitters.length || miss.length) bad.push(tag + ' 有发射器没有 Scale Color/Life（或不是 1）：' + JSON.stringify(out[tag])); };
  { const prev = state.bake; await openType('kiku'); await baked(prev); scaleOk(fwlCascade('T', state.bake, state.M), '单层大面片'); }
  return { ok: !bad.length, bad, out };
}"""

W20_COMBO_JS = r"""async () => {
  const out = {}, bad = [];
  // 多层：第 1 层出 GPU 光点，其余序列；所有发射器都有 Scale Color/Life
  state.layers[0].out = { pc: 'dots', mobile: 'seq' };
  const items = comboEntries(state.layers.map(L => ({ L, b: layerEntryOf(L).bake })), false), j = fwlCombo('T', items, false);
  const miss = j.emitters.filter(x => x.modules.filter(y => y.m === 'ColorScaleOverLife').length !== 1).map(x => x.name), dot = j.emitters.find(x => /Dots$/.test(x.name));
  out.combo = { n: j.emitters.length, miss, dot: dot && dot.name };
  if (miss.length || !dot) bad.push('多层 cascade.json：缺 Scale Color/Life 或没有光点发射器：' + JSON.stringify(out.combo));
  if (dot) { const c = dot.modules.find(q => q.m === 'ColorOverLife'), rgb = c.ColorOverLife.curve || [[0, c.ColorOverLife.const]], M = Math.max(...rgb.map(k => Math.max(...k[1])));
    if (rgb.some(k => Math.max(...k[1]) < M * 0.999)) bad.push('多层光点 RGB 随寿命变暗'); }
  delete state.layers[0].out;
  return { ok: !bad.length, bad, out };
}"""


async def w20(pg):
    """4.9.24 GPU / 软圆点颜色写法 + Scale Color/Life"""
    r = await pg.evaluate(W20_JS)
    await open_effect(pg, 'hiki_nishiki')
    r2 = await pg.evaluate(W20_COMBO_JS)
    bad = r['bad'] + r2['bad']
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps({**r['out'], **r2['out']}, ensure_ascii=False)[:1200]


W21_JS = r"""async () => {
  const out = {}, bad = [], wait = ms => new Promise(r => setTimeout(r, ms));
  const baked = async prev => { for (let i = 0; i < 100 && (!state.bake || state.bake === prev || state.baking); i++) await wait(100); };
  const hud = () => { loop(performance.now()); return $('#hud').textContent; };
  { const prev = state.bake; await openType('kiku'); await baked(prev); } state.playing = false;
  // 1 产物表：单层一行，PC / 手机两个选择；改 PC = 单束不重烘、进撤销
  toggleDeliv(true); await wait(30);
  const pc = $('#delivView select[data-prod=pc]'), mob = $('#delivView select[data-prod=mobile]');
  out.table = { pc: !!pc, mob: !!mob, opts: pc ? [...pc.options].map(o => o.value) : [] };
  if (!pc || !mob || out.table.opts.join() !== 'seq,unit,dots,frame,off') bad.push('交付清单没有产物表（PC / 手机）：' + JSON.stringify(out.table));
  const g0 = state.gen; pc.value = 'unit'; pc.dispatchEvent(new Event('change')); await wait(50);
  out.unitSet = { outPC: state.P.outPC, gen: state.gen - g0, undo: !$('#abUndo').disabled };
  if (state.P.outPC !== 'unit' || out.unitSet.gen) bad.push('产物表改 PC 单束：没存进 outPC 或触发了重烘：' + JSON.stringify(out.unitSet));
  out.cell = ($('#delivView .dv-prod td:nth-child(2) small') || {}).textContent || '';
  if (!/单束/.test(out.cell)) bad.push('产物表 PC 那格没写单束：' + out.cell);
  toggleDeliv(false);
  // 2 贴图 / 引擎回放按产物：挂一份假的单束烘焙（假烘焙不造单束），和真的同一个缓存位置
  { const P = unitP(state.P), fm = measure(P), pl = plan(P, fm), tex = new Target(4, 4, gl.RGBA8);
    const ub = { form: 'unit', P, N: 4, NH: 4, head: tex, tail: null, scale: 1, meta: { ...pl, unit: true, fit: { v0: 120, k: 0.8, a: 6 }, hb: 0.9, sizeKeysX: [[0, 1], [1, 1]], sizeKeysY: [[0, 1], [1, 1]], aniso: true, check: {}, quality: qualityOf(P) } };
    singleUnitHolder().unitBake = { sig: unitSigOf(singleUnitHolder()), b: ub }; out.unitOutMode = P.outMode; }
  if (out.unitOutMode !== 'combined') bad.push('单束应该只出合并的一张（outMode combined）：' + out.unitOutMode);
  selectStageView('atlas'); await wait(30); state.t = 0.5; out.atlasUnit = { hud: hud().slice(0, 30), sheet: state.texSheetNow && state.texSheetNow.label };
  if (out.atlasUnit.sheet !== '单束' || !/^贴图流转 · 单束/.test(out.atlasUnit.hud)) bad.push('PC 单束时「贴图」没看单束那张：' + JSON.stringify(out.atlasUnit));
  selectStageView('export'); await wait(30); out.exportUnit = hud().slice(0, 40);
  if (!/PC 单束/.test(out.exportUnit)) bad.push('单层引擎回放没按单束画：' + out.exportUnit);
  // 手机：看序列
  state.platform = 'mobile'; out.mobile = productNow(state.P, null, singleUnitHolder()).kind; state.platform = 'pc';
  if (out.mobile !== 'seq') bad.push('手机平台不该看单束（手机出序列）：' + out.mobile);
  // 光点 / 不出：写明没有贴图
  for (const v of ['dots', 'off']) { state.P.outPC = v; onExportScheme(); selectStageView('atlas'); await wait(30); out[v] = hud().slice(0, 24);
    if (out[v] !== PRODUCT_NONE[v].slice(0, 24)) bad.push(`PC ${v} 时贴图没写明：${out[v]}`); }
  state.P.outPC = 'seq'; onExportScheme(); selectStageView('live');
  // 3 产物下拉没有单束；旧存档「单元序列」迁成 大面片 + PC 单束
  out.forms = formOptions(state.P).map(o => o[0]); if (out.forms.includes('unit')) bad.push('「产物」下拉还有单元序列：' + out.forms);
  { const P = { ...structuredClone(defaultsFor('kiku').P), type: 'kiku', form: 'unit', cols: 16, rows: 2, renderVer: 40 }; migrate37(P); out.mig = { form: P.form, outPC: P.outPC, grid: P.cols + '×' + P.rows };
    if (P.form !== 'master' || P.outPC !== 'unit' || P.cols * P.rows !== 64) bad.push('旧存档单元序列没迁成 大面片 + PC 单束：' + JSON.stringify(out.mig)); }
  return { ok: !bad.length, bad, out };
}"""

W21_COMBO_JS = r"""async () => {
  const out = {}, bad = [], wait = ms => new Promise(r => setTimeout(r, ms));
  toggleDeliv(true); await wait(30);
  const sels = [...$('#delivView').querySelectorAll('select[data-prod=pc]')]; out.rows = sels.length;
  if (sels.length !== state.layers.length) bad.push(`多层产物表应该每层一行：${sels.length} / ${state.layers.length}`);
  if (sels[1]) { sels[1].value = 'dots'; sels[1].dispatchEvent(new Event('change')); await wait(30); out.l2 = layerOut(state.layers[1]);
    if (out.l2.pc !== 'dots') bad.push('多层产物表改第 2 层 PC 没存进层：' + JSON.stringify(out.l2));
    const s2 = [...$('#delivView').querySelectorAll('select[data-prod=pc]')][1]; s2.value = 'seq'; s2.dispatchEvent(new Event('change')); await wait(30); out.back = state.layers[1].out || null; }
  toggleDeliv(false);
  return { ok: !bad.length, bad, out };
}"""


async def w21(pg):
    """4.9.25 产物表 + 视图按产物"""
    r = await pg.evaluate(W21_JS)
    await open_effect(pg, 'hiki_nishiki')
    r2 = await pg.evaluate(W21_COMBO_JS)
    bad = r['bad'] + r2['bad']
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps({**r['out'], 'combo': r2['out']}, ensure_ascii=False)[:1200]


W22_JS = r"""async () => {
  const out = {}, bad = [], wait = ms => new Promise(r => setTimeout(r, ms));
  const baked = async prev => { for (let i = 0; i < 100 && (!state.bake || state.bake === prev || state.baking); i++) await wait(100); };
  // 1 标定线：金芒菊 4.56 s、22 / 21 / 11 / 10 帧各停 1 / 2 / 3 / 4 tick，停 ≥ 2 tick 的帧最多跳的像素 = STEP_REF_PX
  { const e = entryById('JM4-40') || entryById('JM3'), P = { ...derive({ ...structuredClone(defaultsFor(e.base).P), ...structuredClone(e.p) }), duration: 4.56 }, fm = measure(P), times = [], dur = []; let t = 0;
    for (const [n, k] of [[22, 1], [21, 2], [11, 3], [10, 4]]) for (let i = 0; i < n; i++) { times.push(t / 30); dur.push(k / 30); t += k; }
    const L = frameLedger(P, fm, { times, dur }); out.ref = { calc: L.maxHeld, const: STEP_REF_PX };
    if (!(STEP_REF_PX > 0) || Math.abs(L.maxHeld - STEP_REF_PX) > 0.05) bad.push('标定线和金芒菊复算对不上：' + JSON.stringify(out.ref)); }
  // 2 「输出」顶上：每帧最多跳几像素 + 试算
  { const prev = state.bake; await openType('kiku'); await baked(prev); } state.playing = false;
  const html = outSummaryHTML(), d = document.createElement('div'); d.innerHTML = html;
  out.sum = { jump: /游戏里每帧最多跳/.test(d.textContent), trial: d.querySelectorAll('.otrial > div').length - 1, btn: d.querySelectorAll('[data-pages]').length };
  if (!out.sum.jump || out.sum.trial < 2 || !out.sum.btn) bad.push('「输出」没写每帧跳动 / 没有试算几档：' + JSON.stringify(out.sum));
  { const row = [...document.querySelectorAll('#params [data-info=outSummary]')][0];
    if (row) { row._refresh(); const b = row.querySelector('[data-pages]'); const want = b && +b.dataset.pages; if (b) { b.click(); await wait(50); out.pick = { want, got: state.P.pageTarget }; if (state.P.pageTarget !== want) bad.push('试算「用这个」没改贴图张数：' + JSON.stringify(out.pick)); undoStep && await undoStep(-1); } }
    else bad.push('右栏没有「输出」结果行'); }
  // 3 RT6 远段
  for (const id of ['RT6L', 'RT6M', 'RT6S']) { const e = entryById(id); if (!e) continue; const P = derive({ ...defaultsFor(e.base).P, ...e.p }), ball = rtBallistic(P), fa = rtLayoutFar(P, ball, rtLoopInfo(P));
    const onTick = fa.times.every((t, f) => Math.abs((t - fa.dur[f] / 2) * 30 - Math.round((t - fa.dur[f] / 2) * 30)) < 1e-6) && Math.abs(fa.t0 * 30 - Math.round(fa.t0 * 30)) < 1e-6;
    const riseMin = Math.min(...fa.dur.slice(0, fa.Fr).map(d => 1 / d)), keysOK = fa.times.every((t, f) => Math.floor(evalKeys(fa.keys, t / fa.Dtot) + 1e-6) === f);
    out[id] = { F: fa.F, cap: fa.cap, grid: fa.cols + '×' + fa.rows + '×' + fa.chans, Fr: fa.Fr, riseMin: +riseMin.toFixed(1), px: fa.pxMax, keys: fa.keys.length, onTick, keysOK };
    if (!onTick) bad.push(id + ' 远段帧没对齐 tick');
    if (riseMin < 10 - 1e-6) bad.push(id + ' 远段上升段低于 10 fps：' + riseMin);
    if (fa.F > fa.cap || fa.keys.length > 12 || !keysOK) bad.push(id + ' 远段格子 / 帧号曲线不对：' + JSON.stringify(out[id]));
    if (fa.F !== fa.cap) bad.push(id + ` 远段格子没用满（${fa.F} / ${fa.cap}，本机回放检查会报末尾空帧）`);
    if (fa.dur.some(d => d < 1 / 30 - 1e-9)) bad.push(id + ' 远段有帧比一个 tick 短'); }
  return { ok: !bad.length, bad, out };
}"""


async def w22(pg):
    """4.9.26 帧账本 + RT6 远段帧数"""
    r = await pg.evaluate(W22_JS)
    return r['ok'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)[:1200]


W23_JS = r"""async () => {
  // 4.9.27 单束合不合适（unitFit，50_bake.js）：直尾在 800 m 外最多偏几像素、先后点亮；产物表 / 下拉写出来
  const out = {}, bad = [], wait = ms => new Promise(r => setTimeout(r, ms));
  const lv = P => { const f = unitFit(P); return f ? [f.level, f.px, f.spread] : null; };
  const T = t => derive({ ...structuredClone(defaultsFor(t, 40).P), type: t });
  const want = { kiku: 'ok', crackle: 'ok', kamuro: 'bad', yanagi: 'bad', palm: 'bad' };
  for (const [t, w] of Object.entries(want)) { out[t] = lv(T(t)); if (!out[t] || out[t][0] !== w) bad.push(`${t} 单束合适度应为 ${w}：${JSON.stringify(out[t])}`); }
  if (unitFit(T('senrin')) !== null) bad.push('千轮不能出单束，合适度应为空');
  // 对话框新花型 10:43 的证据：窜天猴冠 / 柳 / 时差第 1 层单束和实时对不上，原样那档对得上
  for (const [id, w] of [['MYJC-K-1', 'bad'], ['MYJC-Y-1', 'bad'], ['MYJC-J-1', 'bad'], ['MYJC-C-1', 'ok']]) { const e = entryById(id); if (!e || !e.p) { out[id] = '没有这个条目'; continue; }
    out[id] = lv(derive({ ...structuredClone(defaultsFor(e.base).P), ...structuredClone(e.p) })); if (!out[id] || out[id][0] !== w) bad.push(`${id} 单束合适度应为 ${w}：${JSON.stringify(out[id])}`); }
  if (Array.isArray(out['MYJC-J-1']) && !(out['MYJC-J-1'][2] > 0.1)) bad.push('时差那档应按先后点亮判不适合：' + JSON.stringify(out['MYJC-J-1']));
  // 产物表：锦冠的下拉写（不适合），选了单束格子写原因；层页头的说明也写
  { const prev = state.bake; await openType('kamuro'); for (let i = 0; i < 100 && (!state.bake || state.bake === prev || state.baking); i++) await wait(100); } state.playing = false;
  toggleDeliv(true); await wait(30);
  const pc = $('#delivView select[data-prod=pc]'), uo = pc && [...pc.options].find(o => o.value === 'unit');
  out.opt = uo ? uo.textContent : null; if (!/不适合/.test(out.opt || '')) bad.push('锦冠的产物下拉，单束没写（不适合）：' + out.opt);
  if (pc) { pc.value = 'unit'; pc.dispatchEvent(new Event('change')); await wait(50); }
  out.cell = ($('#delivView .dv-prod td:nth-child(2) small') || {}).textContent || '';
  if (!/不适合单束/.test(out.cell) || !/偏 [\d.]+ px/.test(out.cell)) bad.push('锦冠选了单束，格子没写不适合 / 偏几像素：' + out.cell);
  out.note = outNote({ out: { pc: 'unit', mobile: 'seq' } }, { P: state.P }); if (!/不适合单束/.test(out.note)) bad.push('层页头说明没写不适合：' + out.note);
  state.P.outPC = 'seq'; onExportScheme(); toggleDeliv(false);
  // 菊：适合
  { const prev = state.bake; await openType('kiku'); for (let i = 0; i < 100 && (!state.bake || state.bake === prev || state.baking); i++) await wait(100); }
  toggleDeliv(true); await wait(30); { const q = $('#delivView select[data-prod=pc]'); if (q) { q.value = 'unit'; q.dispatchEvent(new Event('change')); await wait(50); } }
  out.kikuCell = ($('#delivView .dv-prod td:nth-child(2) small') || {}).textContent || ''; if (!/适合单束/.test(out.kikuCell) || /不适合/.test(out.kikuCell)) bad.push('菊选了单束，格子应写适合：' + out.kikuCell);
  state.P.outPC = 'seq'; onExportScheme(); toggleDeliv(false);
  out.kikuCell = out.kikuCell.slice(-40); out.cell = out.cell.slice(-60);
  return { ok: !bad.length, bad, out };
}"""


async def w23(pg):
    """4.9.27 单束合不合适（直尾偏几像素、先后点亮）"""
    r = await pg.evaluate(W23_JS)
    return r['ok'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)[:1200]

W24_JS = r"""async () => {
  // 4.9.28 单束变体数 / 随机感（用户 10-07 11:45 选）：假烘焙也造单束（真单束在 SwiftShader 里太慢），查变体怎么分、导出写法、命名、视图
  const out = {}, bad = [], wait = ms => new Promise(r => setTimeout(r, ms));
  const fb = bake, made = [];
  bake = async (P, scale, onProg) => {
    if (P.form !== 'unit') return fb(P, scale, onProg);
    const Pc = fxP(P), fm = measure(Pc), pl = plan(Pc, fm), tex = new Target(4, 4, gl.RGBA8);
    const b = { form: 'unit', P: Pc, N: 4, NH: 4, head: tex, tail: null, scale: 1, meta: { ...pl, unit: true, fit: { v0: 120, k: 0.8, a: 6 }, hb: 0.9, sizeKeysX: [[0, 1], [1, 1]], sizeKeysY: [[0, 1], [1, 1]], aniso: true, check: {}, quality: qualityOf(Pc),
      duration: unitDuration(Pc), Ww: 2 * (+Pc.sparkSize || 0.1), Wh: 10 * (+Pc.sparkLife || 1) } };
    made.push(b); onProg && onProg(1); return b;
  };
  try {
    { const prev = state.bake; await openType('kiku'); for (let i = 0; i < 100 && (!state.bake || state.bake === prev || state.baking); i++) await wait(100); } state.playing = false;
    state.P.stars = 61; state.P.outPC = 'unit'; onExportScheme();
    // 1 缺省：一张、一个发射器，写法和以前一样（键的顺序、常数大小）
    { const b = await layerUnitBake(singleUnitHolder()), u = fwlUnit('X', b, state.M, singleLayer(state.P, state.M));
      out.def = { vars: (b.vars || []).length, em: u.emitters.map(e => e.name), tex: Object.keys(u.textures).join(','), size: Object.keys(u.emitters[0].modules.find(m => m.m === 'InitialSize').StartSize)[0], unitVar: !!b.meta.unitVar };
      if (out.def.vars || out.def.em.join() !== 'Unit' || out.def.tex !== 'seq,cutout,ramp' || out.def.size !== 'const' || out.def.unitVar) bad.push('缺省（1 张、随机感 0）应和以前一样：' + JSON.stringify(out.def)); }
    // 2 3 张 + 随机感 0.6：改了不重烘大面片，只重烘单束
    const g0 = state.gen; state.P.unitVariants = 3; state.P.unitRandom = 0.6; onExportScheme(); await wait(30);
    out.noMaster = state.gen - g0; if (out.noMaster) bad.push('改变体数 / 随机感重烘了大面片');
    if (unitBakeOf(singleUnitHolder())) bad.push('改了变体数，旧的单束烘焙还当成对得上');
    const b = await layerUnitBake(singleUnitHolder()), all = [b, ...(b.vars || [])];
    out.v = all.map(x => [x.meta.unitN, x.meta.unitT, x.meta.unitL, x.P.seed]);
    if (all.length !== 3 || all.reduce((n, x) => n + x.meta.unitN, 0) !== 61 || new Set(all.map(x => x.P.seed)).size !== 3) bad.push('3 张变体：张数 / 星数平分 / 种子不对：' + JSON.stringify(out.v));
    if (JSON.stringify(all.map(x => x.meta.unitT)) !== '[0.76,1,1.24]' || JSON.stringify(all.map(x => x.meta.unitL)) !== '[1,1.21,0.79]') bad.push('粗细 / 尾长倍数不对：' + JSON.stringify(out.v));
    if (!(all[2].P.sparkSize > all[0].P.sparkSize) || !(all[1].P.sparkLife > all[2].P.sparkLife)) bad.push('变体的火花大小 / 尾长没跟着倍数变（烘焙入口要乘整体调整）');
    // 3 cascade.json：三个发射器、星数、Initial Size 随机、贴图 / 材质对上
    const u = fwlUnit('X', b, state.M, singleLayer(state.P, state.M)), em = u.emitters;
    out.em = em.map(e => [e.name, e.material, e.required.cutout, e.spawn.bursts[0][1]]); out.size = em[0].modules.find(m => m.m === 'InitialSize').StartSize;
    if (em.map(e => e.name).join() !== 'Unit,Unit_V2,Unit_V3' || em.reduce((n, e) => n + e.spawn.bursts[0][1], 0) !== 61) bad.push('发射器 / 星数不对：' + JSON.stringify(out.em));
    if (!out.size.uniform || Math.abs(out.size.uniform[1][0] / out.size.uniform[0][0] - 1.15 / 0.85) > 0.01 || Math.abs(out.size.uniform[1][1] / out.size.uniform[0][1] - 1.12 / 0.88) > 0.01) bad.push('随机感 0.6 应是宽 ± 15 %、长 ± 12 %：' + JSON.stringify(out.size));
    if (u.materials.main_v2.textures.main !== 'seq_v2' || !/_V2\.png$/.test(u.textures.seq_v2.file) || u.textures.cutout_v3.file.indexOf('_Cutout_V3') < 0 || !u.textures.ramp) bad.push('贴图 / 材质键对不上：' + JSON.stringify(Object.keys(u.textures)));
    // 多层：每层的变体在层上，L1_ 前缀
    { const L = { ...singleLayer(state.P, state.M), unitVariants: 3, unitRandom: 0.6 }, c = fwlCombo('C', [{ L, b: state.bake, i: 0, unit: b }], false);
      out.combo = c.emitters.map(e => e.name + '>' + e.material + '>' + c.materials[e.material].textures.main);
      if (out.combo.join() !== 'L1_Unit>L1_main>L1_seq,L1_Unit_V2>L1_main_v2>L1_seq_v2,L1_Unit_V3>L1_main_v3>L1_seq_v3' || !c.textures.L1_ramp) bad.push('多层单束变体的发射器 / 材质 / 贴图前缀不对：' + JSON.stringify(out.combo)); }
    // 4 文件名：内部 _V2 / _V3 → 素材包序号 02 / 03
    const files = (await texFiles(b, 'X_L1')).map(f => f[0]), named = applyPackNaming((await texFiles(b, 'X_L1')).map(f => f), 'Test', [{ ln: 'X_L1', mn: 'X_Mobile_L1', b, mb: null, layer: '', pcTex: true }]).map(f => f[0]);
    out.files = files.filter(f => !/FrameTest/.test(f)); out.named = named.filter(f => /^T_/.test(f) && !/FrameTest/.test(f));
    if (!files.includes('T_X_L1_V2.png') || !files.includes('T_X_L1_V3.png')) bad.push('变体贴图没导出：' + files);
    if (!['_01_HD', '_02_HD', '_03_HD'].every(k => named.some(f => f.includes(k)))) bad.push('素材包里变体没按序号 01 / 02 / 03 命名：' + named);
    // 5 视图：贴图能切三张；引擎回放画三组、不报错；产物表写几张变体
    selectStageView('atlas'); state.t = 0.5; loop(performance.now()); out.sheets = texSheets(b).map(x => x.label);
    if (out.sheets.join() !== '单束 1,单束 2,单束 3') bad.push('「贴图」切不到每一张变体：' + out.sheets);
    selectStageView('export'); state.t = 1; loop(performance.now()); out.hud = $('#hud').textContent.slice(0, 30); out.glErr = gl.getError();
    if (!/PC 单束/.test(out.hud) || out.glErr) bad.push('引擎回放画单束变体不对：' + JSON.stringify([out.hud, out.glErr]));
    toggleDeliv(true); await wait(30); out.cell = ($('#delivView .dv-prod td:nth-child(2) small') || {}).textContent || ''; out.rows = [...document.querySelectorAll('#delivView td')].filter(td => /单束 第 \d \/ 3 张/.test(td.textContent)).length;
    if (!/3 张变体、随机感 0.6/.test(out.cell) || out.rows !== 3) bad.push('交付清单没写 3 张变体 / 文件清单不是 3 行：' + JSON.stringify([out.cell.slice(0, 80), out.rows]));
    toggleDeliv(false); selectStageView('live');
    out.cell = out.cell.slice(0, 70);
  } finally {
    bake = fb; delete state.P.unitVariants; delete state.P.unitRandom; state.P.outPC = 'seq'; onExportScheme();
    const h = singleUnitHolder(); if (h.unitBake) { disposeBake(h.unitBake.b); h.unitBake = null; }
  }
  return { ok: !bad.length, bad, out };
}"""


async def w24(pg):
    """4.9.28 单束变体数 / 随机感"""
    r = await pg.evaluate(W24_JS)
    return r['ok'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)[:1500]

W25_JS = r"""async () => {
  // 4.9.29 低端包 + 单帧 + 功能图（用户 10-07 09:41 / 09:54 / 12:40）：造一份「圆环往外扩」的假序列（16 帧），单帧烘焙也换成假的，查算法和导出、视图
  const out = {}, bad = [], wait = ms => new Promise(r => setTimeout(r, ms));
  { const prev = state.bake; await openType('crackle'); for (let i = 0; i < 100 && (!state.bake || state.bake === prev || state.baking); i++) await wait(100); } state.playing = false;
  const P = { ...fxP(state.P), cols: 4, rows: 4, chans: 1, texW: 256, texH: 256 }, Lg = layoutOf(P), times = [], dur = [];
  for (let f = 0; f < 16; f++) { times.push(f * 2 / 30); dur.push(2 / 30); }
  const meta = { L: Lg, times, dur, t0: 0, duration: 32 / 30, HX: 50, HY: 50, Ww: 100, Wh: 100, cy: 0, sizeKeys: [[0, 1], [1, 1]], frameTiming: 'tick-start', keys: [[0, 0], [1, 15.99]], expoH: 1, expoT: 1 };
  const ring = f => 0.05 + 0.025 * f, px = new Uint8Array(256 * 256 * 4);     // 圆环半径（格子 uv），越往后越大
  for (let f = 0; f < 16; f++) { const col = f % 4, row = Math.floor(f / 4), x0 = col * 64, y0 = 256 - (row + 1) * 64;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const d = Math.hypot((x + 0.5) / 64 - 0.5, (y + 0.5) / 64 - 0.5); if (Math.abs(d - ring(f)) < 0.03) px[((y0 + y) * 256 + x0 + x) * 4] = 200; } }
  const head = new Target(256, 256, gl.RGBA8); gl.bindTexture(gl.TEXTURE_2D, head.tex); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, 256, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const b = { form: 'master', P, N: 256, NH: 256, cw: 64, chh: 64, head, tail: null, meta, scale: 1 };
  const fl = lowRenderAt;
  lowRenderAt = async (s, items, S) => { const g = new Uint8Array(S * S);     // 单帧：同一个圆环，按要的取景画（world 米）
    for (const { tc, view } of items) { const f = Math.round(tc * 15), R = ring(f) * 100, v = view || [0, 0, 50, 50];
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const wx = v[0] + ((x + 0.5) / S * 2 - 1) * v[2], wy = v[1] + ((y + 0.5) / S * 2 - 1) * v[3]; if (Math.abs(Math.hypot(wx, wy) - R) < 3) g[y * S + x] = 200; } }
    return g; };
  const saved = { outPC: state.P.outPC, lowSize: state.P.lowSize, lowJit: state.P.lowJit, lowMaps: state.P.lowMaps, lowSuffix: state.P.lowSuffix, plat: state.platform };
  try {
    const lo = lowOf({ lowSize: 512, lowMaps: 'DCA', lowJit: 0 }), lw = await lowFor(b, lo, state.M);
    out.t = { tIn: +lw.tIn.toFixed(3), tOut: +lw.tOut.toFixed(3), tStar: +lw.tStar.toFixed(3) }; out.view = lw.view.map(v => +v.toFixed(1));
    if (Math.abs(lw.tIn) > 1e-6 || Math.abs(lw.tOut - 32 / 30) > 1e-6) bad.push('入点 / 出点不对：' + JSON.stringify(out.t));
    if (Math.abs(lw.tStar - 30 / 30) > 1e-6) bad.push('自动单帧应取圆环最大那一帧（1.00 s）：' + JSON.stringify(out.t));
    if (!(lw.view[2] > 40 && lw.view[2] < 50)) bad.push('单帧取景没收紧到内容（圆环半径 42.5 m + 3 m）：' + JSON.stringify(out.view));
    // 功能图：圆环往外扩 → 里面的先亮先灭（D、A 都是里小外大）；角上没亮过：D = 0、A = 255
    const MS = lw.MS, at = (wx, wy) => { const v = lw.view, x = Math.floor(((wx - v[0]) / v[2] + 1) / 2 * MS), y = Math.floor(((wy - v[1]) / v[3] + 1) / 2 * MS); return y * MS + x; };
    const D = lw.cover.last, A = lw.cover.first, jIn = at(10, 0), jOut = at(40, 0), jC = at(-lw.view[2] * 0.99, lw.view[3] * 0.99);
    out.maps = { Din: D[jIn], Dout: D[jOut], Ain: A[jIn], Aout: A[jOut], corner: [D[jC], A[jC]], chans: lw.chans, suffix: lw.suffix };
    // 4.9.31 溶解图按现有母材质的方向存：D = 1 − 熄灭时刻（里面先灭 → 值大），没亮过 255
    if (!(D[jIn] < 255 && D[jIn] > D[jOut] && A[jOut] > A[jIn])) bad.push('功能图不是里先外后（D 里大外小、A 里小外大）：' + JSON.stringify(out.maps));
    if (D[jC] !== 255 || A[jC] !== 255) bad.push('没亮过的地方应 D = 255、A = 255：' + JSON.stringify(out.maps.corner));
    if (JSON.stringify(lw.chans) !== '{"D":"R","C":"G","A":"B"}' || lw.suffix !== 'DCA') bad.push('功能图通道 / 缺省后缀不对：' + JSON.stringify([lw.chans, lw.suffix]));
    // 设置：后缀按勾的拼、只留字母数字；错落只动熄灭不动出现
    out.lowOf = [lowOf({ lowMaps: 'DC' }).suffix, lowOf({ lowSuffix: 'x-y_9' }).suffix, lowOf({ lowMaps: '' }).maps, lowOf({}).size, lowOf({ lowSize: 333 }).size];
    if (JSON.stringify(out.lowOf) !== '["DC","xy9","",1024,1024]') bad.push('lowOf 不对：' + JSON.stringify(out.lowOf));
    { const lj = await lowFor(b, { ...lo, jit: 1 }, state.M); let dD = 0, dA = 0; for (let j = 0; j < MS * MS; j++) { if (lj.cover.last[j] !== D[j]) dD++; if (lj.cover.first[j] !== A[j]) dA++; } out.jit = { dD, dA };
      if (!dD || dA) bad.push('错落应只改熄灭顺序：' + JSON.stringify(out.jit)); }
    // Size By Life：开头小、到单帧那一刻 1；Alpha：最后 0
    out.keys = { size: lw.sizeKeys, alpha: lw.alphaKeys };
    if (!(lw.sizeKeys[0][1] < 0.5) || lw.sizeKeys[lw.sizeKeys.length - 1][1] !== 1 || lw.alphaKeys[lw.alphaKeys.length - 1][1] !== 0) bad.push('Size By Life / Alpha 曲线不对：' + JSON.stringify(out.keys));
    // 4.9.35 单帧并进产物表：cascade.json 里第 1 层单帧（现有序列材质 1 × 1、帧号 0；彩色在 extras）、第 2 层序列；手机单帧直接引用 PC 那张
    const L1 = { ...state.M, delay: 0.5, rate: 1, scale: 2 }, L2 = { ...state.M, delay: 0, rate: 1, scale: 1 };
    const j = fwlCombo('X', [{ L: L1, b: state.bake, i: 0, frame: lw, frameName: 'X_L1' }, { L: L2, b: state.bake, i: 1 }], false), jm = fwlCombo('X_Mobile', [{ L: L1, b: state.bake, i: 0, frame: lw, frameName: 'X_L1' }], true);
    const e = j.emitters[0], mods = Object.fromEntries(e.modules.map(m => [m.m, m]));
    out.json = { em: j.emitters.map(x => x.name), tex: Object.keys(j.textures), extras: Object.keys(j.extras || {}), size: mods.InitialSize.StartSize.const, delay: e.required.delay_s, frame: mods.DynamicParameter.params.frame, role: j.materials.L1_main.role, plat: j.platform, form: j.source.layers.map(x => x.form), mob: [jm.platform, jm.textures.L1_frame && jm.textures.L1_frame.file] };
    if (j.platform !== 'pc' || e.name !== 'L1_Frame' || j.materials.L1_main.role !== 'flipbook_rgba' || j.textures.L1_frame.frames !== 1 || JSON.stringify(mods.DynamicParameter.params.frame) !== '{"const":0}' || out.json.form[0] !== 'frame') bad.push('cascade.json 单帧发射器不对：' + JSON.stringify(out.json));
    if (jm.platform !== 'mobile' || out.json.mob[1] !== TN('X_L1', 'Frame') + '.png') bad.push('手机单帧应直接引用 PC 那张：' + JSON.stringify(out.json.mob));
    if (Math.abs(mods.InitialSize.StartSize.const[0] - 2 * lw.view[2] * 100 * 2) > 1 || Math.abs(e.required.delay_s - 0.5) > 1e-6 || !mods.SizeByLife || !mods.ColorScaleOverLife || !mods.ColorOverLife.AlphaOverLife.curve) bad.push('单帧发射器的大小 / 延迟 / 模块不对：' + JSON.stringify(out.json));
    out.dis = { tex: j.textures.L1_dmap && j.textures.L1_dmap.class, ch: j.textures.L1_dmap && j.textures.L1_dmap.channels.R, mat: j.materials.L1_main.textures.dissolve, flag: e.dissolve && e.dissolve.enable, dp: mods.DynamicParameter.params.dissolve, l2: j.emitters.filter(x => x.name.startsWith('L2_')).map(x => !!x.dissolve) };
    if (!(j.extras || {}).L1_color || out.dis.tex !== 'dissolve' || out.dis.ch !== LOW_MAP_NAMES.D || out.dis.mat !== 'L1_dmap' || !out.dis.flag || JSON.stringify(out.dis.dp) !== '{"curve":[[0,0],[1,1]]}' || !out.dis.l2.length || out.dis.l2.some(Boolean)) bad.push('溶解标记 / 溶解图 / 第 2 层序列（不该开溶解）不对：' + JSON.stringify(out.dis));
    // 文件 + 正式名（PC 用 _HD、彩色 _Color_HD、_C、_<后缀>；不再加 _MB；Ramp 共用）
    const files = await lowFiles('X_L1', lw, state.M), named = applyPackNaming([...files, ['cascade.json', utf8(JSON.stringify(j))]], 'Test', [{ ln: 'X_L1', mn: 'X_Mobile_L1', b: state.bake, mb: state.bake, layer: '', pcTex: false, frame: { pc: true, mob: false, suffix: lw.suffix } }]).map(f => f[0]);
    out.named = named.filter(f => /^T_/.test(f));
    for (const want of ['T_EFX_FireWorks_Test_1x1_01_HD.png', 'T_EFX_FireWorks_Test_1x1_01_Color_HD.png', 'T_EFX_FireWorks_Test_1x1_01_C.png', 'T_EFX_FireWorks_Test_1x1_01_DCA.png', 'T_EFX_FireWorks_Test_R.png']) if (!named.includes(want)) bad.push('素材包里少了 ' + want);
    if (named.some(f => /_MB\.png$/.test(f)) || named.includes('cascade_low.json')) bad.push('不该再有 _MB / cascade_low.json：' + JSON.stringify(out.named));
    // 产物表：只有 PC / 手机两列；PC 选单帧不重烘；手机有 序列 / 单束 / 单帧 / 不出（没有 GPU）
    toggleDeliv(true); await wait(30);
    const sel = $('#delivView select[data-prod=pc]'), msel = $('#delivView select[data-prod=mobile]');
    out.opts = { pc: sel ? [...sel.options].map(o => o.value) : null, mobile: msel ? [...msel.options].map(o => o.value) : null, low: !!$('#delivView select[data-prod=low]'), cols: [...document.querySelectorAll('#delivView .dv-prod thead th')].length };
    if (!sel || out.opts.pc.join() !== 'seq,unit,dots,frame,off' || out.opts.mobile.join() !== 'seq,unit,frame,off' || out.opts.low || out.opts.cols !== 3) bad.push('产物表应只有 PC / 手机两列（PC 带单帧、手机 序列 / 单束 / 单帧 / 不出）：' + JSON.stringify(out.opts));
    const g0 = state.gen; if (sel) { sel.value = 'frame'; sel.dispatchEvent(new Event('change')); await wait(50); }
    out.set = { outPC: state.P.outPC, gen: state.gen - g0 }; out.cell = ($('#delivView .dv-prod td:nth-child(2) small') || {}).textContent || '';
    if (state.P.outPC !== 'frame' || out.set.gen) bad.push('产物表 PC 选单帧：没存进 outPC 或重烘了：' + JSON.stringify(out.set));
    if (!/^单帧/.test(out.cell) || !$('#delivView [data-lowview]')) bad.push('PC 那格没写单帧 / 没有「在引擎回放里看」：' + out.cell);
    out.files = [...document.querySelectorAll('#delivView td')].filter(td => /_1x1_01_(HD|Color_HD|C|DCA)\.png$/.test(td.textContent)).length;
    if (out.files < 4) bad.push('文件清单里单帧的贴图不全：' + out.files);
    toggleDeliv(false);
    // 视图：把这份单帧挂到现在的烘焙上；引擎回放不分平台，直接按 PC 列画单帧
    Object.assign(state.P, { lowSize: 512, lowJit: 0, lowMaps: 'DCA', lowSuffix: '' }); if (!state.bake.lowCache) state.bake.lowCache = new Map(); state.bake.lowCache.set(lowSig(lowOf(state.P), state.M), lw);
    selectStageView('export'); state.t = 0.5; state.lowDissolve = true; loop(performance.now()); out.hudD = $('#hud').textContent.slice(0, 40);
    state.lowDissolve = false; loop(performance.now()); out.hudN = $('#hud').textContent.slice(0, 70);
    out.plat = { hidden: $('#platformSeg').hidden, low: !!$('#platformSeg button[data-platform="low"]'), platform: state.platform };
    if (!out.plat.hidden || out.plat.low || out.plat.platform !== 'pc') bad.push('引擎回放不该再分平台：' + JSON.stringify(out.plat));
    selectStageView('atlas'); loop(performance.now()); out.hudA = $('#hud').textContent.slice(0, 30); out.glErr = gl.getError();
    if (!/单帧/.test(out.hudD) || !/溶解预览/.test(out.hudD) || !/不开溶解/.test(out.hudN) || !/^单帧/.test(out.hudA) || out.glErr) bad.push('单帧视图不对：' + JSON.stringify([out.hudD, out.hudN, out.hudA, out.glErr]));
    selectStageView('export'); loop(performance.now()); out.lowOpts = !$('#lowOpts').hidden; if (!out.lowOpts) bad.push('PC 单帧时引擎回放上方应有「溶解预览」「并排」');
    state.P.outPC = 'off'; onExportScheme(); selectStageView('export'); loop(performance.now()); out.hudOff = $('#hud').textContent.slice(0, 40);
    if (!/PC 不出/.test(out.hudOff)) bad.push('PC 不出时没写明：' + out.hudOff);
  } finally {
    lowRenderAt = fl; Object.assign(state.P, saved); delete state.P.plat; onExportScheme(); selectStageView('live');
    if (state.bake && state.bake.lowCache) state.bake.lowCache.clear(); if (b.lowCache) b.lowCache.forEach(disposeLow); head.dispose();
  }
  return { ok: !bad.length, bad, out };
}"""


async def w25(pg):
    """4.9.29 低端包 + 单帧 + 功能图"""
    r = await pg.evaluate(W25_JS)
    return r['ok'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)[:1500]

W26_JS = r"""async () => {
  // 4.9.31（用户 10-07 14:56）：① RT6 远段从交接开始 a0 出现（不在中点一下补半亮）；② 导出缩放 0.5 / 0.8 / 1；③ 护栏 Ramp（末格黑）+ 编码封顶 253（用户 14:34 批）
  const out = {}, bad = [], wait = ms => new Promise(r => setTimeout(r, ms));
  // ① 远段第一帧几乎是空的，之后慢慢亮（以前在中点出现，第一帧就有一半亮度）
  const lightAt = (P, LI, ball, fa, ts) => { const N = 64, NH = 256, view = [fa.cx, fa.cz, fa.HX, fa.HY], t = new Target(N, NH, gl.RGBA16F), buf = new Float32Array(N * NH * 4), R = makeRiseTailFarRenderer(P, LI, ball, fa.cx, 0, fa.t0);
    t.clear(); t.bind(); additive(true); PPMY = NH / (2 * view[3]); R.draw(ts, view, N / (2 * view[2]), 1); additive(false); PPMY = 0; gl.readPixels(0, 0, N, NH, gl.RGBA, gl.FLOAT, buf); t.dispose();
    let s = 0; for (let i = 0; i < N * NH; i++) s += buf[i * 4] + buf[i * 4 + 1]; return s; };
  for (const id of ['RT6L', 'RT6M', 'RT6S']) { const e = entryById(id); if (!e) continue; const P = derive({ ...defaultsFor(e.base).P, ...e.p }), ball = rtBallistic(P), LI = rtLoopInfo(P), fa = rtLayoutFar(P, ball, LI), [a0, a1] = rtNearA(P);
    const Ls = [0, 1, 2, 4, 8, 16].map(f => lightAt(P, LI, ball, fa, fa.t0 + fa.times[Math.min(f, fa.F - 1)])), mx = Math.max(...Ls, 1e-9), old = lightAt(P, LI, ball, fa, Math.ceil((a0 + a1) / 2 * 30) / 30);
    out[id] = { t0: +fa.t0.toFixed(3), a0, first: +(Ls[0] / mx).toFixed(3), seq: Ls.map(x => +(x / mx).toFixed(3)), oldStart: +(old / mx).toFixed(3) };
    if (Math.abs(fa.t0 - Math.floor(a0 * 30 + 1e-6) / 30) > 1e-6) bad.push(id + ' 远段应从交接开始 a0 出现：' + JSON.stringify(out[id]));
    if (!(Ls[0] / mx < 0.1)) bad.push(id + ' 远段第一帧太亮（一出现就闪）：' + JSON.stringify(out[id])); }
  // ② 导出缩放：长度 × k、时间不变、系统名加后缀；cascade*.json 都改，别的文件不动
  const j0 = { name: 'X', system: { preview_distance_cm: 30000 }, source: {}, emitters: [{ name: 'E', modules: [
    { m: 'Lifetime', Lifetime: { const: 2 } }, { m: 'InitialSize', StartSize: { uniform: [[100, 200, 1], [300, 400, 1]] } }, { m: 'InitialLocation', StartLocation: { const: [10, 0, 20] } },
    { m: 'SphereLocation', StartRadius: { const: 50 }, VelocityScale: { const: 3 } }, { m: 'InitialVelocity', StartVelocity: { curve: [[0, [0, 0, 100]], [1, [0, 0, 200]]] } },
    { m: 'VelocityOverLife', VelOverLife: { curve: [[0, [0, 0, 1000]]] }, Absolute: true }, { m: 'ConstAcceleration', Acceleration: [0, 0, -980] }, { m: 'Acceleration', Acceleration: { uniform: [[-10, 0, 0], [10, 0, 0]] } },
    { m: 'Drag', DragCoefficientRaw: { const: 1.5 } }, { m: 'SizeByLife', LifeMultiplier: { curve: [[0, [0.5, 0.5, 1]], [1, [1, 1, 1]]] } } ] }] };
  const j = fwlScaleJSON(structuredClone(j0), 0.5), M = Object.fromEntries(j.emitters[0].modules.map(m => [m.m, m]));
  out.scaled = { name: j.name, size: M.InitialSize.StartSize.uniform, loc: M.InitialLocation.StartLocation.const, r: M.SphereLocation.StartRadius.const, vs: M.SphereLocation.VelocityScale.const, vel: M.InitialVelocity.StartVelocity.curve[1][1], acc: M.ConstAcceleration.Acceleration, life: M.Lifetime.Lifetime.const, drag: M.Drag.DragCoefficientRaw.const, sbl: M.SizeByLife.LifeMultiplier.curve[0][1], dist: j.system.preview_distance_cm };
  if (j.name !== 'X_S50' || JSON.stringify(out.scaled.size) !== '[[50,100,1],[150,200,1]]' || out.scaled.loc[2] !== 10 || out.scaled.r !== 25 || out.scaled.vs !== 3 || out.scaled.vel[2] !== 100 || out.scaled.acc[2] !== -490 || out.scaled.life !== 2 || out.scaled.drag !== 1.5 || out.scaled.sbl[0] !== 0.5 || out.scaled.dist !== 15000 || M.VelocityOverLife.VelOverLife.curve[0][1][2] !== 500 || M.Acceleration.Acceleration.uniform[1][0] !== 5) bad.push('导出缩放算得不对：' + JSON.stringify(out.scaled));
  { const fs = scaleCascadeFiles([['cascade.json', utf8(JSON.stringify(j0))], ['cascade_low.json', utf8(JSON.stringify(j0))], ['X.json', utf8(JSON.stringify(j0))]], 0.8), dec = new TextDecoder();
    out.files = fs.map(([f, d]) => [f, JSON.parse(dec.decode(d)).name]); if (JSON.stringify(out.files) !== '[["cascade.json","X_S80"],["cascade_low.json","X_S80"],["X.json","X"]]') bad.push('只该改 cascade*.json：' + JSON.stringify(out.files)); }
  if (fwlScaleJSON(structuredClone(j0), 1).name !== 'X' || exportScaleOf({ exportScale: 2 }) !== 1 || exportScaleSfx(0.8) !== '_S80') bad.push('缩放 1 / 越界不该动');
  // 面板：菊有「导出缩放」；改了不重烘；引擎回放（游戏内大小）按缩放画
  { const prev = state.bake; await openType('kiku'); for (let i = 0; i < 100 && (!state.bake || state.bake === prev || state.baking); i++) await wait(100); } state.playing = false;
  out.panel = itemVisible(SCHEMA.find(x => x.sec === '导出缩放').items[0], state.P) && SCHEMA.find(x => x.sec === '导出缩放').show(state.P);
  if (!out.panel) bad.push('菊的右栏没有「导出缩放」');
  const g0 = state.gen; state.view = 'export'; state.disp = 'game'; selectStageView('export'); const v1 = exportView(state.bake).view[2];
  state.P.exportScale = 0.5; onExportScheme(); const v2 = exportView(state.bake).view[2]; loop(performance.now()); out.hud = $('#hud').textContent.slice(-40);
  out.view = { v1: +v1.toFixed(1), v2: +v2.toFixed(1), gen: state.gen - g0 };
  if (Math.abs(v2 / v1 - 2) > 0.01 || out.view.gen) bad.push('引擎回放没按缩放画 / 改缩放重烘了：' + JSON.stringify(out.view));
  if (!/导出缩放 × 0.5/.test(out.hud)) bad.push('引擎回放没写导出缩放：' + out.hud);
  state.P.exportScale = 1; onExportScheme(); state.disp = 'fit'; selectStageView('live');
  if (unitSig({ a: 1, exportScale: 0.5 }) !== unitSig({ a: 1, exportScale: 1 })) bad.push('导出缩放不该让单束重烘');
  // ③ 护栏 Ramp + 封顶 253
  { const rp = rampPixels({ ...state.M, ramp3: '#ffffff' }), x = 255 * 4; out.ramp = [[rp[x], rp[x + 1], rp[x + 2]], [rp[254 * 4], rp[254 * 4 + 1], rp[254 * 4 + 2]]];
    if (out.ramp[0].join() !== '0,0,0' || !(out.ramp[1][0] > 200)) bad.push('Ramp 第 255 格应是黑的、第 254 格照旧：' + JSON.stringify(out.ramp)); }
  { const fH = new Target(4, 4, gl.RGBA16F), fT = new Target(4, 4, gl.RGBA16F), hd = new Target(4, 4, gl.RGBA8);
    fH.bind(); gl.clearColor(50, 50, 50, 50); gl.clear(gl.COLOR_BUFFER_BIT); fT.clear(); gl.clearColor(0, 0, 0, 0);
    const pr = PR.enc; gl.useProgram(pr.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fH.tex); gl.uniform1i(pr.u.uH, 0); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, fT.tex); gl.uniform1i(pr.u.uT, 1);
    gl.uniform1f(pr.u.uEH, 1); gl.uniform1f(pr.u.uET, 1); gl.uniform1f(pr.u.uG, 1); gl.uniform1f(pr.u.uSingle, 0); hd.bind(); gl.uniform1f(pr.u.uWhich, 1); drawQuad(); gl.activeTexture(gl.TEXTURE0);
    const px = readRGBA8(hd); out.enc = [...px.slice(0, 4)]; fH.dispose(); fT.dispose(); hd.dispose();
    if (out.enc.some(v => v !== 253)) bad.push('编码没封顶 253：' + out.enc); }
  return { ok: !bad.length, bad, out };
}"""


async def w26(pg):
    """4.9.31 RT6 远段从交接开始出现 + 导出缩放 + 护栏 Ramp / 封顶 253"""
    r = await pg.evaluate(W26_JS)
    return r['ok'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)[:1500]

W27_JS = r"""async () => {
  // 4.9.32（用户 10-07 16:15「2.缩小到0.8/0.5，升空的高度还是之前正确的吗？」→ 16:2x「两种都要，导出时选」）
  const out = {}, bad = [];
  // ① JSON：只缩粗细
  const j0 = { name: 'R', system: { preview_distance_cm: 30000 }, source: {}, emitters: [
    { name: 'RiseLoop', modules: [{ m: 'Lifetime', Lifetime: { const: 3 } }, { m: 'InitialSize', StartSize: { const: [1000, 15000, 1] } }, { m: 'InitialVelocity', StartVelocity: { const: [10, 0, 15000] } },
      { m: 'VelocityOverLife', VelOverLife: { curve: [[0, [0, 0, 15000]], [1, [0, 0, 400]]] }, Absolute: true }, { m: 'DynamicParameter', params: { frame: { curve: [[0, 0], [1, 63]] } } }] },
    { name: 'TrailFar', modules: [{ m: 'InitialLocation', StartLocation: { const: [-40, 0, 20000] } }, { m: 'InitialVelocity', StartVelocity: { const: [0, 0, 50] } }, { m: 'InitialSize', StartSize: { const: [2300, 42000, 1] } }, { m: 'DynamicParameter', params: { frame: { const: 0 } } }] },
    { name: 'Sparks', modules: [{ m: 'InitialSize', StartSize: { uniform: [[80, 80, 80], [200, 200, 200]] } }, { m: 'InitialLocation', StartLocation: { curve: [[0, [0, 0, 0]], [1, [0, 0, 9000]]] } },
      { m: 'SphereLocation', StartRadius: { const: 40 }, VelocityScale: { const: 2 } },
      { m: 'InitialVelocity', StartVelocity: { curve: [[0, [0, 0, 13000]], [1, [0, 0, 1000]]] } }, { m: 'InitialVelocity', StartVelocity: { uniform: [[-950, -950, -475], [950, 950, 475]] }, note: '第 2 个 Initial Velocity：叠加的随机散开' },
      { m: 'Drag', DragCoefficientRaw: { uniform: [1.2, 2.4] } }, { m: 'ConstAcceleration', Acceleration: [0, 0, -981] }] }] };
  const j = fwlScaleJSON(structuredClone(j0), 0.5, true), mod = (e, m, i = 0) => j.emitters[e].modules.filter(x => x.m === m)[i];
  out.keep = { name: j.name, mode: j.export_scale_mode, dist: j.system.preview_distance_cm, loopSize: mod(0, 'InitialSize').StartSize.const, loopV: mod(0, 'InitialVelocity').StartVelocity.const, vol: mod(0, 'VelocityOverLife').VelOverLife.curve[0][1],
    farLoc: mod(1, 'InitialLocation').StartLocation.const, farSize: mod(1, 'InitialSize').StartSize.const, sz: mod(2, 'InitialSize').StartSize.uniform, loc: mod(2, 'InitialLocation').StartLocation.curve[1][1],
    r: mod(2, 'SphereLocation').StartRadius.const, v1: mod(2, 'InitialVelocity', 0).StartVelocity.curve[0][1], v2: mod(2, 'InitialVelocity', 1).StartVelocity.uniform[1], acc: mod(2, 'ConstAcceleration').Acceleration, drag: mod(2, 'Drag').DragCoefficientRaw.uniform };
  const K = out.keep, eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if (K.name !== 'R_W50' || K.mode !== 'keep_height' || K.dist !== 30000) bad.push('「不变」：系统名 / 标记 / 预览距离不对：' + JSON.stringify([K.name, K.mode, K.dist]));
  if (!eq(K.loopSize, [500, 15000, 1]) || !eq(K.farSize, [1150, 42000, 1])) bad.push('序列面片应只缩宽（Y = 沿尾迹的长度不变）：' + JSON.stringify([K.loopSize, K.farSize]));
  if (!eq(K.loopV, [10, 0, 15000]) || K.vol[2] !== 15000 || !eq(K.farLoc, [-40, 0, 20000]) || K.loc[2] !== 9000 || K.v1[2] !== 13000 || K.acc[2] !== -981 || !eq(K.drag, [1.2, 2.4])) bad.push('弹道 / 位置 / 加速度 / 阻力不该动：' + JSON.stringify(K));
  if (!eq(K.sz, [[40, 40, 80], [100, 100, 200]]) || !eq(K.v2, [475, 475, 237.5]) || K.r !== 20) bad.push('粒子大小 / 随机散开 / 球面半径应 × 0.5：' + JSON.stringify([K.sz, K.v2, K.r]));
  if (fwlScaleJSON(structuredClone(j0), 0.5).name !== 'R_S50' || exportScaleSfx(0.8, true) !== '_W80') bad.push('等比缩的名字 / 后缀变了');
  // ② 谁能选：升空尾缀 + 缩放 < 1
  const e6 = entryById('RT6L'), P6 = e6 ? derive({ ...defaultsFor(e6.base).P, ...e6.p }) : null, ev5 = entryById('V5M') || null;
  const item = SCHEMA.find(x => x.sec === '导出缩放').items.find(it => it.sel === 'exportScaleRise');
  const kikuP = derive({ ...defaultsFor('kiku').P });
  out.who = { rt6: !!P6 && isEmit(P6), keep6: exportKeepOf({ ...P6, exportScale: 0.5, exportScaleRise: 'keep' }), keep6at1: exportKeepOf({ ...P6, exportScale: 1, exportScaleRise: 'keep' }), keepKiku: exportKeepOf({ ...kikuP, exportScale: 0.5, exportScaleRise: 'keep' }),
    row6: !!item && itemVisible(item, { ...P6, exportScale: 0.5 }), row6at1: !!item && itemVisible(item, { ...P6, exportScale: 1 }), rowKiku: !!item && itemVisible(item, { ...kikuP, exportScale: 0.5 }) };
  if (!out.who.rt6 || !out.who.keep6 || out.who.keep6at1 || out.who.keepKiku || !out.who.row6 || out.who.row6at1 || out.who.rowKiku) bad.push('「升空高度」该只在升空尾缀 + 缩放 < 1 时出现 / 生效：' + JSON.stringify(out.who));
  if (!SCHEME_KEYS.includes('exportScaleRise') || unitSig({ a: 1, exportScaleRise: 'keep' }) !== unitSig({ a: 1, exportScaleRise: 'scale' })) bad.push('「升空高度」改了不该重烘');
  // ③ 引擎回放和导出同一套：esKeepScale 的发射器写成 cascade 模块 = 原发射器写成模块再 fwlScaleJSON(keep)
  { const ES = rtBuildES(P6), k = 0.5, A = ES.emitters.map(e => ({ name: e.name, modules: esFwlEmitter(e, false, 1).modules })), B = esKeepScale(ES, k).emitters.map(e => ({ name: e.name, modules: esFwlEmitter(e, false, 1).modules }));
    const As = fwlScaleJSON({ name: 'A', emitters: structuredClone(A) }, k, true).emitters, pick = ms => ms.filter(m => ['InitialSize', 'InitialVelocity', 'InitialLocation', 'SphereLocation', 'ConstAcceleration', 'VelocityOverLife'].includes(m.m)).map(m => { const o = { ...m }; delete o.note; if (m.m === 'InitialSize') { const xy = v => Array.isArray(v) ? v.slice(0, 2) : v, d = m.StartSize; o.StartSize = 'const' in d ? { const: xy(d.const) } : 'uniform' in d ? { uniform: d.uniform.map(xy) } : d; } return o; });     // 面片大小的 Z 对精灵没用（等比缩也不动 Z）
    const diff = [], close = (a, b) => { if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= 0.06 + 1e-4 * Math.abs(a); /* esCm 取到 0.1 cm */ if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => close(x, b[i])); if (a && b && typeof a === 'object' && typeof b === 'object') { const ks = new Set([...Object.keys(a), ...Object.keys(b)]); return [...ks].every(q => close(a[q], b[q])); } return a === b; };
    As.forEach((e, i) => { if (!close(pick(e.modules), pick(B[i].modules))) diff.push(e.name); });
    out.same = { n: As.length, diff };
    if (!As.length || diff.length) bad.push('引擎回放的发射器（esKeepScale）和导出（fwlScaleJSON 不变）对不上：' + JSON.stringify(out.same));
    const fb = { P: P6, es: ES }, t1 = rtTables(fb, false, 1), tk = rtTables(fb, false, k), q1 = t1.find(T => T.list.length > 10), qk = tk[t1.indexOf(q1)], a = q1.list[5], b = qk.list[5];
    out.tab = { name: q1.e.name, s: [+a.size.toFixed(3), +b.size.toFixed(3)], p: [a.p[2], b.p[2]], t0: [a.t0, b.t0] };
    if (Math.abs(b.size / a.size - k) > 1e-6 || Math.abs(a.p[2] - b.p[2]) > 1e-9 || a.t0 !== b.t0) bad.push('「不变」的出生表：大小应 × k、位置 / 出生时刻不变：' + JSON.stringify(out.tab)); }
  // ④ 引擎回放用哪个缩放：等比 → 游戏内大小 × k；不变 → 宽 × k、游戏内比例不动
  { const sP = state.P, sv = state.view, sd = state.disp, st = state.tab;
    try { state.view = 'export'; state.disp = 'game'; state.tab = 'params';
      state.P = { ...P6, exportScale: 0.5, exportScaleRise: 'keep' }; const a = [exportScaleNow(), exportWidthNow()];
      state.P = { ...P6, exportScale: 0.5, exportScaleRise: 'scale' }; const b = [exportScaleNow(), exportWidthNow()];
      state.tab = 'combo'; const c = [exportScaleNow(), exportWidthNow()]; state.tab = 'params';
      state.P = { ...kikuP, exportScale: 0.5 }; const fb = { P: state.P, meta: { Ww: 10 } }, h1 = productDisplayView(fb, [0, 0, 10, 10], 1, 20).view[2];
      state.P = { ...kikuP, exportScale: 1 }; const h0 = productDisplayView(fb, [0, 0, 10, 10], 1, 20).view[2];
      out.now = { keep: a, scale: b, combo: c, pdv: +(h1 / h0).toFixed(3) };
    } finally { state.P = sP; state.view = sv; state.disp = sd; state.tab = st; }
    const N = out.now; if (!eq(N.keep, [1, 0.5]) || !eq(N.scale, [0.5, 1]) || !eq(N.combo, [1, 1]) || Math.abs(N.pdv - 2) > 0.01) bad.push('引擎回放的缩放口径不对（等比 → 游戏内 × k；不变 → 只缩宽；多层不管；V5 / 单束游戏内也缩）：' + JSON.stringify(N)); }
  return { ok: !bad.length, bad, out };
}"""


async def w27(pg):
    """4.9.32 升空尾缀导出缩放「升空高度：不变」（只缩粗细）"""
    r = await pg.evaluate(W27_JS)
    return r['ok'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)[:1500]

W28_JS = r"""async () => {
  // 4.9.33（用户 10-07 17:26）
  const out = {}, bad = [];
  // ① 阶梯精简：金曜菊-A 节奏快版引菊层导出的 52 级（GoldRay_T75C L1，末尾 0.68 → 0.99 那 4 帧先按修好后的样子换成 0.68）
  const need = [0.3779, 0.3353, 0.2819, 0.2174, 0.2554, 0.2936, 0.3267, 0.3578, 0.3856, 0.4121, 0.4349, 0.4579, 0.4786, 0.4976, 0.5159, 0.5317, 0.5478, 0.5639, 0.5802, 0.5937, 0.6073, 0.6179, 0.6304, 0.6428, 0.6554, 0.6649, 0.6776, 0.6839, 0.6835, 0.6861, 0.6851, 0.6869, 0.6866, 0.6863, 0.6858, 0.6851, 0.6843, 0.6834, 0.6861, 0.6849, 0.6836, 0.6822, 0.6806, 0.6788, 0.678, 0.6812, 0.6804, 0.6756, 0.6756, 0.6756, 0.6756, 0.6756, 0.6756];
  const lv = zoomLevels40(need), ticks = need.map((_, f) => f), keys = stepKeys40(lv, ticks, need.length), keysOld = stepKeys40(need, ticks, need.length);
  const nLv = lv.filter((v, i) => !i || v !== lv[i - 1]).length, worst = Math.max(...lv.map((v, f) => v / need[f]));
  out.levels = { n: nLv, keys: keys.length, keysOld: keysOld.length, worst: +worst.toFixed(3), under: lv.some((v, f) => v < need[f] - 1e-12) };
  if (nLv > 12 || keys.length > 2 * nLv + 1 || out.levels.under || keys.length >= keysOld / 3) bad.push('Zoom 阶梯没精简到 ≤ 12 级 / 有帧比需要的小：' + JSON.stringify(out.levels));
  { const flat = zoomLevels40([0.5, 0.501, 0.502, 0.503, 0.5, 0.5]); out.flat = [...new Set(flat)].length; if (out.flat !== 1) bad.push('差不到 4 % 的几帧应该合成一级：' + out.flat); }
  // ② 收紧：前面 16 帧正常、最后 4 帧几乎全黑（火星只到 0.4 倍）——以前跳回烘焙时的大取景，现在跟前一帧一样大
  { const F = 20, cell = 512, HX = 100, s0 = Array.from({ length: F }, (_, f) => 0.3 + 0.7 * f / (F - 1)), t = s0.map((_, f) => f), m = { L: { F, cellW: cell, cellH: cell }, zoom: true, HX, HY: HX, cy: 0, duration: F / 30,
      sizeKeys: stepKeys40(s0, t, F), times: t.map(f => f / 30), boxes: [], fx: [] };
    for (let f = 0; f < F; f++) { const hx = HX * s0[f], faint = f >= 16, e = hx * (faint ? 0.4 : 0.6), du = 2 * hx / cell, h = new Array(256).fill(0); h[faint ? 10 : 100] = faint ? 30 : 5000;
      m.boxes.push([Math.round((hx - e) / du), Math.round((hx + e) / du) - 1, Math.round((hx - e) / du), Math.round((hx + e) / du) - 1]); m.fx.push({ pk: faint ? 10 : 200, nz: faint ? 30 : 5000, h, px: cell * cell }); }
    const pl = { L: m.L, zoom: true, HX, HY: HX, cy: 0, ticks: t, nTicks: F, maxDisp: 1, sizeKeys: m.sizeKeys }, fp = fitPlan40({ encGamma: 1, cellPad: 0 }, pl, [{ meta: m }]);
    if (!fp) bad.push('合成的 Zoom 帧没收紧'); else {
      const fs = fp.frameScale, ext = s0.map((v, f) => HX * v * (f >= 16 ? 0.4 : 0.6));
      out.fit = { last: fs.slice(14).map(x => +x.toFixed(3)), HX: +fp.HX.toFixed(1), n: fs.filter((v, i) => !i || v !== fs[i - 1]).length, keys: fp.sizeKeys.length };
      if (fs[19] > fs[15] * 1.02) bad.push('几乎全黑的末帧又跳回大取景了：' + JSON.stringify(out.fit));
      if (fs.some((v, f) => v * fp.HX < ext[f] - 1e-6)) bad.push('收紧后有帧装不下自己的内容：' + JSON.stringify(out.fit));
      if (out.fit.n > 12) bad.push('收紧后阶梯超过 12 级：' + JSON.stringify(out.fit)); } }
  // ③ OUTPUT_VER.zoom 只让 Zoom 效果的素材包过期
  { const sv = state.P.zoom, rest = (({ zoom, ...r }) => r)(OUTPUT_VER);
    try { state.P.zoom = 'off'; const a = OUT_SIG(); state.P.zoom = 'on'; const b = OUT_SIG(); out.sig = { off: a === JSON.stringify(rest), on: b === JSON.stringify(rest) + '|zoom' + OUTPUT_VER.zoom };
      if (!out.sig.off || !out.sig.on) bad.push('OUT_SIG：不用 Zoom 的效果签名该和以前一样、用 Zoom 的带 zoom 版本：' + JSON.stringify(out.sig)); } finally { state.P.zoom = sv; } }
  // ④ 产物表单帧：格子里有「在引擎回放里看」，点了切到引擎回放 · 低端
  { const sv = state.P.outPC; state.P.outPC = 'frame'; const html = prodCellHTML({ i: 0, b: null, name: 'x' }, 'pc', false); state.P.outPC = sv;     // 4.9.35 单帧在 PC 列
    out.cell = /data-lowview/.test(html); if (!out.cell) bad.push('产物表 PC 单帧格子里没有「在引擎回放里看」');
    const sview = state.view; toggleDeliv(true); showLowReplay(); out.go = { view: state.view, deliv: !!stage2.deliv, platform: state.platform };
    if (out.go.view !== 'export' || out.go.deliv || out.go.platform !== 'pc') bad.push('「在引擎回放里看」没回到画面、切引擎回放：' + JSON.stringify(out.go));
    selectStageView(sview === 'export' ? 'export' : 'live'); }
  return { ok: !bad.length, bad, out };
}"""


async def w28(pg):
    """4.9.33 Zoom 阶梯精简 + 末帧不跳 + 单帧引擎回放入口"""
    r = await pg.evaluate(W28_JS)
    return r['ok'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)[:1500]

W29_JS = r"""async () => {
  // 4.9.35：低端并进产物表
  const out = {}, bad = [], eq = (a, b) => JSON.stringify(a) === JSON.stringify(b), wait = ms => new Promise(r => setTimeout(r, ms));
  { const prev = state.bake; await openType('kiku'); for (let i = 0; i < 100 && (!state.bake || state.bake === prev || state.baking); i++) await wait(100); } state.playing = false;
  out.out = [layerOut({ out: { pc: 'frame', mobile: 'unit', low: 'frame' } }), layerOut({ out: { mobile: 'dots' } }), singleOut({ ...state.P, outPC: 'frame', outMobile: 'frame', outLow: 'frame' })];
  if (!eq(out.out[0], { pc: 'frame', mobile: 'unit' }) || !eq(out.out[1], { pc: 'seq', mobile: 'seq' }) || 'low' in out.out[2] || out.out[2].mobile !== 'frame') bad.push('导出方案不该再有低端、手机不能选 GPU：' + JSON.stringify(out.out));
  const U = { tag: 'unit' }, F = { tag: 'frame' }, b = state.bake;
  const em = comboEntries([{ L: { out: { pc: 'unit', mobile: 'unit' } }, b, unit: U, unitName: 'A_L1' }, { L: { out: { pc: 'dots', mobile: 'frame' } }, b, frame: F, frameName: 'A_Mobile_L2' }, { L: { out: { pc: 'seq', mobile: 'off' } }, b }], true);
  out.entries = em.map(x => [x.i, !!x.unit && x.unitName, !!x.frame && x.frameName, !!x.dots]);
  if (!eq(out.entries, [[0, 'A_L1', false, false], [1, false, 'A_Mobile_L2', false]])) bad.push('手机的单束 / 单帧没挑出来（或手机出了光点 / 不出的层）：' + JSON.stringify(out.entries));
  // 右栏：没有低端导出；手机 序列 / 单束 / 单帧 / 不出；单帧设置 PC 或手机选单帧才出现
  const sec = SCHEMA.find(x => x.sec === '导出方案'), it = k => sec.items.find(x => x.sel === k || (Array.isArray(x) && x[0] === k));
  out.schema = { low: !!it('outLow'), mob: (it('outMobile') || {}).options.map(o => o[0]), sizeMob: itemVisible(it('lowSize'), { ...state.P, outPC: 'seq', outMobile: 'frame' }), sizeNone: itemVisible(it('lowSize'), { ...state.P, outPC: 'seq', outMobile: 'seq' }), uvMob: itemVisible(it('unitVariants'), { ...state.P, outPC: 'seq', outMobile: 'unit' }) };
  if (out.schema.low || out.schema.mob.join() !== 'seq,unit,frame,off' || !out.schema.sizeMob || out.schema.sizeNone || !out.schema.uvMob) bad.push('右栏导出方案不对：' + JSON.stringify(out.schema));
  // 旧存档：低端选过的打开时提示，不自动改 PC / 手机（单层 P、多层层上）
  { const P0 = { ...defaultsFor('kiku').P, outLow: 'frame', outPC: 'seq' }; migBegin(); migrate37(P0, VERSION); const e = { name: 'x', P: { type: 'kiku' }, M: defaultsFor('kiku').M }, L = newLayer(e, { out: { pc: 'seq', mobile: 'seq', low: 'frame' } });
    const log = MIG_LOG.filter(x => x.k === 'outLow').map(x => x.from); MIG_ON = false; MIG_LOG.length = 0;
    out.mig = { log, inP: 'outLow' in P0, pc: P0.outPC, L: L.out };
    if (log.length !== 2 || out.mig.inP || out.mig.pc !== 'seq' || 'low' in (L.out || {})) bad.push('旧存档的低端：要提示两处、删掉键、不改 PC：' + JSON.stringify(out.mig)); }
  // 正式名：手机才用的单帧不带 _HD，PC 的带 _HD；cascade_mobile.json 的 asset 跟着换
  { const jm = { textures: { L2_frame: { file: TN('A_Mobile_L2', 'Frame') + '.png' } } }, png = new Uint8Array(1);
    const named = applyPackNaming([[TN('A_Mobile_L2', 'Frame') + '.png', png], [TN('A_L1', 'Frame') + '.png', png], ['cascade_mobile.json', utf8(JSON.stringify(jm))]], 'Test',
      [{ ln: 'A_L1', mn: 'A_Mobile_L1', b, mb: b, layer: 'One', pcTex: false, frame: { pc: true, mob: false, suffix: 'D' } }, { ln: 'A_L2', mn: 'A_Mobile_L2', b, mb: b, layer: 'Two', pcTex: false, frame: { pc: false, mob: true, suffix: 'D' } }]);
    const names = named.map(f => f[0]), j = JSON.parse(new TextDecoder().decode(named.find(f => f[0] === 'cascade_mobile.json')[1]));
    out.named = { names: names.filter(f => /^T_/.test(f)), asset: j.textures.L2_frame.asset };
    if (!names.includes('T_EFX_FireWorks_Test_One_1x1_01_HD.png') || !names.includes('T_EFX_FireWorks_Test_Two_1x1_01.png') || out.named.asset !== 'T_EFX_FireWorks_Test_Two_1x1_01') bad.push('单帧正式名不对（PC 带 _HD、只给手机的不带，不加 _MB）：' + JSON.stringify(out.named)); }
  return { ok: !bad.length, bad, out };
}"""


async def w29(pg):
    """4.9.35 低端并进产物表：手机单束 / 单帧、没有低端、旧存档提示、单帧正式名"""
    r = await pg.evaluate(W29_JS)
    return r['ok'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)[:1500]

W30_JS = r"""async () => {
  // 4.9.35 贴图流转
  const out = {}, bad = [], wait = ms => new Promise(r => setTimeout(r, ms));
  { const prev = state.bake; await openType('kiku'); for (let i = 0; i < 100 && (!state.bake || state.bake === prev || state.baking); i++) await wait(100); } state.playing = false;
  for (let s = state.bake; s; s = s.next) s.head = new Target(4, 4, gl.RGBA8);     // 假烘焙没有贴图：给一张 4 × 4 的，好让贴图流转画出来
  state.t = 0.5;
  out.tabs = [...$('#viewSeg').querySelectorAll('[data-view]')].map(b => b.dataset.view + ':' + b.textContent.trim());
  if (out.tabs.join() !== 'live:实时模拟,export:引擎回放,flow:贴图流转,delivery:交付清单' || $('#flowSeg')) bad.push('标签应是 实时模拟 / 引擎回放 / 贴图流转 / 交付清单：' + JSON.stringify(out.tabs));
  selectStageView('atlas'); out.aliasPressed = $('#viewSeg [data-view=flow]').getAttribute('aria-pressed');     // 以前的「贴图」入口也落到这一页
  if (state.view !== 'atlas' || !state.atlasFlow || out.aliasPressed !== 'true') bad.push('切「贴图」没落到贴图流转：' + JSON.stringify([state.view, state.atlasFlow, out.aliasPressed]));
  for (let k = 0; k < 3; k++) { loop(performance.now()); await wait(300); }
  const box = $('#box').getBoundingClientRect(), cv = $('#flowCv').getBoundingClientRect();
  out.wide = { cls: $('#box').classList.contains('wide'), box: [Math.round(box.width), Math.round(box.height)], canvas: [canvas.width, canvas.height], lay: flowLayout, cv: [Math.round(cv.left - box.left), Math.round(cv.top - box.top), Math.round(cv.width), Math.round(cv.height)], cvHidden: $('#flowCv').hidden, labels: [...document.querySelectorAll('#qlabels .qlabel')].map(x => x.textContent.slice(0, 6)) };
  const ar = canvas.width / canvas.height, br = box.width / box.height, L = out.wide.lay;
  if (!out.wide.cls || Math.abs(ar - br) > 0.03 * br || Math.abs(ar - 1) < 0.05) bad.push('贴图流转的画布应铺满画面区（不是正方形）：' + JSON.stringify(out.wide));
  if (!L || !(L.prev.x + L.prev.w <= L.atl.x) || !(L.atl.y + L.atl.h <= L.crv.y) || !(L.prev.w >= L.atl.w * 0.8)) bad.push('布局应是左边当前格、右边整张贴图在上 / 曲线在下：' + JSON.stringify(L));
  const sx = box.width / canvas.width;
  if (out.wide.cvHidden || Math.abs(out.wide.cv[0] - L.crv.x * sx) > 3 || Math.abs(out.wide.cv[2] - L.crv.w * sx) > 3) bad.push('帧号曲线没放到布局里的位置：' + JSON.stringify(out.wide));
  if (out.wide.labels.length !== 2) bad.push('当前格 / 整张贴图两个标签：' + JSON.stringify(out.wide.labels));
  if (!/^贴图流转 · /.test($('#hud').textContent)) bad.push('HUD 应写贴图流转：' + $('#hud').textContent.slice(0, 40));
  // 离开这一页：画布回正方形、曲线藏起来
  selectStageView('live'); for (let k = 0; k < 2; k++) { loop(performance.now()); await wait(300); }
  out.back = { cls: $('#box').classList.contains('wide'), canvas: [canvas.width, canvas.height], cv: $('#flowCv').hidden };
  if (out.back.cls || out.back.canvas[0] !== out.back.canvas[1] || !out.back.cv) bad.push('离开贴图流转后画布应回正方形：' + JSON.stringify(out.back));
  return { ok: !bad.length, bad, out };
}"""


async def w30(pg):
    """4.9.35 贴图 + 流转合成「贴图流转」，画布铺满画面区"""
    r = await pg.evaluate(W30_JS)
    return r['ok'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)[:1500]

W31_JS = r"""async () => {
  // 4.9.36（用户 10-07 20:37「两层效果都设置了序列时长，但我的模板默认是3.17秒，那它就一直显示3.17秒？不应该我改了7秒，时间轴也会延长到7秒吗」）：
  // 金曜菊-A · 快 ×1.67（TP-MYJA-O-T60）两层都设了出点（1.40 / 3.18 s），烘焙只烘到出点，时间轴按烘出来的长度 → 改序列时长时间轴不动
  const out = {}, bad = [], wait = ms => new Promise(r => setTimeout(r, ms)), fb = bake;
  // 假烘焙按入出点烘（和 bakeMaster 一样只排 [入点, 出点]），才复现得了「出点把时间轴压短」
  const chk = { clipFrames: [], edgeFrames: [], chanUse: [true, true, true, true], emptyMid: [], similar: 0, seam: null, maxClip: 0 };
  bake = async (P, scale, onProg) => {
    const Pc = structuredClone(typeof fxP === 'function' ? fxP(P) : P), fm = measure(Pc), ci = +Pc.cutIn > 0 ? +Pc.cutIn : 0, co = +Pc.cutOut > ci ? Math.min(+Pc.cutOut, Pc.duration) : 0;
    const pl = plan(Pc, fm, ci, co || Pc.duration), pages = splitPlan40(pl);
    const parts = pages.map(meta => ({ P: Pc, form: Pc.form, N: 4, NH: 4, cw: 1, chh: 1, scale: 1, fm, head: { dispose() { } }, tail: null,
      meta: { ...meta, check: chk, lightKeys: [[0, 1], [1, 0]], darkTail: 0, frameMaxes: [], quality: qualityOf(Pc), expoH: 1, expoT: 1, bakeMs: 1, sparkSlots: 0, cut: { in: ci, out: co } } }));
    parts.forEach((b, i) => b.next = parts[i + 1]); if (onProg) onProg(1); await wait(30); return parts[0];
  };
  const busy = () => state.baking || (state.layerQueue && state.layerQueue.size) || window.__opening;
  try {
    const e = FW_REVIEW_LIST.find(x => x.id === 'TP-MYJA-O-T60'); if (!e) return { ok: false, bad: ['找不到 TP-MYJA-O-T60'], out };
    window.__opening = true; try { await openReview(e); } finally { window.__opening = false; }
    for (let k = 0; k < 300 && (state.tab !== 'combo' || busy() || !state.layers.every(L => layerEntryOf(L) && layerEntryOf(L).bake)); k++) await wait(100);
    state.playing = false;
    out.open = { tab: state.tab, n: state.layers.length, P: state.layers.map(L => { const P = layerEntryOf(L).P; return [P.duration, P.cutOut]; }), D: +curDuration().toFixed(3) };
    if (state.tab !== 'combo' || state.layers.length !== 2) return { ok: false, bad: ['没打开成两层：' + JSON.stringify(out.open)], out };
    for (const i of [0, 1]) {
      selectComboLayer(i); await wait(80);
      const sl = document.querySelector('#params [id^="p-duration-"]'), num = sl && sl.parentElement.querySelector('.num');
      if (!num) { bad.push(`第 ${i + 1} 层右栏找不到「序列时长」`); continue; }
      num.value = '7'; num.dispatchEvent(new Event('change')); await wait(60);
      out['flash' + (i + 1)] = $('#status').textContent;
    }
    for (let k = 0; k < 300 && busy(); k++) await wait(100);
    await wait(200);
    out.flashAfterBake = $('#status').textContent;     // 改了就重烘：这句不能被「重烘第 n 层… %」盖掉
    if (!/出点 3\.18 s/.test(out.flashAfterBake)) bad.push('出点的说明被烘焙进度盖掉了：' + out.flashAfterBake);
    out.P = state.layers.map(L => { const P = layerEntryOf(L).P; return [P.duration, P.cutOut]; });
    out.D = +curDuration().toFixed(3);
    if (Math.abs(out.D - 7) > 0.02) bad.push(`两层序列时长都改成 7 s，时间轴应是 7 s：现在 ${out.D} s`);
    out.content = typeof comboContentEnd === 'function' ? +comboContentEnd().toFixed(3) : null;
    if (!(out.content > 3 && out.content < 3.3)) bad.push(`导出长度不该跟着变（出点还在 3.18 s）：${out.content}`);
    stage2.tlSig = ''; buildTlBars(); loop(performance.now());
    out.tlabel = $('#tlabel').textContent;
    if (!/\/ 7\.00 s$/.test(out.tlabel)) bad.push('时间显示应到 7.00 s：' + out.tlabel);
    out.ruler = [...document.querySelectorAll('#tlBars .tlr-track > span')].map(x => x.textContent).slice(-1)[0];
    if (out.ruler !== '7s' && out.ruler !== '6s') bad.push('刻度应到 6–7 s：' + out.ruler);
    out.voids = [...document.querySelectorAll('#tlBars .tlb-t i.void')].map(v => ({ l: v.style.left, w: v.style.width, em: v.textContent, t: v.title.slice(0, 34) }));
    if (out.voids.length !== 2 || !out.voids.every(v => /出点后/.test(v.em) && /不导出/.test(v.t))) bad.push('两层轨道上出点后到 7 s 应画「出点后 · 不导出」：' + JSON.stringify(out.voids));
    else { const r = parseFloat(out.voids[1].l) + parseFloat(out.voids[1].w); if (Math.abs(r - 100) > 0.5) bad.push('第 2 层斜纹应画到时间轴尽头：' + JSON.stringify(out.voids[1])); }
    if (!/出点 3\.18 s/.test(out.flash2 || '') || !/清除/.test(out.flash2 || '')) bad.push('改序列时长、设了出点时应说一句（出点 3.18 s、怎么清除）：' + out.flash2);
    // 清除第 2 层出点：导出长度回到内容（假烘焙不裁全黑 → 7 s），斜纹没了
    selectComboLayer(1); await wait(60); const clr = document.querySelector('#tlBars [data-cut=clear]'); if (clr) clr.click();
    for (let k = 0; k < 300 && busy(); k++) await wait(100);
    await wait(200); stage2.tlSig = ''; buildTlBars();
    out.cleared = { cut: layerEntryOf(state.layers[1]).P.cutOut, content: typeof comboContentEnd === 'function' ? +comboContentEnd().toFixed(3) : null, voids: document.querySelectorAll('#tlBars .tlb-t i.void').length };
    if (!clr || out.cleared.cut !== 0 || out.cleared.voids !== 1) bad.push('清除第 2 层出点后应只剩第 1 层斜纹：' + JSON.stringify(out.cleared));
    // 单层：设了出点、序列时长 7 s → 时间轴 7 s
    const prev = state.bake; await openType('kiku'); for (let i = 0; i < 100 && (!state.bake || state.bake === prev || busy()); i++) await wait(100);
    state.P.cutOut = 2; onParam(); for (let k = 0; k < 100 && (busy() || state.dirty); k++) await wait(100);
    const sl = document.querySelector('#params [id^="p-duration-"]'), num = sl && sl.parentElement.querySelector('.num');
    if (num) { num.value = '7'; num.dispatchEvent(new Event('change')); }
    for (let k = 0; k < 100 && (busy() || state.dirty); k++) await wait(100);
    await wait(150);
    out.single = { D: +curDuration().toFixed(3), bake: state.bake ? +bakeTotal(state.bake).toFixed(3) : null, dur: state.P.duration };
    if (Math.abs(out.single.D - 7) > 0.02) bad.push('单层：序列时长 7 s、出点 2 s，时间轴应是 7 s：' + JSON.stringify(out.single));
  } finally { bake = fb; }
  return { ok: !bad.length, bad, out };
}"""


async def w31(pg):
    """4.9.36 时间轴 = 序列时长（用户 10-07 20:37）：出点 / 结尾全黑不再把时间轴压短，不导出那段在轨道上画斜纹并说清楚"""
    r = await pg.evaluate(W31_JS)
    return r['ok'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)[:1800]

N3_JS = r"""(() => {
  // 排查计划第 1 步：SCHEMA ↔ BASE / 花型默认值 ↔ 参数名称表 ↔ 发射器表 ↔ INERT / RAND_OF / SPARK_KEYS / PHASE_KEY / TIMING_KEYS / BLANK_MODS，缺一边就报
  const bad = [], keys = new Set(), items = [];
  for (const sec of SCHEMA) for (const it of sec.items) { const k = Array.isArray(it) ? it[0] : it.sel || it.text || it.curve || (it.info ? 'info:' + it.info : ''); if (!k) continue; keys.add(k); items.push([sec, it, k]); }
  const types = Object.keys(TYPES), D = types.map(t => defaultsFor(t).P);
  for (const [sec, it, k] of items) {
    if (!k.startsWith('info:') && k !== '_trailTier' && !(k in BASE) && !D.some(P => P[k] !== undefined)) bad.push(`「${sec.sec}」的 ${k} 没有默认值（BASE 和所有花型模板都没有）`);
    const nm = pnameOf(sec.sec, k, Array.isArray(it) ? (typeof it[1] === 'function' ? '' : it[1]) : it.label);
    if (!nm) { bad.push(`「${sec.sec}」的 ${k} 在参数名称表里没有`); continue; }
    if (!PEMIT.P[nm.id]) bad.push(`${k}（${nm.id}）在发射器表里没有`);
  }
  const has = (k, where) => { if (!keys.has(k)) bad.push(`${where} 里的 ${k} 不是面板参数`); };
  for (const [ks] of INERT) ks.forEach(k => has(k, 'INERT'));
  for (const [k, b] of Object.entries(RAND_OF)) { has(k, 'RAND_OF'); has(b, 'RAND_OF'); }
  SPARK_KEYS.forEach(k => has(k, 'SPARK_KEYS')); Object.keys(PHASE_KEY).forEach(k => has(k, 'PHASE_KEY')); [...TIMING_KEYS].forEach(k => has(k, 'TIMING_KEYS'));
  for (const [m, x] of Object.entries(BLANK_MODS)) for (const k of [...Object.keys(x.add || {}), ...Object.keys(x.off || {})]) if (!(k in BASE)) bad.push(`BLANK_MODS「${m}」的 ${k} 不在 BASE 里`);
  const used = new Set(items.map(([sec, it, k]) => { const nm = pnameOf(sec.sec, k, Array.isArray(it) ? (typeof it[1] === 'function' ? '' : it[1]) : it.label); return nm && nm.id; }));
  const SPEC_BOX = ['texW', 'texH', 'cols', 'rows', 'chans', 'outMode', 'encGamma', 'frameMode', 'zoom'];     // 规格框（#specBox）里的控件，不在 SCHEMA
  const orphan = PNAMES.filter(r => !used.has(r.id) && !SPEC_BOX.includes(r.key)).map(r => r.id);
  return { bad, n: items.length, orphan };
})()"""


async def n3(pg):
    """排查计划第 1 步：SCHEMA 每一项都有默认值、名称表的名字、发射器表的归属；INERT / RAND_OF / SPARK_KEYS / PHASE_KEY / TIMING_KEYS 里的键都是面板参数；名称表里没有对不上 SCHEMA 的行"""
    r = await pg.evaluate(N3_JS)
    bad = list(r['bad']) + ([f"参数名称表里有 {len(r['orphan'])} 行对不上面板：{r['orphan'][:6]}"] if r['orphan'] else [])
    return not bad, '；'.join(bad[:8]) or f"{r['n']} 项面板参数：默认值、名字、发射器归属、规则表都对得上"


async def main():
    global HTML, REAL
    ap = argparse.ArgumentParser(); ap.add_argument('--only', default=''); ap.add_argument('--out', default=''); ap.add_argument('--html', default=''); ap.add_argument('--real', action='store_true')
    a = ap.parse_args(); only = set(x for x in a.only.split(',') if x); REAL = a.real
    if a.html: HTML = pathlib.Path(a.html).resolve().as_uri() + '?fast'
    from playwright.async_api import async_playwright
    res = []
    async with async_playwright() as p:
        b = await launch_async(p)
        for name, fn, own in [('A1', a1, False), ('A2', a2_same, True), ('A3', a3, False), ('A4', a4, False), ('A5', a5, False), ('A6', a6, False), ('A7', a7, True), ('P1', p1, False), ('U1', u1, False), ('B1', b1, False), ('V1', v1, False), ('X1', x1, False), ('G1', g1, False), ('K1', k1, False), ('K2', k2, False), ('R1', r1, False), ('N1', n1, False), ('N2', n2, False), ('S1', s1, False), ('S2', s2, True), ('S3', s3, False), ('S4', s4, False), ('E1', e1, False), ('X2', x2, False), ('N3', n3, False), ('R5', r5, False), ('R6', r6, False), ('W1', w1, False), ('W2', w2, False), ('W3', w3, False), ('W4', w4, False), ('W5', w5, False), ('W6', w6, False), ('W7', w7, False), ('W8', w8, False), ('W9', w9, False), ('W10', w10, True), ('W11', w11, False), ('W12', w12, False), ('W13', w13, False), ('W14', w14, True), ('W15', w15, True), ('W16', w16, True), ('W17', w17, False), ('W18', w18, False), ('W19', w19, False), ('W20', w20, False), ('W21', w21, False), ('W22', w22, False), ('W23', w23, False), ('W24', w24, False), ('W25', w25, False), ('W26', w26, False), ('W27', w27, False), ('W28', w28, False), ('W29', w29, False), ('W30', w30, False), ('W31', w31, False), ('L1', l1, True)]:
            if only and name not in only: continue
            t0 = time.time()
            try:
                if own: ok, why = await fn(p, b); errs = []
                else:
                    ctx, pg, errs = await fresh(p, b)
                    ok, why = await fn(pg); await ctx.close()
            except Exception as e: ok, why, errs = False, f'异常：{e}', []
            if errs: why += ' · 页面错误：' + errs[0][:200]
            if ok is None: print('⏭', name, why, flush=True); continue          # 这一项只在真烘焙时跑
            res.append({'item': name, 'pass': bool(ok), 'why': why, 'sec': round(time.time() - t0, 1)})
            print(('✅' if ok else '❌'), name, why, f'（{res[-1]["sec"]} s）', flush=True)
        await b.close()
    if a.out: json.dump(res, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    sys.exit(0 if all(r['pass'] for r in res) else 1)

if __name__ == '__main__':
    asyncio.run(main())
