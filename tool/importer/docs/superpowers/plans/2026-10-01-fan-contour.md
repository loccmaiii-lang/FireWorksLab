# 扇形线长与轮廓一致性 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 修复草稿近似等长、导出保留不等尺度的差异，提供规整扇形和可复制的轮廓调整。

**Architecture:** 新增纯 ShowFan 模型，依据原始缩放和素材相对长度生成端点与导出尺度，ShowPlan 与 ShowText 共用模型。新参数保存到原有编排配置，原生模式保持原参数输出。复杂长度轮廓只有已匹配现有缩放或显式启用Z长度缩放才可复制。

**Tech Stack:** 单文件 HTML、JavaScript/SVG/CSS、Python 生成器、Node/jsdom 模拟接口。

## Global Constraints

- 工具和源文件只在 D:\FXTools\DFWorkbench；公共仓库仅保存脱敏协作记录。
- 不写入或改动 UE/BP/素材，不改共享烘焙器，不打包EXE。
- 最新用户要求覆盖旧默认：移除内置原配比及资源组合，新建配比、ResourceId与模板名留空；已交付的用户新草稿才可恢复。
- 灰线代表完整端点，动画代表当前时刻，二者必须明确区分。
- 长度按缩放与素材校准估算；不声称能复现 Cascade 重力、寿命、随机和摄影视角。
- 新轮廓不能被「按原高度导出」静默绕过；不添加假想BP字段。

---

### Task 1: 复现现有线长与导出不一致

**Files:** Create `workbench/check-show-fan.cjs`；备份 `workbench/backups/2026-10-01-fan-contour/`。
**Interfaces:** 加载生成后的 HTML，模拟离线连接和动画时钟；只操作编排，不连接真实UE。

- [x] 核对素材库：Silver原始XYZ=0.75–1.17；Comet与Gold尺度均为1，Gold使用多种ResourceId。
- [x] 写检查先证实Silver零随机时灰线长度比须对应实际输出Z缩放，而旧版近似等长。

```js
const lengths=guides.map(g=>Math.hypot(g.x2-g.x1,g.y2-g.y1));
near(lengths[0]/lengths[6],0.76/1.10);
```

- [x] 覆盖等长圆弧、平顶补偿、圆顶两侧比例、左右对称、单簇、固定随机独立、复制一致、旧配置恢复和资源校准。

### Task 2: 共用纯轮廓模型与编辑控件

**Files:** Create `workbench/show-fan.js`；Modify `show-plan.js`、`show-text.js`、`show-ui.js`、`show.html`、`show.css`。
**Interfaces:** `ShowFan.options(input)`规范化 outline/sizeLayout/edgeLength/lengthScale/applyLengthScale/calibration；`ShowFan.model(profile,event,index,count,settings)`返回 source/nativeScale/effectScale/nativeLength/targetLength/previewLength/requiresApplication。`ShowPlan.make`填充事件length/scaleZ；`ShowText.generate`使用同一模型写EffectScale。

- [x] 保留原配比；提供统一大小、左右对称以及原始/圆弧/圆顶/平顶轮廓。

```js
const t=Math.min(1,Math.abs(event.angle)/(settings.spread/2));
const dome=1+(settings.edgeLength-1)*t*t;
const level=1/Math.cos(event.angle*Math.PI/180);
```

- [x] 原始模式根据最终EffectScale.Z×素材校准值画线，不能再只用高度随机画近似等长线。Z变化显式选择，未应用的目标轮廓提示并阻止复制；统一大小匹配等长时可直接按既有XYZ复制。
- [x] 「规整扇形」主动设均匀角度、统一大小、圆弧、零随机、齐发。逐发表显示真实导出Z与线长估算，连接端点的薄轮廓线辅助核对。
- [x] 高级区提供Z长度缩放和各ResourceId在Z=1时的相对长度校准；不添加引擎字段，默认1为假设。
- [x] 新输入记在原有配置；父编排和分段升空/爆炸保持旧路径。现有复制检查补加载新模块。

### Task 3: 交付与回归

**Files:** Modify `build.py`、`shell.html`、`README.md`、`CHANGELOG.md`、`使用说明.txt`；Create `research/fan-contour-report.json`。

- [x] 升为v2.4，原路径生成单文件。
- [x] 新检查通过后运行七套必要回归：

```powershell
python build.py
node check-show-blank.cjs
node check-show-fan.cjs
node check-show.cjs
node check-show-export.cjs
node check.cjs
node check-multi-textures.cjs
node check-import-name-confirmation.cjs
```

- [x] 原工具哈希、桌面快捷方式不变；本轮无真实UE写入。BP在本轮期间观察到外部磁盘变化，保存起止信息，不声明BP修改时间不变。实际浏览器未验收，不把示意模型当粒子回放。
- [x] 保存私有报告，公共仅更新自己的对话记录、在线时间与交接。
- [x] 正常推main（61f721e）并请求受管工作树归档。

## Self-review

需求覆盖：解释为什么线长不同、修正预览/输出差异、提供规整和可调轮廓、区分整体长度与世界高度、保持原配比和数据导出。所有相邻接口均在Task 2定义，当前对话内按已授权范围完成。

## 最新用户修正

用户原话：所有的原配比预设都去掉，之前那个是我乱填的，默认都用空的，我要加配比自己填。

- [x] 活跃HTML不再内置BP旧数值；FanGold/Comet/Silver只保留名称入口。
- [x] 新建扇形ResourceId、角度/大小配比和导出名称留空；支持手填关键点按簇数插值。
- [x] 升空/爆炸资源段默认空ID、零随机、未填高度；保留用户确认过的3.5/5/8秒规格。
- [x] 旧version1草稿单独存档，不自动载入；version2只恢复用户新填内容。
- [x] 所有原样本验证改为测试专用显式输入，新增空白默认/迁移/手填配比集成检查。
