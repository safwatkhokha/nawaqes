#!/bin/bash
# ─── Nawaqes Database Backup Script ─────────────────────────────────
# Usage: bash backup.sh
# Backs up the SQLite database with timestamp to backups/ directory

cd "$(dirname "$0")"

BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_FILE="data/nawaqes.db"
DB_WAL="data/nawaqes.db-wal"
DB_SHM="data/nawaqes.db-shm"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check if database exists
if [ ! -f "$DB_FILE" ]; then
  echo "[BACKUP] Error: Database file not found at $DB_FILE"
  exit 1
fi

# Check if WAL mode is active and checkpoint first
if [ -f "$DB_WAL" ]; then
  echo "[BACKUP] WAL file detected, performing checkpoint..."
  # Force checkpoint using sqlite3 if available
  if command -v sqlite3 &> /dev/null; then
    sqlite3 "$DB_FILE" "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || true
  fi
fi

# Create backup
BACKUP_FILE="$BACKUP_DIR/nawaqes_${TIMESTAMP}.db"
cp "$DB_FILE" "$BACKUP_FILE"

# Also backup WAL and SHM files if they exist
[ -f "$DB_WAL" ] && cp "$DB_WAL" "${BACKUP_FILE}-wal"
[ -f "$DB_SHM" ] && cp "$DB_SHM" "${BACKUP_FILE}-shm"

# Compress the backup
if command -v gzip &> /dev/null; then
  gzip -f "$BACKUP_FILE"
  [ -f "${BACKUP_FILE}-wal" ] && gzip -f "${BACKUP_FILE}-wal"
  [ -f "${BACKUP_FILE}-shm" ] && gzip -f "${BACKUP_FILE}-shm"
  echo "[BACKUP] Compressed backup created: ${BACKUP_FILE}.gz"
else
  echo "[BACKUP] Backup created: $BACKUP_FILE"
fi

# Clean up old backups (keep last 7)
echo "[BACKUP] Cleaning up old backups (keeping last 7)..."
ls -t "$BACKUP_DIR"/nawaqes_*.db* 2>/dev/null | tail -n +8 | xargs -r rm --
echo "[BACKUP] Done!"

# Show backup size
echo "[BACKUP] Total backup size: $(du -sh "$BACKUP_DIR" | cut -f1)"
