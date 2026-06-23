# ⚠️ Nawaqes — النسخة الكاملة مع المفاتيح السرية ⚠️

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
