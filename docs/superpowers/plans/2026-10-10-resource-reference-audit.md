# 新基础资源引用排查 Implementation Plan

**Goal:** 核对新粒子→ResourceFX→节目基础库→固定花型→导演三表链路，修复已复现的英文ID搜索漏项；项目免询问提交规则持久化并推送。

**Architecture:** 只读取UE和当前节目。按精确ResourceId、粒子路径和固定版本核对，不按名称相似度替换。搜索在library-model纯函数统一匹配，原视图与节目保持。

**Tech Stack:** Node test、React、UE既有只读接口。

## Global Constraints

- 用户确认新效果另存为新UE粒子；未查明路径与映射前不得将旧同名资源冒称新资源。
- 不改UI布局，不写UE或ResourceFX，不重新编排、覆盖用户节目。
- 项目已授权内容检查后直接提交推送，不询问；其他作者工作保持。

### Task 1: 核对与修复

- [x] 读取ResourceFX表、导演实际三表、独立子模板BP、8034资源索引和8025现状。
- [x] 原始复现：基础库输入Lime显示0个，虽然节目中存在对应ResourceId。
- [x] 新增`matchesLibrarySearch(item,query)`回归：中文标签+英文ID+花型资源+编排引用均可查，输入去前后空白，未知关键字不匹配。
- [x] `TemplateLibraryCompact.jsx`仅替换现有筛选调用，版本及变更记录更新。
- [x] 用户给Combo路径后确认20/20引用一致、全部已使用；旧路径不等于旧内容。记录独立BP与导演区别。
- [x] 发布检查、8025真实搜索验证、截图证据；提交本对话已验证源码/产物/记录和R04，远端SHA核对。
