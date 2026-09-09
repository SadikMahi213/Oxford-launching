; DigitalDokan Inno Setup script (Windows installer)
#define MyAppName "DigitalDokan"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "DigitalDokan"
#define MyAppExeName "DigitalDokan.exe"

[Setup]
AppId={{7A1B2C3D-4E5F-6071-8394-DIGITALDOKAN10}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
OutputBaseFilename=DigitalDokan-Setup-{#MyAppVersion}
Compression=lzma
SolidCompression=yes
PrivilegesRequired=lowest
UninstallDisplayName={#MyAppName} {#MyAppVersion}
VersionInfoVersion={#MyAppVersion}

[Files]
Source: "dist\DigitalDokan\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion

[Icons]
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppName}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; User data (DB, backups, logs) under %APPDATA% is intentionally preserved.
Type: files; Name: "{app}\*.log"
