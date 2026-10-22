# Claude 接入与联网方式对比

整理日期：2026-10-22。适合已有 Claude 订阅、希望理解不同接入方式的非技术使用者。

ClaudeGate 负责选择启动配置，Magpie 负责模型请求中转与配置管理，Clash 负责网络代理；把 Claude Code 安装在服务器上再远程操作，则是改变程序和项目所在的位置。它们可以组合，但解决的问题不同。

本文用于理解和选型，不代表已经选择、安装或部署其中任何方案。此前讨论的美国甲骨文云服务器是帮助理解的例子。

## 1 先分清四件事

理解一种方案时，先问下面四个问题，比只问“是不是代理”更准确。

| 问题 | 大白话解释 |
| --- | --- |
| 我在哪个界面发任务 | 在 Claude Code 终端、桌面应用，还是其他编程工具里输入要求 |
| 项目和命令在哪里 | 谁读取文件、修改代码、运行测试；本机和云服务器各有自己的硬盘和环境 |
| Claude 账号在哪里登录 | 哪台机器运行已授权的 Claude Code、保存或读取订阅登录凭据 |
| 模型请求从哪里出去 | 本机网络、代理节点，或远程服务器的网络出口 |

**登录位置、工作位置和网络出口可以不同。** 本机运行 Claude Code，同时让它通过代理联网，仍然属于本机登录、本机工作。远程 Magpie 提供模型，也不代表本机项目自动搬到服务器。

“本地运行”指的是编程工具和命令执行在本机，不是把 Claude 模型下载到本机；Claude 模型仍由服务商运行。

### 订阅和 API 是两种入口

- **Claude 订阅**：具备 Claude Code 权益的套餐，例如 Pro / Max，可以通过官方账号登录使用套餐额度；仅注册免费账号不等同于获得这些权益。
- **API**：用 API Key 调用模型，额度和计费遵循 API 服务的规则。购买聊天会员不自动等于获得 API 额度。
- **Magpie 网关密钥**：访问你自己的 Magpie 的凭证，不是购买来的 Anthropic API Key。它背后仍需要有效的订阅登录或模型服务凭证。

官方订阅方式见[使用 Pro 或 Max 套餐运行 Claude Code](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan)。

## 2 一张表看懂这些方式

下表以“本地项目 + Claude 订阅”为比较起点；换用 API 或把项目另行迁移后，位置也会随之改变。

| 方式 | 主要解决什么 | Claude 订阅登录位置 | 项目文件与命令 | 模型请求出口 |
| --- | --- | --- | --- | --- |
| 本机直接用官方 Claude Code | 直接使用官方工具 | 本机 | 本机 | 本机网络；配置代理后可改变 |
| 本机 ClaudeGate | 启动前选择供应商、密钥和模型配置 | 官方模式沿用本机 Claude Code 登录 | 本机 | 取决于所选接口及网络配置；ClaudeGate 不提供网络代理 |
| 本机 Magpie | 统一管理模型、订阅与接口转换 | Claude 订阅接入需要本机可用的 Claude Code 登录 | 客户端在本机工作 | 本机或为上游配置的代理 |
| 远程 Magpie | 让本机工具使用远端模型服务，凭据放远端 | 远端服务器或另一台电脑 | 客户端仍可在本机读写文件、执行命令 | 远端 Magpie 所用的网络或代理 |
| 服务器运行 Claude Code，SSH 远程操作 | 把工作环境放在服务器 | 服务器 | 服务器；本地文件须另行传输或同步 | 服务器所用的网络或代理 |
| 本机 Claude 加 Clash | 控制联网路线、区分内外网 | 仍在本机 | 仍在本机 | 按规则走代理节点或直连 |

以上是各模式的通常结构，不代表所有登录页面、第三方插件、工具子进程和浏览器流量都会自动经过同一个出口。

## 3 ClaudeGate 是启动配置菜单

项目：[Naresh084/claudegate](https://github.com/Naresh084/claudegate)。

假设你有官方 Claude、DeepSeek 和 Kimi 等几套服务配置。原来要自己反复改接口地址、密钥和模型名称；ClaudeGate 把它们保存成菜单选项。

```text
运行 ClaudeGate
    → 选择配置
    → 给本次启动设置环境变量
    → 启动同一台机器上的 Claude Code
    → Claude Code 连接所选模型服务
```

它的核心工作是组装环境变量，然后启动 `claude` 进程。选择 Anthropic Native 时沿用 Claude Code 已有配置；其他供应商一般需要对应 API 或兼容套餐的凭证。它不替你购买订阅或完成账号授权。

它没有提供模型协议转换服务器、远程操作网页、网络出口切换或防封号功能。自定义接口仍须兼容 Claude Code；出现在供应商菜单里不等于所有模型功能都能正常使用。

**只有一个 Claude 订阅、一直用官方服务时，它的实际帮助较小。** 经常切换模型接口时更有用。

源码还有两个需要知道的边界：密钥以明文写入本地配置，文件权限不是加密；菜单中的 Test 只展示并判断配置外观，没有真正请求 API 验证连接。

依据：[启动代码](https://github.com/Naresh084/claudegate/blob/7556c2bb03b4d9ff6225a6d1ff6a29e63b77cd3f/src/services/launcher.service.ts)、[环境变量代码](https://github.com/Naresh084/claudegate/blob/7556c2bb03b4d9ff6225a6d1ff6a29e63b77cd3f/src/services/env-builder.service.ts)、[配置存储](https://github.com/Naresh084/claudegate/blob/7556c2bb03b4d9ff6225a6d1ff6a29e63b77cd3f/src/services/config.service.ts)、[Test 实现](https://github.com/Naresh084/claudegate/blob/7556c2bb03b4d9ff6225a6d1ff6a29e63b77cd3f/src/ui/manage-profiles.ts)。

## 4 Magpie 是模型服务控制台与中转站

项目：[yetone/magpie](https://github.com/yetone/magpie)。

它既能管理编程工具的模型配置，又会运行一个网关。客户端把模型请求交给它，它再连接上游服务，并在需要时转换接口格式。默认本机网关地址是 `127.0.0.1:3425`；这个地址表示自己的电脑，不是远程服务器。

### 本机模式

```text
本机编程工具
    → 本机 Magpie
    → API 服务、订阅接入或本地模型服务
```

Claude 订阅接入的特殊之处是：Magpie 驱动真正的 `claude` 程序，并桥接客户端的工具调用。使用这一入口，运行 Magpie 的机器仍需要安装并登录 Claude Code，或由 Magpie 的管理流程完成相应安装和授权。它不是凭空把订阅变成官方 API 额度。

### 远程模式

```text
本地电脑
  编程工具：读取本地项目、改文件、执行命令
      → 本机 Magpie：连接远程模型服务
          → 远程服务器上的 Magpie
              → 服务器上已登录的 Claude Code
                  → Claude 官方服务
```

根据远程共享与订阅桥接的组合设计，订阅登录可以保留在远端，本地使用远端 Magpie 的地址和网关密钥；不必为了这个模型入口在本地完成官方 Claude 账号登录。具体客户端的首次配置仍需按其版本核验。

这里共享的是**模型服务**，不是整台电脑的桌面。按此结构，本机工具执行本机操作，远端桥接进程负责模型交互；不能把桥接进程误当成已经接管本地项目的远程开发环境。会话内容和必要的文件文本也可能随模型请求发送出去，“项目在本机”不等于“内容不离开本机”。

跨互联网使用时，项目远程文档建议通过 Tailscale 或 WireGuard 等私有连接访问，并明确要求不要把服务端口直接开放到互联网；网关访问还需要相应密钥。

### 界面如何使用

Magpie 的主要界面是管理控制台：

1. 在 Providers 页面添加供应商、订阅或远程 Magpie。
2. 在 Agents 页面为 Claude Code 等已安装工具选择模型。
3. 打开该工具的新会话，照常输入任务。
4. 在 Magpie 查看额度、用量和路由情况。

使用 Claude Code 作为客户端时，主要工作界面仍是 Claude Code。换其他客户端，聊天样式、权限确认、进度展示和文件操作能力随客户端而变，不能保证与原版逐项一致。

### 能否看到思考过程

Magpie 的 Claude 订阅代码会处理并转发 `thinking` 内容及流式增量。是否看得见，需要上游返回可读思考内容、相关配置启用，而且客户端支持展示。

Claude 官方说明可读 thinking 是**思考摘要**，不是完整内部推理；Magpie 无法解锁官方没有返回的内容。读文件、改代码、执行测试的操作进度，也与模型的思考摘要是两件事。

依据：[中文说明](https://github.com/yetone/magpie/blob/ba319a7587923fc7a4ea3859658244d591261a59/README.zh-CN.md)、[远程模式](https://github.com/yetone/magpie/blob/ba319a7587923fc7a4ea3859658244d591261a59/site/public/docs/zh/remote.html)、[Claude 订阅桥接](https://github.com/yetone/magpie/blob/ba319a7587923fc7a4ea3859658244d591261a59/docs/subsystems/claude-subscription-bridge.md)、[订阅代码](https://github.com/yetone/magpie/blob/ba319a7587923fc7a4ea3859658244d591261a59/internal/gateway/claude_subscription.go)、[Claude 思考输出说明](https://platform.claude.com/docs/en/build-with-claude/thinking)。

## 5 服务器运行 Claude Code 是远程使用另一台电脑

这不依赖 ClaudeGate，也不依赖 Magpie。SSH 可以理解成一个用来操作远处电脑的终端窗口。

```text
本地电脑：输入任务、查看输出
    → SSH 远程连接
        → 服务器：Claude Code、订阅登录、项目文件、命令执行
            → Claude 官方服务
```

输入任务的习惯可以与本机 Claude Code 相同，但它改的是服务器上的文件。读取本机桌面文件、运行本机 Windows 程序或操作本机 UE，并不会自动成立。

本地项目需要先传输或通过 Git 同步到服务器，成果也需要取回；“登录保存在远端”和“本机工作体验完全相同”是不同目标。断开远程连接后是否继续运行，还取决于会话保持方式，不是租了服务器就自动具备。

官方另有 [Remote Control](https://code.claude.com/docs/en/remote-control)：用浏览器或手机操作运行中的 Claude Code 会话。任务仍在原来那台运行机器上执行，它也不是 Magpie 的远程模型共享。

## 6 本机 Clash 方案只改变联网路线

本节对应用户粘贴的 `claude-clash-proxy-setup` 说明：macOS、特定 Claude 桌面版、本机 Clash Verge Rev / mihomo、腾讯内网环境。没有提供包的仓库地址或脚本；其最低版本、浏览器拦截根因和故障行为，应视为该方案的适用说明，尚未在当前环境验证。

```text
本地 Claude 桌面版或 Claude Code
    ├─ 内网地址 → 本机直连公司内网
    └─ 其他地址 → 本机 Clash → 所选代理节点 → 目标服务
```

| 名称 | 作用 |
| --- | --- |
| Clash | 按规则把网络连接发往代理节点或直接访问目标 |
| PAC | 告诉桌面应用“这个网址使用哪个代理，或直接访问”的规则表 |
| `127.0.0.1:7880` 中继 | 本机提供 PAC 文件的小服务，不是美国节点，也不承载全部模型请求 |
| `HTTPS_PROXY` | 告诉 Claude Code 使用指定代理 |
| `NO_PROXY` | 为内网等地址指定代理例外 |
| `managed-settings.json` | 系统级托管配置；本方案借它为 Claude Code 设置网络变量 |

Claude Code 官方支持 `HTTP_PROXY`、`HTTPS_PROXY` 和 `NO_PROXY`，并说明桌面应用管理连接的某些会话只读取托管和用户级设置。这支持“分别配置桌面版与 Code 的联网方式”的思路，不等于验证了用户所贴脚本的全部行为。[官方网络配置](https://code.claude.com/docs/en/network-config)

方案声称的特殊处理，是让内网页面由 Claude 桌面版自己直连，而不只是先送到 Clash、再由 Clash 直连；其原因是该方案所述的内置浏览器私网保护。这主要服务于公司内网页面访问，不是每个人都需要的步骤。

**账号仍在本机登录、项目和命令仍在本机。** 若代理规则确实选中美国节点，相应连接通常使用该节点出口 IP；节点也可以在其他地区，脚本本身不提供节点。

### 故障保护的边界

用户提供的故障表同时写了两种情况：

- Clash 停止时，按其配置，外部请求报错，不回退直连。
- Claude 桌面版启动时 PAC 中继未运行，可能直连。

因此不能把“代理挂了不静默直连”扩大成“任何时候都绝不直连”。其他浏览器、工具子进程和网络请求也需分别核验。

这份 macOS 与腾讯内网方案不能原样当成 Windows 通用安装步骤。本文不包含其安装、sudo 操作或回滚命令，避免把未经审查的脚本直接当成当前机器的实施方案。

## 7 如何理解地区和账号风险

**“不是美国就很容易封号”不能作为判断依据。** 新加坡在 Claude 官方支持地区名单中；美国并不是唯一支持地区。官方没有公布按美国与新加坡登录分别统计的封号概率。[官方地区名单](https://support.claude.com/en/articles/8461763-where-can-i-access-claude)

美国云服务器通常使用数据中心出口，不是美国家庭宽带。把模型请求放到美国出口，也不能保证浏览器授权和其他账号活动只来自美国，更不能改变账号与实际使用是否符合官方规则。

ClaudeGate 没有防封号能力；Magpie 能桥接订阅，不等于它获得官方授权或能够降低封号概率；Clash 能选择联网路线，也不能保证账号不受限。官方列出的账号限制原因包含不受支持地区注册、使用政策或服务条款违规等。[官方账号限制说明](https://support.claude.com/en/articles/8241253-safeguards-warnings-and-appeals)

## 8 对照自己的目标选择

| 真实目标 | 优先理解哪种方式 | 需要接受的差别 |
| --- | --- | --- |
| 一个订阅，直接完成本地项目 | 官方 Claude Code | 在本机登录 |
| 经常切换不同 API 服务 | ClaudeGate；需要接口转换或统一管理时再看 Magpie | 凭据、接口兼容性与额度由各服务决定 |
| 不在本机登录 Claude，但继续处理本地项目 | 远程 Magpie 的模型共享 | 需要远端有效登录、可信连接与客户端兼容验证；不能当作防封方案 |
| 不在本机登录，项目也愿意放远端 | 服务器 Claude Code 加 SSH 等远程操作 | 文件和命令在远端，本机项目及工具不会自动接通 |
| 接受本机登录，只希望控制网络出口 | 本机代理配置，例如 Clash | 仍是本机登录与本机工作；出口按实际规则决定 |
| 同时访问公司内网与外部模型服务 | 内外网分流，按实际系统配置代理例外 | 用户所贴方案有 macOS、版本和腾讯内网前提 |
| 想多看思考文字 | 检查上游输出设置与客户端显示支持 | 只能显示上游提供的内容，不能解锁完整隐藏推理 |

对于本次讨论，用户明确的偏好是“已有 Claude 订阅，不想在本机登录 Claude Code”。远程 Magpie 与远程运行 Claude Code 都与这个偏好相关，区别在于项目是否继续留在本机。当前只完成方式梳理，尚未选择或授权部署其中一种。

## 9 核对范围

ClaudeGate 和 Magpie 的说明基于前述项目文档与核心实现阅读，源码链接固定到当时读取的提交，便于追溯；官方套餐、地区与网络规则会更新，实际配置前应重新核对。

本轮交付为说明文档，未安装或实测这些接入组合，未登录账号、迁移凭据、配置代理、部署服务器或验证封号概率。Clash 部分只有用户提供的方案文本，尚缺脚本和运行证据。
