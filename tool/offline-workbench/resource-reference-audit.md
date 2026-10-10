# 基础资源引用核对 · v16.0.6

2026-10-10，编排demo（24）。只读核对当前UE与8025，未写ResourceFX、粒子或导演。

## 结论

节目按ResourceId读取的就是用户指定的 `DataTable'/Game/R13N/Common/PC/DataTables/Resource/ResourceFXTable.ResourceFXTable'`，以该行FxSP为实际粒子。20个基础资源的节目路径与实时表全部一致，20个都被当前导演调用；没有发现这三种资源漏导入。

下列粒子都位于 `/Game/Effects_HD/Props_HD/FireWorks_HD/`，对象名与资产文件同名。播放次数指当前R03高配的完整花型调用，不是粒子数。

| ResourceId（省略P_EFX_FireWorks_） | 实际粒子 | 固定子模板 | 次数 |
|---|---|---|---:|
| Lime | P_EFX_FireWorks_LimeStar_HD | NYR03_Lime_v1 | 6 |
| Crackle | P_EFX_FireWorks_Crackle_HD | NYR03_Crackle_v1 | 4 |
| GoldCoreLime | P_EFX_FireWorks_GoldCoreLime_HD | NYR03_GoldCoreLime_v1 | 8 |
| OrangeGlitter | P_EFX_FireWorks_Combo_HD | NYR03_OrangeGlitter_v1 | 5 |

用户提供的Combo路径正是橙辉星当前引用。路径与旧快照相同不能证明粒子内容旧；此前将其称为“旧粒子”的判断证据不足，已纠正。此核对证明引用一致，不证明UE内该资产的视觉内容是哪次制作修订。

## 三处数据不要混淆

- 8025节目：20基础资源、22固定花型、149片段，高配410次调用。
- 当前已加载场景导演：ActorLabel为 `BP_Failed_NewYearFireworks_ShowDirector_2`，内部对象名为 `_7`。三表22子模板/62父模板/149时序项，按原生浮点容差完整比较与R03高配一致；不是读错成另一个导演。
- 独立 `BP_FX_FireWorksShow_Template`：仍是17项旧目录，缺上述三项。它与导演是不同对象，导入导演不自动改这个独立BP。本次没有覆盖它。

## 已修复的真实问题

基础模板筛选原来只匹配中文显示名：输入Lime得到0个，但实际库有对应ResourceId。v16.0.6将现有搜索扩展到基础ResourceId，保留花型资源/编排引用搜索，忽略大小写及首尾空白；布局、图示、资源绑定均未改变。

新增失败用例后修复；发布检查129核心、38包装、5Python通过。8025实际验证：Lime=2（小青柠、金蕊柠），Crackle=2（金裂星、爆裂星），GoldCoreLime=1。选中小青柠右侧显示 `P_EFX_FireWorks_Lime`。

证据：[20项引用与调用计数](resource-reference-audit.json)、[实际搜索截图](resource-reference-search.png)。完整原生读取保留本机analysis/local/NEWYEAR_V01。本轮没有进行UE视觉播放验收，也没有把浏览器示意画面当成真实粒子回放。

## 接续

项目免询问提交授权已写CLAUDE.md并以2c88323d推送。v16.0.1–6累计修复与选定R03/R04节目本轮统一归档；R04仅修正31个片段的0.1秒错开，是独立候选，当前浏览器与UE仍为R03。R04的UE实播和艺术验收尚未完成。
