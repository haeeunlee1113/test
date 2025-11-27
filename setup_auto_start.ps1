# Windows 작업 스케줄러에 백엔드 서버 자동 시작 작업 등록
# 관리자 권한으로 실행해야 합니다

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $scriptPath "test-cursor-build-code-from-scratch-93e2\backend"
$pythonPath = (Get-Command python).Source
$batFilePath = Join-Path $backendPath "start_server.bat"

$action = New-ScheduledTaskAction -Execute $pythonPath -Argument "run.py" -WorkingDirectory $backendPath
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

$taskName = "FlaskBackendServer"
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "백엔드 Flask 서버 자동 시작"

Write-Host "작업 스케줄러에 등록되었습니다!"
Write-Host "작업 이름: $taskName"
Write-Host "다음 부팅 시 자동으로 시작됩니다."


