// ─── AI Promotion Assistant ─ مساعد الترويج الذكي ──────────────────
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../services/api';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Target,
  TrendingUp,
  Wallet,
  Lightbulb,
  Zap,
  BarChart3,
  ChevronDown,
  Loader2,
  Megaphone,
  MessageSquare,
  Brain,
  Crown,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Eye,
  ChevronLeft,
  ChevronRight,
  PieChart,
  Activity,
  FileText,
  DollarSign,
  Users,
  MapPin,
  Hash,
  Star,
  Info,
  Maximize2,
  RefreshCw,
  ThumbsUp,
  Clock,
  Flame,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface AIPromotionAssistantProps {
  postId?: string;
  postContent?: string;
  postCategory?: string;
  postPrice?: number;
  mode?: 'chat' | 'targeting' | 'budget' | 'insights' | 'enhance';
  onClose?: () => void;
  onSuggestionApplied?: (data: any) => void;
  fullPage?: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'targeting' | 'budget' | 'insights' | 'enhance';
  data?: any;
}

// ─── Stat Card Component ───────────────────────────────────────────────
const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  darkMode: boolean;
  delay?: number;
}> = ({ icon: Icon, label, value, color, darkMode, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className={`rounded-2xl p-3 relative overflow-hidden ${
      darkMode ? `bg-gradient-to-br ${color}/20 border ${color.replace('from-', 'border-').split(' ')[0]}/20` : `bg-gradient-to-br ${color}/10 border ${color.replace('from-', 'border-').split(' ')[0]}/10`
    } border`}
  >
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${darkMode ? `${color.replace('from-', 'bg-').split(' ')[0]}/30` : `${color.replace('from-', 'bg-').split(' ')[0]}/20`}`}>
        <Icon className={`w-4 h-4 ${darkMode ? color.replace('from-', 'text-').split(' ')[0].replace('from-', '') : color.replace('from-', 'text-').split(' ')[0].replace('from-', '')}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-[10px] font-bold truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
        <p className={`text-sm font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      </div>
    </div>
  </motion.div>
);

// ─── Main AI Promotion Assistant Component ───────────────────────────────
export const AIPromotionAssistant: React.FC<AIPromotionAssistantProps> = ({
  postId,
  postContent,
  postCategory,
  postPrice,
  mode: initialMode = 'chat',
  onClose,
  onSuggestionApplied,
  fullPage = false,
}) => {
  const { darkMode } = useAppContext();
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const { dir } = useLanguage();

  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState(initialMode);
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard'>('dashboard');
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [aiTargeting, setAiTargeting] = useState<any>(null);
  const [aiBudget, setAiBudget] = useState<any>(null);
  const [enhancedContent, setEnhancedContent] = useState<any>(null);
  const [aiReview, setAiReview] = useState<any>(null);
  const [statsData, setStatsData] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(fullPage);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, []);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0 && activeTab === 'chat') {
      const greeting: ChatMessage = {
        id: 'greeting',
        role: 'assistant',
        content: t('aiPromotion.greeting'),
        timestamp: new Date(),
        type: 'text',
      };
      setMessages([greeting]);
    }
  }, [activeTab]);

  // Load insights on mount if mode is insights
  useEffect(() => {
    if (activeMode === 'insights' && !aiInsights) {
      loadInsights();
    }
  }, [activeMode]);

  const loadStats = useCallback(async () => {
    try {
      const result = await api.aiInsights();
      const data = result.data || result;
      setStatsData(data);
    } catch {
      // Fallback stats
      setStatsData({
        summary: { totalSpent: 0, totalReach: 0, totalClicks: 0, activePromotions: 0, avgCTR: '0', totalPosts: 0, promotedPosts: 0, unpromotedPosts: 0, walletBalance: currentUser?.walletBalance || 0 }
      });
    }
  }, []);

  const addMessage = (role: 'user' | 'assistant', content: string, type?: string, data?: any) => {
    const msg: ChatMessage = {
      id: Date.now().toString() + Math.random(),
      role,
      content,
      timestamp: new Date(),
      type: type as any,
      data,
    };
    setMessages(prev => [...prev, msg]);
    return msg;
  };

  // ─── Send Chat Message ────────────────────────────────────────────
  const handleSendChat = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput('');
    addMessage('user', userMsg);

    setIsLoading(true);
    try {
      const result = await api.aiAssistant(userMsg, currentUser?.id);
      addMessage('assistant', result.reply);
    } catch {
      addMessage('assistant', t('aiPromotion.errorGeneric'));
    }
    setIsLoading(false);
  };

  // ─── Load AI Auto-Targeting ───────────────────────────────────────
  const loadAutoTargeting = async () => {
    setIsLoading(true);
    try {
      const result = await api.aiAutoTarget({
        postId,
        content: postContent,
        category: postCategory,
        price: postPrice,
      });
      setAiTargeting(result.data);
      const pkgMap: Record<string, string> = {basic:t('aiPromotion.tierBasic'),standard:t('aiPromotion.tierStandard'),premium:t('aiPromotion.tierPremium'),vip:'VIP',city_target:t('aiPromotion.cityTargeting'),interest_target:t('aiPromotion.interestTargeting')};
      addMessage('assistant', t('aiPromotion.smartTargetingSuggested', {
        interests: result.data.suggestedInterests?.join(', ') || t('aiPromotion.general'),
        cities: result.data.suggestedCities?.join(', ') || t('aiPromotion.cairo'),
        ageMin: result.data.suggestedAgeRange?.min || 18,
        ageMax: result.data.suggestedAgeRange?.max || 45,
        suggestedPackage: pkgMap[result.data.suggestedPackage] || result.data.suggestedPackage || t('aiPromotion.tierStandard'),
        confidence: Math.round((result.data.confidence || 0.5) * 100),
        reasoning: result.data.reasoning || '',
      }),
        'targeting', result.data
      );
    } catch {
      addMessage('assistant', t('aiPromotion.errorTargeting'));
    }
    setIsLoading(false);
  };

  // ─── Load Budget Suggestion ───────────────────────────────────────
  const loadBudgetSuggestion = async () => {
    setIsLoading(true);
    try {
      const result = await api.aiBudgetSuggestion({
        budget: currentUser?.walletBalance || 0,
        category: postCategory,
        price: postPrice,
        goal: t('aiPromotion.increaseReach'),
      });
      setAiBudget(result.data);
      const rec = result.data.recommended;
      addMessage('assistant',
        t('aiPromotion.budgetSuggestion', {
          walletBalance: result.data.walletBalance,
          hasRecommendation: !!rec,
          recName: rec?.name || '',
          recPrice: rec?.price || 0,
          recReach: rec?.reach?.toLocaleString() || '0',
          recDays: rec?.days || 0,
          reasoning: result.data.reasoning,
          aiInsight: result.data.aiInsight || '',
        }),
        'budget', result.data
      );
    } catch {
      addMessage('assistant', t('aiPromotion.errorBudget'));
    }
    setIsLoading(false);
  };

  // ─── Load Insights ────────────────────────────────────────────────
  const loadInsights = async () => {
    setIsLoading(true);
    try {
      const result = await api.aiInsights();
      const data = result.data || result;
      setAiInsights(data);
      const s = data.summary || { totalSpent: 0, totalReach: 0, totalClicks: 0, activePromotions: 0, avgCTR: '0', totalPosts: 0, promotedPosts: 0, unpromotedPosts: 0, walletBalance: 0 };
      
      let insightsMsg = t('aiPromotion.smartInsightsHeader') + '\n\n';
      insightsMsg += t('aiPromotion.totalSpent', { value: s.totalSpent || 0 }) + '\n';
      insightsMsg += t('aiPromotion.totalReach', { value: (s.totalReach || 0).toLocaleString() }) + '\n';
      insightsMsg += t('aiPromotion.totalClicks', { value: s.totalClicks || 0 }) + '\n';
      insightsMsg += t('aiPromotion.clickRate', { value: s.avgCTR || 0 }) + '\n';
      insightsMsg += t('aiPromotion.activePromotionsCount', { value: s.activePromotions || 0 }) + '\n';
      
      if (s.totalPosts !== undefined) {
        insightsMsg += t('aiPromotion.totalPostsDetail', { total: s.totalPosts, promoted: s.promotedPosts, unpromoted: s.unpromotedPosts }) + '\n';
      }
      if (s.walletBalance !== undefined) {
        insightsMsg += t('aiPromotion.walletBalance', { value: s.walletBalance }) + '\n';
      }
      
      insightsMsg += `\n`;
      
      if (data.posts && data.posts.length > 0) {
        insightsMsg += t('aiPromotion.yourPostsHeader') + '\n';
        data.posts.slice(0, 5).forEach((p: any, i: number) => {
          const status = p.isPromoted ? `✅ ${t('aiPromotion.promoted')} - ${p.promotionTier || t('aiPromotion.package')}` : `⏳ ${t('aiPromotion.unpromoted')}`;
          insightsMsg += `${i + 1}. ${status} "${p.contentPreview}"\n`;
        });
        insightsMsg += `\n`;
      }
      
      insightsMsg += t('aiPromotion.aiRecommendationsHeader') + '\n';
      insightsMsg += (data.aiInsights || []).map((ins: string, i: number) => `${i + 1}. ${ins}`).join('\n');
      
      addMessage('assistant', insightsMsg, 'insights', data);
      // Also refresh stats
      setStatsData(data);
    } catch (err: any) {
      console.error('[AI] Load insights error:', err?.message);
      addMessage('assistant', t('aiPromotion.errorInsights'));
    }
    setIsLoading(false);
  };

  // ─── Enhance Content ──────────────────────────────────────────────
  const loadEnhancedContent = async () => {
    if (!postContent) {
      addMessage('assistant', t('aiPromotion.noContentToEnhance'));
      return;
    }
    setIsLoading(true);
    try {
      const result = await api.aiEnhanceContent({
        content: postContent,
        category: postCategory,
        price: postPrice,
      });
      setEnhancedContent(result.data);
      addMessage('assistant',
        t('aiPromotion.enhancedContent', {
          enhancedContent: result.data.enhancedContent,
          title: result.data.title || '',
          callToAction: result.data.callToAction || '',
          hashtags: result.data.hashtags?.length ? result.data.hashtags.map((h: string) => `#${h}`).join(' ') : '',
          scoreImprovement: result.data.scoreImprovement || 15,
          tips: (result.data.tips || []).map((tip: string, i: number) => `${i + 1}. ${tip}`).join('\n'),
        }),
        'enhance', result.data
      );
    } catch {
      addMessage('assistant', t('aiPromotion.errorEnhanceContent'));
    }
    setIsLoading(false);
  };

  // ─── AI Review ────────────────────────────────────────────────────
  const loadAIReview = async () => {
    setIsLoading(true);
    try {
      const result = await api.aiReviewPromotion({
        postId,
        content: postContent,
        category: postCategory,
        price: postPrice,
      });
      setAiReview(result.data);
      const d = result.data;
      addMessage('assistant',
        t('aiPromotion.aiReviewResult', {
          approved: d.approved,
          score: d.score,
          riskLevel: d.riskLevel,
          summary: d.summary,
          issues: d.issues?.length ? d.issues.map((i: string) => `❌ ${i}`).join('\n') : '',
          suggestions: d.suggestions?.length ? d.suggestions.map((s: string) => `💡 ${s}`).join('\n') : '',
        }),
        'text', result.data
      );
    } catch {
      addMessage('assistant', t('aiPromotion.errorReview'));
    }
    setIsLoading(false);
  };

  // ─── Load Analyze My Posts ──────────────────────────────────────
  const loadAnalyzeMyPosts = async () => {
    setIsLoading(true);
    try {
      const result = await api.aiAnalyzeMyPosts();
      const d = result.data;
      let analysisMsg = t('aiPromotion.comprehensiveAnalysisHeader') + '\n\n';
      analysisMsg += t('aiPromotion.totalPosts', { value: d.totalPosts }) + '\n';
      analysisMsg += t('aiPromotion.promotedCount', { value: d.promotedPosts }) + '\n';
      analysisMsg += t('aiPromotion.unpromotedCount', { value: d.unpromotedPosts }) + '\n\n';
      
      if (d.posts && d.posts.length > 0) {
        analysisMsg += t('aiPromotion.postDetailsHeader') + '\n\n';
        d.posts.forEach((p: any, i: number) => {
          const scoreEmoji = p.promotionScore >= 70 ? '🟢' : p.promotionScore >= 40 ? '🟡' : '🔴';
          analysisMsg += `${scoreEmoji} **${i+1}.** "${p.contentPreview}"\n`;
          const pkgMap: Record<string, string> = {basic:t('aiPromotion.tierBasic'),standard:t('aiPromotion.tierStandard'),premium:t('aiPromotion.tierPremium'),vip:'VIP',city_target:t('aiPromotion.cityTargeting'),interest_target:t('aiPromotion.interestTargeting')};
          analysisMsg += t('aiPromotion.promotionScoreAndPackage', { score: p.promotionScore, package: pkgMap[p.suggestedPackage] || p.suggestedPackage || t('aiPromotion.tierStandard') }) + '\n';
          if (p.contentTips?.length > 0) {
            analysisMsg += `   💡 ${p.contentTips[0]}\n`;
          }
          analysisMsg += `\n`;
        });
      }
      
      if (d.topPick) {
        analysisMsg += t('aiPromotion.bestPostForPromotion', { reason: d.topPick.reason }) + '\n\n';
      }
      
      if (d.overallStrategy) {
        analysisMsg += t('aiPromotion.strategyHeader', { strategy: d.overallStrategy }) + '\n\n';
      }
      
      if (d.aiTips?.length > 0) {
        analysisMsg += t('aiPromotion.aiTipsHeader') + '\n';
        d.aiTips.forEach((tip: string, i: number) => {
          analysisMsg += `${i+1}. ${tip}\n`;
        });
      }
      
      addMessage('assistant', analysisMsg, 'insights', d);
    } catch {
      addMessage('assistant', t('aiPromotion.errorAnalyzePosts'));
    }
    setIsLoading(false);
  };

  // Quick action buttons
  const quickActions = [
    { id: 'analyze-posts', label: t('aiPromotion.analyzePosts'), icon: Megaphone, action: loadAnalyzeMyPosts, color: 'from-rose-500 to-pink-500', desc: t('aiPromotion.analyzePostsDesc') },
    { id: 'targeting', label: t('aiPromotion.smartTargeting'), icon: Target, action: loadAutoTargeting, color: 'from-purple-500 to-indigo-500', desc: t('aiPromotion.smartTargetingDesc') },
    { id: 'budget', label: t('aiPromotion.suggestBudget'), icon: Wallet, action: loadBudgetSuggestion, color: 'from-green-500 to-emerald-500', desc: t('aiPromotion.suggestBudgetDesc') },
    { id: 'insights', label: t('aiPromotion.myInsights'), icon: BarChart3, action: loadInsights, color: 'from-blue-500 to-cyan-500', desc: t('aiPromotion.myInsightsDesc') },
    { id: 'enhance', label: t('aiPromotion.enhanceContent'), icon: Sparkles, action: loadEnhancedContent, color: 'from-orange-500 to-amber-500', desc: t('aiPromotion.enhanceContentDesc') },
    { id: 'review', label: t('aiPromotion.reviewPost'), icon: CheckCircle2, action: loadAIReview, color: 'from-teal-500 to-green-500', desc: t('aiPromotion.reviewPostDesc') },
  ];

  // Dashboard stats
  const summary = statsData?.summary || { totalSpent: 0, totalReach: 0, totalClicks: 0, activePromotions: 0, avgCTR: '0', totalPosts: 0, promotedPosts: 0, unpromotedPosts: 0, walletBalance: 0 };
  const aiTips = statsData?.aiInsights || [];

  if (!isOpen) return null;

  // ─── DASHBOARD TAB CONTENT ────────────────────────────────────────
  const DashboardContent = () => (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl p-4 relative overflow-hidden ${
          darkMode
            ? 'bg-gradient-to-l from-orange-900/40 via-amber-900/20 to-orange-900/10 border border-orange-800/30'
            : 'bg-gradient-to-l from-orange-50 via-amber-50 to-orange-50 border border-orange-100'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200/30">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-black text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('aiPromotion.title')}
            </h3>
            <p className={`text-[10px] ${darkMode ? 'text-orange-400/80' : 'text-orange-600/80'}`}>
              {t('aiPromotion.poweredByAI')}
            </p>
          </div>
          <button
            onClick={loadStats}
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              darkMode ? 'bg-orange-900/50 text-orange-400 hover:bg-orange-900/70' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
            } transition-colors`}
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard icon={Wallet} label={t('aiPromotion.totalSpentLabel')} value={`${(summary.totalSpent || 0).toLocaleString()} ${t('common.egp')}`} color="from-orange-500 to-amber-500" darkMode={darkMode} delay={0.1} />
        <StatCard icon={Eye} label={t('aiPromotion.totalReachLabel')} value={(summary.totalReach || 0).toLocaleString()} color="from-blue-500 to-cyan-500" darkMode={darkMode} delay={0.15} />
        <StatCard icon={Zap} label={t('aiPromotion.activePromotionsLabel')} value={summary.activePromotions || 0} color="from-green-500 to-emerald-500" darkMode={darkMode} delay={0.2} />
        <StatCard icon={DollarSign} label={t('aiPromotion.walletBalanceLabel')} value={`${(summary.walletBalance || 0).toLocaleString()} ${t('common.egp')}`} color="from-purple-500 to-pink-500" darkMode={darkMode} delay={0.25} />
      </div>

      {/* Posts Overview */}
      {(summary.totalPosts > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`rounded-2xl p-3 border ${darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <PieChart className={`w-3.5 h-3.5 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
            <h4 className={`font-black text-[11px] ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('aiPromotion.postsOverview')}
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className={`h-3 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div
                  className="h-full bg-gradient-to-l from-orange-500 to-amber-500 rounded-full transition-all"
                  style={{ width: `${summary.totalPosts > 0 ? (summary.promotedPosts / summary.totalPosts) * 100 : 0}%` }}
                />
              </div>
            </div>
            <span className={`text-[10px] font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {summary.promotedPosts}/{summary.totalPosts}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className={`text-[10px] ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
              ✅ {t('aiPromotion.promoted')}: {summary.promotedPosts}
            </span>
            <span className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              ⏳ {t('aiPromotion.unpromoted')}: {summary.unpromotedPosts}
            </span>
          </div>
        </motion.div>
      )}

      {/* AI Tips */}
      {aiTips.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className={`rounded-2xl p-3 border ${darkMode ? 'bg-gradient-to-br from-purple-900/20 to-indigo-900/10 border-purple-800/20' : 'bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-100'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className={`w-3.5 h-3.5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
            <h4 className={`font-black text-[11px] ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('aiPromotion.aiTipsHeader')}
            </h4>
          </div>
          <div className="space-y-1.5">
            {aiTips.slice(0, 3).map((tip: string, i: number) => (
              <div key={i} className={`flex items-start gap-2 text-[10px] leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <Star className={`w-3 h-3 flex-shrink-0 mt-0.5 ${darkMode ? 'text-purple-400' : 'text-purple-500'}`} />
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Flame className={`w-3.5 h-3.5 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
          <h4 className={`font-black text-[11px] ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {t('aiPromotion.quickActions')}
          </h4>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action, idx) => (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + idx * 0.05 }}
              onClick={() => { setActiveTab('chat'); action.action(); }}
              disabled={isLoading}
              className={`rounded-xl p-2.5 text-start transition-all active:scale-95 border ${
                darkMode
                  ? 'bg-gray-800/80 hover:bg-gray-700 border-gray-700'
                  : 'bg-white hover:bg-gray-50 border-gray-100 shadow-sm'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-1.5`}>
                <action.icon className="w-3.5 h-3.5 text-white" />
              </div>
              <p className={`text-[10px] font-black leading-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {action.label}
              </p>
              <p className={`text-[9px] mt-0.5 leading-tight ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {action.desc}
              </p>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── CHAT TAB CONTENT ────────────────────────────────────────────
  const ChatContent = () => (
    <>
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ height: isExpanded ? 'calc(100% - 140px)' : 'calc(100% - 170px)' }}>
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'assistant'
                ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white'
                : 'bg-gradient-to-br from-blue-400 to-indigo-500 text-white'
            }`}>
              {msg.role === 'assistant' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
            </div>

            {/* Message Bubble */}
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed ${
              msg.role === 'user'
                ? darkMode
                  ? 'bg-blue-900/50 text-blue-100 rounded-tr-sm'
                  : 'bg-blue-500 text-white rounded-tr-sm'
                : darkMode
                  ? 'bg-gray-800 text-gray-200 rounded-tl-sm border border-gray-700'
                  : 'bg-gray-100 text-gray-800 rounded-tl-sm'
            }`}>
              {/* Render markdown-like bold */}
              {msg.content.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line.split(/(\*\*[^*]+\*\*)/).map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return <span key={j} className="font-black">{part.slice(2, -2)}</span>;
                    }
                    return <span key={j}>{part}</span>;
                  })}
                  {i < msg.content.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}

              {/* Apply button for targeting/budget/enhance data */}
              {msg.data && msg.type && onSuggestionApplied && (
                <button
                  onClick={() => {
                    onSuggestionApplied(msg.data);
                    toast.success(t('aiPromotion.suggestionApplied'));
                  }}
                  className="mt-2 w-full py-1.5 bg-gradient-to-l from-orange-500 to-amber-500 text-white rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform"
                >
                  <Zap className="w-2.5 h-2.5" />
                  {t('aiPromotion.applySuggestion')}
                </button>
              )}
            </div>
          </motion.div>
        ))}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-2"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center flex-shrink-0">
              <Bot className="w-3 h-3" />
            </div>
            <div className={`rounded-2xl px-3 py-2 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-100'}`}>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Action Chips in Chat */}
      {messages.length <= 1 && (
        <div className={`px-3 py-1.5 border-t ${darkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-50 bg-gray-50/50'}`}>
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={action.action}
                disabled={isLoading}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold whitespace-nowrap transition-all active:scale-95 ${
                  darkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-white hover:bg-gray-100 text-gray-700 shadow-sm'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <action.icon className="w-2.5 h-2.5" />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className={`px-3 py-2 border-t ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gray-50'}`}>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
            placeholder={t('aiPromotion.askAboutPromotion')}
            disabled={isLoading}
            className={`flex-1 px-3 py-2 rounded-xl text-[11px] font-medium transition-colors ${
              darkMode
                ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600 focus:border-orange-500'
                : 'bg-white text-gray-900 placeholder-gray-400 border-gray-200 focus:border-orange-400'
            } border focus:outline-none focus:ring-2 focus:ring-orange-400/30`}
          />
          <button
            onClick={handleSendChat}
            disabled={isLoading || !input.trim()}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
              isLoading || !input.trim()
                ? darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'
                : 'bg-gradient-to-l from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className={`fixed inset-4 md:inset-auto md:bottom-4 md:left-4 ${isExpanded ? 'md:w-[480px] md:h-[680px]' : 'md:w-[380px] md:h-[560px]'} z-[250] rounded-2xl overflow-hidden shadow-2xl border flex flex-col ${
          darkMode
            ? 'bg-gray-900 border-gray-700 shadow-black/50'
            : 'bg-white border-gray-200 shadow-gray-200/50'
        }`}
        dir={dir}
      >
        {/* ─── Header ─── */}
        <div className="bg-gradient-to-l from-orange-500 via-amber-500 to-orange-600 p-3 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-xs">{t('aiPromotion.title')}</h3>
                <p className="text-[9px] opacity-80">{t('aiPromotion.poweredByAI')}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" />
              {/* Tab Toggle */}
              <div className={`flex rounded-lg overflow-hidden bg-white/10`}>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-2 py-1 text-[9px] font-bold transition-all ${
                    activeTab === 'dashboard' ? 'bg-white/25' : 'hover:bg-white/10'
                  }`}
                >
                  <PieChart className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`px-2 py-1 text-[9px] font-bold transition-all ${
                    activeTab === 'chat' ? 'bg-white/25' : 'hover:bg-white/10'
                  }`}
                >
                  <MessageSquare className="w-3 h-3" />
                </button>
              </div>
              {/* Expand/Collapse */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-6 h-6 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
              {/* Close */}
              <button
                onClick={() => { setIsOpen(false); onClose?.(); }}
                className="w-6 h-6 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* ─── Tab Content ─── */}
        {activeTab === 'dashboard' ? <DashboardContent /> : <ChatContent />}
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Floating AI Button ─ زر الذكاء الاصطناعي العائم ────────────────
export const AIFloatingButton: React.FC = () => {
  const { darkMode } = useAppContext();
  const { currentUser } = useAuth();
  const [showAssistant, setShowAssistant] = useState(false);

  if (!currentUser) return null;

  // Hide on messages page and other pages with input forms to avoid covering input areas
  const location = typeof window !== 'undefined' ? window.location.hash : '';
  const isOnMessagesPage = location.includes('/messages');
  const isOnCreatePage = location.includes('/market/new') || location.includes('/market/edit');
  if (isOnMessagesPage || isOnCreatePage) return null;

  return (
    <>
      <AnimatePresence>
        {showAssistant && (
          <AIPromotionAssistant
            onClose={() => setShowAssistant(false)}
          />
        )}
      </AnimatePresence>

      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowAssistant(!showAssistant)}
        className={`hidden lg:flex fixed bottom-6 right-6 z-[200] w-12 h-12 rounded-2xl items-center justify-center shadow-2xl transition-all ${
          showAssistant
            ? 'bg-gray-600 hover:bg-gray-700 text-white'
            : 'bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 text-white shadow-orange-300/30 hover:shadow-orange-400/50'
        }`}
      >
        {showAssistant ? (
          <X className="w-5 h-5" />
        ) : (
          <div className="relative">
            <Brain className="w-5 h-5" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse border-2 border-white" />
          </div>
        )}
      </motion.button>
    </>
  );
};

// ─── Full Page AI Promotion ─ صفحة الترويج الذكي الكاملة ──────────
export const AIPromotionPage: React.FC = () => {
  const { darkMode } = useAppContext();
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const { dir } = useLanguage();

  if (!currentUser) return null;

  return (
    <div className="max-w-2xl mx-auto" dir={dir}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => window.history.back()}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
            darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          {dir === 'rtl' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className={`text-sm font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('aiPromotion.title')}
            </h1>
            <p className={`text-[10px] ${darkMode ? 'text-orange-400/80' : 'text-orange-600/80'}`}>
              {t('aiPromotion.poweredByAI')}
            </p>
          </div>
        </div>
      </div>

      {/* Full page assistant embedded */}
      <AIPromotionAssistant
        fullPage
        onClose={() => window.history.back()}
      />
    </div>
  );
};
