param(
    [Parameter(Mandatory = $true)][string]$WorkerRepo,
    [Parameter(Mandatory = $true)][string]$StateDir,
    [Parameter(Mandatory = $true)][string]$Python,
    [Parameter(Mandatory = $true)][string]$Deps,
    [ValidateSet(1, 2, 3)][int]$Workers = 3
)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Path $StateDir -Force | Out-Null
$monitorLaunchLog = Join-Path $StateDir 'launcher.log'
try {
    Set-Location -LiteralPath $WorkerRepo
    $env:PYTHONPATH = $Deps
    $env:PYTHONIOENCODING = 'utf-8'
    ('{0} Starting queue check as {1}' -f (Get-Date -Format o), [System.Security.Principal.WindowsIdentity]::GetCurrent().Name) | Out-File -LiteralPath $monitorLaunchLog -Encoding utf8 -Append
    ('Python={0}; Repo={1}; State={2}' -f $Python, $WorkerRepo, $StateDir) | Out-File -LiteralPath $monitorLaunchLog -Encoding utf8 -Append
    $ErrorActionPreference = 'Continue'
    & $Python -u (Join-Path $WorkerRepo 'analysis\local\watch_jobs.py') --once --repo $WorkerRepo --state-dir $StateDir --deps $Deps --workers $Workers 2>&1 | Out-File -LiteralPath $monitorLaunchLog -Encoding utf8 -Append
    $monitorResult = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    ('{0} Exit {1}' -f (Get-Date -Format o), $monitorResult) | Out-File -LiteralPath $monitorLaunchLog -Encoding utf8 -Append
    exit $monitorResult
} catch {
    $_ | Out-File -LiteralPath $monitorLaunchLog -Encoding utf8 -Append
    exit 1
}
