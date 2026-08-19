param(
    [string]$SshAlias = "arbigrow",
    [string]$RemoteBackupRoot = "/root/backups/postgresql",
    [string]$LocalBackupRoot = "G:\Oxforf\ArbiGrow\database",
    [int]$KeepDaily = 7,
    [int]$KeepWeekly = 4,
    [int]$KeepMonthly = 12,
    [switch]$Prune
)

# Pulls the production PostgreSQL backups from the server into the local
# database\ folder and (optionally) prunes local copies to match the server
# retention policy (daily 7 / weekly 4 / monthly 12).
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\scripts\sync-backups.ps1
#   powershell -ExecutionPolicy Bypass -File .\scripts\sync-backups.ps1 -Prune
#
# Requires: SSH key-based auth to $SshAlias already configured (BatchMode).

$ErrorActionPreference = "Stop"

$tiers = @{ daily = $KeepDaily; weekly = $KeepWeekly; monthly = $KeepMonthly }

foreach ($tier in $tiers.Keys) {
    $remoteDir = "$RemoteBackupRoot/$tier"
    $localDir  = Join-Path $LocalBackupRoot $tier
    New-Item -ItemType Directory -Force -Path $localDir | Out-Null

    Write-Host "=== Pulling $tier from $SshAlias ==="
    & scp -o BatchMode=yes "$($SshAlias):$remoteDir/*" "$localDir"
    if ($LASTEXITCODE -ne 0) { throw "scp failed for $tier" }

    if ($Prune) {
        $files = Get-ChildItem -File -Path $localDir -Filter "arbigrow_*.dump.gz" |
                 Sort-Object Name -Descending
        $remove = $files | Select-Object -Skip $tiers[$tier]
        foreach ($f in $remove) {
            Remove-Item -LiteralPath $f.FullName -Force
            Write-Host "  pruned: $($f.Name)"
        }
        Write-Host "  $tier: kept $($tiers[$tier]) newest of $($files.Count)"
    }
}

Write-Host "Done. Local backups:"
Get-ChildItem -Recurse -File $LocalBackupRoot | Select-Object FullName, Length
