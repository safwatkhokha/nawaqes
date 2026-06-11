// ─── AI Smart Assistant ─ المساعد الذكي ──────────────────────────────
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../services/api';
import {
  Sparkles, X, Send, Bot, User, Target, TrendingUp, Wallet,
  Lightbulb, Zap, BarChart3, ChevronDown, Loader2, Megaphone,
  MessageSquare, Brain, Crown, CheckCircle2, AlertTriangle,
  ArrowRight, ArrowLeft, Eye, ChevronLeft, ChevronRight,
  PieChart, Activity, FileText, DollarSign, Users, MapPin,
  Hash, Star, Info, Maximize2, RefreshCw, ThumbsUp, Clock,
  Flame, PenTool, Calendar, Tag, ShoppingBag, Globe,
  BadgeCheck, Rocket, TrendingUp as TrendUp, Pencil, Wand2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { interestCategories } from '../config/interests';

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
  type?: 'text' | 'targeting' | 'budget' | 'insights' | 'enhance' | 'post-suggest' | 'write-assist' | 'package-advisor';
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
        <Icon className={`w-4 h-4 ${darkMode ? color.replace('from-', 'text-').split(' ')[0] : color.replace('from-', 'text-').split(' ')[0].replace('from-', '')}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-[10px] font-bold truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
        <p className={`text-sm font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      </div>
    </div>
  </motion.div>
);

// ─── Main AI Smart Assistant Component ──────────────────────────────────
export const AIPromotionAssistant: React.FC<AIPromotionAssistantProps> = ({
  postId, postContent, postCategory, postPrice,
  mode: initialMode = 'chat', onClose, onSuggestionApplied, fullPage = false,
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'write' | 'packages' | 'trending'>('dashboard');
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [aiTargeting, setAiTargeting] = useState<any>(null);
  const [aiBudget, setAiBudget] = useState<any>(null);
  const [enhancedContent, setEnhancedContent] = useState<any>(null);
  const [aiReview, setAiReview] = useState<any>(null);
  const [statsData, setStatsData] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(fullPage);
  const [smartSuggestions, setSmartSuggestions] = useState<any>(null);
  const [writeResult, setWriteResult] = useState<any>(null);
  const [bestTimeData, setBestTimeData] = useState<any>(null);
  const [trendingData, setTrendingData] = useState<any>(null);
  const [packageData, setPackageData] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [writeDescription, setWriteDescription] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Load initial data on mount
  useEffect(() => {
    loadStats();
    loadSmartSuggestions();
    loadBestTime();
    loadTrending();
  }, []);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0 && activeTab === 'chat') {
      addMessage('assistant', t('aiPromotion.greeting'));
    }
  }, [activeTab]);

  const loadStats = useCallback(async () => {
    try {
      const result = await api.aiInsights();
      setStatsData(result.data || result);
    } catch {
      setStatsData({
        summary: { totalSpent: 0, totalReach: 0, totalClicks: 0, activePromotions: 0, avgCTR: '0', totalPosts: 0, promotedPosts: 0, unpromotedPosts: 0, walletBalance: currentUser?.walletBalance || 0 }
      });
    }
  }, []);

  const loadSmartSuggestions = useCallback(async () => {
    try {
      const result = await api.aiSmartPostSuggest();
      setSmartSuggestions(result.data);
    } catch { /* ignore */ }
  }, []);

  const loadBestTime = useCallback(async () => {
    try {
      const result = await api.aiBestTime();
      setBestTimeData(result.data);
    } catch { /* ignore */ }
  }, []);

  const loadTrending = useCallback(async () => {
    try {
      const result = await api.aiTrendingTopics();
      setTrendingData(result.data);
    } catch { /* ignore */ }
  }, []);

  const addMessage = (role: 'user' | 'assistant', content: string, type?: string, data?: any) => {
    const msg: ChatMessage = { id: Date.now().toString() + Math.random(), role, content, timestamp: new Date(), type: type as any, data };
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
      const result = await api.aiAutoTarget({ postId, content: postContent, category: postCategory, price: postPrice });
      setAiTargeting(result.data);
      const pkgMap: Record<string, string> = { basic: t('aiPromotion.tierBasic'), standard: t('aiPromotion.tierStandard'), premium: t('aiPromotion.tierPremium'), vip: 'VIP', city_target: t('aiPromotion.cityTargeting'), interest_target: t('aiPromotion.interestTargeting') };
      addMessage('assistant', t('aiPromotion.smartTargetingSuggested', {
        interests: result.data.suggestedInterests?.join(', ') || t('aiPromotion.general'),
        cities: result.data.suggestedCities?.join(', ') || t('aiPromotion.cairo'),
        ageMin: result.data.suggestedAgeRange?.min || 18,
        ageMax: result.data.suggestedAgeRange?.max || 45,
        suggestedPackage: pkgMap[result.data.suggestedPackage] || result.data.suggestedPackage || t('aiPromotion.tierStandard'),
        confidence: Math.round((result.data.confidence || 0.5) * 100),
        reasoning: result.data.reasoning || '',
      }), 'targeting', result.data);
    } catch { addMessage('assistant', t('aiPromotion.errorTargeting')); }
    setIsLoading(false);
  };

  // ─── Load Budget Suggestion ───────────────────────────────────────
  const loadBudgetSuggestion = async () => {
    setIsLoading(true);
    try {
      const result = await api.aiBudgetSuggestion({ budget: currentUser?.walletBalance || 0, category: postCategory, price: postPrice, goal: t('aiPromotion.increaseReach') });
      setAiBudget(result.data);
      const rec = result.data.recommended;
      addMessage('assistant', t('aiPromotion.budgetSuggestion', {
        walletBalance: result.data.walletBalance, hasRecommendation: !!rec,
        recName: rec?.name || '', recPrice: rec?.price || 0, recReach: rec?.reach?.toLocaleString() || '0',
        recDays: rec?.days || 0, reasoning: result.data.reasoning, aiInsight: result.data.aiInsight || '',
      }), 'budget', result.data);
    } catch { addMessage('assistant', t('aiPromotion.errorBudget')); }
    setIsLoading(false);
  };

  // ─── Load Insights ────────────────────────────────────────────────
  const loadInsights = async () => {
    setIsLoading(true);
    try {
      const result = await api.aiInsights();
      const data = result.data || result;
      setAiInsights(data);
      setStatsData(data);
      const s = data.summary || {};
      let insightsMsg = t('aiPromotion.smartInsightsHeader') + '\n\n';
      insightsMsg += t('aiPromotion.totalSpent', { value: s.totalSpent || 0 }) + '\n';
      insightsMsg += t('aiPromotion.totalReach', { value: (s.totalReach || 0).toLocaleString() }) + '\n';
      insightsMsg += t('aiPromotion.totalClicks', { value: s.totalClicks || 0 }) + '\n';
      insightsMsg += t('aiPromotion.clickRate', { value: s.avgCTR || 0 }) + '\n';
      if (data.aiInsights) insightsMsg += '\n' + (data.aiInsights || []).map((ins: string, i: number) => `${i + 1}. ${ins}`).join('\n');
      addMessage('assistant', insightsMsg, 'insights', data);
    } catch { addMessage('assistant', t('aiPromotion.errorInsights')); }
    setIsLoading(false);
  };

  // ─── Enhance Content ──────────────────────────────────────────────
  const loadEnhancedContent = async () => {
    if (!postContent) { addMessage('assistant', t('aiPromotion.noContentToEnhance')); return; }
    setIsLoading(true);
    try {
      const result = await api.aiEnhanceContent({ content: postContent, category: postCategory, price: postPrice });
      setEnhancedContent(result.data);
      addMessage('assistant', t('aiPromotion.enhancedContent', {
        enhancedContent: result.data.enhancedContent, title: result.data.title || '',
        callToAction: result.data.callToAction || '',
        hashtags: result.data.hashtags?.length ? result.data.hashtags.map((h: string) => `#${h}`).join(' ') : '',
        scoreImprovement: result.data.scoreImprovement || 15,
        tips: (result.data.tips || []).map((tip: string, i: number) => `${i + 1}. ${tip}`).join('\n'),
      }), 'enhance', result.data);
    } catch { addMessage('assistant', t('aiPromotion.errorEnhanceContent')); }
    setIsLoading(false);
  };

  // ─── AI Review ────────────────────────────────────────────────────
  const loadAIReview = async () => {
    setIsLoading(true);
    try {
      const result = await api.aiReviewPromotion({ postId, content: postContent, category: postCategory, price: postPrice });
      setAiReview(result.data);
      addMessage('assistant', t('aiPromotion.aiReviewResult', {
        approved: result.data.approved, score: result.data.score, riskLevel: result.data.riskLevel,
        summary: result.data.summary, issues: result.data.issues?.length ? result.data.issues.map((i: string) => `❌ ${i}`).join('\n') : '',
        suggestions: result.data.suggestions?.length ? result.data.suggestions.map((s: string) => `💡 ${s}`).join('\n') : '',
      }), 'text', result.data);
    } catch { addMessage('assistant', t('aiPromotion.errorReview')); }
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
      if (d.topPick) analysisMsg += t('aiPromotion.bestPostForPromotion', { reason: d.topPick.reason }) + '\n\n';
      if (d.overallStrategy) analysisMsg += t('aiPromotion.strategyHeader', { strategy: d.overallStrategy }) + '\n\n';
      if (d.aiTips?.length > 0) { analysisMsg += t('aiPromotion.aiTipsHeader') + '\n'; d.aiTips.forEach((tip: string, i: number) => { analysisMsg += `${i + 1}. ${tip}\n`; }); }
      addMessage('assistant', analysisMsg, 'insights', d);
    } catch { addMessage('assistant', t('aiPromotion.errorAnalyzePosts')); }
    setIsLoading(false);
  };

  // ─── Write Assistant (new!) ──────────────────────────────────────
  const handleWriteAssistant = async () => {
    if (!selectedCategory && !postCategory) {
      toast.error(t('aiPromotion.selectCategory'));
      return;
    }
    setIsLoading(true);
    try {
      const result = await api.aiWriteAssistant({
        category: selectedCategory || postCategory || 'other',
        description: writeDescription,
        price: postPrice,
        location: currentUser?.location,
        type: 'ad',
      });
      setWriteResult(result.data);
      // Navigate to write tab to show results
      setActiveTab('write');
    } catch {
      toast.error(t('aiPromotion.errorWrite'));
    }
    setIsLoading(false);
  };

  // ─── Load Package Advisor (new!) ──────────────────────────────────
  const loadPackageAdvisor = async () => {
    setIsLoading(true);
    try {
      const result = await api.aiPackageAdvisor({
        category: postCategory || selectedCategory,
        budget: currentUser?.walletBalance || 0,
        goal: t('aiPromotion.increaseReach'),
        postId,
      });
      setPackageData(result.data);
      setActiveTab('packages');
    } catch {
      toast.error(t('aiPromotion.errorPackageAdvisor'));
    }
    setIsLoading(false);
  };

  // Quick action buttons
  const quickActions = [
    { id: 'write-post', label: t('aiPromotion.writePost'), icon: PenTool, action: () => setActiveTab('write'), color: 'from-orange-500 to-amber-500', desc: t('aiPromotion.writePostDesc') },
    { id: 'suggest-post', label: t('aiPromotion.suggestPost'), icon: Sparkles, action: loadSmartSuggestions, color: 'from-rose-500 to-pink-500', desc: t('aiPromotion.suggestPostDesc') },
    { id: 'package-advisor', label: t('aiPromotion.packageAdvisor'), icon: Crown, action: loadPackageAdvisor, color: 'from-yellow-500 to-amber-500', desc: t('aiPromotion.packageAdvisorDesc') },
    { id: 'analyze-posts', label: t('aiPromotion.analyzePosts'), icon: Megaphone, action: loadAnalyzeMyPosts, color: 'from-purple-500 to-indigo-500', desc: t('aiPromotion.analyzePostsDesc') },
    { id: 'targeting', label: t('aiPromotion.smartTargeting'), icon: Target, action: loadAutoTargeting, color: 'from-blue-500 to-cyan-500', desc: t('aiPromotion.smartTargetingDesc') },
    { id: 'budget', label: t('aiPromotion.suggestBudget'), icon: Wallet, action: loadBudgetSuggestion, color: 'from-green-500 to-emerald-500', desc: t('aiPromotion.suggestBudgetDesc') },
    { id: 'insights', label: t('aiPromotion.myInsights'), icon: BarChart3, action: loadInsights, color: 'from-indigo-500 to-purple-500', desc: t('aiPromotion.myInsightsDesc') },
    { id: 'enhance', label: t('aiPromotion.enhanceContent'), icon: Wand2, action: loadEnhancedContent, color: 'from-orange-500 to-red-500', desc: t('aiPromotion.enhanceContentDesc') },
    { id: 'review', label: t('aiPromotion.reviewPost'), icon: CheckCircle2, action: loadAIReview, color: 'from-teal-500 to-green-500', desc: t('aiPromotion.reviewPostDesc') },
    { id: 'trending', label: t('aiPromotion.trendingTopics'), icon: TrendingUp, action: () => setActiveTab('trending'), color: 'from-red-500 to-orange-500', desc: t('aiPromotion.trendingTopicsDesc') },
  ];

  // Dashboard stats
  const summary = statsData?.summary || { totalSpent: 0, totalReach: 0, totalClicks: 0, activePromotions: 0, avgCTR: '0', totalPosts: 0, promotedPosts: 0, unpromotedPosts: 0, walletBalance: 0 };
  const aiTips = statsData?.aiInsights || [];

  if (!isOpen) return null;

  // ─── DASHBOARD TAB CONTENT ────────────────────────────────────────
  const DashboardContent = () => (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {/* Welcome Banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
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
              {t('aiPromotion.smartAssistant')}
            </h3>
            <p className={`text-[10px] ${darkMode ? 'text-orange-400/80' : 'text-orange-600/80'}`}>
              {t('aiPromotion.poweredByAI')}
            </p>
          </div>
          <button onClick={() => { loadStats(); loadSmartSuggestions(); }}
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              darkMode ? 'bg-orange-900/50 text-orange-400 hover:bg-orange-900/70' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
            } transition-colors`}
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </motion.div>

      {/* Smart Proactive Suggestions */}
      {smartSuggestions?.shouldSuggest && smartSuggestions?.suggestions?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className={`rounded-2xl p-3 border ${
            darkMode ? 'bg-gradient-to-br from-green-900/20 to-emerald-900/10 border-green-800/20' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Rocket className={`w-3.5 h-3.5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
            <h4 className={`font-black text-[11px] ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('aiPromotion.smartSuggestions')}
            </h4>
          </div>
          <div className="space-y-2">
            {smartSuggestions.suggestions.slice(0, 3).map((sug: any, i: number) => (
              <motion.button key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                onClick={() => {
                  if (sug.suggestedContent) {
                    setSelectedCategory(sug.category);
                    setWriteDescription(sug.suggestedContent);
                    setActiveTab('write');
                  } else if (sug.category) {
                    setSelectedCategory(sug.category);
                    setActiveTab('write');
                  }
                }}
                className={`w-full text-start rounded-xl p-2.5 border transition-all active:scale-[0.98] ${
                  darkMode ? 'bg-gray-800/60 hover:bg-gray-700/80 border-gray-700' : 'bg-white hover:bg-gray-50 border-green-100 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{sug.category === 'phones' ? '📱' : sug.category === 'cars' ? '🚗' : sug.category === 'realEstate' ? '🏠' : sug.category === 'electronics' ? '💻' : sug.category === 'fashion' ? '👗' : '📝'}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[10px] font-black truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{sug.title}</p>
                    <p className={`text-[9px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{sug.whySuggested}</p>
                  </div>
                  <ArrowLeft className={`w-3 h-3 ${darkMode ? 'text-green-400' : 'text-green-600'} ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                </div>
              </motion.button>
            ))}
          </div>
          {smartSuggestions.motivationMessage && (
            <p className={`text-[9px] mt-2 text-center ${darkMode ? 'text-green-400/70' : 'text-green-600/70'}`}>
              {smartSuggestions.motivationMessage}
            </p>
          )}
        </motion.div>
      )}

      {/* Best Time to Post */}
      {bestTimeData && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className={`rounded-2xl p-3 border ${
            darkMode ? 'bg-gradient-to-br from-blue-900/20 to-indigo-900/10 border-blue-800/20' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock className={`w-3.5 h-3.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <h4 className={`font-black text-[11px] ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('aiPromotion.bestTimeToPost')}
            </h4>
          </div>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {bestTimeData.bestTimes?.slice(0, 4).map((bt: any, i: number) => (
              <div key={i} className={`flex-shrink-0 rounded-xl p-2 text-center min-w-[60px] ${
                i === 0 ? (darkMode ? 'bg-blue-900/40 border border-blue-700/30' : 'bg-blue-100 border border-blue-200') : (darkMode ? 'bg-gray-800/40' : 'bg-white')
              }`}>
                <p className={`text-[10px] font-black ${i === 0 ? (darkMode ? 'text-blue-300' : 'text-blue-700') : (darkMode ? 'text-white' : 'text-gray-900')}`}>
                  {bt.label}
                </p>
                {i === 0 && <p className={`text-[8px] ${darkMode ? 'text-blue-400/70' : 'text-blue-500'}`}>⭐</p>}
              </div>
            ))}
          </div>
          <p className={`text-[9px] mt-1.5 ${darkMode ? 'text-blue-400/60' : 'text-blue-600/60'}`}>
            {bestTimeData.recommendation}
          </p>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard icon={Wallet} label={t('aiPromotion.totalSpentLabel')} value={`${(summary.totalSpent || 0).toLocaleString()} ${t('common.egp')}`} color="from-orange-500 to-amber-500" darkMode={darkMode} delay={0.15} />
        <StatCard icon={Eye} label={t('aiPromotion.totalReachLabel')} value={(summary.totalReach || 0).toLocaleString()} color="from-blue-500 to-cyan-500" darkMode={darkMode} delay={0.2} />
        <StatCard icon={Zap} label={t('aiPromotion.activePromotionsLabel')} value={summary.activePromotions || 0} color="from-green-500 to-emerald-500" darkMode={darkMode} delay={0.25} />
        <StatCard icon={DollarSign} label={t('aiPromotion.walletBalanceLabel')} value={`${(summary.walletBalance || 0).toLocaleString()} ${t('common.egp')}`} color="from-purple-500 to-pink-500" darkMode={darkMode} delay={0.3} />
      </div>

      {/* Posts Overview */}
      {(summary.totalPosts > 0) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className={`rounded-2xl p-3 border ${darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <PieChart className={`w-3.5 h-3.5 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
            <h4 className={`font-black text-[11px] ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('aiPromotion.postsOverview')}</h4>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className={`h-3 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div className="h-full bg-gradient-to-l from-orange-500 to-amber-500 rounded-full transition-all"
                  style={{ width: `${summary.totalPosts > 0 ? (summary.promotedPosts / summary.totalPosts) * 100 : 0}%` }} />
              </div>
            </div>
            <span className={`text-[10px] font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{summary.promotedPosts}/{summary.totalPosts}</span>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className={`text-[10px] ${darkMode ? 'text-green-400' : 'text-green-600'}`}>✅ {t('aiPromotion.promoted')}: {summary.promotedPosts}</span>
            <span className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>⏳ {t('aiPromotion.unpromoted')}: {summary.unpromotedPosts}</span>
          </div>
        </motion.div>
      )}

      {/* AI Tips */}
      {aiTips.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className={`rounded-2xl p-3 border ${darkMode ? 'bg-gradient-to-br from-purple-900/20 to-indigo-900/10 border-purple-800/20' : 'bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-100'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className={`w-3.5 h-3.5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
            <h4 className={`font-black text-[11px] ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('aiPromotion.aiTipsHeader')}</h4>
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
          <h4 className={`font-black text-[11px] ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('aiPromotion.quickActions')}</h4>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action, idx) => (
            <motion.button key={action.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 + idx * 0.03 }}
              onClick={action.action} disabled={isLoading}
              className={`rounded-xl p-2.5 text-start transition-all active:scale-95 border ${
                darkMode ? 'bg-gray-800/80 hover:bg-gray-700 border-gray-700' : 'bg-white hover:bg-gray-50 border-gray-100 shadow-sm'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-1.5`}>
                <action.icon className="w-3.5 h-3.5 text-white" />
              </div>
              <p className={`text-[10px] font-black leading-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>{action.label}</p>
              <p className={`text-[9px] mt-0.5 leading-tight ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{action.desc}</p>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── WRITE ASSISTANT TAB ─────────────────────────────────────────
  const WriteContent = () => (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => setActiveTab('dashboard')} className={`w-6 h-6 rounded-lg flex items-center justify-center ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
          {dir === 'rtl' ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
        <PenTool className={`w-4 h-4 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
        <h4 className={`font-black text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('aiPromotion.writePost')}</h4>
      </div>

      {/* Category Selection */}
      <div>
        <p className={`text-[10px] font-bold mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('aiPromotion.selectCategory')}</p>
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
          {interestCategories.slice(0, 12).map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-300/30'
                  : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{cat.icon}</span>
              {t(cat.nameKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Description Input */}
      <div>
        <p className={`text-[10px] font-bold mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('aiPromotion.describePost')}</p>
        <textarea
          value={writeDescription}
          onChange={e => setWriteDescription(e.target.value)}
          placeholder={t('aiPromotion.describePostPlaceholder')}
          className={`w-full px-3 py-2 rounded-xl text-[11px] resize-none min-h-[70px] border ${
            darkMode ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600 focus:border-orange-500' : 'bg-white text-gray-900 placeholder-gray-400 border-gray-200 focus:border-orange-400'
          } focus:outline-none focus:ring-2 focus:ring-orange-400/30`}
        />
      </div>

      {/* Generate Button */}
      <button onClick={handleWriteAssistant} disabled={isLoading || (!selectedCategory && !postCategory)}
        className={`w-full py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 ${
          isLoading || (!selectedCategory && !postCategory)
            ? darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'
            : 'bg-gradient-to-l from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-200/30 hover:shadow-orange-300/50'
        }`}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
        {t('aiPromotion.generatePost')}
      </button>

      {/* Generated Result */}
      {writeResult && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl p-3 border space-y-2 ${
            darkMode ? 'bg-gray-800/50 border-orange-800/30' : 'bg-orange-50/50 border-orange-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className={`w-3.5 h-3.5 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
            <span className={`font-black text-[10px] ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>{t('aiPromotion.generatedResult')}</span>
          </div>

          {writeResult.generatedTitle && (
            <div>
              <p className={`text-[9px] font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('aiPromotion.suggestedTitle')}</p>
              <p className={`text-[11px] font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{writeResult.generatedTitle}</p>
            </div>
          )}

          <div>
            <p className={`text-[9px] font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('aiPromotion.suggestedContent')}</p>
            <div className={`rounded-xl p-2.5 mt-1 ${darkMode ? 'bg-gray-700/50' : 'bg-white'}`}>
              <p className={`text-[11px] leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                {writeResult.generatedContent}
              </p>
            </div>
          </div>

          {writeResult.callToAction && (
            <div className="flex items-center gap-1.5">
              <Zap className={`w-3 h-3 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
              <span className={`text-[10px] font-bold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>{writeResult.callToAction}</span>
            </div>
          )}

          {writeResult.suggestedHashtags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {writeResult.suggestedHashtags.map((h: string, i: number) => (
                <span key={i} className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                  #{h}
                </span>
              ))}
            </div>
          )}

          {writeResult.improvementTips?.length > 0 && (
            <div className={`rounded-xl p-2 ${darkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
              <p className={`text-[9px] font-bold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('aiPromotion.improvementTips')}</p>
              {writeResult.improvementTips.map((tip: string, i: number) => (
                <p key={i} className={`text-[10px] ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>💡 {tip}</p>
              ))}
            </div>
          )}

          <button onClick={() => {
            if (onSuggestionApplied) {
              onSuggestionApplied({ content: writeResult.generatedContent, category: selectedCategory || postCategory, price: writeResult.suggestedPrice, title: writeResult.generatedTitle, callToAction: writeResult.callToAction, hashtags: writeResult.suggestedHashtags });
            }
            toast.success(t('aiPromotion.suggestionApplied'));
          }}
            className="w-full py-2 bg-gradient-to-l from-orange-500 to-amber-500 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
          >
            <Zap className="w-3 h-3" />
            {t('aiPromotion.applyAndCreate')}
          </button>
        </motion.div>
      )}
    </div>
  );

  // ─── PACKAGES TAB ────────────────────────────────────────────────
  const PackagesContent = () => (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => setActiveTab('dashboard')} className={`w-6 h-6 rounded-lg flex items-center justify-center ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
          {dir === 'rtl' ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
        <Crown className={`w-4 h-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
        <h4 className={`font-black text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('aiPromotion.packageAdvisor')}</h4>
      </div>

      {/* AI Recommendation */}
      {packageData?.aiAdvice && (
        <div className={`rounded-2xl p-3 border ${darkMode ? 'bg-gradient-to-br from-yellow-900/20 to-amber-900/10 border-yellow-800/20' : 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Brain className={`w-3.5 h-3.5 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
            <span className={`font-black text-[10px] ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>{t('aiPromotion.aiRecommendation')}</span>
          </div>
          <p className={`font-black text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {packageData.aiAdvice.recommendedPackage}
          </p>
          <p className={`text-[10px] mt-1 leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {packageData.aiAdvice.reasoning}
          </p>
          {packageData.aiAdvice.roi && (
            <p className={`text-[10px] mt-1.5 font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
              📊 {packageData.aiAdvice.roi}
            </p>
          )}
        </div>
      )}

      {/* Package Cards */}
      <div className="space-y-2">
        {packageData?.packages?.map((pkg: any, i: number) => {
          const canAfford = pkg.price <= (packageData?.walletBalance || 0);
          return (
            <div key={pkg.id} className={`rounded-2xl p-3 border transition-all ${
              packageData?.aiAdvice?.recommendedPackage === pkg.name
                ? darkMode ? 'border-orange-700/50 bg-orange-900/10' : 'border-orange-300 bg-orange-50/50'
                : darkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-100 bg-white'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    pkg.id === 'vip' ? 'bg-gradient-to-br from-yellow-400 to-amber-500' :
                    pkg.id === 'premium' ? 'bg-gradient-to-br from-purple-400 to-indigo-500' :
                    pkg.id === 'standard' ? 'bg-gradient-to-br from-blue-400 to-cyan-500' :
                    pkg.id === 'basic' ? 'bg-gradient-to-br from-green-400 to-emerald-500' :
                    'bg-gradient-to-br from-teal-400 to-cyan-500'
                  }`}>
                    <Crown className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className={`font-black text-[11px] ${darkMode ? 'text-white' : 'text-gray-900'}`}>{pkg.name}</p>
                      {packageData?.aiAdvice?.recommendedPackage === pkg.name && (
                        <span className="text-[8px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold">{t('aiPromotion.recommended')}</span>
                      )}
                      {!canAfford && (
                        <span className="text-[8px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded-full font-bold">{t('aiPromotion.insufficientBalance')}</span>
                      )}
                    </div>
                    <p className={`text-[9px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{pkg.days} {t('common.days')} • {pkg.reach.toLocaleString()} {t('aiPromotion.reach')}</p>
                  </div>
                </div>
                <div className="text-end">
                  <p className={`font-black text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{pkg.price} <span className="text-[9px]">{t('common.egp')}</span></p>
                  <p className={`text-[8px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{pkg.costPerReach} {t('aiPromotion.perReach')}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {pkg.features?.map((f: string, j: number) => (
                  <span key={j} className={`text-[8px] px-1.5 py-0.5 rounded-full ${darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>{f}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Load packages if not loaded yet */}
      {!packageData && (
        <button onClick={loadPackageAdvisor} disabled={isLoading}
          className={`w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
            isLoading ? darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400' : 'bg-gradient-to-l from-yellow-500 to-amber-500 text-white'
          }`}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
          {t('aiPromotion.loadPackages')}
        </button>
      )}
    </div>
  );

  // ─── TRENDING TAB ────────────────────────────────────────────────
  const TrendingContent = () => (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => setActiveTab('dashboard')} className={`w-6 h-6 rounded-lg flex items-center justify-center ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
          {dir === 'rtl' ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
        <TrendingUp className={`w-4 h-4 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
        <h4 className={`font-black text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('aiPromotion.trendingTopics')}</h4>
      </div>

      {/* Hot Topics */}
      {trendingData?.hotTopics?.length > 0 && (
        <div className={`rounded-2xl p-3 border ${darkMode ? 'bg-gradient-to-br from-red-900/20 to-orange-900/10 border-red-800/20' : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Flame className={`w-3.5 h-3.5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
            <span className={`font-black text-[10px] ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{t('aiPromotion.hotTopics')}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {trendingData.hotTopics.map((topic: string, i: number) => (
              <button key={i} onClick={() => { setSelectedCategory(''); setWriteDescription(topic); setActiveTab('write'); }}
                className={`text-[10px] px-2.5 py-1.5 rounded-xl font-bold transition-all active:scale-95 ${darkMode ? 'bg-gray-800/60 text-gray-200 hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'}`}
              >
                🔥 {topic}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Trending Categories */}
      {trendingData?.trending?.length > 0 && (
        <div className="space-y-2">
          <p className={`text-[10px] font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('aiPromotion.trendingCategories')}</p>
          {trendingData.trending.slice(0, 6).map((item: any, i: number) => (
            <button key={i} onClick={() => { setSelectedCategory(item.category); setActiveTab('write'); }}
              className={`w-full text-start rounded-xl p-2.5 border transition-all active:scale-[0.98] ${
                darkMode ? 'bg-gray-800/40 hover:bg-gray-700/60 border-gray-700' : 'bg-white hover:bg-gray-50 border-gray-100 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{item.category === 'phones' ? '📱' : item.category === 'electronics' ? '💻' : item.category === 'cars' ? '🚗' : item.category === 'realEstate' ? '🏠' : item.category === 'fashion' ? '👗' : item.category === 'games' ? '🎮' : '📝'}</span>
                  <div>
                    <p className={`text-[10px] font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.category}</p>
                    <p className={`text-[9px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.postsThisWeek} {t('aiPromotion.postsThisWeek')}</p>
                  </div>
                </div>
                {item.growth > 0 && (
                  <span className={`text-[9px] font-bold px-2 py-1 rounded-lg ${item.growth > 50 ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'}`}>
                    +{item.growth}% ↑
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Trend Insight */}
      {trendingData?.trendInsight && (
        <div className={`rounded-xl p-2.5 ${darkMode ? 'bg-gray-800/30' : 'bg-gray-50'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <Brain className={`w-3 h-3 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
            <span className={`text-[9px] font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{t('aiPromotion.aiInsight')}</span>
          </div>
          <p className={`text-[10px] leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{trendingData.trendInsight}</p>
        </div>
      )}

      {/* Refresh */}
      <button onClick={loadTrending} disabled={isLoading}
        className={`w-full py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
          darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        {t('aiPromotion.refreshTrending')}
      </button>
    </div>
  );

  // ─── CHAT TAB CONTENT ────────────────────────────────────────────
  const ChatContent = () => (
    <>
      <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ height: isExpanded ? 'calc(100% - 140px)' : 'calc(100% - 170px)' }}>
        {messages.map((msg) => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'assistant' ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white' : 'bg-gradient-to-br from-blue-400 to-indigo-500 text-white'
            }`}>
              {msg.role === 'assistant' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
            </div>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed ${
              msg.role === 'user'
                ? darkMode ? 'bg-blue-900/50 text-blue-100 rounded-tr-sm' : 'bg-blue-500 text-white rounded-tr-sm'
                : darkMode ? 'bg-gray-800 text-gray-200 rounded-tl-sm border border-gray-700' : 'bg-gray-100 text-gray-800 rounded-tl-sm'
            }`}>
              {msg.content.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line.split(/(\*\*[^*]+\*\*)/).map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**')) return <span key={j} className="font-black">{part.slice(2, -2)}</span>;
                    return <span key={j}>{part}</span>;
                  })}
                  {i < msg.content.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
              {msg.data && msg.type && onSuggestionApplied && (
                <button onClick={() => { onSuggestionApplied(msg.data); toast.success(t('aiPromotion.suggestionApplied')); }}
                  className="mt-2 w-full py-1.5 bg-gradient-to-l from-orange-500 to-amber-500 text-white rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform"
                >
                  <Zap className="w-2.5 h-2.5" /> {t('aiPromotion.applySuggestion')}
                </button>
              )}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center flex-shrink-0"><Bot className="w-3 h-3" /></div>
            <div className={`rounded-2xl px-3 py-2 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-100'}`}>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Action Chips in Chat */}
      {messages.length <= 1 && (
        <div className={`px-3 py-1.5 border-t ${darkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-50 bg-gray-50/50'}`}>
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
            {quickActions.slice(0, 6).map((action) => (
              <button key={action.id} onClick={action.action} disabled={isLoading}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold whitespace-nowrap transition-all active:scale-95 ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-white hover:bg-gray-100 text-gray-700 shadow-sm'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <action.icon className="w-2.5 h-2.5" /> {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className={`px-3 py-2 border-t ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gray-50'}`}>
        <div className="flex gap-2">
          <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
            placeholder={t('aiPromotion.askAboutPromotion')} disabled={isLoading}
            className={`flex-1 px-3 py-2 rounded-xl text-[11px] font-medium transition-colors ${
              darkMode ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600 focus:border-orange-500' : 'bg-white text-gray-900 placeholder-gray-400 border-gray-200 focus:border-orange-400'
            } border focus:outline-none focus:ring-2 focus:ring-orange-400/30`}
          />
          <button onClick={handleSendChat} disabled={isLoading || !input.trim()}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
              isLoading || !input.trim() ? darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400' : 'bg-gradient-to-l from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-200'
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
        className={`fixed inset-4 md:inset-auto md:bottom-4 md:left-4 ${isExpanded ? 'md:w-[520px] md:h-[700px]' : 'md:w-[380px] md:h-[560px]'} z-[250] rounded-2xl overflow-hidden shadow-2xl border flex flex-col ${
          darkMode ? 'bg-gray-900 border-gray-700 shadow-black/50' : 'bg-white border-gray-200 shadow-gray-200/50'
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
                <h3 className="font-black text-xs">{t('aiPromotion.smartAssistant')}</h3>
                <p className="text-[9px] opacity-80">{t('aiPromotion.poweredByAI')}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" />
              {/* Tab Toggle */}
              <div className="flex rounded-lg overflow-hidden bg-white/10">
                {[
                  { id: 'dashboard' as const, icon: PieChart },
                  { id: 'chat' as const, icon: MessageSquare },
                  { id: 'write' as const, icon: PenTool },
                  { id: 'packages' as const, icon: Crown },
                  { id: 'trending' as const, icon: TrendingUp },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`px-2 py-1 text-[9px] font-bold transition-all ${activeTab === tab.id ? 'bg-white/25' : 'hover:bg-white/10'}`}
                    title={t(`aiPromotion.${tab.id}Tab`)}
                  >
                    <tab.icon className="w-3 h-3" />
                  </button>
                ))}
              </div>
              {/* Expand/Collapse */}
              <button onClick={() => setIsExpanded(!isExpanded)}
                className="w-6 h-6 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
              {/* Close */}
              <button onClick={() => { setIsOpen(false); onClose?.(); }}
                className="w-6 h-6 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* ─── Tab Content ─── */}
        {activeTab === 'dashboard' && <DashboardContent />}
        {activeTab === 'chat' && <ChatContent />}
        {activeTab === 'write' && <WriteContent />}
        {activeTab === 'packages' && <PackagesContent />}
        {activeTab === 'trending' && <TrendingContent />}
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

  return (
    <>
      <AnimatePresence>
        {showAssistant && (
          <AIPromotionAssistant onClose={() => setShowAssistant(false)} />
        )}
      </AnimatePresence>

      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowAssistant(!showAssistant)}
        className={`fixed bottom-20 lg:bottom-6 z-[200] w-12 h-12 rounded-2xl items-center justify-center shadow-2xl transition-all flex ${
          showAssistant
            ? 'bg-gray-600 hover:bg-gray-700 text-white right-6 lg:right-6'
            : 'bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 text-white shadow-orange-300/30 hover:shadow-orange-400/50 right-6 lg:right-6'
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

// ─── Full Page AI Promotion ─ صفحة المساعد الذكي الكاملة ──────────
export const AIPromotionPage: React.FC = () => {
  const { darkMode } = useAppContext();
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const { dir } = useLanguage();

  if (!currentUser) return null;

  return (
    <div className="max-w-2xl mx-auto" dir={dir}>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => window.history.back()}
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
              {t('aiPromotion.smartAssistant')}
            </h1>
            <p className={`text-[10px] ${darkMode ? 'text-orange-400/80' : 'text-orange-600/80'}`}>
              {t('aiPromotion.poweredByAI')}
            </p>
          </div>
        </div>
      </div>
      <AIPromotionAssistant fullPage onClose={() => window.history.back()} />
    </div>
  );
};
