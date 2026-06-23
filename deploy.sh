#!/bin/bash
# ─── Nawaqes Quick Deploy Script ─────────────────────────────
set -e

echo "🚀 Nawaqes Deployment Script v2.3.0"
echo "====================================="

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install Node.js 20+ first."
    exit 1
fi

echo "✅ Node.js $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install --no-audit --no-fund

# Setup .env
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env from .env.example"
else
    echo "✅ .env already exists"
fi

# Create directories
mkdir -p uploads uploads/videos data backups

# Build
echo "🔨 Building project..."
npm run build

# Start
PORT=${PORT:-7860}
echo "🌐 Starting server on port $PORT..."
NODE_ENV=production PORT=$PORT node dist/server.mjs
