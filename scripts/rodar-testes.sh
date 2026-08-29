#!/usr/bin/env bash
# Roda os testes do pytest.

set -e
cd "$(dirname "$0")/../backend"

.venv/bin/python -m pytest
