# Build script for the scheduler engine (run from any directory)
$root = Split-Path $PSScriptRoot -Parent
$binDir = Join-Path $root "bin"
if (-not (Test-Path $binDir)) { New-Item -ItemType Directory -Path $binDir | Out-Null }
$src = Get-ChildItem (Join-Path $PSScriptRoot "src") -Filter "*.c" | ForEach-Object { $_.FullName }
$out = Join-Path $binDir "scheduler.exe"
gcc -std=c11 -Wall -Wextra -O2 -o $out @src
exit $LASTEXITCODE
