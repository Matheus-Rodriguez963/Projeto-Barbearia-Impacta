# Instala tudo de uma vez (backend + frontend) e prepara os arquivos .env.
# Versao para Windows. Rodar da pasta do projeto, no PowerShell:
#   powershell -ExecutionPolicy Bypass -File scripts\instalar.ps1

$ErrorActionPreference = "Stop"  # se qualquer comando falhar, o script para na hora

$Raiz = Split-Path -Parent $PSScriptRoot
Set-Location $Raiz

Write-Host "==> 1/4  Subindo o PostgreSQL no Docker" -ForegroundColor Yellow
docker compose up -d

Write-Host "==> 2/4  Criando o ambiente virtual do Python e instalando o backend" -ForegroundColor Yellow
Set-Location "$Raiz\backend"
python -m venv .venv
& ".venv\Scripts\python.exe" -m pip install --quiet --upgrade pip
& ".venv\Scripts\pip.exe" install --quiet -r requirements.txt
if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }

Write-Host "==> 3/4  Instalando o frontend (pode demorar um pouco)" -ForegroundColor Yellow
Set-Location "$Raiz\frontend"
npm install --silent
if (-not (Test-Path ".env.local")) { Copy-Item ".env.local.example" ".env.local" }

Write-Host "==> 4/4  Colocando alguns clientes de exemplo no banco" -ForegroundColor Yellow
Set-Location "$Raiz\backend"
& ".venv\Scripts\python.exe" popular_banco.py

Write-Host ""
Write-Host "Pronto! Agora abra dois terminais:" -ForegroundColor Green
Write-Host "  Terminal 1:  powershell -ExecutionPolicy Bypass -File scripts\rodar-backend.ps1"
Write-Host "  Terminal 2:  powershell -ExecutionPolicy Bypass -File scripts\rodar-frontend.ps1"
Write-Host "E acesse http://localhost:3000"
