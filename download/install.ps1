<#
.SYNOPSIS
    LinkHub One-Click Installation Script
.DESCRIPTION
    Automated installation and setup script for LinkHub - Self-hosted link management platform.
    Handles prerequisites, Docker, database setup, and application startup.
.PARAMETER Environment
    Target environment: dev, staging, or prod (default: dev)
.PARAMETER Rebuild
    Force rebuild Docker images
.PARAMETER SkipDocker
    Skip Docker and run directly with Node.js
.PARAMETER Port
    Application port (default: 3000)
.PARAMETER DatabaseProvider
    Database provider: sqlite, postgresql, or mysql (default: sqlite)
.PARAMETER DatabaseUrl
    Custom database URL (overrides default)
.PARAMETER SkipSeed
    Skip database seeding
.PARAMETER LogLevel
    Log level: DEBUG, INFO, WARN, ERROR (default: INFO)
.EXAMPLE
    .\install.ps1 -Environment prod -Port 8080
.EXAMPLE
    .\install.ps1 -Rebuild -DatabaseProvider postgresql
.EXAMPLE
    .\install.ps1 -SkipDocker -Environment dev
.NOTES
    Author: LinkHub Team
    Version: 1.0.0
#>

[CmdletBinding()]
param(
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment = "dev",
    
    [switch]$Rebuild,
    [switch]$SkipDocker,
    [switch]$SkipSeed,
    
    [ValidateRange(1, 65535)]
    [int]$Port = 3000,
    
    [ValidateSet("sqlite", "postgresql", "mysql")]
    [string]$DatabaseProvider = "sqlite",
    
    [string]$DatabaseUrl = "",
    
    [ValidateSet("DEBUG", "INFO", "WARN", "ERROR")]
    [string]$LogLevel = "INFO"
)

# ============================================================================
# CONFIGURATION
# ============================================================================

$SCRIPT_VERSION = "1.0.0"
$APP_NAME = "LinkHub"
$APP_REPO = "https://github.com/Shootre21/Linkhub.git"
$APP_DIR = Join-Path $PSScriptRoot "linkhub"

$REQUIRED_NODE_VERSION = "18.0.0"
$REQUIRED_DOCKER_VERSION = "20.0.0"

$LOG_DIR = Join-Path $PSScriptRoot "logs"
$LOG_FILE = Join-Path $LOG_DIR "install-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

$DOCKER_COMPOSE_FILE = Join-Path $APP_DIR "docker-compose.yml"

# ============================================================================
# LOGGING SYSTEM
# ============================================================================

enum LogLevel {
    DEBUG = 0
    INFO = 1
    WARN = 2
    ERROR = 3
}

function Write-Log {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message,
        
        [ValidateSet("DEBUG", "INFO", "WARN", "ERROR")]
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
    $levelValue = [LogLevel]::$Level
    $minLevel = [LogLevel]::$LogLevel
    
    if ($levelValue -lt $minLevel) { return }
    
    # Color mapping
    $colors = @{
        "DEBUG" = "DarkGray"
        "INFO" = "Cyan"
        "WARN" = "Yellow"
        "ERROR" = "Red"
    }
    
    $prefix = switch ($Level) {
        "DEBUG" { "🔍" }
        "INFO" { "ℹ️" }
        "WARN" { "⚠️" }
        "ERROR" { "❌" }
        default { "•" }
    }
    
    $logMessage = "[$timestamp] [$Level] $Message"
    $consoleMessage = "$prefix $Message"
    
    # Console output with color
    Write-Host $consoleMessage -ForegroundColor $colors[$Level]
    
    # File output
    if (-not (Test-Path $LOG_DIR)) {
        New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null
    }
    Add-Content -Path $LOG_FILE -Value $logMessage
}

function Write-Step {
    param(
        [string]$StepName,
        [scriptblock]$Action
    )
    
    $startTime = Get-Date
    Write-Log "Starting: $StepName" "INFO"
    
    try {
        & $Action
        $duration = ((Get-Date) - $startTime).TotalSeconds
        Write-Log "Completed: $StepName (${duration:N2}s)" "INFO"
        return $true
    }
    catch {
        $duration = ((Get-Date) - $startTime).TotalSeconds
        Write-Log "Failed: $StepName (${duration:N2}s) - $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Write-Spinner {
    param(
        [string]$Message,
        [int]$DurationMs = 100
    )
    
    $spinner = @("⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏")
    $startTime = Get-Date
    
    while (((Get-Date) - $startTime).TotalMilliseconds -lt $DurationMs) {
        foreach ($frame in $spinner) {
            Write-Host "`r$frame $Message" -NoNewline
            Start-Sleep -Milliseconds 50
        }
    }
    Write-Host "`r✓ $Message" -ForegroundColor Green
}

# ============================================================================
# PROGRESS UI
# ============================================================================

$script:CurrentStep = 0
$script:TotalSteps = 7

function Show-Progress {
    param(
        [string]$StepName,
        [string]$Status = "In Progress"
    )
    
    $script:CurrentStep++
    $percent = [math]::Round(($script:CurrentStep / $script:TotalSteps) * 100)
    $bar = "█" * [math]::Floor($percent / 5) + "░" * (20 - [math]::Floor($percent / 5))
    
    Write-Host ""
    Write-Host "  ┌────────────────────────────────────────────┐" -ForegroundColor DarkGray
    Write-Host "  │ $APP_NAME Installer v$SCRIPT_VERSION                 │" -ForegroundColor DarkGray
    Write-Host "  ├────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │ [$bar] ${percent}%   │" -ForegroundColor Cyan
    Write-Host "  │ Step $script:CurrentStep/$script:TotalSteps : $StepName".PadRight(43) "│" -ForegroundColor DarkGray
    Write-Host "  │ Status: $Status".PadRight(44) "│" -ForegroundColor Yellow
    Write-Host "  └────────────────────────────────────────────┘" -ForegroundColor DarkGray
    Write-Host ""
}

function Show-Summary {
    param(
        [hashtable]$Config
    )
    
    Write-Host ""
    Write-Host "  ╔════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "  ║        Installation Complete!              ║" -ForegroundColor Green
    Write-Host "  ╠════════════════════════════════════════════╣" -ForegroundColor Green
    Write-Host "  ║                                            ║" -ForegroundColor Green
    
    foreach ($key in $Config.Keys) {
        $value = if ($key -match "password|secret|key|token") { "********" } else { $Config[$key] }
        $line = "  ║ $($key): $value".PadRight(44) + "║"
        Write-Host $line -ForegroundColor Green
    }
    
    Write-Host "  ║                                            ║" -ForegroundColor Green
    Write-Host "  ║ Access URL: http://localhost:$Port".PadRight(44) "║" -ForegroundColor Green
    Write-Host "  ║ Admin: admin@linkhub.local / admin123".PadRight(44) "║" -ForegroundColor Green
    Write-Host "  ╚════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
}

# ============================================================================
# PREREQUISITE CHECKS
# ============================================================================

function Test-Command {
    param([string]$Command)
    
    $result = Get-Command $Command -ErrorAction SilentlyContinue
    return $null -ne $result
}

function Get-CommandVersion {
    param([string]$Command, [string]$VersionArg = "--version")
    
    try {
        $output = & $Command $VersionArg 2>&1 | Out-String
        return ($output -split "`n")[0].Trim()
    }
    catch {
        return "Unknown"
    }
}

function Compare-Versions {
    param([string]$Version1, [string]$Version2)
    
    $v1 = $Version1 -replace '[^0-9.]', '' -split '\.'
    $v2 = $Version2 -replace '[^0-9.]', '' -split '\.'
    
    for ($i = 0; $i -lt [math]::Max($v1.Count, $v2.Count); $i++) {
        $n1 = if ($i -lt $v1.Count) { [int]$v1[$i] } else { 0 }
        $n2 = if ($i -lt $v2.Count) { [int]$v2[$i] } else { 0 }
        
        if ($n1 -gt $n2) { return 1 }
        if ($n1 -lt $n2) { return -1 }
    }
    return 0
}

function Check-Prerequisites {
    Show-Progress "Checking Prerequisites"
    
    $prerequisites = @()
    $warnings = @()
    
    # PowerShell Version
    $psVersion = $PSVersionTable.PSVersion.ToString()
    Write-Log "PowerShell version: $psVersion" "DEBUG"
    
    if ($PSVersionTable.PSVersion.Major -lt 5) {
        throw "PowerShell 5.1 or later is required. Current version: $psVersion"
    }
    
    # Node.js
    if (Test-Command "node") {
        $nodeVersion = Get-CommandVersion "node"
        Write-Log "Node.js version: $nodeVersion" "INFO"
        
        if ((Compare-Versions $nodeVersion $REQUIRED_NODE_VERSION) -lt 0) {
            $warnings += "Node.js version $nodeVersion is below recommended $REQUIRED_NODE_VERSION"
        }
        $prerequisites += @{ Name = "Node.js"; Version = $nodeVersion; Status = "OK" }
    }
    else {
        $prerequisites += @{ Name = "Node.js"; Version = "Not Found"; Status = "MISSING" }
        Write-Log "Node.js not found" "WARN"
    }
    
    # npm
    if (Test-Command "npm") {
        $npmVersion = Get-CommandVersion "npm"
        Write-Log "npm version: $npmVersion" "INFO"
        $prerequisites += @{ Name = "npm"; Version = $npmVersion; Status = "OK" }
    }
    else {
        $prerequisites += @{ Name = "npm"; Version = "Not Found"; Status = "MISSING" }
    }
    
    # Docker
    if (-not $SkipDocker) {
        if (Test-Command "docker") {
            $dockerVersion = Get-CommandVersion "docker"
            Write-Log "Docker version: $dockerVersion" "INFO"
            
            # Check if Docker is running
            try {
                $dockerInfo = docker info 2>&1 | Out-String
                if ($dockerInfo -match "Server Version") {
                    $prerequisites += @{ Name = "Docker"; Version = $dockerVersion; Status = "OK" }
                }
                else {
                    $prerequisites += @{ Name = "Docker"; Version = $dockerVersion; Status = "NOT RUNNING" }
                    Write-Log "Docker daemon is not running" "WARN"
                }
            }
            catch {
                $prerequisites += @{ Name = "Docker"; Version = $dockerVersion; Status = "ERROR" }
            }
            
            # Docker Compose
            if (Test-Command "docker-compose") {
                $composeVersion = Get-CommandVersion "docker-compose"
                $prerequisites += @{ Name = "Docker Compose"; Version = $composeVersion; Status = "OK" }
            }
            elseif (docker compose version 2>$null) {
                $composeVersion = (docker compose version 2>&1 | Out-String).Trim()
                $prerequisites += @{ Name = "Docker Compose"; Version = $composeVersion; Status = "OK" }
            }
            else {
                $prerequisites += @{ Name = "Docker Compose"; Version = "Not Found"; Status = "MISSING" }
            }
        }
        else {
            $prerequisites += @{ Name = "Docker"; Version = "Not Found"; Status = "MISSING" }
            Write-Log "Docker not found - falling back to direct Node.js execution" "WARN"
            $SkipDocker = $true
        }
    }
    
    # Git
    if (Test-Command "git") {
        $gitVersion = Get-CommandVersion "git"
        $prerequisites += @{ Name = "Git"; Version = $gitVersion; Status = "OK" }
    }
    else {
        $prerequisites += @{ Name = "Git"; Version = "Not Found"; Status = "MISSING" }
    }
    
    # Port availability
    $portInUse = netstat -ano 2>$null | Select-String ":$Port\s"
    if ($portInUse) {
        Write-Log "Port $Port is already in use" "WARN"
        $warnings += "Port $Port is already in use. Application may fail to start."
    }
    
    # Display results
    Write-Host "  Prerequisite Check Results:" -ForegroundColor Cyan
    Write-Host "  ┌─────────────────────┬──────────────────┬──────────┐" -ForegroundColor DarkGray
    Write-Host "  │ Component           │ Version          │ Status   │" -ForegroundColor DarkGray
    Write-Host "  ├─────────────────────┼──────────────────┼──────────┤" -ForegroundColor DarkGray
    
    foreach ($prereq in $prerequisites) {
        $status = $prereq.Status
        $color = switch ($status) {
            "OK" { "Green" }
            "MISSING" { "Red" }
            default { "Yellow" }
        }
        $statusText = $status.PadRight(8)
        $name = $prereq.Name.PadRight(19)
        $version = $prereq.Version.PadRight(16)
        
        Write-Host "  │ $name │ $version │ $statusText │" -ForegroundColor $color
    }
    
    Write-Host "  └─────────────────────┴──────────────────┴──────────┘" -ForegroundColor DarkGray
    
    # Check for critical missing prerequisites
    $missing = $prerequisites | Where-Object { $_.Status -eq "MISSING" }
    $criticalMissing = $missing | Where-Object { $_.Name -eq "Node.js" -or $_.Name -eq "npm" }
    
    if ($criticalMissing) {
        Write-Log "Critical prerequisites missing. Attempting to install..." "WARN"
        Install-MissingPrerequisites -Missing $criticalMissing
    }
    
    if ($warnings.Count -gt 0) {
        Write-Host ""
        Write-Host "  Warnings:" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "  • $warning" -ForegroundColor Yellow
        }
    }
    
    return $true
}

function Install-MissingPrerequisites {
    param($Missing)
    
    foreach ($item in $Missing) {
        switch ($item.Name) {
            "Node.js" {
                Write-Log "Installing Node.js via winget..." "INFO"
                try {
                    if (Test-Command "winget") {
                        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
                        Refresh-EnvironmentVariables
                    }
                    else {
                        throw "winget not available. Please install Node.js manually from https://nodejs.org"
                    }
                }
                catch {
                    throw "Failed to install Node.js: $($_.Exception.Message)"
                }
            }
            "npm" {
                # npm comes with Node.js
            }
        }
    }
}

function Refresh-EnvironmentVariables {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}

# ============================================================================
# ENVIRONMENT SETUP
# ============================================================================

function Setup-Environment {
    Show-Progress "Setting Up Environment"
    
    # Create application directory
    if (Test-Path $APP_DIR) {
        Write-Log "Application directory exists: $APP_DIR" "INFO"
        
        if ($Rebuild) {
            Write-Log "Rebuild requested - removing existing directory" "INFO"
            Remove-Item -Path $APP_DIR -Recurse -Force
        }
    }
    
    # Clone repository
    if (-not (Test-Path $APP_DIR)) {
        Write-Step "Cloning repository" {
            git clone $APP_REPO $APP_DIR
            if ($LASTEXITCODE -ne 0) {
                throw "Failed to clone repository"
            }
        }
    }
    
    Set-Location $APP_DIR
    Write-Log "Working directory: $APP_DIR" "INFO"
    
    # Create environment file
    $envFile = Join-Path $APP_DIR ".env"
    $envContent = Generate-EnvContent
    
    Write-Log "Creating environment file" "INFO"
    $envContent | Out-File -FilePath $envFile -Encoding UTF8 -Force
    
    Write-Log "Environment file created at: $envFile" "DEBUG"
    
    return $true
}

function Generate-EnvContent {
    $dbUrl = if ($DatabaseUrl) {
        $DatabaseUrl
    }
    else {
        switch ($DatabaseProvider) {
            "postgresql" {
                "postgresql://linkhub:linkhub@localhost:5432/linkhub"
            }
            "mysql" {
                "mysql://linkhub:linkhub@localhost:3306/linkhub"
            }
            default {
                "file:./db/linkhub.db"
            }
        }
    }
    
    $envVars = @{
        "DATABASE_URL" = $dbUrl
        "NEXT_PUBLIC_SITE_URL" = "http://localhost:$Port"
        "NODE_ENV" = $Environment
        "PORT" = $Port
    }
    
    $content = "# LinkHub Environment Configuration`n"
    $content += "# Generated by install.ps1 on $(Get-Date)`n"
    $content += "# Environment: $Environment`n`n"
    
    foreach ($key in $envVars.Keys) {
        $content += "$key=`"$($envVars[$key])`"`n"
    }
    
    return $content
}

# ============================================================================
# DOCKER MANAGEMENT
# ============================================================================

function Start-Docker {
    if ($SkipDocker) {
        Write-Log "Skipping Docker setup (-SkipDocker specified)" "INFO"
        return $true
    }
    
    Show-Progress "Starting Docker Services"
    
    # Check Docker is running
    try {
        docker info | Out-Null
    }
    catch {
        Write-Log "Docker daemon not running. Starting Docker..." "WARN"
        Start-Service docker
        Start-Sleep -Seconds 10
    }
    
    # Create docker-compose.yml if it doesn't exist
    $composeFile = Join-Path $APP_DIR "docker-compose.yml"
    if (-not (Test-Path $composeFile)) {
        New-DockerComposeFile -Path $composeFile
    }
    
    # Stop existing containers
    Write-Step "Stopping existing containers" {
        docker compose down --remove-orphans 2>$null
    }
    
    # Build images
    if ($Rebuild) {
        Write-Step "Building Docker images" {
            docker compose build --no-cache
            if ($LASTEXITCODE -ne 0) {
                throw "Docker build failed"
            }
        }
    }
    
    # Start containers
    Write-Step "Starting containers" {
        docker compose up -d
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to start containers"
        }
    }
    
    # Wait for health check
    Write-Log "Waiting for containers to be healthy..." "INFO"
    Wait-ForContainerHealth -TimeoutSeconds 60
    
    return $true
}

function New-DockerComposeFile {
    param([string]$Path)
    
    Write-Log "Creating docker-compose.yml" "INFO"
    
    $composeContent = if ($DatabaseProvider -eq "postgresql") {
        Get-PostgresDockerCompose
    }
    elseif ($DatabaseProvider -eq "mysql") {
        Get-MySQLDockerCompose
    }
    else {
        Get-SQLiteDockerCompose
    }
    
    $composeContent | Out-File -FilePath $Path -Encoding UTF8
}

function Get-SQLiteDockerCompose {
    return @"
version: '3.8'

services:
  linkhub:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: linkhub-app
    ports:
      - "${Port}:3000"
    environment:
      - DATABASE_URL=file:./db/linkhub.db
      - NEXT_PUBLIC_SITE_URL=http://localhost:${Port}
      - NODE_ENV=${Environment}
    volumes:
      - linkhub-data:/app/db
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  linkhub-data:
"@
}

function Get-PostgresDockerCompose {
    return @"
version: '3.8'

services:
  linkhub:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: linkhub-app
    ports:
      - "${Port}:3000"
    environment:
      - DATABASE_URL=postgresql://linkhub:linkhub@postgres:5432/linkhub
      - NEXT_PUBLIC_SITE_URL=http://localhost:${Port}
      - NODE_ENV=${Environment}
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:16-alpine
    container_name: linkhub-db
    environment:
      - POSTGRES_USER=linkhub
      - POSTGRES_PASSWORD=linkhub
      - POSTGRES_DB=linkhub
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U linkhub -d linkhub"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres-data:
"@
}

function Get-MySQLDockerCompose {
    return @"
version: '3.8'

services:
  linkhub:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: linkhub-app
    ports:
      - "${Port}:3000"
    environment:
      - DATABASE_URL=mysql://linkhub:linkhub@mysql:3306/linkhub
      - NEXT_PUBLIC_SITE_URL=http://localhost:${Port}
      - NODE_ENV=${Environment}
    depends_on:
      mysql:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  mysql:
    image: mysql:8.0
    container_name: linkhub-db
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_USER=linkhub
      - MYSQL_PASSWORD=linkhub
      - MYSQL_DATABASE=linkhub
    volumes:
      - mysql-data:/var/lib/mysql
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mysql-data:
"@
}

function Wait-ForContainerHealth {
    param([int]$TimeoutSeconds = 60)
    
    $startTime = Get-Date
    $healthy = $false
    
    while (((Get-Date) - $startTime).TotalSeconds -lt $TimeoutSeconds) {
        $status = docker compose ps --format json 2>$null | ConvertFrom-Json
        
        if ($status) {
            $allHealthy = $true
            foreach ($container in $status) {
                if ($container.Health -ne "healthy" -and $container.State -ne "running") {
                    $allHealthy = $false
                    break
                }
            }
            
            if ($allHealthy) {
                $healthy = $true
                break
            }
        }
        
        Write-Spinner "Waiting for containers" 1000
        Start-Sleep -Seconds 2
    }
    
    if (-not $healthy) {
        Write-Log "Container health check timed out" "WARN"
        Write-Log "Container status:" "INFO"
        docker compose ps
    }
    
    return $healthy
}

# ============================================================================
# DATABASE SETUP
# ============================================================================

function Setup-Database {
    Show-Progress "Setting Up Database"
    
    if ($SkipDocker -and $DatabaseProvider -ne "sqlite") {
        Write-Log "Non-SQLite database with SkipDocker requires external database" "WARN"
    }
    
    # Wait for database to be ready
    if ($DatabaseProvider -ne "sqlite" -and -not $SkipDocker) {
        Write-Log "Waiting for database connection..." "INFO"
        Wait-ForDatabase -MaxRetries 10 -RetryDelay 3
    }
    
    # Run migrations
    Write-Step "Running database migrations" {
        if ($SkipDocker) {
            npx prisma migrate deploy 2>&1
            if ($LASTEXITCODE -ne 0) {
                npx prisma db push --accept-data-loss 2>&1
            }
        }
        else {
            docker compose exec linkhub npx prisma migrate deploy 2>&1
            if ($LASTEXITCODE -ne 0) {
                docker compose exec linkhub npx prisma db push --accept-data-loss 2>&1
            }
        }
    }
    
    # Seed database
    if (-not $SkipSeed) {
        Write-Step "Seeding database with initial data" {
            if ($SkipDocker) {
                npm run db:seed 2>&1
            }
            else {
                docker compose exec linkhub npm run db:seed 2>&1
            }
        }
    }
    
    # Verify database connection
    Write-Step "Verifying database connection" {
        if ($SkipDocker) {
            $result = npx prisma db execute --stdin <<< "SELECT 1" 2>&1
        }
        else {
            $result = docker compose exec linkhub npx prisma db execute --stdin <<< "SELECT 1" 2>&1
        }
        Write-Log "Database connection verified" "INFO"
    }
    
    return $true
}

function Wait-ForDatabase {
    param(
        [int]$MaxRetries = 10,
        [int]$RetryDelay = 3
    )
    
    for ($i = 1; $i -le $MaxRetries; $i++) {
        try {
            Write-Spinner "Connecting to database (attempt $i/$MaxRetries)"
            
            if ($SkipDocker) {
                npx prisma db execute --stdin <<< "SELECT 1" 2>$null
            }
            else {
                docker compose exec linkhub npx prisma db execute --stdin <<< "SELECT 1" 2>$null
            }
            
            if ($LASTEXITCODE -eq 0) {
                Write-Log "Database connection successful" "INFO"
                return $true
            }
        }
        catch {
            Write-Log "Database not ready yet: $($_.Exception.Message)" "DEBUG"
        }
        
        Start-Sleep -Seconds $RetryDelay
    }
    
    throw "Failed to connect to database after $MaxRetries attempts"
}

# ============================================================================
# APPLICATION RUN
# ============================================================================

function Run-App {
    Show-Progress "Starting Application"
    
    if ($SkipDocker) {
        return Run-AppDirect
    }
    else {
        return Run-AppDocker
    }
}

function Run-AppDirect {
    Write-Log "Starting application directly with Node.js" "INFO"
    
    # Install dependencies
    Write-Step "Installing dependencies" {
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed"
        }
    }
    
    # Build application
    Write-Step "Building application" {
        npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "Build failed"
        }
    }
    
    # Start application
    Write-Log "Starting application on port $Port" "INFO"
    
    $env:PORT = $Port
    
    # Start in background
    $job = Start-Job -ScriptBlock {
        param($Path, $Port)
        Set-Location $Path
        $env:PORT = $Port
        npm run start
    } -ArgumentList $APP_DIR, $Port
    
    # Wait for app to start
    Wait-ForApp -MaxRetries 15 -RetryDelay 2
    
    return $true
}

function Run-AppDocker {
    Write-Log "Application is running in Docker" "INFO"
    
    # Show container status
    docker compose ps
    
    # Wait for app to start
    Wait-ForApp -MaxRetries 15 -RetryDelay 2
    
    return $true
}

function Wait-ForApp {
    param(
        [int]$MaxRetries = 15,
        [int]$RetryDelay = 2
    )
    
    $url = "http://localhost:$Port"
    
    for ($i = 1; $i -le $MaxRetries; $i++) {
        try {
            Write-Spinner "Waiting for application (attempt $i/$MaxRetries)"
            
            $response = Invoke-WebRequest -Uri $url -TimeoutSec 5 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Log "Application is responding at $url" "INFO"
                return $true
            }
        }
        catch {
            Write-Log "Application not ready: $($_.Exception.Message)" "DEBUG"
        }
        
        Start-Sleep -Seconds $RetryDelay
    }
    
    Write-Log "Application health check timed out" "WARN"
    return $false
}

# ============================================================================
# DOCKERFILE CREATION
# ============================================================================

function New-Dockerfile {
    $dockerfile = Join-Path $APP_DIR "Dockerfile"
    
    if (Test-Path $dockerfile) {
        Write-Log "Dockerfile already exists" "DEBUG"
        return
    }
    
    Write-Log "Creating Dockerfile" "INFO"
    
    $dockerfileContent = @'
# LinkHub Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json bun.lock* ./
RUN npm install

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create db directory
RUN mkdir -p /app/db && chown -R nextjs:nodejs /app/db

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
'@
    
    $dockerfileContent | Out-File -FilePath $dockerfile -Encoding UTF8
}

# ============================================================================
# CONFIGURATION VALIDATION
# ============================================================================

function Test-Configuration {
    $envFile = Join-Path $APP_DIR ".env"
    
    if (-not (Test-Path $envFile)) {
        throw "Environment file not found: $envFile"
    }
    
    $requiredVars = @("DATABASE_URL", "NEXT_PUBLIC_SITE_URL")
    
    foreach ($var in $requiredVars) {
        $value = [Environment]::GetEnvironmentVariable($var)
        if (-not $value) {
            # Try to load from .env
            $envContent = Get-Content $envFile
            $match = $envContent | Select-String "^$var=(.+)$"
            if (-not $match) {
                throw "Required environment variable not found: $var"
            }
        }
    }
    
    Write-Log "Configuration validated successfully" "INFO"
    return $true
}

# ============================================================================
# CLEANUP
# ============================================================================

function Invoke-Cleanup {
    param([string]$Reason = "Unknown")
    
    Write-Log "Cleanup triggered: $Reason" "WARN"
    
    if (-not $SkipDocker) {
        try {
            docker compose down --remove-orphans 2>$null
        }
        catch {
            Write-Log "Failed to cleanup Docker: $($_.Exception.Message)" "ERROR"
        }
    }
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

$ErrorActionPreference = "Stop"
$startTime = Get-Date

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    $APP_NAME Installer v$SCRIPT_VERSION                   ║" -ForegroundColor Cyan
Write-Host "║                  Self-hosted Link Management              ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Log "Installation started" "INFO"
Write-Log "Parameters: Environment=$Environment, Port=$Port, DatabaseProvider=$DatabaseProvider, SkipDocker=$SkipDocker, Rebuild=$Rebuild" "INFO"

# Trap for cleanup on error
trap {
    Invoke-Cleanup -Reason "Error: $($_.Exception.Message)"
    Write-Log "Installation failed: $($_.Exception.Message)" "ERROR"
    Write-Log "Check log file for details: $LOG_FILE" "ERROR"
    exit 1
}

try {
    # Step 1: Check Prerequisites
    if (-not (Check-Prerequisites)) {
        throw "Prerequisites check failed"
    }
    
    # Step 2: Setup Environment
    if (-not (Setup-Environment)) {
        throw "Environment setup failed"
    }
    
    # Create Dockerfile if needed
    New-Dockerfile
    
    # Step 3: Test Configuration
    if (-not (Test-Configuration)) {
        throw "Configuration validation failed"
    }
    
    # Step 4: Start Docker (if applicable)
    if (-not $SkipDocker) {
        if (-not (Start-Docker)) {
            throw "Docker startup failed"
        }
    }
    
    # Step 5: Setup Database
    if (-not (Setup-Database)) {
        throw "Database setup failed"
    }
    
    # Step 6: Run Application
    if (-not (Run-App)) {
        throw "Application startup failed"
    }
    
    # Calculate duration
    $duration = ((Get-Date) - $startTime).TotalSeconds
    
    # Show completion summary
    $config = @{
        "Environment" = $Environment
        "Port" = $Port
        "Database" = $DatabaseProvider
        "Docker" = if ($SkipDocker) { "Disabled" } else { "Enabled" }
        "Duration" = "$([math]::Round($duration, 1)) seconds"
    }
    
    Show-Summary -Config $config
    
    Write-Log "Installation completed successfully in $([math]::Round($duration, 1)) seconds" "INFO"
    Write-Log "Log file: $LOG_FILE" "INFO"
    
    # Keep the window open if running directly
    if ($Host.Name -eq "ConsoleHost") {
        Write-Host ""
        Write-Host "Press any key to exit..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
    
    exit 0
}
catch {
    Write-Log "Fatal error: $($_.Exception.Message)" "ERROR"
    Write-Log "Stack trace: $($_.ScriptStackTrace)" "DEBUG"
    Invoke-Cleanup -Reason "Unhandled exception"
    
    Write-Host ""
    Write-Host "Installation failed. Check the log file for details:" -ForegroundColor Red
    Write-Host $LOG_FILE -ForegroundColor Yellow
    
    if ($Host.Name -eq "ConsoleHost") {
        Write-Host ""
        Write-Host "Press any key to exit..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
    
    exit 1
}
