param(
    [Parameter(Mandatory = $true)][string]$WorkerRepo,
    [Parameter(Mandatory = $true)][string]$StateDir,
    [Parameter(Mandatory = $true)][string]$Python,
    [Parameter(Mandatory = $true)][string]$Deps,
    [string]$UserRepo,
    [ValidateSet(1, 2, 3)][int]$Workers = 3
)
$ErrorActionPreference = 'Stop'
$monitorRepoPath = (Resolve-Path -LiteralPath $WorkerRepo).Path
$monitorUserRepoPath = if ($UserRepo) { (Resolve-Path -LiteralPath $UserRepo).Path } else { $null }
$monitorPythonPath = (Resolve-Path -LiteralPath $Python).Path
$monitorScriptPath = Join-Path $(if ($monitorUserRepoPath) { $monitorUserRepoPath } else { $monitorRepoPath }) 'analysis\local\run_monitor.ps1'
if (-not (Test-Path -LiteralPath $monitorScriptPath)) { throw 'Monitor script was not found.' }
foreach ($monitorArgument in @($monitorScriptPath, $monitorRepoPath, $StateDir, $Deps, $monitorPythonPath, $monitorUserRepoPath)) {
    if ($null -eq $monitorArgument) { continue }
    if ($monitorArgument.Contains('"')) { throw 'Paths must not contain quotation marks.' }
}
New-Item -ItemType Directory -Path $StateDir -Force | Out-Null
$monitorArguments = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}" -WorkerRepo "{1}" -StateDir "{2}" -Deps "{3}" -Workers {4} -Python "{5}"' -f $monitorScriptPath, $monitorRepoPath, $StateDir, $Deps, $Workers, $monitorPythonPath
if ($monitorUserRepoPath) { $monitorArguments += ' -UserRepo "{0}"' -f $monitorUserRepoPath }
$monitorPowerShell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$monitorAction = New-ScheduledTaskAction -Execute $monitorPowerShell -Argument $monitorArguments -WorkingDirectory $monitorRepoPath
$monitorTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(30) -RepetitionInterval (New-TimeSpan -Minutes 30)
$monitorUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$monitorPrincipal = New-ScheduledTaskPrincipal -UserId $monitorUser -LogonType Interactive -RunLevel Limited
$monitorSettings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'FireWorksLab GPU Queue' -Action $monitorAction -Trigger $monitorTrigger -Principal $monitorPrincipal -Settings $monitorSettings -Description '每 30 分钟检查 FireWorksLab GitHub GPU 任务，自动烘焙并上传，不调用 AI。' -Force | Out-Null
Start-ScheduledTask -TaskName 'FireWorksLab GPU Queue'
Get-ScheduledTaskInfo -TaskName 'FireWorksLab GPU Queue' | Select-Object LastRunTime,NextRunTime,LastTaskResult
