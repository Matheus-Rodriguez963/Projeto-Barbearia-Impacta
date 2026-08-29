# Roda os testes do pytest.
# Versao para Windows:
#   powershell -ExecutionPolicy Bypass -File scripts\rodar-testes.ps1

$ErrorActionPreference = "Stop"

$Raiz = Split-Path -Parent $PSScriptRoot
Set-Location "$Raiz\backend"

& ".venv\Scripts\python.exe" -m pytest
