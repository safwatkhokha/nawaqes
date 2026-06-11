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

# Create local data directories (symlinks will point to /data for persistence)
RUN mkdir -p /app/data /app/uploads /app/uploads/videos /app/backups

# ─── HF Spaces Persistent Volume ────────────────────────────
# /data is the persistent volume on Hugging Face Spaces.
# It survives container restarts and rebuilds.
# The app code checks for /data and uses it when available.
VOLUME /data

# Create entrypoint script that sets up symlinks for persistent storage
RUN cat > /app/entrypoint.sh << 'EOF'
#!/bin/sh
set -e

# Ensure /data exists and has proper subdirectories
mkdir -p /data/uploads /data/uploads/videos /data/backups

# If /data/.env exists, copy it to /app/.env (persistent JWT_SECRET etc.)
if [ -f /data/.env ]; then
  echo "[ENTRYPOINT] Using persistent .env from /data/.env"
  cp /data/.env /app/.env
else
  echo "[ENTRYPOINT] No persistent .env found, using default"
  # Copy the example .env as base
  cp /app/.env.example /app/.env 2>/dev/null || true
fi

# If /data/nawaqes.db exists, the app will find it automatically
# (database code checks /data first, then falls back to ./data)

# Create symlinks for uploads directory so files persist in /data
# This ensures uploaded images/videos survive container restarts
if [ ! -L /app/uploads ] && [ -d /app/uploads ]; then
  # Copy any existing uploads to persistent storage
  cp -rn /app/uploads/* /data/uploads/ 2>/dev/null || true
  rm -rf /app/uploads
  ln -s /data/uploads /app/uploads
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
