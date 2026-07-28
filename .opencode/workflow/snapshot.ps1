<#
.SYNOPSIS
    Creates a full snapshot: code tag + DB schema + env + config.
    Every AI modification MUST call this before making changes.

.DESCRIPTION
    Generates a timestamped snapshot containing:
      - Git tag (code checkpoint)
      - Database schema dump (PostgreSQL structure only, no data)
      - Environment files backup
      - Configuration backup
      - Migration state

.PARAMETER Name
    Optional snapshot name (default: auto-generated from timestamp + branch).

.PARAMETER Db
    Set to <true> to include DB schema snapshot. Requires PG connection.

.EXAMPLE
    .opencode\workflow\snapshot.ps1 -Name "before-kyc-fix"
    .opencode\workflow\snapshot.ps1 -Db $true
#>
param(
    [string]$Name = "",
    [switch]$Db = $false
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$branch = git rev-parse --abbrev-ref HEAD
$commit = git rev-parse --short HEAD

if (-not $Name) {
    $Name = "snap-$timestamp-$branch"
}

$snapDir = ".opencode\snapshots\$Name"
New-Item -ItemType Directory -Path $snapDir -Force | Out-Null
Write-Host "[snapshot] Creating snapshot: $Name" -ForegroundColor Cyan
Write-Host "[snapshot]  Branch: $branch" -ForegroundColor Gray
Write-Host "[snapshot]  Commit: $commit" -ForegroundColor Gray

# ── 1. Git tag (code checkpoint) ──
try {
    git tag -f "snapshot/$Name" HEAD
    Write-Host "[snapshot]  ✓ Git tag created: snapshot/$Name" -ForegroundColor Green
} catch {
    Write-Warning "[snapshot]  ⚠ Git tag failed: $_"
}

# ── 2. Commit log ──
git log --oneline -10 HEAD > "$snapDir\commit-log.txt"
git diff --stat HEAD~1..HEAD 2>$null > "$snapDir\diff-stat.txt"

# ── 3. Migration state ──
$alembicDir = "ProductionBackup\backend\alembic"
if (Test-Path "$alembicDir\versions") {
    Get-ChildItem "$alembicDir\versions\*.py" | ForEach-Object { $_.Name } > "$snapDir\migration-list.txt"
    $headFile = "$alembicDir\alembic_head.txt"
    git show HEAD:"$alembicDir/versions" 2>$null | Out-Null
    if (Test-Path "ProductionBackup\backend\alembic.ini") {
        Copy-Item "ProductionBackup\backend\alembic.ini" "$snapDir\alembic.ini.bak"
    }
    Write-Host "[snapshot]  ✓ Migration state saved" -ForegroundColor Green
}

# ── 4. Environment backup ──
Get-ChildItem -Path "." -Filter ".env*" -Recurse -Depth 2 | ForEach-Object {
    $target = Join-Path $snapDir $_.Name
    Copy-Item $_.FullName $target -Force
    Write-Host "[snapshot]  ✓ Env backed up: $($_.Name)" -ForegroundColor Green
}

# ── 5. Config backup ──
$configFiles = @(
    "ProductionBackup\frontend\nginx.conf",
    "ProductionBackup\backend\alembic.ini",
    "docker-compose.yml",
    "Dockerfile*"
)
foreach ($pattern in $configFiles) {
    Get-ChildItem -Path "." -Filter $pattern -Depth 1 | ForEach-Object {
        Copy-Item $_.FullName "$snapDir\$($_.Name).bak" -Force
    }
}

# ── 6. Git status snapshot ──
git status --porcelain > "$snapDir\git-status.txt"

# ── 7. Database schema (optional, requires psql) ──
if ($Db) {
    try {
        $envContent = Get-Content "ProductionBackend\backend\.env" -ErrorAction SilentlyContinue
        $dbUrl = $envContent | Select-String "DATABASE_URL" | ForEach-Object { $_ -replace '.*=','' }
        if (-not $dbUrl) {
            $dbUrl = $env:DATABASE_URL
        }
        if ($dbUrl) {
            $pgDumpCmd = "pg_dump --schema-only --no-owner --no-privileges --file=`"$snapDir\schema.sql`" `"$dbUrl`""
            Invoke-Expression $pgDumpCmd 2>$null
            if (Test-Path "$snapDir\schema.sql") {
                Write-Host "[snapshot]  ✓ DB schema saved" -ForegroundColor Green
            }
        }
    } catch {
        Write-Warning "[snapshot]  ⚠ DB snapshot skipped: $_"
    }
}

# ── 8. Manifest ──
@"
snapshot: $Name
timestamp: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss UTC")
branch: $branch
commit: $commit
git-tag: snapshot/$Name
"@ | Out-File "$snapDir\MANIFEST.txt"

Write-Host "[snapshot]  ✓ Snapshot saved to: $snapDir" -ForegroundColor Green
Write-Host "[snapshot]  ✓ To rollback: git checkout snapshot/$Name" -ForegroundColor Yellow
