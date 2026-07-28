<#
.SYNOPSIS
    Generates a dependency graph for a given file or module.
    Shows: file dependencies, API routes, DB tables, frontend consumers.

.PARAMETER Path
    File path relative to project root to analyze.

.PARAMETER Module
    Module name (auth, wallet, kyc, etc.) to analyze all its files.

.EXAMPLE
    .opencode\workflow\analyze.ps1 -Path "ProductionBackup\backend\app\api\v1\kyc.py"
    .opencode\workflow\analyze.ps1 -Module "kyc"
#>
param(
    [string]$Path = "",
    [string]$Module = ""
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path "."

function Get-ModuleFiles {
    param([string]$Module)
    $moduleMap = @{
        "auth"        = @("api/v1/auth.py", "models/user.py", "core/security.py")
        "wallet"      = @("api/v1/wallet.py", "models/wallet*.py", "services/wallet*.py")
        "kyc"         = @("api/v1/kyc.py", "api/v1/admin.py", "models/kyc.py", "utils/kyc_helper.py")
        "deposit"     = @("api/v1/deposits.py", "api/v1/deposit_network.py", "models/deposit*.py")
        "withdraw"    = @("api/v1/withdrawals.py", "api/v1/withdrawal_method.py")
        "mlm"         = @("services/rank_service.py", "services/mlm*.py")
        "rank"        = @("api/v1/ranks.py", "api/v1/admin_ranks.py", "services/rank_service.py")
        "referral"    = @("services/referral*.py")
        "ecommerce"   = @("api/v1/ecommerce.py", "api/v1/marketplace.py")
        "products"    = @("api/v1/ecommerce.py", "models/product*.py")
        "orders"      = @("api/v1/order_management.py", "api/v1/marketplace.py")
        "admin"       = @("api/v1/admin.py", "api/v1/admin_*.py")
        "notifications"= @("api/v1/admin_notifications.py", "utils/notifications.py")
        "investment"  = @("api/v1/investments.py", "api/v1/admin_investments.py", "services/investment*.py")
        "captcha"     = @("api/v1/captcha.py")
    }
    $baseBackend = "ProductionBackup\backend\app"
    if ($moduleMap.ContainsKey($Module)) {
        return $moduleMap[$Module] | ForEach-Object { Join-Path $baseBackend $_ }
    }
    return Get-ChildItem -Path $baseBackend -Filter "*$Module*" -File -Recurse | Select-Object -ExpandProperty FullName
}

function Analyze-File {
    param([string]$FilePath)
    if (-not (Test-Path $FilePath)) {
        Write-Warning "File not found: $FilePath"
        return
    }
    
    Write-Host "`n============================================" -ForegroundColor Cyan
    Write-Host "  DEPENDENCY ANALYSIS" -ForegroundColor Cyan
    Write-Host "  File: $FilePath" -ForegroundColor White
    Write-Host "============================================`n" -ForegroundColor Cyan

    $content = Get-Content $FilePath -Raw
    $modPath = $FilePath -replace '.*ProductionBackup\\backend\\app\\',''
    $modPath = $modPath -replace '^ProductionBackup\\',''

    # ── Python imports ──
    if ($FilePath -like "*.py") {
        $imports = [regex]::Matches($content, '(?:from|import)\s+(app\.\S+)')
        Write-Host "[imports] Local dependencies:" -ForegroundColor Yellow
        $importModules = @{}
        foreach ($m in $imports) {
            $mod = $m.Groups[1].Value
            $parts = $mod -split '\.'
            if ($parts.Length -ge 2) {
                $moduleName = $parts[1]
                if (-not $importModules.ContainsKey($moduleName)) {
                    $importModules[$moduleName] = @()
                }
                $importModules[$moduleName] += $mod
            }
        }
        foreach ($mod in $importModules.Keys | Sort-Object) {
            Write-Host "  → $mod" -ForegroundColor Gray
            foreach ($ref in $importModules[$mod]) {
                Write-Host "      $ref"
            }
        }
    }

    # ── API routes ──
    if ($FilePath -like "*\api\v1\*.py") {
        $routes = [regex]::Matches($content, '@router\.(get|post|put|patch|delete)\("([^"]+)"')
        Write-Host "`n[routes] API endpoints:" -ForegroundColor Yellow
        foreach ($r in $routes) {
            Write-Host "  $($r.Groups[1].Value.ToUpper()) $($r.Groups[2].Value)" -ForegroundColor Green
        }
    }

    # ── DB models ──
    if ($FilePath -like "*\models\*.py") {
        $tables = [regex]::Matches($content, '__tablename__\s*=\s*"([^"]+)"')
        Write-Host "`n[database] Table:" -ForegroundColor Yellow
        foreach ($t in $tables) {
            Write-Host "  → $($t.Groups[1].Value)" -ForegroundColor Magenta
        }
    }

    # ── Frontend consumers ──
    $feDir = "ProductionBackup\frontend\src"
    if (Test-Path $feDir) {
        $feApiFile = "$modPath" -replace '.*app\\api\\v1\\(.+)\.py','$1'
        $apiCalls = Select-String -Path "$feDir\api\*.js" -Pattern $feApiFile -SimpleMatch -ErrorAction SilentlyContinue
        if ($apiCalls) {
            Write-Host "`n[frontend] API consumers:" -ForegroundColor Yellow
            $apiCalls | ForEach-Object { Write-Host "  → $($_.Filename)" -ForegroundColor Blue }
        }
    }

    # ── Risk assessment ──
    Write-Host "`n[risk] Assessment:" -ForegroundColor Yellow
    $riskLevel = "Low"
    $reasons = @()
    if ($content -match "with_for_update|FOR UPDATE") { $reasons += "Uses row-level locks (FOR UPDATE)"; $riskLevel = "Medium" }
    if ($content -match "alter\s+table|drop\s+table|create\s+table|ALTER TABLE|DROP TABLE") { $reasons += "Contains schema-changing operations"; $riskLevel = "High" }
    if ($content -match "wallet|balance|payment") { $reasons += "Involves financial data" }
    if ($content -match "delete|DELETE") { $reasons += "Contains delete operations" }
    if ($FilePath -like "*\admin\*") { $reasons += "Admin functionality" }
    if ($FilePath -like "*\services\rank*") { $reasons += "MLM/rank system — cascading side effects"; $riskLevel = "High" }
    
    if ($reasons.Count -eq 0) { $reasons += "Isolated change" }
    Write-Host "  Risk Level: $riskLevel" -ForegroundColor $(if($riskLevel -eq "High"){"Red"}elseif($riskLevel -eq "Medium"){"Yellow"}else{"Green"})
    foreach ($r in $reasons) { Write-Host "  • $r" }
}

# ── Main ──
if ($Path) {
    Analyze-File $Path
    exit 0
}

if ($Module) {
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  MODULE ANALYSIS: $Module" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    $files = Get-ModuleFiles $Module
    foreach ($f in $files) {
        if (Test-Path $f) {
            Analyze-File $f
        } else {
            # Try wildcard
            $matches = Get-ChildItem -Path $root -Filter (Split-Path $f -Leaf) -Recurse -ErrorAction SilentlyContinue |
                       Where-Object { $_.FullName -like "*$Module*" }
            foreach ($m in $matches) {
                Analyze-File $m.FullName
            }
        }
    }
    exit 0
}

Write-Host "Usage: analyze.ps1 -Path <file> | -Module <name>" -ForegroundColor Yellow
Write-Host "Modules: auth, wallet, kyc, deposit, withdraw, mlm, rank, referral, ecommerce, products, orders, admin, notifications, investment, captcha" -ForegroundColor Gray
