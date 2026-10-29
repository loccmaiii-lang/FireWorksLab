# B分组聚焦 · Adobe组件适配 Demo

[比较入口](index.html) · [操作新B](b.html) · [保留的原B](../v4-workflows-20261029/b.html) · [Material统一组件](../v3-unified/components.html) · [Material统一稿Demo](../v3-unified/demo.html)

用户当前仍偏好Material。本轮只把上一轮Adobe Spectrum取向的统一组件接入B，供完整调参流程对比；不替换默认方向，不改正式项目。原B、Material原稿与各自旧存档键完整保留，两版参数不会自动同步。

## 来源与适配范围

新入口通过`base`直接复用原B的`parameters.json`、`focus-panel.js`、`engine-bridge.js`及布局样式，原文件未改，指纹见[build-manifest.json](build-manifest.json)。新生成的`studio.js`相对原件仅替换Demo存档键：

- 新版：`fwl.workflow-demo.20261029.spectrum-b.focus`
- 原B：`fwl.workflow-demo.20261029.focus`

[b-adapter.js](b-adapter.js)将实际控件映射到`u-*`角色，[b-adapter.css](b-adapter.css)处理B布局与统一令牌的衔接，继续使用上一轮[Spectrum取向样式](../v5-spectrum-20261029/README.md)。默认紧凑32px，可切常规40px；两档均保留数值14px、标签13px，保持项目蓝灰/青绿、近直角及细边框。

只在有实际用途的位置接入组件，不为凑齐八类增加单选或开关。任务页签继续使用B的`role=tab`和键盘逻辑；树、分隔拖条等领域控件保留各自职责。

B继续拥有参数值、条件灰化、错误、事务、撤销、保存与预览。精确数值仍用原有文本型数值控件，不改成原生number后按滑杆范围夹值；滑杆提供常用区间，合法手输值不被静默截断。未新增数字Esc恢复，也不把它说成此次已接通的能力。

## 真实内容与能力边界

浏览器已核对40项真实代表参数：29数值、9下拉、2颜色。三个真实层上下文保留，金锦层可编辑，橙引线层与点灭星供只读核对；当前编辑层与当前观察层分别控制。

预览继续调用隔离的原渲染核，范围为当前观察单层，内部540×540；浏览器已确认星数200→260进入原核。它不是整朵实时合成或烘焙像素证明，整朵参考仍明确标为静态。

仅Demo专属保存、草稿JSON与核对流程可操作；真实烘焙、素材包输出、生产配方保存及UE写入未接通。具体检查、修正与未验范围以[design-qa.md](design-qa.md)及[verification.json](verification.json)为准，不把原核出帧、AI自检或官方设计资料等同于用户验收。

生成方式见[build-prototype.py](build-prototype.py)。本轮停在可操作Demo评审，未将新组件应用到正式项目。
