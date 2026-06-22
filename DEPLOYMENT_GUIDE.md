# 🚀 دليل نشر مشروع نواقص (Nawaqes)

## الطريقة 1: Hugging Face Spaces (موصى بها - مجاني)

1. أنشئ حساب على [huggingface.co](https://huggingface.co)
2. أنشئ Space جديد من نوع **Docker**
3. ارفع ملفات المشروع باستخدام:
```bash
git clone https://huggingface.co/spaces/YOUR_USERNAME/nawaqes
cd nawaqes
# انسخ جميع ملفات المشروع هنا
git add .
git commit -m "Deploy Nawaqes v2.3.0"
git push
```

4. أضف المتغيرات البيئية في Settings > Repository Secrets:
- `JWT_SECRET`: مفتاح سري عشوائي
- `ADMIN_EMAIL`: بريد المدير
- `ADMIN_PASSWORD`: كلمة مرور المدير

## الطريقة 2: Render.com (مجاني)

1. أنشئ حساب على [render.com](https://render.com)
2. ارفع المشروع على GitHub
3. أنشئ خدمة جديدة من نوع **Web Service**
4. اختر مستودع GitHub
5. Render سيكتشف تلقائياً `render.yaml`

## الطريقة 3: Koyeb (مجاني)

1. أنشئ حساب على [koyeb.com](https://koyeb.com)
2. ارفع المشروع على GitHub
3. أنشئ خدمة جديدة
4. اختر مستودع GitHub
5. Koyeb سيكتشف تلقائياً `koyeb.yaml`

## الطريقة 4: خادم VPS

```bash
# تثبيت Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# رفع الملفات وفك الضغط
unzip nawaqes-v2.3.0-fixed.zip
cd nawaqes-project

# تثبيت التبعيات والبناء
npm install
cp .env.example .env
npm run build

# تشغيل الخادم
NODE_ENV=production PORT=7860 node dist/server.mjs
```

## بيانات المدير الافتراضية
- البريد: `admin@nawaqes.com`
- كلمة المرور: `Admin@2024`

## بيانات المالك الافتراضية
- البريد: `owner@nawaqes.com`
- كلمة المرور: `Owner@2024`
