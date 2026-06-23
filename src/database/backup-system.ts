import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import Database from 'better-sqlite3';
import database from './index.js';

const PERSISTENT_DIR = fs.existsSync('/data') ? '/data' : path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(PERSISTENT_DIR, 'nawaqes.db');
const BACKUP_DIR = path.join(PERSISTENT_DIR, 'backups');
const HF_TOKEN = process.env.HF_TOKEN || '';
const HF_BACKUP_REPO = process.env.HF_BACKUP_REPO || 'safwatkhokha/nawaqes-backups';

if (!fs.existsSync(BACKUP_DIR)) {
  try { fs.mkdirSync(BACKUP_DIR, { recursive: true }); } catch {}
}

/**
 * Create a backup of the SQLite database.
 *
 * Uses better-sqlite3's native `.backup()` API (no shell `sqlite3` CLI required)
 * which is more reliable and works in containers where the sqlite3 binary
 * is not installed (e.g. the Hugging Face Space Docker image).
 */
function createBackupUsingApi(targetPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Open the source DB in read-only mode to avoid conflicts with the live server
      const srcDb = new Database(DB_FILE, { readonly: true, fileMustExist: true });
      srcDb.backup(targetPath)
        .then(() => {
          srcDb.close();
          resolve();
        })
        .catch((err: any) => {
          try { srcDb.close(); } catch {}
          reject(err);
        });
    } catch (err: any) {
      reject(err);
    }
  });
}

function createBackup(type: string) {
  try {
    if (!fs.existsSync(DB_FILE)) {
      console.warn('[BACKUP] DB file not found, skipping');
      return;
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dateStr = new Date().toISOString().slice(0, 10);
    const backupPath = path.join(BACKUP_DIR, `${type}_${timestamp}.db.gz`);
    const tempDb = path.join(BACKUP_DIR, `temp_${timestamp}.db`);

    // ─── Use better-sqlite3 native backup API (no sqlite3 CLI required) ───
    createBackupUsingApi(tempDb)
      .then(() => {
        // Compress with gzip (gzip is a standard Unix utility, always available)
        try {
          execSync(`gzip -f "${tempDb}"`, { stdio: 'ignore' });
          fs.renameSync(tempDb + '.gz', backupPath);
          console.log(`[BACKUP] ✅ Local backup created: ${type}_${timestamp}.db.gz`);

          // Upload to HF Datasets
          if (HF_TOKEN) {
            uploadToHF(backupPath, dateStr, type, timestamp);
          }

          // Clean old local backups (keep last 72)
          try {
            const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.db.gz')).sort().reverse();
            files.slice(72).forEach(f => { try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch {} });
          } catch {}
        } catch (gzErr: any) {
          console.warn(`[BACKUP] gzip failed: ${gzErr.message}`);
          // Fall back to uncompressed copy if gzip is unavailable
          try {
            fs.copyFileSync(tempDb, backupPath.replace('.gz', ''));
            console.log(`[BACKUP] ✅ Local backup (uncompressed): ${type}_${timestamp}.db`);
          } catch {}
        }
      })
      .catch((err: any) => {
        console.error(`[BACKUP] API backup failed: ${err.message}`);
        // ─── Fallback: simple file copy (may capture inconsistent state but better than nothing) ───
        try {
          fs.copyFileSync(DB_FILE, tempDb);
          execSync(`gzip -f "${tempDb}"`, { stdio: 'ignore' });
          fs.renameSync(tempDb + '.gz', backupPath);
          console.log(`[BACKUP] ✅ Fallback file copy: ${type}_${timestamp}.db.gz`);
          if (HF_TOKEN) {
            uploadToHF(backupPath, dateStr, type, timestamp);
          }
        } catch (copyErr: any) {
          console.error(`[BACKUP] Fallback copy also failed: ${copyErr.message}`);
        }
      });
  } catch (err: any) {
    console.error('[BACKUP] Failed:', err.message);
  }
}

function uploadToHF(backupPath: string, dateStr: string, type: string, timestamp: string) {
  try {
    const pathInRepo = `backups/${dateStr}/${type}_${timestamp}.db.gz`;
    execSync(`python3 -c "
from huggingface_hub import HfApi
api = HfApi()
api.upload_file(path_or_fileobj='${backupPath}', path_in_repo='${pathInRepo}', repo_id='${HF_BACKUP_REPO}', repo_type='dataset', commit_message='Backup ${timestamp}')
"`, { encoding: 'utf-8', env: { ...process.env, HF_TOKEN }, timeout: 120000 });
    console.log(`[BACKUP] ✅ Uploaded to HF: ${pathInRepo}`);
  } catch (err: any) {
    console.warn(`[BACKUP] Upload failed: ${err.message?.slice(0, 100)}`);
  }
}

export function initAutoBackup() {
  console.log('[BACKUP] Initializing auto-backup...');
  // First backup after 30 seconds (quick startup backup)
  setTimeout(() => createBackup('startup'), 30000);
  // Then every 5 minutes (more frequent for better data protection)
  setInterval(() => createBackup('periodic'), 5 * 60 * 1000);
  // Daily deep backup
  setInterval(() => createBackup('daily'), 24 * 60 * 60 * 1000);
  console.log('[BACKUP] ✅ Scheduled (every 5min + daily + on startup)');
}

export function createManualBackup() {
  createBackup('manual');
  return { success: true };
}

// Create backup on important events (user registration, post creation, etc.)
export function createEventBackup(event: string) {
  // Debounce: don't create event backups more than once per 60 seconds
  const now = Date.now();
  const lastBackupTime = (global as any).__lastEventBackup || 0;
  if (now - lastBackupTime < 60000) return;
  (global as any).__lastEventBackup = now;
  createBackup(`event_${event}`);
}

export function getBackupStats() {
  const files = fs.existsSync(BACKUP_DIR) ? fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.db.gz') || f.endsWith('.db')) : [];
  return { totalBackups: files.length, hfConfigured: !!HF_TOKEN, hfRepo: HF_BACKUP_REPO };
}
