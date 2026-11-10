# build.ps1 — Build the C++14/17 scheduler engine on Windows (MinGW)
# Run from the engine-cpp directory or project root.
param([switch]$Tests)

$root   = $PSScriptRoot
$inc    = Join-Path $root "include"
$binDir = Join-Path (Split-Path $root -Parent) "bin"

if (-not (Test-Path $binDir)) { New-Item -ItemType Directory -Path $binDir | Out-Null }

$mainSrc = @(
    (Join-Path $root "src\main.cpp"),
    (Join-Path $root "src\parser\input_parser.cpp"),
    (Join-Path $root "src\scheduler\simulation.cpp"),
    (Join-Path $root "src\metrics\metrics.cpp"),
    (Join-Path $root "src\trace\trace_writer.cpp")
)

$mainOut = Join-Path $binDir "scheduler_cpp.exe"
Write-Host "Building scheduler_cpp.exe ..."
g++ "-std=c++14" -Wall -Wextra -O2 "-I$inc" -o $mainOut @mainSrc
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed"; exit 1 }
Write-Host "OK: $mainOut"

if ($Tests) {
    $testSrc = @(
        (Join-Path $root "tests\test_main.cpp"),
        (Join-Path $root "src\parser\input_parser.cpp"),
        (Join-Path $root "src\scheduler\simulation.cpp"),
        (Join-Path $root "src\metrics\metrics.cpp"),
        (Join-Path $root "src\trace\trace_writer.cpp")
    )
    $testOut = Join-Path $binDir "scheduler_cpp_tests.exe"
    Write-Host "Building scheduler_cpp_tests.exe ..."
    g++ "-std=c++14" -Wall -Wextra -O2 "-I$inc" -o $testOut @testSrc
    if ($LASTEXITCODE -ne 0) { Write-Error "Test build failed"; exit 1 }
    Write-Host "OK: $testOut"
    Write-Host "Running tests ..."
    & $testOut
    exit $LASTEXITCODE
}
