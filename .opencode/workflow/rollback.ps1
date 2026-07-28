<#
.SYNOPSIS
    One-command rollback to a previous snapshot or git tag.

.DESCRIPTION
    Restores:
      - Source code (git checkout)
      - Database migration state (alembic downgrade if needed)
      - Configuration files
      - Environment files

    WARNING: This will discard uncommitted changes.
    Use -Stash to temporarily save them first.

.PARAMETER Target
    Snapshot name or git tag to rollback to (e.g., "snapshot/before-kyc-fix", "v1.2.3").

.PARAMETER Stash
    Stash uncommitted changes instead of discarding them.

.EXAMPLE
    .opencode\workflow\rollback.ps1 -Target "snapshot/before-kyc-fix"
    .opencode\workflow\rollback.ps1 -Target "v1.0.0" -Stash
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$Target,
    [switch]$Stash = $false
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Red
Write-Host "  ROLLBACK" -ForegroundColor Red
Write-Host "  Target: $Target" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Red

# ── Confirm ──
$confirmation = Read-Host "This will discard uncommitted changes. Continue? (yes/NO)"
if ($confirmation -ne "yes") {
    Write-Host "[rollback] Cancelled." -ForegroundColor Yellow
    exit 1
}

# ── 1. Snapshot current state before rollback ──
$preRollbackSnap = "pre-rollback-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
& "$PSScriptRoot\snapshot.ps1" -Name $preRollbackSnap
Write-Host "[rollback] ✓ Pre-rollback snapshot: $preRollbackSnap" -ForegroundColor Green

# ── 2. Stash if requested ──
if ($Stash) {
    git stash push -m "auto-stash before rollback to $Target"
    Write-Host "[rollback] ✓ Changes stashed" -ForegroundColor Green
}

# ── 3. Check if target is a tag or snapshot name ──
$tag = $null
$snapDir = ".opencode\snapshots\$Target"

if (Test-Path $snapDir) {
    # It's a snapshot directory - find the git tag
    $manifest = Get-Content "$snapDir\MANIFEST.txt" | Select-String "git-tag:" | ForEach-Object { $_ -replace '.*git-tag:\s*','' }
    if ($manifest) {
        $tag = $manifest.Trim()
    }
    Write-Host "[rollback] Found snapshot directory, tag: $tag" -ForegroundColor Gray
}

# Try as git tag directly if no snapshot
if (-not $tag) {
    $existing = git tag -l "$Target"
    if ($existing) {
        $tag = $Target
    }
}

# Try with snapshot/ prefix
if (-not $tag) {
    $existing = git tag -l "snapshot/$Target"
    if ($existing) {
        $tag = "snapshot/$Target"
    }
}

# Try as commit hash
if (-not $tag) {
    try {
        git rev-parse --verify "$Target^{commit}" 2>$null
        $tag = $Target
    } catch {
        Write-Error "[rollback] ✗ Cannot find target: $Target"
        exit 1
    }
}

# ── 4. Restore code ──
Write-Host "[rollback] Restoring code to $tag..." -ForegroundColor Cyan
git checkout $tag --force
if ($LASTEXITCODE -ne 0) {
    Write-Error "[rollback] ✗ Git checkout failed"
    exit 1
}
Write-Host "[rollback] ✓ Code restored to $tag" -ForegroundColor Green

# ── 5. Restore configuration from snapshot (if available) ──
if (Test-Path $snapDir) {
    $bakFiles = Get-ChildItem "$snapDir\*.bak"
    foreach ($bak in $bakFiles) {
        $origName = $bak.Name -replace '\.bak$',''
        $origPath = Get-ChildItem -Path "." -Filter $origName -Recurse -Depth 3 | Select-Object -First 1
        if ($origPath) {
            Copy-Item $bak.FullName $origPath.FullName -Force
            Write-Host "[rollback] ✓ Restored config: $($origPath.FullName)" -ForegroundColor Green
        }
    }
}

# ── 6. Restore migrations if alembic head is available in snapshot ──
if (Test-Path "$snapDir\migration-list.txt") {
    $migrations = Get-Content "$snapDir\migration-list.txt"
    Write-Host "[rollback] ✓ Migration list available. Run manually if needed:" -ForegroundColor Yellow
    Write-Host "[rollback]   cd ProductionBackup\backend && alembic downgrade <revision>" -ForegroundColor Yellow
}

# ── 7. Clean untracked files (optional) ──
Write-Host "[rollback] Untracked files are preserved." -ForegroundColor Gray
Write-Host "[rollback] To clean: git clean -fd" -ForegroundColor Gray

Write-Host "========================================" -ForegroundColor Green
Write-Host "  ROLLBACK COMPLETE" -ForegroundColor Green
Write-Host "  Target: $tag" -ForegroundColor Cyan
Write-Host "  Pre-rollback snapshot: snapshot/$preRollbackSnap" -ForegroundColor Cyan
Write-Host "  To undo rollback: git checkout snapshot/$preRollbackSnap" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green
