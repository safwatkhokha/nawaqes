// ─── Global AI Assistant المساعد الذكي ──────────────────────────────
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Sparkles, Send, X, Bot, User, ChevronDown, Lightbulb,
  TrendingUp, PenTool, DollarSign, Target, Clock, BarChart3,
  Wallet, Megaphone, Video, Loader2, Zap, Search, Wand2,
  MessageSquare, Brain, Handshake, FileBarChart, Users, Eye,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'suggestion' | 'search-suggestion' | 'improve-result';
  metadata?: Record<string, any>;
}

// ─── Page Context Config ──────────────────────────────────────────────
type QuickActionDef = { id: string; label: string; icon: string; color: string; apiMethod: string; needsInput?: boolean };

const PAGE_CONTEXT: Record<string, { quickActions: QuickActionDef[]; proactiveMsg: string; searchHint?: string }> = {
  '/': {
    quickActions: [
      { id: 'post-suggest', label: 'اقتراحات منشورات', icon: 'lightbulb', color: 'from-amber-500 to-orange-500', apiMethod: 'aiSmartPostSuggest' },
      { id: 'best-time', label: 'أفضل وقت للنشر', icon: 'clock', color: 'from-blue-500 to-cyan-500', apiMethod: 'aiBestTime' },
      { id: 'behavior', label: '📊 تحليل سلوكي', icon: 'brain', color: 'from-indigo-500 to-violet-500', apiMethod: 'aiBehaviorAnalysis' },
      { id: 'predict', label: '🔮 اقتراحات تنبؤية', icon: 'eye', color: 'from-fuchsia-500 to-purple-500', apiMethod: 'aiPredictiveSuggestions' },
      { id: 'trending', label: 'المواضيع الرائجة', icon: 'trending', color: 'from-rose-500 to-pink-500', apiMethod: 'aiTrendingTopics' },
    ],
    proactiveMsg: '👋 مرحباً! اكتشف اقتراحاتي الذكية: تحليل سلوكك، اقتراحات تنبؤية، وأفضل وقت للنشر!',
    searchHint: 'ابحث عن منشورات أو منتجات وسأساعدك في العثور على الأنسب',
  },
  '/market': {
    quickActions: [
      { id: 'smart-pricing', label: '💰 تسعير ذكي', icon: 'brain', color: 'from-green-600 to-emerald-600', apiMethod: 'aiSmartPricing' },
      { id: 'smart-match', label: '🤝 مطابقة ذكية', icon: 'users', color: 'from-blue-600 to-indigo-600', apiMethod: 'aiSmartMatching' },
      { id: 'negotiate', label: '🤝 مساعد التفاوض', icon: 'handshake', color: 'from-amber-600 to-orange-600', apiMethod: 'aiNegotiationAssistant' },
      { id: 'enhance', label: 'تحسين وصف المنتج', icon: 'pen', color: 'from-violet-500 to-purple-500', apiMethod: 'aiEnhanceContent' },
      { id: 'improve-desc', label: '✨ تحسين الوصف تلقائياً', icon: 'wand', color: 'from-fuchsia-500 to-pink-500', apiMethod: 'aiImproveDescription', needsInput: true },
      { id: 'smart-reports', label: '📊 تقرير ذكي', icon: 'report', color: 'from-teal-600 to-cyan-600', apiMethod: 'aiSmartReports' },
    ],
    proactiveMsg: '🛒 اكتشف قوة السوق الذكي! تسعير ذكي، مطابقة مع المشترين، مساعد تفاوض، وتقارير أداء!',
    searchHint: 'اكتب اسم المنتج أو التصنيف وسأقترح لك أفضل الأسعار والوصف',
  },
  '/livestream': {
    quickActions: [
      { id: 'stream-tips', label: 'نصائح البث', icon: 'video', color: 'from-red-500 to-rose-500', apiMethod: 'aiAssistant' },
      { id: 'viewers', label: 'زيادة المشاهدين', icon: 'trending', color: 'from-blue-500 to-indigo-500', apiMethod: 'aiAssistant' },
      { id: 'predict', label: '🔮 اقتراحات تنبؤية', icon: 'eye', color: 'from-fuchsia-500 to-purple-500', apiMethod: 'aiPredictiveSuggestions' },
    ],
    proactiveMsg: '🎥 استعد للبث المباشر! اسألني عن نصائح لزيادة المشاهدين أو اقتراحات تنبؤية لمحتوى بثك.',
    searchHint: 'اكتب موضوع البث وسأقترح لك أفكاراً لزيادة المشاهدين',
  },
  '/profile': {
    quickActions: [
      { id: 'analyze', label: 'تحليل المنشورات', icon: 'bar', color: 'from-teal-500 to-cyan-500', apiMethod: 'aiAnalyzeMyPosts' },
      { id: 'behavior', label: '📊 تحليل سلوكي', icon: 'brain', color: 'from-indigo-500 to-violet-500', apiMethod: 'aiBehaviorAnalysis' },
      { id: 'smart-match', label: '🤝 مطابقة ذكية', icon: 'users', color: 'from-blue-600 to-indigo-600', apiMethod: 'aiSmartMatching' },
      { id: 'smart-reports', label: '📊 تقرير ذكي', icon: 'report', color: 'from-teal-600 to-cyan-600', apiMethod: 'aiSmartReports' },
    ],
    proactiveMsg: '📊 حلّل أداءك الشامل! تحليل سلوكي، مطابقة ذكية مع المشترين، وتقارير أداء مفصلة.',
    searchHint: 'اكتب سؤالك عن أداء منشوراتك وسأساعدك',
  },
  '/create': {
    quickActions: [
      { id: 'write-ad', label: 'كتابة إعلان جذاب', icon: 'pen', color: 'from-purple-500 to-pink-500', apiMethod: 'aiWriteAssistant' },
      { id: 'smart-pricing', label: '💰 تسعير ذكي', icon: 'brain', color: 'from-green-600 to-emerald-600', apiMethod: 'aiSmartPricing' },
      { id: 'smart-suggest', label: 'اقتراحات ذكية', icon: 'lightbulb', color: 'from-yellow-500 to-amber-500', apiMethod: 'aiSmartPostSuggest' },
      { id: 'improve-desc', label: '✨ تحسين الوصف تلقائياً', icon: 'wand', color: 'from-fuchsia-500 to-pink-500', apiMethod: 'aiImproveDescription', needsInput: true },
    ],
    proactiveMsg: '✍️ أنشئ إعلانك باحترافية! تسعير ذكي، كتابة إعلان جذاب، وتحسين الوصف تلقائياً!',
    searchHint: 'اكتب فكرة الإعلان وسأساعدك في صياغته بشكل احترافي',
  },
  '/wallet': {
    quickActions: [
      { id: 'charge', label: 'شحن المحفظة', icon: 'dollar', color: 'from-green-500 to-teal-500', apiMethod: 'aiBudgetSuggestion' },
      { id: 'promo-pkgs', label: 'باقات الترويج', icon: 'target', color: 'from-orange-500 to-red-500', apiMethod: 'aiPackageAdvisor' },
      { id: 'smart-reports', label: '📊 تقرير الإيرادات', icon: 'report', color: 'from-teal-600 to-cyan-600', apiMethod: 'aiSmartReports' },
    ],
    proactiveMsg: '💰 أدر ميزانيتك بذكاء! تقارير الإيرادات، باقات الترويج، واقتراحات الميزانية.',
    searchHint: 'اكتب ميزانيتك وسأقترح أفضل باقة ترويج لك',
  },
};

const DEFAULT_CONTEXT: { quickActions: QuickActionDef[]; proactiveMsg: string; searchHint?: string } = {
  quickActions: [
    { id: 'suggest', label: 'اقتراحات ذكية', icon: 'lightbulb', color: 'from-amber-500 to-orange-500', apiMethod: 'aiSmartPostSuggest' },
    { id: 'behavior', label: '📊 تحليل سلوكي', icon: 'brain', color: 'from-indigo-500 to-violet-500', apiMethod: 'aiBehaviorAnalysis' },
    { id: 'predict', label: '🔮 اقتراحات تنبؤية', icon: 'eye', color: 'from-fuchsia-500 to-purple-500', apiMethod: 'aiPredictiveSuggestions' },
    { id: 'trending', label: 'المواضيع الرائجة', icon: 'trending', color: 'from-rose-500 to-pink-500', apiMethod: 'aiTrendingTopics' },
  ],
  proactiveMsg: '👋 مرحباً! أنا المساعد الذكي لنواقص. تحليل سلوكي، اقتراحات تنبؤية، ترويج ذكي، وأكثر!',
  searchHint: 'اكتب سؤالك وسأساعدك',
};

const iconMap: Record<string, React.ReactNode> = {
  lightbulb: <Lightbulb className="w-4 h-4" />, clock: <Clock className="w-4 h-4" />,
  trending: <TrendingUp className="w-4 h-4" />, dollar: <DollarSign className="w-4 h-4" />,
  pen: <PenTool className="w-4 h-4" />, target: <Target className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />, bar: <BarChart3 className="w-4 h-4" />,
  megaphone: <Megaphone className="w-4 h-4" />, wallet: <Wallet className="w-4 h-4" />,
  wand: <Wand2 className="w-4 h-4" />, brain: <Brain className="w-4 h-4" />,
  users: <Users className="w-4 h-4" />, handshake: <Handshake className="w-4 h-4" />,
  report: <FileBarChart className="w-4 h-4" />, eye: <Eye className="w-4 h-4" />,
};

// ─── Response Formatting Helper ──────────────────────────────────────
function formatAIResponse(res: any): string {
  if (!res) return 'لا توجد بيانات متاحة حالياً.';

  // If there's a direct reply string, return it
  if (res.reply && typeof res.reply === 'string') {
    return res.reply;
  }

  // Handle data object formatting
  if (res.data) {
    const data = res.data;

    // If data is a string, return it directly
    if (typeof data === 'string') return data;

    // If data has text or content field, use it
    if (data.text && typeof data.text === 'string') return data.text;
    if (data.content && typeof data.content === 'string') return data.content;

    // If data has suggestions array, format as bullet list
    if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
      const parts: string[] = [];
      if (data.motivationMessage) parts.push(data.motivationMessage);
      if (data.reason) parts.push(`📌 ${data.reason}`);
      if (data.bestTimeToPost) parts.push(`🕐 أفضل وقت للنشر: ${data.bestTimeToPost}`);

      parts.push('\n💡 الاقتراحات:');
      data.suggestions.forEach((s: any, i: number) => {
        if (typeof s === 'string') {
          parts.push(`  ${i + 1}. ${s}`);
        } else {
          const title = s.title || s.category || '';
          const desc = s.description || s.suggestedContent || s.whySuggested || '';
          const price = s.suggestedPrice ? ` | 💰 ${s.suggestedPrice} ج.م` : '';
          const location = s.suggestedLocation ? ` | 📍 ${s.suggestedLocation}` : '';
          parts.push(`  ${i + 1}. ${title}${price}${location}`);
          if (desc) parts.push(`     ${desc}`);
        }
      });
      return parts.join('\n');
    }

    // If data has bestTimes array
    if (Array.isArray(data.bestTimes) && data.bestTimes.length > 0) {
      const parts: string[] = ['🕐 أفضل أوقات النشر:'];
      data.bestTimes.forEach((t: any, i: number) => {
        const label = t.label || `${t.hour}:00`;
        const reason = t.reason || '';
        parts.push(`  ${i + 1}. ${label} - ${reason}`);
      });
      if (data.bestDay) parts.push(`\n📅 أفضل يوم: ${data.bestDay}`);
      if (data.recommendation) parts.push(`\n💡 ${data.recommendation}`);
      return parts.join('\n');
    }

    // If data has hotTopics array (trending topics)
    if (Array.isArray(data.hotTopics) && data.hotTopics.length > 0) {
      const parts: string[] = ['🔥 المواضيع الرائجة:'];
      data.hotTopics.forEach((topic: any, i: number) => {
        if (typeof topic === 'string') {
          parts.push(`  ${i + 1}. ${topic}`);
        } else {
          parts.push(`  ${i + 1}. ${topic.category || topic} (${topic.growth ? `+${topic.growth}%` : 'رائج'})`);
        }
      });
      if (data.trendInsight) parts.push(`\n📊 ${data.trendInsight}`);
      if (Array.isArray(data.suggestedCategories) && data.suggestedCategories.length > 0) {
        parts.push('\n💡 تصنيفات مقترحة:');
        data.suggestedCategories.forEach((c: any) => {
          parts.push(`  • ${c.category}: ${c.reason || ''}`);
        });
      }
      return parts.join('\n');
    }

    // If data has price-related fields
    if (data.suggestedPrice !== undefined || data.priceRange) {
      const parts: string[] = ['💰 اقتراح السعر:'];
      if (data.suggestedPrice !== undefined) parts.push(`  السعر المقترح: ${data.suggestedPrice} ج.م`);
      if (data.priceRange) parts.push(`  النطاق: ${data.priceRange.min} - ${data.priceRange.max} ج.م`);
      if (data.reasoning) parts.push(`\n📋 ${data.reasoning}`);
      if (data.competitiveness) {
        const compMap: Record<string, string> = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية' };
        parts.push(`  التنافسية: ${compMap[data.competitiveness] || data.competitiveness}`);
      }
      if (Array.isArray(data.tips) && data.tips.length > 0) {
        parts.push('\n💡 نصائح:');
        data.tips.forEach((t: string) => parts.push(`  • ${t}`));
      }
      return parts.join('\n');
    }

    // If data has package-related fields
    if (data.recommendedPackage || data.recommended || data.bestValue) {
      const parts: string[] = ['📦 توصية الباقة:'];
      const rec = data.recommendedPackage || data.recommended;
      if (rec) {
        if (rec.name) parts.push(`  الباقة: ${rec.name}`);
        if (rec.price) parts.push(`  السعر: ${rec.price} ج.م`);
        if (rec.reach) parts.push(`  الوصول: ${rec.reach} مستخدم`);
        if (rec.days) parts.push(`  المدة: ${rec.days} أيام`);
      }
      if (data.bestValue) {
        const bv = data.bestValue;
        parts.push(`\n⭐ أفضل قيمة: ${bv.name || bv.id} - ${bv.price} ج.م / ${bv.reach} وصول`);
      }
      if (data.reasoning) parts.push(`\n📋 ${data.reasoning}`);
      if (data.aiInsight) parts.push(`\n🤖 ${data.aiInsight}`);
      if (Array.isArray(data.affordable) && data.affordable.length > 0) {
        parts.push('\n💼 الباقات المتاحة:');
        data.affordable.forEach((p: any) => parts.push(`  • ${p.name}: ${p.price} ج.م / ${p.reach} وصول`));
      }
      if (Array.isArray(data.tips) && data.tips.length > 0) {
        parts.push('\n💡 نصائح:');
        data.tips.forEach((t: string) => parts.push(`  • ${t}`));
      }
      return parts.join('\n');
    }

    // If data has enhancedContent (content enhancement)
    if (data.enhancedContent) {
      const parts: string[] = ['✨ المحتوى المحسن:', '', data.enhancedContent];
      if (data.title) parts.push(`\n📝 العنوان: ${data.title}`);
      if (Array.isArray(data.hashtags) && data.hashtags.length > 0) {
        parts.push(`\n#${data.hashtags.join(' #')}`);
      }
      if (data.callToAction) parts.push(`\n🎯 دعوة للإجراء: ${data.callToAction}`);
      if (data.scoreImprovement) parts.push(`\n📈 تحسن النقاط: +${data.scoreImprovement}%`);
      if (Array.isArray(data.tips) && data.tips.length > 0) {
        parts.push('\n💡 نصائح إضافية:');
        data.tips.forEach((t: string) => parts.push(`  • ${t}`));
      }
      return parts.join('\n');
    }

    // If data has improvedDescription (improve-description)
    if (data.improvedDescription) {
      const parts: string[] = ['✨ الوصف المحسن:', '', data.improvedDescription];
      if (data.improvedTitle) parts.push(`\n📝 العنوان المحسن: ${data.improvedTitle}`);
      if (Array.isArray(data.hashtags) && data.hashtags.length > 0) {
        parts.push(`\n#${data.hashtags.join(' #')}`);
      }
      if (data.callToAction) parts.push(`\n🎯 ${data.callToAction}`);
      if (Array.isArray(data.tips) && data.tips.length > 0) {
        parts.push('\n💡 نصائح:');
        data.tips.forEach((t: string) => parts.push(`  • ${t}`));
      }
      return parts.join('\n');
    }

    // If data has posts array (analyze-my-posts)
    if (Array.isArray(data.posts) && data.posts.length > 0) {
      const parts: string[] = [];
      if (data.overallStrategy) parts.push(data.overallStrategy);
      if (data.topPick) {
        parts.push(`\n⭐ أفضل منشور للترويج: ${data.topPick.content?.slice(0, 60) || ''}...`);
        if (data.topPickReason) parts.push(`   السبب: ${data.topPickReason}`);
      }
      if (Array.isArray(data.aiTips) && data.aiTips.length > 0) {
        parts.push('\n💡 نصائح:');
        data.aiTips.forEach((t: string) => parts.push(`  • ${t}`));
      }
      if (data.budgetRecommendation) {
        const br = data.budgetRecommendation;
        parts.push(`\n💰 الميزانية المقترحة: ${br.totalNeeded || 0} ج.م`);
        if (Array.isArray(br.suggestedPackages) && br.suggestedPackages.length > 0) {
          br.suggestedPackages.forEach((sp: any) => {
            parts.push(`  ${sp.priority}. ${arPkgName(sp.package)} - ${sp.price} ج.م: ${sp.reason}`);
          });
        }
      }
      return parts.join('\n');
    }

    // If data has tips array (context-help)
    if (Array.isArray(data.tips) && data.tips.length > 0 && !data.suggestions) {
      const parts: string[] = ['💡 نصائح:'];
      data.tips.forEach((t: string) => parts.push(`  • ${t}`));
      if (Array.isArray(data.quickActions) && data.quickActions.length > 0) {
        parts.push('\n⚡ إجراءات سريعة:');
        data.quickActions.forEach((qa: any) => parts.push(`  • ${qa.label}`));
      }
      return parts.join('\n');
    }

    // If data has walletBalance (budget suggestion)
    if (data.walletBalance !== undefined) {
      const parts: string[] = [`💰 رصيدك: ${data.walletBalance} ج.م`];
      if (data.needsCharging) parts.push('⚠️ تحتاج شحن المحفظة - الحد الأدنى 50 ج.م');
      if (data.reasoning) parts.push(`\n📋 ${data.reasoning}`);
      if (data.aiInsight) parts.push(`\n🤖 ${data.aiInsight}`);
      if (Array.isArray(data.tips) && data.tips.length > 0) {
        parts.push('\n💡 نصائح:');
        data.tips.forEach((t: string) => parts.push(`  • ${t}`));
      }

      return parts.join('\n');
    }

    // ─── Phase 2: Behavior Analysis ────────────────────────────
    if (data.userLevel || data.engagementScore !== undefined) {
      const parts: string[] = ['📊 تحليل سلوكك:'];
      if (data.userLevel) parts.push(`  مستوى النشاط: ${data.userLevel}`);
      if (data.engagementScore !== undefined) parts.push(`  نقاط التفاعل: ${data.engagementScore}/100`);
      if (data.activityPattern) parts.push(`  نمط النشاط: ${data.activityPattern}`);
      if (Array.isArray(data.strengths) && data.strengths.length > 0) {
        parts.push('\n💪 نقاط القوة:');
        data.strengths.forEach((s: string) => parts.push(`  • ${s}`));
      }
      if (Array.isArray(data.weaknesses) && data.weaknesses.length > 0) {
        parts.push('\n⚠️ نقاط التحسين:');
        data.weaknesses.forEach((w: string) => parts.push(`  • ${w}`));
      }
      if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
        parts.push('\n💡 توصيات:');
        data.recommendations.forEach((r: string) => parts.push(`  • ${r}`));
      }
      if (data.spendingInsight) parts.push(`\n💰 ${data.spendingInsight}`);
      if (data.optimalPostingTime) parts.push(`\n🕐 ${data.optimalPostingTime}`);
      return parts.join('\n');
    }

    // ─── Phase 2: Smart Matching ───────────────────────────────
    if (Array.isArray(data.matches) && data.matches.length > 0) {
      const parts: string[] = ['🤝 المطابقات الذكية:'];
      data.matches.slice(0, 5).forEach((m: any, i: number) => {
        const name = m.userName || 'مستخدم';
        const score = m.matchScore ? ` (${m.matchScore}% توافق)` : '';
        const reason = m.matchReason || '';
        parts.push(`  ${i + 1}. ${name}${score}`);
        if (reason) parts.push(`     السبب: ${reason}`);
        if (Array.isArray(m.sharedInterests) && m.sharedInterests.length > 0) {
          parts.push(`     الاهتمامات المشتركة: ${m.sharedInterests.join('، ')}`);
        }
      });
      if (data.matchInsight) parts.push(`\n🧠 ${data.matchInsight}`);
      if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
        parts.push('\n💡 توصيات:');
        data.recommendations.forEach((r: string) => parts.push(`  • ${r}`));
      }
      return parts.join('\n');
    }

    // ─── Phase 3: Predictive Suggestions ───────────────────────
    if (Array.isArray(data.predictions) && data.predictions.length > 0) {
      const parts: string[] = ['🔮 اقتراحاتي لك:'];
      data.predictions.forEach((p: any, i: number) => {
        const conf = p.confidence ? ` (${p.confidence}% ثقة)` : '';
        const icon = p.type === 'action' ? '⚡' : p.type === 'promotion' ? '📣' : p.type === 'content' ? '📝' : '💡';
        parts.push(`  ${icon} ${p.title}${conf}`);
        if (p.description) parts.push(`     ${p.description}`);
      });
      if (data.personalizedTip) parts.push(`\n💡 ${data.personalizedTip}`);
      if (data.recommendedAction) parts.push(`\n⚡ الإجراء الموصى: ${data.recommendedAction}`);
      if (data.urgencyLevel) {
        const urgMap: Record<string, string> = { high: '🔴 عاجل', medium: '🟡 متوسط', low: '🟢 عادي' };
        parts.push(`\n${urgMap[data.urgencyLevel] || data.urgencyLevel}`);
      }
      return parts.join('\n');
    }

    // ─── Phase 3: Negotiation Assistant ────────────────────────
    if (data.fairPrice !== undefined || data.suggestedOffer !== undefined) {
      const parts: string[] = ['🤝 مساعد التفاوض:'];
      if (data.fairPrice !== undefined) parts.push(`  السعر العادل: ${data.fairPrice} ج.م`);
      if (data.suggestedOffer !== undefined) parts.push(`  العرض المقترح: ${data.suggestedOffer} ج.م`);
      if (data.priceRange) parts.push(`  نطاق التفاوض: ${data.priceRange.min} - ${data.priceRange.max} ج.م`);
      if (data.strategy) {
        const stratMap: Record<string, string> = { aggressive: 'هجومي', balanced: 'متوازن', conservative: 'محافظ' };
        parts.push(`  الاستراتيجية: ${stratMap[data.strategy] || data.strategy}`);
      }
      if (Array.isArray(data.talkingPoints) && data.talkingPoints.length > 0) {
        parts.push('\n🗣️ نقاط التفاوض:');
        data.talkingPoints.forEach((tp: string) => parts.push(`  • ${tp}`));
      }
      if (data.whenToAccept) parts.push(`\n✅ اقبل عندما: ${data.whenToAccept}`);
      if (data.whenToWalkAway) parts.push(`❌ انسحب عندما: ${data.whenToWalkAway}`);
      if (data.marketContext) parts.push(`\n📊 ${data.marketContext}`);
      if (Array.isArray(data.tips) && data.tips.length > 0) {
        parts.push('\n💡 نصائح:');
        data.tips.forEach((t: string) => parts.push(`  • ${t}`));
      }
      return parts.join('\n');
    }

    // ─── Phase 3: Smart Reports ────────────────────────────────
    if (data.metrics || data.reportType) {
      const parts: string[] = ['📊 تقريرك الذكي:'];
      if (data.summary) parts.push(data.summary);
      if (data.metrics) {
        const m = data.metrics;
        parts.push('\n📈 المؤشرات:');
        if (m.totalViews !== undefined) parts.push(`  المشاهدات: ${m.totalViews}`);
        if (m.totalInquiries !== undefined) parts.push(`  الاستفسارات: ${m.totalInquiries}`);
        if (m.totalSaves !== undefined) parts.push(`  المحفوظات: ${m.totalSaves}`);
        if (m.totalRevenue !== undefined) parts.push(`  الإيرادات: ${m.totalRevenue} ج.م`);
      }
      if (Array.isArray(data.topPerformingListings) && data.topPerformingListings.length > 0) {
        parts.push('\n⭐ أفضل الإعلانات:');
        data.topPerformingListings.slice(0, 3).forEach((l: any, i: number) => {
          parts.push(`  ${i + 1}. ${l.title || 'إعلان'} - ${l.views || 0} مشاهدة`);
        });
      }
      if (data.audienceInsights) parts.push(`\n👥 ${data.audienceInsights}`);
      if (Array.isArray(data.aiInsights) && data.aiInsights.length > 0) {
        parts.push('\n🤖 رؤى الذكاء الاصطناعي:');
        data.aiInsights.forEach((ins: string) => parts.push(`  • ${ins}`));
      }
      if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
        parts.push('\n💡 توصيات:');
        data.recommendations.forEach((r: string) => parts.push(`  • ${r}`));
      }
      return parts.join('\n');
    }

    // Generic object - format key value pairs nicely
    try {
      const entries = Object.entries(data).filter(([_, v]) => v !== null && v !== undefined);
      if (entries.length === 0) return 'لا توجد بيانات متاحة حالياً.';
      return entries.map(([key, value]) => {
        const arKey = translateKey(key);
        if (typeof value === 'string' || typeof value === 'number') return `${arKey}: ${value}`;
        if (Array.isArray(value)) {
          if (value.length === 0) return '';
          return `${arKey}:\n${value.map((v: any, i: number) => `  ${i + 1}. ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n')}`;
        }
        return `${arKey}: ${JSON.stringify(value)}`;
      }).filter(Boolean).join('\n');
    } catch {
      return JSON.stringify(data, null, 2);
    }
  }

  return 'لا توجد بيانات متاحة حالياً.';
}

/** Translate common response keys to Arabic */
function translateKey(key: string): string {
  const map: Record<string, string> = {
    suggestedPrice: 'السعر المقترح',
    priceRange: 'نطاق السعر',
    reasoning: 'التفسير',
    competitiveness: 'التنافسية',
    tips: 'نصائح',
    recommendation: 'التوصية',
    bestDay: 'أفضل يوم',
    bestTime: 'أفضل وقت',
    hotTopics: 'مواضيع رائجة',
    trendInsight: 'تحليل الاتجاهات',
    walletBalance: 'رصيد المحفظة',
    needsCharging: 'يحتاج شحن',
    minimumRequired: 'الحد الأدنى المطلوب',
    aiInsight: 'رأي الذكاء الاصطناعي',
  };
  return map[key] || key;
}

/** Translate package name to Arabic */
function arPkgName(pkg: string): string {
  const map: Record<string, string> = {
    basic: 'أساسي', standard: 'قياسي', premium: 'مميز',
    vip: 'VIP', city_target: 'استهداف مدن', interest_target: 'استهداف اهتمامات',
  };
  return map[pkg] || pkg;
}

// ─── Component ────────────────────────────────────────────────────────
export const GlobalAIAssistant: React.FC = () => {
  const { darkMode } = useAppContext();
  const { isLoggedIn, currentUser } = useAuth();
  const { dir, isRTL } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [currentPage, setCurrentPage] = useState('/');
  const [isMobile, setIsMobile] = useState(false);
  const [searchMode, setSearchMode] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const proactiveShownRef = useRef<Set<string>>(new Set());

  // ─── Detect current page & viewport ─────────────────────────────────
  useEffect(() => {
    const detectPage = () => {
      const hash = window.location.hash.replace('#', '') || '/';
      setCurrentPage('/' + (hash.split('/').filter(Boolean)[0] || ''));
    };
    const detectMobile = () => setIsMobile(window.innerWidth < 768);
    detectPage(); detectMobile();
    window.addEventListener('hashchange', detectPage);
    window.addEventListener('resize', detectMobile);
    return () => { window.removeEventListener('hashchange', detectPage); window.removeEventListener('resize', detectMobile); };
  }, []);

  // ─── Auto-scroll ────────────────────────────────────────────────────
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ─── Proactive suggestion on page change ────────────────────────────
  useEffect(() => {
    if (!isOpen || proactiveShownRef.current.has(currentPage)) return;
    proactiveShownRef.current = new Set(proactiveShownRef.current).add(currentPage);
    const ctx = PAGE_CONTEXT[currentPage] || DEFAULT_CONTEXT;
    setMessages(prev => [...prev, {
      id: `proactive-${Date.now()}`, role: 'assistant',
      content: ctx.proactiveMsg, timestamp: new Date(), type: 'suggestion',
    }]);
  }, [currentPage, isOpen]);

  // ─── Focus input on open ────────────────────────────────────────────
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 300); }, [isOpen]);

  const getContext = useCallback(() => PAGE_CONTEXT[currentPage] || DEFAULT_CONTEXT, [currentPage]);

  // ─── Build conversation history for context ─────────────────────────
  const getConversationHistory = useCallback((): { role: string; content: string }[] => {
    // Send last 6 messages for context (keep it small)
    const recentMessages = messages.slice(-6);
    return recentMessages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));
  }, [messages]);

  // ─── Send message ───────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputText(''); setIsLoading(true);

    try {
      const conversationHistory = getConversationHistory();
      const res = await api.aiGlobalAssistant({
        message: text.trim(),
        page: currentPage,
        userId: currentUser?.id,
        conversationHistory,
      });
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`, role: 'assistant',
        content: res.reply || 'عذراً، لم أتمكن من معالجة طلبك.',
        timestamp: new Date(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`, role: 'assistant',
        content: 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة لاحقاً.',
        timestamp: new Date(),
      }]);
      toast.error('خطأ في الاتصال بالمساعد الذكي');
    } finally { setIsLoading(false); }
  }, [isLoading, currentPage, currentUser?.id, getConversationHistory]);

  // ─── Handle quick action ────────────────────────────────────────────
  const handleQuickAction = useCallback(async (actionId: string) => {
    if (isLoading) return;
    const action = getContext().quickActions.find(a => a.id === actionId);
    if (!action) return;

    // For improve-description, we need user input
    if (action.needsInput && action.apiMethod === 'aiImproveDescription') {
      setMessages(prev => [...prev, {
        id: `user-${Date.now()}`, role: 'user', content: action.label, timestamp: new Date(),
      }, {
        id: `prompt-${Date.now()}`, role: 'assistant',
        content: '📝 اكتب وصف الإعلان الحالي وسأقوم بتحسينه لك:',
        timestamp: new Date(), type: 'suggestion',
      }]);
      setSearchMode(true);
      return;
    }

    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content: action.label, timestamp: new Date() }]);
    setIsLoading(true);
    try {
      let res: any;
      switch (action.apiMethod) {
        case 'aiSmartPostSuggest': res = await api.aiSmartPostSuggest(); break;
        case 'aiBestTime': res = await api.aiBestTime(); break;
        case 'aiTrendingTopics': res = await api.aiTrendingTopics(); break;
        case 'aiPriceSuggest': res = await api.aiPriceSuggest({ category: 'general' }); break;
        case 'aiEnhanceContent': res = await api.aiEnhanceContent({ content: action.label }); break;
        case 'aiAnalyzeMyPosts': res = await api.aiAnalyzeMyPosts(); break;
        case 'aiBudgetSuggestion': res = await api.aiBudgetSuggestion({ goal: 'promotion' }); break;
        case 'aiPackageAdvisor': res = await api.aiPackageAdvisor({ goal: 'visibility' }); break;
        case 'aiWriteAssistant': res = await api.aiWriteAssistant({ category: 'general', type: 'post' }); break;
        // Phase 2: Smart Assistant Features
        case 'aiBehaviorAnalysis': res = await api.aiBehaviorAnalysis(currentUser?.id); break;
        case 'aiSmartPricing': res = await api.aiSmartPricing({ category: 'general' }); break;
        case 'aiSmartMatching': res = await api.aiSmartMatching({ type: 'buyer', category: 'general' }); break;
        // Phase 3: Advanced AI Features
        case 'aiPredictiveSuggestions': res = await api.aiPredictiveSuggestions({ userId: currentUser?.id, currentPage }); break;
        case 'aiNegotiationAssistant': res = await api.aiNegotiationAssistant({ userId: currentUser?.id }); break;
        case 'aiSmartReports': res = await api.aiSmartReports({ userId: currentUser?.id, reportType: 'overview', period: 'month' }); break;
        default: res = await api.aiAssistant(action.label, currentUser?.id);
      }
      const content = formatAIResponse(res);
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`, role: 'assistant', content, timestamp: new Date(),
        type: action.apiMethod === 'aiImproveDescription' ? 'improve-result' : undefined,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`, role: 'assistant',
        content: 'عذراً، لم أتمكن من جلب البيانات. يرجى المحاولة لاحقاً.',
        timestamp: new Date(),
      }]);
    } finally { setIsLoading(false); }
  }, [isLoading, getContext, currentUser?.id]);

  // ─── Handle search-mode input (for improve-description etc.) ────────
  const handleSearchModeSubmit = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    setSearchMode(false);
    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content: text.trim(), timestamp: new Date() }]);
    setIsLoading(true);
    try {
      const res = await api.aiImproveDescription({ description: text.trim(), category: currentPage === '/market' ? 'market' : 'general' });
      const content = formatAIResponse(res);
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`, role: 'assistant', content, timestamp: new Date(),
        type: 'improve-result',
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`, role: 'assistant',
        content: 'عذراً، لم أتمكن من تحسين الوصف. يرجى المحاولة لاحقاً.',
        timestamp: new Date(),
      }]);
    } finally { setIsLoading(false); }
  }, [isLoading, currentPage]);

  // ─── Handle message submit (routes to search mode or normal) ────────
  const handleSubmit = useCallback((text: string) => {
    if (searchMode) {
      handleSearchModeSubmit(text);
    } else {
      sendMessage(text);
    }
  }, [searchMode, handleSearchModeSubmit, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(inputText); }
  };

  if (!isLoggedIn) return null;
  const ctx = getContext();

  // Floating button position: on mobile, higher up to avoid overlap with bottom nav
  const fabBottomClass = isMobile ? 'bottom-24' : 'bottom-20';

  return (
    <div dir={dir} className="print:hidden">
      {/* ─── Floating Button ──────────────────────────────────────────── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="ai-fab"
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className={`fixed ${fabBottomClass} ${isRTL ? 'left-6' : 'right-6'} z-[100] w-14 h-14 rounded-full
              bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30
              flex items-center justify-center cursor-pointer hover:shadow-xl hover:shadow-orange-500/40 transition-shadow`}
            aria-label="المساعد الذكي"
          >
            <motion.div className="absolute inset-0 rounded-full bg-orange-500"
              animate={{ scale: [1, 1.4], opacity: [0.4, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }} />
            <Sparkles className="w-6 h-6 text-white relative z-10" />
            {messages.some(m => m.role === 'assistant' && m.type === 'suggestion') && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center z-10">!</span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ─── Backdrop (mobile) ────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && isMobile && (
          <motion.div key="ai-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/40 z-[189]" />
        )}
      </AnimatePresence>

      {/* ─── Chat Panel ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="ai-panel"
            initial={isMobile ? { y: '100%' } : { x: isRTL ? '-100%' : '100%', opacity: 0 }}
            animate={isMobile ? { y: 0 } : { x: 0, opacity: 1 }}
            exit={isMobile ? { y: '100%' } : { x: isRTL ? '-100%' : '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed z-[190] flex flex-col
              ${isMobile ? 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl' : `${isRTL ? 'left-0' : 'right-0'} top-0 bottom-0 w-full max-w-sm`}
              ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border shadow-2xl`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>المساعد الذكي</h3>
                  <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {searchMode ? '📝 وضع تحسين الوصف' : 'مساعدك الذكي في نواقس'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {searchMode && (
                  <button onClick={() => setSearchMode(false)}
                    className={`p-1.5 rounded-lg transition-colors text-[10px] font-semibold
                      ${darkMode ? 'hover:bg-gray-800 text-orange-400' : 'hover:bg-gray-100 text-orange-500'}`}>
                    إلغاء
                  </button>
                )}
                <button onClick={() => { setIsOpen(false); setSearchMode(false); }}
                  className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                  aria-label="إغلاق">
                  {isMobile ? <ChevronDown className="w-5 h-5" /> : <X className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className={`px-3 py-2 border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {/* Search suggestion toggle */}
                <button onClick={() => setSearchMode(!searchMode)} disabled={isLoading}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold
                    whitespace-nowrap shrink-0 shadow-sm transition-all
                    ${searchMode
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                      : `${darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`
                    }`}>
                  <Search className="w-3.5 h-3.5" />
                  {searchMode ? 'وضع البحث مفعل' : 'بحث ذكي'}
                </button>
                {ctx.quickActions.map((action) => (
                  <button key={action.id} onClick={() => handleQuickAction(action.id)} disabled={isLoading}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold
                      text-white bg-gradient-to-r ${action.color} whitespace-nowrap shrink-0 shadow-sm
                      hover:shadow-md transition-shadow disabled:opacity-50`}>
                    {iconMap[action.icon]}{action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search hint bar */}
            {searchMode && ctx.searchHint && (
              <div className={`px-4 py-2 text-[11px] flex items-center gap-1.5
                ${darkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                <Search className="w-3 h-3" />
                {ctx.searchHint}
              </div>
            )}

            {/* Messages */}
            <div className={`flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0 ${darkMode ? 'scrollbar-dark' : 'scrollbar-light'}`}>
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center">
                    <Bot className="w-8 h-8 text-orange-500" />
                  </div>
                  <p className={`text-sm text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {searchMode ? '📝 اكتب وصف الإعلان وسأحسّنه لك' : 'ابدأ محادثة أو اختر إجراء سريع'}
                  </p>
                  {!searchMode && (
                    <button onClick={() => setSearchMode(true)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold
                        ${darkMode ? 'bg-gray-800 text-orange-400 hover:bg-gray-700' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}
                        transition-colors`}>
                      <Search className="w-3.5 h-3.5" />
                      تفعيل البحث الذكي
                    </button>
                  )}
                </div>
              )}
              {messages.map((msg) => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                  className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5
                    ${msg.role === 'user' ? 'bg-orange-500' : darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    {msg.role === 'user' ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-orange-500" />}
                  </div>
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed
                    ${msg.role === 'user'
                      ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-br-sm'
                      : msg.type === 'suggestion'
                        ? `${darkMode ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-orange-50 border border-orange-100'} rounded-bl-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`
                        : msg.type === 'improve-result'
                          ? `${darkMode ? 'bg-fuchsia-500/10 border border-fuchsia-500/20' : 'bg-fuchsia-50 border border-fuchsia-100'} rounded-bl-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`
                          : `${darkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-800'} rounded-bl-sm`
                    }`}>
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    {msg.type === 'suggestion' && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Zap className="w-3 h-3 text-orange-500" />
                        <span className="text-[10px] text-orange-500 font-semibold">اقتراح ذكي</span>
                      </div>
                    )}
                    {msg.type === 'improve-result' && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Wand2 className="w-3 h-3 text-fuchsia-500" />
                        <span className="text-[10px] text-fuchsia-500 font-semibold">تم التحسين بالذكاء الاصطناعي</span>
                      </div>
                    )}
                    {msg.type === 'search-suggestion' && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Search className="w-3 h-3 text-blue-500" />
                        <span className="text-[10px] text-blue-500 font-semibold">نتيجة بحث ذكي</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <Bot className="w-3.5 h-3.5 text-orange-500" />
                  </div>
                  <div className={`px-4 py-3 rounded-2xl rounded-bl-sm ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div className="flex gap-1">
                      {[0, 0.2, 0.4].map((d, i) => (
                        <motion.div key={i} className="w-2 h-2 rounded-full bg-orange-500"
                          animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: d }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={`px-3 py-2 border-t ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
              <div className={`flex items-center gap-2 rounded-xl px-3 py-1.5 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <input ref={inputRef} type="text" value={inputText} onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={searchMode ? '📝 اكتب وصف الإعلان هنا...' : 'اكتب رسالتك...'}
                  disabled={isLoading} dir="rtl"
                  className={`flex-1 bg-transparent text-sm outline-none py-1.5
                    ${darkMode ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'} disabled:opacity-50`} />
                <button onClick={() => handleSubmit(inputText)} disabled={!inputText.trim() || isLoading}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                    ${inputText.trim() && !isLoading
                      ? searchMode
                        ? 'bg-gradient-to-br from-fuchsia-500 to-pink-500 text-white shadow-sm hover:shadow-md'
                        : 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-sm hover:shadow-md'
                      : darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'}`}
                  aria-label={searchMode ? 'تحسين' : 'إرسال'}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : searchMode ? <Wand2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}
        .scrollbar-dark::-webkit-scrollbar{width:4px}.scrollbar-dark::-webkit-scrollbar-track{background:transparent}.scrollbar-dark::-webkit-scrollbar-thumb{background:#374151;border-radius:4px}
        .scrollbar-light::-webkit-scrollbar{width:4px}.scrollbar-light::-webkit-scrollbar-track{background:transparent}.scrollbar-light::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:4px}
      `}</style>
    </div>
  );
};

export default GlobalAIAssistant;
