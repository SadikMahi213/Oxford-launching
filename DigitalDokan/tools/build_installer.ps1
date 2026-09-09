# Build the Windows installer: PyInstaller one-dir + Inno Setup exe.
# Run from repo root on Windows with Python + Inno Setup installed.
$ErrorActionPreference = "Stop"
pip install -r requirements.txt
if ($?) { pyinstaller --noconfirm --clean --onedir --windowed --name DigitalDokan --paths . app/main.py }
if ($?) { & "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer/inno_setup.iss }
Write-Host "DONE - see installer output exe"
