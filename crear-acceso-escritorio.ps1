# Lanxa ERP — Crea un acceso directo en el escritorio
# que arranca el sistema (start.bat) con el logo de la empresa.
# Funciona en cualquier PC: usa la carpeta donde esta este script
# como referencia, no una ruta fija.

$ProjectDir = $PSScriptRoot
$DesktopDir = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $DesktopDir "Lanxa ERP.lnk"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = Join-Path $ProjectDir "start.bat"
$Shortcut.WorkingDirectory = $ProjectDir
$Shortcut.IconLocation = Join-Path $ProjectDir "icon.ico"
$Shortcut.Description = "Lanxa ERP - Iniciar sistema"
$Shortcut.Save()

Write-Host ""
Write-Host "Acceso directo creado en el escritorio: $ShortcutPath"
Write-Host "Apunta a: $($Shortcut.TargetPath)"
Write-Host ""
