import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import {
  PenLine, Sparkles, Shield, MapPin, Heart, Send,
  Bookmark, BookmarkCheck, MessageCircle, Share2, ShoppingBag,
  Hexagon, Zap, Clock, Crown, TrendingUp, CheckCircle2,
  Image, Plus, ChevronLeft, Globe, Wallet, Eye, Megaphone, BarChart3,
  XCircle, AlertCircle, Camera, Store, Edit3, Star, Package, RefreshCw,
  Users, UserPlus, UserCheck, Search, UserX,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { isUserOnline } from '../utils/presence';
import { PromotionWizard } from './PromotionWizard';
import { promotionPackages } from '../data/promotionPackages';
import { Post } from '../types';

interface ActivityItem {
  id: string;
  type: string;
  text: string;
  time: string;
  icon: React.ReactNode;
  color: string;
}

interface MarketListingData {
  id: string;
  title: string;
  description: string;
  images: string[];
  price?: number;
  currency?: string;
  category: string;
  condition: string;
  city?: string;
  is_promoted?: boolean;
  promotion_status?: string;
  views_count?: number;
  saves_count?: number;
  created_at?: string;
}

type MyPageTab = 'posts' | 'promotions' | 'market' | 'activity' | 'friends';
type FriendsSection = 'list' | 'requests' | 'suggestions';

// Condition labels are now handled via i18n keys:
// common.newCondition, common.used, common.refurbished

export const MyPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { dir } = useLanguage();
  const { darkMode, posts, savedPosts, toggleSavePost, openShareModal, sendMessage, addPost, acceptFriendRequest, rejectFriendRequest } = useAppContext();
  const { currentUser, updateProfile } = useAuth();

  const [postText, setPostText] = useState('');
  const [activeTab, setActiveTab] = useState<MyPageTab>('posts');
  const [promotingPost, setPromotingPost] = useState<Post | null>(null);
  const [myPromotionRequests, setMyPromotionRequests] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [postLocation, setPostLocation] = useState('');
  const [postType, setPostType] = useState<'ad' | 'status'>('status');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Market Listings state
  const [myMarketListings, setMyMarketListings] = useState<MarketListingData[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);

  // Wallet transactions for activity
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);

  // Friends state
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [friendSuggestions, setFriendSuggestions] = useState<any[]>([]);
  const [friendsSearchQuery, setFriendsSearchQuery] = useState('');
  const [activeFriendsSection, setActiveFriendsSection] = useState<FriendsSection>('list');
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  // Get current user's posts
  const myPosts = posts.filter(p => currentUser && p.author.id === currentUser.id);
  const mySavedPosts = posts.filter(p => savedPosts.includes(p.id));

  // Promoted posts - posts with active or pending promotions
  const myPromotedPosts = useMemo(() => myPosts.filter(p => p.isPromoted || p.promotionStatus === 'pending' || p.promotionStatus === 'approved'), [myPosts]);
  const myNonPromotedPosts = useMemo(() => myPosts.filter(p => !p.isPromoted && p.promotionStatus !== 'pending' && p.promotionStatus !== 'approved'), [myPosts]);

  // Load promotion requests
  const loadPromotionRequests = useCallback(async () => {
    try {
      const requests = await api.getMyPromotionRequests();
      if (Array.isArray(requests)) setMyPromotionRequests(requests);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadPromotionRequests(); }, [loadPromotionRequests]);

  // Load market listings
  const loadMarketListings = useCallback(async () => {
    setLoadingListings(true);
    try {
      const data = await api.getMyMarketListings();
      if (Array.isArray(data)) setMyMarketListings(data);
    } catch { /* ignore */ }
    finally { setLoadingListings(false); }
  }, []);

  useEffect(() => { loadMarketListings(); }, [loadMarketListings]);

  // Load wallet transactions for activity tab
  const loadWalletTransactions = useCallback(async () => {
    try {
      const data = await api.getTransactions();
      if (Array.isArray(data)) setWalletTransactions(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadWalletTransactions(); }, [loadWalletTransactions]);

  // Load friends data
  const loadFriendsData = useCallback(async () => {
    setLoadingFriends(true);
    try {
      const [fList, fRequests, fSuggestions] = await Promise.all([
        api.getFriendsList().catch(() => []),
        api.getFriendRequests().catch(() => []),
        api.getFriendSuggestions().catch(() => []),
      ]);
      if (Array.isArray(fList)) setFriendsList(fList);
      if (Array.isArray(fRequests)) setFriendRequests(fRequests);
      if (Array.isArray(fSuggestions)) setFriendSuggestions(fSuggestions);
    } catch { /* ignore */ }
    finally { setLoadingFriends(false); }
  }, []);

  useEffect(() => { loadFriendsData(); }, [loadFriendsData]);

  const handleAcceptFriendRequest = useCallback(async (id: string) => {
    try {
      // Use AppContext's acceptFriendRequest which handles the API call + state update + toast
      await acceptFriendRequest(id);
      loadFriendsData();
    } catch {
      toast.error(t('friends.requestAcceptFailed'));
    }
  }, [loadFriendsData, acceptFriendRequest, t]);

  const handleRejectFriendRequest = useCallback(async (id: string) => {
    try {
      // Use AppContext's rejectFriendRequest which handles the API call + state update
      await rejectFriendRequest(id);
      loadFriendsData();
    } catch {
      toast.error(t('friends.requestRejectFailed'));
    }
  }, [loadFriendsData, rejectFriendRequest, t]);

  const handleSendFriendRequest = useCallback(async (userId: string) => {
    try {
      setSentRequests(prev => new Set(prev).add(userId));
      await api.sendFriendRequest(userId);
      toast.success(t('friends.requestSent'));
    } catch {
      setSentRequests(prev => { const next = new Set(prev); next.delete(userId); return next; });
      toast.error(t('friends.requestSendFailed'));
    }
  }, []);

  // Filtered friends based on search
  const filteredFriends = useMemo(() => {
    if (!friendsSearchQuery.trim()) return friendsList;
    const q = friendsSearchQuery.toLowerCase();
    return friendsList.filter((f: any) =>
      (f.name || f.username || '').toLowerCase().includes(q)
    );
  }, [friendsList, friendsSearchQuery]);

  // Activity data - generated from real user posts, promotions, wallet transactions
  const recentActivity: ActivityItem[] = useMemo(() => {
    const activities: ActivityItem[] = [];

    // From posts
    myPosts.slice(0, 4).forEach((post) => {
      activities.push({
        id: `act_post_${post.id}`,
        type: post.type === 'ad' ? 'post' : 'post',
        text: post.type === 'ad'
          ? t('myPage.ad') + ': ' + post.content.slice(0, 50) + (post.content.length > 50 ? '...' : '')
          : t('myPage.post') + ': ' + post.content.slice(0, 50) + (post.content.length > 50 ? '...' : ''),
        time: post.timestamp,
        icon: post.type === 'ad' ? <ShoppingBag className="w-4 h-4" /> : <PenLine className="w-4 h-4" />,
        color: 'orange',
      });
    });

    // From promotion requests
    myPromotionRequests.slice(0, 3).forEach((req: any) => {
      activities.push({
        id: `act_promo_${req.id}`,
        type: 'promotion',
        text: t('myPage.promotePost') + (req.post_title ? ': ' + req.post_title.slice(0, 40) : ''),
        time: req.created_at || '',
        icon: <Megaphone className="w-4 h-4" />,
        color: 'green',
      });
    });

    // From wallet transactions
    walletTransactions.slice(0, 3).forEach((tx: any) => {
      const isDeposit = tx.type === 'deposit' || tx.type === 'topup';
      activities.push({
        id: `act_wallet_${tx.id}`,
        type: isDeposit ? 'wallet_deposit' : 'wallet_spend',
        text: isDeposit
          ? t('myPage.walletBalance') + ': +' + (tx.amount?.toLocaleString() || 0)
          : t('myPage.walletBalance') + ': -' + (tx.amount?.toLocaleString() || 0),
        time: tx.created_at || '',
        icon: <Wallet className="w-4 h-4" />,
        color: isDeposit ? 'green' : 'red',
      });
    });

    return activities;
  }, [myPosts, myPromotionRequests, walletTransactions, t]);



  // Theme variables
  const bg = darkMode ? 'bg-gray-900' : 'bg-[#f8f9fa]';
  const cardBg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100';
  const cardBgHover = darkMode ? 'hover:border-gray-600' : 'hover:border-gray-200';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-300' : 'text-gray-700';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const inputBg = darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 focus:border-orange-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-orange-400';

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error(t('myPage.selectImage')); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      updateProfile({ coverPhoto: dataUrl } as any);
      toast.success(t('myPage.changeCover'));
    };
    reader.readAsDataURL(file);
  };

  const handleCreatePost = async () => {
    if (!postText.trim()) return;
    const newPost = {
      id: `mypost_${Date.now()}`,
      author: {
        id: currentUser?.id || 'me',
        name: currentUser?.name || t('myPage.editProfile'),
        avatar: currentUser?.avatarBase64 || currentUser?.avatar || '',
        isVerified: currentUser?.isVerified,
        trustScore: currentUser?.trustScore,
        interests: currentUser?.interests,
      },
      content: postText.trim(),
      image: selectedImage || undefined,
      location: postLocation || undefined,
      likes: 0,
      comments: 0,
      shares: 0,
      timestamp: new Date().toISOString(),
      type: postType as 'ad' | 'status',
    };
    addPost(newPost);
    // Also create the post on the server
    try {
      await api.createPost({
        content: postText.trim(),
        image: selectedImage || undefined,
        location: postLocation || undefined,
        type: postType,
      });
    } catch {
      // Post was added locally even if API call fails
    }
    setPostText('');
    setSelectedImage(null);
    setPostLocation('');
    setPostType('status');
    setShowLocationInput(false);
    toast.success(t('myPage.publish'));
  };

  const handleLike = (postId: string) => {
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  // Helper for activity icon colors
  const getActivityColorClasses = (color: string) => {
    switch (color) {
      case 'orange':
        return darkMode ? 'bg-orange-900/50 text-orange-400' : 'bg-orange-100 text-orange-600';
      case 'green':
        return darkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-600';
      case 'red':
        return darkMode ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-600';
      case 'purple':
        return darkMode ? 'bg-purple-900/50 text-purple-400' : 'bg-purple-100 text-purple-600';
      default:
        return darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="max-w-[900px] w-full mx-auto space-y-5" dir={dir}>
      {/* Hidden file inputs */}
      <input ref={coverInputRef} type="file" accept="image/*,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.tiff,.avif,.heic,.heif,.ico,.jfif" className="hidden" onChange={handleCoverChange} />

      {/* ─── Hero Section - Digital Space Concept ─────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl"
      >
        {/* Cover Photo / Gradient Background */}
        <div className="relative h-52 sm:h-64">
          {currentUser?.coverPhoto ? (
            <img src={currentUser.coverPhoto} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-rose-500 to-purple-600" />
          )}
          {/* Animated geometric pattern overlay */}
          <div className="absolute inset-0 opacity-15">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="arabic-pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M30 0L60 30L30 60L0 30Z" fill="none" stroke="white" strokeWidth="1" />
                  <circle cx="30" cy="30" r="8" fill="none" stroke="white" strokeWidth="0.5" />
                  <path d="M30 22L38 30L30 38L22 30Z" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#arabic-pattern)" />
            </svg>
          </div>
          {/* Floating orbs */}
          <div className="absolute top-8 right-16 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse" />
          <div className="absolute bottom-8 left-20 w-28 h-28 bg-white/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-yellow-300/10 rounded-full blur-lg animate-pulse" style={{ animationDelay: '2s' }} />

          {/* Cover photo edit button */}
          <button
            onClick={() => coverInputRef.current?.click()}
            className={`absolute top-3 left-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 z-10 ${darkMode ? 'bg-gray-800/80 text-gray-200 hover:bg-gray-700' : 'bg-white/90 text-gray-700 hover:bg-white'} backdrop-blur-md shadow-lg`}
          >
            <Camera className="w-3.5 h-3.5" />
            {t('myPage.changeCover')}
          </button>

          {/* Edit Profile button */}
          <button
            onClick={() => navigate('/profile')}
            className={`absolute top-3 right-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 z-10 ${darkMode ? 'bg-gray-800/80 text-gray-200 hover:bg-gray-700' : 'bg-white/90 text-gray-700 hover:bg-white'} backdrop-blur-md shadow-lg`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            {t('myPage.editProfile')}
          </button>

          {/* User Info Overlay */}
          <div className="absolute inset-0 flex items-end">
            <div className="w-full px-6 pb-6 flex items-end gap-5">
              {/* Hexagonal Avatar */}
              <div className="relative group -mb-10 z-10">
                <div className="relative">
                  {/* Status Ring */}
                  <svg width="100" height="100" viewBox="0 0 100 100" className="absolute -top-2 -right-2 z-0">
                    <polygon
                      points="50,2 93,27 93,73 50,98 7,73 7,27"
                      fill="none"
                      stroke={currentUser?.isTrusted ? '#22c55e' : '#f97316'}
                      strokeWidth="3"
                      strokeDasharray="6 3"
                      className="animate-spin"
                      style={{ animationDuration: '20s' }}
                    />
                  </svg>
                  {/* Hexagonal clip */}
                  <div className="relative w-[88px] h-[88px]">
                    <svg width="88" height="88" viewBox="0 0 88 88" className="absolute inset-0">
                      <defs>
                        <clipPath id="hex-clip">
                          <polygon points="44,4 82,24 82,64 44,84 6,64 6,24" />
                        </clipPath>
                      </defs>
                      <image
                        href={currentUser?.avatarBase64 || currentUser?.avatar || ''}
                        x="0" y="0" width="88" height="88"
                        clipPath="url(#hex-clip)"
                        preserveAspectRatio="xMidYMid slice"
                      />
                      <polygon
                        points="44,4 82,24 82,64 44,84 6,64 6,24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                      />
                    </svg>
                  </div>
                  {/* Online indicator */}
                  <div className="absolute bottom-1 left-1 w-5 h-5 bg-green-500 rounded-full border-3 border-white shadow-lg" />
                </div>
              </div>
              {/* Name & Info */}
              <div className="flex-1 pb-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-black text-white drop-shadow-lg">{currentUser?.name || t('myPage.editProfile')}</h1>
                  {currentUser?.isVerified && <CheckCircle2 className="w-5 h-5 text-white fill-white/30" />}
                  {currentUser?.isAdmin && <Crown className="w-5 h-5 text-yellow-300" />}
                </div>
                <p className="text-white/80 text-sm font-bold">@{currentUser?.name?.replace(/\s/g, '_') || 'user'} · {currentUser?.trustScore || 50}% {t('myPage.trustLevel')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className={`px-6 pt-14 pb-4 border-t-0 rounded-b-3xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <span className={`text-lg font-black ${textPrimary}`}>{myPosts.length}</span>
                <span className={`text-[10px] block font-bold ${textMuted}`}>{t('myPage.postsCount')}</span>
              </div>
              <div className="text-center">
                <span className={`text-lg font-black ${textPrimary}`}>{myPromotedPosts.length}</span>
                <span className={`text-[10px] block font-bold ${textMuted}`}>{t('myPage.promotions')}</span>
              </div>
              <div className="text-center">
                <span className={`text-lg font-black ${textPrimary}`}>{currentUser?.walletBalance?.toLocaleString() || 0}</span>
                <span className={`text-[10px] block font-bold ${textMuted}`}>{t('myPage.balance')}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentUser?.interests && currentUser.interests.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap justify-end">
                  {currentUser.interests.slice(0, 3).map(interest => (
                    <span key={interest} className={`text-[9px] px-2 py-1 rounded-full font-bold ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-orange-50 text-orange-700'}`}>
                      {interest === 'phones' ? '📱' : interest === 'cars' ? '🚗' : interest === 'electronics' ? '💻' : interest === 'realEstate' ? '🏠' : interest === 'games' ? '🎮' : interest === 'fashion' ? '👕' : interest === 'services' ? '🛎️' : interest === 'books' ? '📚' : interest === 'sports' ? '⚽' : interest === 'animals' ? '🐾' : interest === 'jobs' ? '💼' : '📦'} {t(`interests.${interest}`)}
                    </span>
                  ))}
                </div>
              )}
              <Shield className={`w-4 h-4 ${currentUser?.isTrusted ? 'text-green-500' : 'text-gray-400'}`} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Personal Posting Area ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`rounded-2xl border p-5 ${cardBg}`}
      >
        <div className="flex items-start gap-3">
          <img
            src={currentUser?.avatarBase64 || currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.id || 'default'}`}
            alt={currentUser?.name || ''}
            className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
          />
          <div className="flex-1">
            {/* Post type indicator */}
            {postType === 'ad' && (
              <div className="flex items-center gap-1.5 mb-2">
                <ShoppingBag className="w-3.5 h-3.5 text-orange-500" />
                <span className={`text-[10px] font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>{t('myPage.ad')}</span>
              </div>
            )}
            <textarea
              value={postText}
              onChange={e => setPostText(e.target.value)}
              placeholder={postType === 'ad' ? t('myPage.writeAdDetails') : t('myPage.shareOnPage')}
              className={`w-full resize-none border rounded-xl px-4 py-3 text-sm outline-none transition-colors min-h-[80px] ${inputBg}`}
              rows={3}
            />
            {/* Image preview */}
            {selectedImage && (
              <div className="relative mt-2 rounded-xl overflow-hidden">
                <img src={selectedImage} alt="Selected" className="w-full max-h-[200px] object-cover rounded-xl" />
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  ×
                </button>
              </div>
            )}
            {/* Location input */}
            {showLocationInput && (
              <div className="mt-2 flex items-center gap-2">
                <MapPin className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <input
                  type="text"
                  value={postLocation}
                  onChange={e => setPostLocation(e.target.value)}
                  placeholder={t('myPage.addLocation')}
                  className={`flex-1 border rounded-lg px-3 py-1.5 text-sm outline-none transition-colors ${inputBg}`}
                />
                {postLocation && (
                  <button
                    onClick={() => { setPostLocation(''); setShowLocationInput(false); }}
                    className={`p-1 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                  >
                    ×
                  </button>
                )}
              </div>
            )}
            {/* Hidden file input for image upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.tiff,.avif,.heic,.heif,.ico,.jfif"
              onChange={handleImageSelect}
              className="hidden"
            />
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2 rounded-lg transition-colors ${selectedImage ? (darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-600') : (darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500')}`}
                >
                  <Image className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowLocationInput(!showLocationInput)}
                  className={`p-2 rounded-lg transition-colors ${postLocation ? (darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-600') : (darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500')}`}
                >
                  <MapPin className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPostType(postType === 'ad' ? 'status' : 'ad')}
                  className={`p-2 rounded-lg transition-colors ${postType === 'ad' ? (darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-600') : (darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500')}`}
                >
                  <ShoppingBag className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={handleCreatePost}
                disabled={!postText.trim()}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center gap-2 ${
                  postText.trim()
                    ? 'bg-gradient-to-l from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-200/30 hover:from-orange-600 hover:to-orange-700'
                    : darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
                {t('myPage.publish')}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Tab Navigation ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className={`flex gap-1 p-1.5 rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
      >
        {[
          { id: 'posts' as MyPageTab, label: t('myPage.posts'), icon: <PenLine className="w-4 h-4" /> },
          { id: 'promotions' as MyPageTab, label: t('myPage.promotions'), icon: <Megaphone className="w-4 h-4" />, badge: myPromotedPosts.length },
          { id: 'market' as MyPageTab, label: t('myPage.marketListings'), icon: <Store className="w-4 h-4" />, badge: myMarketListings.length },
          { id: 'activity' as MyPageTab, label: t('myPage.activity'), icon: <Zap className="w-4 h-4" /> },
          { id: 'friends' as MyPageTab, label: t('myPage.friends'), icon: <Users className="w-4 h-4" />, badge: friendRequests.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-l from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-200/30'
                : darkMode
                  ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {'badge' in tab && (tab.badge ?? 0) > 0 && (
              <span className="bg-red-500 text-white text-[8px] font-black min-w-[16px] h-4 flex items-center justify-center rounded-full px-1">{tab.badge}</span>
            )}
          </button>
        ))}
      </motion.div>

      {/* ─── Tab Content ──────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {/* ── Posts Tab ── */}
        {activeTab === 'posts' && (
          <motion.div
            key="posts"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4"
          >
            {myPosts.length > 0 ? myPosts.map(post => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border overflow-hidden transition-colors ${cardBg} ${cardBgHover}`}
              >
                {/* Post Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={currentUser?.avatarBase64 || currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.id || 'default'}`} alt="" className="w-10 h-10 rounded-xl" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className={`font-bold text-sm ${textPrimary}`}>{currentUser?.name}</h4>
                        {currentUser?.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-orange-600 fill-orange-600/10" />}
                      </div>
                      <div className={`flex items-center gap-1.5 text-[10px] ${textMuted}`}>
                        <span>{post.timestamp}</span>
                        <span>·</span>
                        <Globe className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                  {post.type === 'ad' && (
                    <span className="text-[9px] bg-orange-100 text-orange-700 px-2 py-1 rounded-lg font-black">{t('myPage.ad')}</span>
                  )}
                </div>

                {/* Content */}
                <div className="px-4 pb-3">
                  <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{post.content}</p>
                </div>

                {/* Image */}
                {post.image && (
                  <div className={`border-y ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                    <img src={post.image} alt="" className="w-full max-h-[300px] object-cover" loading="lazy" />
                  </div>
                )}

                {/* Price for ads */}
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
                  </div>
                )}

                {/* Stats */}
                <div className={`px-4 py-2 flex items-center justify-between text-[11px] ${textMuted}`}>
                  <span className="font-medium">{post.likes + (likedPosts.has(post.id) ? 1 : 0)} {t('myPage.like')}</span>
                  <div className="flex items-center gap-3">
                    <span>{post.comments} {t('myPage.comment')}</span>
                    <span>{post.shares} {t('myPage.share')}</span>
                  </div>
                </div>

                {/* Promotion Status Badge */}
                {(post.isPromoted || post.promotionStatus === 'approved') && (
                  <div className={`mx-4 mb-2 p-2.5 rounded-xl border ${darkMode ? 'bg-green-900/20 border-green-800/50' : 'bg-green-50 border-green-100'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-green-600" />
                        <span className="text-[10px] font-bold text-green-600">{t('myPage.promoted')} — {promotionPackages.find(p => p.id === post.promotionTier)?.name || post.promotionTier}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {post.reachCount !== undefined && (
                          <span className={`text-[10px] font-bold ${textMuted}`}><Eye className="w-3 h-3 inline" /> {post.reachCount.toLocaleString()} {t('myPage.reach')}</span>
                        )}
                        {post.promotionExpiresAt && (
                          <span className="text-[10px] font-bold text-green-600"><Clock className="w-3 h-3 inline" /> {t('myPage.remaining')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {post.promotionStatus === 'pending' && (
                  <div className={`mx-4 mb-2 p-2.5 rounded-xl border ${darkMode ? 'bg-yellow-900/20 border-yellow-800/50' : 'bg-yellow-50 border-yellow-100'}`}>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <span className="text-[10px] font-bold text-yellow-600">{t('myPage.promotionUnderReview')}</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className={`mx-3 border-t py-1 flex items-center justify-between mb-1 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors text-xs font-bold ${
                      likedPosts.has(post.id) ? 'text-blue-600' : darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${likedPosts.has(post.id) ? 'fill-blue-600 text-blue-600' : ''}`} />
                    {t('myPage.like')}
                  </button>
                  <button
                    onClick={() => navigate(`/post/${post.id}`)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors text-xs font-bold ${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    {t('myPage.comment')}
                  </button>
                  <button
                    onClick={() => openShareModal(post)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors text-xs font-bold ${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    <Share2 className="w-4 h-4" />
                    {t('myPage.share')}
                  </button>
                  {/* Promote button - only for non-promoted posts */}
                  {!post.isPromoted && post.promotionStatus !== 'pending' && post.promotionStatus !== 'approved' ? (
                    <button
                      onClick={() => setPromotingPost(post)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors text-xs font-bold bg-gradient-to-l from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 active:scale-95"
                    >
                      <Megaphone className="w-4 h-4" />
                      {t('myPage.promote')}
                    </button>
                  ) : (
                    <button
                      onClick={() => { toggleSavePost(post.id); toast.success(savedPosts.includes(post.id) ? t('myPage.unsave') : t('myPage.save')); }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors text-xs font-bold ${
                        savedPosts.includes(post.id) ? 'text-orange-600' : darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {savedPosts.includes(post.id) ? <BookmarkCheck className="w-4 h-4 fill-orange-600" /> : <Bookmark className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </motion.div>
            )) : (
              <div className={`p-16 text-center rounded-2xl border ${cardBg}`}>
                <div className="w-16 h-16 mx-auto mb-4 rotate-45 flex items-center justify-center rounded-2xl bg-gradient-to-br from-orange-100 to-rose-100">
                  <PenLine className="w-7 h-7 text-orange-600 -rotate-45" />
                </div>
                <p className={`font-bold text-lg mb-2 ${textPrimary}`}>{t('myPage.noPosts')}</p>
                <p className={`text-sm ${textMuted}`}>{t('myPage.shareOnPage')}</p>
              </div>
            )}

            {/* Saved Posts Preview */}
            {mySavedPosts.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Bookmark className={`w-4 h-4 ${textMuted}`} />
                  <h3 className={`font-black text-sm ${textPrimary}`}>{t('myPage.savedPosts')}</h3>
                  <span className={`text-[10px] ${textMuted}`}>({mySavedPosts.length})</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {mySavedPosts.slice(0, 3).map(post => (
                    <div
                      key={post.id}
                      onClick={() => navigate(`/post/${post.id}`)}
                      className={`rounded-xl border p-3 cursor-pointer transition-colors ${cardBg} ${cardBgHover}`}
                    >
                      <div className="flex items-start gap-3">
                        {post.image && <img src={post.image} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-relaxed mb-1 line-clamp-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{post.content}</p>
                          <span className={`text-[10px] ${textMuted}`}>{post.author.name} · {post.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Promotions Tab ── */}
        {activeTab === 'promotions' && (
          <motion.div
            key="promotions"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4"
          >
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className={`rounded-2xl border p-4 text-center ${cardBg}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'}`}>
                  <Sparkles className="w-5 h-5" />
                </div>
                <p className={`text-lg font-black ${textPrimary}`}>{myPromotedPosts.filter(p => p.promotionStatus === 'approved' || p.isPromoted).length}</p>
                <p className={`text-[10px] font-bold ${textMuted}`}>{t('myPage.activePromo')}</p>
              </div>
              <div className={`rounded-2xl border p-4 text-center ${cardBg}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-50 text-yellow-600'}`}>
                  <Clock className="w-5 h-5" />
                </div>
                <p className={`text-lg font-black ${textPrimary}`}>{myPromotedPosts.filter(p => p.promotionStatus === 'pending').length}</p>
                <p className={`text-[10px] font-bold ${textMuted}`}>{t('myPage.pendingReview')}</p>
              </div>
              <div className={`rounded-2xl border p-4 text-center ${cardBg}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                  <Wallet className="w-5 h-5" />
                </div>
                <p className={`text-lg font-black ${textPrimary}`}>{currentUser?.walletBalance?.toLocaleString() || 0}</p>
                <p className={`text-[10px] font-bold ${textMuted}`}>{t('myPage.walletBalanceLabel')}</p>
              </div>
            </div>

            {/* Promoted Posts List */}
            {myPromotedPosts.length > 0 ? myPromotedPosts.map(post => {
              const pkg = promotionPackages.find(p => p.id === post.promotionTier);
              const reach = post.reachCount || 0;
              const estimated = post.estimatedReach || pkg?.estimatedReach || 0;
              const progress = estimated > 0 ? Math.min(100, Math.round((reach / estimated) * 100)) : 0;

              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl border overflow-hidden cursor-pointer transition-all hover:shadow-md ${cardBg}`}
                  onClick={() => navigate(`/post/${post.id}`)}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold leading-relaxed mb-1 line-clamp-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          {post.content}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Package badge */}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-gradient-to-l ${pkg?.color || 'from-orange-500 to-orange-600'} text-white`}>
                            {pkg?.icon} {pkg?.name || post.promotionTier}
                          </span>
                          {/* Status badge */}
                          {(post.isPromoted || post.promotionStatus === 'approved') ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-700'}`}>
                              <CheckCircle2 className="w-3 h-3" />{t('myPage.activePromo')}
                            </span>
                          ) : post.promotionStatus === 'pending' ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-50 text-yellow-700'}`}>
                              <AlertCircle className="w-3 h-3" />{t('myPage.pendingReview')}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {post.image && (
                        <img src={post.image} alt="" className="w-14 h-14 rounded-lg object-cover mr-3 flex-shrink-0" />
                      )}
                    </div>

                    {/* Reach Progress */}
                    {(post.isPromoted || post.promotionStatus === 'approved') && estimated > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-bold ${textMuted}`}>
                            {t('myPage.reach')} {reach.toLocaleString()} / {estimated.toLocaleString()}
                          </span>
                          <span className={`text-[10px] font-bold ${textMuted}`}>{progress}%</span>
                        </div>
                        <div className={`w-full h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.8 }}
                            className={`h-full rounded-full ${
                              progress >= 80 ? 'bg-green-500' : progress >= 50 ? 'bg-yellow-500' : 'bg-orange-500'
                            }`}
                          />
                        </div>
                      </div>
                    )}

                    <div className={`flex items-center gap-3 text-[10px] ${textMuted}`}>
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.likes + (likedPosts.has(post.id) ? 1 : 0)} {t('myPage.like')}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{post.comments} {t('myPage.comment')}</span>
                      <span>{post.timestamp}</span>
                    </div>
                  </div>
                </motion.div>
              );
            }) : (
              <div className={`p-12 text-center rounded-2xl border ${cardBg}`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <Megaphone className={`w-8 h-8 ${darkMode ? 'text-gray-500' : 'text-gray-300'}`} />
                </div>
                <p className={`font-bold ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{t('myPage.noPromotedAds')}</p>
                <p className={`text-sm mt-1 ${textMuted}`}>{t('myPage.promotePost')}</p>
                <button
                  onClick={() => setActiveTab('posts')}
                  className="mt-4 bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-orange-700 active:scale-95 transition-all"
                >
                  {t('myPage.goToPosts')}
                </button>
              </div>
            )}

            {/* Wallet Quick Action */}
            <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'}`}>
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={`text-sm font-black ${textPrimary}`}>{t('myPage.walletBalanceLabel')}</p>
                    <p className={`text-lg font-black text-green-600`}>{currentUser?.walletBalance?.toLocaleString() || 0} {t('myPage.balance')}</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/wallet')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-l from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 active:scale-95 transition-all"
                >
                  {t('myPage.chargeWallet')}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Market Listings Tab ── */}
        {activeTab === 'market' && (
          <motion.div
            key="market"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4"
          >
            {/* Header with add button */}
            <div className="flex items-center justify-between">
              <h3 className={`font-black text-sm ${textPrimary}`}>{t('myPage.marketListings')}</h3>
              <button
                onClick={() => navigate('/market/new')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-l from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('myPage.addListing')}
              </button>
            </div>

            {loadingListings ? (
              <div className={`p-12 text-center rounded-2xl border ${cardBg}`}>
                <RefreshCw className={`w-8 h-8 mx-auto mb-3 animate-spin ${darkMode ? 'text-gray-500' : 'text-gray-300'}`} />
                <p className={`text-sm ${textMuted}`}>...</p>
              </div>
            ) : myMarketListings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {myMarketListings.map((listing, i) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`rounded-2xl border overflow-hidden cursor-pointer transition-all hover:shadow-md ${cardBg}`}
                    onClick={() => navigate(`/market/listing/${listing.id}`)}
                  >
                    {/* Listing image */}
                    {listing.images && listing.images.length > 0 ? (
                      <div className="relative h-36 overflow-hidden">
                        <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                        {listing.is_promoted && (
                          <span className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-gradient-to-l from-orange-500 to-orange-600 text-white">
                            <Star className="w-3 h-3" /> {t('myPage.promoted')}
                          </span>
                        )}
                        {listing.condition && (
                          <span className={`absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[9px] font-bold ${darkMode ? 'bg-gray-800/80 text-gray-200' : 'bg-white/90 text-gray-700'} backdrop-blur-sm`}>
                            {listing.condition === 'new' ? t('common.newCondition') : listing.condition === 'used' ? t('common.used') : listing.condition === 'refurbished' ? t('common.refurbished') : listing.condition}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className={`relative h-36 flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <Package className={`w-12 h-12 ${darkMode ? 'text-gray-500' : 'text-gray-300'}`} />
                        {listing.is_promoted && (
                          <span className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-gradient-to-l from-orange-500 to-orange-600 text-white">
                            <Star className="w-3 h-3" /> {t('myPage.promoted')}
                          </span>
                        )}
                        {listing.condition && (
                          <span className={`absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[9px] font-bold ${darkMode ? 'bg-gray-800/80 text-gray-200' : 'bg-white/90 text-gray-700'} backdrop-blur-sm`}>
                            {listing.condition === 'new' ? t('common.newCondition') : listing.condition === 'used' ? t('common.used') : listing.condition === 'refurbished' ? t('common.refurbished') : listing.condition}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="p-3">
                      <h4 className={`font-bold text-sm mb-1 line-clamp-1 ${textPrimary}`}>{listing.title}</h4>
                      {listing.description && (
                        <p className={`text-[11px] mb-2 line-clamp-2 ${textMuted}`}>{listing.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-orange-600">
                          {listing.price?.toLocaleString() || 0} {listing.currency || t('common.egp')}
                        </span>
                        {listing.city && (
                          <span className={`flex items-center gap-1 text-[10px] ${textMuted}`}>
                            <MapPin className="w-3 h-3" />{listing.city}
                          </span>
                        )}
                      </div>
                      {(listing.views_count !== undefined || listing.saves_count !== undefined) && (
                        <div className={`flex items-center gap-3 mt-2 text-[10px] ${textMuted}`}>
                          {listing.views_count !== undefined && (
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{listing.views_count} {t('myPage.views')}</span>
                          )}
                          {listing.saves_count !== undefined && (
                            <span className="flex items-center gap-1"><Bookmark className="w-3 h-3" />{listing.saves_count}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className={`p-12 text-center rounded-2xl border ${cardBg}`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <Store className={`w-8 h-8 ${darkMode ? 'text-gray-500' : 'text-gray-300'}`} />
                </div>
                <p className={`font-bold ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{t('myPage.noMarketListings')}</p>
                <p className={`text-sm mt-1 ${textMuted}`}>{t('myPage.createFirstListing')}</p>
                <button
                  onClick={() => navigate('/market/new')}
                  className="mt-4 bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-orange-700 active:scale-95 transition-all"
                >
                  {t('myPage.addListing')}
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Activity Tab ── */}
        {activeTab === 'activity' && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4"
          >
            {/* Activity Timeline */}
            <div className={`rounded-2xl border p-5 ${cardBg}`}>
              <h3 className={`font-black text-sm mb-4 ${textPrimary}`}>{t('myPage.recentActivity')}</h3>
              <div className="relative">
                {/* Timeline line */}
                <div className={`absolute right-[15px] top-0 bottom-0 w-0.5 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
                <div className="space-y-4">
                  {recentActivity.map((activity, i) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-start gap-4 relative"
                    >
                      {/* Timeline dot */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${getActivityColorClasses(activity.color)}`}>
                        {activity.icon}
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <p className={`text-sm font-bold ${textPrimary}`}>{activity.text}</p>
                        {activity.time && (
                          <div className={`flex items-center gap-1.5 text-[10px] mt-0.5 ${textMuted}`}>
                            <Clock className="w-3 h-3" />
                            {activity.time}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Trust Score Card */}
            <div className={`rounded-2xl border p-5 ${cardBg}`}>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-green-500" />
                <h3 className={`font-black text-sm ${textPrimary}`}>{t('myPage.trustLevel')}</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke={darkMode ? '#374151' : '#f3f4f6'} strokeWidth="8" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#22c55e" strokeWidth="8"
                      strokeDasharray={`${(currentUser?.trustScore || 50) * 2.64} ${264 - (currentUser?.trustScore || 50) * 2.64}`}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-xl font-black ${textPrimary}`}>{currentUser?.trustScore || 50}%</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${textPrimary} mb-1`}>
                    {currentUser?.isTrusted ? t('myPage.trustedUser') : t('myPage.buildingTrust')}
                  </p>
                  <p className={`text-xs ${textMuted}`}>
                    {currentUser?.isTrusted
                      ? t('myPage.trustedDesc')
                      : t('myPage.buildingTrustDesc')}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="text-[10px] font-bold text-green-600">{t('myPage.increasing')}</span>
                    </div>
                    {currentUser?.isVerified && (
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-orange-600" />
                        <span className="text-[10px] font-bold text-orange-600">{t('myPage.verified')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Cards - Staggered/Masonry */}
            <div className="grid grid-cols-2 gap-3">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`rounded-2xl border p-4 ${cardBg}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-orange-900/30' : 'bg-orange-100'}`}>
                    <PenLine className="w-4 h-4 text-orange-600" />
                  </div>
                  <span className={`text-[10px] font-bold ${textMuted}`}>{t('myPage.postsCount')}</span>
                </div>
                <span className={`text-2xl font-black ${textPrimary}`}>{myPosts.length}</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className={`rounded-2xl border p-4 ${cardBg}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
                    <Megaphone className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className={`text-[10px] font-bold ${textMuted}`}>{t('myPage.promotions')}</span>
                </div>
                <span className={`text-2xl font-black ${textPrimary}`}>{myPromotedPosts.length}</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`rounded-2xl border p-4 ${cardBg}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-green-900/30' : 'bg-green-100'}`}>
                    <Wallet className="w-4 h-4 text-green-600" />
                  </div>
                  <span className={`text-[10px] font-bold ${textMuted}`}>{t('myPage.balance')}</span>
                </div>
                <span className={`text-2xl font-black ${textPrimary}`}>{currentUser?.walletBalance?.toLocaleString() || 0}</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className={`rounded-2xl border p-4 ${cardBg}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                    <Bookmark className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className={`text-[10px] font-bold ${textMuted}`}>{t('myPage.savedCount')}</span>
                </div>
                <span className={`text-2xl font-black ${textPrimary}`}>{savedPosts.length}</span>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ── Friends Tab ── */}
        {activeTab === 'friends' && (
          <motion.div
            key="friends"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4"
          >
            {/* Online Friends Strip */}
            {friendsList.filter((f: any) => isUserOnline(f.id)).length > 0 && (
              <div className={`rounded-2xl border p-4 ${cardBg}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                  <span className={`text-xs font-bold ${textSecondary}`}>{t('friends.onlineFriends')}</span>
                  <span className={`text-[10px] ${textMuted}`}>({friendsList.filter((f: any) => isUserOnline(f.id)).length})</span>
                </div>
                <div className="flex items-center gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                  {friendsList.filter((f: any) => isUserOnline(f.id)).map((friend: any) => (
                    <button
                      key={friend.id}
                      onClick={() => navigate(`/user/${friend.id}`)}
                      className="flex flex-col items-center gap-1 flex-shrink-0 group"
                    >
                      <div className="relative">
                        <img
                          src={friend.avatar || friend.avatarBase64 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.id}`}
                          alt={friend.name || friend.username || ''}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-green-400 group-hover:ring-green-500 transition-all"
                        />
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                      </div>
                      <span className={`text-[9px] font-bold max-w-[56px] truncate ${textMuted}`}>{friend.name || friend.username || t('friends.friend')}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Friends Sub-Tab Navigation */}
            <div className={`flex gap-1 p-1 rounded-xl border ${darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              {[
                { id: 'list' as FriendsSection, label: t('friends.myFriends'), icon: <Users className="w-3.5 h-3.5" />, count: friendsList.length },
                { id: 'requests' as FriendsSection, label: t('friends.friendRequests'), icon: <UserPlus className="w-3.5 h-3.5" />, count: friendRequests.length },
                { id: 'suggestions' as FriendsSection, label: t('friends.suggestions'), icon: <UserCheck className="w-3.5 h-3.5" />, count: friendSuggestions.length },
              ].map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveFriendsSection(section.id)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg text-[10px] font-bold transition-all ${
                    activeFriendsSection === section.id
                      ? 'bg-gradient-to-l from-orange-500 to-orange-600 text-white shadow-md'
                      : darkMode
                        ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                        : 'text-gray-500 hover:bg-white hover:text-gray-700'
                  }`}
                >
                  {section.icon}
                  <span className="hidden sm:inline">{section.label}</span>
                  {section.count > 0 && (
                    <span className={`text-[8px] font-black min-w-[14px] h-3.5 flex items-center justify-center rounded-full px-0.5 ${
                      activeFriendsSection === section.id ? 'bg-white/25 text-white' : 'bg-red-500 text-white'
                    }`}>{section.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Friends List Sub-Section ── */}
            {activeFriendsSection === 'list' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {/* Search */}
                <div className="relative">
                  <Search className={`absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 ${textMuted}`} />
                  <input
                    type="text"
                    value={friendsSearchQuery}
                    onChange={e => setFriendsSearchQuery(e.target.value)}
                    placeholder={t('friends.searchFriend')}
                    className={`w-full border rounded-xl pr-10 pl-4 py-2.5 text-sm outline-none transition-colors ${inputBg}`}
                  />
                </div>

                {loadingFriends ? (
                  <div className={`p-8 text-center rounded-2xl border ${cardBg}`}>
                    <RefreshCw className={`w-6 h-6 mx-auto mb-2 animate-spin ${textMuted}`} />
                    <p className={`text-sm ${textMuted}`}>{t('friends.loadingFriends')}</p>
                  </div>
                ) : filteredFriends.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {filteredFriends.map((friend: any) => {
                      const online = isUserOnline(friend.id);
                      return (
                        <motion.div
                          key={friend.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${cardBg} ${cardBgHover}`}
                          onClick={() => navigate(`/user/${friend.id}`)}
                        >
                          <div className="relative flex-shrink-0">
                            <img
                              src={friend.avatar || friend.avatarBase64 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.id}`}
                              alt={friend.name || friend.username || ''}
                              className="w-11 h-11 rounded-full object-cover"
                            />
                            {online && (
                              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className={`text-sm font-bold truncate ${textPrimary}`}>{friend.name || friend.username || t('friends.friend')}</h4>
                              {friend.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-orange-600 fill-orange-600/10 flex-shrink-0" />}
                            </div>
                            <p className={`text-[10px] ${textMuted}`}>
                              {online ? t('friends.onlineNow') : (friend.trustScore ? t('friends.trustLevelScore', { score: friend.trustScore }) : t('friends.friend'))}
                            </p>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); navigate('/messages'); }}
                            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={`p-8 text-center rounded-2xl border ${cardBg}`}>
                    <div className="w-14 h-14 mx-auto mb-3 flex items-center justify-center rounded-2xl bg-gradient-to-br from-orange-100 to-rose-100">
                      <Users className="w-6 h-6 text-orange-600" />
                    </div>
                    <p className={`font-bold text-sm mb-1 ${textPrimary}`}>{t('friends.noFriendsYet')}</p>
                    <p className={`text-xs ${textMuted}`}>{t('friends.addFromSuggestions')}</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Friend Requests Sub-Section ── */}
            {activeFriendsSection === 'requests' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {loadingFriends ? (
                  <div className={`p-8 text-center rounded-2xl border ${cardBg}`}>
                    <RefreshCw className={`w-6 h-6 mx-auto mb-2 animate-spin ${textMuted}`} />
                    <p className={`text-sm ${textMuted}`}>{t('friends.loadingRequests')}</p>
                  </div>
                ) : friendRequests.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {friendRequests.map((request: any) => {
                      const requester = request.sender || request.user || request;
                      const online = isUserOnline(requester.id);
                      return (
                        <motion.div
                          key={request.id || requester.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${cardBg}`}
                          onClick={() => navigate(`/user/${requester.id}`)}
                        >
                          <div className="relative flex-shrink-0">
                            <img
                              src={requester.avatar || requester.avatarBase64 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${requester.id}`}
                              alt={requester.name || requester.username || ''}
                              className="w-11 h-11 rounded-full object-cover"
                            />
                            {online && (
                              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className={`text-sm font-bold truncate ${textPrimary}`}>{requester.name || requester.username || t('common.user')}</h4>
                              {requester.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-orange-600 fill-orange-600/10 flex-shrink-0" />}
                            </div>
                            <p className={`text-[10px] ${textMuted}`}>
                              {t('friends.friendRequest')}
                              {request.mutualFriends ? ` · ${t('friends.mutualFriendsCount', { count: request.mutualFriends })}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAcceptFriendRequest(request.id); }}
                              className="p-2 rounded-lg bg-gradient-to-l from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 active:scale-95 transition-all"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRejectFriendRequest(request.id); }}
                              className={`p-2 rounded-lg transition-colors active:scale-95 ${darkMode ? 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-red-400' : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500'}`}
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={`p-8 text-center rounded-2xl border ${cardBg}`}>
                    <div className="w-14 h-14 mx-auto mb-3 flex items-center justify-center rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100">
                      <UserPlus className="w-6 h-6 text-green-600" />
                    </div>
                    <p className={`font-bold text-sm mb-1 ${textPrimary}`}>{t('friends.noFriendRequests')}</p>
                    <p className={`text-xs ${textMuted}`}>{t('friends.noFriendRequestsDesc')}</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Friend Suggestions Sub-Section ── */}
            {activeFriendsSection === 'suggestions' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {loadingFriends ? (
                  <div className={`p-8 text-center rounded-2xl border ${cardBg}`}>
                    <RefreshCw className={`w-6 h-6 mx-auto mb-2 animate-spin ${textMuted}`} />
                    <p className={`text-sm ${textMuted}`}>{t('friends.loadingSuggestions')}</p>
                  </div>
                ) : friendSuggestions.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {friendSuggestions.map((suggestion: any) => {
                      const online = isUserOnline(suggestion.id);
                      const alreadySent = sentRequests.has(suggestion.id);
                      return (
                        <motion.div
                          key={suggestion.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${cardBg}`}
                          onClick={() => navigate(`/user/${suggestion.id}`)}
                        >
                          <div className="relative flex-shrink-0">
                            <img
                              src={suggestion.avatar || suggestion.avatarBase64 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${suggestion.id}`}
                              alt={suggestion.name || suggestion.username || ''}
                              className="w-11 h-11 rounded-full object-cover"
                            />
                            {online && (
                              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className={`text-sm font-bold truncate ${textPrimary}`}>{suggestion.name || suggestion.username || t('common.user')}</h4>
                              {suggestion.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-orange-600 fill-orange-600/10 flex-shrink-0" />}
                            </div>
                            <p className={`text-[10px] ${textMuted}`}>
                              {suggestion.mutualFriends ? t('friends.mutualFriendsCount', { count: suggestion.mutualFriends }) : t('friends.suggestedForYou')}
                            </p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); if (!alreadySent) handleSendFriendRequest(suggestion.id); }}
                            disabled={alreadySent}
                            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-bold transition-all active:scale-95 flex-shrink-0 ${
                              alreadySent
                                ? darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'
                                : 'bg-gradient-to-l from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700'
                            }`}
                          >
                            {alreadySent ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">{alreadySent ? t('friends.sent') : t('friends.addFriend')}</span>
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={`p-8 text-center rounded-2xl border ${cardBg}`}>
                    <div className="w-14 h-14 mx-auto mb-3 flex items-center justify-center rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100">
                      <UserCheck className="w-6 h-6 text-purple-600" />
                    </div>
                    <p className={`font-bold text-sm mb-1 ${textPrimary}`}>{t('friends.noSuggestions')}</p>
                    <p className={`text-xs ${textMuted}`}>{t('friends.noSuggestionsDesc')}</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* View All Friends Button */}
            <button
              onClick={() => setActiveTab('friends')}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all active:scale-[0.98] ${cardBg} ${cardBgHover} ${textSecondary}`}
            >
              <Users className="w-4 h-4" />
              {t('friends.viewAll')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Promotion Wizard Modal */}
      <AnimatePresence>
        {promotingPost && (
          <PromotionWizard
            post={promotingPost}
            onClose={() => setPromotingPost(null)}
            onPromotionCreated={() => {
              setPromotingPost(null);
              loadPromotionRequests();
              setActiveTab('promotions');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
