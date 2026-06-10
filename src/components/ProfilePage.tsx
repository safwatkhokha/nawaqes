import React, { useState, useRef, useEffect, useState as useReactState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import {
  ArrowRight, CheckCircle2, ShieldCheck, MapPin, Phone, Edit3, ShoppingBag,
  FileText, User as UserIcon, Calendar, Award, Camera, X, Image as ImageIcon,
  Wallet, CreditCard, Clock, Heart, Eye, TrendingUp, Lock, Users, Sparkles,
  MessageCircle, Plus, Check, Zap, BarChart3, UserPlus, UserCheck, UserX,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { interestCategories, interestGroups, getInterestsByGroup, type InterestGroup } from '../config/interests';

type ProfileTab = 'posts' | 'ads' | 'about' | 'activity' | 'friends';

const interestColors = [
  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
];

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { darkMode, posts, transactions, promotionRequests, acceptFriendRequest, rejectFriendRequest, friendRequests } = useAppContext();
  const { currentUser, updateProfile } = useAuth();
  const { t } = useTranslation();
  const { dir } = useLanguage();

  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editLocation, setEditLocation] = useState(currentUser?.location || '');
  const [editPhone, setEditPhone] = useState(currentUser?.phone || '');
  const [editBio, setEditBio] = useState(currentUser?.bio || '');
  const [editShowPhone, setEditShowPhone] = useState<boolean>(currentUser?.showPhone || false);
  const [editShowLocation, setEditShowLocation] = useState<boolean>(currentUser?.showLocation !== undefined ? currentUser.showLocation : true);
  const [showInterestPicker, setShowInterestPicker] = useState(false);
  const [editInterests, setEditInterests] = useState<string[]>(currentUser?.interests || []);
  const [pickerGroup, setPickerGroup] = useState<InterestGroup | 'all'>('all');
  const [friendsCount, setFriendsCount] = useState(0);
  const [friendRequestsList, setFriendRequestsList] = useState<any[]>([]);
  const [friendsList, setFriendsList] = useState<any[]>([]);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Fetch real friends count and friend requests from API
  useEffect(() => {
    if (!currentUser) return;
    Promise.all([
      api.getFriendsList().catch(() => []),
      api.getFriendRequests().catch(() => []),
    ]).then(([friends, requests]) => {
      if (Array.isArray(friends)) {
        setFriendsCount(friends.length);
        setFriendsList(friends);
      }
      if (Array.isArray(requests)) {
        setFriendRequestsList(requests);
      }
    });
  }, [currentUser]);

  const handleAcceptFriend = async (id: string) => {
    try {
      await acceptFriendRequest(id);
      setFriendRequestsList(prev => prev.filter((r: any) => r.id !== id));
      // Refresh friends count
      const friends = await api.getFriendsList().catch(() => []);
      if (Array.isArray(friends)) { setFriendsCount(friends.length); setFriendsList(friends); }
      toast.success(t('friends.requestAccepted', 'تم قبول طلب الصداقة'));
    } catch {
      toast.error(t('friends.requestAcceptFailed', 'فشل قبول طلب الصداقة'));
    }
  };

  const handleRejectFriend = async (id: string) => {
    try {
      await rejectFriendRequest(id);
      setFriendRequestsList(prev => prev.filter((r: any) => r.id !== id));
      toast.success(t('friends.requestRejected', 'تم رفض طلب الصداقة'));
    } catch {
      toast.error(t('friends.requestRejectFailed', 'فشل رفض طلب الصداقة'));
    }
  };

  if (!currentUser) return null;

  const userPosts = posts.filter(p => p.author.id === currentUser.id);
  const userAds = posts.filter(p => p.author.id === currentUser.id && p.type === 'ad');

  const handleSaveProfile = async () => {
    try {
      await updateProfile({
        name: editName,
        location: editLocation,
        phone: editPhone,
        bio: editBio,
        showPhone: editShowPhone,
        showLocation: editShowLocation,
      });
      setIsEditing(false);
      toast.success(t('profile.profileUpdated'));
    } catch {
      toast.error(t('profile.profileUpdateFailed', 'فشل تحديث الملف الشخصي'));
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toast.error(t('profile.imageSizeError')); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        // Send both avatar (for display) and avatarBase64 (for base64 storage)
        updateProfile({ avatar: dataUrl, avatarBase64: dataUrl } as any);
        toast.success(t('profile.avatarUpdated'));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toast.error(t('profile.imageSizeError')); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        updateProfile({ coverPhoto: dataUrl } as any);
        toast.success(t('profile.coverUpdated'));
      };
      reader.readAsDataURL(file);
    }
  };

  const tabs: { id: ProfileTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'posts', label: t('profile.tab_myPosts'), icon: <FileText className="w-4 h-4" /> },
    { id: 'ads', label: t('profile.tab_myAds'), icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'friends', label: t('profile.tab_friends', 'الأصدقاء'), icon: <Users className="w-4 h-4" />, badge: friendRequestsList.length > 0 ? friendRequestsList.length : undefined },
    { id: 'about', label: t('profile.tab_about'), icon: <UserIcon className="w-4 h-4" /> },
    { id: 'activity', label: t('profile.tab_activity'), icon: <Clock className="w-4 h-4" /> },
  ];

  // Activity items - generate from user data
  const activityItems = [
    ...userPosts.slice(0, 5).map(p => ({
      id: `post-${p.id}`,
      icon: <FileText className="w-4 h-4" />,
      iconBg: darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-600',
      text: p.type === 'ad' ? `${t('profile.publishedAd')} ${p.content.slice(0, 40)}...` : `${t('profile.publishedPost')} ${p.content.slice(0, 40)}...`,
      time: p.timestamp,
    })),
    ...userAds.slice(0, 3).map(a => ({
      id: `ad-${a.id}`,
      icon: <ShoppingBag className="w-4 h-4" />,
      iconBg: darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600',
      text: t('profile.listedAtPrice', { price: `${a.price?.toLocaleString() || ''} ${a.currency || ''}` }),
      time: a.timestamp,
    })),
    {
      id: 'join',
      icon: <Calendar className="w-4 h-4" />,
      iconBg: darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600',
      text: t('profile.joinedNawaqes'),
      time: currentUser.joinDate ? new Date(currentUser.joinDate).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' }) : '',
    },
  ];

  const statsCards = [
    { label: t('profile.posts'), value: userPosts.length, icon: <FileText className="w-5 h-5" />, color: darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-600' },
    { label: t('profile.friends'), value: friendsCount, icon: <Users className="w-5 h-5" />, color: darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600' },
    { label: t('profile.ads'), value: userAds.length, icon: <ShoppingBag className="w-5 h-5" />, color: darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600' },
    { label: t('profile.trustScore'), value: `${currentUser.trustScore || 0}%`, icon: <ShieldCheck className="w-5 h-5" />, color: darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="max-w-2xl mx-auto" dir={dir}>
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />

      {/* ─── Header ─── */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('profile.title')}</h1>
      </div>

      {/* ─── Cover Photo ─── */}
      <div className="relative mb-24">
        {/* Cover Image Area - has its own overflow-hidden for rounded corners */}
        <div className="h-48 relative rounded-2xl overflow-hidden">
          {currentUser.coverPhoto ? (
            <img src={currentUser.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-l from-orange-500 via-orange-600 to-red-500">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ij48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCA0LTRzNCAyIDQgNC0yIDQtNCA0LTQtMi00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
            </div>
          )}
          {/* Cover photo edit */}
          <button onClick={() => coverInputRef.current?.click()}
            className={`absolute top-3 left-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 z-10 ${darkMode ? 'bg-gray-800/80 text-gray-200 hover:bg-gray-700' : 'bg-white/90 text-gray-700 hover:bg-white'} backdrop-blur-md shadow-lg`}>
            <Camera className="w-3.5 h-3.5" />
            {t('profile.changeCover')}
          </button>
        </div>

        {/* Avatar - outside overflow-hidden so camera button is visible */}
        <div className="absolute -bottom-16 right-6">
          <div className="relative">
            <div className={`w-32 h-32 rounded-2xl border-4 ${darkMode ? 'border-gray-800' : 'border-white'} shadow-xl overflow-hidden`}>
              <img src={currentUser.avatarBase64 || currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`} alt={currentUser.name} className="w-full h-full object-cover" />
            </div>
            <button onClick={() => avatarInputRef.current?.click()}
              className="absolute -bottom-1 -left-1 w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center border-2 border-white shadow-lg hover:bg-orange-700 active:scale-95 transition-all z-20">
              <Camera className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Edit Button */}
        <button onClick={() => {
          setEditName(currentUser.name);
          setEditLocation(currentUser.location || '');
          setEditPhone(currentUser.phone || '');
          setEditBio(currentUser.bio || '');
          setEditShowPhone(currentUser.showPhone || false);
          setEditShowLocation(currentUser.showLocation !== undefined ? currentUser.showLocation : true);
          setIsEditing(true);
        }}
          className={`absolute top-3 right-3 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 z-10 ${darkMode ? 'bg-gray-800/80 text-gray-200 hover:bg-gray-700' : 'bg-white/90 text-gray-700 hover:bg-white'} backdrop-blur-md shadow-lg`}>
          <Edit3 className="w-3.5 h-3.5" />
          {t('profile.editProfile')}
        </button>
      </div>

      {/* ─── User Info Section ─── */}
      <div className="mb-6 px-1">
        <div className="flex items-center gap-2 mb-1.5">
          <h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{currentUser.name}</h2>
          {currentUser.isVerified && <CheckCircle2 className="w-6 h-6 text-orange-600 fill-orange-600/10" />}
        </div>
        {currentUser.bio && (
          <p className={`text-sm leading-relaxed mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{currentUser.bio}</p>
        )}

        {/* Badges Row */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {currentUser.trustScore !== undefined && currentUser.trustScore > 0 && (
            <div className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg font-bold ${darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-700'}`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              {currentUser.trustScore}% {t('profile.trustScore')}
            </div>
          )}
          {currentUser.isAdmin && (
            <div className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg font-bold ${darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-700'}`}>
              <Award className="w-3.5 h-3.5" />
              {t('profile.admin')}
            </div>
          )}
          {currentUser.isVerified && (
            <div className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg font-bold ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t('profile.verified')}
            </div>
          )}
        </div>

        {/* Info Items */}
        <div className="flex items-center gap-4 flex-wrap">
          {currentUser.showLocation && currentUser.location && (
            <div className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <MapPin className="w-3.5 h-3.5 text-orange-500" />
              {currentUser.location}
            </div>
          )}
          {currentUser.showPhone && currentUser.phone && (
            <div className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <Phone className="w-3.5 h-3.5 text-green-500" />
              {currentUser.phone}
            </div>
          )}
          {!currentUser.showPhone && (
            <div className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              <Lock className="w-3 h-3" />
              {t('profile.emailHidden')}
            </div>
          )}
          <div className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <Calendar className="w-3.5 h-3.5 text-purple-500" />
            {currentUser.joinDate ? new Date(currentUser.joinDate).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' }) : ''}
          </div>
        </div>
      </div>

      {/* ─── Quick Stats Row ─── */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {statsCards.map(stat => (
          <motion.div key={stat.label} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
            className={`rounded-2xl border p-4 text-center transition-colors ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${stat.color}`}>
              {stat.icon}
            </div>
            <p className={`text-lg font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stat.value}</p>
            <p className={`text-[10px] font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ─── Wallet Card ─── */}
      <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 rounded-2xl p-5 text-white shadow-xl shadow-orange-200/40 mb-6 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/5 rounded-full -ml-12 -mb-12 blur-lg" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="font-bold text-base">{t('profile.myWallet')}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black">{t('profile.safeProtected')}</span>
            </div>
          </div>

          <div className="mb-5">
            <span className={`text-[11px] block mb-1 ${darkMode ? 'text-orange-200' : 'text-orange-100'}`}>{t('profile.currentBalance')}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tracking-tight">{currentUser.walletBalance?.toLocaleString() || '0'}</span>
              <span className="text-xl font-bold opacity-80">{t('common.egp')}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => navigate('/wallet')}
              className="flex-1 bg-white text-orange-600 py-3 rounded-xl font-black text-sm hover:bg-gray-50 transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2">
              <CreditCard className="w-4 h-4" />
              {t('profile.chargeWallet')}
            </button>
            <button onClick={() => navigate('/wallet')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-orange-400/30 hover:bg-orange-400/40 text-white'}`}>
              <Clock className="w-4 h-4" />
              {t('profile.transactionHistory')}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Interests Section ─── */}
      <div className={`rounded-2xl border p-5 mb-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className={`font-black text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('profile.myInterests')}</h3>
          </div>
          <button onClick={() => { setEditInterests(currentUser?.interests || []); setShowInterestPicker(true); }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
            <Edit3 className="w-3 h-3" />
            {t('profile.editInterests')}
          </button>
        </div>
        {currentUser.interests && currentUser.interests.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {currentUser.interests.map((interest, idx) => {
              const interestData = interestCategories.find(i => i.id === interest);
              return (
                <span key={idx} className={`px-3 py-1.5 rounded-full text-xs font-bold ${interestColors[idx % interestColors.length]}`}>
                  {interestData ? `${interestData.icon} ${t(interestData.nameKey)}` : t(`interests.${interest}`)}
                </span>
              );
            })}
          </div>
        ) : (
          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('profile.addInterests')}</p>
        )}
      </div>

      {/* ─── My Promoted Ads Section ─── */}
      <motion.div
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate('/promotions')}
        className={`rounded-2xl border p-5 mb-6 cursor-pointer transition-all hover:shadow-md ${darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-100 hover:border-gray-200'}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`font-black text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('profile.myPromotedAds')}</h3>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('profile.activePromotions', { count: promotionRequests.filter(r => r.postAuthor.id === currentUser.id && r.status === 'approved').length })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <BarChart3 className={`w-4 h-4 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
            </div>
            <ArrowRight className={`w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          </div>
        </div>
      </motion.div>

      {/* ─── Interests Picker Modal ─── */}
      <AnimatePresence>
        {showInterestPicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowInterestPicker(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className={`rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[85vh] flex flex-col ${darkMode ? 'bg-gray-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
              <div className={`flex items-center justify-between p-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <h3 className={`font-black text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('profile.editInterestsBtn')}</h3>
                <button onClick={() => setShowInterestPicker(false)} className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 overflow-y-auto flex-1">
                {/* Quick Actions */}
                <div className="flex gap-2 mb-4">
                  <button onClick={() => setEditInterests(interestCategories.map(i => i.id))}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    <Check className="w-3.5 h-3.5" />
                    {t('auth.selectAll')}
                  </button>
                  <button onClick={() => setEditInterests([])}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    <X className="w-3.5 h-3.5" />
                    {t('auth.deselectAll')}
                  </button>
                </div>

                {/* Group Tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
                  <button onClick={() => setPickerGroup('all')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${pickerGroup === 'all' ? (darkMode ? 'bg-gray-600 text-white' : 'bg-gray-900 text-white') : (darkMode ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}`}>
                    {t('common.all')}
                  </button>
                  {interestGroups.map(group => (
                    <button key={group.id} onClick={() => setPickerGroup(group.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${pickerGroup === group.id ? (darkMode ? 'bg-gray-600 text-white' : 'bg-gray-900 text-white') : (darkMode ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}`}>
                      <span>{group.icon}</span>
                      {t(group.nameKey)}
                    </button>
                  ))}
                </div>

                {/* Interest Cards */}
                <div className="grid grid-cols-2 gap-2">
                  {(pickerGroup === 'all' ? interestCategories : getInterestsByGroup(pickerGroup as InterestGroup)).map(interest => {
                    const isSelected = editInterests.includes(interest.id);
                    return (
                      <button key={interest.id} onClick={() => setEditInterests(prev => isSelected ? prev.filter(i => i !== interest.id) : [...prev, interest.id])}
                        className={`relative rounded-xl p-3 text-start transition-all overflow-hidden ${
                          isSelected
                            ? `ring-2 ring-orange-500 shadow-sm ${darkMode ? 'bg-gray-700' : 'bg-white'}`
                            : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100 border border-gray-100'
                        }`}>
                        {isSelected && (
                          <div className={`absolute inset-0 bg-gradient-to-br ${interest.color} opacity-10`} />
                        )}
                        {isSelected && (
                          <div className="absolute top-1.5 left-1.5 w-4 h-4 bg-orange-600 rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                        <div className="relative z-10">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-lg">{interest.icon}</span>
                            <span className={`text-[11px] font-black ${isSelected ? (darkMode ? 'text-white' : 'text-gray-900') : (darkMode ? 'text-gray-300' : 'text-gray-700')}`}>
                              {t(interest.nameKey)}
                            </span>
                          </div>
                          <p className={`text-[9px] leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                            {t(interest.descriptionKey)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Bottom Bar */}
              <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                {editInterests.length > 0 && (
                  <p className={`text-center text-xs font-bold mb-3 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                    {t('profile.interestsSelected', { count: editInterests.length })}
                  </p>
                )}
                <button onClick={() => {
                  updateProfile({ interests: editInterests });
                  setShowInterestPicker(false);
                  toast.success(t('profile.interestsUpdated'));
                }} disabled={editInterests.length === 0}
                  className="w-full bg-orange-600 text-white py-3.5 rounded-xl font-black text-sm hover:bg-orange-700 active:scale-95 transition-all shadow-lg shadow-orange-200/40 disabled:opacity-50 disabled:cursor-not-allowed">
                  {t('profile.saveInterests')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Tabs ─── */}
      <div className={`flex gap-1 p-1 rounded-xl mb-6 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === tab.id
              ? (darkMode ? 'bg-gray-700 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm')
              : (darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')
            }`}>
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.badge && tab.badge > 0 && (
              <span className="bg-red-500 text-white text-[8px] font-black min-w-[16px] h-4 flex items-center justify-center rounded-full px-1">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ─── */}
      <AnimatePresence mode="wait">
        {/* Posts Tab */}
        {activeTab === 'posts' && (
          <motion.div key="posts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {userPosts.length > 0 ? (
              <div className="space-y-3">
                {userPosts.map(post => (
                  <div key={post.id} onClick={() => navigate(`/post/${post.id}`)}
                    className={`rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-md ${darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                    {post.image && (
                      <img src={post.image} alt="" className="w-full h-40 object-cover rounded-xl mb-3" />
                    )}
                    <p className={`text-sm leading-relaxed mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{post.content}</p>
                    <div className={`flex items-center gap-4 text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {post.likes}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {post.comments}</span>
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.reachCount || 0}</span>
                      <span className="mr-auto">{post.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`p-12 text-center rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <FileText className={`w-8 h-8 ${darkMode ? 'text-gray-500' : 'text-gray-300'}`} />
                </div>
                <p className={`font-bold ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{t('profile.noPostsYet')}</p>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{t('profile.startSharing')}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Ads Tab */}
        {activeTab === 'ads' && (
          <motion.div key="ads" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {userAds.length > 0 ? (
              <div className="space-y-3">
                {userAds.map(ad => (
                  <div key={ad.id} onClick={() => navigate(`/post/${ad.id}`)}
                    className={`rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-md ${darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                    <div className="flex items-start gap-3">
                      {ad.image && (
                        <img src={ad.image} alt="" className="w-24 h-24 rounded-xl object-cover flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-relaxed mb-2 line-clamp-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{ad.content}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {ad.price && (
                            <span className="text-sm font-black text-orange-600">{ad.price.toLocaleString()} {ad.currency}</span>
                          )}
                          {ad.location && (
                            <span className={`text-[11px] flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              <MapPin className="w-3 h-3" />{ad.location}
                            </span>
                          )}
                        </div>
                        {ad.isPromoted && ad.promotionStatus === 'approved' && (
                          <div className={`mt-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-50 text-yellow-700'}`}>
                            <TrendingUp className="w-3 h-3" />
                            {t('profile.promoted')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`p-12 text-center rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <ShoppingBag className={`w-8 h-8 ${darkMode ? 'text-gray-500' : 'text-gray-300'}`} />
                </div>
                <p className={`font-bold ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{t('profile.noAdsYet')}</p>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{t('profile.createFirstAd')}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <motion.div key="friends" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            {/* Friend Requests */}
            {friendRequestsList.length > 0 && (
              <div>
                <h3 className={`text-sm font-black mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <UserPlus className="w-4 h-4 text-orange-500" />
                  {t('profile.friendRequests', 'طلبات الصداقة')}
                  <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{friendRequestsList.length}</span>
                </h3>
                <div className="space-y-2">
                  {friendRequestsList.map((req: any) => (
                    <div key={req.id} className={`flex items-center gap-3 p-3 rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                      <img
                        src={req.user?.avatar || req.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.user?.id || req.id}`}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => navigate(`/user/${req.user?.id || req.user_id}`)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate cursor-pointer hover:text-orange-600 transition-colors ${darkMode ? 'text-white' : 'text-gray-900'}`}
                          onClick={() => navigate(`/user/${req.user?.id || req.user_id}`)}>
                          {req.user?.name || req.name || 'مستخدم'}
                        </p>
                        <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {req.timestamp ? new Date(req.timestamp).toLocaleDateString('ar-EG') : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAcceptFriend(req.id)}
                          className="w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 active:scale-90 transition-all"
                          title={t('friends.accept', 'قبول')}
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRejectFriend(req.id)}
                          className="w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 active:scale-90 transition-all"
                          title={t('friends.reject', 'رفض')}
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends List */}
            <div>
              <h3 className={`text-sm font-black mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <Users className="w-4 h-4 text-blue-500" />
                {t('profile.myFriends', 'أصدقائي')}
                <span className={`text-[10px] font-bold ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>({friendsCount})</span>
              </h3>
              {friendsList.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {friendsList.map((friend: any) => (
                    <div
                      key={friend.id}
                      onClick={() => navigate(`/user/${friend.id}`)}
                      className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all hover:shadow-md ${darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                    >
                      <img
                        src={friend.avatarBase64 || friend.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.id}`}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{friend.name}</p>
                          {friend.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-orange-600 fill-orange-600/10" />}
                        </div>
                        {friend.bio && <p className={`text-[10px] truncate ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{friend.bio}</p>}
                      </div>
                      <MessageCircle className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`p-8 text-center rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                  <Users className={`w-10 h-10 mx-auto mb-3 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                  <p className={`font-bold text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('profile.noFriendsYet', 'لا يوجد أصدقاء بعد')}</p>
                  <button onClick={() => navigate('/friends')} className="mt-3 bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-orange-700 active:scale-95 transition-all">
                    {t('profile.findFriends', 'البحث عن أصدقاء')}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <motion.div key="about" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                {/* Name */}
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><UserIcon className="w-4 h-4" /></div>
                    <div><p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('profile.about_name')}</p><p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{currentUser.name}</p></div>
                  </div>
                </div>
                {/* Gender */}
                {currentUser.gender && (
                  <div className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${currentUser.gender === 'female' ? (darkMode ? 'bg-pink-900/30 text-pink-400' : 'bg-pink-50 text-pink-600') : (darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600')}`}>
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <div><p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('profile.about_gender')}</p><p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{currentUser.gender === 'female' ? t('auth.female') : t('auth.male')}</p></div>
                    </div>
                  </div>
                )}
                {/* Bio */}
                {currentUser.bio && (
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'}`}><FileText className="w-4 h-4" /></div>
                      <div><p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('profile.about_bio')}</p><p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{currentUser.bio}</p></div>
                    </div>
                  </div>
                )}
                {/* Location */}
                {currentUser.showLocation && currentUser.location && (
                  <div className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-600'}`}><MapPin className="w-4 h-4" /></div>
                      <div><p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('profile.about_location')}</p><p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{currentUser.location}</p></div>
                    </div>
                  </div>
                )}
                {/* Phone */}
                {currentUser.showPhone && currentUser.phone && (
                  <div className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'}`}><Phone className="w-4 h-4" /></div>
                      <div><p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('profile.about_phone')}</p><p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{currentUser.phone}</p></div>
                    </div>
                  </div>
                )}
                {/* Trust Score with Progress Bar */}
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}><ShieldCheck className="w-4 h-4" /></div>
                      <div><p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('profile.about_trust')}</p><p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{currentUser.trustScore}%</p></div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${(currentUser.trustScore || 0) >= 80 ? darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600' : (currentUser.trustScore || 0) >= 50 ? darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-50 text-yellow-600' : darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'}`}>
                      {(currentUser.trustScore || 0) >= 80 ? t('profile.excellent') : (currentUser.trustScore || 0) >= 50 ? t('profile.good') : t('profile.poor')}
                    </span>
                  </div>
                  <div className={`w-full h-2.5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${currentUser.trustScore || 0}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={`h-full rounded-full ${(currentUser.trustScore || 0) >= 80 ? 'bg-green-500' : (currentUser.trustScore || 0) >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    />
                  </div>
                </div>
                {/* Verification Status */}
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600'}`}><CheckCircle2 className="w-4 h-4" /></div>
                    <div><p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('profile.about_verification')}</p><p className={`text-sm font-bold ${currentUser.isVerified ? 'text-green-600' : darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{currentUser.isVerified ? t('profile.verifiedCheck') : t('profile.unverified')}</p></div>
                  </div>
                </div>
                {/* Join Date */}
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-50 text-yellow-600'}`}><Calendar className="w-4 h-4" /></div>
                    <div><p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('profile.about_joinDate')}</p><p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{currentUser.joinDate ? new Date(currentUser.joinDate).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}</p></div>
                  </div>
                </div>
                {/* Payment Methods */}
                {currentUser.paymentMethods && currentUser.paymentMethods.length > 0 && (
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${darkMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}><CreditCard className="w-4 h-4" /></div>
                      <div><p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('profile.about_paymentMethods')}</p></div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currentUser.paymentMethods.map(pm => (
                        <span key={pm.id} className={`text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
                          <span>{pm.icon}</span>
                          {pm.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <motion.div key="activity" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {activityItems.length > 0 ? (
              <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                  {activityItems.map((item, idx) => (
                    <div key={item.id} className="px-5 py-4 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${item.iconBg}`}>
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.text}</p>
                      </div>
                      <span className={`text-[10px] font-bold flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`p-12 text-center rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <Clock className={`w-8 h-8 ${darkMode ? 'text-gray-500' : 'text-gray-300'}`} />
                </div>
                <p className={`font-bold ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{t('profile.noActivity')}</p>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{t('profile.activityWillAppear')}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Edit Profile Modal ─── */}
      <AnimatePresence>
        {isEditing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsEditing(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className={`rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-gray-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>

              {/* Modal Header */}
              <div className={`flex items-center justify-between p-5 border-b sticky top-0 z-10 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white'}`}>
                <h3 className={`font-black text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('profile.editProfileTitle')}</h3>
                <button onClick={() => setIsEditing(false)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4">
                {/* Name */}
                <div>
                  <label className={`text-xs font-bold block mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('profile.about_name')}</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border outline-none text-sm font-bold transition-colors ${darkMode ? 'bg-gray-700 border-gray-600 text-white focus:border-orange-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-orange-400'}`} />
                </div>

                {/* Bio */}
                <div>
                  <label className={`text-xs font-bold block mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('profile.about_bio')}</label>
                  <textarea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder={t('profile.about_bio')}
                    className={`w-full px-4 py-3 rounded-xl border outline-none text-sm font-bold transition-colors resize-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-orange-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-400'}`} rows={3} />
                </div>

                {/* Location */}
                <div>
                  <label className={`text-xs font-bold block mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('profile.about_location')}</label>
                  <input type="text" value={editLocation} onChange={e => setEditLocation(e.target.value)} placeholder="Cairo, Egypt"
                    className={`w-full px-4 py-3 rounded-xl border outline-none text-sm font-bold transition-colors ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-orange-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-400'}`} />
                </div>

                {/* Phone */}
                <div>
                  <label className={`text-xs font-bold block mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('profile.about_phone')}</label>
                  <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="01xxxxxxxxx"
                    className={`w-full px-4 py-3 rounded-xl border outline-none text-sm font-bold transition-colors ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-orange-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-400'}`} />
                </div>

                {/* Toggles */}
                <div className={`rounded-xl border p-4 space-y-3 ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
                  {/* Show Phone Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('settings.showPhone')}</span>
                    </div>
                    <button onClick={() => setEditShowPhone(!editShowPhone)}
                      className={`w-11 h-6 rounded-full transition-all relative ${editShowPhone ? 'bg-orange-600' : darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${editShowPhone ? 'right-0.5' : 'right-[22px]'}`} />
                    </button>
                  </div>

                  {/* Show Location Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('settings.showLocation')}</span>
                    </div>
                    <button onClick={() => setEditShowLocation(!editShowLocation)}
                      className={`w-11 h-6 rounded-full transition-all relative ${editShowLocation ? 'bg-orange-600' : darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${editShowLocation ? 'right-0.5' : 'right-[22px]'}`} />
                    </button>
                  </div>
                </div>

                {/* Save Button */}
                <button onClick={handleSaveProfile}
                  className="w-full bg-orange-600 text-white py-3.5 rounded-xl font-black text-sm hover:bg-orange-700 active:scale-95 transition-all shadow-lg shadow-orange-200/40">
                  {t('common.save')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
