#!/usr/bin/env python3
"""
Create a COMPLETE ZIP backup of the Nawaqes project INCLUDING all secret keys.

⚠️ WARNING: This ZIP contains sensitive credentials:
  - Firebase service account private key
  - Firebase API keys / VAPID keys
  - Admin/owner passwords
  - .env file with DATABASE_URL
  - JWT secret placeholders
DO NOT share this ZIP publicly or commit to public repositories.
"""

import os
import zipfile
from pathlib import Path

PROJECT_ROOT = Path("/home/z/my-project")
OUTPUT_ZIP = PROJECT_ROOT / "download" / "nawaqes-complete-WITH-SECRETS-v2.3.0.zip"

# Directories to include (everything except download which contains old zips)
INCLUDE_DIRS = [
    ("nawaqes", "nawaqes"),
    ("nawaqes-apk", "nawaqes-apk"),
    ("scripts", "scripts"),
    ("upload", "upload"),
]

# Minimal exclusions — only regenerable bulk artifacts
EXCLUDE_DIRS = {
    "node_modules",
    ".git",  # keep history lightweight; sources are on HF
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
    "build",  # all build outputs (will be rebuilt)
}

# File patterns to exclude (only truly regenerable junk)
EXCLUDE_FILE_PATTERNS = (
    ".pyc", ".pyo",
    ".db", ".db-wal", ".db-shm",
    ".log",
    ".DS_Store", "Thumbs.db",
    "local.properties",
)

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB


def should_exclude_dir(dirpath: str) -> bool:
    name = os.path.basename(dirpath)
    return name in EXCLUDE_DIRS


def should_exclude_file(filename: str) -> bool:
    for ext in EXCLUDE_FILE_PATTERNS:
        if filename.endswith(ext):
            return True
    return False


def add_directory_to_zip(zipf: zipfile.ZipFile, src_dir: Path, arc_prefix: str) -> tuple[int, int, int]:
    """Add src_dir to zip under arc_prefix. Returns (files_added, files_skipped, bytes_added)."""
    added = 0
    skipped = 0
    bytes_total = 0

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
                bytes_total += size
            except (OSError, PermissionError) as e:
                print(f"  SKIP (error: {e}): {abs_path}")
                skipped += 1

    return added, skipped, bytes_total


def add_standalone_files(zipf: zipfile.ZipFile) -> int:
    """Add standalone top-level files (.env, worklog, etc.)."""
    added = 0
    standalone_files = [
        "/home/z/my-project/.env",
        "/home/z/my-project/.env.example",
        "/home/z/my-project/.gitignore",
        "/home/z/my-project/.dockerignore",
        "/home/z/my-project/.gitattributes",
        "/home/z/my-project/Dockerfile",
        "/home/z/my-project/README.md",
        "/home/z/my-project/index.html",
        "/home/z/my-project/package.json",
        "/home/z/my-project/package-lock.json",
        "/home/z/my-project/vite.config.ts",
        "/home/z/my-project/tsconfig.json",
        "/home/z/my-project/start.sh",
        "/home/z/my-project/backup.sh",
        "/home/z/my-project/capacitor.config.ts",
        "/home/z/my-project/render.yaml",
        "/home/z/my-project/koyeb.yaml",
        "/home/z/my-project/bun.lock",
        "/home/z/my-project/worklog.md",
    ]
    for f in standalone_files:
        if os.path.exists(f):
            arc = os.path.basename(f)
            try:
                zipf.write(f, arc)
                added += 1
            except OSError as e:
                print(f"  SKIP {f}: {e}")
    return added


def add_directory_tree_to_zip(zipf: zipfile.ZipFile, src_dir: Path, arc_prefix: str):
    """Recursively add a directory including empty subdirectories."""
    if not src_dir.exists():
        return
    for root, dirs, files in os.walk(src_dir):
        dirs[:] = [d for d in dirs if not should_exclude_dir(os.path.join(root, d))]
        # Add the directory entry itself (so empty dirs are preserved)
        rel = os.path.relpath(root, src_dir)
        if rel != ".":
            arc_dir = os.path.join(arc_prefix, rel)
            zipf.writestr(f"{arc_dir}/", "")
        for filename in files:
            if should_exclude_file(filename):
                continue
            abs_path = Path(root) / filename
            try:
                size = abs_path.stat().st_size
            except OSError:
                continue
            if size > MAX_FILE_SIZE:
                print(f"  SKIP (>{MAX_FILE_SIZE//(1024*1024)}MB): {abs_path}")
                continue
            rel_path = abs_path.relative_to(src_dir)
            arc_path = os.path.join(arc_prefix, str(rel_path))
            try:
                zipf.write(abs_path, arc_path)
            except (OSError, PermissionError) as e:
                print(f"  SKIP (error: {e}): {abs_path}")


def write_readme(zipf: zipfile.ZipFile):
    """Write a WARNING README at the top of the zip."""
    readme = """# ⚠️ Nawaqes — النسخة الكاملة مع المفاتيح السرية ⚠️

## تحذير أمني خطير

هذا الملف يحتوي على **جميع المفاتيح السرية** للمشروع، بما في ذلك:
- 🔑 Firebase Service Account Private Key (مفتاح خاص كامل)
- 🔑 Firebase API Keys و VAPID Keys
- 🔑 Admin/Owner passwords (admin@nawaqes.com / Admin@2024)
- 🔑 JWT_SECRET placeholders
- 🔑 DATABASE_URL
- 🔑 ملف .env الفعلي

**ممنوع** مشاركة هذا الملف:
- ❌ في مستودعات Git العامة (GitHub, GitLab, إلخ)
- ❌ في Hugging Face Spaces أو Datasets العامة
- ❌ في Discord أو Telegram أو أي دردشة جماعية
- ❌ مع أي طرف ثالث غير موثوق

احفظ هذا الملف في مكان آمن (مثل 1Password / Bitwarden / USB مشفّر).

## تاريخ الإنشاء: 2026-06-21

## المحتويات

```
nawaqes-complete-WITH-SECRETS-v2.3.0.zip
├── (ملفات الجذر: Dockerfile, package.json, index.html, README.md, .env, ...)
├── src/                       # كود المصدر الرئيسي
├── dist/                      # النسخة المبنية
├── public/                    # ملفات ثابتة + Service Worker + PWA
├── nawaqes/                   # نسخة احتياطية من المصدر داخل مجلد
├── nawaqes-apk/               # تطبيق أندرويد كامل (apk-source + webview-apk)
│   ├── firebase/              # ⚠️ firebase-config.json بمفاتيح فعلية
│   └── assets/                # أيقونات التطبيق
├── scripts/                   # سكربتات مساعدة
├── upload/                    # ⚠️ يحتوي nawaqes-app-firebase-adminsdk-fbsvc-f3fb773f21.json
│                              #    (مفتاح Firebase Service Account الكامل!)
└── worklog.md                 # سجل التعديلات
```

## ملفات سرية محددة في هذا الـ ZIP

| الملف | المحتوى السري |
|-------|----------------|
| `.env` | DATABASE_URL |
| `upload/nawaqes-app-firebase-adminsdk-fbsvc-f3fb773f21.json` | Firebase Service Account Private Key |
| `nawaqes-apk/firebase/firebase-config.json` | Firebase API keys (placeholders) |
| `nawaqes/.env.example` | يحتوي على Firebase API keys فعلية + admin passwords |
| `nawaqes/src/lib/firebase.ts` | قد يحتوي على مفاتيح Firebase |

## الاستعادة

### 1) تطبيق الويب
```bash
unzip nawaqes-complete-WITH-SECRETS-v2.3.0.zip -d nawaqes-restore
cd nawaqes-restore
npm install
# .env موجود بالفعل في الملف، عدّله إن لزم
npm run build
npm start  # تشغيل على المنفذ 7860
```

### 2) تطبيق APK
```bash
cd nawaqes-apk/webview-apk
# انسخ firebase-config.json إلى app/
cp ../firebase/firebase-config.json app/
./gradlew assembleRelease
# APK سيكون في app/build/outputs/apk/release/
```

### 3) Firebase Setup
- مفتاح Service Account موجود في: `upload/nawaqes-app-firebase-adminsdk-fbsvc-f3fb773f21.json`
- ارفعه على السيرفر إلى: `/data/firebase-service-account.json`
- أو اضبط FIREBASE_SERVICE_ACCOUNT_PATH في .env

## المميزات في هذه النسخة (v2.3.0)

✅ دعم رفع صور متعددة لكل إعلان + معرض صور كامل في صفحة التفاصيل
✅ Service Worker v3.1 (self-unregistering) لحل مشكلة الشاشة البيضاء
✅ ErrorBoundary لمنع الانهيار الكامل
✅ نظام نسخ احتياطي تلقائي لـ HF Datasets (كل 15 دقيقة)
✅ استعادة تلقائية للبيانات عند إعادة بناء الحاوية
✅ WebSocket للتحديثات الفورية (موافقات الأدمن، تعليقات البث المباشر)
✅ حالة "متصل الآن" عبر WebSocket (وليس localStorage فقط)
✅ دعم تعدد اللغات (عربي/إنجليزي) مع RTL
✅ إشعارات داخل التطبيق (تتجاوز قيود iframe على HF)
✅ WebRTC للبث المباشر والمكالمات المرئية
✅ "تذكّرني" في صفحة تسجيل الدخول
✅ حذف الإعلانات من قبل صاحبها
✅ رابط تحميل APK أسفل تسجيل الدخول

## بيانات الإنتاج

- Hugging Face Space: https://huggingface.co/spaces/safwatkhokha/nawaqes
- رابط التطبيق: https://safwatkhokha-nawaqes.hf.space
- المنفذ الافتراضي: 7860
- قاعدة البيانات: SQLite (better-sqlite3) في `/data/nawaqes.db`
- النسخ الاحتياطي: Hugging Face Datasets (HF_BACKUP_REPO)

## بيانات الدخول الافتراضية

| الدور | البريد الإلكتروني | كلمة المرور |
|-------|-------------------|-------------|
| المدير | admin@nawaqes.com | Admin@2024 |
| المالك | owner@nawaqes.com | Owner@2024 |

## ⚠️ تنبيه نهائي

بعد استخراج هذا الملف، احذفه فوراً من أي جهاز مشترك.
"""
    info = zipfile.ZipInfo("README_WITH_SECRETS_WARNING.md")
    info.date_time = (2026, 6, 21, 10, 0, 0)
    info.compress_type = zipfile.ZIP_DEFLATED
    zipf.writestr(info, readme)


def main():
    print("=" * 60)
    print("⚠️  Creating COMPLETE backup WITH ALL SECRET KEYS")
    print("=" * 60)
    print(f"Output: {OUTPUT_ZIP}")
    OUTPUT_ZIP.parent.mkdir(parents=True, exist_ok=True)

    total_added = 0
    total_skipped = 0
    total_bytes = 0

    with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
        # Warning README at top
        print("Writing warning README...")
        write_readme(zipf)

        # Root standalone files (incl. .env!)
        print("Adding root standalone files (.env, Dockerfile, package.json, ...)...")
        total_added += add_standalone_files(zipf)

        # Root source tree (src/, dist/, public/) — important for HF Space
        for root_subdir in ["src", "dist", "public"]:
            src_path = PROJECT_ROOT / root_subdir
            if src_path.exists():
                print(f"Adding {root_subdir}/ ...")
                a, s, b = add_directory_to_zip(zipf, src_path, root_subdir)
                total_added += a
                total_skipped += s
                total_bytes += b
                print(f"  + {a} files ({b//1024} KB)")

        # Other directories
        for src_rel, arc_rel in INCLUDE_DIRS:
            src_path = PROJECT_ROOT / src_rel
            if not src_path.exists():
                print(f"SKIP (not found): {src_path}")
                continue
            print(f"Adding {src_rel}/ -> {arc_rel}/ ...")
            a, s, b = add_directory_to_zip(zipf, src_path, arc_rel)
            total_added += a
            total_skipped += s
            total_bytes += b
            print(f"  + {a} files ({b//1024} KB)")

    size_mb = OUTPUT_ZIP.stat().st_size / (1024 * 1024)
    print()
    print("=" * 60)
    print(f"✅ Done!")
    print(f"   File: {OUTPUT_ZIP}")
    print(f"   Size: {size_mb:.2f} MB")
    print(f"   Files added: {total_added}")
    print(f"   Files skipped: {total_skipped}")
    print(f"   Raw size: {total_bytes / (1024*1024):.2f} MB")
    print("=" * 60)
    print()
    print("⚠️  WARNING: This ZIP contains ALL SECRET KEYS.")
    print("⚠️  DO NOT share publicly. Store securely.")


if __name__ == "__main__":
    main()
