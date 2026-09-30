param(
    [Parameter(Mandatory = $true)][string]$WorkerRepo,
    [Parameter(Mandatory = $true)][string]$StateDir,
    [Parameter(Mandatory = $true)][string]$Python,
    [Parameter(Mandatory = $true)][string]$Deps,
    [string]$UserRepo,
    [ValidateSet(1, 2, 3)][int]$Workers = 3
)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Path $StateDir -Force | Out-Null
$monitorLaunchLog = Join-Path $StateDir 'launcher.log'
function Sync-UserRepo([string]$stage) {
    if (-not $UserRepo) { return }
    # Failure to update the user's checkout must never prevent queued GPU work.
    $ErrorActionPreference = 'Continue'
    try {
        $userRepoPath = (Resolve-Path -LiteralPath $UserRepo -ErrorAction Stop).Path
        $branch = & git -C $userRepoPath branch --show-current 2>&1
        if ($LASTEXITCODE -ne 0 -or $branch -ne 'main') { throw 'User checkout is not on main.' }
        $userOrigin = & git -C $userRepoPath remote get-url origin 2>&1
        $workerOrigin = & git -C $WorkerRepo remote get-url origin 2>&1
        if ($LASTEXITCODE -ne 0 -or $userOrigin -ne $workerOrigin) { throw 'User and worker checkouts have different origins.' }
        $trackedChanges = & git -C $userRepoPath status --porcelain --untracked-files=no 2>&1
        if ($LASTEXITCODE -ne 0) { throw 'Could not inspect user checkout.' }
        if ($trackedChanges) {
            ('{0} User checkout sync skipped ({1}): tracked files have local edits.' -f (Get-Date -Format o), $stage) | Out-File -LiteralPath $monitorLaunchLog -Encoding utf8 -Append
            return
        }
        $pullOutput = & git -C $userRepoPath pull --ff-only origin main 2>&1
        $pullResult = $LASTEXITCODE
        ('{0} User checkout sync ({1}): exit {2}; {3}' -f (Get-Date -Format o), $stage, $pullResult, (($pullOutput | Out-String).Trim())) | Out-File -LiteralPath $monitorLaunchLog -Encoding utf8 -Append
    } catch {
        ('{0} User checkout sync skipped ({1}): {2}' -f (Get-Date -Format o), $stage, $_) | Out-File -LiteralPath $monitorLaunchLog -Encoding utf8 -Append
    }
}
$monitorResult = 1
try {
    Set-Location -LiteralPath $WorkerRepo
    $env:PYTHONPATH = (Join-Path $WorkerRepo 'analysis\local') + ';' + $Deps
    $env:PYTHONIOENCODING = 'utf-8'
    ('{0} Starting queue check as {1}' -f (Get-Date -Format o), [System.Security.Principal.WindowsIdentity]::GetCurrent().Name) | Out-File -LiteralPath $monitorLaunchLog -Encoding utf8 -Append
    ('Python={0}; Repo={1}; State={2}' -f $Python, $WorkerRepo, $StateDir) | Out-File -LiteralPath $monitorLaunchLog -Encoding utf8 -Append
    Sync-UserRepo 'before'
    $ErrorActionPreference = 'Continue'
    & $Python -u -c 'import sys,watch_jobs; sys.exit(watch_jobs.main())' --once --repo $WorkerRepo --state-dir $StateDir --deps $Deps --workers $Workers 2>&1 | Out-File -LiteralPath $monitorLaunchLog -Encoding utf8 -Append
    $monitorResult = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    ('{0} Exit {1}' -f (Get-Date -Format o), $monitorResult) | Out-File -LiteralPath $monitorLaunchLog -Encoding utf8 -Append
} catch {
    $_ | Out-File -LiteralPath $monitorLaunchLog -Encoding utf8 -Append
} finally {
    Sync-UserRepo 'after'
}
exit $monitorResult
