#!/usr/bin/env bash
# Sobe a API do FastAPI em http://localhost:8000 (documentação em /docs).

set -e
cd "$(dirname "$0")/../backend"

docker compose -f ../docker-compose.yml up -d  # garante que o banco está de pé
.venv/bin/python -m uvicorn app.main:app --reload --port 8000
