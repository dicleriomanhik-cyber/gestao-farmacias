<#
.SYNOPSIS
    Backup automático da base de dados PostgreSQL do Sistema de Gestão de Farmácias.

.DESCRIPTION
    Faz pg_dump em formato custom, guarda com timestamp, valida o resultado,
    regista em log (sem segredos) e aplica retenção configurável.

.PARAMETER Force
    Apaga backups antigos sem confirmação (para uso no Task Scheduler).

.PARAMETER BackupDir
    Sobrepõe o BACKUP_DIR do .env.

.PARAMETER RetentionDays
    Sobrepõe o RETENTION_DAYS do .env (padrão: 30).

.EXAMPLE
    .\backup-farmacia.ps1
    .\backup-farmacia.ps1 -Force
    .\backup-farmacia.ps1 -BackupDir "D:\Backups" -RetentionDays 60
#>

param(
    [switch]$Force,
    [string]$BackupDir,
    [int]$RetentionDays
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $repoRoot 'backend\.env'
$logFile = Join-Path $repoRoot 'backup-farmacia.log'

function Write-Log($message) {
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line = "[$ts] $message"
    Write-Host $line
    Add-Content -Path $logFile -Value $line -Encoding UTF8
}

function Fail($message) {
    Write-Log "ERRO: $message"
    exit 1
}

# 1. Validar .env
if (-not (Test-Path $envFile)) {
    Fail "Ficheiro .env nao encontrado em $envFile"
}

$envContent = Get-Content $envFile -Raw
$dbUrlMatch = [regex]::Match($envContent, '^DATABASE_URL=(.+)$', 'Multiline')
if (-not $dbUrlMatch.Success) {
    Fail "DATABASE_URL nao encontrada no .env"
}
$dbUrl = $dbUrlMatch.Groups[1].Value.Trim().Trim('"').Trim("'")

# 2. Parsear DATABASE_URL (sem imprimir a password)
try {
    $uri = [System.Uri]$dbUrl
    $dbHost = $uri.Host
    $dbPort = if ($uri.Port -gt 0) { $uri.Port } else { 5432 }
    $dbName = $uri.AbsolutePath.Trim('/')
    $userInfo = $uri.UserInfo.Split(':')
    $dbUser = $userInfo[0]
    $dbPass = if ($userInfo.Length -gt 1) { $userInfo[1] } else { '' }
} catch {
    Fail "DATABASE_URL invalida"
}

if (-not $dbName -or -not $dbUser) {
    Fail "DATABASE_URL incompleta (falta nome da BD ou utilizador)"
}

# 3. Resolver pasta de destino
if (-not $BackupDir) {
    $envBackupDir = [regex]::Match($envContent, '^BACKUP_DIR=(.+)$', 'Multiline')
    if ($envBackupDir.Success) {
        $BackupDir = $envBackupDir.Groups[1].Value.Trim().Trim('"').Trim("'")
    } else {
        $BackupDir = 'E:\FarmaciaBackups'
    }
}
if (-not (Test-Path $BackupDir)) {
    New-Item -Path $BackupDir -ItemType Directory -Force | Out-Null
    Write-Log "Pasta de backup criada: $BackupDir"
}

# 4. Resolver retenção
if (-not $RetentionDays) {
    $envRetention = [regex]::Match($envContent, '^RETENTION_DAYS=(\d+)$', 'Multiline')
    if ($envRetention.Success) {
        $RetentionDays = [int]$envRetention.Groups[1].Value
    } else {
        $RetentionDays = 30
    }
}

# 5. Gerar nome do ficheiro
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$dumpFile = Join-Path $BackupDir "$($dbName)_$timestamp.dump"

Write-Log "Inicio do backup: $dbName -> $dumpFile"
$startTime = Get-Date

# 6. Executar pg_dump (password via env, nunca na linha de comandos)
$env:PGPASSWORD = $dbPass
try {
    & pg_dump `
        --host=$dbHost `
        --port=$dbPort `
        --username=$dbUser `
        --dbname=$dbName `
        --format=custom `
        --compress=9 `
        --no-owner `
        --no-privileges `
        --file=$dumpFile 2>&1 | ForEach-Object { Write-Log "pg_dump: $_" }

    $exitCode = $LASTEXITCODE
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

$duration = [math]::Round(((Get-Date) - $startTime).TotalSeconds, 2)

# 7. Validar
if ($exitCode -ne 0) {
    Fail "pg_dump falhou com codigo $exitCode (duracao: ${duration}s)"
}

if (-not (Test-Path $dumpFile)) {
    Fail "Ficheiro de backup nao foi criado: $dumpFile"
}

$fileSize = (Get-Item $dumpFile).Length
if ($fileSize -eq 0) {
    Fail "Ficheiro de backup esta vazio: $dumpFile"
}

$sizeMB = [math]::Round($fileSize / 1MB, 2)
Write-Log "Backup concluido: $dumpFile ($sizeMB MB) em ${duration}s"

# 8. Aplicar retenção
$cutoff = (Get-Date).AddDays(-$RetentionDays)
$oldBackups = Get-ChildItem -Path $BackupDir -Filter '*.dump' -File |
    Where-Object { $_.LastWriteTime -lt $cutoff } |
    Sort-Object LastWriteTime

if ($oldBackups.Count -gt 0) {
    Write-Log "Backups antigos (> $RetentionDays dias): $($oldBackups.Count)"
    foreach ($old in $oldBackups) {
        $oldDate = $old.LastWriteTime.ToString('yyyy-MM-dd HH:mm')
        if ($Force) {
            Remove-Item $old.FullName -Force
            Write-Log "  APAGADO: $($old.Name) ($oldDate)"
        } else {
            Write-Host "  Backups a apagar (retenção $RetentionDays dias):"
            Write-Host "    $($old.Name) ($oldDate)"
        }
    }
    if (-not $Force) {
        Write-Host ""
        $answer = Read-Host "Apagar $($oldBackups.Count) backup(s) antigo(s)? (S/N)"
        if ($answer -eq 'S' -or $answer -eq 's') {
            foreach ($old in $oldBackups) {
                Remove-Item $old.FullName -Force
                Write-Log "  APAGADO: $($old.Name)"
            }
        } else {
            Write-Log "  Retencao cancelada pelo utilizador."
        }
    }
} else {
    Write-Log "Sem backups antigos para apagar (retencao: $RetentionDays dias)."
}

Write-Log "Backup terminado com sucesso."
exit 0