// ─── AI Promotion Intelligence Routes ───────────────────────────────
// هذا الملف يحتوي على كل ما يتعلق بالذكاء الاصطناعي للترويج
import { Router, Request, Response } from 'express';
import database from '../database/index.js';
import ZAI from 'z-ai-web-dev-sdk';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';

const router = Router();

// ─── Package name mapping: English ID → Arabic display name ───────────
const packageNameAr: Record<string, string> = {
  basic: 'أساسي',
  standard: 'قياسي',
  premium: 'مميز',
  vip: 'VIP',
  city_target: 'استهداف مدن',
  interest_target: 'استهداف اهتمامات',
};

/** Convert English package IDs to Arabic display names */
function arPkg(pkg: string): string {
  return packageNameAr[pkg] || pkg;
}

/** Replace any English package IDs found in a text string with Arabic names */
function replacePkgNamesInText(text: string): string {
  if (!text) return text;
  let result = text;
  // Replace each English ID with Arabic name, handling word boundaries
  for (const [eng, ar] of Object.entries(packageNameAr)) {
    // Match the English ID as a standalone word (not inside another word)
    const regex = new RegExp(`\\b${eng}\\b`, 'g');
    result = result.replace(regex, ar);
  }
  return result;
}

// ─── Package prices from frontend (source of truth) ──────────────────
const packagePrices: Record<string, { price: number; reach: number; days: number; notifications: number }> = {
  basic: { price: 50, reach: 900, days: 3, notifications: 30 },
  standard: { price: 120, reach: 3000, days: 5, notifications: 100 },
  premium: { price: 250, reach: 8000, days: 7, notifications: 250 },
  vip: { price: 500, reach: 25000, days: 10, notifications: 600 },
  city_target: { price: 120, reach: 4500, days: 5, notifications: 150 },
  interest_target: { price: 200, reach: 7000, days: 5, notifications: 200 },
};

// ─── Initialize Z-AI SDK ────────────────────────────────────────────
let zaiInstance: any = null;
let aiAvailable: boolean | null = null; // null = not tested yet
let aiCheckTime: number = 0;

async function getAI() {
  // If AI was recently unavailable, skip trying for 5 minutes to avoid repeated timeouts
  if (aiAvailable === false && (Date.now() - aiCheckTime) < 5 * 60 * 1000) {
    return null;
  }
  try {
    if (!zaiInstance) {
      zaiInstance = await ZAI.create();
    }
    aiAvailable = true;
    return zaiInstance;
  } catch (error: any) {
    aiAvailable = false;
    aiCheckTime = Date.now();
    console.log('[AI] SDK unavailable - using fallback responses for 5 minutes');
    return null;
  }
}

/** Try AI completion with fallback - returns null if AI is unavailable */
async function tryAICompletion(messages: any[], options: { temperature?: number; max_tokens?: number } = {}): Promise<string | null> {
  const zai = await getAI();
  if (!zai) return null;

  try {
    const completion = await zai.chat.completions.create({
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 800,
    });
    return completion.choices?.[0]?.message?.content || null;
  } catch (error: any) {
    // Mark AI as unavailable and suppress repeated error logs
    aiAvailable = false;
    aiCheckTime = Date.now();
    console.log('[AI] API request failed - switching to fallback for 5 minutes');
    return null;
  }
}

// ─── Helper: Get post by ID ─────────────────────────────────────────
function getPostById(postId: string): any | null {
  const db = database;
  const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
  return row || null;
}

// ─── Helper: Get user by ID ─────────────────────────────────────────
function getUserById(userId: string): any | null {
  const db = database;
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  return row || null;
}

// ═══════════════════════════════════════════════════════════════════════
// 1. AI استهداف تلقائي ذكي - Auto-Targeting
// يحلل محتوى المنشور ويقترح أفضل استهداف (اهتمامات، مدن، فئة عمرية)
// ═══════════════════════════════════════════════════════════════════════
router.post('/auto-target', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { postId, content, category, price, location } = req.body;
    const userId = (req as any).user?.userId;

    // If no specific post selected, return general targeting suggestions instead of error
    if (!content && !postId) {
      const categoryToInterests: Record<string, string[]> = {
        phones: ['phones', 'electronics'],
        electronics: ['electronics', 'phones'],
        cars: ['cars'],
        realEstate: ['realEstate'],
        games: ['games', 'electronics'],
        fashion: ['fashion', 'beauty'],
        beauty: ['beauty', 'fashion'],
        sports: ['sports'],
        food: ['food'],
        jobs: ['jobs', 'education'],
        services: ['services', 'jobs'],
        education: ['education', 'books'],
        books: ['books', 'education'],
        animals: ['animals'],
        travel: ['travel', 'photography'],
        photography: ['photography', 'travel'],
        health: ['health', 'beauty'],
      };

      // Try to get user's most recent post for context
      let userCategory = category || 'other';
      let userContent = '';
      if (userId) {
        try {
          const lastPost = database.prepare('SELECT category, content FROM posts WHERE author_id = ? ORDER BY created_at DESC LIMIT 1').get(userId) as any;
          if (lastPost) {
            userCategory = lastPost.category || userCategory;
            userContent = lastPost.content || '';
          }
        } catch { /* ignore */ }
      }

      // Try AI targeting based on user's recent posts
      const aiContent = await tryAICompletion([
        {
          role: 'system',
          content: `أنت خبير تسويق على منصة "نواقص". المستخدم لم يحدد منشوراً بعينه.
حلل نشاطه العام واقترح أفضل استهداف. أجب بـ JSON فقط:
{
  "suggestedInterests": ["interest1", "interest2"],
  "suggestedCities": ["مدينة1"],
  "suggestedAgeRange": {"min": 18, "max": 45},
  "suggestedPackage": "basic|standard|premium|vip|city_target|interest_target",
  "confidence": 0.4,
  "reasoning": "شرح بالعربي",
  "contentSuggestions": ["اقتراح1"],
  "estimatedReachMultiplier": 1.0
}`
        },
        {
          role: 'user',
          content: `لم أحدد منشوراً محدداً. تصنيف نشاطي: ${userCategory}. محتوى آخر منشور: ${userContent.slice(0, 200)}`
        }
      ]);

      if (aiContent) {
        try {
          const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
          const aiResult = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

          if (aiResult) {
            // Convert English package names to Arabic
            if (aiResult.suggestedPackage) {
              aiResult.suggestedPackage = arPkg(aiResult.suggestedPackage);
            }
            return res.json({ success: true, data: aiResult });
          }
        } catch { /* fallback below */ }
      }

      return res.json({
        success: true,
        data: {
          suggestedInterests: categoryToInterests[userCategory] || ['other'],
          suggestedCities: [location || 'القاهرة'],
          suggestedAgeRange: { min: 18, max: 45 },
          suggestedPackage: arPkg('standard'),
          confidence: 0.4,
          reasoning: 'لم يتم تحديد منشور محدد. هذه اقتراحات عامة بناءً على نشاطك. اختر منشوراً محدداً للحصول على استهداف أدق.',
          contentSuggestions: ['اختر منشوراً محدداً للحصول على استهداف أكثر دقة', 'أضف صورة عالية الجودة', 'حدد السعر والموقع بوضوح'],
          estimatedReachMultiplier: 1.0,
        },
      });
    }

    // Get post data if postId provided
    let postData: any = {};
    if (postId) {
      const post = getPostById(postId);
      if (post) {
        postData = {
          content: post.content || '',
          category: post.category || '',
          price: post.price || 0,
          location: post.location || '',
          type: post.type || '',
        };
      }
    }

    const postContent = content || postData.content || '';
    const postCategory = category || postData.category || '';
    const postPrice = price || postData.price || 0;
    const postLocation = location || postData.location || '';

    const aiContent = await tryAICompletion([
      {
        role: 'system',
        content: `أنت خبير تسويق وترويج على منصة إعلانات ذكية في مصر اسمها "نواقص".
تحلل المنشورات وتقترح أفضل استهداف للترويج.

الاهتمامات المتاحة: phones, electronics, games, cars, realEstate, fashion, beauty, sports, food, jobs, services, education, books, animals, travel, photography, health, other

المدن المصرية الرئيسية: القاهرة، الجيزة، الإسكندرية، المنصورة، طنطا، الزقازيق، بورسعيد، السويس، الإسماعيلية، الفيوم، أسيوط، المنيا، سوهاج، قنا، الأقصر، أسوان، دمياط، كفر الشيخ، بنها، شبين الكوم، مرسى مطروح، الغردقة، شرم الشيخ، دهب، العريش، التجمع الخامس، نصر

أجب دائماً بـ JSON فقط بالشكل التالي:
{
  "suggestedInterests": ["interest1", "interest2"],
  "suggestedCities": ["مدينة1", "مدينة2"],
  "suggestedAgeRange": {"min": 18, "max": 45},
  "suggestedPackage": "basic|standard|premium|vip|city_target|interest_target",
  "confidence": 0.85,
  "reasoning": "شرح بالعربي لماذا هذا الاستهداف مناسب",
  "contentSuggestions": ["اقتراح1 لتحسين المنشور", "اقتراح2"],
  "estimatedReachMultiplier": 1.5
}`
      },
      {
        role: 'user',
        content: `حلل هذا المنشور واقترح أفضل استهداف:
المحتوى: ${postContent}
التصنيف: ${postCategory}
السعر: ${postPrice} ج.م
الموقع: ${postLocation}
${userId ? `رقم المستخدم: ${userId}` : ''}`
      }
    ], { max_tokens: 1000 });

    let aiResult;
    try {
      const content = aiContent || '';
      // Extract JSON from AI response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      aiResult = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      // Convert suggestedPackage from English to Arabic
      if (aiResult.suggestedPackage) {
        aiResult.suggestedPackage = arPkg(aiResult.suggestedPackage);
      }
    } catch {
      aiResult = {
        suggestedInterests: [postCategory || 'other'],
        suggestedCities: [postLocation || 'القاهرة'],
        suggestedAgeRange: { min: 18, max: 45 },
        suggestedPackage: arPkg('standard'),
        confidence: 0.5,
        reasoning: 'تحليل أساسي بناءً على تصنيف المنشور',
        contentSuggestions: [],
        estimatedReachMultiplier: 1.0,
      };
    }

    res.json({ success: true, data: aiResult });
  } catch (error: any) {
    console.error('[AI] Auto-target error:', error.message);
    // Fallback with smart rule-based targeting
    const { content, category, price, location } = req.body;
    const categoryToInterests: Record<string, string[]> = {
      phones: ['phones', 'electronics'],
      electronics: ['electronics', 'phones'],
      cars: ['cars'],
      realEstate: ['realEstate'],
      games: ['games', 'electronics'],
      fashion: ['fashion', 'beauty'],
      beauty: ['beauty', 'fashion'],
      sports: ['sports'],
      food: ['food'],
      jobs: ['jobs', 'education'],
      services: ['services', 'jobs'],
      education: ['education', 'books'],
      books: ['books', 'education'],
      animals: ['animals'],
      travel: ['travel', 'photography'],
      photography: ['photography', 'travel'],
      health: ['health', 'beauty'],
    };
    const cat = category || 'other';
    res.json({
      success: true,
      data: {
        suggestedInterests: categoryToInterests[cat] || ['other'],
        suggestedCities: [location || 'القاهرة'],
        suggestedAgeRange: { min: 18, max: 45 },
        suggestedPackage: price && price > 5000 ? arPkg('premium') : arPkg('standard'),
        confidence: 0.6,
        reasoning: `اقتراح تلقائي بناءً على تصنيف المنشور (${cat})`,
        contentSuggestions: ['أضف صورة عالية الجودة', 'حدد السعر بوضوح', 'اذكر حالة المنتج'],
        estimatedReachMultiplier: 1.0,
      },
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 2. AI مراجعة تلقائية لطلبات الترويج - Auto Review
// يحلل المنشور ويقرر ما إذا كان مناسباً للترويج
// ═══════════════════════════════════════════════════════════════════════
router.post('/review-promotion', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { postId, content, category, price } = req.body;

    if (!content && !postId) {
      return res.status(400).json({ error: 'محتوى المنشور أو رقم المنشور مطلوب' });
    }

    let postContent = content || '';
    let postCategory = category || '';
    let postPrice = price || 0;

    if (postId) {
      const post = getPostById(postId);
      if (post) {
        postContent = post.content || postContent;
        postCategory = post.category || postCategory;
        postPrice = post.price || postPrice;
      }
    }

    const zai = await getAI();
    if (!zai) {
      const { content, category } = req.body;
      const hasInappropriate = /سب|لعن|حما|اقت|سلا|سكر/i.test(content || '');
      const hasPrice = /ج\.م|جنيه|EGP|سعر|\d{3,}/.test(content || '');
      const hasImage = /صور|image|img|صورة/i.test(content || '');

      return res.json({
        success: true,
        data: {
          approved: !hasInappropriate,
          score: hasInappropriate ? 20 : (hasPrice ? 75 : 55),
          issues: hasInappropriate ? ['المحتوى قد يحتوي على كلمات غير مناسبة'] : [],
          suggestions: [
            ...(hasPrice ? [] : ['أضف السعر لزيادة مصداقية الإعلان']),
            ...(hasImage ? [] : ['أضف صورة للمنتج لجذب المزيد']),
            'اجعل العنوان واضح ومباشر',
          ],
          riskLevel: hasInappropriate ? 'high' : 'low',
          category: category || 'other',
          summary: hasInappropriate
            ? 'المحتوى يحتاج مراجعة يدوية'
            : 'المحتوى يبدو مناسباً للترويج',
        },
      });
    }
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `أنت مراجع محتوى ذكي على منصة إعلانات مصرية اسمها "نواقص".
مهمتك مراجعة المنشورات المطلوب ترويجها والتأكد من:
1. المحتوى مناسب ولا يحتوي على شيء غير قانوني أو مسيء
2. المنشور واضح ويحتوي على معلومات كافية
3. السعر معقول ومنطقي
4. التصنيف صحيح
5. لا يوجد سبام أو إعلانات مضللة

أجب بـ JSON فقط:
{
  "approved": true/false,
  "score": 0-100,
  "issues": ["مشكلة1", "مشكلة2"],
  "suggestions": ["اقتراح1", "اقتراح2"],
  "riskLevel": "low|medium|high",
  "category": "التصنيف الصحيح",
  "summary": "ملخص المراجعة بالعربي"
}`
        },
        {
          role: 'user',
          content: `راجع هذا المنشور للترويج:
المحتوى: ${postContent}
التصنيف: ${postCategory}
السعر: ${postPrice} ج.م`
        }
      ],
      temperature: 0.3,
      max_tokens: 800,
    });

    let aiResult;
    try {
      const content = completion.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      aiResult = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      aiResult = {
        approved: true,
        score: 70,
        issues: [],
        suggestions: [],
        riskLevel: 'low',
        category: postCategory,
        summary: 'مراجعة تلقائية - المحتوى يبدو مناسباً',
      };
    }

    res.json({ success: true, data: aiResult });
  } catch (error: any) {
    console.error('[AI] Review error:', error.message);
    // Fallback rule-based review
    const { content, category } = req.body;
    const hasInappropriate = /سب|لعن|حما|اقت|سلا|سكر/i.test(content || '');
    const hasPrice = /ج\.م|جنيه|EGP|سعر|\d{3,}/.test(content || '');
    const hasImage = /صور|image|img|صورة/i.test(content || '');

    res.json({
      success: true,
      data: {
        approved: !hasInappropriate,
        score: hasInappropriate ? 20 : (hasPrice ? 75 : 55),
        issues: hasInappropriate ? ['المحتوى قد يحتوي على كلمات غير مناسبة'] : [],
        suggestions: [
          ...(hasPrice ? [] : ['أضف السعر لزيادة مصداقية الإعلان']),
          ...(hasImage ? [] : ['أضف صورة للمنتج لجذب المزيد']),
          'اجعل العنوان واضح ومباشر',
        ],
        riskLevel: hasInappropriate ? 'high' : 'low',
        category: category || 'other',
        summary: hasInappropriate
          ? 'المحتوى يحتاج مراجعة يدوية'
          : 'المحتوى يبدو مناسباً للترويج',
      },
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 3. AI مساعد ترويج ذكي - Promotion Assistant Chat
// يجاوب على أسئلة المستخدمين عن الترويج
// ═══════════════════════════════════════════════════════════════════════
router.post('/assistant', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { message, context, userId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'الرسالة مطلوبة' });
    }

    // Gather user context
    let userInfo = '';
    if (userId) {
      const user = getUserById(userId);
      if (user) {
        const db = database;
        const userPosts = db.prepare('SELECT COUNT(*) as count FROM posts WHERE author_id = ?').get(userId) as any;
        const userPromos = db.prepare('SELECT COUNT(*) as count FROM posts WHERE author_id = ? AND is_promoted = 1').get(userId) as any;
        const walletBalance = user.wallet_balance || 0;
        userInfo = `
معلومات المستخدم:
- الاسم: ${user.name}
- رصيد المحفظة: ${walletBalance} ج.م
- عدد المنشورات: ${userPosts?.count || 0}
- عدد الترويجات: ${userPromos?.count || 0}
- الاهتمامات: ${user.interests || 'غير محدد'}
- الموقع: ${user.location || 'غير محدد'}`;

        // Fetch actual posts content for AI context
        const userPostsList = db.prepare('SELECT id, content, category, price, location, type, image, likes, comments, is_promoted, promotion_status, created_at FROM posts WHERE author_id = ? ORDER BY created_at DESC LIMIT 20').all(userId) as any[];
        const postsSummary = userPostsList.map((p: any, i: number) =>
          `${i+1}. [${p.is_promoted ? 'مروّج' : 'غير مروّج'}] "${p.content?.slice(0, 100)}..." | تصنيف: ${p.category || 'عام'} | سعر: ${p.price || 'غير محدد'} ج.م | إعجابات: ${p.likes || 0} | ${p.image ? '📸 صورة' : '❌ بدون صورة'}`
        ).join('\n');

        if (postsSummary) {
          userInfo += `\n\nمنشورات المستخدم:\n${postsSummary}`;
        }
      }
    }

    const zai = await getAI();
    if (!zai) {
      const { message } = req.body;
      const msg = (message || '').toLowerCase();
      let reply = '';

      if (msg.includes('باقة') || msg.includes('أفضل') || msg.includes('اقترح')) {
        reply = 'أقترح باقة "مميز" - الأكثر طلباً! بـ 250 ج.م تحصل على 8,000 وصول و7 أيام ترويج مع رسائل ترويجية مباشرة. إذا ميزانيتك أقل، ابدأ بباقة "قياسي" بـ 120 ج.م.';
      } else if (msg.includes('سعر') || msg.includes('كم') || msg.includes('تكلفة')) {
        reply = 'أسعار الترويج تبدأ من 50 ج.م للباقة الأساسية. الباقة القياسية 120 ج.م، المميزة 250 ج.م، وVIP بـ 500 ج.م. كلما زادت الباقة، زاد الوصول لإعلانك!';
      } else if (msg.includes('كيف') || msg.includes('طريقة') || msg.includes('شرح')) {
        reply = 'الترويج سهل! 1) اختر إعلانك، 2) اضغط "ترويج"، 3) اختر الباقة المناسبة، 4) ادفع من محفظتك. بعد موافقة الإدارة خلال دقائق، يبدأ الترويج فوراً!';
      } else if (msg.includes('تحسين') || msg.includes('نصيحة') || msg.includes('نصائح')) {
        reply = 'نصائح لزيادة فعالية الترويج: 1) أضف صورة واضحة عالية الجودة، 2) اكتب عنوان جذاب، 3) حدد السعر بوضوح، 4) اختر الاستهداف المناسب لجمهورك، 5) رد على التعليقات بسرعة!';
      } else {
        reply = 'أنا مساعد الترويج الذكي! يمكنني مساعدتك في: اختيار الباقة المناسبة، تحسين إعلانك، نصائح لزيادة الوصول، أو أي سؤال عن الترويج. ماذا تريد أن تعرف؟';
      }

      return res.json({ success: true, reply });
    }
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `أنت مساعد ذكي للترويج على منصة "نواقص" - منصة الإعلانات الذكية في مصر.
مهمتك مساعدة المستخدمين في:
- اختيار أفضل باقة ترويج لميزانيتهم
- تحسين محتوى إعلاناتهم
- فهم كيف يعمل الترويج
- نصائح لزيادة الوصول والمبيعات
- حل مشاكل الترويج
- تحليل منشوراتهم واقتراح أفضلها للترويج

باقات الترويج المتاحة:
- أساسي (50 ج.م): 900 وصول، 3 أيام، 30 إشعار
- قياسي (120 ج.م): 3,000 وصول، 5 أيام، 100 إشعار
- مميز (250 ج.م): 8,000 وصول، 7 أيام، 250 إشعار (الأكثر طلباً)
- VIP (500 ج.م): 25,000 وصول، 10 أيام، 600 إشعار
- استهداف مدن (من 120 ج.م): اختيار 1-27 مدينة مصرية
- استهداف اهتمامات (200 ج.م): 7,000 وصول، 5 أيام، 200 إشعار

مهم: عندما تذكر اسم باقة في النص، استخدم الاسم العربي دائماً (أساسي، قياسي، مميز، VIP، استهداف مدن، استهداف اهتمامات) ولا تستخدم الاسم الإنجليزي أبداً.

أجب بالعربي دائماً بشكل مختصر ومفيد. استخدم الأرقام والأمثلة. كن ودوداً ومحفزاً.
عندما يسأل المستخدم عن منشوراته، استخدم المعلومات أدناه لتقديم نصائح مخصصة بناءً على محتوى منشوراته الفعلية.
${userInfo}`
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.8,
      max_tokens: 600,
    });

    const aiReply = completion.choices?.[0]?.message?.content || 'عذراً، لم أتمكن من معالجة طلبك. حاول مرة أخرى.';

    res.json({ success: true, reply: aiReply });
  } catch (error: any) {
    console.error('[AI] Assistant error:', error.message);
    // Fallback rule-based responses
    const { message } = req.body;
    const msg = (message || '').toLowerCase();
    let reply = '';

    if (msg.includes('باقة') || msg.includes('أفضل') || msg.includes('اقترح')) {
      reply = 'أقترح باقة "مميز" - الأكثر طلباً! بـ 250 ج.م تحصل على 8,000 وصول و7 أيام ترويج مع رسائل ترويجية مباشرة. إذا ميزانيتك أقل، ابدأ بباقة "قياسي" بـ 120 ج.م.';
    } else if (msg.includes('سعر') || msg.includes('كم') || msg.includes('تكلفة')) {
      reply = 'أسعار الترويج تبدأ من 50 ج.م للباقة الأساسية. الباقة القياسية 120 ج.م، المميزة 250 ج.م، وVIP بـ 500 ج.م. كلما زادت الباقة، زاد الوصول لإعلانك!';
    } else if (msg.includes('كيف') || msg.includes('طريقة') || msg.includes('شرح')) {
      reply = 'الترويج سهل! 1) اختر إعلانك، 2) اضغط "ترويج"، 3) اختر الباقة المناسبة، 4) ادفع من محفظتك. بعد موافقة الإدارة خلال دقائق، يبدأ الترويج فوراً!';
    } else if (msg.includes('تحسين') || msg.includes('نصيحة') || msg.includes('نصائح')) {
      reply = 'نصائح لزيادة فعالية الترويج: 1) أضف صورة واضحة عالية الجودة، 2) اكتب عنوان جذاب، 3) حدد السعر بوضوح، 4) اختر الاستهداف المناسب لجمهورك، 5) رد على التعليقات بسرعة!';
    } else {
      reply = 'أنا مساعد الترويج الذكي! يمكنني مساعدتك في: اختيار الباقة المناسبة، تحسين إعلانك، نصائح لزيادة الوصول، أو أي سؤال عن الترويج. ماذا تريد أن تعرف؟';
    }

    res.json({ success: true, reply });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 4. AI اقتراح الميزانية والباقة - Budget Suggestion
// ═══════════════════════════════════════════════════════════════════════
router.post('/budget-suggestion', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { budget, category, price, goal } = req.body;
    const userId = (req as any).user?.userId;

    // Get user's wallet balance
    let walletBalance = 0;
    if (userId) {
      const user = getUserById(userId);
      walletBalance = user?.wallet_balance || 0;
    }

    const actualBudget = budget || walletBalance || 0;

    // Smart rule-based suggestion with AI enhancement
    const packages = [
      { id: 'basic', name: 'أساسي', price: 50, reach: 900, days: 3, notifications: 30 },
      { id: 'standard', name: 'قياسي', price: 120, reach: 3000, days: 5, notifications: 100 },
      { id: 'premium', name: 'مميز', price: 250, reach: 8000, days: 7, notifications: 250 },
      { id: 'vip', name: 'VIP', price: 500, reach: 25000, days: 10, notifications: 600 },
      { id: 'interest_target', name: 'استهداف اهتمامات', price: 200, reach: 7000, days: 5, notifications: 200 },
      { id: 'city_target', name: 'استهداف مدن', price: 120, reach: 4500, days: 5, notifications: 150 },
    ];

    // Find affordable packages
    const affordable = packages.filter(p => p.price <= actualBudget);
    const bestValue = affordable.length > 0
      ? affordable.reduce((best, p) => (p.reach / p.price > best.reach / best.price) ? p : best, affordable[0])
      : null;

    // Determine recommended based on budget
    let recommended: any = null;
    let reasoning = '';

    if (actualBudget >= 500) {
      recommended = packages.find(p => p.id === 'vip');
      reasoning = 'ميزانيتك تسمح بأفضل باقة VIP - وصول هائل لـ 25,000 مستخدم مهتم!';
    } else if (actualBudget >= 250) {
      recommended = packages.find(p => p.id === 'premium');
      reasoning = 'باقة مميزة ممتازة ليك - الأكثر طلباً! وصول 8,000 مستخدم مهتم';
    } else if (actualBudget >= 200) {
      recommended = packages.find(p => p.id === 'interest_target');
      reasoning = 'استهداف الاهتمامات مناسب لميزانيتك - يوصل إعلانك لـ 7,000 مهتم بالذكاء الاصطناعي';
    } else if (actualBudget >= 120) {
      recommended = packages.find(p => p.id === 'standard');
      reasoning = 'باقة قياسية جيدة - 3,000 وصول و5 أيام ترويج';
    } else if (actualBudget >= 50) {
      recommended = packages.find(p => p.id === 'basic');
      reasoning = 'باقة أساسية للبداية - 900 وصول و3 أيام';
    } else {
      reasoning = 'تحتاج شحن محفظتك أولاً. أقل باقة تبدأ من 50 ج.م';
    }

    // Try AI enhancement for richer suggestions
    let aiInsight = '';
    try {
      const zai = await getAI();
      if (!zai) {
        // AI unavailable - aiInsight stays empty, rule-based suggestion used
      } else {
        const completion = await zai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'أنت خبير تسويق. أجب بالعربي في جملة واحدة: ما أفضل نصيحة لميزانية ' + actualBudget + ' ج.م؟'
            },
            {
              role: 'user',
              content: `الميزانية: ${actualBudget} ج.م، التصنيف: ${category || 'عام'}، هدف المستخدم: ${goal || 'زيادة الوصول'}`
            }
          ],
          temperature: 0.7,
          max_tokens: 100,
        });
        aiInsight = completion.choices?.[0]?.message?.content || '';
      }
    } catch { /* ignore AI failure */ }

    res.json({
      success: true,
      data: {
        walletBalance: actualBudget,
        recommended,
        bestValue,
        affordable,
        needsCharging: actualBudget < 50,
        minimumRequired: 50,
        reasoning,
        aiInsight,
        tips: actualBudget < 50
          ? ['اشحن محفظتك بـ 50 ج.م على الأقل للبدء']
          : actualBudget < 150
            ? ['ابدأ بباقة أساسية واختبر النتائج', 'أضف صورة لزيادة التفاعل بنسبة 40%']
            : actualBudget < 350
              ? ['باقة قياسية توفر توازن جيد بين السعر والوصول', 'استهدف اهتمامات جمهورك بدقة']
              : ['الباقة المميزة/VIP تضمن أقصى وصول', 'استخدم استهداف الاهتمامات للوصول للمهتمين فعلاً'],
      },
    });
  } catch (error: any) {
    console.error('[AI] Budget suggestion error:', error.message);
    res.status(500).json({ error: 'حدث خطأ في اقتراح الميزانية' });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 5. AI تحليلات وتوصيات ذكية - Smart Insights
// ═══════════════════════════════════════════════════════════════════════
router.get('/insights', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'يجب تسجيل الدخول' });

    const db = database;

    // Gather user info
    const user = getUserById(userId);
    const walletBalance = user?.wallet_balance || 0;

    // Gather all user posts (promoted + non-promoted)
    let allUserPosts: any[] = [];
    try {
      allUserPosts = db.prepare('SELECT id, content, category, price, is_promoted, promotion_tier, likes, comments, reach_count, click_count, created_at FROM posts WHERE author_id = ? ORDER BY created_at DESC').all(userId) as any[];
    } catch (dbErr: any) {
      console.error('[AI] Insights posts query error:', dbErr.message);
    }

    const totalPosts = allUserPosts.length;
    const promotedPosts = allUserPosts.filter((p: any) => p.is_promoted === 1).length;
    const unpromotedPosts = totalPosts - promotedPosts;

    // Gather promotion data with correct column names
    let myPromotions: any[] = [];
    try {
      myPromotions = db.prepare(`
        SELECT p.*, pr.tier as promotion_tier, pr.status as promotion_status, pr.targeting, pr.target_city, pr.target_interests,
               pr.price as promotion_price, p.promotion_expires_at
        FROM posts p
        LEFT JOIN promotion_requests pr ON pr.post_id = p.id
        WHERE p.author_id = ? AND p.is_promoted = 1
        ORDER BY p.created_at DESC
      `).all(userId) as any[];
    } catch (dbErr: any) {
      console.error('[AI] Insights DB query error:', dbErr.message);
      myPromotions = [];
    }

    const totalSpent = myPromotions.reduce((sum: number, p: any) => sum + (p.promotion_price || 0), 0);
    const totalReach = myPromotions.reduce((sum: number, p: any) => sum + (p.reach_count || 0), 0);
    const totalClicks = myPromotions.reduce((sum: number, p: any) => sum + (p.click_count || 0), 0);
    const activePromotions = myPromotions.filter((p: any) => {
      try {
        return p.promotion_status === 'approved' && p.promotion_expires_at && new Date(p.promotion_expires_at) > new Date();
      } catch { return false; }
    }).length;

    // Category performance analysis
    const categoryPerformance: Record<string, { count: number; reach: number; clicks: number }> = {};
    myPromotions.forEach((p: any) => {
      const cat = p.category || 'other';
      if (!categoryPerformance[cat]) categoryPerformance[cat] = { count: 0, reach: 0, clicks: 0 };
      categoryPerformance[cat].count++;
      categoryPerformance[cat].reach += (p.reach_count || 0);
      categoryPerformance[cat].clicks += (p.click_count || 0);
    });

    // Find best performing category
    let bestCategory = '';
    let bestCTR = 0;
    Object.entries(categoryPerformance).forEach(([cat, data]) => {
      const ctr = data.reach > 0 ? data.clicks / data.reach : 0;
      if (ctr > bestCTR) {
        bestCTR = ctr;
        bestCategory = cat;
      }
    });

    // Tier performance
    const tierPerformance: Record<string, { count: number; reach: number; cost: number }> = {};
    myPromotions.forEach((p: any) => {
      const tier = p.promotion_tier || 'basic';
      if (!tierPerformance[tier]) tierPerformance[tier] = { count: 0, reach: 0, cost: 0 };
      tierPerformance[tier].count++;
      tierPerformance[tier].reach += (p.reach_count || 0);
      tierPerformance[tier].cost += (p.promotion_price || 0);
    });

    // Find best ROI tier
    let bestROITier = '';
    let bestROI = 0;
    Object.entries(tierPerformance).forEach(([tier, data]) => {
      const roi = data.cost > 0 ? data.reach / data.cost : 0;
      if (roi > bestROI) {
        bestROI = roi;
        bestROITier = tier;
      }
    });

    // AI-powered insights - include user's posts context for better recommendations
    let aiInsights: string[] = [];
    
    // Build a summary of user's posts for AI context
    const postsSummary = allUserPosts.slice(0, 10).map((p: any, i: number) => {
      const tier = p.promotion_tier || p.promotion_tier || 'غير مروّج';
      return `${i + 1}. [${p.is_promoted ? 'مروّج - ' + arPkg(tier) : 'غير مروّج'}] "${(p.content || '').slice(0, 60)}..." | تصنيف: ${p.category || 'عام'} | سعر: ${p.price || 'غير محدد'} ج.م | إعجابات: ${p.likes || 0}`;
    }).join('\n');

    try {
      const zai = await getAI();
      if (!zai) {
        // Rule-based fallback
        if (totalReach === 0) {
          aiInsights = ['ابدأ بترويج إعلانك أولاً لرؤية التحليلات', 'باقة قياسية هي نقطة بداية ممتازة', 'أضف صورة لإعلانك لزيادة النقرات'];
        } else {
          const ctr = totalReach > 0 ? (totalClicks / totalReach * 100).toFixed(1) : '0';
          aiInsights = [
            `نسبة النقر الحالية ${ctr}% - ${parseFloat(ctr) > 3 ? 'ممتازة!' : parseFloat(ctr) > 1 ? 'جيدة ويمكن تحسينها' : 'تحتاج تحسين - جرب تغيير الصورة أو العنوان'}`,
            bestCategory ? `تصنيف "${bestCategory}" يحقق أفضل نتائج - ركز عليه` : 'اختبر تصنيفات مختلفة لمعرفة الأفضل',
            bestROITier ? `باقة "${replacePkgNamesInText(arPkg(bestROITier))}" تعطي أفضل عائد - استثمر فيها أكثر` : 'جرب باقة "مميز" - الأكثر طلباً وأفضل عائد',
          ];
        }
      } else {
        const completion = await zai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `أنت محلل بيانات ذكي لمنصة إعلانات مصرية اسمها "نواقص".
بناءً على البيانات التالية، أعطِ 3-5 توصيات قصيرة ومفيدة بالعربي لتحسين أداء الترويج.
كل توصية في سطر منفصل. كن محدداً وعملياً.
مهم: استخدم أسماء الباقات العربية (أساسي، قياسي، مميز، VIP، استهداف مدن، استهداف اهتمامات) ولا تستخدم الأسماء الإنجليزية أبداً.`
            },
            {
              role: 'user',
              content: `تحليلاتي:
- إجمالي الإنفاق: ${totalSpent} ج.م
- إجمالي الوصول: ${totalReach}
- إجمالي النقرات: ${totalClicks}
- الترويجات النشطة: ${activePromotions}
- أفضل تصنيف: ${bestCategory || 'لا يوجد'}
- أفضل باقة: ${bestROITier ? arPkg(bestROITier) : 'لا يوجد'}
- عدد الترويجات: ${myPromotions.length}
- رصيد المحفظة: ${walletBalance} ج.م
- إجمالي المنشورات: ${totalPosts} (مروّجة: ${promotedPosts}, غير مروّجة: ${unpromotedPosts})

منشوراتي:
${postsSummary || 'لا توجد منشورات بعد'}`
            }
          ],
          temperature: 0.7,
          max_tokens: 400,
        });

        const content = completion.choices?.[0]?.message?.content || '';
        aiInsights = content.split('\n').filter((l: string) => l.trim().length > 0).slice(0, 5);
      }
    } catch {
      // Rule-based fallback
      if (totalReach === 0) {
        aiInsights = ['ابدأ بترويج إعلانك أولاً لرؤية التحليلات', 'باقة قياسية هي نقطة بداية ممتازة', 'أضف صورة لإعلانك لزيادة النقرات'];
      } else {
        const ctr = totalReach > 0 ? (totalClicks / totalReach * 100).toFixed(1) : '0';
        aiInsights = [
          `نسبة النقر الحالية ${ctr}% - ${parseFloat(ctr) > 3 ? 'ممتازة!' : parseFloat(ctr) > 1 ? 'جيدة ويمكن تحسينها' : 'تحتاج تحسين - جرب تغيير الصورة أو العنوان'}`,
          bestCategory ? `تصنيف "${bestCategory}" يحقق أفضل نتائج - ركز عليه` : 'اختبر تصنيفات مختلفة لمعرفة الأفضل',
          bestROITier ? `باقة "${replacePkgNamesInText(arPkg(bestROITier))}" تعطي أفضل عائد - استثمر فيها أكثر` : 'جرب باقة "مميز" - الأكثر طلباً وأفضل عائد',
        ];
      }
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalSpent,
          totalReach,
          totalClicks,
          activePromotions,
          totalPromotions: myPromotions.length,
          avgCTR: totalReach > 0 ? (totalClicks / totalReach * 100).toFixed(1) : '0',
          totalPosts,
          promotedPosts,
          unpromotedPosts,
          walletBalance,
        },
        categoryPerformance,
        tierPerformance,
        bestCategory,
        bestROITier: bestROITier ? arPkg(bestROITier) : '',
        aiInsights,
        posts: allUserPosts.slice(0, 10).map((p: any) => ({
          id: p.id,
          content: p.content,
          contentPreview: (p.content || '').slice(0, 80),
          category: p.category,
          price: p.price,
          isPromoted: !!p.is_promoted,
          promotionTier: p.is_promoted ? arPkg(p.promotion_tier || 'basic') : null,
          likes: p.likes || 0,
          comments: p.comments || 0,
          reachCount: p.reach_count || 0,
          clickCount: p.click_count || 0,
          createdAt: p.created_at,
        })),
        recommendations: {
          nextBestAction: activePromotions > 0
            ? 'راقب أداء ترويجاتك الحالية وقارن النتائج'
            : unpromotedPosts > 0
              ? `لديك ${unpromotedPosts} منشور غير مروّج - اختر الأفضل وابدأ الترويج!`
              : 'ابدأ بإنشاء منشور ثم روّجه - الباقة القياسية خيار ممتاز',
          suggestedBudget: totalSpent === 0 ? 150 : Math.max(150, Math.round(totalSpent * 0.3)),
        },
      },
    });
  } catch (error: any) {
    console.error('[AI] Insights error:', error.message);
    // Return empty data instead of 500 error so UI doesn't crash
    res.json({
      success: true,
      data: {
        summary: {
          totalSpent: 0,
          totalReach: 0,
          totalClicks: 0,
          activePromotions: 0,
          totalPromotions: 0,
          avgCTR: '0',
        },
        categoryPerformance: {},
        tierPerformance: {},
        bestCategory: '',
        bestROITier: '',
        aiInsights: ['ابدأ بترويج إعلانك أولاً لرؤية التحليلات', 'باقة قياسية هي نقطة بداية ممتازة', 'أضف صورة لإعلانك لزيادة النقرات'],
        recommendations: {
          nextBestAction: 'ابدأ بترويج إعلانك الآن - الباقة القياسية خيار ممتاز',
          suggestedBudget: 150,
        },
      },
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 6. AI تحسين المحتوى - Content Enhancement
// ═══════════════════════════════════════════════════════════════════════
router.post('/enhance-content', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { content, category, price } = req.body;
    if (!content) return res.status(400).json({ error: 'المحتوى مطلوب' });

    const zai = await getAI();
    if (!zai) {
      const { content } = req.body;
      return res.json({
        success: true,
        data: {
          enhancedContent: content,
          title: '',
          hashtags: [],
          callToAction: 'اطلب الآن!',
          scoreImprovement: 10,
          tips: ['أضف صورة واضحة للمنتج', 'حدد السعر والموقع', 'اذكر حالة المنتج', 'استخدم كلمات مفتاحية في الوصف'],
        },
      });
    }
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `أنت خبير كتابة إعلانات على منصة "نواقص" المصرية.
حسّن محتوى الإعلان لجعله أكثر جاذبية وفعالية.
أجب بـ JSON فقط:
{
  "enhancedContent": "المحتوى المحسن",
  "title": "عنوان جذاب",
  "hashtags": ["هاشتاق1", "هاشتاق2"],
  "callToAction": "عبارة تحفيزية للشراء",
  "scoreImprovement": 25,
  "tips": ["نصيحة1", "نصيحة2"]
}`
        },
        {
          role: 'user',
          content: `حسّن هذا الإعلان:
المحتوى: ${content}
التصنيف: ${category || 'عام'}
السعر: ${price || 'غير محدد'} ج.م`
        }
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    let aiResult;
    try {
      const content = completion.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      aiResult = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      aiResult = {
        enhancedContent: content,
        title: '',
        hashtags: [],
        callToAction: 'اطلب الآن!',
        scoreImprovement: 15,
        tips: ['أضف صورة واضحة', 'حدد السعر بوضوح'],
      };
    }

    res.json({ success: true, data: aiResult });
  } catch (error: any) {
    console.error('[AI] Content enhancement error:', error.message);
    const { content } = req.body;
    res.json({
      success: true,
      data: {
        enhancedContent: content,
        title: '',
        hashtags: [],
        callToAction: 'اطلب الآن!',
        scoreImprovement: 10,
        tips: ['أضف صورة واضحة للمنتج', 'حدد السعر والموقع', 'اذكر حالة المنتج', 'استخدم كلمات مفتاحية في الوصف'],
      },
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 7. AI تحديد موضع المنشورات المروجة - Smart Placement Engine
// الذكاء الاصطناعي يحدد أفضل مكان لكل منشور مروج في الصفحة
// ═══════════════════════════════════════════════════════════════════════
router.post('/smart-placement', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { promotedPosts, totalPosts, feedType, userInterests } = req.body;
    const userId = (req as any).user?.userId || null;

    if (!Array.isArray(promotedPosts) || promotedPosts.length === 0) {
      return res.json({ success: true, positions: [], strategy: 'none' });
    }

    const db = database;
    const promotedCount = promotedPosts.length;
    const regularCount = (totalPosts || 20) - promotedCount;

    // ─── Step 1: Gather historical engagement data ──────────────────
    let engagementData: any[] = [];
    try {
      engagementData = db.prepare(`
        SELECT feed_position, action, COUNT(*) as count,
               AVG(time_on_screen) as avg_time,
               AVG(scroll_depth) as avg_scroll_depth
        FROM promotion_engagement
        WHERE feed_type = ? AND created_at >= datetime('now', '-7 days')
        GROUP BY feed_position, action
        ORDER BY feed_position
      `).all(feedType || 'home') as any[];
    } catch { /* table might not exist yet */ }

    // ─── Step 2: Calculate CTR by position from engagement data ─────
    const positionStats: Record<number, { impressions: number; clicks: number; avgTime: number; avgScroll: number }> = {};
    for (const row of engagementData) {
      if (!positionStats[row.feed_position]) {
        positionStats[row.feed_position] = { impressions: 0, clicks: 0, avgTime: 0, avgScroll: 0 };
      }
      if (row.action === 'impression') positionStats[row.feed_position].impressions = row.count;
      if (row.action === 'click') positionStats[row.feed_position].clicks = row.count;
      positionStats[row.feed_position].avgTime = row.avg_time || 0;
      positionStats[row.feed_position].avgScroll = row.avg_scroll_depth || 0;
    }

    // ─── Step 3: Check for cached AI strategy ───────────────────────
    const hourKey = new Date().getHours();
    const interestsKey = Array.isArray(userInterests) ? userInterests.slice(0, 3).sort().join(',') : '';
    const cacheKey = `placement_${feedType || 'home'}_${hourKey}_${promotedCount}_${interestsKey}`;

    let cachedStrategy: any = null;
    try {
      const cached = db.prepare(
        'SELECT strategy FROM ai_placement_cache WHERE cache_key = ? AND expires_at > datetime("now")'
      ).get(cacheKey) as any;
      if (cached) {
        cachedStrategy = JSON.parse(cached.strategy);
        // Update hit count
        db.prepare('UPDATE ai_placement_cache SET hit_count = hit_count + 1 WHERE cache_key = ?').run(cacheKey);
      }
    } catch { /* ignore cache errors */ }

    if (cachedStrategy) {
      return res.json({ success: true, ...cachedStrategy, fromCache: true });
    }

    // ─── Step 4: Generate AI-powered placement strategy ─────────────
    // Build engagement summary for AI
    const engagementSummary = Object.entries(positionStats)
      .map(([pos, stats]) => `الموضع ${pos}: انطباعات=${stats.impressions}, نقرات=${stats.clicks}, معدل النقر=${stats.impressions > 0 ? ((stats.clicks / stats.impressions) * 100).toFixed(1) : 0}%, وقت_مشاهدة=${stats.avgTime.toFixed(1)}ث`)
      .join('\n');

    // Time of day context
    const currentHour = new Date().getHours();
    let timeContext = '';
    if (currentHour >= 5 && currentHour < 12) timeContext = 'صباحاً - مستخدمون أكثر نشاطاً واهتماماً بالتسوق';
    else if (currentHour >= 12 && currentHour < 17) timeContext = 'ظهراً - فترة راحة، تفاعل متوسط';
    else if (currentHour >= 17 && currentHour < 22) timeContext = 'مساءً - أعلى فترة تفاعل وتمضية وقت';
    else timeContext = 'ليلاً - تفاعل أقل لكن مستخدمون أكثر تركيزاً';

    // Build promoted posts summary for AI
    const promotedSummary = promotedPosts.slice(0, 10).map((p: any, i: number) => {
      const tier = p.promotionTier || p.promotion_tier || 'basic';
      const interests = p.targetInterests || p.target_interests || [];
      const category = p.category || '';
      return `${i + 1}. مستوى=${tier}, تصنيف=${category}, استهداف=${interests.join('/')}`;
    }).join('\n');

    let aiResult: any = null;

    try {
      const zai = await getAI();
      if (!zai) {
        // AI unavailable - aiResult stays null, rule-based fallback will be used
      } else {
        const completion = await zai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `أنت محرك ذكاء اصطناعي لتحديد مواضع الإعلانات المروجة في صفحة منصة إعلانات مصرية "نواقص".
مهمتك تحديد أفضل المواضع لكل إعلان مروج بناءً على:
1. أداء المواضع السابقة (أي موضع حقق أعلى تفاعل)
2. مستوى الباقة (VIP يحتاج موضع أفضل من Basic)
3. ملاءمة المحتوى لاهتمامات المستخدم
4. وقت اليوم وأنماط الاستخدام
5. سياق المحتوى المحيط (المنشورات المشابهة قريبة)

قواعد:
- الموضع يبدأ من 0 (أول منشور)
- لا تضع إعلانين مروجين متجاورين
- أول إعلان مروج يظهر بعد الموضع 1 على الأقل
- إعلانات VIP تظهر في مواضع أكثر بروزاً
- إعلانات الأهمية المتطابقة تظهر أولاً
- الوزن بين المنشورات العادية والمروجة يجب أن يكون متوازناً

أجب بـ JSON فقط بالشكل التالي:
{
  "positions": [{"postIndex": 0, "feedPosition": 2, "reason": "السبب"}],
  "strategy": "وصف الاستراتيجية",
  "peakPositions": [2, 5, 8],
  "avoidPositions": [0, 1],
  "reasoning": "شرح عام بالعربي",
  "confidence": 0.85
}`
            },
            {
              role: 'user',
              content: `حدد مواضع الإعلانات المروجة:
عدد الإعلانات المروجة: ${promotedCount}
عدد المنشورات العادية: ${Math.max(regularCount, 0)}
نوع الصفحة: ${feedType === 'market' ? 'السوق الذكي' : feedType === 'matches' ? 'متوافق معي' : 'الرئيسية'}
وقت اليوم: ${timeContext}
اهتمامات المستخدم: ${interestsKey || 'عام'}

الإعلانات المروجة:
${promotedSummary}

أداء المواضع السابقة:
${engagementSummary || 'لا توجد بيانات سابقة - استخدم التوزيع المتوازن'}`
            }
          ],
          temperature: 0.5,
          max_tokens: 800,
        });

        const content = completion.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiResult = JSON.parse(jsonMatch[0]);
        }
      }
    } catch (aiError: any) {
      console.error('[AI] Smart placement AI error:', aiError.message);
    }

    // ─── Step 5: Build result with AI or rule-based fallback ────────
    let result: any;

    if (aiResult && Array.isArray(aiResult.positions) && aiResult.positions.length > 0) {
      result = {
        positions: aiResult.positions,
        strategy: aiResult.strategy || 'AI استراتيجية ذكية',
        peakPositions: aiResult.peakPositions || [2, 5, 8],
        avoidPositions: aiResult.avoidPositions || [0, 1],
        reasoning: aiResult.reasoning || 'تحليل ذكي بناءً على بيانات التفاعل والاهتمامات',
        confidence: aiResult.confidence || 0.7,
      };
    } else {
      // ─── Rule-based fallback (intelligent positioning) ────────────
      const positions: { postIndex: number; feedPosition: number; reason: string }[] = [];
      const tierOrder: Record<string, number> = { vip: 4, premium: 3, interest_target: 3, standard: 2, city_target: 2, basic: 1 };

      // Sort promoted posts by priority
      const sortedPromoted = promotedPosts
        .map((p: any, i: number) => ({
          index: i,
          tier: p.promotionTier || p.promotion_tier || 'basic',
          interests: p.targetInterests || p.target_interests || [],
          category: p.category || '',
        }))
        .sort((a: any, b: any) => (tierOrder[b.tier] || 0) - (tierOrder[a.tier] || 0));

      // Determine base frequency based on promoted/regular ratio
      let baseFrequency = Math.max(2, Math.floor(regularCount / (promotedCount || 1)));
      if (baseFrequency > 6) baseFrequency = 6;
      if (baseFrequency < 2) baseFrequency = 2;

      // Use engagement data to find best positions if available
      const bestPositions: number[] = [];
      const worstPositions: number[] = [];
      if (Object.keys(positionStats).length > 0) {
        const sortedPositions = Object.entries(positionStats)
          .map(([pos, stats]) => ({
            position: parseInt(pos),
            ctr: stats.impressions > 0 ? stats.clicks / stats.impressions : 0,
          }))
          .sort((a, b) => b.ctr - a.ctr);
        bestPositions.push(...sortedPositions.slice(0, 5).map(p => p.position));
        worstPositions.push(...sortedPositions.slice(-3).map(p => p.position));
      }

      // Time-based optimization
      let positionOffset = 1;
      if (currentHour >= 17 && currentHour < 22) {
        // Evening peak: users scroll more, can place promoted earlier
        positionOffset = 1;
      } else if (currentHour >= 5 && currentHour < 12) {
        // Morning: users are focused, place promoted slightly later
        positionOffset = 2;
      } else if (currentHour >= 22 || currentHour < 5) {
        // Late night: fewer posts viewed, place promoted more frequently
        baseFrequency = Math.max(2, baseFrequency - 1);
        positionOffset = 1;
      }

      // Calculate positions
      let nextPosition = positionOffset;
      for (let i = 0; i < sortedPromoted.length; i++) {
        const promo = sortedPromoted[i];
        const tier = promo.tier;

        // Adjust frequency by tier
        let tierFrequency = baseFrequency;
        if (tier === 'vip') tierFrequency = Math.max(2, baseFrequency - 1);
        else if (tier === 'premium' || tier === 'interest_target') tierFrequency = baseFrequency;
        else if (tier === 'basic') tierFrequency = baseFrequency + 1;

        // Try to use best historical positions
        let finalPosition = nextPosition;
        if (bestPositions.length > 0) {
          const bestPos = bestPositions.find(p => p >= nextPosition && !positions.some(pp => pp.feedPosition === p));
          if (bestPos !== undefined) finalPosition = bestPos;
        }
        // Avoid worst positions
        if (worstPositions.includes(finalPosition)) {
          finalPosition = worstPositions.includes(finalPosition + 1) ? finalPosition + 2 : finalPosition + 1;
        }

        positions.push({
          postIndex: promo.index,
          feedPosition: finalPosition,
          reason: `${tier === 'vip' ? 'موضع متميز لباقة VIP' : tier === 'premium' ? 'موضع مميز' : 'توزيع متوازن'}`,
        });

        nextPosition = finalPosition + tierFrequency;
      }

      result = {
        positions,
        strategy: 'توزيع ذكي مبني على القواعد والبيانات',
        peakPositions: bestPositions.length > 0 ? bestPositions : [2, 5, 8],
        avoidPositions: worstPositions.length > 0 ? worstPositions : [0, 1],
        reasoning: `توزيع ذكي: ${promotedCount} إعلان مروج بين ${regularCount} منشور عادي. فترة ${timeContext.split(' - ')[0]}. تكرار كل ${baseFrequency} منشورات.`,
        confidence: 0.6,
      };
    }

    // ─── Step 6: Cache the result ───────────────────────────────────
    try {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // Cache for 30 minutes
      db.prepare(`
        INSERT OR REPLACE INTO ai_placement_cache (cache_key, strategy, feed_type, user_id, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(cacheKey, JSON.stringify(result), feedType || 'home', userId || null, expiresAt);
    } catch { /* ignore cache write errors */ }

    res.json({ success: true, ...result, fromCache: false });
  } catch (error: any) {
    console.error('[AI] Smart placement error:', error.message);

    // Ultimate fallback: simple rule-based positioning
    const { promotedPosts, totalPosts } = req.body;
    const promotedCount = Array.isArray(promotedPosts) ? promotedPosts.length : 0;
    const regularCount = (totalPosts || 20) - promotedCount;
    const frequency = Math.max(2, Math.floor(regularCount / (promotedCount || 1)));
    const positions = promotedPosts.map((_: any, i: number) => ({
      postIndex: i,
      feedPosition: 1 + i * frequency,
      reason: 'توزيع متساوٍ',
    }));

    res.json({
      success: true,
      positions,
      strategy: 'توزيع بسيط متساوٍ',
      peakPositions: [2, 5, 8],
      avoidPositions: [0, 1],
      reasoning: 'توزيع أساسي - الذكاء الاصطناعي غير متاح',
      confidence: 0.3,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 8. AI تتبع تفاعل المستخدم مع المنشورات المروجة - Engagement Tracking
// يسجل موضع المنشور والتفاعل معه لتحسين المواضع المستقبلية
// ═══════════════════════════════════════════════════════════════════════
router.post('/track-engagement', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || null;
    if (!userId) {
      // Silently skip tracking for unauthenticated users instead of returning 401
      // This prevents the auth:expired event from being triggered on the frontend
      return res.json({ tracked: 0 });
    }

    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      return res.json({ tracked: 0 });
    }

    const db = database;
    const sessionId = req.headers['x-session-id'] as string || '';

    let trackedCount = 0;
    const insertStmt = db.prepare(`
      INSERT INTO promotion_engagement (post_id, user_id, feed_position, feed_type, action, time_on_screen, scroll_depth, session_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const event of events) {
      try {
        if (!event.postId || !event.action) continue;
        insertStmt.run(
          event.postId,
          userId,
          event.feedPosition || 0,
          event.feedType || 'home',
          event.action, // 'impression', 'click', 'view', 'scroll_past'
          event.timeOnScreen || 0,
          event.scrollDepth || 0,
          sessionId,
        );
        trackedCount++;
      } catch { /* ignore individual tracking errors */ }
    }

    // Update AI placement cache expiry if there's significant new data
    if (trackedCount > 5) {
      try {
        // Expire placement caches so they get regenerated with new data
        db.prepare("UPDATE ai_placement_cache SET expires_at = datetime('now') WHERE feed_type IN ('home', 'market')").run();
      } catch { /* ignore */ }
    }

    res.json({ tracked: trackedCount });
  } catch (error: any) {
    console.error('[AI] Engagement tracking error:', error.message);
    res.json({ tracked: 0 });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 9. AI تحليلات المواضع - Placement Analytics
// يعرض أداء المواضع المختلفة للمنشورات المروجة
// ═══════════════════════════════════════════════════════════════════════
router.get('/placement-analytics', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      // Return empty data instead of 401 to prevent frontend logout
      return res.json({ success: true, data: { positions: [], summary: { totalImpressions: 0, totalClicks: 0, avgCTR: 0 } } });
    }

    const db = database;
    const { feedType, days } = req.query;
    const feed = feedType || 'home';
    const daysBack = parseInt(days as string) || 7;

    // Position performance
    const positionPerformance = db.prepare(`
      SELECT
        feed_position,
        COUNT(CASE WHEN action = 'impression' THEN 1 END) as impressions,
        COUNT(CASE WHEN action = 'click' THEN 1 END) as clicks,
        COUNT(CASE WHEN action = 'view' THEN 1 END) as views,
        AVG(CASE WHEN action = 'impression' THEN time_on_screen END) as avg_time_on_screen,
        AVG(CASE WHEN action = 'impression' THEN scroll_depth END) as avg_scroll_depth
      FROM promotion_engagement
      WHERE feed_type = ? AND created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY feed_position
      ORDER BY feed_position
    `).all(feed, daysBack) as any[];

    // Calculate CTR per position
    const analyzedPositions = positionPerformance.map(p => ({
      ...p,
      ctr: p.impressions > 0 ? ((p.clicks / p.impressions) * 100).toFixed(2) : '0',
      engagementScore: p.impressions > 0
        ? Math.round((p.clicks * 3 + p.views * 1 + p.avg_time_on_screen * 0.5) / p.impressions * 100) / 100
        : 0,
    }));

    // Find best and worst positions
    const bestPosition = analyzedPositions.length > 0
      ? analyzedPositions.reduce((best: any, p: any) => parseFloat(p.ctr) > parseFloat(best.ctr) ? p : best)
      : null;
    const worstPosition = analyzedPositions.length > 0
      ? analyzedPositions.reduce((worst: any, p: any) => parseFloat(p.ctr) < parseFloat(worst.ctr) ? p : worst)
      : null;

    // Time-based performance
    const timePerformance = db.prepare(`
      SELECT
        CAST(strftime('%H', created_at) AS INTEGER) as hour,
        COUNT(CASE WHEN action = 'impression' THEN 1 END) as impressions,
        COUNT(CASE WHEN action = 'click' THEN 1 END) as clicks
      FROM promotion_engagement
      WHERE feed_type = ? AND created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY hour
      ORDER BY hour
    `).all(feed, daysBack) as any[];

    // Feed type comparison
    const feedComparison = db.prepare(`
      SELECT
        feed_type,
        COUNT(CASE WHEN action = 'impression' THEN 1 END) as impressions,
        COUNT(CASE WHEN action = 'click' THEN 1 END) as clicks
      FROM promotion_engagement
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY feed_type
    `).all(daysBack) as any[];

    // AI recommendations
    let aiRecommendations: string[] = [];
    try {
      const bestPos = bestPosition?.feed_position || 3;
      const worstPos = worstPosition?.feed_position || 0;
      const bestHour = timePerformance.length > 0
        ? timePerformance.reduce((best: any, h: any) =>
          h.impressions > 0 && (h.clicks / h.impressions) > (best.impressions > 0 ? best.clicks / best.impressions : 0) ? h : best
        ).hour
        : null;

      if (bestPos !== undefined) aiRecommendations.push(`أفضل موضع للإعلانات هو الموضع ${bestPos} - حقق أعلى معدل نقر`);
      if (worstPos !== undefined) aiRecommendations.push(`تجنّب الموضع ${worstPos} - أقل معدل تفاعل`);
      if (bestHour !== null) aiRecommendations.push(`أفضل ساعة للتفاعل هي ${bestHour}:00 - فكّر في زيادة الترويج في هذا الوقت`);
      if (analyzedPositions.length === 0) aiRecommendations.push('لا توجد بيانات كافية بعد - استمر في الترويج لجمع البيانات');
    } catch { /* ignore */ }

    res.json({
      success: true,
      data: {
        positionPerformance: analyzedPositions,
        bestPosition,
        worstPosition,
        timePerformance,
        feedComparison,
        aiRecommendations,
        totalEvents: analyzedPositions.reduce((sum: number, p: any) => sum + p.impressions + p.clicks + p.views, 0),
      },
    });
  } catch (error: any) {
    console.error('[AI] Placement analytics error:', error.message);
    res.status(500).json({ error: 'حدث خطأ في تحليلات المواضع' });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 8. AI تحليل شامل لمنشورات المستخدم - Analyze My Posts
// يقرأ كل منشورات المستخدم ويقترح أفضلها للترويج
// ═══════════════════════════════════════════════════════════════════════
router.post('/analyze-my-posts', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'يجب تسجيل الدخول' });

    const db = database;

    // Fetch ALL user's posts
    const userPosts = db.prepare(
      'SELECT id, content, category, price, location, type, image, likes, comments, shares, is_promoted, promotion_status, promotion_tier, created_at FROM posts WHERE author_id = ? ORDER BY created_at DESC'
    ).all(userId) as any[];

    // Fetch user info
    const user = getUserById(userId);
    const walletBalance = user?.wallet_balance || 0;
    const userInterests = user?.interests || '';
    const userLocation = user?.location || '';

    const totalPosts = userPosts.length;
    const promotedPosts = userPosts.filter((p: any) => p.is_promoted === 1).length;
    const unpromotedPosts = totalPosts - promotedPosts;

    if (totalPosts === 0) {
      return res.json({
        success: true,
        data: {
          totalPosts: 0,
          promotedPosts: 0,
          unpromotedPosts: 0,
          posts: [],
          topPick: null,
          overallStrategy: 'ليس لديك منشورات بعد. أنشئ منشور أولاً ثم عد لتحليلها!',
          budgetRecommendation: { totalNeeded: 0, suggestedPackages: [] },
          aiTips: ['أنشئ إعلان بتصنيف واضح وصورة عالية الجودة', 'حدد السعر والموقع في الإعلان', 'بعد الإنشاء، استخدم تحليل منشوراتي لمعرفة أفضلها للترويج'],
        },
      });
    }

    // Build posts summary for AI
    const postsSummary = userPosts.map((p: any, i: number) => {
      const daysAgo = Math.floor((Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return `${i + 1}. [${p.is_promoted ? 'مروّج' : 'غير مروّج'}] "${p.content?.slice(0, 150) || ''}" | تصنيف: ${p.category || 'عام'} | سعر: ${p.price || 'غير محدد'} ج.م | موقع: ${p.location || 'غير محدد'} | إعجابات: ${p.likes || 0} | تعليقات: ${p.comments || 0} | مشاركات: ${p.shares || 0} | ${p.image ? '📸 لديه صورة' : '❌ بدون صورة'} | قبل ${daysAgo} يوم${p.is_promoted ? ` | باقة: ${p.promotion_tier || 'غير محدد'}` : ''}`;
    }).join('\n');

    // Try AI analysis
    let aiResult: any = null;
    try {
      const zai = await getAI();
      if (!zai) {
        // AI unavailable - aiResult stays null, rule-based fallback will be used
      } else {
        const completion = await zai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `أنت خبير تسويق وترويج على منصة إعلانات ذكية في مصر اسمها "نواقص".
مهمتك تحليل كل منشورات المستخدم وتقديم توصيات شاملة للترويج.

باقات الترويج المتاحة:
- أساسي (50 ج.م): 900 وصول، 3 أيام، 30 إشعار
- قياسي (120 ج.م): 3,000 وصول، 5 أيام، 100 إشعار
- مميز (250 ج.م): 8,000 وصول، 7 أيام، 250 إشعار (الأكثر طلباً)
- VIP (500 ج.م): 25,000 وصول، 10 أيام، 600 إشعار
- استهداف مدن (من 120 ج.م): اختيار 1-27 مدينة مصرية
- استهداف اهتمامات (200 ج.م): 7,000 وصول، 5 أيام، 200 إشعار

مهم: عندما تذكر اسم باقة في النص، استخدم الاسم العربي دائماً (أساسي، قياسي، مميز، VIP، استهداف مدن، استهداف اهتمامات) ولا تستخدم الاسم الإنجليزي أبداً.

الاهتمامات المتاحة: phones, electronics, games, cars, realEstate, fashion, beauty, sports, food, jobs, services, education, books, animals, travel, photography, health, other

المدن المصرية: القاهرة، الجيزة، الإسكندرية، المنصورة، طنطا، الزقازيق، بورسعيد، السويس، الإسماعيلية، الفيوم، أسيوط، المنيا، سوهاج، قنا، الأقصر، أسوان، دمياط، كفر الشيخ، بنها، شبين الكوم، مرسى مطروح، الغردقة، شرم الشيخ

حلل كل منشور وقيّم إمكانية الترويج. أجب بـ JSON فقط بالشكل التالي:
{
  "posts": [
    {
      "promotionScore": 85,
      "promotionPotential": "high|medium|low",
      "suggestedPackage": "premium|standard|basic|vip|city_target|interest_target",
      "suggestedInterests": ["interest1", "interest2"],
      "suggestedCities": ["مدينة1", "مدينة2"],
      "contentTips": ["نصيحة1", "نصيحة2"]
    }
  ],
  "topPickIndex": 0,
  "topPickReason": "سبب اختيار هذا المنشور كأفضل خيار",
  "overallStrategy": "استراتيجية شاملة بالعربي",
  "budgetRecommendation": {
    "totalNeeded": 500,
    "suggestedPackages": [
      {"priority": 1, "postId": "id", "package": "premium", "price": 350, "reason": "السبب"},
      {"priority": 2, "postId": "id", "package": "standard", "price": 150, "reason": "السبب"}
    ]
  },
  "aiTips": ["نصيحة1", "نصيحة2", "نصيحة3"]
}`
            },
            {
              role: 'user',
              content: `حلل منشوراتي واقترح أفضلها للترويج:

معلومات المستخدم:
- رصيد المحفظة: ${walletBalance} ج.م
- الاهتمامات: ${userInterests || 'غير محدد'}
- الموقع: ${userLocation || 'غير محدد'}
- إجمالي المنشورات: ${totalPosts}
- مروّجة: ${promotedPosts} | غير مروّجة: ${unpromotedPosts}

المنشورات:
${postsSummary}`
            }
          ],
          temperature: 0.7,
          max_tokens: 2000,
        });

        const content = completion.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiResult = JSON.parse(jsonMatch[0]);
        }
      }
    } catch (aiError: any) {
      console.error('[AI] Analyze my posts AI error:', aiError.message);
    }

    // Build response with AI or rule-based fallback
    const categoryToInterests: Record<string, string[]> = {
      phones: ['phones', 'electronics'],
      electronics: ['electronics', 'phones'],
      cars: ['cars'],
      realEstate: ['realEstate'],
      games: ['games', 'electronics'],
      fashion: ['fashion', 'beauty'],
      beauty: ['beauty', 'fashion'],
      sports: ['sports'],
      food: ['food'],
      jobs: ['jobs', 'education'],
      services: ['services', 'jobs'],
      education: ['education', 'books'],
      books: ['books', 'education'],
      animals: ['animals'],
      travel: ['travel', 'photography'],
      photography: ['photography', 'travel'],
      health: ['health', 'beauty'],
    };

    const postsAnalysis = userPosts.map((p: any, i: number) => {
      const daysAgo = Math.floor((Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24));
      const aiPost = aiResult?.posts?.[i] || null;

      // Rule-based scoring fallback
      let score = 50;
      if (p.image) score += 15;
      if (p.price && p.price > 0) score += 10;
      if (p.category) score += 5;
      if (p.content && p.content.length > 50) score += 5;
      if (p.likes > 5) score += 5;
      if (p.comments > 2) score += 5;
      if (daysAgo <= 3) score += 5;
      if (p.is_promoted) score -= 20; // already promoted, less need
      if (!p.image) score -= 10;
      if (!p.price) score -= 5;
      score = Math.max(0, Math.min(100, score));

      const cat = p.category || 'other';
      const suggestedInterests = aiPost?.suggestedInterests || categoryToInterests[cat] || ['other'];
      const suggestedCities = aiPost?.suggestedCities || [p.location || userLocation || 'القاهرة'];
      let suggestedPackageId = aiPost?.suggestedPackage || 'standard';
      // Normalize: if AI returns Arabic name, try to map back to English ID
      const arToEngMap: Record<string, string> = { 'أساسي': 'basic', 'قياسي': 'standard', 'مميز': 'premium', 'VIP': 'vip', 'استهداف مدن': 'city_target', 'استهداف اهتمامات': 'interest_target' };
      if (arToEngMap[suggestedPackageId]) suggestedPackageId = arToEngMap[suggestedPackageId];
      if (p.price && p.price > 10000 && !aiPost) suggestedPackageId = 'premium';
      const suggestedPackageAr = arPkg(suggestedPackageId);

      return {
        postId: p.id,
        contentPreview: (p.content || '').slice(0, 80),
        category: p.category || 'عام',
        price: p.price || 0,
        promotionScore: aiPost?.promotionScore || score,
        promotionPotential: aiPost?.promotionPotential || (score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low'),
        suggestedPackage: suggestedPackageAr,
        suggestedPackageId,
        suggestedInterests,
        suggestedCities,
        contentTips: aiPost?.contentTips || [
          ...(p.image ? [] : ['أضف صورة عالية الجودة - تزيد التفاعل 40%']),
          ...(p.price ? [] : ['حدد السعر بوضوح لجذب المشترين الجادين']),
          ...(p.content?.length > 30 ? [] : ['أضف تفاصيل أكثر عن المنتج']),
          'اذكر حالة المنتج وطريقة التواصل',
        ],
        hasImage: !!p.image,
        likes: p.likes || 0,
        isPromoted: !!p.is_promoted,
        daysAgo,
      };
    });

    // Sort by promotion score to find top pick
    const sortedByScore = [...postsAnalysis].filter(p => !p.isPromoted).sort((a, b) => b.promotionScore - a.promotionScore);
    const topPickPost = sortedByScore[0] || postsAnalysis[0];

    const topPick = {
      postId: topPickPost.postId,
      reason: replacePkgNamesInText(aiResult?.topPickReason || `هذا المنشور حصل على أعلى نقاط ترويج (${topPickPost.promotionScore}/100) - ${topPickPost.hasImage ? 'لديه صورة' : 'ينصح بإضافة صورة'}، تصنيف "${topPickPost.category}"، والباقة المقترحة "${topPickPost.suggestedPackage}"`),
    };

    const overallStrategy = replacePkgNamesInText(aiResult?.overallStrategy || 
      (unpromotedPosts > 0
        ? `لديك ${unpromotedPosts} منشور غير مروّج. ننصح بالبدء بمنشور "${topPickPost.contentPreview.slice(0, 30)}..." وباقة ${topPickPost.suggestedPackage}. ركز على المنشورات ذات الصور والأسعار الواضحة أولاً.`
        : 'جميع منشوراتك مروّجة! راقب أداءها وجرّب باقات أعلى للمنشورات الأكثر تفاعلاً.'));

    // Calculate budget recommendation
    const unpromotedHighPotential = postsAnalysis.filter(p => !p.isPromoted && p.promotionScore >= 60).sort((a, b) => b.promotionScore - a.promotionScore);
    const pkgPrices: Record<string, number> = { basic: 50, standard: 120, premium: 250, vip: 500, city_target: 120, interest_target: 200 };
    const suggestedPackages = (aiResult?.budgetRecommendation?.suggestedPackages
      ? aiResult.budgetRecommendation.suggestedPackages.map((sp: any) => ({
          ...sp,
          package: arPkg(sp.package),
          reason: replacePkgNamesInText(sp.reason || ''),
        }))
      : unpromotedHighPotential.slice(0, 3).map((p, i) => ({
        priority: i + 1,
        postId: p.postId,
        package: p.suggestedPackage || 'قياسي',
        price: pkgPrices[p.suggestedPackageId] || 120,
        reason: `منشور بنقاط ${p.promotionScore}/100 - ${p.hasImage ? 'لديه صورة' : 'يحتاج صورة'}`,
      }))
    );
    const totalNeeded = aiResult?.budgetRecommendation?.totalNeeded || suggestedPackages.reduce((sum: number, p: any) => sum + (p.price || 0), 0);

    const aiTips = (aiResult?.aiTips || [
      'أضف صور عالية الجودة لكل إعلان - تزيد التفاعل بنسبة 40%',
      'حدد السعر والموقع دائماً - إعلانات واضحة تحقق نتائج أفضل',
      'ابدأ بباقة قياسي أو مميز - توازن جيد بين التكلفة والوصول',
    ]).map((tip: string) => replacePkgNamesInText(tip));

    res.json({
      success: true,
      data: {
        totalPosts,
        promotedPosts,
        unpromotedPosts,
        posts: postsAnalysis,
        topPick,
        overallStrategy,
        budgetRecommendation: {
          totalNeeded,
          suggestedPackages,
        },
        aiTips,
      },
    });
  } catch (error: any) {
    console.error('[AI] Analyze my posts error:', error.message);
    res.status(500).json({ error: 'حدث خطأ في تحليل المنشورات' });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 11. AI اقتراحات استباقية لنشر المنشورات - Smart Post Suggestions
// يحلل نشاط المستخدم ويقترح عليه نشر منشورات بناءً على اهتماماته
// ═══════════════════════════════════════════════════════════════════════
router.post('/smart-post-suggest', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'يجب تسجيل الدخول' });

    const user = getUserById(userId);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

    const db = database;
    const walletBalance = user.wallet_balance || 0;

    // Analyze user activity
    const userPostsCount = (db.prepare('SELECT COUNT(*) as count FROM posts WHERE author_id = ?').get(userId) as any)?.count || 0;
    const lastPost = db.prepare('SELECT created_at, category, content FROM posts WHERE author_id = ? ORDER BY created_at DESC LIMIT 1').get(userId) as any;
    const daysSinceLastPost = lastPost ? Math.floor((Date.now() - new Date(lastPost.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 999;

    // Get trending categories
    const trendingCategories = db.prepare(`
      SELECT category, COUNT(*) as count
      FROM posts
      WHERE created_at > datetime('now', '-7 days')
      GROUP BY category
      ORDER BY count DESC
      LIMIT 5
    `).all() as any[];

    // Get user's interests
    const userInterests = (user.interests || '').split(',').filter((i: string) => i.trim());

    // Build context for AI
    const contextInfo = `
معلومات المستخدم:
- الاسم: ${user.name}
- عدد المنشورات: ${userPostsCount}
- أيام منذ آخر منشور: ${daysSinceLastPost}
- آخر تصنيف: ${lastPost?.category || 'لا يوجد'}
- الاهتمامات: ${userInterests.join(', ') || 'غير محدد'}
- رصيد المحفظة: ${walletBalance} ج.م
- الموقع: ${user.location || 'غير محدد'}

التصنيفات الرائجة هذا الأسبوع:
${trendingCategories.map((c: any) => `- ${c.category}: ${c.count} منشور`).join('\n')}
`;

    const aiContent = await tryAICompletion([
      {
        role: 'system',
        content: `أنت مساعد ذكي على منصة "نواقص" - منصة الإعلانات الذكية في مصر.
مهمتك اقتراح أفكار منشورات للمستخدم بناءً على نشاطه واهتماماته والتصنيفات الرائجة.

أجب بـ JSON فقط بالشكل التالي:
{
  "shouldSuggest": true/false,
  "reason": "سبب الاقتراح بالعربي",
  "suggestions": [
    {
      "category": "phones",
      "title": "عنوان مقترح",
      "description": "وصف مختصر للمنشور المقترح",
      "suggestedContent": "نص المنشور المقترح بالعربي",
      "suggestedPrice": 0,
      "suggestedLocation": "القاهرة",
      "whySuggested": "سبب اقتراح هذا المنشور"
    }
  ],
  "bestTimeToPost": "الوقت المثالي للنشر",
  "motivationMessage": "رسالة تحفيزية قصيرة"
}`
      },
      {
        role: 'user',
        content: contextInfo
      }
    ], { max_tokens: 1200, temperature: 0.8 });

    let result;
    try {
      const content = aiContent || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch { result = null; }

    // Fallback if AI unavailable
    if (!result) {
      const fallbackSuggestions = [];
      
      if (daysSinceLastPost > 3) {
        fallbackSuggestions.push({
          category: userInterests[0] || lastPost?.category || 'phones',
          title: 'شارك إعلانك الجديد',
          description: 'مر وقت طويل منذ آخر منشور - حان وقت النشر!',
          suggestedContent: `للبيع ${userInterests[0] === 'phones' ? 'موبايل' : userInterests[0] === 'cars' ? 'سيارة' : 'منتج'} بحالة ممتازة - تواصل معي للتفاصيل`,
          suggestedPrice: 0,
          suggestedLocation: user.location || 'القاهرة',
          whySuggested: 'لم تنشر منذ فترة - المنشورات الجديدة تجذب مشتركين أكثر',
        });
      }

      if (trendingCategories.length > 0) {
        const topCat = trendingCategories[0];
        fallbackSuggestions.push({
          category: topCat.category,
          title: `انضم للموضة - ${topCat.category} رائج هذا الأسبوع`,
          description: `${topCat.count} منشور في هذا التصنيف هذا الأسبوع`,
          suggestedContent: `عرض خاص في تصنيف ${topCat.category} - لا تفوت الفرصة!`,
          suggestedPrice: 0,
          suggestedLocation: user.location || 'القاهرة',
          whySuggested: `تصنيف ${topCat.category} رائج الآن مع ${topCat.count} منشور جديد`,
        });
      }

      if (walletBalance >= 50 && userPostsCount > 0) {
        fallbackSuggestions.push({
          category: lastPost?.category || 'other',
          title: 'روّج إعلانك الحالي',
          description: 'رصيدك يكفي لباقة ترويج - زد وصول إعلانك!',
          suggestedContent: '',
          suggestedPrice: 0,
          suggestedLocation: '',
          whySuggested: `رصيد محفظتك ${walletBalance} ج.م يكفي لبدء الترويج`,
        });
      }

      result = {
        shouldSuggest: fallbackSuggestions.length > 0,
        reason: daysSinceLastPost > 3 ? 'لم تنشر منذ فترة' : 'فرص جديدة متاحة',
        suggestions: fallbackSuggestions,
        bestTimeToPost: 'بين الساعة 6-10 مساءً - وقت الذروة في مصر',
        motivationMessage: daysSinceLastPost > 7 ? 'منصة نواقص تنتظر إعلاناتك! انشر الآن واصل لآلاف المهتمين' : 'استمر في النشر - كل منشور جديد يزيد فرص البيع!',
      };
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[AI] Smart post suggest error:', error.message);
    res.status(500).json({ error: 'حدث خطأ في اقتراح المنشورات' });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 12. AI مساعد كتابة المنشورات - Post Writing Assistant
// يساعد المستخدم في كتابة منشور جذاب خطوة بخطوة
// ═══════════════════════════════════════════════════════════════════════
router.post('/write-assistant', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { category, description, price, location, type, step } = req.body;

    if (!category) {
      return res.status(400).json({ error: 'التصنيف مطلوب' });
    }

    const user = userId ? getUserById(userId) : null;
    const walletBalance = user?.wallet_balance || 0;

    // Category-specific guidance
    const categoryGuidance: Record<string, any> = {
      phones: { keywords: 'موديل، ذاكرة، حالة، لون، ملحقات', tips: 'اذكر الموديل والذاكرة والحالة بدقة', avgPriceRange: '2,000 - 25,000 ج.م' },
      electronics: { keywords: 'نوع، مواصفات، حالة، ضمان', tips: 'حدد المواصفات التقنية بدقة', avgPriceRange: '500 - 50,000 ج.م' },
      cars: { keywords: 'موديل، سنة، حالة، كيلومترات، لون', tips: 'اذكر سنة الصنع والمسافة وال حالة', avgPriceRange: '50,000 - 2,000,000 ج.م' },
      realEstate: { keywords: 'المساحة، الموقع، عدد الغرف، الطابق', tips: 'حدد المساحة والموقع بدقة', avgPriceRange: '500,000 - 15,000,000 ج.م' },
      games: { keywords: 'اسم اللعبة، المنصة، الحالة', tips: 'حدد المنصة (PS5/Xbox/PC) والحالة', avgPriceRange: '100 - 2,500 ج.م' },
      fashion: { keywords: 'الماركة، المقاس، اللون، الحالة', tips: 'اذكر الماركة والمقاس بالتفصيل', avgPriceRange: '50 - 5,000 ج.م' },
      beauty: { keywords: 'المنتج، الماركة، الحجم، الصلاحية', tips: 'تأكد من ذكر تاريخ الصلاحية', avgPriceRange: '50 - 3,000 ج.م' },
      sports: { keywords: 'النوع، المقاس، الحالة، الماركة', tips: 'حدد النوع والمقاس بدقة', avgPriceRange: '100 - 10,000 ج.م' },
      food: { keywords: 'النوع، الكمية، السعر، التوصيل', tips: 'حدد إذا كان التوصيل متاح', avgPriceRange: '20 - 500 ج.م' },
      jobs: { keywords: 'المسمى الوظيفي، الراتب، الموقع، المتطلبات', tips: 'كن واضحاً في المتطلبات والراتب', avgPriceRange: '3,000 - 50,000 ج.م' },
      services: { keywords: 'نوع الخدمة، السعر، المنطقة', tips: 'حدد سعر الخدمة بوضوح', avgPriceRange: '50 - 10,000 ج.م' },
      education: { keywords: 'المادة، المستوى، السعر، المدة', tips: 'حدد المستوى الدراسي والمدة', avgPriceRange: '50 - 5,000 ج.م' },
      books: { keywords: 'العنوان، المؤلف، الحالة، اللغة', tips: 'حدد لغة الكتاب وحالته', avgPriceRange: '20 - 500 ج.م' },
      animals: { keywords: 'النوع، العمر، السعر، التطعيمات', tips: 'اذكر التطعيمات والعمر', avgPriceRange: '50 - 50,000 ج.م' },
      travel: { keywords: 'الوجهة، المدة، السعر، الشامل', tips: 'حدد ما يشمله العرض', avgPriceRange: '500 - 20,000 ج.م' },
      photography: { keywords: 'المناسبة، السعر، المدة', tips: 'حدد نوع التصوير والسعر', avgPriceRange: '200 - 10,000 ج.م' },
      health: { keywords: 'الخدمة، السعر، الموقع', tips: 'كن واضحاً في الخدمة المعروضة', avgPriceRange: '50 - 5,000 ج.م' },
    };

    const guidance = categoryGuidance[category] || categoryGuidance.electronics;

    const aiContent = await tryAICompletion([
      {
        role: 'system',
        content: `أنت مساعد كتابة إعلانات ذكي على منصة "نواقص" - منصة الإعلانات الذكية في مصر.
مهمتك مساعدة المستخدم في كتابة إعلان جذاب وفعال.

التصنيف: ${category}
الكلمات المفتاحية المهمة: ${guidance.keywords}
نصائح التصنيف: ${guidance.tips}
متوسط الأسعار: ${guidance.avgPriceRange}

أجب بـ JSON فقط:
{
  "generatedTitle": "عنوان جذاب للإعلان",
  "generatedContent": "نص الإعلان الكامل والجذاب",
  "suggestedPrice": 0,
  "suggestedHashtags": ["هاشتاق1", "هاشتاق2"],
  "callToAction": "دعوة للإجراء",
  "qualityScore": 85,
  "improvementTips": ["نصيحة1", "نصيحة2"],
  "suggestedPackage": "standard",
  "estimatedReach": 3000,
  "priceAnalysis": "تحليل السعر"
}`
      },
      {
        role: 'user',
        content: description 
          ? `أريد كتابة إعلان في تصنيف "${category}": ${description}${price ? `\nالسعر: ${price} ج.م` : ''}${location ? `\nالموقع: ${location}` : ''}`
          : `أريد كتابة إعلان في تصنيف "${category}"${price ? ` بسعر ${price} ج.م` : ''}${location ? ` في ${location}` : ''} - ساعدني في كتابته`
      }
    ], { max_tokens: 1000, temperature: 0.7 });

    let result;
    try {
      const content = aiContent || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      if (result?.suggestedPackage) {
        result.suggestedPackage = arPkg(result.suggestedPackage);
      }
    } catch { result = null; }

    // Fallback
    if (!result) {
      result = {
        generatedTitle: `${category === 'phones' ? 'موبايل' : category === 'cars' ? 'سيارة' : category === 'realEstate' ? 'عقار' : 'منتج'} للبيع - عرض مميز`,
        generatedContent: description || `للبيع ${category === 'phones' ? 'موبايل' : 'منتج'} بحالة ممتازة\n${guidance.keywords.split('، ').map((k: string) => `${k}: [حدد]`).join('\n')}\n\nللتواصل: اترك تعليق أو رسالة\nالموقع: ${location || 'حدد الموقع'}`,
        suggestedPrice: price || 0,
        suggestedHashtags: [category, 'بيع', 'مصر', 'نواقص'],
        callToAction: 'تواصل الآن - العرض لفترة محدودة!',
        qualityScore: 60,
        improvementTips: [
          `أضف التفاصيل: ${guidance.keywords}`,
          'أضف صورة واضحة عالية الجودة',
          'حدد السعر بوضوح لزيادة الثقة',
          'اذكر حالة المنتج بالتفصيل',
        ],
        suggestedPackage: arPkg('standard'),
        estimatedReach: 3000,
        priceAnalysis: price ? `السعر ${price} ج.م في نطاق ${guidance.avgPriceRange}` : `متوسط الأسعار في هذا التصنيف: ${guidance.avgPriceRange}`,
      };
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[AI] Write assistant error:', error.message);
    res.status(500).json({ error: 'حدث خطأ في مساعد الكتابة' });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 13. AI أفضل وقت للنشر - Best Time to Post
// ═══════════════════════════════════════════════════════════════════════
router.get('/best-time', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const db = database;

    // Analyze engagement patterns across all posts
    const engagementByHour: Record<number, { posts: number; totalLikes: number; totalComments: number }> = {};
    for (let h = 0; h < 24; h++) {
      engagementByHour[h] = { posts: 0, totalLikes: 0, totalComments: 0 };
    }

    try {
      const postsWithEngagement = db.prepare(`
        SELECT 
          CAST(strftime('%H', created_at) AS INTEGER) as hour,
          COUNT(*) as posts,
          COALESCE(SUM(likes), 0) as totalLikes,
          COALESCE(SUM(comments), 0) as totalComments
        FROM posts
        WHERE created_at > datetime('now', '-30 days')
        GROUP BY hour
        ORDER BY hour
      `).all() as any[];

      postsWithEngagement.forEach((row: any) => {
        if (row.hour >= 0 && row.hour < 24) {
          engagementByHour[row.hour] = {
            posts: row.posts,
            totalLikes: row.totalLikes,
            totalComments: row.totalComments,
          };
        }
      });
    } catch { /* use defaults */ }

    // Calculate engagement score per hour
    const hourScores = Object.entries(engagementByHour).map(([hour, data]) => {
      const engagement = data.totalLikes + data.totalComments * 2;
      const avgEngagement = data.posts > 0 ? engagement / data.posts : 0;
      return { hour: parseInt(hour), engagement, avgEngagement, posts: data.posts };
    });

    // Sort by average engagement
    hourScores.sort((a, b) => b.avgEngagement - a.avgEngagement);
    const topHours = hourScores.slice(0, 5);

    // Egyptian time patterns (default wisdom)
    const defaultBestTimes = [
      { hour: 20, label: '8 مساءً', reason: 'وقت الذروة - معظم المستخدمين متصلون' },
      { hour: 21, label: '9 مساءً', reason: 'ثاني أفضل وقت - مستخدمون كثيرون' },
      { hour: 19, label: '7 مساءً', reason: 'بعد العمل - نشاط جيد' },
      { hour: 18, label: '6 مساءً', reason: 'بداية المساء - نشاط متوسط' },
      { hour: 22, label: '10 مساءً', reason: 'وقت متأخر لكن نشاط مستمر' },
    ];

    const result = {
      bestTimes: topHours.length > 0 && topHours[0].avgEngagement > 0
        ? topHours.map((h, i) => ({
            hour: h.hour,
            label: `${h.hour > 12 ? h.hour - 12 : h.hour} ${h.hour >= 12 ? 'مساءً' : 'صباحاً'}`,
            reason: i === 0 ? 'أعلى تفاعل بناءً على بيانات المنصة' : `مرتفع التفاعل`,
            avgEngagement: Math.round(h.avgEngagement),
          }))
        : defaultBestTimes,
      bestDay: 'الجمعة والسبت',
      timezone: 'Africa/Cairo',
      currentHour: new Date().getHours(),
      recommendation: new Date().getHours() >= 18 && new Date().getHours() <= 22
        ? 'الآن وقت ممتاز للنشر! المستخدمون نشطون.'
        : new Date().getHours() < 18
          ? 'انتظر حتى المساء (6-10 مساءً) لأفضل وصول'
          : 'الوقت متأخر قليلاً - الصباح الباكر أو المساء أفضل',
    };

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[AI] Best time error:', error.message);
    res.status(500).json({ error: 'حدث خطأ في تحليل أفضل وقت' });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 14. AI المواضيع الرائجة - Trending Topics
// ═══════════════════════════════════════════════════════════════════════
router.get('/trending-topics', authMiddleware, async (req: Request, res: Response) => {
  try {
    const db = database;

    // Get trending categories this week vs last week
    const thisWeek = db.prepare(`
      SELECT category, COUNT(*) as count, AVG(likes) as avgLikes, AVG(comments) as avgComments
      FROM posts
      WHERE created_at > datetime('now', '-7 days')
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10
    `).all() as any[];

    const lastWeek = db.prepare(`
      SELECT category, COUNT(*) as count
      FROM posts
      WHERE created_at BETWEEN datetime('now', '-14 days') AND datetime('now', '-7 days')
      GROUP BY category
    `).all() as any[];

    const lastWeekMap = Object.fromEntries(lastWeek.map((r: any) => [r.category, r.count]));

    const trending = thisWeek.map((item: any) => ({
      category: item.category,
      postsThisWeek: item.count,
      postsLastWeek: lastWeekMap[item.category] || 0,
      growth: lastWeekMap[item.category] ? Math.round(((item.count - lastWeekMap[item.category]) / lastWeekMap[item.category]) * 100) : 100,
      avgLikes: Math.round(item.avgLikes || 0),
      avgComments: Math.round(item.avgComments || 0),
    }));

    // Get hot keywords from recent posts
    const recentPosts = db.prepare(`
      SELECT content FROM posts
      WHERE created_at > datetime('now', '-3 days')
      ORDER BY likes DESC
      LIMIT 50
    `).all() as any[];

    const aiContent = await tryAICompletion([
      {
        role: 'system',
        content: `أنت محلل اتجاهات على منصة "نواقص". حلل المنشورات الأخيرة وحدد المواضيع الرائجة.
أجب بـ JSON فقط:
{
  "hotTopics": ["موضوع1", "موضوع2", "موضوع3"],
  "suggestedCategories": [{"category": "phones", "reason": "السبب"}],
  "trendInsight": "تحليل قصير بالعربي"
}`
      },
      {
        role: 'user',
        content: `أحدث المنشورات الشائعة:\n${recentPosts.slice(0, 15).map((p: any) => p.content?.slice(0, 100)).join('\n')}`
      }
    ], { max_tokens: 500 });

    let aiTrends = null;
    try {
      const content = aiContent || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      aiTrends = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch { aiTrends = null; }

    res.json({
      success: true,
      data: {
        trending,
        hotTopics: aiTrends?.hotTopics || ['إلكترونيات', 'موبايلات', 'سيارات'],
        suggestedCategories: aiTrends?.suggestedCategories || trending.slice(0, 3).map(t => ({ category: t.category, reason: `${t.postsThisWeek} منشور هذا الأسبوع` })),
        trendInsight: aiTrends?.trendInsight || trending.length > 0 ? `تصنيف ${trending[0]?.category || 'عام'} هو الأكثر نشاطاً هذا الأسبوع` : 'لا توجد بيانات كافية',
      },
    });
  } catch (error: any) {
    console.error('[AI] Trending topics error:', error.message);
    res.status(500).json({ error: 'حدث خطأ في جلب المواضيع الرائجة' });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 15. AI اقتراح السعر - Smart Price Suggestion
// ═══════════════════════════════════════════════════════════════════════
router.post('/price-suggest', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { category, description, condition } = req.body;
    const db = database;

    // Get price statistics for the category
    const priceStats = db.prepare(`
      SELECT 
        MIN(price) as minPrice,
        MAX(price) as maxPrice,
        AVG(price) as avgPrice,
        COUNT(*) as count
      FROM posts
      WHERE category = ? AND price > 0 AND created_at > datetime('now', '-30 days')
    `).get(category || 'other') as any;

    const aiContent = await tryAICompletion([
      {
        role: 'system',
        content: `أنت خبير تسعير على منصة "نواقص". اقترح سعر مناسب بناءً على البيانات.
إحصائيات السوق للتصنيف "${category}":
- أقل سعر: ${priceStats?.minPrice || 0} ج.م
- أعلى سعر: ${priceStats?.maxPrice || 0} ج.م
- متوسط السعر: ${Math.round(priceStats?.avgPrice || 0)} ج.م
- عدد الإعلانات: ${priceStats?.count || 0}

أجب بـ JSON فقط:
{
  "suggestedPrice": 0,
  "priceRange": {"min": 0, "max": 0},
  "reasoning": "شرح بالعربي",
  "competitiveness": "low|medium|high",
  "tips": ["نصيحة1", "نصيحة2"]
}`
      },
      {
        role: 'user',
        content: `أريد تسعير منشور في تصنيف "${category}"${description ? `: ${description}` : ''}${condition ? ` | الحالة: ${condition}` : ''}`
      }
    ], { max_tokens: 500 });

    let result;
    try {
      const content = aiContent || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch { result = null; }

    if (!result) {
      const avgPrice = Math.round(priceStats?.avgPrice || 0);
      result = {
        suggestedPrice: avgPrice,
        priceRange: {
          min: Math.round((priceStats?.minPrice || avgPrice * 0.5)),
          max: Math.round((priceStats?.maxPrice || avgPrice * 2)),
        },
        reasoning: `متوسط السعر في تصنيف ${category} هو ${avgPrice} ج.م بناءً على ${priceStats?.count || 0} إعلان`,
        competitiveness: 'medium',
        tips: [
          'حدد سعر تنافسي لجذب المشترين',
          'السعر المعقول يزيد فرصة البيع بنسبة 60%',
          'يمكنك التفاوض - اترك هامش بسيط',
        ],
      };
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[AI] Price suggest error:', error.message);
    res.status(500).json({ error: 'حدث خطأ في اقتراح السعر' });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 16. AI مستشار الباقات الذكي - Package Advisor
// يقارن الباقات ويساعد المستخدم في اختيار الأنسب
// ═══════════════════════════════════════════════════════════════════════
router.post('/package-advisor', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { category, budget, goal, postId } = req.body;
    const userId = (req as any).user?.userId;

    const user = userId ? getUserById(userId) : null;
    const walletBalance = user?.wallet_balance || 0;
    const actualBudget = budget || walletBalance || 0;

    const packages = [
      { id: 'basic', name: 'أساسي', nameEn: 'basic', price: 50, reach: 900, days: 3, notifications: 30, costPerReach: (50/900).toFixed(2), features: ['3 أيام ترويج', '900 وصول', '30 إشعار ترويجي'] },
      { id: 'standard', name: 'قياسي', nameEn: 'standard', price: 120, reach: 3000, days: 5, notifications: 100, costPerReach: (120/3000).toFixed(2), features: ['5 أيام ترويج', '3,000 وصول', '100 إشعار ترويجي', 'إحصائيات أساسية'] },
      { id: 'premium', name: 'مميز', nameEn: 'premium', price: 250, reach: 8000, days: 7, notifications: 250, costPerReach: (250/8000).toFixed(2), features: ['7 أيام ترويج', '8,000 وصول', '250 إشعار ترويجي', 'إحصائيات متقدمة', 'الأكثر طلباً'] },
      { id: 'vip', name: 'VIP', nameEn: 'vip', price: 500, reach: 25000, days: 10, notifications: 600, costPerReach: (500/25000).toFixed(2), features: ['10 أيام ترويج', '25,000 وصول', '600 إشعار ترويجي', 'إحصائيات شاملة', 'أولوية في الظهور', 'دعم مميز'] },
      { id: 'city_target', name: 'استهداف مدن', nameEn: 'city_target', price: 120, reach: 4500, days: 5, notifications: 150, costPerReach: (120/4500).toFixed(2), features: ['5 أيام ترويج', '4,500 وصول', '150 إشعار', 'اختيار 1-27 مدينة'] },
      { id: 'interest_target', name: 'استهداف اهتمامات', nameEn: 'interest_target', price: 200, reach: 7000, days: 5, notifications: 200, costPerReach: (200/7000).toFixed(2), features: ['5 أيام ترويج', '7,000 وصول', '200 إشعار', 'استهداف دقيق بالاهتمامات'] },
    ];

    // Calculate best value
    const bestValue = packages.reduce((best, p) => (parseFloat(p.costPerReach) < parseFloat(best.costPerReach)) ? p : best, packages[0]);

    // Get user's promotion history for context
    let promotionHistory = '';
    if (userId) {
      try {
        const prevPromos = database.prepare(`
          SELECT promotion_tier, COUNT(*) as count
          FROM posts
          WHERE author_id = ? AND is_promoted = 1
          GROUP BY promotion_tier
        `).all(userId) as any[];
        promotionHistory = prevPromos.map((p: any) => `${arPkg(p.promotion_tier || 'basic')}: ${p.count} مرة`).join(', ');
      } catch { /* ignore */ }
    }

    const aiContent = await tryAICompletion([
      {
        role: 'system',
        content: `أنت مستشار باقات ترويج ذكي على منصة "نواقص".
ميزانية المستخدم: ${actualBudget} ج.م
هدفه: ${goal || 'زيادة الوصول'}
تصنيف إعلانه: ${category || 'عام'}
سابقة الترويج: ${promotionHistory || 'لا يوجد'}

أجب بـ JSON فقط:
{
  "recommendedPackage": "basic|standard|premium|vip|city_target|interest_target",
  "reasoning": "شرح مفصل بالعربي لماذا هذه الباقة الأنسب",
  "alternativePackage": "باقة بديلة",
  "alternativeReasoning": "سبب البديل",
  "roi": "العائد المتوقع",
  "tips": ["نصيحة1", "نصيحة2", "نصيحة3"]
}`
      },
      {
        role: 'user',
        content: `اقترح لي أفضل باقة ترويج. ميزانيتي ${actualBudget} ج.م وأريد ${goal || 'زيادة الوصول'}`
      }
    ], { max_tokens: 800 });

    let aiAdvice = null;
    try {
      const content = aiContent || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      aiAdvice = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      if (aiAdvice?.recommendedPackage) {
        aiAdvice.recommendedPackage = arPkg(aiAdvice.recommendedPackage);
      }
      if (aiAdvice?.alternativePackage) {
        aiAdvice.alternativePackage = arPkg(aiAdvice.alternativePackage);
      }
    } catch { aiAdvice = null; }

    res.json({
      success: true,
      data: {
        packages,
        bestValue,
        walletBalance: actualBudget,
        canAfford: packages.filter(p => p.price <= actualBudget),
        needsCharging: actualBudget < 50,
        aiAdvice: aiAdvice || {
          recommendedPackage: actualBudget >= 250 ? 'مميز' : actualBudget >= 120 ? 'قياسي' : actualBudget >= 50 ? 'أساسي' : 'شحن المحفظة أولاً',
          reasoning: actualBudget >= 250 ? 'باقة مميزة - الأكثر طلباً وأفضل عائد. 8,000 وصول و7 أيام ترويج' : actualBudget >= 120 ? 'باقة قياسية جيدة - 3,000 وصول و5 أيام' : 'ابدأ بباقة أساسية أو اشحن محفظتك',
          alternativePackage: actualBudget >= 500 ? 'VIP' : actualBudget >= 200 ? 'استهداف اهتمامات' : null,
          alternativeReasoning: actualBudget >= 500 ? 'باقة VIP تعطي أقصى وصول 25,000 مستخدم' : actualBudget >= 200 ? 'استهداف الاهتمامات يوفر وصول دقيق' : '',
          roi: `كل 1 ج.م = ${actualBudget >= 250 ? '32 وصول' : actualBudget >= 120 ? '25 وصول' : '18 وصول'} تقريباً`,
          tips: ['أضف صورة لزيادة التفاعل بنسبة 40%', 'حدد السعر بوضوح', 'اكتب عنواناً جذاباً'],
        },
      },
    });
  } catch (error: any) {
    console.error('[AI] Package advisor error:', error.message);
    res.status(500).json({ error: 'حدث خطأ في مستشار الباقات' });
  }
});

export default router;
