# 导出目录、分类与 ZIP 留档 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. 本机未安装该辅助技能；用户已要求实施，本会话按下面清单顺序执行，不派子代理。

**Goal:** 用户可改保存路径，缺省为 `D:\ProjectTextures\FireWorksLab`；新交付按烟花/尾缀、大中小、真实平台组织，每次成功导出保存递增版本 ZIP。

**Architecture:** 制作端仅提供实际规格分类元数据；目录服务验证原 ZIP 后按平台配置引用组织展开文件，保存原 ZIP 字节及独立导出序号。内容修订身份与原导入控制器保持，历史目录兼容。

**Tech Stack:** Python 标准库、现有 HTML/JS、原本机导入适配器。

## Global Constraints

- 文件名、Cascade 配置字节、材质引用、渲染、参数与 OUTPUT_VER 保持。
- 一个效果交付一个完整 PC/手机 ZIP；序号只进入 ZIP 文件名，不改 UE 资产名。
- 分类依据实际规格 kind 和尾缀参数 type；不将任意缩放倍率猜成大中小，未知尺寸放未分类。
- 同内容仍同 revisionId；每次成功目录导出产生独立 v001/v002 留档。
- 失败不发布不完整资源或版本；旧资源、旧批次确认及他方文件保留。
- 实测只用隔离临时根；配置默认根更新不迁移/覆盖 D 盘旧素材。

### Task 1: 本机分类发布与 ZIP 版本

**Files:** 新 `tool/local_delivery/layout.py`；改 `store.py`、`test_store.py`。
**Interfaces:** `classification(metadata)` 返回 category/size；`arrange_platforms(stage, files, packages)` 返回实际分类文件与包目录；`Store.publish(raw,name,metadata)` 返回含 latestExport 的原资源回执。

- [x] 写失败检查：平台引用可读且字节相同，尾缀中号目录，同内容第二次 ZIP 为 v002、同修订；索引失败不留下 ZIP 或新修订。
  ```python
  first = store.publish(pack(), 'Test', {'classification': {'category': 'tail', 'size': 'medium'}})
  second = store.publish(pack(), 'Test', {'classification': {'category': 'tail', 'size': 'medium'}})
  assert first['revisionId'] == second['revisionId']
  assert second['latestExport']['sequence'] == 2
  assert Path(second['latestExport']['path']).read_bytes() == pack()
  ```
- [x] `python -m unittest discover -s tool/local_delivery -p test_store.py` 先失败。
- [x] 用原 ZIP 文件指纹计算原身份，分类后的 files 指纹与 packages 指向实际 PC/手机子目录；archive 用原始 raw，以独立原子 JSON 记录递增序号，失败回滚。
- [x] 同一检查通过；保留旧索引读取和路径安全检查。用户后续明确本项目可直接推送，提交放在最终步骤。

### Task 2: 真实分类、默认路径与界面

**Files:** `67_delivery.js`、`body.html`、`10_types.js`、CHANGELOG；`test_delivery_metadata.cjs`。
**Interfaces:** `deliveryClassification(recipe,plan,spec)` 读取实际规格/尾缀类型；元数据增加 classification，回执显示 ZIP 版本与实际路径。

- [x] 数值缩放不代替规格；全尾缀组合/单层归尾缀，混合组合归烟花；大小来自有效规格或明确尾缀档位。
  ```js
  assert.equal(deliveryClassification({kind:'single',P:{type:'tailM'}},{spec:null},null).size,'medium');
  assert.equal(deliveryClassification({kind:'single',P:{type:'kiku'}},{spec:null},null).size,'unclassified');
  ```
- [x] 原“选择目录/保存目录”继续可用；缺省根由服务提供，已保存的自定义根优先。导出期间不能改根。
- [x] `node tool/local_delivery/test_delivery_metadata.cjs` 与既有导航/传输/host 检查通过。
- [x] 版本 4.9.68；`python tool/build.py`，配置/ZIP分类不改画面及 OUTPUT_VER。

### Task 3: 接线、文档与交付

**Files:** README、资源协议、原 checklist、仓库地图、对话记录、交接；本机启动配置不入库。

- [x] 30项目录服务 unittest 与6个公共JS检查文件共40组通过，原生配置字节比较。
- [x] 将本机根设为用户指定 D 盘，配置移到稳定用户目录并保留原配置备份；仅重启核实属于本任务的 8034 服务。
- [x] 实页检查保存路径、ZIP版本/历史显示及平台读取；正式8034选中号尾缀真实导出至D盘，自动检查2包通过，字节核对通过，无 UE 写入。用户原 file 入口未新验。
- [x] 更新原 checklist/下一步，不宣称原生导入/实播验收完成。
- [x] 用户明确本项目可直接推送；83c844cd已推main，核对他方并行改动保持，源码认领释放。

结果：analysis/results/WORKSPACE_DELIVERY/导出目录与ZIP留档_4.9.68.md；两项界面状态旧失败与HEAD基线一致，完整标准验收仍独立保留。
