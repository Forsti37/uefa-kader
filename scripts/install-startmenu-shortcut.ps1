# Installiert "FCS Kaderplaner" im Windows-Startmenue.
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$launcher = Join-Path $PSScriptRoot 'start-fcs-kaderplaner.cmd'
$startMenu = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
$shortcutPath = Join-Path $startMenu 'FCS Kaderplaner.lnk'

if (-not (Test-Path $launcher)) {
  throw "Launcher nicht gefunden: $launcher"
}

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $launcher
$shortcut.WorkingDirectory = $projectRoot
$shortcut.WindowStyle = 1
$shortcut.Description = 'FC Salzburg UEFA-Kaderplaner (Port 1933)'
$shortcut.Save()

Write-Host "Shortcut erstellt: $shortcutPath"
Write-Host "Im Startmenue nach 'FCS Kaderplaner' suchen."
