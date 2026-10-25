$ErrorActionPreference = 'Stop'
$logFile = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'start-farmacia.log'
Start-Transcript -Path $logFile -Force | Out-Null

function Write-Title($t) { Write-Host ""; Write-Host "=== $t ===" -ForegroundColor Cyan }
function Write-Ok($m)    { Write-Host "[OK] $m" -ForegroundColor Green }
function Write-Warn($m)  { Write-Host "[AVISO] $m" -ForegroundColor Yellow }
function Write-Err($m)   { Write-Host "[ERRO] $m" -ForegroundColor Red }
function Pause-Exit($code) {
    Write-Host ""
    Write-Host "Pressione ENTER para fechar..." -ForegroundColor Gray
    Read-Host | Out-Null
    Stop-Transcript | Out-Null
    exit $code
}

try {
    # 1. Validar raiz do projecto
    $repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
    Set-Location $repoRoot
    if (-not (Test-Path 'backend\package.json') -or -not (Test-Path 'backend\dist\main.js')) {
        Write-Err "Este script deve estar na raiz do projecto, com backend/ compilado."
        Pause-Exit 1
    }
    Write-Ok "Projecto encontrado: $repoRoot"

    # 2. Node.js
    try {
        $nodeVer = & node --version 2>&1
        if ($LASTEXITCODE -ne 0) { throw "node --version falhou" }
        Write-Ok "Node.js: $nodeVer"
    } catch {
        Write-Err "Node.js não encontrado. Instale Node.js 20+ antes de continuar."
        Pause-Exit 1
    }

    # 3. .env
    if (-not (Test-Path 'backend\.env')) {
        Write-Err "Ficheiro backend\.env não encontrado. Configure o ambiente antes de arrancar."
        Pause-Exit 1
    }
    Write-Ok "Configuração (.env) presente."

    # 4. Build do Back-end
    if (-not (Test-Path 'backend\dist\main.js')) {
        Write-Err "backend\dist\main.js não encontrado. Execute 'cd backend; npm run build'."
        Pause-Exit 1
    }
    Write-Ok "Build do Back-end presente."

    # 5. Build do Front-end (aviso se não existir)
    $frontendDist = (Get-Content 'backend\.env' | Where-Object { $_ -match '^FRONTEND_DIST_PATH=' } | ForEach-Object { ($_ -split '=',2)[1].Trim() })
    if (-not $frontendDist) { $frontendDist = 'frontend/dist' }
    $frontendDistFull = if ([System.IO.Path]::IsPathRooted($frontendDist)) { $frontendDist } else { Join-Path $repoRoot $frontendDist }
    if (Test-Path (Join-Path $frontendDistFull 'index.html')) {
        Write-Ok "Build do Front-end presente em $frontendDistFull"
    } else {
        Write-Warn "Build do Front-end não encontrado em $frontendDistFull. Apenas a API será servida."
        Write-Warn "Para servir a interface, execute 'cd frontend-fe\frontend; npm install; npm run build'."
    }

    # 6. PostgreSQL acessível
    $pg = Test-NetConnection -ComputerName 'localhost' -Port 5432 -WarningAction SilentlyContinue -InformationLevel Quiet
    if (-not $pg) {
        Write-Err "PostgreSQL não está acessível em localhost:5432."
        Write-Err "Inicie o serviço PostgreSQL (serviços do Windows) antes de arrancar a aplicação."
        Pause-Exit 1
    }
    Write-Ok "PostgreSQL acessível em localhost:5432."

    # 7. Porta 3000 livre
    $porta = Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($porta) {
        $pidInfo = $porta.OwningProcess
        Write-Err "A porta 3000 já está em uso (PID $pidInfo)."
        Write-Err "Se já existe uma instância a correr, feche-a primeiro."
        Pause-Exit 1
    }
    Write-Ok "Porta 3000 livre."

    # 8. Mostrar IPs
    $ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.PrefixOrigin -ne 'WellKnown' } |
        Select-Object -ExpandProperty IPAddress
    if ($ips) {
        Write-Host ""
        Write-Host "Endereços acessíveis na rede local:" -ForegroundColor Cyan
        foreach ($ip in $ips) { Write-Host "  http://${ip}:3000/" -ForegroundColor White }
    } else {
        Write-Warn "Sem IP de rede detectado. Apenas localhost estará acessível."
    }

    # 9. Arrancar
    Write-Host ""
    Write-Host "A iniciar o servidor... Pressione Ctrl+C para parar." -ForegroundColor Cyan
    Write-Host ""

    Set-Location (Join-Path $repoRoot 'backend')
    & node dist\main.js
} catch {
    Write-Err "Falha ao arrancar: $($_.Exception.Message)"
    Pause-Exit 1
}

Write-Host ""
Write-Host "Servidor terminado." -ForegroundColor Gray
Pause-Exit 0