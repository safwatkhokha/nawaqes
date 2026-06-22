FROM node:20-slim
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl python3 make g++ sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Higher memory limit (HF free tier has 16GB)
ENV NODE_OPTIONS="--max-old-space-size=2048"

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY . .
RUN cp .env.example .env || true

ENV GENERATE_SOURCEMAP=false
RUN sed -i 's/--sourcemap//g' package.json
RUN npm run build

RUN npm prune --production --no-audit --no-fund

# Create persistent data directories
RUN mkdir -p /data/uploads /data/uploads/videos /data/backups /data/db

# Enhanced entrypoint: ensure database persistence across rebuilds
# Key fix: Copy existing DB from previous container to /data if it exists there
RUN printf '#!/bin/sh\nset -e\n\n# Create required directories\nmkdir -p /data/uploads /data/uploads/videos /data/backups /data/db\n\n# Restore .env from persistent storage if available\nif [ -f /data/.env ]; then\n  cp /data/.env /app/.env\n  echo "[ENTRYPOINT] Restored .env from persistent storage"\nelse\n  cp /app/.env.example /app/.env 2>/dev/null || true\n  echo "[ENTRYPOINT] Using default .env"\nfi\n\n# CRITICAL: Ensure database is in /data (persistent volume)\n# If /data/nawaqes.db exists, it takes priority (survives rebuilds)\n# If not, check if there is a DB in /app/data/ from a previous build\nif [ ! -f /data/nawaqes.db ] && [ -f /app/data/nawaqes.db ]; then\n  cp /app/data/nawaqes.db /data/nawaqes.db 2>/dev/null || true\n  echo "[ENTRYPOINT] Copied existing database to persistent storage"\nfi\n\n# Symlink uploads to persistent storage\nif [ ! -L /app/uploads ]; then\n  [ -d /app/uploads ] && cp -rn /app/uploads/* /data/uploads/ 2>/dev/null || true\n  [ -d /app/uploads ] && rm -rf /app/uploads\n  ln -sf /data/uploads /app/uploads\nfi\n\n# Symlink data directory to persistent storage\nif [ ! -L /app/data ]; then\n  [ -d /app/data ] && rm -rf /app/data\n  ln -sf /data /app/data\nfi\n\n# Symlink backups to persistent storage\nif [ ! -L /app/backups ]; then\n  [ -d /app/backups ] && rm -rf /app/backups\n  ln -sf /data/backups /app/backups\nfi\n\necho "[ENTRYPOINT] Database path: /data/nawaqes.db"\necho "[ENTRYPOINT] Persistent storage ready"\nexec "$@"\n' > /app/entrypoint.sh \
    && chmod +x /app/entrypoint.sh

RUN chown -R 1000:1000 /app /data
USER 1000

EXPOSE 7860

ENV NODE_ENV=production
ENV PORT=7860
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://localhost:7860/api/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "dist/server.mjs"]
