#!/usr/bin/env bash
# Sobe o site do Next.js em http://localhost:3020.

set -e
cd "$(dirname "$0")/../frontend"

npm run dev
