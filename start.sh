#!/bin/bash
# ─── Nawaqes Server Start Script ──────────────────────────────────
cd "$(dirname "$0")"

# Create necessary directories
mkdir -p data uploads backups

# Create .env if missing
if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "[SETUP] Created .env from .env.example"
  echo "[SETUP] Edit .env to customize your settings."
fi

# Remove NODE_ENV from .env if present (Vite doesn't support it in .env)
if [ -f .env ] && grep -q "^NODE_ENV=" .env 2>/dev/null; then
  echo "[SETUP] Removing NODE_ENV from .env (Vite sets it automatically)..."
  sed -i '/^NODE_ENV=/d' .env
fi

# Install dependencies if missing
if [ ! -d node_modules ]; then
  echo "[SETUP] Installing dependencies..."
  npm install
fi

# Run backup before starting (if database exists)
if [ -f data/nawaqes.db ]; then
  echo "[BACKUP] Running pre-start backup..."
  bash backup.sh 2>/dev/null || echo "[BACKUP] Backup skipped"
fi

# Check if built version exists
if [ -f dist/server.mjs ]; then
  echo "================================================"
  echo "  Nawaqes Server (Production Build)"
  echo "  URL: http://localhost:3000"
  echo "================================================"
  echo ""
  echo "[INFO] Admin login: admin@nawaqes.com"
  echo "[INFO] Check .env for ADMIN_PASSWORD"
  echo ""
  export NODE_ENV=production
  exec node dist/server.mjs
else
  echo "================================================"
  echo "  Nawaqes Server (Development Mode)"
  echo "  URL: http://localhost:3000"
  echo "  Run 'npm run build' first for production"
  echo "================================================"
  echo ""
  export NODE_ENV=development
  exec npx tsx src/server.ts
fi
