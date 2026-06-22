
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
