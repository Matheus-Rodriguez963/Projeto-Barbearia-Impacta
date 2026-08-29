# Sobe a API do FastAPI em http://localhost:8000 (documentacao em /docs).
# Versao para Windows:
#   powershell -ExecutionPolicy Bypass -File scripts\rodar-backend.ps1

$ErrorActionPreference = "Stop"

$Raiz = Split-Path -Parent $PSScriptRoot
Set-Location "$Raiz\backend"

docker compose -f "$Raiz\docker-compose.yml" up -d  # garante que o banco esta de pe
& ".venv\Scripts\python.exe" -m uvicorn app.main:app --reload --port 8000
