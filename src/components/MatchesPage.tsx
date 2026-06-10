import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { PostCard } from './PostCard';
import {
  ArrowRight,
  Target,
  Settings,
  Sparkles,
  ShoppingBag,
  SlidersHorizontal,
  Grid3X3,
  List,
  TrendingUp,
  Heart,
  Star,
  Zap,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';

const interestToCategory: Record<string, string> = {
  'phones': 'phones',
  'cars': 'cars',
  'electronics': 'electronics',
  'realEstate': 'realEstate',
  'real_estate': 'real_estate',
  'games': 'gaming',
  'fashion': 'fashion',
  'beauty': 'beauty',
  'education': 'education',
  'health': 'health',
  'food': 'food',
  'travel': 'travel',
  'photography': 'photography',
  'services': 'services',
  'books': 'books',
  'sports': 'sports',
  'animals': 'animals',
  'jobs': 'jobs',
  'other': 'other',
  // Arabic legacy names
  'هواتف': 'phones',
  'سيارات': 'cars',
  'إلكترونيات': 'electronics',
  'عقارات': 'real_estate',
  'ألعاب': 'gaming',
  'أزياء': 'fashion',
  'تجميل': 'beauty',
  'تعليم': 'education',
  'صحة': 'health',
  'طعام ومطاعم': 'food',
  'سفر وسياحة': 'travel',
  'تصوير': 'photography',
  'لابتوبات': 'electronics',
  'استثمار': 'real_estate',
  'تقنية': 'electronics',
};

export const MatchesPage: React.FC = () => {
  const navigate = useNavigate();
  const { darkMode, posts } = useAppContext();
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const { dir } = useLanguage();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'relevance' | 'newest' | 'price_low' | 'price_high'>('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInterest, setSelectedInterest] = useState<string | null>(null);

  const userInterests = currentUser?.interests || [];

  const matchedCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    userInterests.forEach(interest => {
      const catId = interestToCategory[interest];
      if (catId) ids.add(catId);
    });
    return ids;
  }, [userInterests]);

  // Calculate match score for each post
  const matchedPostsWithScore = useMemo(() => {
    let result = posts.filter(p => p.type === 'ad');

    if (selectedInterest) {
      const catId = interestToCategory[selectedInterest];
      if (catId) {
        result = result.filter(p => p.category === catId);
      }
    } else if (matchedCategoryIds.size > 0) {
      result = result.filter(p => p.category && matchedCategoryIds.has(p.category));
    }

    return result.map(post => {
      let score = 0;
      if (post.category && matchedCategoryIds.has(post.category)) score += 50;
      if (post.isPromoted && post.promotionStatus === 'approved') score += 20;
      if (post.isBoosted) score += 10;
      if (post.author.isVerified || post.author.isTrusted) score += 15;
      if (post.price && post.price > 0) score += 5;
      // Recency bonus
      const hoursDiff = (Date.now() - new Date(post.timestamp).getTime()) / (1000 * 60 * 60);
      if (hoursDiff < 24) score += 10;
      else if (hoursDiff < 72) score += 5;

      return { post, score: Math.min(score, 100) };
    });
  }, [posts, matchedCategoryIds, selectedInterest]);

  // Sort matched posts
  const sortedMatches = useMemo(() => {
    const sorted = [...matchedPostsWithScore];
    switch (sortBy) {
      case 'relevance':
        return sorted.sort((a, b) => b.score - a.score);
      case 'newest':
        return sorted.sort((a, b) => new Date(b.post.timestamp).getTime() - new Date(a.post.timestamp).getTime());
      case 'price_low':
        return sorted.sort((a, b) => (a.post.price || 0) - (b.post.price || 0));
      case 'price_high':
        return sorted.sort((a, b) => (b.post.price || 0) - (a.post.price || 0));
      default:
        return sorted;
    }
  }, [matchedPostsWithScore, sortBy]);

  const hasInterests = userInterests.length > 0;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-orange-500';
    return 'text-yellow-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return darkMode ? 'bg-green-900/30' : 'bg-green-50';
    if (score >= 50) return darkMode ? 'bg-orange-900/30' : 'bg-orange-50';
    return darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return t('matches.excellent');
    if (score >= 50) return t('matches.good');
    return t('matches.fair');
  };

  const bgCard = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-300' : 'text-gray-700';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="max-w-4xl mx-auto" dir={dir}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
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
            <Target className="w-6 h-6 text-orange-500" />
            {t('matches.title')}
          </h1>
          <p className={`text-sm ${textMuted}`}>
            {t('matches.subtitle')}
          </p>
        </div>
        <button
          onClick={() => navigate('/profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
          }`}
        >
          <Settings className="w-4 h-4" />
          {t('matches.editInterests')}
        </button>
      </div>

      {/* Match Stats */}
      {hasInterests && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className={`rounded-xl border p-3 text-center ${bgCard}`}>
            <Target className={`w-5 h-5 mx-auto mb-1 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
            <p className={`text-xl font-black ${textPrimary}`}>{matchedPostsWithScore.length}</p>
            <p className={`text-[10px] font-bold ${textMuted}`}>{t('matches.matchingAds', { count: matchedPostsWithScore.length })}</p>
          </div>
          <div className={`rounded-xl border p-3 text-center ${bgCard}`}>
            <Sparkles className={`w-5 h-5 mx-auto mb-1 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
            <p className={`text-xl font-black ${textPrimary}`}>{userInterests.length}</p>
            <p className={`text-[10px] font-bold ${textMuted}`}>{t('matches.activeInterests')}</p>
          </div>
          <div className={`rounded-xl border p-3 text-center ${bgCard}`}>
            <Star className={`w-5 h-5 mx-auto mb-1 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
            <p className={`text-xl font-black ${textPrimary}`}>
              {matchedPostsWithScore.length > 0
                ? Math.round(matchedPostsWithScore.reduce((s, m) => s + m.score, 0) / matchedPostsWithScore.length)
                : 0}%
            </p>
            <p className={`text-[10px] font-bold ${textMuted}`}>{t('matches.avgMatch')}</p>
          </div>
        </div>
      )}

      {/* User Interests Tags */}
      {hasInterests && (
        <div className={`rounded-xl p-4 mb-6 border ${bgCard}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className={`w-4 h-4 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
              <span className={`text-xs font-bold ${textSecondary}`}>
                {t('matches.currentInterests')}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {userInterests.map((interest, i) => (
              <button
                key={i}
                onClick={() => setSelectedInterest(selectedInterest === interest ? null : interest)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  selectedInterest === interest
                    ? 'bg-orange-600 text-white'
                    : darkMode
                      ? 'bg-orange-900/30 text-orange-300 border border-orange-800/40 hover:bg-orange-900/50'
                      : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
                }`}
              >
                {t(`interests.${interest}`, interest)}
              </button>
            ))}
            {selectedInterest && (
              <button
                onClick={() => setSelectedInterest(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                  darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {t('matches.showAll')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sort & View Controls */}
      {matchedPostsWithScore.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                showFilters
                  ? 'bg-orange-600 text-white'
                  : darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {t('matches.sort')}
            </button>
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex items-center gap-1"
                >
                  {[
                    { id: 'relevance' as const, label: t('matches.sortRelevance'), icon: Target },
                    { id: 'newest' as const, label: t('matches.sortNewest'), icon: TrendingUp },
                    { id: 'price_low' as const, label: t('matches.sortPriceLow'), icon: ChevronDown },
                  ].map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSortBy(s.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                        sortBy === s.id
                          ? 'bg-orange-600 text-white'
                          : darkMode ? 'bg-gray-800 text-gray-400 hover:text-gray-300' : 'bg-gray-50 text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? (darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900') : textMuted}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? (darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900') : textMuted}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {sortedMatches.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-3">
            {sortedMatches.map(({ post, score }) => (
              <div key={post.id} className="relative">
                {/* Match Score Badge */}
                <div className={`absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-1 rounded-lg ${getScoreBg(score)}`}>
                  <Target className={`w-3 h-3 ${getScoreColor(score)}`} />
                  <span className={`text-[10px] font-black ${getScoreColor(score)}`}>{score}%</span>
                </div>
                <PostCard post={post} />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedMatches.map(({ post, score }) => (
              <div key={post.id} className="relative">
                {/* Match Score Badge */}
                <div className={`absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${getScoreBg(score)}`}>
                  <Target className={`w-3.5 h-3.5 ${getScoreColor(score)}`} />
                  <span className={`text-[11px] font-black ${getScoreColor(score)}`}>{score}%</span>
                  <span className={`text-[9px] font-bold ${getScoreColor(score)}`}>{getScoreLabel(score)}</span>
                </div>
                <PostCard post={post} />
              </div>
            ))}
          </div>
        )
      ) : (
        <div className={`p-12 text-center rounded-2xl border ${bgCard}`}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
            darkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            {hasInterests ? (
              <ShoppingBag className={`w-10 h-10 ${textMuted}`} />
            ) : (
              <Target className={`w-10 h-10 ${textMuted}`} />
            )}
          </div>
          {hasInterests ? (
            <>
              <p className={`font-bold text-lg ${textPrimary}`}>
                {t('matches.noMatchingAds')}
              </p>
              <p className={`text-sm mt-1 ${textMuted}`}>
                {t('matches.willNotifyYou')}
              </p>
            </>
          ) : (
            <>
              <p className={`font-bold text-lg ${textPrimary}`}>
                {t('matches.addInterests')}
              </p>
              <p className={`text-sm mt-1 ${textMuted}`}>
                {t('matches.chooseInterests')}
              </p>
              <button
                onClick={() => navigate('/profile')}
                className="mt-4 bg-orange-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-orange-700 active:scale-95 transition-all"
              >
                {t('matches.editInterests')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
