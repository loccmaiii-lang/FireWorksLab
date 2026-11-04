## 独立交付入口 v2.31 · 手游主序列改回常规 mip（2026-10-28，LiteHDR · Claude Code）

- 用户 10-28：性能组反馈手游烟花 NoMip 内存过高；「把手游24张主序列的MipGenSettings的NoMip改回FromTextureGroup，PC侧不用改」「导入器的与claude.md这些冲突帮我一起处理」。
- `fireworks-import.js`：主序列（flipbook）按 `texturePolicy(dst).platform` 写，手游 → `TMGS_FromTextureGroup`，PC（`_HD`）→ `TMGS_NoMipmaps`；新建、更新同名都写，读回校验。Ramp 两边仍 Clamp + NoMip；DistantVFX、NeverStream 关不变。
- `check-import-resource-rules.cjs`：37 PASS。原来测「主序列 NoMip」的两条其实用的是手游贴图，现在拆成 PC / 手游：新增手游新建、手游更新（原 NoMip → 改回、原有 mip → 保持）、PC 重新导入仍 NoMip、手游 Ramp 仍 NoMip；u6 手调 Clamp 仍保留。旧成品上 5 条手游用例失败，重建后全部通过。
- 回归：system-policy 40、update-backend 13、delivery-contract 11 通过。`df-fx-workbench_v2_locmai.html` 构建前后 sha256 相同（d0962cb8…；这个值和 10-23 的 a2533619… 不同，是这期间别处改的，不是本次）。改前备份 `backups/20261028-mobile-mip/`。没有实际导入 UE。

## 独立交付入口 v2.30 · LODMethod 按循环 / 一次性（2026-10-23，LiteHDR · Claude Code）

- 用户 10-23「一次性爆炸的效果都选 ActivateAutomatic，循环效果用 Automatic……按照正确的设置方式，写到导入规则中」。
- `fireworks-system-policy.js`：新增 `lodMethodFor(spec)`。有启用的发射器 `required.loops === 0` → `PARTICLESYSTEMLODMETHOD_Automatic`，否则 → `PARTICLESYSTEMLODMETHOD_ActivateAutomatic`。`particleSystemPolicy(bounds, spec)`、`verifyParticleSystemPolicy(PS, bounds, spec)` 按包写入并读回；失败回滚用的字段表不变。
- `fireworks-import.js` 两处调用传入 `spec`。其它导入规则（NoMip / DistantVFX / NeverStream / 四项 / 固定盒等）不变。
- `check-import-system-policy.cjs`：40 PASS（原 33 + 新 7：一次性、无限循环、关掉的循环发射器不算、loops = 2 仍算一次性、真实导入写 / 读回两种、读回不一致报错）。新测试只针对交付入口（`FWL_IMPORTER_HTML` 可改）。
- 只重建交付入口 `df-fireworks-delivery_locmai.html` 和烘焙器文件入口副本。`df-fx-workbench_v2_locmai.html` 原字节不变（构建前后 sha256 相同）。改前备份 `backups/20261023-lodmethod/`。
- 回归：resource-rules 32、update-backend 13、delivery-contract 11 通过。check-import-policy / shared-recheck / delivery-migration / life-modules 新旧构建输出相同，是改前就有的失败（不是这次引入）。没有实际导入 UE，只做了离线模拟。

## 2.29部署补发 · 烘焙器文件入口（2026-10-19晚）

上一轮只验证HTTP导入页，漏了烘焙器file入口的runtime副本。19:39仍执行旧--proofs命令；本轮第一次读到的副本20:10已含新版，不能倒推当时磁盘快照。现在build-delivery生成独立HTML后会核对本机配置来源、复用F盘prepare同步既有副本、核对实际登记代码；缺目录不创建、不同配置不覆盖、旧生成物不报成功。4项新部署回归通过，实际副本与当前源的规范生成结果一致。原始工具/旧工作台不变；不执行UE或真实登记。共享版本戳/自动握手由导出23认领处理。本机用户需先保存效果，再整页刷新烘焙器以重新载入脚本，单点重连不会更新已加载代码。

## 独立交付入口 v2.29 · 登记命令超长与收尾恢复（2026-10-19）

- 修复累计贴图证明全部放入 Windows 命令行的缺陷。真实日志36000字符超过32767，资产已保存后登记启动报 Error87；现在固定命令行、JSON走stdin，communicate同时收发。保留历史证明和旧小规模CLI兼容。
- 资产写入、交付登记分阶段反馈；登记错误带实际saved/add/edit计数，焦点转到失败包，标签显示已保存/登记待补齐。
- 仅所有所选目标都有保存回执且属于登记失败（含旧Error87）时，显示「补写交付登记（不重导资产）」。用户点击后重读源、目标映射、类型、来源标签、脏包、磁盘文件及贴图保存哈希，再只登记；来源/资产/存储错误继续保留失败。没有自动迁移或补写真实任务。
- 14组检查全部通过，含真实Windows旧错误复现、2000条UTF8输入、引擎Python2.7→3.12、损坏输入拒绝、实际生成的只读复核Python、源与磁盘变化阻止恢复、15项控制器交互。8034真实入口4个隔离浏览器场景通过：完整成功、登记失败、只补登记、旧Error87刷新恢复。浏览器网络全部模拟UE，未写真实UE/P4/资源登记。
- 只部署 df-fireworks-delivery_locmai.html；原始工具与已停止更新的df-fx-workbench_v2_locmai.html保留改前原字节。当前源上的NoMip/DistantVFX/NeverStream等既有规则保留。测试/备份留既有目录，未创建新目录。

## v2.28 · 资源规范四项（2026-10-18，用户「导入器四项同意」）

- 读 FireWorksLab 烘焙器 4.9.113 的 cascade 字段（仓库 `spec/cascade_params_v1.md` §1.3）：`system.fixed_bounds` → 粒子系统 FixedRelativeBoundingBox（仍 bUseFixedRelativeBoundingBox = true）；`required.uv_flip` → Required.UVFlippingMode；序列 / 单束材质 `emissive_dissolve` → 材质实例 EmissiveDissolve；`FacingCameraPosition` 原来就支持。都写后读回，不一致就停、不当成功。
- 「更新」不改回：包里没有这几项时（4.9.113 以前导出的旧包，或新包里没算出盒），保留 UE 现值——手调的固定盒（非 ±100000）、同名发射器的 FacingCameraPosition / UV 翻转、材质实例原来覆盖的 EmissiveDissolve（「更新」会先清实例覆盖，这里先读后写回）。新包以包为准。
- 校验：盒须三维有限数且 min < max、翻转只认 None / RandomFlipUOnly、0.98 须 (0, 1] 且只给模板材质；不合规在写 UE 之前拦下。旧包校验结果不变。
- 新文件 `fireworks-resource-rules.js`（build.py 注入），改 `fireworks-plan.js`（校验一行）、`fireworks-system-policy.js`（盒参数化 + 按数值读回）、`fireworks-import.js`（Required / 材质 / 系统三处挂接）。改前备份 `backups/20261018-resource-rules/`（含两份 HTML 与 runtime 副本，SHA256SUMS.txt）。
- 两个入口都重建：`df-fx-workbench_v2_locmai.html`（v2.28）、独立交付入口 `df-fireworks-delivery_locmai.html`（上次 10-14 构建，这次一并带上 v2.27 CPU 事件导入）；仓库 `tool/local_delivery/runtime/importer.html` 已重新部署，8034 /importer 读回含新代码。
- 检查：新增 `check-import-resource-rules.cjs` 21 项（新建 / 旧包 / 同名更新保留 / 新包覆盖 / 读回不一致报错 / 校验拦截）；仓库 372 份真实包套 4.9.113 规则后，新旧入口 validate 都不多报错；其余检查与改前基线逐项对比见仓库 `analysis/local/SYNC_CHECK_20261017/导入器检查/`。全部 UE 调用模拟，真实导入 / 读回未做。

## 独立交付适配 · 同名迭代与新修订 2026-10-14.2

- 新修订继承同资源同平台的用户基础名/编号/正式命名/范围及操作，已完成来源默认进入更新；不复制资产表、完成计数或确认。新配置删除的图层/分段不从旧记录补回。
- 派生共享内容显式更新必须核验旧Texture2D保存证明/磁盘SHA/策略/不脏；不明来源或新建覆盖仍拦；执行前再次核验，原备份/版本管理流程保持。
- 清单从当前配置的发射器引用标注编辑图层和序列分张；02不等于第二个编辑图层。
- 17核心与6整页及既有契约/接收/原生/版本管理/选择/更新/复用通过；原入口和3原生模块哈希保持。部署runtime，真实UE写入0。完整新导出与实播未验，file浏览器安全拒绝未绕行。

## 独立交付适配 · 派生首次导入 2026-10-14.1

- 派生规格允许在对象与磁盘均不存在时，首次按原正式名称创建共享贴图；已有同内容、已保存且策略正确的证明继续复用，含本批次首包供后续平台复用。
- 存在但无可靠证明、类型/像素策略不符、脏资源、磁盘残留或已变更目标一律拦截。必需依赖须勾选创建或有复用证明；非必需跳过项不强制创建。
- 执行前再次核查首次创建范围和目标不存在，不拿初次检查作为覆盖授权。失败/不完整检查不参与可执行批次碰撞，真实不同内容同名仍拦。
- 新14核心/5整页隔离检查先复现后通过；契约11、接收7、跨会话派生、原生模拟、版本管理25、前置门禁与原选择/更新/复用回归通过。Python启动错误（导入路径/GBK终端）用正确目录与UTF8重跑15项通过，没有修改上游门禁。
- 实际用户双平台包执行真实控制器只读预检，2 ready/0 error，共用2贴图由手机复用PC计划。未确认、执行仍禁用；30只读调用，UE写入0。证据backups/20261014-derived-first-native.json。
- 已重建独立HTML并更新F:/FireWorksLab/tool/local_delivery/runtime/importer.html；原工作台/原源HTML与3受保护原生模块SHA保持。没有创建资产目录、导入/删除/保存UE资产；完整导入/实播与用户验收未进行。

## 4.9.69交付契约适配 · 独立本机入口（2026-10-12）

- 只注入独立交付页：手游PS使用配置_M，PS/MI移至规范手游目录；原生flags映射LockAxisFlags，Required保留实读bUseInLocalSpace。原工作台/源HTML不改，未回到v2.27入口。
- readPack前消费23的fx_gate，失败不继续；成功导入保存后才登记共享PNG与UE磁盘证明。SHA256覆盖原序列与派生复用，缺失/脏/变化来源拒绝；共享登记优先，保留旧浏览器证明别名。
- 11项契约、原生隔离模块/持久化模拟、7组交付接收、跨会话派生、临时登记检查通过；原PC命名/校准/更新/复用回归保持。真实错包gate=1，实际8034三包gate=0、9段序列回放pass、6条UE只读计划通过。
- 原始快照位于backups/20261012-codex-4969-local。确认/执行未代点；Hero/XS未入队，UE保存/实播/表写入仍待用户实际导入后核验。L远段MI磁盘变化双快照保留，参数一致，原因未知。

## ~~v2.26-delivery.1 · PC / mobile delivery pairing (2026-10-11)~~ · **REVERTED 2026-10-12**

- Reverted at the user's request (plan A in `F:/FireWorksLab/analysis/results/MOBILE_TEST_20261011/尾缀重导入_20261012/复盘_2026-10-12.md`): it hard-wired the non-compliant `_Mobile` / `_Mobile_HD` naming and relaxed the mobile "所选目标均未创建" block. `delivery-pairing.js` and `check-delivery-pairing.cjs` moved to `backups/20261012-revert-pairing/`; `build-delivery.py` and the hint line in `delivery-presentation.js` restored. Rebuilt delivery entry SHA256 = 1223297d… (identical to before the change); runtime importer = 75a08c90… (identical). The text below is kept as history only.


- Delivery entry only (`delivery-pairing.js`, injected by `build-delivery.py`; the original workbench / copier HTML hashes are asserted unchanged). One delivery = one effect: the "效果英文名" field edits a shared name; PC row keeps it, mobile row always stores `<name>_Mobile`, so the two particle systems can never target the same `P_EFX_FireWorks_<name>_HD`. The mobile row shows the shared name without the suffix. Editing either row updates the other.
- One "处理方式" choice applies to both rows. A mobile row under a PC row that really updates an existing particle may create every mobile-only target in update mode ("补建缺少项", first mobile import); update with nothing existing stays blocked on both rows (typo protection kept).
- While the PC row is blocked (e.g. create mode on an existing effect), shared Ramp / cutout textures of identical source content are no longer reported as "包内正式资产目标相同" on either row. The mobile row instead says it waits for the PC row. Different content at one name is still blocked by the original check.
- Stored batches from before this fix whose mobile row lost `_Mobile` are repaired on the next check (logged).
- Incidents reproduced from real receipts: GoldRay 959ffda2 (create mode, 9 existing PC targets + 4 false shared conflicts) and RiseTrail_L W80 f9bf05bf (mobile row renamed to the PC name → particle name collision). `check-delivery-pairing.cjs` (6 contracts) failed before the change; all delivery/import suites re-run green. Real 8034 page, read-only: GoldRay switch to update → PC ready (update 9), mobile ready (new particle/MI/sequence, reuses 4 PC textures). No UE writes.

## v2.26 · Shared batch rechecks and delivery regression audit (2026-10-10)

- Rebuild selected peer plans before batch collision checks after a single-package change; old proposals cannot poison shared Ramp/Cutout ownership. Unselected packages cannot own a batch reuse. Preview distinguishes planned batch reuse from reuse of a proven saved texture. Different verified content at the same formal name remains blocked.
- Keep the requested inspected package after peer rechecks. Preserve prior approval only for unrequested peer packages whose entire validated plan fingerprint is identical; explicitly requested rechecks always require fresh approval.
- Delivery preserves the original GPU-policy expanded state after the same native controls move into complete settings. No native execution, saving, recovery, texture/system policies, source paths or artwork algorithms changed.
- The history audit re-runs original regression suites against the delivery HTML. Backend extraction handles both original and delivery exports; UI tests locate moved native settings, and integrity checks bind to the approved pre-audit v2.25 entry (including Unicode/FText receipts). JSDOM teardown discards document microtasks like a browser. Native acceptance remains separate.

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

## v2.20 · 2026-10-06 · 第一版一屏导入工作区

原生产入口和桌面快捷方式不变。刷新后核对右上角工作台 v2.20。

- 左侧素材队列、中栏当前包设置、右栏当前包资产预览同时存在。查看不改变勾选；添加/批量编辑只占中栏，取消不丢原批次。
- 底部只有一个可见主动作：添加 → 检查当前包 → 确认当前包并查看下一个 → 全部确认后执行导入。确认绝不自动导入；改名称/目录/范围作废对应确认，刷新须重新检查。执行中锁定设置，停止仍在当前包完成后生效。
- 完整名称保留可选择文本，长名可横向滚动；「查看目标目录」展开完整路径、名称换行及每项来源/平台上限。低频命名设置和规则折叠；各窗格独立滚动，底部动作固定。
- 日志在没有保存过开合偏好时默认一行；保留显式偏好，错误展开。展开占实际空间，不覆盖动作。1366及1920宽度三栏，窄屏上下双区仍保留下一步；这是CSS设计和离线检查，不是实页几何验收。
- 导入引擎、命名/依赖/可选轮廓策略、HD/手游尺寸/ASTC/单面与无溶解/部分恢复保护保持。没有自动重导任何资产，没有新目录。

28套隔离脚本575条PASS，新增17条流程检查；原始源和v2.19原生导入/选择/规划/编排原文保持。真实UE写入0。file://浏览器策略仍禁止实页读取，未绕过，尚缺渲染后截图对照：design-qa.md 的 final result 为 blocked，不能把离线检查记成视觉通过。

## v2.18 · 2026-10-06 · 只读像素格式与部分导入恢复

## v2.19 · 2026-10-06 · 可选轮廓图跳过

同一入口与快捷方式，刷新后核对 v2.19。

- 勾选表示导入/更新。取消可选轮廓图后，不导入，也不写入本次新建或重建粒子的 CutoutTexture；默认四边形可能增加透明区域绘制开销。只用于 RequiredModule 裁边的 cutout 才可选；同时被材质使用的纹理仍是必需依赖。
- 在跳过的轮廓图行提供「复用现有轮廓图（不导入）」：明确保留引用，检查同路径正确类型的已有资产，执行前再查；不会导入、更新、迁出或保存这张图。
- 主贴图、Ramp、材质的依赖检查保留；未勾选的粒子和材质不会修改。取消不删除原有资源，选择保存到浏览器；改选作废确认，刷新需重新检查、确认；忙时锁定。
- 历史已完成资源不会自动变化。未完成旧任务取消轮廓图后，本次用途请在新预览确认；需要沿用旧图必须显式选择复用。现有资源同名更新仍按所选粒子全部重建发射器，不保留旧手动模块。

先用 v2.18 复现「取消仍报必需依赖」，再修复。27套隔离脚本全部通过、558条PASS，新15项覆盖UI选择/复用/刷新/确认/锁定和完整模拟新建/更新执行范围；来源JSON、帧格参数、原工具与其它引擎保持。没有正式UE写入、新目录或Cascade播放；尚未真实导入及浏览器视觉验收，不把模拟成功当作原生验收。


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

## v2.14 · 2026-10-06

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


烟花编排同入口新增整场工程：资源、完整单发、场地/阵型与时间轴共用数据。目标起爆倒算发射、跨段预发和严格齐爆；相对高度、飞行与花径独立、固定随机、提案导入预览/冲突重写、统计、版本关联、保存恢复/撤销、JSON与原生分项复制/TXT输出。显式开场＋白墙小样保持第二波10秒起爆与九点36发的四波时间；新建空白，ID只改ID，未标定数值不自动套旧素材公式。

边界检查先复现并补保护：损坏阵型/列表、未填数值、顺序扇形最后一簇时长、叠乘倍率、旧资源段起爆锚点、俯视朝向、过大生成总量，以及更换资源后不能沿用旧素材标定。异步复制失败不恢复失效文本。原导入、命名/更新、呈现及原单发功能保持；仅公共壳增加两个整场模块调度调用。

原生字段来自只读BP；本版零自动正式UE写入。PC专属平台位、槽位/父子变换、真实弹道/尺寸及原生粘贴实播尚未验证；隔离DOM不是实页视觉/帧率验收。Library全文无法读取，依据仓库计划与授权摘要实现。保存先后顺序的旧导入报错未在本版修复。细节和验证日志仅保存在本机。

# DF工作台更新

## v2.13 · 2026-10-05 · 寿命速度与缩放模块

包内VelocityOverLife映射到Cascade Velocity/Life，沿用通用模块/分布创建，支持VelOverLife常量、随机范围、Linear曲线与Absolute；CPU默认不烘。新增Life向量分布与布尔格式检查，执行入口再校验，非法配置在原生写入之前中止。SizeByLife只改Y、独立Pivot、RT6远段、元数据过滤均按源值验证。正式命名、最新界面、备份/暂存替换/隐藏缓存/分阶段保存未回滚。

18个隔离脚本413组（含72组新检查、真实六个RT5包与新RT6包）通过，独立CPU测试的原生字段另11组写入/读回通过；旧恢复用固定RT4L夹具，避免用户更新素材目录破坏历史复现。65备份校验，同路径v2.13，原工具与快捷方式保持。未保存测试文件或改既有用户资源，未打开Cascade/实播；临时对象移至Transient，当前会话仍有测试旧名索引。GPU方波视觉采样和其它UE实测包播放保留未验状态；共享UI检查6/7原有store错误如实记录。

## v2.11 · 2026-10-05 · 五页草稿落地偏差修正

用户实页已加载v2.10，偏差来自上一轮呈现比例。取消内容居中限宽与固定450px设置列，公共正文/控件16px、宽屏18px。按已选每页稿分别恢复资产40:60、材质36:64、整枪26:74、ResourceFX31:69、编排32:68的桌面结构，900px以下纵排。

资产四步、材质五步，步骤跟随有效原计划和真实执行锁；输入改变不假报旧计划有效，检查不假报执行。预览刷新到标题右侧，一键手游优化在折叠时可见；材质预览原行按对照卡片组织，不删除原八列或替换输入。两种配表的原预览按钮移到左侧，整枪原七表与ResourceFX全部原编辑节点保留；后者主路径跟随当前行、详细列仍可展开。编排恢复场景/播放/时间条/逐发数值/输出顺序与左侧参数行；底部原动作不变。原DF品牌、配色和六页名称保留。

未修改业务模块、字段、默认值、事件、存储键、模拟或原执行门槛，最新preRoll校验/过滤仍在。构建输出同路径v2.11，原v1.0.1字节不变。63份备份核对；17个隔离脚本通过，其中原UI14组、新布局/状态14组；最后样式修改后这两组复核通过。版本夹具改读构建版本，仍检查页头/标题一致。源图示例不写入任务，所有UE请求均模拟。

本轮有用户修前实页证据，但缺修后同尺寸截图，视觉结论继续blocked。源码/CSS声明检查不是浏览器渲染、各尺寸无溢出或UE实播验收。细节见 `design-qa.md`、`research/design-20261005/`；快照 `backups/2026-10-05-visual-fidelity/`。

## v2.10 · 2026-10-04 · 六页界面落地

按用户选择的六页草稿整理原工作台，同路径更新，保留深灰青绿配色、原工具名、字段、控件、默认值和业务逻辑。共享字号/间距/表单/预览/底部执行区，主动点击说明、Esc关闭及焦点恢复，窄屏工具菜单和分段响应式布局。

复制后优化与扇形轮廓有明确同名折叠入口；材质方向整行显示。导入保留三步检查/确认/执行，清单与详情独立。整枪预览逐表切换，ResourceFX按平台筛选与详细字段展开；原行和输入节点不删除，隐藏编辑仍参与原完整计划。编排使用原SVG与控制器，调整预览/播放/时间条/数值/输出顺序，输出按钮放到底部。

新界面层独立于业务源码。构建同时保留维护会话的新导入元数据修复，不回滚其最新源文件；本轮没有修改导入引擎、模拟代码、命名规则或存储。16个隔离脚本通过（新界面14组），真实UE接口未调用；无授权夹具因已有真实授权明确跳过，没有删除授权。备份、源码对照及原始结果在 `backups/2026-10-04-design-implementation/` 与 `research/design-20261004/`。

视觉验收 blocked：内置浏览器拒绝 file 协议，遵守该限制，没有通过其它浏览器或本地服务绕过。没有当前实页截图或同尺寸视觉对照，未声称浏览器像素还原、各尺寸无溢出、UE实播或商用验收通过。详情见 `design-qa.md`。

## v2.7 · 2026-10-04

修正页头遗漏的v2.5标记，生成标题和页头共用版本号。增加新建/同名更新模式；更新预览列出资产操作、完整名称及旧→新发射器数量，保持原序号与粒子对象路径。执行前核对配置、图片及目标结构快照，覆盖前备份原文件和当前状态并确认添加/编辑权限。

完整暂存新发射器后一次换入Emitters，不先清空原列表；贴图同名替换、材质同对象重置旧覆盖后写入当前包。组装失败保留旧列表，替换/保存失败尝试恢复原引用并保留备份/阶段。只支持完整单级LOD，其他情况在依赖更新前拦截。包中未列出的旧资产不删除。

失败、冲突及未完成行可直接取消勾选，加入取消全部选择，完成项自动取消选择并可直接准备同名更新。部分更新失败不能通过取消界面记录伪装恢复完成。目录可直接编辑；缺cascade.json时显示具体原因与检测到的子目录，点击后只重新检查。

实测打开独立粒子触发一次Cascade崩溃；定位TurnOffSoloing和未同步的隐藏SoloTracking。4.24整块文本导入该缓存会留下空字段而返回成功，改用嵌套数组操作并显式读回。先保证缓存有效再替换发射器，减少条目时也不留下空设置；新建、续建和恢复引用均走同一保护。

209组隔离检查通过。独立UE测试验证同名发射器增减、含GPU、失败保留旧结构、新建，并成功打开/关闭Cascade；同名贴图尺寸更新和旧MI标量覆盖重置通过。用户当前资产未被本轮测试替换；4个自建测试文件已存档并隔离在未提交测试清单。浏览器安全策略阻止file协议现场审查，未做实际浏览器视觉、复杂烟花画质或长期稳定性验收。修改前备份：`backups/2026-10-04-iteration-update/`。

## v2.6 · 2026-10-04

修复模块`note`说明文字被发送为原生属性造成的导入中止；本次素材包在第三个发射器失败的场景已先复现。补齐项目实际局部空间字段和尾缀Pivot模块；网页与本机脚本共用同一实现。

导入依赖分阶段保存，并验证.uasset文件；调用当前SourceControl标记添加、读回真实状态。未完成粒子不保存为成品；保存失败、文件缺失或添加失败均显示阶段和已确认数量。原有名称确认、目标防覆盖、编排和其它复制器保持。

编辑前备份：`backups/2026-10-04-import-failure/`。本次资产恢复和参数/文件核对证据单独留在私有研究目录；不代表效果实播或用户画质验收。

原177组加5组恢复与1组原生字段隔离检查共183组通过。按用户确认保留前两个发射器及57个关联对象，只补后8个；10个发射器原生结构核对，新增8个的曲线/模块读回通过，8个资产均真实保存并确认P4 action add。浏览器旧失败记录保留为历史，已恢复的实际目标不应重复导入。

## v2.5 · 2026-10-01

从当前PC和手机ResourceFX表的ResourceId字段只读提取53个烟花相关ID，按尾缀9、单簇6、爆炸26、其它12分类，标明平台。移除三种只有名称的空入口，统一提供空白/自定义、可搜索的ID预设和手填实际ID。预设只有ID元数据，不载入旧角度、大小、高度、时间和随机；扇形与每个升空/爆炸资源段共用同一列表。

换ID仅替换资源，保持用户参数、名称和配比；手填即时更新且保留焦点/光标。未填、未完成数字和未应用配比禁止复制旧数据；搜索无结果不自动改选，增删段后下标对齐，改变用途不自动换素材。ID库与完整子模板配方分开，后者明确标为含参数。

新增主动「更新ID列表」：四路PC/手机读取全部成功且完整后才原子替换，去重合并平台，仅提取ResourceId；失败或异常响应保留旧库和草稿。更新不清掉当前ID，移出列表的ID转为自定义；新ID立即可选。ID库与v2用户草稿一并离线恢复，损坏缓存回退内置列表并保留草稿。

兼容v2.4三种名称空入口的用户草稿，切为空白时保留当时填写的模板名及参数；无效或未完成的段ID刷新后保留草稿，继续拦截导出，避免整个组合丢失。

末轮复核：载入完整配方时，ID选择器明确显示当前完整配方，避免误显示空白；改选空白/自定义可立即清掉组合资源，保留当前数字、配比和名字。

38组ID/用户流程检查及原139组回归，共177组隔离检查通过；原工具与命名引擎未变，桌面快捷方式不变。真实接口本轮仅只读资源表/BP，没有UE写入或实际粒子播放，未完成真实浏览器视觉/帧率验收。备份在backups/2026-10-01-resource-ids/，私有数据与报告仍留本机。

## v2.4 · 2026-10-01

移除全部内置BP原配比和资源组合，三种素材名称保留为空白入口。新建ResourceId、模板名、角度/大小配比为空，随机为0；升空/爆炸从空资源段和未填高度开始，保留用户确认过的3.5/5/8秒规格。父编排不预选旧子模板。旧version1草稿单独存档后从空白开始，备份失败不覆盖；本版新填version2草稿继续恢复。

新增手填角度/大小关键点，按簇数插值；明确应用后才更新预览/导出，未应用或无效输入拦截复制。清空恢复中性均匀分布。原BP完整样本仅移到测试专用夹具，不包含在生成HTML中；用户主动添加/保存/同步的模板才进入素材库。

修复预览近似等长但导出不等尺度的差异：共用Z尺度与端点模型，新增规整扇形、圆弧/圆顶/平顶、手填对称大小、Z长度输出和相对原长校准。未应用的目标长度不能通过原高度选项绕过，预览不声称复现实际Cascade或摄影视角。

22组空白/手填、19组轮廓和原98组回归共139组通过；接口均隔离模拟。本轮没有UE写入，原工具与原命名计划哈希不变，桌面快捷方式仍指向同一HTML。没有真实浏览器视觉、帧率或粒子轨迹验收。编辑前备份在backups/2026-10-01-fan-contour/。

## v2.3 · 2026-10-01

烟花素材导入改为「填写基础名 → 预览并确认名称 → 执行导入」。保存或逐项改名后先只读检查，展示每个原贴图/材质与实际完整目标名称、目标目录的对应；基础名和两位序号单独标明。预览明确说明类型前后缀自动添加，不改变原命名规则。

增加显式名称确认按钮，确认只开放导入入口，不自动执行；批量可一次核对和确认。检查通过但未确认的项显示「待确认名称」。所选项包含未确认名称时整个执行入口拦截；改名、换包、重新检查、刷新清除确认。输入时立即清掉旧目标显示并保留焦点。导入前的源内容与目标存在性核对、停止、失败记录及GPU待办保持。

21组名称确认检查和原有77组回归通过，所有UE写入模拟。原始导入引擎和原命名计划未修改，原工具哈希及桌面快捷方式目标不变。未运行真实导入或实际浏览器视觉验收。编辑前备份在backups/2026-10-01-import-name-confirmation/。

## v2.2 · 2026-10-01

编排页改为模板数据编辑：补齐FanGold、FanComet、FanSilver，并新增可粘贴子模板参数、只读同步BP的素材库。右侧预览上方可命名、复制UE参数或下载TXT；复制使用当前固定随机组，原生随机清零，文本可手动选择，失败不会显示虚假成功。

制作子模板新增非扇形「升空＋爆炸 / 资源段」。可新建、添加/删除资源段、输入ResourceId、每段时间、变换和随机；升空默认小3.5/中5/大8秒，爆炸在升空结束后可加延迟。大小、高度变化不改固定时长。最高爆炸高度开放输入，小型留空、中型250米、大型400米均可改；高度向下随机并限制最终爆炸位置上限。

尾缀原轨迹和爆炸位置分开表达。显式启用Z缩放后，以目标/原始高度比输出尾缀EffectScale.Z，须资源支持组件缩放并在UE校准；预览不是实际Cascade回放。原有扇形高度随机没有确认字段，需设0或选择原高度导出。不自动改写BP，也不查询手填ResourceId是否有效。

26组新文本/素材库/资源段检查、13组原编排检查、29项工具和9项多贴图回归通过。同步检查模拟连接；实际只读核对BP字段并验证Roll正方向。原工具哈希与BP磁盘修改时间未变。编辑前备份位于backups/2026-10-01-template-copy/。

## v2.1 · 2026-10-01

新增「编排设计 → 烟花编排」。制作子模板与编排整发共用独立本地规则和动画预览；支持数量、配比、五种出现顺序、间隔、固定随机码与大小/高度/角度独立变化。新增时间拖动、暂停、慢放与手动循环、刷新恢复和只读逐发数值。

动画不依赖UE，不进行BP写入。高度先用示意比例表达，真实粒子需校准。既有五个模块及业务引擎保留；原工具未改，同路径更新网页版，不需要EXE。

13组编排集成、29项原界面/计划及9项多贴图检查通过，UE接口均模拟。尚未进行真实浏览器视觉与UE轨迹验收。
