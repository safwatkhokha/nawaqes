import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import database from './index.js';

const PERSISTENT_DIR = fs.existsSync('/data') ? '/data' : path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(PERSISTENT_DIR, 'nawaqes.db');
const BACKUP_DIR = path.join(PERSISTENT_DIR, 'backups');
const HF_TOKEN = process.env.HF_TOKEN || '';
const HF_BACKUP_REPO = process.env.HF_BACKUP_REPO || 'safwatkhokha/nawaqes-backups';

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

function createBackup(type: string) {
  try {
    if (!fs.existsSync(DB_FILE)) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dateStr = new Date().toISOString().slice(0, 10);
    const backupPath = path.join(BACKUP_DIR, `${type}_${timestamp}.db.gz`);
    const tempDb = path.join(BACKUP_DIR, `temp_${timestamp}.db`);
    execSync(`sqlite3 "${DB_FILE}" ".backup '${tempDb}'"`, { stdio: 'ignore' });
    execSync(`gzip -f "${tempDb}"`, { stdio: 'ignore' });
    fs.renameSync(tempDb + '.gz', backupPath);
    console.log(`[BACKUP] ✅ Local backup created: ${type}_${timestamp}.db.gz`);

    if (HF_TOKEN) {
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
    // Clean old backups (keep 72 - about 18 hours at 15min intervals)
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.db.gz')).sort().reverse();
    files.slice(72).forEach(f => { try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch {} });
  } catch (err: any) {
    console.error('[BACKUP] Failed:', err.message);
  }
}

export function initAutoBackup() {
  console.log('[BACKUP] Initializing auto-backup...');
  // First backup after 15 seconds (quick startup backup)
  setTimeout(() => createBackup('startup'), 15000);
  // Then every 10 minutes (more frequent for better data protection)
  setInterval(() => createBackup('periodic'), 10 * 60 * 1000);
  // Daily deep backup
  setInterval(() => createBackup('daily'), 24 * 60 * 60 * 1000);
  console.log('[BACKUP] ✅ Scheduled (every 10min + daily)');
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
  const files = fs.existsSync(BACKUP_DIR) ? fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.db.gz')) : [];
  return { totalBackups: files.length, hfConfigured: !!HF_TOKEN, hfRepo: HF_BACKUP_REPO };
}
