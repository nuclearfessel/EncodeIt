@echo off
REM Portable / manual Windows cleanup. Close EncodeIt first.
setlocal EnableExtensions
set "KEEP_MEDIA=0"
choice /C YN /M "Delete Videos\EncodeIt media folders too (Y=wipe everything, N=keep media)"
if errorlevel 2 set "KEEP_MEDIA=1"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$keepMedia = ($env:KEEP_MEDIA -eq '1');" ^
  "$names = @('EncodeIt','Encode This');" ^
  "$targets = New-Object System.Collections.Generic.List[string];" ^
  "foreach ($n in $names) {" ^
  "  $targets.Add((Join-Path $env:APPDATA $n));" ^
  "  $targets.Add((Join-Path $env:LOCALAPPDATA $n));" ^
  "  if (-not $keepMedia) { $targets.Add((Join-Path $env:USERPROFILE ('Videos\' + $n))) }" ^
  "};" ^
  "foreach ($id in @('encodeit-ae','encode-this-ae')) {" ^
  "  $targets.Add((Join-Path $env:APPDATA ('Adobe\CEP\extensions\' + $id)))" ^
  "};" ^
  "$util = Join-Path $env:APPDATA 'Blackmagic Design\DaVinci Resolve\Support\Fusion\Scripts\Utility';" ^
  "foreach ($f in @('send_to_encodeit.py','send_to_encode_this.py','resolve_deliver_handoff.py','resolve_deliver_handoff_encode_this.py')) {" ^
  "  $targets.Add((Join-Path $util $f))" ^
  "};" ^
  "foreach ($t in $targets) {" ^
  "  if (Test-Path -LiteralPath $t) {" ^
  "    Remove-Item -LiteralPath $t -Recurse -Force -ErrorAction SilentlyContinue;" ^
  "    Write-Host ('Removed ' + $t)" ^
  "  }" ^
  "};" ^
  "Write-Host 'EncodeIt cleanup finished.'"
endlocal
