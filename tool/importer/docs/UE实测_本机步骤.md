# UE 实测：由我分析，你采集画面

这份说明按本机工作台的实际命名规划写。四个 PC 包已经用当前导入器离线检查：格式和模块通过、包间目标没有重名；尚未查询UE是否已有同名目标。这不是实际导入或播放通过。

## 谁负责什么

我负责包格式、模块数值、保存与读回检查、回归，以及视频逐帧分析、截图对照和写实测结论。你在自己的 UE 视窗录屏/截图，并决定最后的效果是否满意；不需要替我判断曲线或找代码错误。目前不能自动操作、观看你的 UE 原生窗口，不能拿网页动画代替这些实测。

原来的八项中：红点闪烁已有用户确认；引菊抖动等换固定机位后的新包再复看；Size By Life / Pivot 有 RT6 间接证据和模块读回，不等于完整播放验收。本次优先补帧号、Ramp、PC 串扰、曝光四项；手机 ETC2 / ASTC 留到真机条件具备后。

## 先导入四个 PC 测试包

打开原工作台 → 烟花素材导入 → 新建批次 → 批量编辑，将旁边的 [四包批量清单](UE实测_四包批量清单.txt) 四行粘贴进去。第一次用「新建资源」，贴图/材质编号 01，粒子不带编号。点击检查 → 预览完整名称 → 确认 → 导入。也可逐项「添加素材」；目录必须选下面的具体文件夹，不选总目录。

| 包目录 | 基础名 | 本机生成的粒子系统名称 |
| --- | --- | --- |
| F:/FireWorksLab/spec/UE实测包/1_帧号 | FWLTest_Frames | P_EFX_FireWorks_FWLTest_Frames_HD |
| F:/FireWorksLab/spec/UE实测包/4_Ramp | FWLTest_Ramp | P_EFX_FireWorks_FWLTest_Ramp_HD |
| F:/FireWorksLab/spec/UE实测包/2_串扰 | FWLTest_Crosstalk | P_EFX_FireWorks_FWLTest_Crosstalk_HD |
| F:/FireWorksLab/spec/UE实测包/3_曝光 | FWLTest_Exposure | P_EFX_FireWorks_FWLTest_Exposure_HD |

名称以这次工作台的完整预览为准。公共说明里的 FWLTest_Frames 等是包名，不是本机完整资产名；不要在内容浏览器只按精确包名找。先前「备份与迁出」失败的正式资源任务尚未恢复，不拿那些半成品做这轮测试，也不用改02绕过。

## 四份画面

1. **帧号**：打开 Frames 粒子的 Cascade，拉近，让横排三块数字都清楚。按 Win+Alt+R 录约 10 秒，再按一次停止。原测试按30fps设计；记录 UE 实际播放帧率和录屏帧率，不把录屏30fps当作UE也运行30fps。把视频和帧率条件发在本对话，我对预期帧号CSV分析是否跳帧、回跳或曲线被抹平。
2. **Ramp**：只将右边 Clamp 材质使用的那张 Ramp 改成 X/Y Tiling = Clamp、Mip Gen = NoMipmaps。按本机命名，它是 `T_EFX_FireWorks_FWLTest_Ramp_RampC_01Ramp`；左边 `..._RampD_01Ramp` 保持项目导入默认。截左右圆点同一张图，另记左边本来是否已经Clamp。不要按公共说明的源PNG名去找本机导入后名称。
3. **PC 串扰**：打开 Crosstalk，截清楚横条、竖条、斜条、圆圈四块图；一张放不下就分两张。确认是在PC的BC7条件，不能据此替手机ETC2/ASTC判通过。
4. **曝光**：将 Exposure 拖进你常用的烟花关卡，用实际游戏后期播放，截完整10格灰阶卡。注明自动曝光开/关；若能关，用关闭自动曝光的图作对照，其他条件另记。我与预期显示值比较，不依据Cascade默认背景直接定游戏曝光倍率。

发来这四份画面即可，无需你先解释对错。导入若报错，发操作记录末尾几行；先解决导入问题，不给失败任务记成播放通过。规则状态分开写：执行结束、AI自检通过、用户验收通过。

本机检查依据：`../research/show-link-20261006/ue-pack-import-preflight.json`。公共原步骤在 F:/FireWorksLab/spec/UE实测包/怎么测_一步一步.md。
