#!/usr/bin/env python3
"""
Create a ZIP with ALL deployment credentials, tokens, and configs.

⚠️ EXTREMELY SENSITIVE — DO NOT SHARE PUBLICLY.

Contents:
- All API tokens (HF, GitHub, Koyeb, Render)
- Firebase Service Account private key
- Firebase client config (API keys)
- .env file with DATABASE_URL
- Admin/Owner passwords
- Deployment configs (koyeb.yaml, render.yaml, Dockerfile)
- Full source code (src/, dist/, public/, nawaqes/, nawaqes-apk/)
- Setup guides for each server (Hugging Face, Koyeb, Render, VPS)
"""

import os
import zipfile
import subprocess
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path("/home/z/my-project")
OUTPUT_ZIP = PROJECT_ROOT / "download" / "nawaqes-DEPLOYMENT-WITH-ALL-TOKENS-v2.3.0.zip"

# ─── Extract tokens from git remotes ────────────────────────────
def extract_token_from_url(url: str) -> tuple[str, str]:
    """Returns (username, token) from a git remote URL."""
    if '@' not in url or '://' not in url:
        return ('', '')
    after_proto = url.split('://', 1)[1]
    creds, _ = after_proto.split('@', 1)
    parts = creds.split(':', 1)
    if len(parts) == 2:
        return (parts[0], parts[1])
    return ('', '')


def get_all_tokens() -> dict:
    """Read tokens from git config (Hugging Face + GitHub)."""
    tokens = {}
    try:
        hf_url = subprocess.check_output(
            ['git', 'config', '--get', 'remote.origin.url'],
            cwd=PROJECT_ROOT, stderr=subprocess.DEVNULL
        ).decode().strip()
        if hf_url:
            user, tok = extract_token_from_url(hf_url)
            if tok:
                tokens['HF_TOKEN'] = tok
                tokens['HF_USERNAME'] = user
    except Exception:
        pass

    try:
        gh_url = subprocess.check_output(
            ['git', 'config', '--get', 'remote.github.url'],
            cwd=PROJECT_ROOT, stderr=subprocess.DEVNULL
        ).decode().strip()
        if gh_url:
            user, tok = extract_token_from_url(gh_url)
            if tok:
                tokens['GITHUB_TOKEN'] = tok
                tokens['GITHUB_USERNAME'] = user
    except Exception:
        pass

    return tokens


# ─── Directories to include ─────────────────────────────────────
INCLUDE_DIRS = [
    ("src", "src"),
    ("dist", "dist"),
    ("public", "public"),
    ("nawaqes", "nawaqes"),
    ("nawaqes-apk", "nawaqes-apk"),
    ("scripts", "scripts"),
    ("upload", "upload"),
]

# ─── Minimal exclusions (only regenerable bulk) ─────────────────
EXCLUDE_DIRS = {
    "node_modules",
    ".git",
    ".gradle",
    ".idea",
    "__pycache__",
    ".cache",
    ".cxx",
    # webview-apk build outputs (regenerable via gradle)
    "intermediates",
    "mergeExtDexDebug",
    "mergeProjectDexDebug",
    "mergeDexRelease",
    "dexBuilderDebug",
    "dexBuilderRelease",
    "incremental",
    "zip-cache",
    "processed_res",
    "packaged_res",
    "compatible_screen_manifest",
    "nested_resources_validation_report",
    "binary_art_profile",
    "binary_art_profile_metadata",
    "combined_art_profile",
    "stable_resource_ids_file",
    "compile_and_runtime_not_namespaced_r_class_jar",
    "manifest_merge_blame_file",
    "dex_number_of_buckets_file",
    "dex_archive_input_jar_hashes",
    "generated",
    "build",
}

EXCLUDE_FILE_PATTERNS = (
    ".pyc", ".pyo",
    ".db", ".db-wal", ".db-shm",
    ".log",
    ".DS_Store", "Thumbs.db",
    "local.properties",
)

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB


def should_exclude_dir(dirpath: str) -> bool:
    return os.path.basename(dirpath) in EXCLUDE_DIRS


def should_exclude_file(filename: str) -> bool:
    return any(filename.endswith(ext) for ext in EXCLUDE_FILE_PATTERNS)


def add_directory_to_zip(zipf, src_dir: Path, arc_prefix: str):
    if not src_dir.exists():
        return
    added = 0
    skipped = 0
    for root, dirs, files in os.walk(src_dir):
        dirs[:] = [d for d in dirs if not should_exclude_dir(os.path.join(root, d))]
        for filename in files:
            if should_exclude_file(filename):
                skipped += 1
                continue
            abs_path = Path(root) / filename
            try:
                size = abs_path.stat().st_size
            except OSError:
                skipped += 1
                continue
            if size > MAX_FILE_SIZE:
                print(f"  SKIP (>{MAX_FILE_SIZE//(1024*1024)}MB): {abs_path}")
                skipped += 1
                continue
            rel_path = abs_path.relative_to(src_dir)
            arc_path = os.path.join(arc_prefix, str(rel_path))
            try:
                zipf.write(abs_path, arc_path)
                added += 1
            except (OSError, PermissionError) as e:
                print(f"  SKIP (error): {abs_path}: {e}")
                skipped += 1
    print(f"  + {added} files, {skipped} skipped")
    return added


def write_credentials_file(zipf, tokens: dict):
    """Write a SECRETS.md with ALL tokens and credentials."""
    content = f"""# 🔐 Nawaqes — All Deployment Credentials & Tokens

**Generated:** {datetime.now().isoformat()}
**Version:** v2.3.0

⚠️ **CRITICAL SECURITY WARNING** ⚠️

This file contains EVERY credential needed to deploy Nawaqes.
**DO NOT** share this file publicly or commit it to a public repository.
**Store securely** (1Password, Bitwarden, or encrypted USB drive).

---

## 1. Hugging Face (Production Server)

| Field | Value |
|-------|-------|
| Space URL | https://huggingface.co/spaces/safwatkhokha/nawaqes |
| App URL | https://safwatkhokha-nawaqes.hf.space |
| Username | `{tokens.get('HF_USERNAME', 'safwatkhokha')}` |
| Token | `{tokens.get('HF_TOKEN', 'NOT_FOUND')}` |
| Token Scope | write (Spaces, Datasets, Models) |
| Use | `git push` to deploy code, dataset upload for backups |

### Git remote
```bash
git remote add origin https://{tokens.get('HF_USERNAME', 'safwatkhokha')}:{tokens.get('HF_TOKEN', 'YOUR_HF_TOKEN')}@huggingface.co/spaces/safwatkhokha/nawaqes
git push origin main
```

### HF Space Secrets (set in Space → Settings → Repository secrets)
```
HF_TOKEN={tokens.get('HF_TOKEN', 'YOUR_HF_TOKEN')}
HF_BACKUP_REPO=safwatkhokha/nawaqes-backups
JWT_SECRET=nawaqes_secret_2024_xK9pL2mN8qR3wY6
ADMIN_EMAIL=admin@nawaqes.com
ADMIN_PASSWORD=Admin@2024
OWNER_EMAIL=owner@nawaqes.com
OWNER_PASSWORD=Owner@2024
FIREBASE_PROJECT_ID=nawaqes-app
FIREBASE_API_KEY=AIzaSyBIzywCvScpNMgR0WLT6HcalnRy0JhPf0Y
FIREBASE_AUTH_DOMAIN=nawaqes-app.firebaseapp.com
FIREBASE_STORAGE_BUCKET=nawaqes-app.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=1001594480276
FIREBASE_APP_ID=1:1001594480276:web:1edf938f6e7f6e3e303681
FIREBASE_MEASUREMENT_ID=G-M4KEGG4QFF
```

---

## 2. GitHub (Source Code Mirror)

| Field | Value |
|-------|-------|
| Repo URL | https://github.com/safwatkhokha/nawaqes |
| Username | `{tokens.get('GITHUB_USERNAME', 'safwatkhokha')}` |
| Token | `{tokens.get('GITHUB_TOKEN', 'NOT_FOUND')}` |
| Token Type | Personal Access Token (classic, ghp_) |
| Token Scope | repo (full control of private repos) |

### Git remote
```bash
git remote add github https://{tokens.get('GITHUB_USERNAME', 'safwatkhokha')}:{tokens.get('GITHUB_TOKEN', 'YOUR_GH_TOKEN')}@github.com/safwatkhokha/nawaqes.git
git push github main
```

---

## 3. Firebase Cloud Messaging (Push Notifications)

| Field | Value |
|-------|-------|
| Project ID | `nawaqes-app` |
| API Key | `AIzaSyBIzywCvScpNMgR0WLT6HcalnRy0JhPf0Y` |
| Auth Domain | `nawaqes-app.firebaseapp.com` |
| Storage Bucket | `nawaqes-app.firebasestorage.app` |
| Messaging Sender ID | `1001594480276` |
| App ID | `1:1001594480276:web:1edf938f6e7f6e3e303681` |
| Measurement ID | `G-M4KEGG4QFF` |

### Service Account (server-side FCM send)
- File: `upload/nawaqes-app-firebase-adminsdk-fbsvc-f3fb773f21.json`
- Client email: `firebase-adminsdk-fbsvc@nawaqes-app.iam.gserviceaccount.com`
- Private key ID: `f3fb773f217a6e4b73d6ffafe2270d52712f8f37`
- Upload to server at: `/data/firebase-service-account.json`

### Client config (for APK)
- File: `nawaqes-apk/firebase/firebase-config.json`

### VAPID key (Web Push)
Generate at: Firebase Console → Project Settings → Cloud Messaging → Web Configuration

---

## 4. App Credentials (Database / Auth)

| Field | Value |
|-------|-------|
| Admin Email | `admin@nawaqes.com` |
| Admin Password | `Admin@2024` |
| Owner Email | `owner@nawaqes.com` |
| Owner Password | `Owner@2024` |
| JWT Secret | `nawaqes_secret_2024_xK9pL2mN8qR3wY6` |
| JWT Expires | `7d` |
| Database | SQLite (`/data/nawaqes.db`) |
| Port | `7860` (Hugging Face) / `3000` (Render/Koyeb default) |

---

## 5. Deployment Targets

### A) Hugging Face Space (RECOMMENDED — currently in use)
```bash
# Clone the Space
git clone https://{tokens.get('HF_USERNAME')}:{tokens.get('HF_TOKEN')}@huggingface.co/spaces/safwatkhokha/nawaqes
cd nawaqes
npm install
npm run build
git add .
git commit -m "deploy"
git push origin main
```
- Auto-builds via Dockerfile
- Free tier: 16GB RAM, 2 vCPU
- URL: https://safwatkhokha-nawaqes.hf.space

### B) Render
```bash
# Create new Web Service from GitHub repo
# Settings:
#   - Build Command: npm install && npm run build
#   - Start Command: npm start
#   - Environment Variables: see section 1 above
```
Or use `render.yaml` (already in this ZIP).
- URL: https://nawaqes.onrender.com (after deploy)
- Free tier: 512MB RAM, sleeps after 15 min idle

### C) Koyeb
```bash
# Create new service from GitHub repo
# Or use koyeb CLI:
koyeb service create nawaqes --git github.com/safwatkhokha/nawaqes --git-branch main
```
Or use `koyeb.yaml` (already in this ZIP).
- URL: https://nawaqes-safwatkhokha.koyeb.app
- Free tier: 512MB RAM, 0.1 vCPU

### D) VPS (Self-hosted)
```bash
# Clone repo
git clone https://github.com/safwatkhokha/nawaqes.git
cd nawaqes
npm install
cp .env.example .env
# Edit .env with your values
npm run build
npm start  # runs on PORT (default 7860)
```
Recommended VPS: 1 vCPU, 1GB RAM minimum.
Use PM2 for process management:
```bash
npm install -g pm2
pm2 start dist/server.mjs --name nawaqes
pm2 startup
pm2 save
```

---

## 6. APK Build (Android)

### Option A: WebView APK (recommended, easier)
```bash
cd nawaqes-apk/webview-apk
# Edit app/src/main/java/com/nawaqes/app/MainActivity.java
# Update URL to your deployment
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk
```

### Option B: Native APK (with Capacitor)
```bash
cd nawaqes
npm run build:web
npx cap sync android
npx cap open android
# In Android Studio: Build → Generate Signed APK
```

### APK signing keystore
Generate once and keep safe:
```bash
keytool -genkey -v -keystore nawaqes.keystore -alias nawaqes \
  -keyalg RSA -keysize 2048 -validity 10000
```

---

## 7. Backup System

Auto-backup runs every 15 minutes to Hugging Face Datasets:
- Repo: `safwatkhokha/nawaqes-backups`
- Token: same HF_TOKEN above
- Restored automatically on container rebuild

Manual backup trigger:
```bash
curl -X POST https://safwatkhokha-nawaqes.hf.space/api/admin/backup \
  -H "Authorization: Bearer <admin-jwt-token>"
```

---

## 8. Files in this ZIP

```
nawaqes-DEPLOYMENT-WITH-ALL-TOKENS-v2.3.0.zip
├── SECRETS.md                          ← THIS FILE
├── .env                                ← DATABASE_URL
├── .env.example                        ← Template with all keys
├── README.md
├── Dockerfile                          ← Production Docker image
├── koyeb.yaml                          ← Koyeb config
├── render.yaml                         ← Render config
├── package.json
├── index.html
├── vite.config.ts
├── tsconfig.json
├── capacitor.config.ts                 ← APK config
├── start.sh                            ← Startup script
├── backup.sh                           ← Backup script
├── worklog.md                          ← Development log
├── src/                                ← Full TypeScript source (root)
├── dist/                               ← Built production bundle
├── public/                             ← Static files (PWA, SW, icons)
├── nawaqes/                            ← Backup copy of source
├── nawaqes-apk/                        ← Android APK source
│   ├── firebase/
│   │   ├── firebase-config.json        ← Firebase client config
│   │   ├── fcm-sender.ts
│   │   ├── notifications.ts
│   │   └── test-push.py / .js
│   ├── apk-source/                     ← Native Android source
│   ├── webview-apk/                    ← WebView APK source
│   ├── build-scripts/                  ← Build automation scripts
│   └── assets/                         ← App icons (all sizes)
├── scripts/                            ← Helper scripts
├── upload/
│   ├── nawaqes-app-firebase-adminsdk-fbsvc-f3fb773f21.json  ← FIREBASE SERVICE ACCOUNT (PRIVATE KEY)
│   └── ... (screenshots for support)
```

---

## 9. Recovery Checklist (if everything breaks)

- [ ] Restore ZIP from secure backup
- [ ] Verify Firebase project still exists at https://console.firebase.google.com
- [ ] Verify HF Space at https://huggingface.co/spaces/safwatkhokha/nawaqes
- [ ] Verify GitHub repo at https://github.com/safwatkhokha/nawaqes
- [ ] Restore HF Space Secrets (Section 1)
- [ ] Push code: `git push origin main`
- [ ] Wait 2-3 min for auto-build
- [ ] Test: https://safwatkhokha-nawaqes.hf.space/api/health
- [ ] Login: admin@nawaqes.com / Admin@2024
- [ ] Test push notifications via /firebase-setup-interactive

---

## 10. Security Notes

- All tokens above are LIVE and have WRITE access
- If any token leaks, **rotate immediately**:
  - HF: https://huggingface.co/settings/tokens
  - GitHub: https://github.com/settings/tokens
  - Firebase: https://console.firebase.google.com → Project Settings → Service Accounts
- JWT_SECRET change will log out all users (force re-login)
- ADMIN_PASSWORD change only affects new DB initialization

---

Generated by Nawaqes deployment tool.
"""
    info = zipfile.ZipInfo("SECRETS.md")
    info.date_time = (2026, 6, 21, 11, 0, 0)
    info.compress_type = zipfile.ZIP_DEFLATED
    zipf.writestr(info, content)


def main():
    print("=" * 60)
    print("🔐 Building DEPLOYMENT ZIP with ALL TOKENS")
    print("=" * 60)

    tokens = get_all_tokens()
    print(f"\nFound tokens:")
    for k, v in tokens.items():
        masked = v[:6] + '...' + v[-4:] if len(v) > 12 else '***'
        print(f"  {k}: {masked}")

    OUTPUT_ZIP.parent.mkdir(parents=True, exist_ok=True)
    if OUTPUT_ZIP.exists():
        OUTPUT_ZIP.unlink()

    total_added = 0
    with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
        # SECRETS.md (with all tokens inline)
        print("\n📝 Writing SECRETS.md with all credentials...")
        write_credentials_file(zipf, tokens)

        # Root files
        print("\n📁 Adding root files (.env, Dockerfile, configs)...")
        for fname in [
            ".env", ".env.example", ".gitignore", ".dockerignore", ".gitattributes",
            "Dockerfile", "README.md", "index.html", "package.json", "package-lock.json",
            "vite.config.ts", "tsconfig.json", "start.sh", "backup.sh",
            "capacitor.config.ts", "render.yaml", "koyeb.yaml", "bun.lock",
            "worklog.md",
        ]:
            fpath = PROJECT_ROOT / fname
            if fpath.exists():
                zipf.write(fpath, fname)
                total_added += 1
        print(f"  + {total_added} root files")

        # Source directories
        for src_rel, arc_rel in INCLUDE_DIRS:
            src_path = PROJECT_ROOT / src_rel
            if not src_path.exists():
                print(f"\n⚠️  SKIP (not found): {src_path}")
                continue
            print(f"\n📁 Adding {src_rel}/ -> {arc_rel}/ ...")
            add_directory_to_zip(zipf, src_path, arc_rel)

    size_mb = OUTPUT_ZIP.stat().st_size / (1024 * 1024)
    print()
    print("=" * 60)
    print(f"✅ Done!")
    print(f"   File: {OUTPUT_ZIP}")
    print(f"   Size: {size_mb:.2f} MB")
    print("=" * 60)
    print()
    print("⚠️  EXTREME SECURITY WARNING:")
    print("⚠️  This ZIP contains LIVE tokens with WRITE access.")
    print("⚠️  DO NOT upload to any public service.")
    print("⚠️  Store ONLY in encrypted storage (1Password / Bitwarden / USB).")


if __name__ == "__main__":
    main()
