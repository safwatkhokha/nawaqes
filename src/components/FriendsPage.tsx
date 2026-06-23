import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { User, Post, FriendRequest } from '../types';
import {
  ArrowRight, Search, Users, UserPlus, UserCheck, MessageCircle,
  Sparkles, TrendingUp, Star, Shield, MapPin, Heart, Send,
  Grid3x3, List, Filter, X, Check, MoreHorizontal, Crown,
  Zap, Globe, CheckCircle2, Image, ThumbsUp, Share2, Bookmark,
  BookmarkCheck, ShoppingBag, ChevronDown, Eye, Clock, RefreshCw,
  Activity, Handshake, Compass, UserX, Inbox, SendHorizonal, Ban,
  ShieldOff, Tag, HeartHandshake, Briefcase, Home, UserMinus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { isUserOnline, formatLastSeen, initializeMockPresence, updatePresence } from '../utils/presence';
import { formatRelativeTimeAr } from '../utils/time';

// ─── Friend User Type ────────────────────────────────
interface FriendUser extends User {
  isOnline?: boolean;
  lastSeen?: string;
  mutualFriends?: number;
  friendSince?: string;
  friendLabel?: string;
  recentActivity?: string;
  friendshipId?: string;
}

// ─── Friend Post Type ────────────────────────────────
interface FriendPost {
  id: string;
  author: FriendUser;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
  timestamp: string;
  type: 'ad' | 'news' | 'status';
  price?: number;
  currency?: string;
  location?: string;
  isLiked?: boolean;
  isSaved?: boolean;
}

type ViewMode = 'feed' | 'grid' | 'list';
type FriendFilter = 'all' | 'online' | 'nearby' | 'recent';
type FriendLabel = 'general' | 'close' | 'family' | 'work';

// ─── Interest Translation Map ──────────────────────────
const INTEREST_MAP: Record<string, string> = {
  phones: 'categories.phones', cars: 'categories.cars', electronics: 'categories.electronics', realEstate: 'categories.realEstate',
  games: 'categories.games', fashion: 'categories.fashion', services: 'categories.services', books: 'categories.books',
  sports: 'categories.sports', animals: 'categories.animals', jobs: 'categories.jobs', other: 'categories.other',
};

// ─── Interest Badge Colors ─────────────────────────────
const INTEREST_COLORS: Record<string, string> = {
  phones: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  cars: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  electronics: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  realEstate: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  games: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  fashion: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  services: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  books: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  sports: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  animals: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  jobs: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

// ─── Friend Label Config ────────────────────────────────
const LABEL_CONFIG: Record<string, { icon: React.ReactNode; color: string; darkColor: string }> = {
  close: { icon: <HeartHandshake className="w-3 h-3" />, color: 'bg-rose-100 text-rose-700 border-rose-200', darkColor: 'dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800' },
  family: { icon: <Home className="w-3 h-3" />, color: 'bg-blue-100 text-blue-700 border-blue-200', darkColor: 'dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' },
  work: { icon: <Briefcase className="w-3 h-3" />, color: 'bg-amber-100 text-amber-700 border-amber-200', darkColor: 'dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' },
  general: { icon: <Tag className="w-3 h-3" />, color: 'bg-gray-100 text-gray-600 border-gray-200', darkColor: 'dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600' },
};

// ─── Trust Score Badge Component ───────────────────────
const TrustScoreBadge: React.FC<{ score: number; size?: 'sm' | 'md'; darkMode: boolean }> = ({ score, size = 'sm', darkMode }) => {
  const color = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  const textColor = score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-red-500';
  const barWidth = size === 'sm' ? 'w-12' : 'w-20';
  const barHeight = size === 'sm' ? 'h-1.5' : 'h-2';

  return (
    <div className="flex items-center gap-1.5">
      <div className={`${barWidth} ${barHeight} rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(score, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className={`font-black ${textColor}`} style={{ fontSize: size === 'sm' ? '8px' : '10px' }}>
        {score}%
      </span>
    </div>
  );
};

// ─── Mutual Interests Badges Component ─────────────────
const MutualInterestsBadges: React.FC<{
  currentInterests?: string[];
  otherInterests?: string[];
  max?: number;
  darkMode: boolean;
  showLabel?: boolean;
}> = ({ currentInterests = [], otherInterests = [], max = 3, darkMode, showLabel = true }) => {
  const { t } = useTranslation();
  const mutual = currentInterests.filter(i => otherInterests.includes(i));

  if (mutual.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {showLabel && (
        <Handshake className="w-2.5 h-2.5 text-orange-500 flex-shrink-0" />
      )}
      {mutual.slice(0, max).map(interest => (
        <span
          key={interest}
          className={`text-[7px] px-1.5 py-0.5 rounded-full font-bold ${
            darkMode
              ? (INTEREST_COLORS[interest]?.replace('dark:', '').split(' ').filter(c => c.startsWith('dark:')).join(' ').replace('dark:', '') || 'bg-gray-700 text-gray-300')
              : (INTEREST_COLORS[interest]?.split(' ').filter(c => !c.startsWith('dark:')).join(' ') || 'bg-gray-100 text-gray-600')
          }`}
        >
          {t(INTEREST_MAP[interest] || interest)}
        </span>
      ))}
      {mutual.length > max && (
        <span className={`text-[7px] font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          +{mutual.length - max}
        </span>
      )}
    </div>
  );
};

// ─── Friend Label Badge Component ─────────────────────────
const FriendLabelBadge: React.FC<{
  label: string;
  darkMode: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
}> = ({ label, darkMode, onClick, size = 'sm' }) => {
  const { t } = useTranslation();
  const config = LABEL_CONFIG[label] || LABEL_CONFIG.general;
  const labelKey = label === 'close' ? 'friends.labelClose' : label === 'family' ? 'friends.labelFamily' : label === 'work' ? 'friends.labelWork' : 'friends.labelGeneral';

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[8px] font-bold transition-colors ${config.color} ${darkMode ? config.darkColor : ''} ${onClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
    >
      {config.icon}
      {size === 'md' && <span>{t(labelKey)}</span>}
    </button>
  );
};

// ─── Label Picker Dropdown ────────────────────────────
const LabelPicker: React.FC<{
  currentLabel: string;
  darkMode: boolean;
  onSelect: (label: FriendLabel) => void;
  onClose: () => void;
}> = ({ currentLabel, darkMode, onSelect, onClose }) => {
  const { t } = useTranslation();
  const labels: { key: FriendLabel; label: string }[] = [
    { key: 'general', label: t('friends.labelGeneral') },
    { key: 'close', label: t('friends.labelClose') },
    { key: 'family', label: t('friends.labelFamily') },
    { key: 'work', label: t('friends.labelWork') },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -5 }}
      className={`absolute z-50 top-full mt-1 right-0 rounded-xl border shadow-xl p-2 min-w-[140px] ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
    >
      <p className={`text-[9px] font-bold mb-1.5 px-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('friends.friendLabel')}</p>
      {labels.map(l => (
        <button
          key={l.key}
          onClick={() => { onSelect(l.key); onClose(); }}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            currentLabel === l.key
              ? darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-600'
              : darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'
          }`}
        >
          {LABEL_CONFIG[l.key].icon}
          <span>{l.label}</span>
          {currentLabel === l.key && <Check className="w-3 h-3 mr-auto text-orange-500" />}
        </button>
      ))}
    </motion.div>
  );
};

// ─── Mutual Friends Modal ──────────────────────────────
const MutualFriendsModal: React.FC<{
  userId: string;
  userName: string;
  darkMode: boolean;
  onClose: () => void;
}> = ({ userId, userName, darkMode, onClose }) => {
  const { t } = useTranslation();
  const [mutual, setMutual] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMutualFriends(userId).then(data => {
      setMutual(data.mutualFriends || []);
    }).catch(() => {
      setMutual([]);
    }).finally(() => setLoading(false));
  }, [userId]);

  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-inherit">
          <div>
            <h3 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('friends.mutualFriends')}
            </h3>
            <p className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('friends.mutualFriendsCount', { count: mutual.length })} — {userName}
            </p>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : mutual.length === 0 ? (
            <div className="text-center py-8">
              <Users className={`w-10 h-10 mx-auto mb-2 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('friends.noMutualFriends')}</p>
            </div>
          ) : (
            mutual.map((mf: any) => (
              <button
                key={mf.id}
                onClick={() => { onClose(); navigate(`/user/${mf.id}`); }}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-right ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
              >
                <img src={mf.avatar} alt="" className="w-10 h-10 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{mf.name}</span>
                    {mf.isVerified && <CheckCircle2 className="w-3 h-3 text-orange-600" />}
                  </div>
                  {mf.location && <p className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{mf.location}</p>}
                </div>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Confirm Dialog ──────────────────────────────────
const ConfirmDialog: React.FC<{
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor?: string;
  darkMode: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ title, message, confirmLabel, confirmColor = 'bg-red-600 hover:bg-red-700', darkMode, onConfirm, onCancel }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    onClick={onCancel}
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className={`w-full max-w-sm rounded-2xl border shadow-2xl p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
      onClick={e => e.stopPropagation()}
    >
      <h3 className={`font-bold text-base mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
      <p className={`text-sm mb-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{message}</p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          {useTranslation().t('common.cancel')}
        </button>
        <button
          onClick={onConfirm}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white ${confirmColor}`}
        >
          {confirmLabel}
        </button>
      </div>
    </motion.div>
  </motion.div>
);

export const FriendsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { darkMode, friendRequests, acceptFriendRequest, rejectFriendRequest, sendMessage, toggleSavePost, savedPosts, openShareModal, addNotification, isUserOnlineWs } = useAppContext();
  const { currentUser, allUsers } = useAuth();

  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [suggested, setSuggested] = useState<FriendUser[]>([]);
  const [friendPosts, setFriendPosts] = useState<FriendPost[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('feed');
  const [filter, setFilter] = useState<FriendFilter>('all');
  const [labelFilter, setLabelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Friends stats from API
  const [friendStats, setFriendStats] = useState<{
    totalFriends: number; pendingIncoming: number; pendingSent: number;
    onlineFriends: number; friendsByLabel: Record<string, number>;
    friendsThisWeek: number; nearbyFriends: number;
  } | null>(null);

  // Track which suggestions are being added (for confirmation animation)
  const [addingFriendIds, setAddingFriendIds] = useState<Set<string>>(new Set());
  // Track which sent requests are being cancelled
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set());
  // Label picker open state
  const [openLabelPicker, setOpenLabelPicker] = useState<string | null>(null);
  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string; message: string; confirmLabel: string; confirmColor?: string;
    onConfirm: () => void;
  } | null>(null);
  // Mutual friends modal
  const [mutualModal, setMutualModal] = useState<{ userId: string; userName: string } | null>(null);
  // Blocked users list
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [showBlockedList, setShowBlockedList] = useState(false);

  // Read tab from URL params
  const tabParam = searchParams.get('tab');
  const getInitialSection = (): 'feed' | 'friends' | 'suggestions' | 'requests' | 'sent' | 'blocked' => {
    if (tabParam === 'requests') return 'requests';
    if (tabParam === 'sent') return 'sent';
    if (tabParam === 'suggestions') return 'suggestions';
    if (tabParam === 'blocked') return 'blocked';
    if (tabParam === 'feed') return 'feed';
    return 'friends';
  };
  const [activeSection, setActiveSection] = useState<'feed' | 'friends' | 'suggestions' | 'requests' | 'sent' | 'blocked'>(getInitialSection);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);

  // ─── Compute Mutual Interests Helper ────────────────
  const getMutualInterests = useCallback((otherInterests?: string[]): string[] => {
    const myInterests = currentUser?.interests || [];
    if (!otherInterests) return [];
    return myInterests.filter(i => otherInterests.includes(i));
  }, [currentUser?.interests]);

  // ─── Generate Friend Activities from Posts ──────────
  const friendActivities = useMemo(() => {
    const activities: { id: string; userId: string; userName: string; userAvatar: string; action: string; timestamp: string }[] = [];
    friendPosts.forEach(post => {
      const authorName = post.author.name;
      const firstName = authorName.split(' ')[0];
      if (post.type === 'ad') {
        activities.push({
          id: `act_ad_${post.id}`,
          userId: post.author.id,
          userName: authorName,
          userAvatar: post.author.avatar || '',
          action: t('friends.postedNewAd', { name: firstName }),
          timestamp: post.timestamp,
        });
      } else if (post.image) {
        activities.push({
          id: `act_img_${post.id}`,
          userId: post.author.id,
          userName: authorName,
          userAvatar: post.author.avatar || '',
          action: t('friends.addedNewPhoto', { name: firstName }),
          timestamp: post.timestamp,
        });
      } else {
        activities.push({
          id: `act_post_${post.id}`,
          userId: post.author.id,
          userName: authorName,
          userAvatar: post.author.avatar || '',
          action: t('friends.postedNewPost', { name: firstName }),
          timestamp: post.timestamp,
        });
      }
    });
    return activities.slice(0, 6);
  }, [friendPosts, t]);

  // Load friends list from API
  const loadFriends = useCallback(async () => {
    setLoadingFriends(true);
    try {
      const friendsList = await api.getFriendsList();
      if (Array.isArray(friendsList) && friendsList.length > 0) {
        const mapped: FriendUser[] = (friendsList as any[]).map((f: any) => {
          // Initialize presence for this friend if not already done
          initializeMockPresence(f.id);
          // Prefer server-reported WebSocket status, then live WS map, then local fallback
          const isOnline = f.isOnline === true || isUserOnlineWs(f.id) || isUserOnline(f.id);
          return {
            id: f.id,
            friendshipId: f.friendshipId || '',
            name: f.name || t('common.user'),
            avatar: f.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.id}`,
            isVerified: f.isVerified || f.is_verified,
            isTrusted: f.isTrusted || f.is_trusted,
            trustScore: f.trustScore || f.trust_score || 50,
            location: f.location || '',
            interests: Array.isArray(f.interests) ? f.interests : [],
            isOnline,
            lastSeen: isOnline ? t('friends.activeNow') : (f.lastSeen || f.last_seen ? formatLastSeen(new Date(f.lastSeen || f.last_seen).getTime()) : formatLastSeen(null)),
            mutualFriends: f.mutualFriends || 0,
            friendSince: f.friendSince || f.friend_since || '',
            friendLabel: f.friendLabel || f.friend_label || 'general',
            recentActivity: '',
          };
        });
        setFriends(mapped);

        // Load friend posts
        try {
          const allPosts = await api.getPosts();
          const rawPosts = (allPosts as any).posts || allPosts || [];
          const friendIds = new Set(mapped.map(f => f.id));
          const friendAdPosts = (Array.isArray(rawPosts) ? rawPosts : [])
            .filter((p: any) => friendIds.has(p.author?.id || p.author_id))
            .slice(0, 10);
          setFriendPosts(friendAdPosts.map((p: any) => ({
            id: p.id,
            author: {
              id: p.author?.id || p.author_id || '',
              name: p.author?.name || '',
              avatar: p.author?.avatar || '',
              isVerified: !!(p.author?.is_verified || p.author?.isVerified),
              isOnline: isUserOnlineWs(p.author?.id || p.author_id || '') || isUserOnline(p.author?.id || p.author_id || ''),
              interests: Array.isArray(p.author?.interests) ? p.author.interests : [],
              trustScore: p.author?.trust_score || p.author?.trustScore || 50,
            },
            content: p.content || '',
            image: p.image || undefined,
            likes: p.likes || 0,
            comments: p.comments || 0,
            shares: p.shares || 0,
            timestamp: p.created_at || p.timestamp || '',
            type: p.type || 'ad',
            price: p.price || undefined,
            currency: p.currency || t('common.currency'),
            location: p.location || undefined,
          })));
        } catch (postErr) {
          console.error('Error loading friend posts:', postErr);
        }
      } else {
        setFriends([]);
        setFriendPosts([]);
      }
    } catch (err) {
      console.error('Error loading friends:', err);
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  }, [t]);

  // Load friend suggestions from API
  const loadSuggestions = useCallback(async () => {
    try {
      const suggestionsList = await api.getFriendSuggestions();
      if (Array.isArray(suggestionsList) && suggestionsList.length > 0) {
        const mapped: FriendUser[] = (suggestionsList as any[]).map((s: any) => {
          initializeMockPresence(s.id);
          const isOnline = s.isOnline === true || isUserOnlineWs(s.id) || isUserOnline(s.id);
          return {
            id: s.id,
            name: s.name || t('common.user'),
            avatar: s.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.id}`,
            isVerified: s.isVerified || s.is_verified,
            isTrusted: s.isTrusted || s.is_trusted,
            trustScore: s.trustScore || s.trust_score || 50,
            location: s.location || '',
            interests: Array.isArray(s.interests) ? s.interests : [],
            isOnline,
            mutualFriends: s.mutualFriends || 0,
          };
        });
        setSuggested(mapped);
      } else {
        setSuggested([]);
      }
    } catch (err) {
      console.error('Error loading suggestions:', err);
      setSuggested([]);
    }
  }, [t]);

  // Load blocked users
  const loadBlockedUsers = useCallback(async () => {
    try {
      const blocked = await api.getBlockedUsers();
      setBlockedUsers(Array.isArray(blocked) ? blocked : []);
    } catch {
      setBlockedUsers([]);
    }
  }, []);

  // Load friends and suggestions on mount + update current user presence
  useEffect(() => {
    if (currentUser?.id) {
      updatePresence(currentUser.id);
    }
    loadFriends();
    loadSuggestions();
    loadBlockedUsers();
    // Load friend stats
    api.getFriendStats().then(setFriendStats).catch(() => {});
  }, [loadFriends, loadSuggestions, loadBlockedUsers, currentUser?.id]);

  // Re-render every 10 seconds so presence badges reflect the latest WebSocket state
  const [, setPresenceTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setPresenceTick(t => t + 1), 10_000);
    return () => clearInterval(interval);
  }, []);

  // Whenever the WebSocket onlineUsers set changes, re-evaluate friend.isOnline flags
  useEffect(() => {
    setFriends(prev => prev.map(f => ({
      ...f,
      isOnline: isUserOnlineWs(f.id) || isUserOnline(f.id),
      lastSeen: (isUserOnlineWs(f.id) || isUserOnline(f.id)) ? t('friends.activeNow') : f.lastSeen,
    })));
    setSuggested(prev => prev.map(s => ({
      ...s,
      isOnline: isUserOnlineWs(s.id) || isUserOnline(s.id),
    })));
    setFriendPosts(prev => prev.map(p => ({
      ...p,
      author: {
        ...p.author,
        isOnline: isUserOnlineWs(p.author.id) || isUserOnline(p.author.id),
      },
    })));
  }, [isUserOnlineWs, t]);

  // Also load friend requests from API
  const [apiFriendRequests, setApiFriendRequests] = useState<any[]>([]);
  const loadFriendRequests = useCallback(async () => {
    try {
      const requests = await api.getFriendRequests();
      if (Array.isArray(requests)) {
        setApiFriendRequests(requests);
      }
    } catch (err) {
      console.error('Error loading friend requests:', err);
    }
  }, []);

  // Load sent friend requests
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const loadSentRequests = useCallback(async () => {
    try {
      const sent = await api.getSentFriendRequests();
      if (Array.isArray(sent)) {
        setSentRequests(sent);
      }
    } catch (err) {
      console.error('Error loading sent requests:', err);
    }
  }, []);

  useEffect(() => {
    loadFriendRequests();
    loadSentRequests();
  }, [loadFriendRequests, loadSentRequests]);

  // Search users via API
  const handleSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const results = await api.searchUsers(query);
      setSearchResults(results as any[]);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // Get current user's location for nearby filter
  const myLocation = currentUser?.location || '';

  const filteredFriends = friends.filter(f => {
    if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filter === 'online') return f.isOnline;
    if (filter === 'nearby') return myLocation && f.location && f.location === myLocation;
    if (filter === 'recent') return true;
    if (labelFilter !== 'all' && (f.friendLabel || 'general') !== labelFilter) return false;
    return true;
  });

  const onlineCount = friends.filter(f => f.isOnline).length;
  const nearbyCount = myLocation ? friends.filter(f => f.location === myLocation).length : 0;

  // Theme colors
  const bg = darkMode ? 'bg-gray-900' : 'bg-[#f8f9fa]';
  const cardBg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100';
  const cardBgHover = darkMode ? 'hover:border-gray-600' : 'hover:border-gray-200';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-300' : 'text-gray-700';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const inputBg = darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 focus:border-orange-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-orange-400';

  // ─── Action Handlers ────────────────────────────────────

  const handleAddFriend = async (userId: string) => {
    setAddingFriendIds(prev => new Set([...prev, userId]));
    try {
      await api.sendFriendRequest(userId);
      setTimeout(() => {
        setSuggested(prev => prev.filter(u => u.id !== userId));
        setAddingFriendIds(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }, 600);
      toast.success(t('friends.friendRequestSent'));
    } catch (err: any) {
      setAddingFriendIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      toast.error(err.message || t('friends.friendRequestFailed'));
    }
  };

  const handleAcceptFriend = async (reqId: string) => {
    try {
      await acceptFriendRequest(reqId);
      setApiFriendRequests(prev => prev.filter(r => r.id !== reqId));
      loadFriends();
    } catch (err: any) {
      toast.error(err.message || t('friends.acceptRequestFailed'));
    }
  };

  const handleRejectFriend = async (reqId: string) => {
    try {
      await rejectFriendRequest(reqId);
      setApiFriendRequests(prev => prev.filter(r => r.id !== reqId));
    } catch (err: any) {
      toast.error(err.message || t('friends.rejectRequestFailed'));
    }
  };

  // FIXED: Use proper unfriend API instead of rejectFriendRequest
  const handleRemoveFriend = async (friendId: string, friendName: string, friendshipId?: string) => {
    setConfirmDialog({
      title: t('friends.removeFriend'),
      message: t('friends.removeFriendConfirm', { name: friendName }),
      confirmLabel: t('friends.removeFriend'),
      confirmColor: 'bg-red-600 hover:bg-red-700',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          // Use friendshipId if available, otherwise fall back to userId
          if (friendshipId) {
            await api.unfriend(friendshipId);
          } else {
            await api.unfriendByUserId(friendId);
          }
          setFriends(prev => prev.filter(f => f.id !== friendId));
          toast.info(t('friends.friendshipRemoved'));
        } catch {
          // Fallback: remove locally if API fails
          setFriends(prev => prev.filter(f => f.id !== friendId));
          toast.info(t('friends.friendshipRemoved'));
        }
      },
    });
  };

  // Block user
  const handleBlockUser = async (userId: string, userName: string) => {
    setConfirmDialog({
      title: t('friends.blockUser'),
      message: t('friends.blockUserConfirm', { name: userName }),
      confirmLabel: t('friends.blockUser'),
      confirmColor: 'bg-red-600 hover:bg-red-700',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.blockUser(userId);
          setFriends(prev => prev.filter(f => f.id !== userId));
          setSuggested(prev => prev.filter(s => s.id !== userId));
          toast.success(t('friends.userBlocked'));
          loadBlockedUsers();
        } catch {
          toast.error(t('friends.userBlockFailed'));
        }
      },
    });
  };

  // Unblock user
  const handleUnblockUser = async (userId: string) => {
    try {
      await api.unblockUser(userId);
      setBlockedUsers(prev => prev.filter(b => b.user?.id !== userId));
      toast.success(t('friends.userUnblocked'));
    } catch {
      toast.error(t('friends.userUnblockFailed'));
    }
  };

  // Set friend label
  const handleSetLabel = async (userId: string, label: FriendLabel) => {
    try {
      await api.setFriendLabel(userId, label);
      setFriends(prev => prev.map(f => f.id === userId ? { ...f, friendLabel: label } : f));
      toast.success(t('friends.labelUpdated'));
    } catch {
      toast.error(t('friends.labelUpdateFailed'));
    }
  };

  const handleCancelSentRequest = async (requestId: string) => {
    setCancellingIds(prev => new Set([...prev, requestId]));
    try {
      await api.cancelSentFriendRequest(requestId);
      setTimeout(() => {
        setSentRequests(prev => prev.filter(r => r.id !== requestId));
        setCancellingIds(prev => {
          const next = new Set(prev);
          next.delete(requestId);
          return next;
        });
      }, 500);
      toast.info(t('friends.requestCancelled'));
    } catch (err: any) {
      setCancellingIds(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
      toast.error(err.message || t('friends.cancelRequestFailed'));
    }
  };

  const handleLikePost = (postId: string) => {
    setFriendPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 } : p
    ));
  };

  const handleSavePost = (postId: string) => {
    toggleSavePost(postId);
    setFriendPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, isSaved: !p.isSaved } : p
    ));
    toast.success(t('friends.postSaved'));
  };

  // ─── Format friend since date ─────────────────────────
  const formatFriendSince = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 1) return t('friends.friendSince', { date: t('common.now') });
      if (diffDays < 30) return t('friends.friendSinceDays', { count: diffDays });
      return t('friends.friendSince', { date: date.toLocaleDateString('ar-EG') });
    } catch {
      return '';
    }
  };

  // ─── Section Tabs ─────────────────────────────
  const allRequests = [...friendRequests, ...apiFriendRequests.map((r: any) => ({
    id: r.id,
    user: r.user || { id: r.user_id, name: r.name || '', avatar: r.avatar || '' },
    timestamp: r.timestamp || r.created_at || '',
  }))];
  // Deduplicate by id
  const uniqueRequests = allRequests.filter((r, i, arr) => arr.findIndex(x => x.id === r.id) === i);

  const sections = [
    { id: 'feed' as const, label: t('friends.sectionLatestNews'), icon: <Sparkles className="w-4 h-4" />, badge: friendPosts.length },
    { id: 'friends' as const, label: t('friends.sectionMyFriends'), icon: <Users className="w-4 h-4" />, badge: friends.length },
    { id: 'requests' as const, label: t('friends.sectionIncoming'), icon: <UserCheck className="w-4 h-4" />, badge: uniqueRequests.length },
    { id: 'sent' as const, label: t('friends.sectionSent'), icon: <SendHorizonal className="w-4 h-4" />, badge: sentRequests.length },
    { id: 'suggestions' as const, label: t('friends.sectionSuggestions'), icon: <UserPlus className="w-4 h-4" />, badge: suggested.length },
    { id: 'blocked' as const, label: t('friends.blockedUsers'), icon: <ShieldOff className="w-4 h-4" />, badge: blockedUsers.length },
  ];

  // ─── Friend Action Menu ─────────────────────────────
  const FriendActionMenu: React.FC<{ friend: FriendUser; onClose: () => void; position: 'top' | 'bottom' }> = ({ friend, onClose, position }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: position === 'top' ? 5 : -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`absolute z-40 ${position === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} right-0 rounded-xl border shadow-xl py-1 min-w-[160px] ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
    >
      <button
        onClick={() => { onClose(); navigate(`/user/${friend.id}`); }}
        className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-bold ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}
      >
        <Eye className="w-3.5 h-3.5" /> {t('friends.viewProfile')}
      </button>
      <button
        onClick={() => { onClose(); sendMessage(friend.id, t('friends.hello')).then(() => navigate('/messages')).catch(() => toast.error(t('friends.messageSendFailed'))); }}
        className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-bold ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}
      >
        <MessageCircle className="w-3.5 h-3.5" /> {t('friends.sendMessage')}
      </button>
      {friend.mutualFriends !== undefined && friend.mutualFriends > 0 && (
        <button
          onClick={() => { onClose(); setMutualModal({ userId: friend.id, userName: friend.name }); }}
          className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-bold ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}
        >
          <Users className="w-3.5 h-3.5" /> {t('friends.viewMutualFriends')}
        </button>
      )}
      <div className={`my-1 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`} />
      <button
        onClick={() => { onClose(); handleRemoveFriend(friend.id, friend.name, friend.friendshipId); }}
        className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-bold ${darkMode ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-red-50 text-red-600'}`}
      >
        <UserMinus className="w-3.5 h-3.5" /> {t('friends.removeFriend')}
      </button>
      <button
        onClick={() => { onClose(); handleBlockUser(friend.id, friend.name); }}
        className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-bold ${darkMode ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-red-50 text-red-600'}`}
      >
        <Ban className="w-3.5 h-3.5" /> {t('friends.blockUser')}
      </button>
    </motion.div>
  );

  // Track open action menu
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);

  return (
    <div className={`max-w-[900px] w-full mx-auto`} dir="rtl">
      {/* ─── Confirm Dialog ───────────────────────── */}
      <AnimatePresence>
        {confirmDialog && (
          <ConfirmDialog
            title={confirmDialog.title}
            message={confirmDialog.message}
            confirmLabel={confirmDialog.confirmLabel}
            confirmColor={confirmDialog.confirmColor}
            darkMode={darkMode}
            onConfirm={confirmDialog.onConfirm}
            onCancel={() => setConfirmDialog(null)}
          />
        )}
      </AnimatePresence>

      {/* ─── Mutual Friends Modal ───────────────────── */}
      <AnimatePresence>
        {mutualModal && (
          <MutualFriendsModal
            userId={mutualModal.userId}
            userName={mutualModal.userName}
            darkMode={darkMode}
            onClose={() => setMutualModal(null)}
          />
        )}
      </AnimatePresence>

      {/* ─── Hero Header ───────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-3xl overflow-hidden mb-6 relative ${cardBg} border`}
      >
        {/* Gradient Banner */}
        <div className="h-36 bg-gradient-to-l from-orange-500 via-rose-500 to-purple-600 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-4 right-8 w-24 h-24 bg-white/20 rounded-full blur-xl" />
            <div className="absolute bottom-2 left-12 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <h1 className="text-2xl font-black mb-1">{t('friends.communityTitle')}</h1>
              <p className="text-white/80 text-xs font-bold">{t('friends.communitySubtitle')}</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
              <span className={`text-xs font-bold ${textMuted}`}>{t('friends.onlineNow', { count: friendStats?.onlineFriends ?? onlineCount })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className={`w-4 h-4 ${textMuted}`} />
              <span className={`text-xs font-bold ${textMuted}`}>{t('friends.friendCount', { count: friendStats?.totalFriends ?? friends.length })}</span>
            </div>
            {(friendStats?.nearbyFriends ?? nearbyCount) > 0 && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-500" />
                <span className={`text-xs font-bold ${textMuted}`}>{t('friends.nearbyFriends')}: {friendStats?.nearbyFriends ?? nearbyCount}</span>
              </div>
            )}
            {(friendStats?.pendingIncoming ?? friendRequests.length) > 0 && (
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveSection('requests')}>
                <UserPlus className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-bold text-orange-600">{t('friends.newRequests', { count: friendStats?.pendingIncoming ?? friendRequests.length })}</span>
              </div>
            )}
            {(friendStats?.pendingSent ?? sentRequests.length) > 0 && (
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveSection('sent')}>
                <SendHorizonal className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-bold text-blue-600">{t('friends.sentCount', { count: friendStats?.pendingSent ?? sentRequests.length })}</span>
              </div>
            )}
            {(friendStats?.friendsThisWeek ?? 0) > 0 && (
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className={`text-xs font-bold text-green-600`}>+{friendStats!.friendsThisWeek} {t('friends.thisWeek')}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { loadFriends(); loadSuggestions(); loadFriendRequests(); loadSentRequests(); loadBlockedUsers(); api.getFriendStats().then(setFriendStats).catch(() => {}); }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
            >
              <RefreshCw className={`w-4 h-4 ${loadingFriends ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar (Expandable) */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-4">
                <div className="relative">
                  <Search className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`} />
                  <input
                    type="text"
                    placeholder={t("friends.searchFriendPlaceholder")}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={`w-full pr-10 pl-4 py-2.5 rounded-xl border text-sm outline-none transition-colors ${inputBg}`}
                    autoFocus
                  />
                  {searching && <div className="absolute left-3 top-1/2 -translate-y-1/2"><div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}
                </div>
                {/* Search Results Dropdown */}
                {searchResults.length > 0 && searchQuery.length >= 2 && (
                  <div className={`mt-2 rounded-xl border overflow-hidden ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} max-h-60 overflow-y-auto`}>
                    {searchResults.map((user: any) => (
                      <button
                        key={user.id}
                        onClick={() => { navigate(`/user/${user.id}`); setSearchQuery(''); setSearchResults([]); }}
                        className={`w-full flex items-center gap-3 p-3 transition-colors text-right ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-50'}`}
                      >
                        <img src={user.avatar} alt="" className="w-10 h-10 rounded-xl object-cover" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-bold truncate ${textPrimary}`}>{user.name}</span>
                            {user.is_verified && <CheckCircle2 className="w-3 h-3 text-orange-600" />}
                          </div>
                          <div className={`text-[10px] ${textMuted}`}>
                            {user.location && <span>{user.location} · </span>}
                            {user.trust_score && <span>{user.trust_score}{t('friends.trust')}</span>}
                            {user.friendshipStatus === 'accepted' && <span className="text-green-600">{t('friends.friendStatus')}</span>}
                            {user.friendshipStatus === 'pending' && <span className="text-yellow-600">{t('friends.pendingStatus')}</span>}
                          </div>
                        </div>
                        {!user.friendshipStatus && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAddFriend(user.id); }}
                            className="p-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─── Section Navigation ────────────────── */}
      <div className={`flex gap-1.5 p-1.5 rounded-2xl mb-6 overflow-x-auto hide-scrollbar ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex-1 min-w-fit flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap ${
              activeSection === section.id
                ? 'bg-gradient-to-l from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-200/30'
                : darkMode
                  ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            {section.icon}
            <span className="hidden sm:inline">{section.label}</span>
            {section.badge > 0 && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                activeSection === section.id
                  ? 'bg-white/20 text-white'
                  : darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'
              }`}>
                {section.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Feed Section ──────────────────────── */}
      <AnimatePresence mode="wait">
        {activeSection === 'feed' && (
          <motion.div
            key="feed"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4"
          >
            {/* Online Friends Strip */}
            <div className={`rounded-2xl border p-4 ${cardBg}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className={`text-xs font-black ${textPrimary}`}>{t('friends.onlineNow', { count: onlineCount })}</span>
                </div>
                <button onClick={() => setActiveSection('friends')} className="text-[10px] font-bold text-orange-600 hover:underline">{t('friends.viewAll')}</button>
              </div>
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
                {friends.filter(f => f.isOnline).map(friend => (
                  <div
                    key={friend.id}
                    className="flex flex-col items-center gap-1.5 min-w-[64px] group relative"
                  >
                    <button
                      onClick={() => navigate(`/user/${friend.id}`)}
                      className="relative"
                    >
                      <img
                        src={friend.avatar}
                        alt={friend.name}
                        className="w-14 h-14 rounded-2xl border-2 border-green-400 group-hover:scale-105 transition-transform object-cover"
                      />
                      <div className="absolute -bottom-0.5 -left-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                      {/* Friend label badge */}
                      {friend.friendLabel && friend.friendLabel !== 'general' && (
                        <div className="absolute -top-1 -right-1">
                          <FriendLabelBadge label={friend.friendLabel} darkMode={darkMode} />
                        </div>
                      )}
                    </button>
                    {/* Quick Message Button */}
                    <motion.button
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        sendMessage(friend.id, t('friends.hello')).then(() => navigate('/messages')).catch(() => toast.error(t('friends.messageSendFailed')));
                      }}
                      className="absolute top-0 left-0 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity border-2 border-white z-10"
                      title={t("friends.sendMessage")}
                    >
                      <Send className="w-3 h-3 text-white" />
                    </motion.button>
                    <span className="text-[10px] font-bold text-gray-600 truncate w-16 text-center">{friend.name.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── Friend Activity Summary ──────────── */}
            {friendActivities.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border p-4 ${cardBg}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-orange-500" />
                    <span className={`text-xs font-black ${textPrimary}`}>{t('friends.latestFriendActivity')}</span>
                  </div>
                  <span className={`text-[9px] font-bold ${textMuted}`}>{t('friends.latestUpdates')}</span>
                </div>
                <div className="space-y-2.5">
                  {friendActivities.map((activity, idx) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      className={`flex items-center gap-2.5 p-2 rounded-xl transition-colors cursor-pointer ${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}
                      onClick={() => navigate(`/user/${activity.userId}`)}
                    >
                      <img src={activity.userAvatar} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'} truncate`}>
                          {activity.action}
                        </p>
                        <p className={`text-[9px] ${textMuted}`}>{activity.timestamp}</p>
                      </div>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${idx === 0 ? 'bg-orange-500' : darkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Friend Posts */}
            {friendPosts.map(post => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border overflow-hidden transition-colors ${cardBg} ${cardBgHover}`}
              >
                {/* Post Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative cursor-pointer" onClick={() => navigate(`/user/${post.author.id}`)}>
                      <img src={post.author.avatar} alt={post.author.name} className="w-11 h-11 rounded-xl hover:opacity-80 transition-opacity" />
                      {post.author.isOnline && (
                        <div className="absolute -bottom-0.5 -left-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <h4 className={`font-bold text-sm cursor-pointer hover:underline ${textPrimary}`} onClick={() => navigate(`/user/${post.author.id}`)}>
                          {post.author.name}
                        </h4>
                        {post.author.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-orange-600 fill-orange-600/10" />}
                        {post.type === 'ad' && (
                          <span className="text-[8px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-md font-black">{t('friends.ad')}</span>
                        )}
                      </div>
                      <div className={`flex items-center gap-1.5 text-[10px] ${textMuted}`}>
                        <span>{formatRelativeTimeAr(post.timestamp)}</span>
                        <span>·</span>
                        <Globe className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                  <button className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors`} onClick={() => toast.info(t('friends.moreOptions'))}>
                    <MoreHorizontal className={`w-4 h-4 ${textMuted}`} />
                  </button>
                </div>

                {/* Post Content */}
                <div className="px-4 pb-3">
                  <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{post.content}</p>
                </div>

                {/* Ad Details */}
                {post.type === 'ad' && post.price && (
                  <div className={`mx-4 mb-3 p-3 rounded-xl border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-lg font-black ${textPrimary}`}>{post.price?.toLocaleString()} {post.currency}</span>
                      {post.location && (
                        <span className={`text-[10px] flex items-center gap-1 ${textMuted}`}>
                          <MapPin className="w-3 h-3 text-orange-500" />{post.location}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        sendMessage(post.author.id, t('friends.interestedInAd'), post.id)
                          .then(() => navigate('/messages'))
                          .catch(() => toast.error(t('friends.messageSendFailed')));
                      }}
                      className="w-full mt-2 bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg text-xs font-bold transition-colors active:scale-[0.98] flex items-center justify-center gap-1.5"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />{t('friends.contactToBuy')}
                    </button>
                  </div>
                )}

                {/* Post Image */}
                {post.image && (
                  <div className={`max-h-[300px] overflow-hidden border-y ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                    <img src={post.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                )}

                {/* Post Stats */}
                <div className={`px-4 py-2.5 flex items-center justify-between text-[11px] ${textMuted}`}>
                  <span className="font-medium">{post.likes} {t('friends.likes')}</span>
                  <div className="flex items-center gap-3">
                    <span>{post.comments} {t('friends.comments')}</span>
                    <span>{post.shares} {t('friends.shares')}</span>
                  </div>
                </div>

                {/* Post Actions */}
                <div className={`mx-3 border-t py-1 flex items-center justify-between mb-1 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                  <button
                    onClick={() => handleLikePost(post.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors text-xs font-bold ${
                      post.isLiked ? 'text-blue-600' : darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-blue-600 text-blue-600' : ''}`} />
                    {t('friends.like')}
                  </button>
                  <button
                    onClick={() => navigate(`/post/${post.id}`)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors text-xs font-bold ${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    {t('friends.comment')}
                  </button>
                  <button
                    onClick={() => openShareModal({ ...post, author: post.author, type: post.type, paymentMethods: [] })}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors text-xs font-bold ${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    <Share2 className="w-4 h-4" />
                    {t('friends.share')}
                  </button>
                  <button
                    onClick={() => handleSavePost(post.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors text-xs font-bold ${
                      post.isSaved ? 'text-orange-600' : darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {post.isSaved ? <BookmarkCheck className="w-4 h-4 fill-orange-600" /> : <Bookmark className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>
            ))}

            {friendPosts.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-12 text-center rounded-2xl border ${cardBg}`}
              >
                <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <Inbox className={`w-10 h-10 ${textMuted} opacity-50`} />
                </div>
                <p className={`font-bold text-lg mb-2 ${textPrimary}`}>{t('friends.noPostsYet')}</p>
                <p className={`text-sm mb-4 ${textMuted}`}>
                  {t('friends.noPostsDesc')}
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setActiveSection('suggestions')}
                    className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {t('friends.addFriends')}
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    {t('friends.explorePlatform')}
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ─── Friends List Section ──────────────── */}
        {activeSection === 'friends' && (
          <motion.div
            key="friends"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            {/* Filter Bar */}
            <div className={`flex items-center justify-between mb-4 p-3 rounded-2xl border ${cardBg}`}>
              <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
                {(['all', 'online', 'nearby', 'recent'] as FriendFilter[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
                      filter === f
                        ? 'bg-orange-600 text-white shadow-sm'
                        : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f === 'all' ? t('friends.filterAll') : f === 'online' ? t('friends.filterOnline') : f === 'nearby' ? t('friends.filterNearby') : t('friends.filterRecent')}
                  </button>
                ))}
                {/* Label filter */}
                <div className="relative">
                  <button
                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                      labelFilter !== 'all'
                        ? 'bg-orange-600 text-white shadow-sm'
                        : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Tag className="w-3 h-3" />
                    {labelFilter !== 'all' ? t(`friends.label${labelFilter.charAt(0).toUpperCase() + labelFilter.slice(1)}`) : t('friends.filterByLabel')}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <AnimatePresence>
                    {showFilterMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className={`absolute top-full mt-1 right-0 rounded-xl border shadow-xl py-1 min-w-[120px] z-30 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                      >
                        <button onClick={() => { setLabelFilter('all'); setShowFilterMenu(false); }} className={`w-full text-right px-3 py-1.5 text-[10px] font-bold ${labelFilter === 'all' ? (darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-600') : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50')}`}>{t('friends.allLabels')}</button>
                        <button onClick={() => { setLabelFilter('close'); setShowFilterMenu(false); }} className={`w-full text-right px-3 py-1.5 text-[10px] font-bold ${labelFilter === 'close' ? (darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-600') : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50')}`}>{t('friends.labelClose')}</button>
                        <button onClick={() => { setLabelFilter('family'); setShowFilterMenu(false); }} className={`w-full text-right px-3 py-1.5 text-[10px] font-bold ${labelFilter === 'family' ? (darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-600') : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50')}`}>{t('friends.labelFamily')}</button>
                        <button onClick={() => { setLabelFilter('work'); setShowFilterMenu(false); }} className={`w-full text-right px-3 py-1.5 text-[10px] font-bold ${labelFilter === 'work' ? (darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-600') : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50')}`}>{t('friends.labelWork')}</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? (darkMode ? 'bg-gray-600 text-orange-400' : 'bg-orange-50 text-orange-600') : (darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-50')}`}
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? (darkMode ? 'bg-gray-600 text-orange-400' : 'bg-orange-50 text-orange-600') : (darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-50')}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredFriends.map((friend, i) => {
                  const mutualInterests = getMutualInterests(friend.interests);
                  return (
                    <motion.div
                      key={friend.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className={`rounded-2xl border overflow-hidden transition-all ${cardBg} ${cardBgHover} group cursor-pointer relative`}
                      onClick={() => navigate(`/user/${friend.id}`)}
                    >
                      {/* Card Top - Gradient + Avatar */}
                      <div className="relative h-20 bg-gradient-to-l from-orange-400 to-rose-500 overflow-hidden">
                        <div className="absolute inset-0 bg-black/10" />
                        {friend.isOnline && (
                          <div className="absolute top-2 right-2 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
                        )}
                        {/* Trust Score Badge on grid card */}
                        {friend.trustScore !== undefined && (
                          <div className="absolute top-2 left-2">
                            <div className={`px-1.5 py-0.5 rounded-md backdrop-blur-sm ${
                              friend.trustScore >= 70 ? 'bg-green-500/80' : friend.trustScore >= 40 ? 'bg-yellow-500/80' : 'bg-red-500/80'
                            }`}>
                              <span className="text-[7px] font-black text-white">{friend.trustScore}%</span>
                            </div>
                          </div>
                        )}
                        {/* Label badge */}
                        {friend.friendLabel && friend.friendLabel !== 'general' && (
                          <div className="absolute bottom-2 left-2">
                            <FriendLabelBadge label={friend.friendLabel} darkMode={darkMode} size="sm" />
                          </div>
                        )}
                      </div>
                      <div className="relative -mt-8 text-center px-3 pb-3">
                        <img
                          src={friend.avatar}
                          alt={friend.name}
                          className="w-14 h-14 rounded-xl border-3 border-white mx-auto mb-2 shadow-lg object-cover"
                        />
                        <h4 className={`font-bold text-xs mb-0.5 ${textPrimary} group-hover:text-orange-600 transition-colors`}>{friend.name}</h4>
                        {friend.isVerified && <CheckCircle2 className="w-3 h-3 text-orange-600 inline-block mr-1" />}
                        <p className={`text-[9px] ${textMuted}`}>
                          {(friend.mutualFriends ?? 0) > 0 ? t('friends.mutualFriendCount', { count: friend.mutualFriends }) : ''}
                          {friend.friendSince ? ` · ${formatFriendSince(friend.friendSince)}` : ''}
                        </p>

                        {/* Trust Score Progress Bar */}
                        {friend.trustScore !== undefined && (
                          <div className="mt-1.5 flex justify-center">
                            <TrustScoreBadge score={friend.trustScore} size="sm" darkMode={darkMode} />
                          </div>
                        )}

                        {/* Mutual Interests */}
                        {mutualInterests.length > 0 && (
                          <div className="mt-1.5 flex justify-center">
                            <MutualInterestsBadges
                              currentInterests={currentUser?.interests}
                              otherInterests={friend.interests}
                              max={2}
                              darkMode={darkMode}
                              showLabel={false}
                            />
                          </div>
                        )}

                        {/* Quick Actions */}
                        <div className="flex gap-1.5 mt-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); sendMessage(friend.id, t('friends.hello')).then(() => navigate('/messages')).catch(() => toast.error(t('friends.messageSendFailed'))); }}
                            className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-colors flex items-center justify-center gap-1 ${
                              darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <MessageCircle className="w-3 h-3" />
                            {t('friends.message')}
                          </button>
                          <div className="relative">
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenActionMenu(openActionMenu === friend.id ? null : friend.id); }}
                              className={`py-1.5 px-2 rounded-lg text-[9px] font-bold transition-colors ${
                                darkMode ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              }`}
                            >
                              <MoreHorizontal className="w-3 h-3" />
                            </button>
                            <AnimatePresence>
                              {openActionMenu === friend.id && (
                                <FriendActionMenu friend={friend} onClose={() => setOpenActionMenu(null)} position="top" />
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="space-y-2">
                {filteredFriends.map((friend, i) => {
                  const mutualInterests = getMutualInterests(friend.interests);
                  return (
                    <motion.div
                      key={friend.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${cardBg} ${cardBgHover} cursor-pointer relative`}
                      onClick={() => navigate(`/user/${friend.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img src={friend.avatar} alt={friend.name} className="w-12 h-12 rounded-xl object-cover" />
                          {friend.isOnline && (
                            <div className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className={`font-bold text-sm ${textPrimary}`}>{friend.name}</h4>
                            {friend.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-orange-600 fill-orange-600/10" />}
                            {friend.friendLabel && friend.friendLabel !== 'general' && (
                              <FriendLabelBadge label={friend.friendLabel} darkMode={darkMode} size="md" onClick={() => { setOpenLabelPicker(openLabelPicker === friend.id ? null : friend.id); }} />
                            )}
                          </div>
                          <div className={`flex items-center gap-2 text-[10px] ${textMuted}`}>
                            {friend.isOnline ? (
                              <span className="text-green-600 font-bold">{t('friends.activeNow')}</span>
                            ) : (
                              <span>{friend.lastSeen || t('friends.offline')}</span>
                            )}
                            <span>·</span>
                            <span>{t('friends.mutualCount', { count: friend.mutualFriends })}</span>
                            {friend.friendSince && <span>· {formatFriendSince(friend.friendSince)}</span>}
                          </div>
                          {friend.location && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <MapPin className="w-2.5 h-2.5 text-orange-500" />
                              <span className={`text-[9px] ${textMuted}`}>{friend.location}</span>
                              {friend.location === myLocation && <span className="text-[8px] text-green-600 font-bold">({t('friends.filterNearby')})</span>}
                            </div>
                          )}
                          {/* Mutual Interests + Trust Score in list view */}
                          <div className="flex items-center gap-3 mt-1">
                            {friend.trustScore !== undefined && (
                              <TrustScoreBadge score={friend.trustScore} size="sm" darkMode={darkMode} />
                            )}
                            {mutualInterests.length > 0 && (
                              <MutualInterestsBadges
                                currentInterests={currentUser?.interests}
                                otherInterests={friend.interests}
                                max={3}
                                darkMode={darkMode}
                                showLabel={true}
                              />
                            )}
                          </div>
                          {/* Label picker */}
                          {openLabelPicker === friend.id && (
                            <div onClick={e => e.stopPropagation()}>
                              <LabelPicker
                                currentLabel={friend.friendLabel || 'general'}
                                darkMode={darkMode}
                                onSelect={(label) => handleSetLabel(friend.id, label)}
                                onClose={() => setOpenLabelPicker(null)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); sendMessage(friend.id, t('friends.hello')).then(() => navigate('/messages')).catch(() => toast.error(t('friends.messageSendFailed'))); }}
                          className={`p-2 rounded-xl transition-colors ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenActionMenu(openActionMenu === friend.id ? null : friend.id); }}
                            className={`p-2 rounded-xl transition-colors ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          <AnimatePresence>
                            {openActionMenu === friend.id && (
                              <FriendActionMenu friend={friend} onClose={() => setOpenActionMenu(null)} position="bottom" />
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {filteredFriends.length === 0 && friends.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-12 text-center rounded-2xl border ${cardBg}`}
              >
                <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <UserX className={`w-10 h-10 ${textMuted} opacity-50`} />
                </div>
                <p className={`font-bold text-lg mb-2 ${textPrimary}`}>{t('friends.noFriendsYet')}</p>
                <p className={`text-sm mb-4 ${textMuted}`}>
                  {t('friends.noFriendsDesc')}
                </p>
                <button
                  onClick={() => setActiveSection('suggestions')}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 mx-auto"
                >
                  <Search className="w-3.5 h-3.5" />
                  {t('friends.searchFriends')}
                </button>
              </motion.div>
            )}

            {filteredFriends.length === 0 && friends.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-12 text-center rounded-2xl border ${cardBg}`}
              >
                <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <Filter className={`w-10 h-10 ${textMuted} opacity-50`} />
                </div>
                <p className={`font-bold text-lg mb-2 ${textPrimary}`}>{t('friends.noMatchingResults')}</p>
                <p className={`text-sm mb-4 ${textMuted}`}>
                  {t('friends.noMatchingDesc')}
                </p>
                <button
                  onClick={() => { setFilter('all'); setLabelFilter('all'); }}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 mx-auto ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  <Users className="w-3.5 h-3.5" />
                  {t('friends.viewAll')}
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ─── Suggestions Section ──────────────── */}
        {activeSection === 'suggestions' && (
          <motion.div
            key="suggestions"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4"
          >
            {/* AI Suggestion Banner */}
            <div className={`rounded-2xl p-4 border ${darkMode ? 'bg-purple-900/20 border-purple-800/50' : 'bg-purple-50 border-purple-100'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <span className={`text-sm font-black ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>{t('friends.smartSuggestions')}</span>
              </div>
              <p className={`text-xs ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                {t('friends.smartSuggestionsDesc')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {suggested.map((user, i) => {
                const mutualInterests = getMutualInterests(user.interests);
                const isAdding = addingFriendIds.has(user.id);
                return (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, scale: isAdding ? 0.95 : 1 }}
                    transition={{ delay: i * 0.08 }}
                    className={`rounded-2xl border p-4 transition-all ${cardBg} ${cardBgHover} relative overflow-hidden`}
                  >
                    {/* Confirmation Animation Overlay */}
                    <AnimatePresence>
                      {isAdding && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-orange-600/10 backdrop-blur-[1px] z-10 flex items-center justify-center"
                        >
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="bg-orange-600 text-white rounded-full p-3 shadow-lg"
                          >
                            <Check className="w-6 h-6" />
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex items-start gap-3">
                      <div className="relative flex-shrink-0">
                        <img src={user.avatar} alt={user.name} className="w-14 h-14 rounded-xl object-cover" />
                        {user.isOnline && (
                          <div className="absolute -bottom-0.5 -left-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <h4 className={`font-bold text-sm ${textPrimary}`}>{user.name}</h4>
                          {user.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-orange-600 fill-orange-600/10" />}
                        </div>
                        <p className={`text-[10px] ${textMuted} mb-1`}>{t('friends.mutualFriendCount', { count: user.mutualFriends })}</p>

                        {/* Location */}
                        {user.location && (
                          <div className="flex items-center gap-1 mb-1">
                            <MapPin className="w-3 h-3 text-orange-500 flex-shrink-0" />
                            <span className={`text-[9px] ${textMuted}`}>{user.location}</span>
                            {user.location === myLocation && <span className="text-[8px] text-green-600 font-bold">({t('friends.filterNearby')})</span>}
                          </div>
                        )}

                        {/* Trust Score Indicator */}
                        {user.trustScore !== undefined && (
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Shield className={`w-3 h-3 ${user.trustScore >= 70 ? 'text-green-500' : user.trustScore >= 40 ? 'text-yellow-500' : 'text-red-500'}`} />
                            <TrustScoreBadge score={user.trustScore} size="sm" darkMode={darkMode} />
                          </div>
                        )}

                        {/* Mutual Interests with count */}
                        {mutualInterests.length > 0 && (
                          <div className="mb-1">
                            <div className="flex items-center gap-1 mb-1">
                              <Handshake className="w-3 h-3 text-orange-500 flex-shrink-0" />
                              <span className={`text-[9px] font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                {t('friends.mutualInterestCount', { count: mutualInterests.length })}
                              </span>
                            </div>
                            <MutualInterestsBadges
                              currentInterests={currentUser?.interests}
                              otherInterests={user.interests}
                              max={3}
                              darkMode={darkMode}
                              showLabel={false}
                            />
                          </div>
                        )}

                        {/* Other interests (non-mutual) */}
                        {user.interests && user.interests.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {user.interests.filter(int => !mutualInterests.includes(int)).slice(0, 2).map(int => (
                              <span key={int} className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                {t(INTEREST_MAP[int] || int)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAddFriend(user.id)}
                        disabled={isAdding}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isAdding
                            ? 'bg-green-600 text-white cursor-default'
                            : 'bg-orange-600 hover:bg-orange-700 text-white active:scale-[0.98]'
                        }`}
                      >
                        {isAdding ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            {t('friends.sent')}
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            {t('friends.addAsFriend')}
                          </>
                        )}
                      </motion.button>
                      <button
                        onClick={() => navigate(`/user/${user.id}`)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        {t('friends.view')}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {suggested.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-12 text-center rounded-2xl border ${cardBg}`}
              >
                <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <Compass className={`w-10 h-10 ${textMuted} opacity-50`} />
                </div>
                <p className={`font-bold text-lg mb-2 ${textPrimary}`}>{t('friends.noSuggestionsYet')}</p>
                <p className={`text-sm mb-4 ${textMuted}`}>
                  {t('friends.noSuggestionsDesc')}
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => navigate('/profile')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    <Star className="w-3.5 h-3.5" />
                    {t('friends.updateInterests')}
                  </button>
                  <button
                    onClick={() => setActiveSection('friends')}
                    className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5" />
                    {t('friends.myFriends')}
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ─── Friend Requests Section ──────────── */}
        {activeSection === 'requests' && (
          <motion.div
            key="requests"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-3"
          >
            {uniqueRequests.length > 0 ? (
              uniqueRequests.map((req, i) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`rounded-2xl border p-4 transition-all ${cardBg}`}
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={req.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.user.id}`}
                      alt={req.user.name}
                      className="w-16 h-16 rounded-xl object-cover cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => navigate(`/user/${req.user.id}`)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className={`font-bold text-sm ${textPrimary}`}>{req.user.name}</h4>
                        {req.user.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />}
                      </div>
                      <p className={`text-[10px] ${textMuted} mb-2`}>
                        <Clock className="w-3 h-3 inline ml-1" />
                        {req.timestamp || t('friends.recently')}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptFriend(req.id)}
                          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-xl text-xs font-bold transition-colors active:scale-[0.98] flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {t('friends.confirm')}
                        </button>
                        <button
                          onClick={() => handleRejectFriend(req.id)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 ${
                            darkMode ? 'bg-gray-700 text-gray-300 hover:bg-red-900/30 hover:text-red-400' : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500'
                          }`}
                        >
                          <X className="w-3.5 h-3.5" />
                          {t('friends.reject')}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-12 text-center rounded-2xl border ${cardBg}`}
              >
                <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <UserCheck className={`w-10 h-10 ${textMuted} opacity-50`} />
                </div>
                <p className={`font-bold text-lg mb-2 ${textPrimary}`}>{t('friends.noFriendRequests')}</p>
                <p className={`text-sm mb-4 ${textMuted}`}>
                  {t('friends.noFriendRequestsDesc')}
                </p>
                <button
                  onClick={() => setActiveSection('suggestions')}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 mx-auto"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {t('friends.discoverNewFriends')}
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ─── Sent Friend Requests Section ──────────── */}
        {activeSection === 'sent' && (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-3"
          >
            {/* Info banner */}
            <div className={`rounded-2xl p-4 border ${darkMode ? 'bg-blue-900/20 border-blue-800/50' : 'bg-blue-50 border-blue-100'}`}>
              <div className="flex items-center gap-2 mb-2">
                <SendHorizonal className="w-5 h-5 text-blue-600" />
                <span className={`text-sm font-black ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{t('friends.sentRequests')}</span>
              </div>
              <p className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                {t('friends.sentRequestsDesc')}
              </p>
            </div>

            {sentRequests.length > 0 ? (
              sentRequests.map((req, i) => {
                const isCancelling = cancellingIds.has(req.id);
                return (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0, scale: isCancelling ? 0.95 : 1 }}
                    transition={{ delay: i * 0.08 }}
                    className={`rounded-2xl border p-4 transition-all ${cardBg}`}
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={req.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.user?.id}`}
                        alt={req.user?.name}
                        className="w-14 h-14 rounded-xl object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => navigate(`/user/${req.user?.id}`)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className={`font-bold text-sm ${textPrimary}`}>{req.user?.name}</h4>
                          {req.user?.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />}
                        </div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Clock className={`w-3 h-3 ${textMuted}`} />
                          <span className={`text-[10px] ${textMuted}`}>{req.timestamp || t('friends.recently')}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                            darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                          }`}>{t('friends.pendingStatus')}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/user/${req.user?.id}`)}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 ${
                              darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {t('friends.viewProfile')}
                          </button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleCancelSentRequest(req.id)}
                            disabled={isCancelling}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                              isCancelling
                                ? 'bg-gray-400 text-white cursor-default'
                                : darkMode
                                  ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                                  : 'bg-red-50 text-red-600 hover:bg-red-100'
                            }`}
                          >
                            {isCancelling ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                {t('friends.cancelled')}
                              </>
                            ) : (
                              <>
                                <Ban className="w-3.5 h-3.5" />
                                {t('friends.cancelRequest')}
                              </>
                            )}
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-12 text-center rounded-2xl border ${cardBg}`}
              >
                <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <SendHorizonal className={`w-10 h-10 ${textMuted} opacity-50`} />
                </div>
                <p className={`font-bold text-lg mb-2 ${textPrimary}`}>{t('friends.noSentRequests')}</p>
                <p className={`text-sm mb-4 ${textMuted}`}>
                  {t('friends.noSentRequestsDesc')}
                </p>
                <button
                  onClick={() => setActiveSection('suggestions')}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 mx-auto"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {t('friends.discoverNewFriends')}
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ─── Blocked Users Section ──────────── */}
        {activeSection === 'blocked' && (
          <motion.div
            key="blocked"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-3"
          >
            {/* Info banner */}
            <div className={`rounded-2xl p-4 border ${darkMode ? 'bg-red-900/20 border-red-800/50' : 'bg-red-50 border-red-100'}`}>
              <div className="flex items-center gap-2 mb-2">
                <ShieldOff className="w-5 h-5 text-red-600" />
                <span className={`text-sm font-black ${darkMode ? 'text-red-300' : 'text-red-700'}`}>{t('friends.blockedUsers')}</span>
              </div>
              <p className={`text-xs ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                {t('friends.noBlockedUsersDesc')}
              </p>
            </div>

            {blockedUsers.length > 0 ? (
              blockedUsers.map((block: any, i: number) => (
                <motion.div
                  key={block.blockId || block.user?.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`rounded-2xl border p-4 transition-all ${cardBg}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={block.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${block.user?.id}`}
                        alt={block.user?.name}
                        className="w-12 h-12 rounded-xl object-cover grayscale opacity-70"
                      />
                      <div>
                        <h4 className={`font-bold text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{block.user?.name}</h4>
                        {block.blockedAt && (
                          <p className={`text-[10px] ${textMuted}`}>
                            {t('friends.blockedOn', { date: new Date(block.blockedAt).toLocaleDateString('ar-EG') })}
                          </p>
                        )}
                        {block.reason && (
                          <p className={`text-[9px] ${textMuted} mt-0.5`}>{block.reason}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnblockUser(block.user?.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                        darkMode ? 'bg-gray-700 text-gray-300 hover:bg-green-900/30 hover:text-green-400' : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600'
                      }`}
                    >
                      <ShieldOff className="w-3.5 h-3.5 inline ml-1" />
                      {t('friends.unblockUser')}
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-12 text-center rounded-2xl border ${cardBg}`}
              >
                <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <ShieldOff className={`w-10 h-10 ${textMuted} opacity-50`} />
                </div>
                <p className={`font-bold text-lg mb-2 ${textPrimary}`}>{t('friends.noBlockedUsers')}</p>
                <p className={`text-sm mb-4 ${textMuted}`}>
                  {t('friends.noBlockedUsersDesc')}
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
