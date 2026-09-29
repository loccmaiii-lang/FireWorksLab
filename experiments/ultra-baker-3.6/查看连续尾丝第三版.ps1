﻿$ErrorActionPreference = 'Stop'
$studyRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$studyPort = 18766
$studyListener = Get-NetTCPConnection -LocalPort $studyPort -State Listen -ErrorAction SilentlyContinue
if (-not $studyListener) {
    $studyPython = (Get-Command python -ErrorAction Stop).Source
    Start-Process -FilePath $studyPython -ArgumentList @('-m','http.server',"$studyPort",'--bind','127.0.0.1','--directory',('"' + $studyRoot + '"')) -WindowStyle Hidden
    Start-Sleep -Milliseconds 800
}
Start-Process "http://127.0.0.1:$studyPort/experiments/ultra-baker-3.6/studies/filaments/"
