# GPU Queue Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 每 30 分钟检查 GitHub main 的显卡任务，自动运行未完成任务并上传结果，全程不调用 AI。

**Architecture:** Windows 计划任务在用户已登录时启动普通 Python 程序。程序在 Codex 管理的独立工作树中同步和计算，共享主工程的本机大文件目录；结果通过 Git 上传，原工程不自动切换或改写。

**Tech Stack:** Python 3.12 标准库、已有 Playwright/Chrome GPU 管线、Git、Windows Task Scheduler。

## Global Constraints

- 每半小时检测一次，有新的就跑任务。
- 不调用 AI；不重复运行已有 done.json 的任务；默认不录视频。
- 不 force push；同步冲突保留现场；大贴图和视频留在本机。
- GitHub main 的新任务代表云端已经准备好下发；原理核对和正式库验收仍由用户负责。
- 同一台机器只允许一批 GPU 任务运行；同批最多 3 个进程。
- Python 子进程退出和网络失败必须可见；任务失败不无限重试。

## File Structure

- `analysis/local/job_lock.py`：跨工作树 GPU 互斥锁。
- `analysis/local/watch_jobs.py`：单轮同步、任务筛选、失败指纹、结果恢复上传和状态日志。
- `analysis/local/install_monitor.ps1`：注册每 30 分钟的 Windows 计划任务。
- `analysis/local/run_jobs.py`：修正失败/强制运行的重复循环，支持不生成迭代区，由监控统一生成。
- `analysis/local/test_watch_jobs.py`：任务筛选、互斥、上传和并发 Git 更新测试。
- `analysis/local/使用说明.md`、`交接.md`：运行方式、停止方法和当前启用状态。

### Task 1: Implement isolated, recoverable queue execution

- [x] Add nonblocking OS file locks in the common Git directory so manual runs and the monitor share a GPU lock.
- [x] Prevent a worker from retrying the same failed job in a batch; return nonzero for failed children; release claims even when browser startup fails.
- [x] Validate job IDs with `[A-Za-z0-9][A-Za-z0-9_-]*`, skip completed/draft/withdrawn jobs, and record a hash of task and execution inputs after failures.
- [x] Keep `status.json`, `state.json`, `monitor.log` and batch logs outside tracked project files. Persist job IDs before running so interrupted batches can upload their outputs next time.
- [x] Commit only affected result directories; fetch/rebase; regenerate review data on the latest source; push `HEAD:main`. Abort unexpected conflicts without discarding output.

### Task 2: Verify and enable half-hour checks

- [x] Run `python -m unittest discover -s analysis/local -p test_watch_jobs.py -v` with local temporary Git repositories; test completed tasks, failed tasks, changed inputs, mutual exclusion, recovery and remote concurrent edits without GPU work or GitHub writes.
- [x] Reuse the previously installed GPU dependencies in a durable local directory and link the worker output directory to `F:/FireWorksLab/analysis/local/输出`.
- [x] Register `FireWorksLab GPU Queue` with a 30-minute repetition, interactive user token, hidden `pythonw.exe`, IgnoreNew overlap policy and no execution time limit.
- [x] Run the existing GPU environment check once, then perform the first real queue check; verify scheduler result, latest checked commit, pending count and next run.
- [x] Commit implementation and handoff, synchronize with remote without overwriting other work, and publish the implementation to main before starting unattended execution.

Execution is inline in this chat: the user has already authorized implementation and activation. No separate approval or agent dispatch is needed.

Validation: 10 automated checks passed. RTX 5080 GPU check rendered a frame in 0.1 seconds. Windows task has PT30M repetition, interactive logon, IgnoreNew overlap and unlimited batch runtime; first live queue inspection found 24 completed tasks and no pending work.
