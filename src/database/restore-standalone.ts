// Standalone pre-startup restore script.
// This is bundled separately as dist/restore.mjs and runs BEFORE
// the main server starts, so the `db` module (which creates/seeds
// a fresh database on import) does NOT wipe out the restored data.
//
// Usage:  node dist/restore.mjs && node dist/server.mjs

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const PERSISTENT_DIR = fs.existsSync('/data') ? '/data' : path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(PERSISTENT_DIR, 'nawaqes.db');
const HF_TOKEN = process.env.HF_TOKEN || '';
const HF_BACKUP_REPO = process.env.HF_BACKUP_REPO || 'safwatkhokha/nawaqes-backups';

async function autoRestoreDB() {
  console.log('[RESTORE] Checking for database backup...');

  // If DB exists AND was modified recently (within 6 hours), skip restore.
  // (6h chosen because HF free-tier containers can sleep and resume —
  // a 6h window avoids restoring over a perfectly good DB after a
  // brief restart, while still restoring after a real rebuild.)
  if (fs.existsSync(DB_FILE) && fs.statSync(DB_FILE).size > 0) {
    const stat = fs.statSync(DB_FILE);
    const ageMs = Date.now() - stat.mtimeMs;
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    if (ageMs < SIX_HOURS) {
      console.log(`[RESTORE] DB exists and is fresh (${Math.round(ageMs / 1000 / 60)} min old), skipping restore`);
      return;
    }
    console.log(`[RESTORE] DB exists but is ${Math.round(ageMs / 1000 / 60)} min old — will try to restore newer backup`);
  } else {
    console.log('[RESTORE] DB file does not exist or is empty — must restore from backup');
  }

  if (!HF_TOKEN) {
    console.log('[RESTORE] ⚠️  No HF_TOKEN set — cannot restore from backup!');
    console.log('[RESTORE] ⚠️  Set HF_TOKEN as a Space secret to enable auto-restore.');
    console.log('[RESTORE] ⚠️  Server will start with FRESH database — ALL USERS WILL BE LOST.');
    return;
  }

  try {
    // List all backup files in the HF Datasets repo
    console.log(`[RESTORE] Listing backups from ${HF_BACKUP_REPO}...`);
    const output = execSync(`python3 -c "
import json
from huggingface_hub import HfApi
api = HfApi()
try:
    files = api.list_repo_files('${HF_BACKUP_REPO}', repo_type='dataset')
    backups = sorted([f for f in files if f.endswith('.db.gz')], reverse=True)
    print(json.dumps(backups[:10]))
except Exception as e:
    print('[]')
"`, { encoding: 'utf-8', env: { ...process.env, HF_TOKEN }, timeout: 60000 }).trim();

    const backups = JSON.parse(output);
    if (backups.length === 0) {
      console.log('[RESTORE] No backups found in HF repo — server will start with fresh DB');
      return;
    }

    console.log(`[RESTORE] Found ${backups.length} backups. Latest: ${backups[0]}`);

    // If we already have a local DB, only restore if the backup is NEWER
    const dbExists = fs.existsSync(DB_FILE) && fs.statSync(DB_FILE).size > 0;
    if (dbExists) {
      const localMtime = fs.statSync(DB_FILE).mtimeMs;
      const backupFilename = backups[0].split('/').pop() || backups[0];
      const dateMatch = backupFilename.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const [, y, mo, d, h, mi, s] = dateMatch;
        const backupTime = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`).getTime();
        if (backupTime <= localMtime) {
          console.log('[RESTORE] Local DB is newer than latest backup, skipping restore');
          return;
        }
        console.log(`[RESTORE] Backup is newer than local DB — will restore`);
      }
    }

    // Download the latest backup
    const tempPath = path.join(PERSISTENT_DIR, 'restore_temp.db.gz');
    console.log(`[RESTORE] Downloading ${backups[0]}...`);
    execSync(`python3 -c "
from huggingface_hub import hf_hub_download
import shutil
path = hf_hub_download(repo_id='${HF_BACKUP_REPO}', filename='${backups[0]}', repo_type='dataset', token='${HF_TOKEN}')
shutil.copy2(path, '${tempPath}')
"`, { encoding: 'utf-8', env: { ...process.env, HF_TOKEN }, timeout: 180000 });

    // Decompress
    execSync(`gunzip -f "${tempPath}"`, { stdio: 'ignore' });
    const decompressed = tempPath.replace('.gz', '');

    if (fs.existsSync(decompressed)) {
      // Backup current DB if it exists (just in case)
      if (dbExists) {
        const oldBackup = DB_FILE + '.old';
        try {
          fs.copyFileSync(DB_FILE, oldBackup);
          console.log(`[RESTORE] Old DB backed up to ${oldBackup}`);
        } catch {}
      }
      // Ensure /data exists
      const dataDir = path.dirname(DB_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.copyFileSync(decompressed, DB_FILE);
      fs.unlinkSync(decompressed);
      console.log(`[RESTORE] ✅ Database restored from ${backups[0]}!`);
      console.log(`[RESTORE] DB size: ${fs.statSync(DB_FILE).size} bytes`);
    } else {
      console.error('[RESTORE] ❌ Decompressed file not found!');
    }
  } catch (err: any) {
    console.warn('[RESTORE] Failed:', err.message);
    console.warn('[RESTORE] ⚠️  Server will start with empty/fresh database.');
    console.warn('[RESTORE] ⚠️  All previous user data will be LOST unless backup exists!');
  }
}

autoRestoreDB().then(() => {
  console.log('[RESTORE] Done.');
  process.exit(0);
}).catch(err => {
  console.error('[RESTORE] Fatal error:', err.message);
  // Don't block server startup — better to start with fresh DB than not start at all
  process.exit(0);
});
