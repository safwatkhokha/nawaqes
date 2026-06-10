# ═══════════════════════════════════════════════════════════════
#  Nawaqes - Dockerfile for Hugging Face Spaces
#  Vite + Express + better-sqlite3
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

# Create .env from example
RUN cp .env.example .env

# Create data directories and set ownership
RUN mkdir -p /app/data /app/uploads /app/backups && \
    chown -R 1000:1000 /app

# Switch to non-root user (UID 1000 required by HF Spaces)
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

# Start the server
CMD ["node", "dist/server.mjs"]
