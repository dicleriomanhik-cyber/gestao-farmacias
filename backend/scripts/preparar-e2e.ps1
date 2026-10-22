# =========================================================================
# preparar-e2e.ps1
# Prepara a base farmacia_db_e2e aplicando migracoes, seed e admin de teste.
# Usa exclusivamente as variaveis de backend/.env.test. Nunca carrega .env.
# Falha antes de qualquer escrita se a base nao for exactamente
# farmacia_db_e2e.
# =========================================================================

$ErrorActionPreference = 'Stop'

# --- Constantes ---
$ExpectedDbName = 'farmacia_db_e2e'
$EnvTestPath    = Join-Path (Resolve-Path '.').Path '.env.test'
$BackendDir     = (Resolve-Path '.').Path

# Caminhos absolutos para os scripts JS (evita depender do cwd)
$PrismaCliJs    = Join-Path $BackendDir 'node_modules\prisma\build\index.js'
$TsNodeBinJs    = Join-Path $BackendDir 'node_modules\ts-node\dist\bin.js'

function Write-Step([string]$msg) { Write-Host "[preparar-e2e] $msg" }
function Fail([string]$reason) {
    Write-Error "[preparar-e2e] FALHA: $reason"
    exit 1
}

# --- 1. Confirmar que .env.test existe ---
if (-not (Test-Path $EnvTestPath)) {
    Fail ".env.test nao encontrado em backend/. Crie backend/.env.test antes de correr."
}
Write-Step '.env.test encontrado.'

# --- 2. Ler .env.test e validar ---
$raw = Get-Content $EnvTestPath -Raw
$lines = $raw -split "`r?`n" | Where-Object { $_ -match '^[A-Z_]+=' -and $_ -notmatch '^\s*#' }

$envFromFile = @{}
foreach ($ln in $lines) {
    $idx = $ln.IndexOf('=')
    if ($idx -gt 0) {
        $k = $ln.Substring(0, $idx).Trim()
        $v = $ln.Substring($idx + 1).Trim()
        $envFromFile[$k] = $v
    }
}

if (-not $envFromFile.ContainsKey('DATABASE_URL')) { Fail 'DATABASE_URL ausente em .env.test.' }
$dbUrl = $envFromFile['DATABASE_URL']
try { $u = [System.Uri]$dbUrl } catch { Fail 'DATABASE_URL nao e uma URL valida.' }
if ($u.Scheme -ne 'postgresql' -and $u.Scheme -ne 'postgres') { Fail 'DATABASE_URL nao usa protocolo postgresql/postgres.' }
$parsedDbName = ($u.AbsolutePath.TrimStart('/')).Split('?')[0]
if ($parsedDbName -ne $ExpectedDbName) { Fail ("DATABASE_URL aponta para base '" + $parsedDbName + "'.") }

if (-not $envFromFile.ContainsKey('NODE_ENV') -or $envFromFile['NODE_ENV'] -ne 'test') { Fail 'NODE_ENV deve ser exactamente "test".' }

foreach ($k in @('JWT_ACCESS_SECRET','JWT_REFRESH_SECRET')) {
    if (-not $envFromFile.ContainsKey($k)) { Fail "$k ausente." }
    if ($envFromFile[$k].Length -lt 32) { Fail "$k tem menos de 32 caracteres." }
}
foreach ($k in @('ADMIN_PASSWORD','TEST_ADMIN_PASSWORD')) {
    if (-not $envFromFile.ContainsKey($k)) { Fail "$k ausente." }
    if ($envFromFile[$k].Length -lt 12) { Fail "$k tem menos de 12 caracteres." }
}
if ($envFromFile['ADMIN_PASSWORD'] -ne $envFromFile['TEST_ADMIN_PASSWORD']) { Fail 'TEST_ADMIN_PASSWORD != ADMIN_PASSWORD.' }
if (-not $envFromFile.ContainsKey('TEST_ADMIN_EMAIL')) { Fail 'TEST_ADMIN_EMAIL ausente.' }

Write-Step "Validacao concluida: base alvo = $parsedDbName; NODE_ENV=test; segredos OK."

# --- 3. Preservar e restaurar ambiente ---
$originalEnv = @{}
foreach ($k in $envFromFile.Keys) {
    $existing = [Environment]::GetEnvironmentVariable($k, 'Process')
    if ($null -eq $existing) { $originalEnv[$k] = @{ Exists = $false } }
    else                     { $originalEnv[$k] = @{ Exists = $true; Value = $existing } }
}

function Restore-Env {
    foreach ($k in $originalEnv.Keys) {
        $snap = $originalEnv[$k]
        if ($snap.Exists) {
            [Environment]::SetEnvironmentVariable($k, $snap.Value, 'Process')
        } else {
            Remove-Item "Env:\$k" -ErrorAction SilentlyContinue
        }
    }
}

# --- 4. Executar comando com ambiente isolado ---
function Run-WithEnvTest([string]$label, [string]$jsScript, [string[]]$jsArgs) {
    # Injectar ambiente de teste
    foreach ($k in $envFromFile.Keys) {
        [Environment]::SetEnvironmentVariable($k, $envFromFile[$k], 'Process')
    }
    # Revalidar destino
    $effectiveUrl = [Environment]::GetEnvironmentVariable('DATABASE_URL', 'Process')
    if (-not $effectiveUrl) { Restore-Env; Fail "DATABASE_URL ausente no processo para '$label'." }
    try { $effUri = [System.Uri]$effectiveUrl } catch { Restore-Env; Fail "URL invalida para '$label'." }
    $effDbName = ($effUri.AbsolutePath.TrimStart('/')).Split('?')[0]
    if ($effDbName -ne $ExpectedDbName) { Restore-Env; Fail "Base efectiva '$effDbName' != '$ExpectedDbName' para '$label'." }

    Write-Step "A executar: $label (base efectiva = $effDbName)"

    # Chamar node <script> <args> como processo filho
    $nodeExe = (Get-Command node -ErrorAction SilentlyContinue).Source
    if (-not $nodeExe) { Restore-Env; Fail 'node nao encontrado no PATH.' }

    $allArgs = @($jsScript) + $jsArgs
    & $nodeExe @allArgs
    $code = $LASTEXITCODE

    Restore-Env
    if ($code -ne 0) { Fail "$label terminou com codigo $code." }
}

# --- 5. Sequencia ---
Push-Location $BackendDir
try {
    Run-WithEnvTest 'prisma migrate deploy' $PrismaCliJs @('migrate','deploy')
    Run-WithEnvTest 'prisma seed' $TsNodeBinJs @('prisma/seed.ts')
    $adminEmail = $envFromFile['TEST_ADMIN_EMAIL']
    Run-WithEnvTest 'admin:create' $TsNodeBinJs @('src/cli/create-admin.ts','--email',$adminEmail,'--pharmacy-name','Farmacia E2E')
}
finally {
    Restore-Env
    Pop-Location
}

Write-Step 'Preparacao E2E concluida com sucesso.'
exit 0