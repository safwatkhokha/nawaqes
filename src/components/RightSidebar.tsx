import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppContext } from '../contexts/AppContext';
import { api } from '../services/api';
import { User, Notification, Trend } from '../types';
import { WalletCard } from './WalletCard';
import {
  Bell,
  Zap,
  Target,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Car,
  Building2,
  Smartphone,
  Briefcase,
  MousePointerClick,
  BarChart3,
  Eye,
  MessageCircle,
  MapPin,
  RefreshCw,
  Star,
  Megaphone,
  ShoppingBag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RightSidebarProps {
  user: User | null;
  notifications: Notification[];
}

const fallbackTrends: Trend[] = [];

interface Opportunity {
  id: string;
  content: string;
  image?: string;
  price?: number;
  category?: string;
  location?: string;
  isPromoted?: boolean;
  promotionTier?: string;
  createdAt?: string;
  author: {
    name: string;
    avatar: string;
    isVerified?: boolean;
  };
  matchReason: 'promoted' | 'interest' | 'recent';
}

const categoryIcons: Record<string, string> = {
  phones: '📱', cars: '🚗', electronics: '💻', realEstate: '🏠',
  games: '🎮', fashion: '👕', services: '🛠️', books: '📚',
  sports: '⚽', animals: '🐾', jobs: '💼', other: '📦',
};

export const RightSidebar: React.FC<RightSidebarProps> = ({ user, notifications }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { dir } = useLanguage();
  const { darkMode, markNotificationRead, posts } = useAppContext();
  const [trends, setTrends] = useState<Trend[]>(fallbackTrends);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [smartReachStats, setSmartReachStats] = useState<{ totalReach: number; totalClicks: number; promotedCount: number; totalPosts: number }>({ totalReach: 0, totalClicks: 0, promotedCount: 0, totalPosts: 0 });

  // Calculate real smart reach data from user's promoted posts
  const myPromotedPosts = posts.filter(p => p.author.id === user?.id && p.isPromoted && p.promotionStatus === 'approved');
  const localReach = myPromotedPosts.reduce((sum, p) => sum + (p.reachCount || 0), 0);
  const localClicks = myPromotedPosts.reduce((sum, p) => sum + (p.clickCount || 0), 0);

  // Fetch smart reach stats from API - falls back to local calculation
  useEffect(() => {
    if (!user) return;
    api.getSmartReachStats()
      .then(data => {
        if (data) {
          setSmartReachStats({
            totalReach: data.totalReach || localReach || 0,
            totalClicks: data.totalClicks || localClicks || 0,
            promotedCount: data.promotedCount || myPromotedPosts.length || 0,
            totalPosts: data.totalPosts || posts.filter(p => p.author.id === user?.id).length || 0,
          });
        } else {
          // Fallback to local calculation from real promoted posts
          setSmartReachStats({
            totalReach: localReach,
            totalClicks: localClicks,
            promotedCount: myPromotedPosts.length,
            totalPosts: posts.filter(p => p.author.id === user?.id).length,
          });
        }
      })
      .catch(() => {
        // Fallback to local calculation from real promoted posts
        setSmartReachStats({
          totalReach: localReach,
          totalClicks: localClicks,
          promotedCount: myPromotedPosts.length,
          totalPosts: posts.filter(p => p.author.id === user?.id).length,
        });
      });
  }, [user, posts, localReach, localClicks, myPromotedPosts.length]);

  useEffect(() => {
    api.getTrends()
      .then((data) => { if (Array.isArray(data)) setTrends(data); })
      .catch(() => { setTrends(fallbackTrends); });
  }, []);

  // Fetch real opportunities from the API
  useEffect(() => {
    api.getOpportunities(8)
      .then((data) => { if (Array.isArray(data)) setOpportunities(data); })
      .catch(() => { setOpportunities([]); });
  }, [user, posts]); // Refresh when user or posts change

  const getNotifIcon = (type: Notification['type']) => {
    switch (type) {
      case 'match':
        return <Target className="w-5 h-5" />;
      case 'payment':
        return <Zap className="w-5 h-5" />;
      case 'promotion':
        return <Sparkles className="w-5 h-5" />;
      case 'message':
        return <MessageCircle className="w-5 h-5" />;
      case 'system':
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getNotifBg = (type: Notification['type']) => {
    switch (type) {
      case 'match':
        return 'bg-blue-100 text-blue-600';
      case 'payment':
        return 'bg-green-100 text-green-600';
      case 'promotion':
        return 'bg-purple-100 text-purple-600';
      case 'message':
        return 'bg-orange-100 text-orange-600';
      case 'system':
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getTrendIcon = (trend: Trend['trend']) => {
    switch (trend) {
      case 'up':
        return <ChevronUp className="w-3 h-3 text-green-500" />;
      case 'down':
        return <ChevronDown className="w-3 h-3 text-red-500" />;
      case 'stable':
      default:
        return <BarChart3 className="w-3 h-3 text-gray-400" />;
    }
  };

  const getTrendColor = (trend: Trend['trend']) => {
    switch (trend) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      case 'stable':
      default:
        return 'text-gray-400';
    }
  };

  const bgCard = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100';
  const bgPage = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-300' : 'text-gray-700';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const hoverBg = darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50';
  const orangeBg = darkMode ? 'bg-orange-900/30 border-orange-800/50' : 'bg-orange-50 border-orange-100';
  const orangeText = darkMode ? 'text-orange-300' : 'text-orange-700';
  const orangeBold = darkMode ? 'text-orange-200' : 'text-orange-900';

  return (
    <aside
      dir={dir}
      className={`hidden xl:flex flex-col gap-6 py-6 w-85 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto px-4 border-s ${bgPage}`}
    >
      {/* ─── Smart Wallet ─── */}
      <section>
        <h4 className={`text-sm font-black mb-4 px-2 ${textPrimary}`}>{t('rightSidebar.financialManagement')}</h4>
        <WalletCard user={user} />
      </section>

      {/* ─── Market Pulse (نبض السوق) ─── */}
      <section className={`rounded-3xl p-5 border ${bgCard}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-600'} rounded-xl`}>
              <TrendingUp className="w-5 h-5" />
            </div>
            <h4 className={`font-bold text-sm ${textPrimary}`}>{t('rightSidebar.marketPulse')}</h4>
          </div>
          <span className={`text-[9px] ${darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'} px-2 py-1 rounded-full font-bold`}>
            {t('rightSidebar.liveNow')}
          </span>
        </div>

        <div className="space-y-4">
          {trends.map((trend) => (
            <div
              key={trend.id}
              className="flex items-center justify-between group cursor-pointer"
              onClick={() => navigate('/market-pulse')}
            >
              <span
                className={`text-xs font-bold ${textSecondary} group-hover:text-orange-600 transition-colors`}
              >
                {trend.item}
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black ${getTrendColor(trend.trend)}`}>
                  {trend.change}
                </span>
                {getTrendIcon(trend.trend)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Market Alerts (تنبيهات السوق) ─── */}
      <section>
        <div className="flex items-center justify-between mb-4 px-2">
          <h4 className={`font-black text-sm ${textPrimary}`}>{t('rightSidebar.marketAlerts')}</h4>
          <button
            onClick={() => navigate('/market')}
            className="text-orange-600 font-bold text-[10px] hover:underline"
          >
            {t('common.all')}
          </button>
        </div>

        <div className="space-y-3">
          {notifications.map((notif) => {
            return (
              <div
                key={notif.id}
                className={`flex gap-3 p-3 ${hoverBg} rounded-2xl transition-colors cursor-pointer group`}
                onClick={async () => {
                  markNotificationRead(notif.id);
                  // Navigate based on notification type and available references
                  if (notif.postId) {
                    navigate(`/post/${notif.postId}`);
                  } else if (notif.userId) {
                    // Verify user exists before navigating
                    try {
                      const userData = await api.getUserProfile(notif.userId);
                      if (userData && userData.id) {
                        navigate(`/user/${notif.userId}`);
                      } else {
                        navigate('/notifications');
                      }
                    } catch {
                      // User doesn't exist, go to notifications page
                      navigate('/notifications');
                    }
                  } else if (notif.type === 'match') {
                    navigate('/market');
                  } else if (notif.type === 'payment') {
                    navigate('/wallet');
                  } else if (notif.type === 'promotion') {
                    navigate('/promotions');
                  } else if (notif.type === 'message') {
                    navigate('/messages');
                  } else if (notif.type === 'friend') {
                    navigate('/my-page');
                  } else if (notif.type === 'like' || notif.type === 'comment') {
                    navigate('/my-page');
                  } else {
                    navigate('/notifications');
                  }
                }}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getNotifBg(notif.type)}`}
                >
                  {getNotifIcon(notif.type)}
                </div>
                <div className="flex flex-col gap-0.5">
                  <p
                    className={`text-[11px] font-bold leading-tight group-hover:text-orange-600 ${textSecondary}`}
                  >
                    {notif.message}
                  </p>
                  <span className={`text-[10px] ${textMuted}`}>{notif.time}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Opportunities (فرص قد تهمك) — Real Data ─── */}
      <section>
        <div className="flex items-center justify-between mb-4 px-2">
          <h4 className={`font-black text-sm ${textPrimary}`}>{t('rightSidebar.opportunities')}</h4>
          <button
            onClick={() => navigate('/market')}
            className="text-orange-600 font-bold text-[10px] hover:underline"
          >
            {t('common.all')}
          </button>
        </div>

        {opportunities.length > 0 ? (
          <div className="space-y-2.5">
            {opportunities.slice(0, 6).map((opp) => (
              <div
                key={opp.id}
                className={`flex gap-3 p-3 ${hoverBg} rounded-2xl transition-colors cursor-pointer group`}
                onClick={() => navigate(`/post/${opp.id}`)}
              >
                {/* Opportunity Image or Category Icon */}
                {opp.image ? (
                  <img
                    src={opp.image}
                    alt=""
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    {categoryIcons[opp.category || ''] || '📦'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {/* Match reason badge */}
                  <div className="flex items-center gap-1.5 mb-1">
                    {opp.isPromoted && (
                      <span className="flex items-center gap-0.5 text-[8px] font-black text-orange-600 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded-full">
                        <Megaphone className="w-2.5 h-2.5" />
                        {t('rightSidebar.promoted', 'مروّج')}
                      </span>
                    )}
                    {opp.matchReason === 'interest' && (
                      <span className="flex items-center gap-0.5 text-[8px] font-black text-blue-600 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-full">
                        <Star className="w-2.5 h-2.5" />
                        {t('rightSidebar.interestsYou', 'يهمك')}
                      </span>
                    )}
                    {opp.category && (
                      <span className="text-[8px] font-bold text-gray-400">
                        {categoryIcons[opp.category]} {t(`interests.${opp.category}`, opp.category)}
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] font-bold leading-tight line-clamp-2 group-hover:text-orange-600 transition-colors ${textSecondary}`}>
                    {opp.content}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {opp.price && (
                      <span className="text-[10px] font-black text-orange-600">{opp.price.toLocaleString()} {t('common.egp')}</span>
                    )}
                    {opp.location && (
                      <span className={`flex items-center gap-0.5 text-[9px] ${textMuted}`}>
                        <MapPin className="w-2.5 h-2.5" />{opp.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {/* Fallback: category cards when no opportunities exist */}
            {[
              { id: 'cars', icon: '🚗', label: t('rightSidebar.category_cars', 'سيارات') },
              { id: 'realEstate', icon: '🏠', label: t('rightSidebar.category_realEstate', 'عقارات') },
              { id: 'electronics', icon: '💻', label: t('rightSidebar.category_electronics', 'إلكترونيات') },
              { id: 'jobs', icon: '💼', label: t('rightSidebar.category_jobs', 'وظائف') },
            ].map((cat) => (
              <div
                key={cat.id}
                className="aspect-square rounded-2xl bg-gray-100 overflow-hidden relative group cursor-pointer"
                onClick={() => navigate(`/market?category=${cat.id}`)}
              >
                <div className={`w-full h-full flex flex-col items-center justify-center gap-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <span className="text-3xl">{cat.icon}</span>
                  <span className={`font-bold text-[10px] ${textSecondary}`}>{cat.label}</span>
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Smart Reach (الوصول الذكي) ─── */}
      <section className={`rounded-3xl p-5 border ${orangeBg}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-600 rounded-xl text-white">
            <Zap className="w-5 h-5" />
          </div>
          <h4 className={`font-bold text-sm ${orangeBold}`}>{t('rightSidebar.smartReach')}</h4>
        </div>
        <p className={`text-[11px] leading-relaxed mb-4 ${orangeText}`}>
          {smartReachStats.promotedCount > 0
            ? smartReachStats.totalReach > 0
              ? t('rightSidebar.smartReachDesc', { count: smartReachStats.totalReach.toLocaleString() })
              : t('rightSidebar.smartReachDescZero')
            : t('rightSidebar.smartReachDescNoPromotions')}
        </p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className={`rounded-xl p-3 text-center ${darkMode ? 'bg-orange-900/20' : 'bg-white'}`}>
            <Eye className="w-4 h-4 text-orange-500 mx-auto mb-1" />
            <p className={`text-lg font-black ${orangeBold}`}>{smartReachStats.totalReach.toLocaleString()}</p>
            <p className={`text-[9px] font-bold ${orangeText}`}>{t('rightSidebar.views')}</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${darkMode ? 'bg-orange-900/20' : 'bg-white'}`}>
            <MousePointerClick className="w-4 h-4 text-orange-500 mx-auto mb-1" />
            <p className={`text-lg font-black ${orangeBold}`}>{smartReachStats.totalClicks.toLocaleString()}</p>
            <p className={`text-[9px] font-bold ${orangeText}`}>{t('rightSidebar.clicks')}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mb-4">
          <span className={`text-[10px] font-bold ${orangeText}`}>{smartReachStats.promotedCount} {t('rightSidebar.promotedPosts', 'منشور مروّج')}</span>
          <span className={`text-[10px] font-bold ${orangeText}`}>{smartReachStats.totalPosts} {t('rightSidebar.totalPosts', 'إجمالي المنشورات')}</span>
        </div>
        <button
          onClick={() => navigate('/promotions')}
          className={`w-full ${
            darkMode ? 'bg-gray-800 text-orange-400 border-orange-700 hover:bg-gray-700' : 'bg-white text-orange-600 border-orange-200 hover:bg-orange-100'
          } py-2.5 rounded-xl text-xs font-bold border transition-colors`}
        >
          {t('rightSidebar.reachAnalysis')}
        </button>
      </section>
    </aside>
  );
};
