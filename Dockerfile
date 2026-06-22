FROM node:20-slim
WORKDIR /app

# Install: openssl (for bcrypt), python3 + pip (for huggingface_hub backup uploads),
# make + g++ (for native modules like better-sqlite3), sqlite3 (for DB maintenance if needed)
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl python3 python3-pip make g++ sqlite3 gzip \
    && pip3 install --no-cache-dir --break-system-packages huggingface_hub \
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

RUN mkdir -p /data/uploads /data/uploads/videos /data/backups

RUN printf '#!/bin/sh\nset -e\nmkdir -p /data/uploads /data/uploads/videos /data/backups\n[ -f /data/.env ] && cp /data/.env /app/.env || cp /app/.env.example /app/.env 2>/dev/null || true\n[ ! -L /app/uploads ] && { [ -d /app/uploads ] && cp -rn /app/uploads/* /data/uploads/ 2>/dev/null || true; [ -d /app/uploads ] && rm -rf /app/uploads; ln -sf /data/uploads /app/uploads; }\n[ ! -L /app/data ] && { [ -d /app/data ] && rm -rf /app/data; ln -sf /data /app/data; }\n[ ! -L /app/backups ] && { [ -d /app/backups ] && rm -rf /app/backups; ln -sf /data/backups /app/backups; }\nexec "$@"\n' > /app/entrypoint.sh \
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
