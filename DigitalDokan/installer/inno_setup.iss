; DigitalDokan Inno Setup script (Windows installer) — Release 2.
; Data layout: program files are immutable; ALL mutable business data lives
; outside {app} (%APPDATA%\DigitalDokan per-user, or %PROGRAMDATA%\DigitalDokan
; machine layout when DIGITALDOKAN_MACHINE=1). Uninstall never deletes data.
#define MyAppName "DigitalDokan"
#define MyAppVersion "2.0.0"
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
; Upgrade installs overwrite program files only; data dirs below are preserved.
UsePreviousAppDir=yes

[Dirs]
; Machine-layout data dirs (used when DIGITALDOKAN_MACHINE=1); harmless otherwise.
Name: "{commonappdata}\{#MyAppName}\data"; Permissions: users-modify
Name: "{commonappdata}\{#MyAppName}\data\backups"; Permissions: users-modify
Name: "{commonappdata}\{#MyAppName}\data\logs"; Permissions: users-modify
Name: "{commonappdata}\{#MyAppName}\data\licenses"; Permissions: users-modify

[Files]
Source: "dist\DigitalDokan\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion

[Icons]
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autoprograms}\{#MyAppName} Store Server"; Filename: "{app}\DigitalDokan-Server.exe"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppName}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Program-side logs only. Business data under %APPDATA% / %PROGRAMDATA% is preserved.
Type: files; Name: "{app}\*.log"
