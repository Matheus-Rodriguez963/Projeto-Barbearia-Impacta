#!/usr/bin/env bash
# Instala tudo de uma vez (backend + frontend) e prepara os arquivos .env.
# Rodar da pasta do projeto:  bash scripts/instalar.sh

set -e  # se qualquer comando falhar, o script para na hora

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RAIZ"

echo "==> 1/4  Subindo o PostgreSQL no Docker"
docker compose up -d

echo "==> 2/4  Criando o ambiente virtual do Python e instalando o backend"
cd "$RAIZ/backend"
python3 -m venv .venv
.venv/bin/pip install --quiet --upgrade pip
.venv/bin/pip install --quiet -r requirements.txt
[ -f .env ] || cp .env.example .env

echo "==> 3/4  Instalando o frontend (pode demorar um pouco)"
cd "$RAIZ/frontend"
npm install --silent
[ -f .env.local ] || cp .env.local.example .env.local

echo "==> 4/4  Colocando alguns clientes de exemplo no banco"
cd "$RAIZ/backend"
.venv/bin/python popular_banco.py

echo ""
echo "Pronto! Agora abra dois terminais:"
echo "  Terminal 1:  bash scripts/rodar-backend.sh"
echo "  Terminal 2:  bash scripts/rodar-frontend.sh"
echo "E acesse http://localhost:3000"
