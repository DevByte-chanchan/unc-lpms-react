<#
.SYNOPSIS
    Sets up Windows Task Scheduler to auto-start LPMS development servers at login.
.DESCRIPTION
    Creates a scheduled task that runs the start-dev-servers.bat script
    when the user signs in, with a 30-second delay.
.NOTES
    Run this script as Administrator: Right-click > Run with PowerShell (Admin)
#>

$ErrorActionPreference = "Stop"

$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) {
    Write-Host "Note: Register-ScheduledTask usually requires Administrator privileges." -ForegroundColor Yellow
    Write-Host "If the next step fails with 'Access is denied', close this window and re-run as Administrator." -ForegroundColor Yellow
    Write-Host ""
}

$TaskName = "UNC LPMS Development Servers"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BatchPath = Join-Path $ScriptDir "start-dev-servers.bat"
$LogDir = Join-Path (Split-Path -Parent $ScriptDir) "logs"

if (-not (Test-Path $BatchPath)) {
    Write-Error "Batch script not found at: $BatchPath"
    exit 1
}

if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

$SetupLog = Join-Path $LogDir "setup.log"
$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

try {
    $ExistingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($ExistingTask) {
        Write-Host "Task '$TaskName' already exists. Removing..." -ForegroundColor Yellow
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        "[$Timestamp] Removed existing task" | Out-File -FilePath $SetupLog -Append
    }

    $Action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$BatchPath`""

    $Trigger = New-ScheduledTaskTrigger -AtLogOn
    $Trigger.Delay = "PT30S"

    $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)

    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Starts UNC LPMS React development servers (port 5000 + 5173) automatically at login." | Out-Null

    $Msg = "[$Timestamp] Task '$TaskName' created successfully"
    $Msg | Out-File -FilePath $SetupLog -Append
    Write-Host $Msg -ForegroundColor Green
    Write-Host ""
    Write-Host "Task Details:" -ForegroundColor Cyan
    Write-Host "  Name:     $TaskName"
    Write-Host "  Trigger:  At login (30s delay)"
    Write-Host "  Script:   $BatchPath"
    Write-Host "  Logs:     $LogDir"
    Write-Host ""
    Write-Host "To test: Restart your PC or run the task manually from Task Scheduler." -ForegroundColor Yellow
    Write-Host "To remove: Unregister-ScheduledTask -TaskName '$TaskName'" -ForegroundColor DarkGray
}
catch {
    $ErrMsg = "[$Timestamp] ERROR: $($_.Exception.Message)"
    $ErrMsg | Out-File -FilePath $SetupLog -Append
    Write-Error $ErrMsg
    exit 1
}
