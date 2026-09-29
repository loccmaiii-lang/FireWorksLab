param(
    [Parameter(Mandatory = $true)][string]$WorkerRepo,
    [Parameter(Mandatory = $true)][string]$StateDir,
    [Parameter(Mandatory = $true)][string]$Python,
    [Parameter(Mandatory = $true)][string]$Deps,
    [ValidateSet(1, 2, 3)][int]$Workers = 3
)
$ErrorActionPreference = 'Stop'
$monitorRepoPath = (Resolve-Path -LiteralPath $WorkerRepo).Path
$monitorPythonPath = (Resolve-Path -LiteralPath $Python).Path
$monitorPythonWindowless = Join-Path (Split-Path -Parent $monitorPythonPath) 'pythonw.exe'
if (-not (Test-Path -LiteralPath $monitorPythonWindowless)) { throw 'pythonw.exe is required for hidden checks.' }
$monitorScriptPath = Join-Path $monitorRepoPath 'analysis\local\watch_jobs.py'
if (-not (Test-Path -LiteralPath $monitorScriptPath)) { throw 'Monitor script was not found.' }
foreach ($monitorArgument in @($monitorScriptPath, $monitorRepoPath, $StateDir, $Deps)) {
    if ($monitorArgument.Contains('"')) { throw 'Paths must not contain quotation marks.' }
}
New-Item -ItemType Directory -Path $StateDir -Force | Out-Null
$monitorArguments = '"{0}" --once --repo "{1}" --state-dir "{2}" --deps "{3}" --workers {4}' -f $monitorScriptPath, $monitorRepoPath, $StateDir, $Deps, $Workers
$monitorAction = New-ScheduledTaskAction -Execute $monitorPythonWindowless -Argument $monitorArguments -WorkingDirectory $monitorRepoPath
$monitorTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(30) -RepetitionInterval (New-TimeSpan -Minutes 30)
$monitorUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$monitorPrincipal = New-ScheduledTaskPrincipal -UserId $monitorUser -LogonType Interactive -RunLevel Limited
$monitorSettings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'FireWorksLab GPU Queue' -Action $monitorAction -Trigger $monitorTrigger -Principal $monitorPrincipal -Settings $monitorSettings -Description '每 30 分钟检查 FireWorksLab GitHub GPU 任务，自动烘焙并上传，不调用 AI。' -Force | Out-Null
Start-ScheduledTask -TaskName 'FireWorksLab GPU Queue'
Get-ScheduledTaskInfo -TaskName 'FireWorksLab GPU Queue' | Select-Object LastRunTime,NextRunTime,LastTaskResult
