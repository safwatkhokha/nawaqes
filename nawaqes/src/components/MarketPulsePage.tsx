import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Trend } from '../types';
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ChevronUp,
  ChevronDown,
  Minus,
  Activity,
  Zap,
  Eye,
  Clock,
  RefreshCw,
  Sparkles,
  Tag,
  ShoppingBag,
  Globe,
  AlertTriangle,
  Users,
  CalendarDays,
  ArrowUpRight,
  Scale,
  Heart,
  Filter,
  ChevronLeft,
  LayoutGrid,
  LineChart,
  Target,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';

interface MarketOverview {
  activeAds: number;
  newToday: number;
  newThisWeek: number;
  totalUsers: number;
  avgPrice: number;
  categoryDist: { category: string; count: number; avg_price: number; min_price: number; max_price: number }[];
  topAds: { id: string; content: string; image: string; price: number; category: string; location: string; reachCount: number; likes: number; authorName: string; authorAvatar: string; createdAt: string }[];
  supplyDemand: { category: string; supply: number; demandScore: number; ratio: number }[];
  priceRanges: { category: string; count: number; minPrice: number; maxPrice: number; avgPrice: number }[];
  weeklyActivity: { date: string; count: number }[];
}

export const MarketPulsePage: React.FC = () => {
  const navigate = useNavigate();
  const { darkMode, posts, newsItems, adminAlerts } = useAppContext();
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const { dir } = useLanguage();

  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<MarketOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'today' | 'week' | 'month'>('week');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeSection, setActiveSection] = useState<string>('overview');

  const bgCard = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const bgSection = darkMode ? 'bg-gray-700/50' : 'bg-gray-50';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-300' : 'text-gray-700';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';

  const loadData = useCallback(async () => {
    setLoading(true);
    setOverviewLoading(true);
    try {
      const [trendsData, overviewData] = await Promise.all([
        api.getTrends(selectedCategory !== 'all' ? selectedCategory : undefined),
        api.getMarketPulseOverview(),
      ]);
      if (Array.isArray(trendsData)) setTrends(trendsData);
      if (overviewData) setOverview(overviewData as MarketOverview);
    } catch (err) {
      console.error('Failed to load market pulse data:', err);
    }
    setLoading(false);
    setOverviewLoading(false);
  }, [selectedCategory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  const refreshData = async () => {
    try {
      // First, refresh trends from real post data
      await api.refreshTrends().catch(() => {});
      const [trendsData, overviewData] = await Promise.all([
        api.getTrends(selectedCategory !== 'all' ? selectedCategory : undefined),
        api.getMarketPulseOverview(),
      ]);
      if (Array.isArray(trendsData)) setTrends(trendsData);
      if (overviewData) setOverview(overviewData as MarketOverview);
      toast.success(t('marketPulse.refreshed'));
    } catch {}
  };

  // Get unique categories from trends
  const trendCategories = useMemo(() => {
    const cats = new Set<string>();
    trends.forEach(t => { if (t.category) cats.add(t.category); });
    return Array.from(cats);
  }, [trends]);

  // Filtered trends by category
  const filteredTrends = useMemo(() => {
    if (selectedCategory === 'all') return trends;
    return trends.filter(t => t.category === selectedCategory);
  }, [trends, selectedCategory]);

  // Calculate stats from trends
  const trendStats = useMemo(() => {
    const up = filteredTrends.filter(t => t.trend === 'up').length;
    const down = filteredTrends.filter(t => t.trend === 'down').length;
    const stable = filteredTrends.filter(t => t.trend === 'stable').length;
    return { up, down, stable, total: filteredTrends.length };
  }, [filteredTrends]);

  // Category distribution from posts
  const categoryStats = useMemo(() => {
    const catMap: Record<string, number> = {};
    posts.filter(p => p.type === 'ad' && p.category).forEach(p => {
      catMap[p.category!] = (catMap[p.category!] || 0) + 1;
    });
    return Object.entries(catMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);
  }, [posts]);

  // Price ranges from overview
  const priceRangeStats = useMemo(() => {
    if (!overview?.priceRanges) return [];
    return overview.priceRanges.slice(0, 6);
  }, [overview]);

  const getTrendIcon = (trend: Trend['trend'], size = 'w-4 h-4') => {
    switch (trend) {
      case 'up': return <ChevronUp className={`${size} text-green-500`} />;
      case 'down': return <ChevronDown className={`${size} text-red-500`} />;
      case 'stable': default: return <Minus className={`${size} text-gray-400`} />;
    }
  };

  const getTrendColor = (trend: Trend['trend']) => {
    switch (trend) {
      case 'up': return 'text-green-500';
      case 'down': return 'text-red-500';
      case 'stable': default: return 'text-gray-400';
    }
  };

  const getTrendBg = (trend: Trend['trend']) => {
    switch (trend) {
      case 'up': return darkMode ? 'bg-green-900/20 border-green-800/40' : 'bg-green-50 border-green-100';
      case 'down': return darkMode ? 'bg-red-900/20 border-red-800/40' : 'bg-red-50 border-red-100';
      case 'stable': default: return darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100';
    }
  };

  const categoryColors = [
    'from-orange-500 to-amber-500',
    'from-blue-500 to-indigo-500',
    'from-green-500 to-emerald-500',
    'from-purple-500 to-violet-500',
    'from-pink-500 to-rose-500',
    'from-yellow-500 to-orange-500',
  ];

  const categoryIcons: Record<string, string> = {
    phones: '📱', cars: '🚗', electronics: '💻', realEstate: '🏠',
    games: '🎮', fashion: '👗', services: '🛠️', books: '📚',
    sports: '⚽', animals: '🐾', jobs: '💼', other: '📦',
  };

  const maxCategoryCount = Math.max(...categoryStats.map(([, c]) => c), 1);

  // Market health calculation
  const marketHealth = useMemo(() => {
    if (!overview) return 'fair';
    const score = (overview.activeAds * 0.3) + (overview.newToday * 0.4) + (trendStats.up * 0.3);
    if (score > 10) return 'excellent';
    if (score > 3) return 'good';
    return 'fair';
  }, [overview, trendStats]);

  // Smart insight
  const smartInsight = useMemo(() => {
    if (trendStats.up > trendStats.down) {
      const topRising = filteredTrends.filter(t => t.trend === 'up').sort((a, b) => {
        const aVal = parseFloat(a.change.replace(/[+%]/g, '')) || 0;
        const bVal = parseFloat(b.change.replace(/[+%]/g, '')) || 0;
        return bVal - aVal;
      })[0];
      if (topRising) return { type: 'rising', text: t('marketPulse.insightRising', { category: topRising.item }) };
      return { type: 'rising', text: t('marketPulse.insightStable') };
    }
    if (trendStats.down > trendStats.up) {
      return { type: 'falling', text: t('marketPulse.insightFalling') };
    }
    return { type: 'stable', text: t('marketPulse.insightStable') };
  }, [trendStats, filteredTrends, t]);

  // Format number compact
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const sections = [
    { id: 'overview', label: t('marketPulse.overview'), icon: LayoutGrid },
    { id: 'trends', label: t('marketPulse.trends'), icon: TrendingUp },
    { id: 'analytics', label: t('marketPulse.priceAnalytics'), icon: LineChart },
    { id: 'supply', label: t('marketPulse.supplyDemand'), icon: Scale },
    { id: 'top', label: t('marketPulse.topAds'), icon: Target },
  ];

  return (
    <div className="max-w-2xl mx-auto" dir={dir}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate('/')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className={`text-2xl font-black flex items-center gap-2 ${textPrimary}`}>
            <Activity className="w-6 h-6 text-orange-500" />
            {t('marketPulse.title')}
          </h1>
          <p className={`text-xs ${textMuted}`}>
            {t('marketPulse.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] bg-green-500 text-white px-2.5 py-1 rounded-full font-bold animate-pulse flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {t('marketPulse.live')}
          </span>
          <button
            onClick={refreshData}
            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <RefreshCw className={`w-4 h-4 ${textMuted}`} />
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 scrollbar-hide">
        {sections.map(sec => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeSection === sec.id
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <sec.icon className="w-3.5 h-3.5" />
            {sec.label}
          </button>
        ))}
      </div>

      {/* Time Range Filter */}
      <div className="flex items-center gap-2 mb-5">
        <Clock className={`w-4 h-4 ${textMuted}`} />
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {[
            { key: 'today' as const, label: t('marketPulse.today') },
            { key: 'week' as const, label: t('marketPulse.thisWeek') },
            { key: 'month' as const, label: t('marketPulse.month') },
          ].map(range => (
            <button
              key={range.key}
              onClick={() => setSelectedTimeRange(range.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                selectedTimeRange === range.key
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-orange-500'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ===== OVERVIEW SECTION ===== */}
        {activeSection === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
            {/* Overview Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: t('marketPulse.activeAds'), value: overview?.activeAds || 0, icon: ShoppingBag, color: 'text-blue-500', bg: darkMode ? 'bg-blue-900/20' : 'bg-blue-50', gradient: 'from-blue-500 to-indigo-500' },
                { label: t('marketPulse.newToday'), value: overview?.newToday || 0, icon: Zap, color: 'text-green-500', bg: darkMode ? 'bg-green-900/20' : 'bg-green-50', gradient: 'from-green-500 to-emerald-500' },
                { label: t('marketPulse.totalUsers'), value: overview?.totalUsers || 0, icon: Users, color: 'text-purple-500', bg: darkMode ? 'bg-purple-900/20' : 'bg-purple-50', gradient: 'from-purple-500 to-violet-500' },
                { label: t('marketPulse.newThisWeek'), value: overview?.newThisWeek || 0, icon: CalendarDays, color: 'text-orange-500', bg: darkMode ? 'bg-orange-900/20' : 'bg-orange-50', gradient: 'from-orange-500 to-amber-500' },
              ].map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`rounded-2xl border p-4 ${bgCard} relative overflow-hidden`}
                >
                  <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-l ${stat.gradient}`} />
                  <div className="flex items-start justify-between mb-2">
                    <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center`}>
                      <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
                    </div>
                  </div>
                  <p className={`text-2xl font-black ${textPrimary}`}>{formatNumber(stat.value)}</p>
                  <p className={`text-[10px] font-bold ${textMuted}`}>{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Trend Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: t('marketPulse.rising'), value: trendStats.up, icon: TrendingUp, color: 'text-green-500', bg: darkMode ? 'bg-green-900/20' : 'bg-green-50' },
                { label: t('marketPulse.falling'), value: trendStats.down, icon: TrendingDown, color: 'text-red-500', bg: darkMode ? 'bg-red-900/20' : 'bg-red-50' },
                { label: t('marketPulse.stable'), value: trendStats.stable, icon: Minus, color: 'text-gray-400', bg: darkMode ? 'bg-gray-700' : 'bg-gray-50' },
              ].map(stat => (
                <div key={stat.label} className={`rounded-2xl border p-3 text-center ${bgCard}`}>
                  <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center mx-auto mb-2`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <p className={`text-xl font-black ${textPrimary}`}>{stat.value}</p>
                  <p className={`text-[10px] font-bold ${textMuted}`}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Market Health */}
            <div className={`rounded-2xl border p-5 ${bgCard}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  marketHealth === 'excellent' ? (darkMode ? 'bg-green-900/30' : 'bg-green-50') :
                  marketHealth === 'good' ? (darkMode ? 'bg-blue-900/30' : 'bg-blue-50') :
                  (darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50')
                }`}>
                  <Activity className={`w-4 h-4 ${
                    marketHealth === 'excellent' ? 'text-green-500' :
                    marketHealth === 'good' ? 'text-blue-500' : 'text-yellow-500'
                  }`} />
                </div>
                <h3 className={`font-black text-sm ${textPrimary}`}>{t('marketPulse.marketHealth')}</h3>
              </div>
              <div className="flex gap-1 mb-3">
                {['excellent', 'good', 'fair'].map((level, i) => (
                  <div key={level} className={`h-2 flex-1 rounded-full transition-colors ${
                    i === 0 && marketHealth === 'excellent' ? 'bg-green-500' :
                    i === 1 && (marketHealth === 'excellent' || marketHealth === 'good') ? 'bg-green-400' :
                    i === 2 ? (marketHealth !== 'fair' ? 'bg-green-300' : 'bg-yellow-500') :
                    darkMode ? 'bg-gray-700' : 'bg-gray-200'
                  }`} />
                ))}
              </div>
              <p className={`text-xs ${textSecondary}`}>
                {marketHealth === 'excellent' ? t('marketPulse.healthExcellent') :
                 marketHealth === 'good' ? t('marketPulse.healthGood') : t('marketPulse.healthFair')}
              </p>
            </div>

            {/* Smart Insight */}
            <div className={`rounded-2xl border p-5 ${
              smartInsight.type === 'rising' ? (darkMode ? 'bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-800/40' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100') :
              smartInsight.type === 'falling' ? (darkMode ? 'bg-gradient-to-br from-red-900/20 to-orange-900/20 border-red-800/40' : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-100') :
              (darkMode ? 'bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border-blue-800/40' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100')
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className={`w-4 h-4 ${
                  smartInsight.type === 'rising' ? 'text-green-500' :
                  smartInsight.type === 'falling' ? 'text-red-500' : 'text-blue-500'
                }`} />
                <h3 className={`font-black text-sm ${textPrimary}`}>{t('marketPulse.insightTitle')}</h3>
              </div>
              <p className={`text-xs leading-relaxed ${textSecondary}`}>
                {smartInsight.text}
              </p>
            </div>

            {/* Category Distribution */}
            <div className={`rounded-2xl border p-5 ${bgCard}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                  <Tag className={`w-4 h-4 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                </div>
                <h3 className={`font-black text-sm ${textPrimary}`}>{t('marketPulse.categoryDist')}</h3>
              </div>

              {categoryStats.length > 0 ? (
                <div className="space-y-3">
                  {categoryStats.map(([cat, count], idx) => (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{categoryIcons[cat] || '📦'}</span>
                          <span className={`text-xs font-bold ${textSecondary}`}>{t(`interests.${cat}`, cat)}</span>
                        </div>
                        <span className={`text-xs font-black ${textMuted}`}>{count} {t('marketPulse.ads')}</span>
                      </div>
                      <div className={`h-2.5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(count / maxCategoryCount) * 100}%` }}
                          transition={{ delay: idx * 0.1, duration: 0.5 }}
                          className={`h-full rounded-full bg-gradient-to-l ${categoryColors[idx % categoryColors.length]}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-sm text-center py-4 ${textMuted}`}>{t('marketPulse.noCategoryData')}</p>
              )}
            </div>

            {/* Avg Price */}
            <div className={`rounded-2xl border p-5 ${bgCard}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-amber-900/30' : 'bg-amber-50'}`}>
                  <span className="text-sm">💰</span>
                </div>
                <h3 className={`font-black text-sm ${textPrimary}`}>{t('marketPulse.avgMarketPrice')}</h3>
              </div>
              <p className={`text-3xl font-black ${textPrimary}`}>
                {(overview?.avgPrice || 0).toLocaleString()} <span className="text-sm font-bold text-orange-500">{t('common.egp')}</span>
              </p>
              <p className={`text-[10px] ${textMuted} mt-1`}>{t('marketPulse.priceAnalytics')}</p>
            </div>

            {/* Admin Alerts - Only shows alerts from admin, not regular news */}
            {adminAlerts.length > 0 && (
              <div className={`rounded-2xl border p-5 ${bgCard}`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
                    <AlertTriangle className={`w-4 h-4 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                  </div>
                  <h3 className={`font-black text-sm ${textPrimary}`}>{t('adminAlertBar.title')}</h3>
                </div>

                <div className="space-y-2">
                  {adminAlerts.slice(0, 4).map(item => (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                        darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        navigate(`/notifications?filter=alert&newsId=${item.id}`);
                      }}
                    >
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-red-500 animate-pulse" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold ${textSecondary} line-clamp-2`}>{item.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[9px] font-bold ${textMuted}`}>[{item.source}]</span>
                          {item.createdAt && (
                            <span className={`text-[9px] ${textMuted}`}>{item.createdAt}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ===== TRENDS SECTION ===== */}
        {activeSection === 'trends' && (
          <motion.div key="trends" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-orange-500 text-white'
                    : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Filter className="w-3 h-3" />
                {t('marketPulse.allCategories')}
              </button>
              {trendCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-orange-500 text-white'
                      : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span className="text-xs">{categoryIcons[cat] || '📦'}</span>
                  {t(`interests.${cat}`, cat)}
                </button>
              ))}
            </div>

            {/* Trends List */}
            <div className={`rounded-2xl border p-5 ${bgCard}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
                    <BarChart3 className={`w-4 h-4 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                  </div>
                  <h3 className={`font-black text-sm ${textPrimary}`}>{t('marketPulse.trends')}</h3>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>
                    {filteredTrends.length}
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-14 rounded-xl animate-pulse bg-gray-200 dark:bg-gray-700" />
                  ))}
                </div>
              ) : filteredTrends.length > 0 ? (
                <div className="space-y-2">
                  {filteredTrends.map((trend, idx) => (
                    <motion.div
                      key={trend.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] ${getTrendBg(trend.trend)}`}
                      onClick={() => navigate('/market')}
                    >
                      <div className="flex items-center gap-3">
                        {trend.category && (
                          <span className="text-lg">{categoryIcons[trend.category] || '📊'}</span>
                        )}
                        <div>
                          <span className={`text-sm font-bold ${textSecondary}`}>{trend.item}</span>
                          {trend.price != null && (
                            <p className={`text-[10px] ${textMuted}`}>
                              {t('marketPulse.avgPrice')}: {trend.price.toLocaleString()} {t('common.egp')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-black ${getTrendColor(trend.trend)}`}>
                          {trend.change}
                        </span>
                        {getTrendIcon(trend.trend)}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className={`p-8 text-center rounded-xl ${bgSection}`}>
                  <BarChart3 className={`w-10 h-10 mx-auto mb-3 ${textMuted}`} />
                  <p className={`text-sm font-bold ${textMuted}`}>{t('marketPulse.noTrends')}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ===== ANALYTICS SECTION ===== */}
        {activeSection === 'analytics' && (
          <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
            {/* Price Analytics Summary */}
            <div className={`rounded-2xl border p-5 ${bgCard}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                  <ShoppingBag className={`w-4 h-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                </div>
                <h3 className={`font-black text-sm ${textPrimary}`}>{t('marketPulse.priceAnalytics')}</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className={`rounded-xl p-3 text-center ${bgSection}`}>
                  <p className={`text-lg font-black ${textPrimary}`}>{(overview?.avgPrice || 0).toLocaleString()}</p>
                  <p className={`text-[10px] font-bold ${textMuted}`}>{t('marketPulse.avgPrice')}</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${bgSection}`}>
                  <p className={`text-lg font-black ${textPrimary}`}>{overview?.activeAds || 0}</p>
                  <p className={`text-[10px] font-bold ${textMuted}`}>{t('marketPulse.adsTracked')}</p>
                </div>
              </div>

              {/* Price by category */}
              {priceRangeStats.length > 0 ? (
                <div className="space-y-3">
                  {priceRangeStats.map((pr, idx) => (
                    <div key={pr.category} className={`rounded-xl p-3 ${bgSection}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{categoryIcons[pr.category] || '📦'}</span>
                          <span className={`text-xs font-bold ${textSecondary}`}>{t(`interests.${pr.category}`, pr.category)}</span>
                        </div>
                        <span className={`text-[10px] ${textMuted}`}>{pr.count} {t('marketPulse.ads')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <ChevronDown className="w-3 h-3 text-green-500" />
                          <span className="text-[11px] font-bold text-green-600">{pr.minPrice.toLocaleString()} {t('common.egp')}</span>
                        </div>
                        <div className={`h-1 flex-1 mx-3 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                          <div
                            className={`h-full rounded-full bg-gradient-to-l ${categoryColors[idx % categoryColors.length]}`}
                            style={{ width: `${Math.min((pr.avgPrice / pr.maxPrice) * 100, 100)}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <ChevronUp className="w-3 h-3 text-red-500" />
                          <span className="text-[11px] font-bold text-red-600">{pr.maxPrice.toLocaleString()} {t('common.egp')}</span>
                        </div>
                      </div>
                      <p className={`text-[9px] text-center mt-1 ${textMuted}`}>
                        {t('marketPulse.avgPrice')}: {pr.avgPrice.toLocaleString()} {t('common.egp')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-sm text-center py-4 ${textMuted}`}>{t('marketPulse.noPriceData')}</p>
              )}
            </div>

            {/* Weekly Activity Chart */}
            <div className={`rounded-2xl border p-5 ${bgCard}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-indigo-900/30' : 'bg-indigo-50'}`}>
                  <BarChart3 className={`w-4 h-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                </div>
                <h3 className={`font-black text-sm ${textPrimary}`}>{t('marketPulse.weeklyActivity')}</h3>
              </div>

              {overview?.weeklyActivity && overview.weeklyActivity.length > 0 ? (
                <div className="space-y-2">
                  {overview.weeklyActivity.map((day, idx) => {
                    const maxCount = Math.max(...overview.weeklyActivity.map(d => d.count), 1);
                    return (
                      <div key={day.date} className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold ${textMuted} w-16 text-left`}>
                          {new Date(day.date).toLocaleDateString(dir === 'rtl' ? 'ar-EG' : 'en-US', { weekday: 'short' })}
                        </span>
                        <div className={`h-6 flex-1 rounded-lg overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(day.count / maxCount) * 100}%` }}
                            transition={{ delay: idx * 0.1, duration: 0.5 }}
                            className="h-full rounded-lg bg-gradient-to-l from-indigo-500 to-blue-500 flex items-center justify-end px-2"
                          >
                            <span className="text-[9px] font-bold text-white">{day.count}</span>
                          </motion.div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className={`text-sm text-center py-4 ${textMuted}`}>{t('marketPulse.noActivityData')}</p>
              )}
            </div>
          </motion.div>
        )}

        {/* ===== SUPPLY & DEMAND SECTION ===== */}
        {activeSection === 'supply' && (
          <motion.div key="supply" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
            <div className={`rounded-2xl border p-5 ${bgCard}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-cyan-900/30' : 'bg-cyan-50'}`}>
                  <Scale className={`w-4 h-4 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                </div>
                <h3 className={`font-black text-sm ${textPrimary}`}>{t('marketPulse.supplyDemand')}</h3>
              </div>

              {overview?.supplyDemand && overview.supplyDemand.length > 0 ? (
                <div className="space-y-3">
                  {overview.supplyDemand.map((sd, idx) => {
                    const maxSupply = Math.max(...overview.supplyDemand.map(s => s.supply), 1);
                    const demandLevel = sd.ratio > 2 ? 'high' : sd.ratio > 0.5 ? 'balanced' : 'low';
                    return (
                      <motion.div
                        key={sd.category}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`rounded-xl p-3 border ${bgSection}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{categoryIcons[sd.category] || '📦'}</span>
                            <span className={`text-xs font-bold ${textSecondary}`}>{t(`interests.${sd.category}`, sd.category)}</span>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            demandLevel === 'high' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                            demandLevel === 'balanced' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                            'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {demandLevel === 'high' ? t('marketPulse.highDemand') :
                             demandLevel === 'balanced' ? t('marketPulse.balanced') : t('marketPulse.lowDemand')}
                          </span>
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-[9px] font-bold ${textMuted}`}>{t('marketPulse.supply')}</span>
                              <span className={`text-[9px] font-bold ${textMuted}`}>{sd.supply}</span>
                            </div>
                            <div className={`h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                              <div className="h-full rounded-full bg-blue-500" style={{ width: `${(sd.supply / maxSupply) * 100}%` }} />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-[9px] font-bold ${textMuted}`}>{t('marketPulse.demand')}</span>
                              <span className={`text-[9px] font-bold ${textMuted}`}>{sd.demandScore}</span>
                            </div>
                            <div className={`h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                              <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.min((sd.ratio / 5) * 100, 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <p className={`text-sm text-center py-4 ${textMuted}`}>{t('marketPulse.noCategoryData')}</p>
              )}
            </div>

            {/* Market Intelligence */}
            <div className={`rounded-2xl border p-5 ${
              darkMode ? 'bg-gradient-to-br from-orange-900/20 to-amber-900/20 border-orange-800/40' : 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-orange-500" />
                <h3 className={`font-black text-sm ${textPrimary}`}>{t('marketPulse.intelligence')}</h3>
              </div>
              <p className={`text-xs leading-relaxed ${textSecondary}`}>
                {t('marketPulse.intelligenceDesc')}
              </p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className={`rounded-xl p-3 ${darkMode ? 'bg-orange-900/20' : 'bg-white'}`}>
                  <Eye className="w-4 h-4 text-orange-500 mx-auto mb-1" />
                  <p className={`text-sm font-black ${textPrimary}`}>{overview?.activeAds || 0}</p>
                  <p className={`text-[9px] font-bold ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>{t('marketPulse.activeAds')}</p>
                </div>
                <div className={`rounded-xl p-3 ${darkMode ? 'bg-orange-900/20' : 'bg-white'}`}>
                  <Clock className="w-4 h-4 text-orange-500 mx-auto mb-1" />
                  <p className={`text-sm font-black ${textPrimary}`}>{overview?.newToday || 0}</p>
                  <p className={`text-[9px] font-bold ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>{t('marketPulse.newToday')}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ===== TOP ADS SECTION ===== */}
        {activeSection === 'top' && (
          <motion.div key="top" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
            <div className={`rounded-2xl border p-5 ${bgCard}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-pink-900/30' : 'bg-pink-50'}`}>
                  <Target className={`w-4 h-4 ${darkMode ? 'text-pink-400' : 'text-pink-600'}`} />
                </div>
                <h3 className={`font-black text-sm ${textPrimary}`}>{t('marketPulse.topAds')}</h3>
              </div>

              {overview?.topAds && overview.topAds.length > 0 ? (
                <div className="space-y-3">
                  {overview.topAds.map((ad, idx) => (
                    <motion.div
                      key={ad.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`rounded-xl border p-3 cursor-pointer transition-all hover:shadow-md ${
                        darkMode ? 'border-gray-700 hover:border-gray-600' : 'border-gray-100 hover:border-gray-200'
                      }`}
                      onClick={() => navigate(`/post/${ad.id}`)}
                    >
                      <div className="flex gap-3">
                        {ad.image && (
                          <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                            <img src={ad.image} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold ${textSecondary} line-clamp-2 mb-1`}>{ad.content}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {ad.price != null && (
                              <span className="text-[10px] font-black text-orange-500">{ad.price.toLocaleString()} {t('common.egp')}</span>
                            )}
                            {ad.category && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>
                                {t(`interests.${ad.category}`, ad.category)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex items-center gap-1">
                              <Eye className={`w-3 h-3 ${textMuted}`} />
                              <span className={`text-[9px] font-bold ${textMuted}`}>{ad.reachCount} {t('marketPulse.reachCount')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Heart className={`w-3 h-3 ${textMuted}`} />
                              <span className={`text-[9px] font-bold ${textMuted}`}>{ad.likes} {t('marketPulse.likesCount')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className={`text-[9px] ${textMuted}`}>{t('marketPulse.by')}</span>
                            <span className={`text-[9px] font-bold ${textSecondary}`}>{ad.authorName}</span>
                          </div>
                        </div>
                        <ChevronLeft className={`w-4 h-4 flex-shrink-0 mt-2 ${textMuted}`} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className={`p-8 text-center rounded-xl ${bgSection}`}>
                  <Target className={`w-10 h-10 mx-auto mb-3 ${textMuted}`} />
                  <p className={`text-sm font-bold ${textMuted}`}>{t('marketPulse.noTopAds')}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
