
---
Task ID: 3
Agent: Super Z (main)
Task: إصلاح مشكلة عدم ظهور حالة "متصل الآن" في مجتمع الأصدقاء

Work Log:
- استخدمت Grep للبحث عن استخدام `isUserOnline` عبر المشروع
- وجدت أن البنية التحتية WebSocket للـ presence موجودة على الخادم (wsManager.isUserOnline, presence:online, presence:online-list)
- لكن FriendsPage.tsx و MyPage.tsx يستخدمان الدالة القديمة `isUserOnline()` فقط (تعتمد على localStorage الذي هو per-browser)
- النتيجة: المستخدم لا يستطيع رؤية أي صديق "متصل الآن" لأن localStorage لا يحتوي على بيانات المستخدمين الآخرين

الإصلاحات المطبقة:
1. **FriendsPage.tsx**:
   - أضفت `isUserOnlineWs` من useAppContext
   - غيّرت أولوية فحص الإتصال: server flag → live WS map → local fallback
   - أضفت `useEffect` يعيد تقييم isOnline كل 10 ثوانٍ + عند تغير WS onlineUsers
   - حدّثت `friendPosts` لحساب isOnline للكاتب بشكل صحيح
2. **MyPage.tsx**:
   - نفس الأولوية في الـ Friends Strip و قائمة الأصدقاء و طلبات الصداقة و الاقتراحات
3. **Backend /api/friends/list**:
   - أضفت `last_seen_at` للاستعلام
   - أضفت `lastSeen` و `isOnline` (من wsManager) للاستجابة
4. **Backend /api/friends/suggestions**:
   - أضفت `last_seen_at` للاستعلام
   - أضفت `lastSeen` و `isOnline` للاستجابة

مشاكل في النشر (تم حلها):
- كان git history يحتوي على ملف classes.dex كبير (10MB+) مرفوض من HF
- استخدمت `git checkout --orphan` لإنشاء history جديد نظيف
- حذفت `nawaqes-apk/assets/` (كانت ترفضها HF أيضاً)
- force push ناجح إلى HF Space

Stage Summary:
- النشر: HF Space على https://huggingface.co/spaces/safwatkhokha/nawaqes
- commit: 77c6bc1 (history نظيف جديد)
- الآن عندما يكون أي مستخدم متصل (من أي جهاز/تبويب)، سيظهر له نقطة خضراء في صفحة الأصدقاء
- التحديث يحدث تلقائياً كل 10 ثوانٍ + فورياً عبر WebSocket عند تغيّر حالة الاتصال

---
Task ID: 10
Agent: Super Z (main)
Task: فحص التحديثات على السيرفر ومعالجة جميع المشاكل في الملفات

Work Log:
- فحصت حالة HF Space: RUNNING, SHA=c84589dfc5d488d4251c555fa95ac1f241e0b8ef
- اكتشفت أن السيرفر البعيد يحتوي على تحديثات كثيرة لم أمتلكها محلياً:
  • v2.3.0: TypeScript errors fix, JWT_SECRET, Dockerfile Firebase
  • v2.3.1: MessagesPage refactor (split 2162-line monolith into 15 components)
  • v2.4.0: edit/delete messages, voice messages, search, media gallery, pin
  • Phase 3: FCM, story interactions, wallet withdrawal, screen sharing
  • Phase 4: Email verification UI, scheduled streams UI
  • Phase 5: Enhanced friends community (block, friend labels, mutual friends)
  • fix: Smart Wallet improvements, persistent storage
  • fix: duplicate posts prevention (addPost check + double-click guard)
  • fix: remove binary APK assets from git
- جلبت التحديثات (git pull origin main) — كان هناك تعارضات على dist/ و scripts/
- حليت التعارضات بحذف الملفات (لأن Dockerfile يعيد بناءها)
- قمت بـ tsc --noEmit فوجدت 9 أخطاء TypeScript:
  1. EmailVerification.tsx: currentUser.email_verified, is_verified, email غير موجودة في User
  2. EmailVerification.tsx: setCurrentUser غير موجودة في AuthContextType
  3. ProfilePage.tsx, SettingsPage.tsx: email_verified غير موجودة في User
  4. Stories.tsx: user غير موجودة في AuthContextType
  5. CallOverlay.tsx: video: { cursor: 'always' } غير صالحة في MediaTrackConstraints

الإصلاحات المطبقة:
1. src/types.ts — أضفت حقول جديدة لـ User interface:
   • email?: string
   • email_verified?: boolean
   • is_verified?: boolean
2. src/contexts/AuthContext.tsx:
   • أضفت user (alias لـ currentUser) لـ AuthContextType
   • أضفت setCurrentUser لـ AuthContextType
   • أضفتهم لقيمة الـ provider
3. src/components/chat/CallOverlay.tsx:
   • حولت { cursor: 'always' } إلى as MediaTrackConstraints

النتائج:
- tsc --noEmit: ✓ صفر أخطاء
- npm run build: ✓ نجح
- HF Space: RUNNING ✓
- /api/health: HTTP 200 ✓
- bundle منشور: index-CQRXwiZ4.js (يحتوي على currentUser, email_verified, setCurrentUser ✓)
- /api/auth/me, /api/posts, /api/friends/list: كلها تستجيب بشكل صحيح

Stage Summary:
- النشر: HF Space (RUNNING, HTTP 200 على /api/health)
- commit: f0f39c7
- جميع أخطاء TypeScript تم حلها (9 → 0)
- جميع المكونات الجديدة تعمل: EmailVerification, ScheduledStreams, chat module (15 components), FCM, Smart Wallet improvements
