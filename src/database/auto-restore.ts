import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const PERSISTENT_DIR = fs.existsSync('/data') ? '/data' : path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(PERSISTENT_DIR, 'nawaqes.db');
const HF_TOKEN = process.env.HF_TOKEN || '';
const HF_BACKUP_REPO = process.env.HF_BACKUP_REPO || 'safwatkhokha/nawaqes-backups';

export async function autoRestoreDB() {
  console.log('[RESTORE] Checking for database backup...');
  if (fs.existsSync(DB_FILE) && fs.statSync(DB_FILE).size > 0) {
    console.log('[RESTORE] DB exists, skipping restore');
    return;
  }
  if (!HF_TOKEN) {
    console.log('[RESTORE] No HF_TOKEN, skipping restore');
    return;
  }
  try {
    const output = execSync(`python3 -c "
import json
from huggingface_hub import HfApi
api = HfApi()
try:
    files = api.list_repo_files('${HF_BACKUP_REPO}', repo_type='dataset')
    backups = sorted([f for f in files if f.endswith('.db.gz')], reverse=True)
    print(json.dumps(backups[:5]))
except: print('[]')
"`, { encoding: 'utf-8', env: { ...process.env, HF_TOKEN }, timeout: 30000 }).trim();
    const backups = JSON.parse(output);
    if (backups.length === 0) {
      console.log('[RESTORE] No backups found');
      return;
    }
    console.log('[RESTORE] Latest backup:', backups[0]);
    const tempPath = path.join(PERSISTENT_DIR, 'restore_temp.db.gz');
    execSync(`python3 -c "
from huggingface_hub import hf_hub_download
import shutil
path = hf_hub_download(repo_id='${HF_BACKUP_REPO}', filename='${backups[0]}', repo_type='dataset', token='${HF_TOKEN}')
shutil.copy2(path, '${tempPath}')
"`, { encoding: 'utf-8', env: { ...process.env, HF_TOKEN }, timeout: 120000 });
    execSync(`gunzip -f "${tempPath}"`, { stdio: 'ignore' });
    const decompressed = tempPath.replace('.gz', '');
    if (fs.existsSync(decompressed)) {
      fs.copyFileSync(decompressed, DB_FILE);
      fs.unlinkSync(decompressed);
      console.log('[RESTORE] ✅ Database restored!', backups[0]);
    }
  } catch (err: any) {
    console.warn('[RESTORE] Failed:', err.message);
  }
}
