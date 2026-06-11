# ═══════════════════════════════════════════════════════════════
#  Nawaqes - Dockerfile for Hugging Face Spaces
#  Vite + Express + better-sqlite3
#  ✅ Uses /data persistent volume for DB, uploads, and .env
# ═══════════════════════════════════════════════════════════════

# ─── Stage 1: Build ──────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Install build tools for native modules (better-sqlite3)
RUN apt-get update -qq && \
    apt-get install -y -qq --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# Copy dependency files first (for Docker cache)
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Create .env from example (needed for build)
RUN cp .env.example .env || true

# Build frontend (Vite) + backend (esbuild)
RUN npm run build

# Remove devDependencies to reduce image size
RUN npm prune --production

# ─── Stage 2: Runner ────────────────────────────────────────
FROM node:20-slim AS runner

WORKDIR /app

# Install runtime system dependencies for better-sqlite3
RUN apt-get update -qq && \
    apt-get install -y -qq --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/*

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.env.example ./
COPY --from=builder /app/start.sh ./

# Make start.sh executable
RUN chmod +x start.sh || true

# Create .env from example (will be overridden by /data/.env if it exists)
RUN cp .env.example .env

# ─── HF Spaces Persistent Volume ────────────────────────────
# /data is the persistent volume on Hugging Face Spaces.
# It survives container restarts and rebuilds.
# The app code checks for /data and uses it when available.

# Create /data directory and subdirectories BEFORE declaring VOLUME
# This is critical: chown needs /data to exist at build time
RUN mkdir -p /data/uploads /data/uploads/videos /data/backups

VOLUME /data

# Create entrypoint script that sets up persistent storage
# This script ensures data survives container restarts by:
# 1. Persisting .env (JWT_SECRET etc.) to /data
# 2. Symlinking uploads to /data/uploads
# 3. Symlinking local data dir to /data for database access
RUN cat > /app/entrypoint.sh << 'EOF'
#!/bin/sh
set -e

echo "[ENTRYPOINT] Setting up Nawaqes persistent storage..."

# Ensure /data subdirectories exist
mkdir -p /data/uploads /data/uploads/videos /data/backups

# ─── 1. Handle .env persistence (JWT_SECRET etc.) ───────────
if [ -f /data/.env ]; then
  echo "[ENTRYPOINT] Using persistent .env from /data/.env"
  cp /data/.env /app/.env
else
  echo "[ENTRYPOINT] No persistent .env found, using default"
  cp /app/.env.example /app/.env 2>/dev/null || true
fi

# ─── 2. Handle uploads directory persistence ────────────────
if [ ! -L /app/uploads ]; then
  # Copy any existing uploads to persistent storage first
  if [ -d /app/uploads ]; then
    cp -rn /app/uploads/* /data/uploads/ 2>/dev/null || true
    rm -rf /app/uploads
  fi
  ln -sf /data/uploads /app/uploads
  echo "[ENTRYPOINT] Uploads symlinked to /data/uploads"
fi

# ─── 3. Handle data directory for database ──────────────────
# The database code checks /data first, then falls back to ./data
# We symlink /app/data to /data so that even fallback paths work
if [ ! -L /app/data ]; then
  # If there's an existing local database, migrate it to /data
  if [ -f /app/data/nawaqes.db ] && [ ! -f /data/nawaqes.db ]; then
    echo "[ENTRYPOINT] Migrating existing database to /data"
    cp /app/data/nawaqes.db /data/nawaqes.db
    cp /app/data/nawaqes.db-wal /data/nawaqes.db-wal 2>/dev/null || true
    cp /app/data/nawaqes.db-shm /data/nawaqes.db-shm 2>/dev/null || true
  fi
  if [ -d /app/data ]; then
    rm -rf /app/data
  fi
  ln -sf /data /app/data
  echo "[ENTRYPOINT] Data directory symlinked to /data"
fi

# ─── 4. Handle backups directory persistence ────────────────
if [ ! -L /app/backups ]; then
  if [ -d /app/backups ]; then
    cp -rn /app/backups/* /data/backups/ 2>/dev/null || true
    rm -rf /app/backups
  fi
  ln -sf /data/backups /app/backups
  echo "[ENTRYPOINT] Backups symlinked to /data/backups"
fi

echo "[ENTRYPOINT] Nawaqes starting..."
echo "[ENTRYPOINT] Database: /data/nawaqes.db (if exists)"
echo "[ENTRYPOINT] Uploads: /data/uploads/"
echo "[ENTRYPOINT] .env: /data/.env (if exists)"

exec "$@"
EOF
RUN chmod +x /app/entrypoint.sh

# Switch to non-root user (UID 1000 required by HF Spaces)
RUN chown -R 1000:1000 /app /data
USER 1000

# HF Spaces uses port 7860 by default
EXPOSE 7860

# Environment variables
ENV NODE_ENV=production
ENV PORT=7860
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:7860/api/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

# Start the server with entrypoint for persistent storage setup
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "dist/server.mjs"]
