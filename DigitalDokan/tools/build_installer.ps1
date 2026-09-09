# Build the Windows installer: tests gate → PyInstaller (app + server) → Inno Setup.
# Run from repo root on Windows with Python + Inno Setup installed.
$ErrorActionPreference = "Stop"

Write-Host "=== 1/4 dependency install ==="
pip install -r requirements.txt

Write-Host "=== 2/4 test gate (must be green to ship) ==="
python -m unittest discover -s tests
if (-not $?) { Write-Error "Tests failed - build refused"; exit 1 }

Write-Host "=== 3/4 PyInstaller bundles ==="
$ver = python -c "from app.version import __version__; print(__version__)"
Write-Host "Building version $ver"
pyinstaller --noconfirm --clean --onedir --windowed --name DigitalDokan --paths . app/main.py
if (-not $?) { exit 1 }
pyinstaller --noconfirm --clean --onedir --console --name DigitalDokan-Server --paths . app/server/server.py
if (-not $?) { exit 1 }

Write-Host "=== 4/4 Inno Setup ==="
$iscc = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if (-not (Test-Path -LiteralPath $iscc)) { Write-Error "Inno Setup not found at $iscc"; exit 1 }
& $iscc installer/inno_setup.iss
Write-Host "DONE - see installer output exe (update CHANGELOG + docs/RELEASE_2_FINAL_AUDIT.md)"
