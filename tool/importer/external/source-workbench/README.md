## v2.28配色同步（2026-10-24）

原v2.28入口只追加共享颜色块，保留原脚本/存储键/布局/版本；蓝灰表面、青绿主色、文字与语义色读取F:/FireWorksLab/tool/design-system/tokens.json。构建器接入sync_importer_colors.apply_theme，后续构建不回退旧绿。仅重同步颜色：python F:/FireWorksLab/tool/design-system/sync_importer_colors.py --html D:/FXTools/DFWorkbench/df-fx-workbench_v2_locmai.html。原始工具与独立2.29本轮保持。

## 2.29部署补发 · 烘焙器文件入口（2026-10-19晚）

上一轮只验证HTTP导入页，漏了烘焙器file入口的runtime副本。19:39仍执行旧--proofs命令；本轮第一次读到的副本20:10已含新版，不能倒推当时磁盘快照。现在build-delivery生成独立HTML后会核对本机配置来源、复用F盘prepare同步既有副本、核对实际登记代码；缺目录不创建、不同配置不覆盖、旧生成物不报成功。4项新部署回归通过，实际副本与当前源的规范生成结果一致。原始工具/旧工作台不变；不执行UE或真实登记。共享版本戳/自动握手由导出23认领处理。本机用户需先保存效果，再整页刷新烘焙器以重新载入脚本，单点重连不会更新已加载代码。

## 独立交付入口 v2.29 · 登记命令超长与收尾恢复（2026-10-19）

- 修复累计贴图证明全部放入 Windows 命令行的缺陷。真实日志36000字符超过32767，资产已保存后登记启动报 Error87；现在固定命令行、JSON走stdin，communicate同时收发。保留历史证明和旧小规模CLI兼容。
- 资产写入、交付登记分阶段反馈；登记错误带实际saved/add/edit计数，焦点转到失败包，标签显示已保存/登记待补齐。
- 仅所有所选目标都有保存回执且属于登记失败（含旧Error87）时，显示「补写交付登记（不重导资产）」。用户点击后重读源、目标映射、类型、来源标签、脏包、磁盘文件及贴图保存哈希，再只登记；来源/资产/存储错误继续保留失败。没有自动迁移或补写真实任务。
- 14组检查全部通过，含真实Windows旧错误复现、2000条UTF8输入、引擎Python2.7→3.12、损坏输入拒绝、实际生成的只读复核Python、源与磁盘变化阻止恢复、15项控制器交互。8034真实入口4个隔离浏览器场景通过：完整成功、登记失败、只补登记、旧Error87刷新恢复。浏览器网络全部模拟UE，未写真实UE/P4/资源登记。
- 只部署 df-fireworks-delivery_locmai.html；原始工具与已停止更新的df-fx-workbench_v2_locmai.html保留改前原字节。当前源上的NoMip/DistantVFX/NeverStream等既有规则保留。测试/备份留既有目录，未创建新目录。

## v2.25 · Approved Material workbench (2026-10-09)

- Apply the approved dark-green Material roles, 18px navigation groups, 16px fields/body, 14px names/status/logs and 48px general control targets across the existing six tools. Embed 17 official Apache-licensed Material Symbols offline; common hover/focus/pressed/disabled/busy feedback, ripple and reduced-motion behavior. One mint primary action; planned new/update/reuse/skip tags remain neutral.
- Import queue/settings/asset preview retain the fixed shell, confirmation/action footer and collapsible bottom log. Names wrap in full; paths and source details remain expandable. Narrow layouts use presentation-only queue/settings/preview tabs instead of stacking compressed forms; selecting a view cannot select a package or authorize import. Keep original control IDs, events and domain storage.
- Add described/focused required-field feedback, dismissible copy toast and error summary with explicit full details/log access. Selecting log text pauses auto-follow. Busy operations cannot double-submit or edit settings; resize and rerender retain a single narrow pane and valid keyboard focus. Confirmation count stays in the fixed footer; confirmation never writes UE.
- Preserve v2.24 Unicode/source-control receipt repair and every protected native/planner/show source hash. No real UE calls, asset writes, deletion, reimport or new directories. Flat pre-change backups exist in the existing backups directory.
- 16 isolated scripts / 247 PASS checks completed, including generated native Python receipts and update/recovery simulations. The initial Material test failed before implementation. Superseded CSS breakpoint expectations were updated; old whole-importer comparison was replaced by untouched engine/compiled importOne and source hash preservation because this release intentionally changes UI functions.
- Live file-page visual QA remains BLOCKED by browser policy. No localhost mirror, raw browser/CDP or alternate renderer was used. CSS/DOM checks do not prove visual fidelity, actual viewport geometry or full accessibility. User may refresh the original HTML entry (Ctrl+F5) to view v2.25. No data migration or automatic import is triggered.

## v2.24 · Source-control error receipts (2026-10-09)

- UE SourceControl.last_error_msg() returns FText. Convert error messages explicitly to Unicode before JSON encoding under engine Python 2.7; retain non-ASCII exception messages. Recheck provider availability for each receipt so a mid-batch disconnect is not hidden by the initial availability snapshot.
- A saved file with failed add/checkout remains an incomplete import. Actual saved/add/edit counts are received before the error is raised; disabled source control stays distinct from enabled-but-offline. No blanket JSON default conversion or silent success.
- This incident was triggered by a Perforce SSL connection failure. All twelve textures were already non-empty files on disk; old UI reported zero because receipt serialization failed. Source-control connectivity is external to this fix. Refresh the same HTML entry and use same-name update, then check/confirm again to complete the partial package; do not change the asset number solely to recover.
- 71 isolated checks passed, including production-generated Python executed by engine Python 2.7, recovery/update/backend/UI checks. Native read-only FText and Chinese roundtrip passed; twelve existing file hashes and immutable original HTML SHA256 unchanged. No asset writes, cleanup, new folders or automatic reimport. Full user-package import and live browser visual acceptance were not performed.

## v2.23 · Main-pack import compatibility (2026-10-08)

- Select cascade.json or cascade_mobile.json per package; persist the choice and invalidate confirmation when changed. Ignore extras; no obsolete low/MB third pack. Mobile CPU beam uses existing import handling; mobile GPU is rejected before writes.
- Explicitly marked 1x1 grayscale/Ramp single-frame emitters enable linear-R dissolve with dynamic parameter index2, strict material readback and single-sided rendering. Unmarked material/emitter progress stays neutral. Mixed enabled/disabled references to one material are rejected. Existing colored single-frame material was audited read-only; its different color/alpha/index1 dissolve contract is documented, not silently mapped to the grayscale role.
- Same-source Ramp/Cutout aliases share one selectable physical write. Export CRC32/FNV1a/length plus PNG SHA256 bind reuse; only saved clean Texture2D assets with matching disk hash/platform/policy qualify. Reused targets are shown in preview and excluded from save/checkout/backup. A deselected earlier batch owner blocks dependent reuse. No automatic migration or old-asset backfill.
- Added isolated compatibility, reuse, UI and actual Python pack-reader checks. Five native property checks passed before cleanup; these are not full effect playback or browser visual acceptance.
- Native cleanup incident: DuplicateAsset unexpectedly auto-saved one test MI; it was quarantined and its pending add reverted. Test objects moved to Transient, but dirty empty packages could not unload. A later quarantine-save console command caused UE fatal FilenameToLongPackageName rejection of an external path. User informed immediately; no further native operations. Formal assets were not changed by these tests, User reopened UE; read-only recovery inspection confirmed no test files/objects/pending adds/checkouts and zero dirty content packages. This console cleanup probe is disabled and is not part of production import.

## v2.22 · Particle system policy (2026-10-07)

- Selected new/rebuilt particles use fixed10FPS/delta0.1, user screenshot base settings, culling120000cm and enabled fixed bounds ±100000cm on every axis.
- Each GPU Required receives its own conservative Max Draw Count from source rate/lifetime/bursts/loops plus tick margin. Preview offers per-emitter measured peak override; clearing restores automatic. Missing finite emission bounds require source correction or actual measured peak, never a guessed 500.
- Measured inputs persist with package and source identity; editing invalidates confirmation immediately. Skipped PS does not receive policy/count writes. Failed updates restore old emitter links and all touched system settings.
- Native unsaved-object readback passed; no saved assets, directories, Cascade playback or formal asset modifications. Isolated UI checks do not replace real browser/visual acceptance.

## v2.21 · Scale Color/Life contract (2026-10-07)

- The native class mapping already existed in v2.20. Add strict vector/float distribution validation and place the multiplier after synthesized Pivot.
- Preserve source const/curve values, CPU/GPU bake rules, AlphaOverLife flicker/fade, metadata filtering and all existing asset/UI policies.
- New malformed input checks stop before writes. Unknown native fields still fail, rather than silently losing parameters.
- Refresh the existing HTML entry. No automatic reimport, asset moves or new folders. Existing workbench v2.20 visual QA remains pending; this release does not change the interface.

# DF 特效工作台 v2.20

## v2.20 · 2026-10-06 · 第一版一屏导入工作区

原生产入口和桌面快捷方式不变。刷新后核对右上角工作台 v2.20。

- 左侧素材队列、中栏当前包设置、右栏当前包资产预览同时存在。查看不改变勾选；添加/批量编辑只占中栏，取消不丢原批次。
- 底部只有一个可见主动作：添加 → 检查当前包 → 确认当前包并查看下一个 → 全部确认后执行导入。确认绝不自动导入；改名称/目录/范围作废对应确认，刷新须重新检查。执行中锁定设置，停止仍在当前包完成后生效。
- 完整名称保留可选择文本，长名可横向滚动；「查看目标目录」展开完整路径、名称换行及每项来源/平台上限。低频命名设置和规则折叠；各窗格独立滚动，底部动作固定。
- 日志在没有保存过开合偏好时默认一行；保留显式偏好，错误展开。展开占实际空间，不覆盖动作。1366及1920宽度三栏，窄屏上下双区仍保留下一步；这是CSS设计和离线检查，不是实页几何验收。
- 导入引擎、命名/依赖/可选轮廓策略、HD/手游尺寸/ASTC/单面与无溶解/部分恢复保护保持。没有自动重导任何资产，没有新目录。

28套隔离脚本575条PASS，新增17条流程检查；原始源和v2.19原生导入/选择/规划/编排原文保持。真实UE写入0。file://浏览器策略仍禁止实页读取，未绕过，尚缺渲染后截图对照：design-qa.md 的 final result 为 blocked，不能把离线检查记成视觉通过。

## v2.19 · 2026-10-06 · 可选轮廓图跳过

同一入口与快捷方式，刷新后核对 v2.19。

- 勾选表示导入/更新。取消可选轮廓图后，不导入，也不写入本次新建或重建粒子的 CutoutTexture；默认四边形可能增加透明区域绘制开销。只用于 RequiredModule 裁边的 cutout 才可选；同时被材质使用的纹理仍是必需依赖。
- 在跳过的轮廓图行提供「复用现有轮廓图（不导入）」：明确保留引用，检查同路径正确类型的已有资产，执行前再查；不会导入、更新、迁出或保存这张图。
- 主贴图、Ramp、材质的依赖检查保留；未勾选的粒子和材质不会修改。取消不删除原有资源，选择保存到浏览器；改选作废确认，刷新需重新检查、确认；忙时锁定。
- 历史已完成资源不会自动变化。未完成旧任务取消轮廓图后，本次用途请在新预览确认；需要沿用旧图必须显式选择复用。现有资源同名更新仍按所选粒子全部重建发射器，不保留旧手动模块。

先用 v2.18 复现「取消仍报必需依赖」，再修复。27套隔离脚本全部通过、558条PASS，新15项覆盖UI选择/复用/刷新/确认/锁定和完整模拟新建/更新执行范围；来源JSON、帧格参数、原工具与其它引擎保持。没有正式UE写入、新目录或Cascade播放；尚未真实导入及浏览器视觉验收，不把模拟成功当作原生验收。

## v2.18 · 2026-10-06 · 只读像素格式与部分导入恢复

原入口、桌面快捷方式不变，刷新后核对 v2.18。

- 失败根因是项目的 PlatformCustomSettings.PixelFormat 在 Python 中只读。改用已在原生临时对象上验证的完整属性文本 Map 写入，保留其它平台键，三平台与尺寸全部读回后才保存；未知结构先拦截，不覆盖。
- 「新建」仍不覆盖已有资产。「更新同名」现在允许部分完成的包：更新已有贴图/材质，补建缺少材质/粒子。所选目标全部不存在时仍提示新建；磁盘存在却无法加载、类型错、来源不符、不可迁出、异常LOD仍阻止。不通过改序号恢复。
- 只有原来实际存在的粒子才读取旧发射器/关闭编辑器/启用回滚。缺少的粒子走完整新建、LOD和缓存同步，不假装旧粒子已存在。
- 内存中已有但磁盘尚无文件的贴图先备份/保存，再按原流程添加或迁出；预备迁出不再对无磁盘文件的对象强行操作。日志区分已载入贴图、已保存、已添加、已迁出；版本管理失败不会标完成。
- 本次中断任务：刷新 → 选「更新同名」→ 重新检查 → 逐项核对预览 → 确认 → 执行。无需删除现有贴图或修改编号，取消不需要的项仍遵循依赖检查。

26 套隔离脚本全过、543 条 PASS；新增14项部分导入和界面确认检查。原生临时测试对象验证两个尺寸上限、三个ASTC字段、其它平台保留、单面与无溶解读回；0 正式资产写入、0 新目录、未打开Cascade。本次正式任务没有自动重导，完整真实导入/版本管理及实际页面视觉未验。原始源SHA与既有编排/滚动/选择功能保留；详细证据仅本机。

## v2.17 · 2026-10-06 · 工作台滚动边界

入口与桌面快捷方式不变；刷新 `D:/FXTools/DFWorkbench/df-fx-workbench_v2_locmai.html`，核对页头 v2.17。

- 顶部连接栏和当前工具标题保持可见。右侧工作区独立滚动，左侧导航只有自身过长时才滚动；滚轮不带着整个页面走。
- 日志仍固定底部，按真实高度给右侧内容留空间；展开、收起、错误自动展开时不会压在执行栏上。正文的执行栏贴正文区域底部，窄屏沿用现有正常流动按钮。
- 六个工具分别记住滚动位置，同一页重复点击不跳；同标签页刷新恢复位置，任务锁定时切页不会重置内容。原控件移动到正文容器，不复制、不丢输入监听。窄屏沿用菜单抽屉，关闭后正文恢复可操作；聚焦正文后可用原生键盘翻页。

先在v2.16复现缺少独立正文滚动区的失败，随后25套隔离脚本全部通过、529条PASS（新增17条滚动检查）。导入器与编排完整段逐字未改、原始工具SHA保持。新目录0、真实UE写入0。没有真实浏览器几何/滚动截图，离线DOM与CSS检查不能代表实页或原生验收通过。

## v2.16 · 2026-10-06 · 包内资产选择与固定操作记录

入口和桌面快捷方式不变；刷新 `D:/FXTools/DFWorkbench/df-fx-workbench_v2_locmai.html`，核对页头 v2.16。

- 添加素材 → 检查所选并预览 → 在名称清单逐项勾选贴图/材质/粒子 → 确认所选资产 → 执行。取消项不会导入、更新、迁出或保存，更不会删除；选择随批次保存在浏览器，重新检查和刷新保留，旧确认失效。
- 只选贴图可以单独导入；取消粒子不会重建发射器。勾选的材质需要其贴图，勾选的粒子需要对应材质及轮廓图；取消依赖时，必须在相同目标路径已有正确类型的资产，预览显示「复用现有依赖」。缺失、类型错误或执行前消失均拦截。借用的公共材质仍不进入写入清单。
- 新建只检查勾选目标是否重名，同名更新只备份/迁出/写入所选项；不选粒子可以只更新贴图或材质。部分导入记录显示「所选 N 项已完成 · 其余跳过」，不把跳过项记为已导入。若稍后导入剩余的新资源，切回新建并只选未生成的资产；已有依赖可以取消勾选并复用。
- 操作记录固定在工作区底部；点击标题展开/收起，收起后仍显示最新反馈；错误自动展开。页面及执行栏预留实际面板高度。翻看历史时新日志不抢滚动，「回到最新」恢复跟随；侧栏「运行日志」直接展开，清空同时清除摘要。各页与长任务共用同一面板。

24 套隔离脚本通过，512 条 PASS；先复现无单项勾选和日志非固定两项失败。依赖、部分新建/更新、未选资源不写、确认失效、刷新、锁定、两桌面尺寸及手机CSS规则均检查。原始工具SHA保持，真实UE资产写入0，新目录0。没有真实浏览器截图/几何验收或UE导入实播，离线检查不代替这些验证。v2.15目录、尺寸、ASTC、单面及溶解策略保留。


## v2.15 · 2026-10-06 · 导入目录、格式与材质策略修复

入口仍为 `D:/FXTools/DFWorkbench/df-fx-workbench_v2_locmai.html`，桌面快捷方式不变。刷新并核对页头 v2.15。清理旧资产后请新建批次，使用「新建资源」重新检查、预览确认，再执行；旧成功记录不自动撤销，不通过改编号绕开它。

- 用户确认完整贴图名以 `_HD` 结尾为HD/PC：序列、轮廓、Ramp均进入既有 `/Game/Effects_HD/Common_HD/Texture_HD/FireWorks_HD`，最大尺寸2048。其它名称为手游：序列/轮廓进入既有 `/Game/Effects/Common/Texture/Fireworks`，Ramp进入既有 `/Game/Effects/Common/Texture/Ramp`，最大尺寸1024。名称本身不自动增删HD；预览逐项展示平台、目录、上限。粒子和自建材质实例仍使用现有HD目录，此次没有新增整套手游粒子导入模式。
- 三个平台Android/OpenHarmony/IOS显式写PF_ASTC_6x6，保留其它平台项及BC7等参考基础设置。尺寸上限在复制参考参数之前覆盖，保存前显式读回；源PNG不重采样，「已导入」仍显示源尺寸是正常的，「最大纹理尺寸」与运行时上限才应为1024/2048。
- 本工具创建/更新的材质实例显式单面，去掉Dissolve贴图覆盖并写中性遮罩参数（Speed=0、Offset=1、Power=1、Progress=0、ParticleAlphaDissolve=0），动态溶解通道归零。保持MainTex、Ramp、Rows/Cols、亮度与其它基类覆盖；绑定与策略合为一次材质更新。仅借用的公共Spark/Glow实例不批改。
- 预览和执行均核对路径与现存目录；缺少目录就停，禁止嵌套写入/隐式创建WorkbenchChecks等子目录。旧预览不能直接用于新规则执行；不自动迁移或删除已有资产。
- 同名更新备份改为UUID前缀平铺文件，原盘与更新前内存快照各留一份，独立manifest记录对应关系。只使用已存在的asset-backups目录，不创建任何新目录；记录展示具体manifest路径。
- 新建/同名更新、缺目录、写入拒绝、读回缺项、旧发射器保护均有隔离检查。21个既有安全脚本全过（465条PASS）＋16项策略检查；本机UE只读确认属性类型并对5段生成脚本compile，未执行这些写资产脚本，未重导/移动/删除/打开Cascade。不能将隔离检查算作UE实播通过。

策略与验证证据：`fireworks-policy.js`、`check-import-policy.cjs`、`backups/20261006-policy-*.json`；完整改前快照在既有backups平铺文件。原始v1.0.1未改动，整场编排源和其数字不变。之前失败任务的独立保存先后问题仍未改，本次用户清理后用新建模式重导。

## v2.14 · 2026-10-06 · 编排联动v1（开场＋白墙小样）

继续使用 `D:/FXTools/DFWorkbench/df-fx-workbench_v2_locmai.html` 和原桌面快捷方式。刷新后页头/标题为v2.14。在「烟花编排」上方选择「整场工程」，点击「导入开场＋白墙小样」→看预览→确认→播放。选择「白墙180–210s」直接看四波节奏；选择「开场0–15s」看三层两波。无需UE连接也可看简笔画。

新建工程是空白；小样是主动导入的数值提案，不是恢复已移除的默认配比。工程四页共用资源、完整单发、场地/阵型、时间轴。ID预设只改ID，保留手填数值；新增资源/单发/阵型及事件均可复制、移除。修改被引用条目的版本会提示重新绑定，明确核对后再输出。

小样范围：开场三层两波＋九点四波白墙，中段只有占位，未编完整跨年秀。8个资源、10个单发、3个阵型、6个时间事件；106条完整单发，其中72开花、54尾缀、34组扇形340簇，白墙36发。尾缀、银白主花及低层小银花的真实ID留空，不能冒用旧TR2/V5素材。已知FanGold/金色ID只是现有表快照候选，仍需核对当前PC资源。

- **时序**：输入目标起爆时刻，发射 = 起爆 − 完整单发飞行时长。开场第二波10s起爆；白墙185/187/189/191s发射，190/192/194/196s齐爆。所属段落按目标时间，允许在上一段预发。严格齐爆要求成员时差与时间随机均为0；负发射要明确填预卷，不静默截到0。
- **场地**：五段150/150/200/150/150m；坝150m、前台50m；转角15°和前移45m是可改估值。可改整体场地，或显式转成逐点编辑坐标。未转自定义时主排九点按总弧长等分；本小样是每100m。高度/花径用m编辑，输出位置为cm；倾斜时以完整变换计算世界爆点。
- **飞行与尺寸**：飞行档和花径档只是独立标签，不自动改其它数值。可调目标升高、花径、固定大小/高度/角度随机，通道独立；改变别的事件不重抽已有事件。简笔画只显示构图与节奏，不能代表素材内Cascade弹道或真实组件缩放。
- **标定**：默认手填倍率1。不用旧TR2/V5/Zoom公式自动推RT6倍率。只有填原尺寸、标定记录并确认当前ID/源版本已在UE验证后，才可选按标定换算。换ID或源版本保留数字，但旧标定确认失效；不得拿旧素材测量当新素材的缩放依据。
- **旧单发衔接**：「子模板制作」保留原编辑器。有效原生子模板可显式「接收到整场工程」，先预览再合并；内部资源段原值保留。按起爆编排前，填写内部起爆延迟并确认锚点；不能默认将触发当作开花。资源段修改仍回原编辑器后重新接收。
- **保存**：自动保存＋显式保存、JSON备份、撤销/重做最多40步、刷新恢复；单独存储键，不改原编排、导入批次和GPU待办。存储失败保持内存修改并提示未保存；两标签冲突不覆盖；损坏/未来存档原文保留，有效恢复先备份损坏原文。
- **导入工程**：JSON先预览。合并会保留相同项、冲突改名并重写引用；替换明确显示且可撤销；预览后工程改变必须重新预览。不同自动场地不能悄悄合并。格式、缺引用和过大文件拦截，缺ID草稿可先看目标。
- **输出**：补齐ResourceId并处理关联版本后，按下拉分项复制子模板或阵型；整包TXT附槽位坐标、外部绝对触发时间表及逐发值。父槽位从0开始、内部时间相对最早发射；爆点只写相对位置，不再加一次坝高。没有虚构BP全局时间字段，固定随机输出为具体值、原生随机范围归零。复制失败选择文本供Ctrl+C；参数无效或异步复制期间已改工程，不残留旧文本。

当前只按PC资源做方案与检查，Filter沿用真实BP原值14，专属PC平台位仍待核验。原生粘贴、Slot/父子旋转变换、真实高度/花径与粒子实播尚未完成；本版不自动写入正式BP、资产或Sequencer。Library完整实施方案目前没有可调用读取/物化接口，本版依据仓库计划书与用户授权摘要实现，未声称已核对那份全文。

验证与本机交付证据：`research/show-link-20261006/`。26模型＋9边界＋20隔离界面检查，既有18个安全脚本回归；真实浏览器截图/帧率检查仍受此前file页面策略拒绝限制，不绕过。65份改前备份逐项核对，原导入后端、呈现层、原单发代码与原v1.0.1保持；新增整场模型、界面和构建调度独立维护。此前失败任务的保存先后顺序bug尚未修复，此次编排发布不冒称解决导入错误。

明天先看动画即可；我负责上述自动与数据检查。UE八项测试中优先补四份实际画面，按本机实际导入名称的步骤见 [UE实测_本机步骤.md](docs/UE实测_本机步骤.md)，你只采集，我分析判定。

以下保留历史发布记录。

## v2.13 · 2026-10-05 · Velocity/Life 与寿命缩放兼容

仍使用 `D:/FXTools/DFWorkbench/df-fx-workbench_v2_locmai.html` 和原桌面快捷方式，Ctrl+F5刷新后页头/标题显示v2.13。维护源修改后用本目录 `python build.py` 构建同一文件，原v1.0.1保持不变。

- 包内 `VelocityOverLife` 对应 Cascade 的 **Velocity/Life**（ParticleModuleVelocityOverLifetime），创建、挂接并写入VelOverLife向量分布与Absolute。常量、随机范围、完整Linear曲线均支持；CPU默认不烘查找表，显式bake=false保持。严格使用当前包的cm/s与相对寿命曲线，不另加Drag或ConstAcceleration，也不改变已有模块顺序。
- Size By Life保留LifeMultiplier以及MultiplyX/Y/Z源值，支持只改Y轴；RiseLoop、RiseFade和TrailFar各自拥有独立Pivot，内部偏移+0.5换算保持。没有SizeByLife的固定面片仍合法，RT6使用当前远段参数，不凭空加入RiseFade。
- 新增向量/曲线/布尔格式检查；错误模块或参数在检查与执行入口中止，不先导入贴图再报未知模块。note/_note及SizeByLife.preRoll仍是元数据；真正错误的原生字段仍报错而不是跳过。
- 当前包有Velocity/Life就会导入对应节点，旧包没有就保持旧结构。升级页面不会自动改已有UE资产；重导仍沿用原先的检查、名称确认与同名更新流程。

验证：18个隔离脚本共413组通过，包括RT5小中大PC/手机六包和本机最新RT6L完整模拟导入、72组新模块检查，命名/更新/缓存/保存与界面回归保留。旧恢复检查改用固定的云端RT4L历史样本，避免用户把实时目录更新成RT6后使旧失败复现失效；原始失败证据保留，没有为了通过而改用户素材。

原生验证另外11组通过：独立未保存测试系统的三个CPU发射器，完整读回Velocity/Life常量/随机/曲线、Absolute true/false/default、Y-only Size By Life与不同Pivot；未打开Cascade或播放，未保存测试uasset或修改用户现有资产。测试对象已移到Transient包；当前会话AssetRegistry仍可能保留原测试名索引，原项目位置无文件，未用进一步Force Delete清事务或扫描整个项目。首次测试脚本读取隐藏SoloTracking方式与清理断言的调整均保留在证据中，不将失败尝试删掉。

GPU密集方波101点与默认bake写法已保留，但GPU红点是否在最终画面被查找表抹平仍需UE实播；此次未宣称效果画质/实际播放或浏览器视觉验收。共享离线UI检查仍6/7，原有store未定义不属于本轮私有修复范围。

改前65份文件及哈希在 `backups/2026-10-05-module-support/`；计划和源包快照、真实失败复现、精确变更、隔离/原生完整证据在 `docs/superpowers/plans/2026-10-05-importer-life-modules.md`、`research/module-support-20261005/`。以下保留历史版本记录。

## v2.12 · 2026-10-05 · 正式资产名不再混入内部标识

打开原文件 `D:/FXTools/DFWorkbench/df-fx-workbench_v2_locmai.html` 或原桌面快捷方式后刷新，页头与标题为v2.12。本次解决的是导入器忽略 `textures[].asset`，把 `L1_seqA`、`L1_mainA` 等关联键拼到正式资产名的问题；导出文件和用户名称保持不变。

- 新任务默认「包内正式名称优先」。贴图直接用完整asset，不再追加内部键、前缀或重新编号；例如 `T_EFX_FireWorks_YonshakuKamuro_Main_4x4_01_HD` / `…_02_HD`。对应材质由主贴图正式名去网格而保留层名和段号，成为 `MI_EFX_FireWorks_YonshakuKamuro_Main_01_HD` / `…_02_HD`；存在显式material.asset时用它。当前实例仍使用项目PC模板与_HD，未新增母材质。
- 基础名用于粒子系统；包内依赖名称由烘焙器交付名及分段决定。界面的贴图/材质编号只用于无asset旧格式回退及可选粒子编号，不能用改02区分同一正式包。两个任务指向同一正式依赖时应只选一项，或在烘焙器改交付名后重导。
- 旧包未声明asset时保留原规则；若包已声明 `asset_names: textures[].asset` 却漏写asset，或者asset含路径/扩展名/非法字符、两个目标重名，会明确中止，不悄悄改名。内部键仍用于材质/贴图/发射器关联，不能删掉键来避免字样。
- 历史完成、GPU待办、失败、运行中断、已准备的旧更新任务自动沿用旧命名，防止把半成品恢复到另一组资源。详情可显式选择新规则；旧已完成项先点「更新同名资源」再切换。切换后重新检查完整清单、确认操作；旧资源不自动迁移/删除。取消尚未执行的更新及刷新后再取消均恢复原策略与路径。
- 正式依赖固定路径时，回退编号变化不会再误报另一来源；仅同基础名、相同正式目标可以匹配旧来源标签。跨基础名、旧格式依赖、带编号PS、类型/版本管理/内容变化仍按原规则阻断。

使用当前旧失败记录查看正确名称：返回详情 → 资产命名选择「包内正式名称优先」→ 重新检查并预览。若PS已经存在，选「更新同名」并核对新建依赖与全部重建发射器清单；只确认不会自动执行。新建素材默认已经用新规则。

本轮先在实际v2.11和真实未改包复现，再修实际HTML。52项新检查覆盖新旧包、多层分段、非法值/冲突、历史任务/取消/刷新、来源与确认门槛；完整导入模拟核对5张贴图destination_name、2个MI绑定、3个Required引用以及8项保存路径。17个隔离脚本共341组检查通过（原261组核心、28组呈现、新52组）；原生模块、Pivot/preRoll、备份/暂存/缓存/保存算法及最新呈现保持，更新后端仅改命名来源比对。

备份64份文件在 `backups/2026-10-05-public-asset-naming/`；计划、失败复现、精确变更记录和报告在 `docs/superpowers/plans/2026-10-05-public-asset-naming.md`、`research/naming-20261005/`。preRoll回归已固定旧失败导出，不依赖用户后来反复更新的素材包。

本次全部UE调用模拟，未重导、重命名或保存真实UE资产，也未完成实页视觉或粒子实播。共享烘焙器离线检查仍6/7，`store is not defined`为此前已有检查失败，未改他人代码或写成全通过。本版只修工作台命名，不代表过去失败的任务自动恢复。

## v2.11 · 2026-10-05 · 修正五页草稿落地比例

继续打开同一个 `D:/FXTools/DFWorkbench/df-fx-workbench_v2_locmai.html` 并刷新，页头与标题为v2.11。用户附图已是v2.10；此前固定窄列、正文14px与居中限宽造成明显的草稿落地偏差，不能归因于旧路径或缓存。本版直接修正独立呈现层。

- 特效资产复制：源资产/目标设置/预览/执行四步，桌面约40:60分栏；刷新回到预览标题右侧，常用目标紧凑排列，一键手游优化在折叠时可见。
- 材质实例复制：方向/源材质实例/目标设置/预览/执行五步，约36:64分栏；原预览表按逐项对照卡片显示，原八列和母材质输入节点保持。
- 整枪配表：约26:74分栏；四项原参数纵排，预览按钮在参数区，七表导航与原完整计划保留。
- ResourceFX 配表：约31:69分栏；双端筛选和四个编辑字段优先展示，主路径随当前行显示，全部原列与原输入保留。
- 烟花编排：约32:68分栏；参数与原场景/播放/时间条/逐发数值/输出区域对应，当前节奏信息放在预览标题，原导出动作仍在底部。

公共正文与控件16px；2000px以上18px，标题30/36px、区域标题20/22px。取消内容1900px限宽和自动居中，宽屏两列随可用宽度分配。900px以下纵排、720px以下原工具菜单，窄屏输入不缩到小字；字体渲染、实际尺寸和滚动遮挡仍待实页验收。

步骤条只读原输入、有效计划和运行锁：修改设置使旧计划失效时回到设置；检查/连接期间不假报执行，结束不伪造成功。空白状态给操作引导；草稿的示例路径、表行、连接状态不进入实际任务。颜色、名称、字段、业务引擎、存储键和所有默认值保持，含最新preRoll修复。

验证：17个隔离脚本通过，原UI14组和本轮布局/交互14组；最后呈现样式修订后这两组再次通过。新增检查明确只查CSS声明与DOM状态，不替代浏览器几何。真实UE请求全模拟，没有复制/导入/写表/保存资产。已有真实授权保留，缺失授权的历史夹具按自身保护跳过。证据在 `research/design-20261005/`，63份v2.10备份在 `backups/2026-10-05-visual-fidelity/`。

视觉验收仍blocked：已查看用户修前实页截图与已选五页源稿；两者尺寸/状态不同，修后实页捕获尚缺，继续遵守file协议安全限制。没有宣称像素一致、各尺寸无溢出或商用验收通过。最新逐页清单与证据边界见 `design-qa.md`。以下保留原发布和导入兼容性记录。

## v2.10 · 六页统一交互

继续打开原文件 `D:/FXTools/DFWorkbench/df-fx-workbench_v2_locmai.html`，或使用原桌面快捷方式并刷新。六个工具的名称和字段保持；界面统一为深灰青绿、清楚的标题层级、设置与预览对照、底部执行区。点击页标题右侧「使用说明」主动查看当前工具说明，按 Esc 关闭并回到原按钮；鼠标经过不会打开新说明窗口。

- 特效资产复制：左侧源与目标设置，右侧完整预览。「复制完成后（可选）」可展开，全部优化选项与一键手游优化保留。
- 材质实例复制：方向整行显示，设置与母材质映射对照。空白目标母材质仍沿用原母材质，不增加执行阻断条件。
- 烟花素材导入：现有三步提示移到前面；清单和详情分开，保留独立的查看、勾选、检查、确认、导入与 GPU 待办。
- 整枪配表：七表标签逐表查看，方向键和 Home/End 可切换。标签只改变显示，执行仍写入完整七表计划。
- ResourceFX 配表：全部 / PC / 手游筛选，常用列置前，路径与详细字段可展开。隐藏行的编辑原样保留，仍参与完整计划；同步占位的空路径仍待后续回填。
- 烟花编排：原动态示意按预览、播放、时间条、逐发数值、输出组织；复制、下载和存入素材库在底部；扇形轮廓可展开，手填配比仍在原设置内。

窗口排布：宽窗口保持对照；900px 以下上下排列；720px 以下工具导航改为可关闭菜单；480px 以下表单和按钮换行。表格在自己的区域横向滚动，正文不整体缩放。这些规则已实现，实际各尺寸的浏览器画面仍待核对。

界面使用独立 `presentation.js` / `presentation.css`，构建器最后注入，移动原节点而不重建业务控件。原默认值、事件、存储键、执行锁和后端保持；同时保留另一维护会话刚修复的 SizeByLife `preRoll` 元数据兼容性处理，没有恢复旧导入代码。原 v1.0.1 文件保持不变。

验证：`node run-design-checks.cjs` 的16个隔离脚本通过，其中新界面14组检查；每个脚本的原始输出和汇总在 `research/design-20261004/`。全部 UE 请求模拟，没有实际导入、写表、资产更新或烟花实播。历史无授权夹具因现有真实授权而按脚本要求跳过，保留授权。浏览器 file 协议安全策略仍阻止实页截图，`design-qa.md` 的结论为 blocked；隔离 DOM 检查不等于浏览器视觉、自适应几何或 UE 验收。

改动前备份：`backups/2026-10-04-design-implementation/`（v2.9交付文件、维护源文件及SHA256清单）。设计依据：`../design-drafts/2026-10-04-workbench/草稿索引.md`。下面保留同期导入修复说明与历史记录。

## v2.10 · SizeByLife 的 preRoll 元数据兼容

主文件仍为 `D:/FXTools/DFWorkbench/df-fx-workbench_v2_locmai.html`，桌面快捷方式不变。当前同路径 v2.10 已包含本轮导入修复，并保留同期界面维护的最新构建注入。

导出器的 `SizeByLife.preRoll` 是入点前放大的标记，不是 `ParticleModuleSizeMultiplyLife` 的原生字段。导入仅过滤这个标记；实际 `LifeMultiplier` 曲线、MultiplyX/Y/Z、Lifetime、Duration/Delay 与帧号保持源包原值，不能删掉整项缩放模块。检查阶段拒绝非布尔标记或放到其它模块的标记；真正错误的原生字段仍会中止，避免静默丢参数。Pivot 的内部值加0.5、SoloTracking核对、暂存后替换及分阶段保存代码均未改变。

本次失败包核对：5张贴图和2个材质实例已落盘并标记添加，粒子只在内存且仍为工厂默认发射器；没有把默认空壳保存成成品，也没有修改这些UE资产。修复工具不等于恢复此次导入。已有依赖会阻止新建重试，未落盘的粒子又不是标准同名更新备份流程的已验证输入；不得建议改02绕过。恢复须另外核对并复用已保存依赖、完整重建三个发射器，成功后才保存粒子。

验证：新增 `check-import-preroll.cjs` 16组严格模拟原生写入的检查，使用实际未改包复现旧错误，核对十个缩放关键帧、两条帧曲线、各段时长/延迟、Pivot、GPU与缓存，以及真错误中止；原245组检查全部通过，共261组。前后只读原生快照完全一致、源包字节与原工具哈希不变。没有本次UE恢复写入、Cascade打开、粒子实播或实际浏览器视觉验收。

修改前备份：`backups/2026-10-04-preroll/`；原日志、素材快照、只读原生状态、检查与交付证据：`research/preroll-20261004/`；计划：`docs/superpowers/plans/2026-10-04-preroll-metadata.md`。私有资料不提交公共仓库。

## v2.9 · 基础名与分类编号分开

主文件仍为 `D:/FXTools/DFWorkbench/df-fx-workbench_v2_locmai.html`，桌面快捷方式不变。刷新后页头和标题为v2.9。

新增素材只填基础名称，例如 `GoldSpark`；贴图/材质编号是独立输入框，默认 `01`。粒子系统默认不使用数字编号，仍保留平台后缀 `_HD`。单材质、4×4贴图的示例：

| 类型 | 完整名称示例 |
| --- | --- |
| 粒子系统 | `P_EFX_FireWorks_GoldSpark_HD` |
| 材质实例 | `MI_EFX_FireWorks_GoldSpark_01_HD` |
| 序列贴图 | `T_EFX_FireWorks_GoldSpark_4x4_01` |

多贴图的来源标识、网格、轮廓/颜色图后缀和多材质角色保持原规则，不改变依赖绑定。列表显示基础名，并分别说明依赖编号与粒子规则；完整清单仍需检查、预览及确认后才能执行。改基础名、编号或规则立即作废旧计划，填写完点击「重新检查并预览」；不会在填写中途因失去焦点自动锁住另一输入框。明确清空或填一位编号后刷新仍保留输入，不会偷偷恢复01，须填完整两位数字才能通过。

历史任务自动保留带编号的粒子目标。详情中的「粒子系统也使用编号（兼容旧资源）」会保持勾选，已完成项准备同名更新与取消更新也保留原规则。取消这个选项只改变本次目标名称，不会将已有UE资产重命名；若新目标不存在，同名更新会拦截并说明原因。

新的无编号粒子在同名迭代时保持路径与引用；编号不变时贴图/实例原名更新，主动改变依赖编号时新依赖按清单新增，未列出的旧依赖保留。粒子来源标识允许同一基础名的先前依赖编号；不同基础名、已编号粒子及贴图/材质来源仍严格核对。运行日志/元数据的兼容标识仍使用基础名加依赖编号，实际资产名以已确认的完整清单为准。

批量每行支持：

```text
D:/packs/GoldSpark | GoldSpark
D:/packs/Silver | Silver | 05
D:/packs/OldParticle | OldParticle | 02 | 带编号
```

两列旧写法 `路径 | GoldSpark_05` 会拆成基础名GoldSpark、依赖编号05；新增粒子仍默认无编号。基础名需要有意义的数字结尾时用独立编号列，例如 `路径 | Effect_2026_01 | 05`，或在单项分离表单直接填写。已有清单显示四列，包括「带编号/不带编号」，往返保存不改变目标；修改现有行但省略粒子规则时保留已有选择。

同一批两个素材若基础名相同、只把贴图/材质编号设成01和02，无编号粒子仍然重名。工具会指出修改依赖编号不能改变无编号粒子名称，并要求改基础名、仅勾选一项，或明确使用粒子编号；不会静默覆盖。

验证：新增34组命名/使用流程检查，原211组核心隔离检查通过。覆盖基础名直填、准确计划执行、输入焦点、空值刷新、旧记录及暂存更新恢复、大小写冲突、编号更新的来源匹配、保存失败和执行锁定。所有UE接口均模拟；本次未导入、重命名或保存UE资源，也未作浏览器视觉或粒子播放验收。原实际导入模块与v2.8相同，保留Pivot转换、分阶段保存及隐藏缓存处理；只修改命名规划和更新检查的来源名称匹配。

修改前备份在 `backups/2026-10-04-naming-split/`，复现、检查与哈希证据在 `research/naming-20261004/`。维护源码后仍用本目录 `python build.py` 生成同一HTML；不要直接只改生成文件。

## v2.8 · Pivot 坐标转换修复

主文件及桌面快捷方式仍指向 `D:/FXTools/DFWorkbench/df-fx-workbench_v2_locmai.html`。刷新后页头和标题为v2.8。

旧v2.5遗漏Pivot节点；v2.6/v2.7能创建节点，但错误地将素材包的引擎内部偏移原样写进面板。当前按实际本机UE 4.24的模块编译实现转换：`面板值 = required.pivot_offset + (0.5,0.5)`。源中心`[-0.5,-0.5]`对应面板`(0,0)`，本包`[-0.5,-0.0154]`对应`(0,0.4846)`。不要自行改成取反或加1；新版只在导入转换处处理，原JSON无需改。

这次更新不会自动修改已导入资产。按用户要求保护的手调发射器仍保持原样；当前RiseLoop未挂Pivot，RiseFade的手动值仍是`(0,-0.5)`。若仅补齐锚点，针对这两项新增/校正模块即可，整套同名更新会重建所有发射器，应按实际意图选择。

本机定义核对：模块CompileModule将两个字段分别减0.5写入构建信息；CPU和GPU着色器都用`UV + 内部Pivot`计算顶点偏移。原始二进制/字段证据在`research/pivot-20261004/`，未改引擎代码，也未保存或替换用户资源。

验证：211组核心隔离检查通过，原包两节点数值与单次链接、中心及无Pivot均覆盖。当前Transient模块探针接口返回None，Python不导出对应类，因此没有完成新值在独立原生模块中的读回，未转而写用户资源；实际播放对齐仍待验。坐标换算依据本机编译实现、CPU/GPU着色器和默认对象属性。历史无授权夹具因当前已有原生授权拒绝继续，保留授权，没有执行UE调用。

## v2.7 · 同名迭代、选择取消与目录提示

主文件仍为 `D:/FXTools/DFWorkbench/df-fx-workbench_v2_locmai.html`，桌面快捷方式不变。页头和浏览器标题现在共用同一个版本值；此前文件已有v2.6导入代码，但页头漏改成了v2.5。刷新同一页面即可看到v2.7，不需要另找一个版本文件或安装EXE。

「新建资源」用于增加新名称；「更新同名 · 全部重建发射器」用于原名称/原序号的迭代。完成项可以直接点击「更新同名资源」，无需改成02。更新预览列出旧→新发射器数量、每个资产的新增/替换操作、完整名字和路径；确认清单只开放执行按钮，不自动覆盖。

更新保留粒子系统对象和路径，完整组装新发射器后再替换整个Emitters数组。人工增加或修改的发射器模块会被本次包重建。已有贴图按原名导入；已有材质实例清掉旧参数覆盖，再恢复示例的基础设置并应用当前包。包中未列出的旧资产保留。当前重建支持完整单级LOD；原系统有多级或缺失LOD时会在覆盖之前拦截。

覆盖前先复制原磁盘文件，再迁出/核对版本管理、保存当前内存修改并复制更新前文件，备份位于 `workbench/asset-backups/名称_时间_唯一标记/`，清单在manifest.json。新发射器组装失败时旧列表保留；替换或保存失败时尝试恢复旧引用并读回。贴图/材质可能已经完成更新，失败记录会保留阶段和备份位置，不能只取消界面记录就恢复旧“完成”状态。新建、更新、保存、添加/编辑结果分别核对。

勾选只表示本次要处理哪些项：检查失败、冲突和导入未完成项都能直接取消；「取消全部勾选」不改名称或删除资产。完成后自动取消勾选，点击已完成行的勾选框只准备同名更新。运行期间锁定选择和设置。任何已选未通过检查/确认项都会拦住整次执行，不会悄悄跳过。

素材目录必须是含cascade.json的具体效果目录。选到总目录时显示清楚的原因和检测到的效果子目录按钮，点击一个子目录只重新检查，不执行导入。本次截图中型包的正确目录为 `D:/ProjectTextures/FireWorksLab/RiseTrail_M`；只读核对过10个发射器和5张存在的贴图。更换路径、名称、模式或重新检查后均需重新确认；配置、图片或目标参数在预览后变化也会停止执行。

本轮曾在打开独立测试粒子时触发Cascade崩溃。日志和实际引擎导出符号定位到TurnOffSoloing；显式读取发现隐藏的SoloTracking缓存与重建后的发射器未同步。整块文本写入会返回成功却留下空的SoloEnableSetting，因此改用已实测的嵌套容器操作，替换前准备有效缓存，替换后缩减多余条目并逐项读回。新建和旧版续建同样维护缓存，不再依赖重启掩盖这个问题。

缓存修复前先核对过同名2→3的写入和结构；修复后实测1→3（含GPU）、3→1、新建2个发射器、故意组装失败保留旧列表，这四条路径均在同一会话成功打开/关闭Cascade。原贴图16×16→32×16按同一对象路径替换，旧MI标量覆盖清除/恢复示例值通过。原生结构、文件和版本管理检查不等同于烟花画质、完整复杂包实播或长期稳定性验收。本次只写独立WorkbenchChecks测试资产，当前用户烟花资产在各轮前后保持一致；崩溃后的未保存内容由用户处理恢复，不以资产对照声称全部未保存内容未受影响。4个测试文件已存档并移入单独的未提交测试清单。

原183组回归与新增13组交互、13组更新后端检查共209组通过。交互检查使用隔离DOM和模拟UE请求；浏览器file协议访问被安全策略拒绝，未绕过，也未做实际浏览器视觉验收。用户截图、真实接口证据和崩溃诊断留在 `research/iteration-20261004/`。修改前备份在 `backups/2026-10-04-iteration-update/`。

当前导入使用以下流程，优先于下方旧版说明：选择具体效果目录和操作模式 → 检查并预览清单 → 确认名称与操作 → 导入或更新所选。GPU待办仅兼容旧版任务，本次导入以实际保存及读回结果为准。

## v2.6 · 导入中止修复与保存/添加核对

刷新同一路径的网页即可使用。本版修复带模块说明的素材包：`note`/`_note`只作说明，不发送成UE参数；其它真实参数仍逐项写入，失败明确报字段，不能静默跳过。局部空间使用项目实际的`bUseInLocalSpace`，尾缀`required.pivot_offset`加入原生Pivot Offset模块。

贴图设置核对后先保存，材质参数核对后先保存，粒子全部发射器接好后再保存。每阶段确认目标.uasset实际存在，再使用UE当前版本管理提供者标记添加，并读回`is_added`。因此，后续粒子组装失败也不会让已完成的贴图留在内存里。

未启用版本管理时明确显示“已保存，版本管理未启用”；已启用但不可用、添加被拒绝、磁盘文件缺失或保存失败均不会显示完整成功。失败记录保留当前阶段和已确认保存/添加的数量。已生成的目标仍阻止重新覆盖导入，名称预览与确认流程保留。

原工具保存在原名文件，编辑前备份在`backups/2026-10-04-import-failure/`。网页和本机检查脚本使用同一个生成的导入实现，不再使用只有本机脚本才有的字段修补。检查真实模块/文件不等于效果的画质或动态播放验收。

## 打开新版

本机固定位置为 `D:\FXTools\DFWorkbench\df-fx-workbench_v2_locmai.html`。桌面「DF 特效工作台」快捷方式指向该文件。后续在本目录维护并生成新版。

双击上一层目录的 `df-fx-workbench_v2_locmai.html`，使用原来打开工具的浏览器即可。仍是单个 HTML 文件，无需安装软件或打包成 EXE。打开 UE 并启用原有 GPUECli 连接后，点击「重新检测」。连接地址沿用 `127.0.0.1:17780`。

原文件 `df-fx-copier-suite_v1.0.1_locmai.html` 未修改，随时可以继续使用。不要在两个页面里同时执行同一批资产操作。

## v2.5 · 只选ID，参数自己设置

现有烟花ID从本轮PC和手机ResourceFX表的ResourceId字段只读提取，合并去重后共53个：9个尾缀、6个单簇、26个爆炸、12个其它烟花资源。包括大中小Trail、FanGold四个方向角色、FanComet、FanSilver及表中爆炸资源；分组仅用于查找，不强制限制用途。选项标明可用平台；表快照中有ID不代表已验收当前平台的粒子加载和效果。

预设只保存ID、分类和平台，没有原BP配比、缩放、高度、时间或随机参数。新建仍选「空白 / 自定义」，模板名和配比为空、随机0；均匀角度和统一大小为中性计算规则。选择ID只替换资源，保持用户已调的参数、配比、名称。手填框保留，未在列表找到的ID标为自定义；清空ID后不能继续复制上一资源的参数。

1. 刷新原网页，进入「编排设计 → 烟花编排」。从「ID预设」选择资源，可先搜索Trail、Silver、爆炸或完整名称；也可保持空白/自定义，在下方填写ResourceId。右侧填写新模板名。
2. 设置簇数、展开角度和出现顺序。无需配比时可保持配比为空，直接使用均匀角度与统一大小。
3. 要自己配比，展开「手填配比（可选）」。角度填从左到右递增的−1～1关键点，用逗号或空格分隔；实际角度=关键点×半展开角。例如展开100°时，`-1, 0, 1`对应−50°、0°、50°。大小填倍率，例如`1, 1.2, 1`；多个关键点按当前簇数插值，单个大小倍率适用于全部簇。
4. 点击「应用手填配比」，预览和复制同时更新。编辑但未应用、配比不合法时不能复制旧数据；「清空配比」恢复均匀角度与统一大小，输入保持空白。
5. 「规整扇形」设置均匀角度、统一大小、零随机和齐发。完成轮廓可选圆弧、圆顶或平顶；圆弧是沿方向等长，竖直高度仍随角度变化。圆顶两侧/中央长度可调；平顶让两侧路径更长来补偿角度。
6. 需要改变路径长度时，展开「长度输出与素材校准」并显式勾选Z长度输出。预览和导出共用尺度模型，灰线是完整端点、绿线是当前时刻；没有应用的新目标轮廓会阻止复制。相对原长默认1仅是等长假设；Cascade是否实际响应组件Z缩放需要在UE校准，网页不模拟完整粒子随机、重力或摄影透视。

升空＋爆炸组合的每个资源段使用同一份ID选择器，尾缀或爆炸按该段用途优先排在前面，其它分组仍可选。选择大中小Trail的ID不会自动套入规格、时长或高度；自行选择3.5/5/8秒规格或输入Cascade时长，再填写最高爆炸高度和额外延迟。各段的位置、旋转、XYZ缩放与逐段随机继续开放。更改ID、筛选和更新不吞掉尚未完成的数字；输入无效时复制入口会拦截。

新增资源后，展开「ID列表与更新」并点击「更新ID列表」，连接UE只读查询PC/手机资源表中ID或资源路径含FireWorks的资源，其它命名仍可手填。四路结果全部成功且完整才替换列表；失败保留旧库及草稿。更新不会清掉当前ID，即使它已不在表中，也作为自定义原文保留。离线仍可使用保存的ID列表。

「已保存的子模板」与ID库分开：这里保存的是你主动添加、存入或读取的完整配方，包含参数。需要复用整份配方才点击「读取完整子模板（含参数）」；该操作只读BP。父编排须先制作或主动添加一个完整子模板。新建初始不预载任何旧配方。

旧version1编排草稿单独保存在浏览器的`df.workbench.show.legacy.v1`（已有不同旧稿时另存时间后缀），不自动载入。备份失败时不覆盖旧记录。本版新填写的草稿采用version2，刷新继续恢复。素材库只记录用户主动添加、保存或同步的内容；不影响导入批次和GPU待办。

38组ID选择/用户流程、22组空白/手填、19组轮廓及原98组回归共177组通过，交互检查中的所有UE接口隔离模拟。本轮真实接口仅只读核对过资源表和BP结构，没有UE写入。旧BP数据仅作为明确传入的测试样本，不包含在交付HTML中。没有真实浏览器视觉/帧率或UE轨迹验收。

v2.5编辑前版本在`backups/2026-10-01-resource-ids/`；v2.4前版本在`backups/2026-10-01-fan-contour/`。新版仍为同名独立HTML，桌面快捷方式不变。

## 这一版的调整

- 深灰底色、薄荷绿操作按钮和选中状态，统一六个模块的外观。
- 导航按「资产处理 / 数据配表 / 编排设计」分组。分组标题 15px 半粗，子项 14px 常规、缩进排列；分组可以折叠。
- 四个既有工具改为设置与预览并列，小窗口自动上下排列；原有设置、回调和业务引擎保留。
- 操作期间锁定设置及重复执行入口；日志可以折叠，异常时自动展开。
- 烟花导入支持批次切换、单个添加、批量编辑、逐项改名和检查。正在查看的行与准备导入的勾选项分开；检查通过后仍需明确确认名称。
- 名称预览列出每项原素材、完整资产名及目标目录。填写的是基础名，工具自动添加类型前后缀；批量可在一页确认，确认不会立即执行。
- 预览读取实际素材包和 UE 目标信息，显示真实资产路径与数量；重复目标、缺贴图、连接异常都会阻止相应项执行。
- 执行前再次读取素材包并检查目标是否存在。停止在完整素材包之间生效；失败记录和之前完成的结果会保留。
- GPU 收尾独立于批次，跨批次保留。重启 UE 后勾选确认，再执行重新连接和收尾。

## 使用顺序

1. 在「烟花素材导入」添加素材包目录和导入名称，也可以批量粘贴 `路径 | 英文名_两位序号`。
2. 点击「生成名称预览」：自动读取并检查素材包，打开名称对应表。检查和预览都不会创建资产。
3. 核对基础名/序号、原贴图与材质、最终完整资产名及目录。若不符合预期，点「返回修改」；无误则点「确认这 N 个素材包的名称」。
4. 返回列表核对勾选项，点击「导入所选」。所选检查通过项中任一名称未确认时，整次执行都拦截；目标已存在时不覆盖。
5. 修改名称、素材路径、重新检查或刷新页面后，需重新预览确认。已有批次和 GPU 待办保留，旧检查不直接授权导入。
6. 含 GPU 的素材进入「GPU 待办」；保存项目并重启 UE 后，再完成收尾。
7. 若导入中断，核对目标目录。部分资产可能已经生成；换用新序号，或在 UE 中确认并处理已有资产后重新检查。

## v2.3 名称确认

只增加检查后的名称预览和确认门槛，命名规则及原始导入引擎不变。预览与执行使用同一个目标计划，确认与素材路径、输入名称、源配置及目标映射绑定。执行前再次核对源内容与目标存在状态。

`node check-import-name-confirmation.cjs`：21组隔离检查覆盖未确认、返回修改、直接执行、批量混合、改名、换包、重新检查、刷新、存储失败、源与目标变化以及多贴图名称对应；原有77组回归同时通过。所有UE写入均模拟，没有真实导入，也未进行实际浏览器视觉验收。

本次编辑前版本位于 `backups/2026-10-01-import-name-confirmation/`。新版仍生成上一层的同名HTML，桌面快捷方式不变。

## 本地记录

新版使用独立的批次记录键；在同一浏览器存储范围内可读取旧版清单和待办，且不改写旧版烟花记录。浏览器可能按 HTML 文件路径区分存储，因此不能保证跨文件自动继承旧记录。旧版如还有 GPU 待办，先在旧版完成收尾再切换。

使用过程中保持文件路径和浏览器不变。刷新后保留批次与待办，但未完成项必须重新检查。清除浏览器数据、换浏览器或移动文件可能导致本地记录不可见；已写入 UE 的资产不受影响。

## 后续维护

交付文件可以独立运行。为方便后续修改，界面源文件放在本目录：

- `workbench.css`：配色、排版、字体层级、响应式布局。
- `shell.html` / `shell.js`：导航、六个模块布局、共享执行状态与日志。
- `fireworks.html` / `fireworks-ui.js`：烟花导入的界面与批次交互。
- `fireworks-plan.js`：素材校验、同类多贴图命名、材质与轮廓图引用检查。
- `fireworks-pack.js`：读取配置/图片哈希与可操作的素材目录诊断。
- `fireworks-update.js`：同名目标快照、更新备份与迁出、发射器替换和编辑器缓存核对。
- `fireworks-import.js`：实际UE导入、模块/支点转换、分阶段保存、磁盘与版本管理添加核对。
- `show.html` / `show.css`：烟花编排的表单、动画预览、时间条与数值表。
- `show-plan.js`：手填角度/大小关键点插值、顺序和独立固定随机数值。
- `show-fan.js`：共享轮廓、XYZ缩放、相对原长校准及配比输入校验。
- `show-bp-data.js` / `show-catalog.js`：原生字段默认值、只读连接地址与空白素材库；手动新增与主动同步。
- `show-resource-data.js` / `show-resources.js`：实际表ID快照、平台分类、搜索选择与四路只读更新；不包含资源参数。
- `show-text.js`：受限的UE属性元组解析和6位小数参数导出；不执行输入文本。
- `show-sequence.js` / `show-sequence-scene.js`：固定Cascade时长的多资源段、位置/尺度取样和升空/爆炸时间示意。
- `show-ui.js`：本地设置保存、动画、慢放/循环/拖动和离开模块时暂停。
- `build.py`：以未修改的原工具为基础，把新版界面合并成一个 HTML。

维护时修改这些源文件，再运行 `python build.py` 生成新版；它不会覆盖原工具。直接修改生成的 HTML 也可生效，但再次生成会覆盖这些手工修改。

## 验证范围

`node check.cjs`：29 项隔离检查通过，包括脚本语法、原始导入执行代码和其他四个业务引擎一致性、五模块导航、完整控件保留、输入同步、重复目标、执行前素材变化、并发拦截、失败恢复、停止执行、GPU 队列与收尾成功/失败、真实多贴图包的界面检查与计划执行等。

`node check-multi-textures.cjs`：9 项多贴图回归检查通过，使用本机 `TR2L_____V5/cascade.json` 验证 8 个独立目标、单张命名兼容、各自网格、标识清洗碰撞、引用有效性，以及真实导入代码的贴图和材质部分。该部分的 UE 接口由测试模拟，未运行粒子构建和保存部分。

测试中所有 UE 请求都被模拟，未实际创建、修改或删除 UE 资产。没有完成真实浏览器的视觉验收，也没有完成 UE 写入和 GPU 收尾的实机验证。

`node check-show.cjs`：13组新版单文件集成检查通过，包括六模块导航、离线使用、Silver13簇配比复现、可变数量和密集角度有序、奇偶成对、独立固定随机、整发升空/爆炸关系、刷新恢复、慢放/拖时间/循环、隐藏时暂停、非法输入与存储失败恢复、没有额外UE调用、窄屏几何范围和减少动态设置。使用受控动画时钟，不代表真实浏览器帧率或实际UE粒子轨迹验收。

原文件 SHA-256：`17bc3503c307a02200c5f48cf171d02ad582703f73078c8c673a29d8c7ae685b`。

## 2026-10-01 v2.2 模板数据编辑与复制（历史功能，默认以v2.5为准）

刷新同一路径的网页后，打开「编排设计 → 烟花编排」。右侧先显示模板名称与「复制模板参数」，下面可播放时间示意。工作台不把复制内容自动写入UE。

- **扇形 / 单簇**：原配比已移除，v2.5可只选现有ID或手填自定义ID。配比默认空，改数量后按手填关键点插值；只有主动添加的完整配方才可加载其数值。
- **升空＋爆炸 / 资源段**：创建一个包含多个ResourceId的子模板。小/中/大默认升空时长3.5/5/8秒，可改为自定义；这些是当前资源设计起点，不是强制规格，也不自动修改Cascade。第二段默认在升空结束时出现，可以填写额外延迟；新增其他段使用独立的出现时间。
- **高度**：大型最高爆炸位置默认400米、中型250米，小型留空等待填写。可改上限和向下随机范围，1米=100UE厘米；位置随机另行取样，最终爆炸位置Z仍不会超过上限。该位置不等于已验证的尾缀飞行高度。
- **尾缀缩放**：默认按资源原轨迹播放；在「方向、大小与固定变化」显式勾选Z缩放并填写原始高度后，尾缀Z使用目标高度/原始高度比，X/Y使用大小变化。是否实际改变飞行高度取决于Cascade是否支持组件缩放，必须在UE校准。示意图不作实际轨迹证明。
- **资源段**：每段可以输入ResourceId、时间/爆炸额外延迟和大小。展开后可分别填写位置cm、Pitch/Yaw/Roll、X/Y/Z缩放及位置/旋转/缩放随机。手填ResourceId未查询资源表，不保证该行已存在。
- **复制**：子模板粘贴到`EffectSubTemplates`中的一个新增数组项；编排子模板模式的父数据粘贴到`EffectTemplate`。不要把一个子模板项粘贴成整个数组。新模板名默认空；主动载入完整配方后可使用其`_Custom`建议名称。
- **固定变化**：复制和TXT下载使用同一组生成值；各随机范围已取样为具体数值，原生运行时随机归零，因此固定码不需要写入BP不存在的Seed字段。扇形升空高度随机没有确认的原生字段，须设为0，或明确勾选按素材原高度导出。
- **素材库**：可以粘贴一个UE子模板参数添加造型，也可点击「读取完整子模板（含参数）」读取当前全部子模板；只读、不改写BP。复杂、多轮或多段模板作为完整子模板保留，不展平成单簇。新建子模板可先「存入素材库」，再在父模式引用；必须先把该子模板粘贴到UE，父引用才能找到。
- **本地恢复**：旧版扇形和整发设置继续兼容；新类型、资源段草稿、名称与扩展素材库在原`df.workbench.show.v1`记录下保存。剪贴板被浏览器限制时，可展开文本后手动Ctrl+C；未复制成功不显示成功提示。

`node check-show-export.cjs`：26组文本、素材库、资源段与生成后单文件交互检查通过。加上原13组编排、29组工具与9组多贴图回归检查，共77组。UE连接在交互检查中模拟；实际只读核对过BP结构和Roll正方向的原生数学函数。未修改BP、未运行真实粒子、未做原生粘贴及实际浏览器视觉/帧率验收。

编辑前备份：`backups/2026-10-01-template-copy/`。本机BP样本、源文件、报告均为私有资料，不随公共仓库工作记录上传。

## 2026-09-30 多贴图修复

原先每种贴图类型仅支持一张，导致 Loop / Fade30 同时存在时生成相同目标。新版允许同类多张贴图，同类多张时将源标识加入名称，例如 `..._Loop_16x1_01` 与 `..._Fade30_16x1_01`；单类单张保留原命名。材质、轮廓图仍按原始标识绑定。

更新的是同一路径的 HTML。页面刷新后点击「检查未完成项」或「重新检查此项」，即可清除旧的包内重名结果。原先的 `FireWorks_Trail_High_01` 可以继续使用；若检查提示 UE 中目标已存在，仍需核对已有资产并选择新序号。

修复前的工具副本与维护文件保存在 `backups/2026-09-30-multi-textures/`。

## 2026-10-01 烟花编排预览接入

打开左侧「编排设计 → 烟花编排」，点击「播放一遍」。也可在文件地址后加 `#show` 直接进入。当前示例沿用最后讨论稿中选择的Comet、5簇、68度；数值都可调整，不固定为5或10簇。

- **制作子模板**：Silver / Comet单簇的数量、总角度、角度配比、出现顺序和每步间隔。
- **编排子模板**：完整“尾缀升空→爆炸”作为一发，保留内部2秒或4秒间隔；外层改变每发的时间和方向。
- 支持左→右、右→左、里→外、同时出现、外→里。里外方向按镜像成对触发，奇数时保留中央一发。
- 「大小与轻微变化」中可调开始时间、大小、高度和角度随机及固定随机码。重复播放保持同一组变化；改一项不重抽其他随机通道。
- 右侧可播放、暂停、0.5/1/2倍速度、时间拖动和主动勾选循环。慢放改变观看速度，不改变生成的计划秒数。离开模块或页面进入后台会暂停。
- 两个层级分别记住输入，保存于 `df.workbench.show.v1`，不替换导入批次或待办记录。底部「逐发数值」目前为只读预览。

预览数量1–256是网页预览的性能范围，不是UE模板数量限制。单簇1.20秒是示意运动时长；整发内部延迟来自前轮只读样本，但实际粒子寿命和轨迹未接入。高度比例改变示意升空长度，地面起点不动，不能拿出生位置Z或未校准缩放冒充真实升空高度控制。

本轮实装网页预览与数值生成，没有UE编排写入、BP保存或UE烟花播放。工作台仍是同路径单文件，无需EXE或服务；动画预览不用连接UE。现有其他五个工具仍使用原来的UE连接。

编辑前备份在 `backups/2026-10-01-show-preview/`。维护只需编辑当前源文件再运行`build.py`；`research/prepare-show-sources.py`是一次性草稿提取记录，正式生成不依赖它或C盘草稿。
