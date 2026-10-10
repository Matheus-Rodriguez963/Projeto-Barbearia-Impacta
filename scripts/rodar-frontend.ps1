# Sobe o site do Next.js em http://localhost:3020.
# Versao para Windows:
#   powershell -ExecutionPolicy Bypass -File scripts\rodar-frontend.ps1

$ErrorActionPreference = "Stop"

$Raiz = Split-Path -Parent $PSScriptRoot
Set-Location "$Raiz\frontend"

npm run dev
