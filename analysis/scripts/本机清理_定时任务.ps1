# 本机清理定时任务（用户 2026-10-22「3天自动清理一次」）：每 3 天跑一次 analysis/scripts/本机清理.py --apply。
# 删的只有：过程证据到期（14 天，被脚本写死路径的不删）、analysis/local/_tmp 超过 1 天、__pycache__、显卡后台批次日志超过 3 天。
# 输出追加到 analysis/local/本机清理.log。重复运行本脚本会覆盖同名任务（-Force）。
# 用法：powershell -NoProfile -ExecutionPolicy Bypass -File analysis/scripts/本机清理_定时任务.ps1 [-At 09:23] [-Remove]
param([string]$At = '09:23', [switch]$Remove)
$ErrorActionPreference = 'Stop'
$taskName = 'FireWorksLab 本机清理'
if ($Remove) { Unregister-ScheduledTask -TaskName $taskName -Confirm:$false; Write-Output "已删除计划任务：$taskName"; exit 0 }
$repo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$script = Join-Path $repo 'analysis\scripts\本机清理.py'
$log = Join-Path $repo 'analysis\local\本机清理.log'
$py = (Get-Command pythonw.exe -ErrorAction SilentlyContinue).Source
if (-not $py) { $py = (Get-Command python.exe -ErrorAction Stop).Source }
$arguments = '-X utf8 "{0}" --apply --log "{1}"' -f $script, $log
$action = New-ScheduledTaskAction -Execute $py -Argument $arguments -WorkingDirectory $repo
$trigger = New-ScheduledTaskTrigger -Daily -DaysInterval 3 -At $At
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description '每 3 天清一次 FireWorksLab 本机过程文件（analysis/scripts/本机清理.py --apply）' -Force | Out-Null
$info = Get-ScheduledTaskInfo -TaskName $taskName
Write-Output ("已安装计划任务：{0}；程序 {1}；下次运行 {2}" -f $taskName, $py, $info.NextRunTime)
