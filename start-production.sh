#!/bin/bash
# ─── نواقص - سكريبت التشغيل الإنتاجي ─────────────────────
set -e

cd "$(dirname "$0")"

# Setup
[ ! -f .env ] && cp .env.example .env
mkdir -p uploads uploads/videos data backups downloads

# Build if needed
if [ ! -f dist/server.mjs ]; then
    echo "🔨 Building project..."
    npm install --no-audit --no-fund
    npm run build
fi

# Start
export NODE_ENV=production
export PORT=${PORT:-7860}
echo "🚀 Starting Nawaqes on port $PORT..."
exec node dist/server.mjs
