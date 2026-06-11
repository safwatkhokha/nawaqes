import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import {
  ArrowRight, CheckCircle2, ShieldCheck, MapPin, Phone, Edit3, ShoppingBag,
  FileText, User as UserIcon, Calendar, Award, Camera, X, Wallet, CreditCard,
  Clock, Heart, Eye, TrendingUp, Lock, Users, Sparkles, MessageCircle, Check,
  Zap, BarChart3, UserPlus, UserCheck, UserX, Share2, Settings, Target,
  ArrowUpRight, BadgeCheck, Activity, Image as ImageIcon,
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

// Arabic months for date picker
const arabicMonths = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

// Relative time helper
function getRelativeTime(dateStr: string): string {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'الآن';
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `منذ ${diffDays} يوم`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `منذ ${diffMonths} شهر`;
  return `منذ ${Math.floor(diffMonths / 12)} سنة`;
}

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { darkMode, posts, transactions, promotionRequests, acceptFriendRequest, rejectFriendRequest, friendRequests } = useAppContext();
  const { currentUser, updateProfile } = useAuth();
  const { t } = useTranslation();
  const { dir } = useLanguage();

  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editGender, setEditGender] = useState<'male' | 'female' | ''>('');
  const [editDobYear, setEditDobYear] = useState('');
  const [editDobMonth, setEditDobMonth] = useState('');
  const [editDobDay, setEditDobDay] = useState('');
  const [editShowPhone, setEditShowPhone] = useState(false);
  const [editShowLocation, setEditShowLocation] = useState(true);
  const [showInterestPicker, setShowInterestPicker] = useState(false);
  const [editInterests, setEditInterests] = useState<string[]>([]);
  const [pickerGroup, setPickerGroup] = useState<InterestGroup | 'all'>('all');
  const [friendsCount, setFriendsCount] = useState(0);
  const [friendRequestsList, setFriendRequestsList] = useState<any[]>([]);
  const [friendsList, setFriendsList] = useState<any[]>([]);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const modalAvatarRef = useRef<HTMLInputElement>(null);
  const modalCoverRef = useRef<HTMLInputElement>(null);

  // Fetch friends & requests
  useEffect(() => {
    if (!currentUser) return;
    Promise.all([api.getFriendsList().catch(() => []), api.getFriendRequests().catch(() => [])]).then(([friends, requests]) => {
      if (Array.isArray(friends)) { setFriendsCount(friends.length); setFriendsList(friends); }
      if (Array.isArray(requests)) setFriendRequestsList(requests);
    });
  }, [currentUser]);

  const handleAcceptFriend = async (id: string) => {
    try {
      await acceptFriendRequest(id);
      setFriendRequestsList(prev => prev.filter((r: any) => r.id !== id));
      const friends = await api.getFriendsList().catch(() => []);
      if (Array.isArray(friends)) { setFriendsCount(friends.length); setFriendsList(friends); }
      toast.success(t('friends.requestAccepted', 'تم قبول طلب الصداقة'));
    } catch { toast.error(t('friends.requestAcceptFailed', 'فشل قبول طلب الصداقة')); }
  };

  const handleRejectFriend = async (id: string) => {
    try {
      await rejectFriendRequest(id);
      setFriendRequestsList(prev => prev.filter((r: any) => r.id !== id));
      toast.success(t('friends.requestRejected', 'تم رفض طلب الصداقة'));
    } catch { toast.error(t('friends.requestRejectFailed', 'فشل رفض طلب الصداقة')); }
  };

  if (!currentUser) return null;

  const userPosts = posts.filter(p => p.author.id === currentUser.id);
  const userAds = posts.filter(p => p.author.id === currentUser.id && p.type === 'ad');
  const totalViews = userPosts.reduce((s, p) => s + (p.reachCount || 0), 0);
  const totalReach = userAds.reduce((s, a) => s + (a.estimatedReach || 0), 0);

  // Profile completion calculation
  const profileCompletion = useMemo(() => {
    const checks = [
      !!currentUser.avatar || !!currentUser.avatarBase64,
      !!currentUser.coverPhoto,
      !!currentUser.bio,
      !!currentUser.phone,
      !!currentUser.location,
      !!(currentUser.interests && currentUser.interests.length > 0),
      !!currentUser.gender,
      !!currentUser.dateOfBirth,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [currentUser]);

  const handleShareProfile = async () => {
    const url = `${window.location.origin}/user/${currentUser.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: currentUser.name, url }); return; } catch {}
    }
    await navigator.clipboard.writeText(url);
    toast.success(t('profile.linkCopied', 'تم نسخ رابط الملف الشخصي'));
  };

  const openEditModal = () => {
    setEditName(currentUser.name);
    setEditLocation(currentUser.location || '');
    setEditPhone(currentUser.phone || '');
    setEditBio(currentUser.bio || '');
    setEditGender(currentUser.gender || '');
    setEditShowPhone(currentUser.showPhone || false);
    setEditShowLocation(currentUser.showLocation !== undefined ? currentUser.showLocation : true);
    if (currentUser.dateOfBirth) {
      const d = new Date(currentUser.dateOfBirth);
      setEditDobYear(String(d.getFullYear()));
      setEditDobMonth(String(d.getMonth() + 1));
      setEditDobDay(String(d.getDate()));
    } else { setEditDobYear(''); setEditDobMonth(''); setEditDobDay(''); }
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    try {
      const updates: any = {
        name: editName, location: editLocation, phone: editPhone, bio: editBio,
        showPhone: editShowPhone, showLocation: editShowLocation,
      };
      if (editGender) updates.gender = editGender;
      if (editDobYear && editDobMonth && editDobDay) {
        updates.dateOfBirth = new Date(Number(editDobYear), Number(editDobMonth) - 1, Number(editDobDay)).toISOString();
      }
      await updateProfile(updates);
      setIsEditing(false);
      toast.success(t('profile.profileUpdated', 'تم تحديث الملف الشخصي'));
    } catch { toast.error(t('profile.profileUpdateFailed', 'فشل تحديث الملف الشخصي')); }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error(t('profile.imageSizeError', 'حجم الصورة كبير جداً')); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (type === 'avatar') { updateProfile({ avatar: dataUrl, avatarBase64: dataUrl } as any); toast.success(t('profile.avatarUpdated', 'تم تحديث الصورة')); }
      else { updateProfile({ coverPhoto: dataUrl } as any); toast.success(t('profile.coverUpdated', 'تم تحديث الغلاف')); }
    };
    reader.readAsDataURL(file);
  };

  const tabs: { id: ProfileTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'posts', label: t('profile.tab_myPosts', 'منشوراتي'), icon: <FileText className="w-4 h-4" /> },
    { id: 'ads', label: t('profile.tab_myAds', 'إعلاناتي'), icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'friends', label: t('profile.tab_friends', 'الأصدقاء'), icon: <Users className="w-4 h-4" />, badge: friendRequestsList.length > 0 ? friendRequestsList.length : undefined },
    { id: 'about', label: t('profile.tab_about', 'نبذة'), icon: <UserIcon className="w-4 h-4" /> },
    { id: 'activity', label: t('profile.tab_activity', 'النشاط'), icon: <Activity className="w-4 h-4" /> },
  ];

  const activityItems = [
    ...userPosts.slice(0, 5).map(p => ({
      id: `post-${p.id}`, icon: <FileText className="w-4 h-4" />,
      iconBg: darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-600',
      text: p.type === 'ad' ? `${t('profile.publishedAd', 'نشر إعلان')} ${p.content.slice(0, 40)}...` : `${t('profile.publishedPost', 'نشر منشور')} ${p.content.slice(0, 40)}...`,
      time: p.timestamp, relative: getRelativeTime(p.timestamp),
    })),
    ...transactions.slice(0, 3).map((tx: any) => ({
      id: `tx-${tx.id}`, icon: <Wallet className="w-4 h-4" />,
      iconBg: darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600',
      text: tx.type === 'charge' ? t('profile.chargedWallet', 'شحن المحفظة') : t('profile.spentFromWallet', 'إنفاق من المحفظة'),
      time: tx.createdAt || tx.timestamp, relative: getRelativeTime(tx.createdAt || tx.timestamp),
    })),
    {
      id: 'join', icon: <Calendar className="w-4 h-4" />,
      iconBg: darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600',
      text: t('profile.joinedNawaqes', 'انضم لنواقص'),
      time: currentUser.joinDate, relative: currentUser.joinDate ? getRelativeTime(currentUser.joinDate) : '',
    },
  ];

  const statsCards = [
    { label: t('profile.posts', 'المنشورات'), value: userPosts.length, icon: <FileText className="w-5 h-5" />, color: darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-600', tab: 'posts' as ProfileTab },
    { label: t('profile.friends', 'الأصدقاء'), value: friendsCount, icon: <Users className="w-5 h-5" />, color: darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600', tab: 'friends' as ProfileTab },
    { label: t('profile.ads', 'الإعلانات'), value: userAds.length, icon: <ShoppingBag className="w-5 h-5" />, color: darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600', tab: 'ads' as ProfileTab },
    { label: t('profile.views', 'المشاهدات'), value: totalViews, icon: <Eye className="w-5 h-5" />, color: darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600', tab: 'posts' as ProfileTab },
  ];

  const spending = transactions.filter((tx: any) => tx.type === 'spend' || tx.type === 'promotion').reduce((s: number, tx: any) => s + (tx.amount || 0), 0);
  const rewards = transactions.filter((tx: any) => tx.type === 'reward' || tx.type === 'cashback').reduce((s: number, tx: any) => s + (tx.amount || 0), 0);

  const cardCls = `rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`;
  const inputCls = `w-full px-4 py-3 rounded-xl text-sm font-bold outline-none transition-all ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:border-orange-500' : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-orange-500'}`;

  return (
    <div className="max-w-2xl mx-auto" dir={dir}>
      {/* Hidden file inputs */}
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageChange(e, 'avatar')} />
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageChange(e, 'cover')} />
      <input ref={modalAvatarRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageChange(e, 'avatar')} />
      <input ref={modalCoverRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageChange(e, 'cover')} />

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('profile.title', 'الملف الشخصي')}</h1>
        </div>
        <button onClick={handleShareProfile} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {/* ─── Cover Photo ─── */}
      <div className="relative mb-24">
        <div className="h-48 sm:h-56 relative rounded-2xl overflow-hidden">
          {currentUser.coverPhoto ? (
            <img src={currentUser.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-l from-orange-500 via-orange-600 to-red-500" />
          )}
          <button onClick={() => coverInputRef.current?.click()} className={`absolute top-3 left-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 z-10 ${darkMode ? 'bg-gray-800/80 text-gray-200 hover:bg-gray-700' : 'bg-white/90 text-gray-700 hover:bg-white'} backdrop-blur-md shadow-lg`}>
            <Camera className="w-3.5 h-3.5" />{t('profile.changeCover', 'تغيير الغلاف')}
          </button>
        </div>
        <div className="absolute -bottom-16 right-6">
          <div className="relative">
            <div className={`w-32 h-32 rounded-2xl border-4 ${darkMode ? 'border-gray-800' : 'border-white'} shadow-xl overflow-hidden`}>
              <img src={currentUser.avatarBase64 || currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`} alt={currentUser.name} className="w-full h-full object-cover" />
            </div>
            <button onClick={() => avatarInputRef.current?.click()} className="absolute -bottom-1 -left-1 w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center border-2 border-white shadow-lg hover:bg-orange-700 active:scale-95 transition-all z-20">
              <Camera className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
        <button onClick={openEditModal} className={`absolute top-3 right-3 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 z-10 ${darkMode ? 'bg-gray-800/80 text-gray-200 hover:bg-gray-700' : 'bg-white/90 text-gray-700 hover:bg-white'} backdrop-blur-md shadow-lg`}>
          <Edit3 className="w-3.5 h-3.5" />{t('profile.editProfile', 'تعديل')}
        </button>
      </div>

      {/* ─── User Info ─── */}
      <div className="mb-6 px-1">
        <div className="flex items-center gap-2 mb-1.5">
          <h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{currentUser.name}</h2>
          {currentUser.isVerified && <CheckCircle2 className="w-6 h-6 text-orange-600 fill-orange-600/10" />}
        </div>
        {currentUser.bio && <p className={`text-sm leading-relaxed mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{currentUser.bio}</p>}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {currentUser.trustScore !== undefined && currentUser.trustScore > 0 && (
            <div className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg font-bold ${darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-700'}`}>
              <ShieldCheck className="w-3.5 h-3.5" />{currentUser.trustScore}% {t('profile.trustScore', 'نسبة الثقة')}
            </div>
          )}
          {currentUser.isAdmin && (
            <div className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg font-bold ${darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-700'}`}>
              <Award className="w-3.5 h-3.5" />{t('profile.admin', 'مدير')}
            </div>
          )}
          {currentUser.isVerified && (
            <div className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg font-bold ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>
              <BadgeCheck className="w-3.5 h-3.5" />{t('profile.verified', 'موثق')}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {currentUser.gender && (
            <div className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <UserIcon className="w-3.5 h-3.5 text-orange-500" />{currentUser.gender === 'male' ? t('profile.male', 'ذكر') : t('profile.female', 'أنثى')}
            </div>
          )}
          {currentUser.showLocation && currentUser.location && (
            <div className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <MapPin className="w-3.5 h-3.5 text-orange-500" />{currentUser.location}
            </div>
          )}
          {currentUser.showPhone && currentUser.phone && (
            <div className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <Phone className="w-3.5 h-3.5 text-green-500" />{currentUser.phone}
            </div>
          )}
          <div className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <Calendar className="w-3.5 h-3.5 text-purple-500" />
            {currentUser.joinDate ? new Date(currentUser.joinDate).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' }) : ''}
          </div>
        </div>
      </div>

      {/* ─── Profile Completion ─── */}
      {profileCompletion < 100 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${cardCls} p-4 mb-6`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                <Target className="w-4 h-4" />
              </div>
              <span className={`text-xs font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('profile.completion', 'اكتمال الملف الشخصي')}</span>
            </div>
            <span className="text-xs font-black text-orange-600">{profileCompletion}%</span>
          </div>
          <div className={`w-full h-2.5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${profileCompletion}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className="h-full bg-gradient-to-l from-orange-500 to-orange-600 rounded-full" />
          </div>
          <p className={`text-[10px] mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('profile.completionHint', 'أكمل ملفك لزيادة مصداقيتك')}</p>
        </motion.div>
      )}

      {/* ─── Quick Stats ─── */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-6">
        {statsCards.map(stat => (
          <motion.div key={stat.label} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => setActiveTab(stat.tab)}
            className={`${cardCls} p-3 sm:p-4 text-center transition-colors cursor-pointer`}>
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mx-auto mb-1.5 sm:mb-2 ${stat.color}`}>{stat.icon}</div>
            <p className={`text-base sm:text-lg font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stat.value}</p>
            <p className={`text-[9px] sm:text-[10px] font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ─── Quick Actions ─── */}
      <div className="flex gap-2 mb-6">
        <button onClick={handleShareProfile} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${darkMode ? 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
          <Share2 className="w-3.5 h-3.5" />{t('profile.shareProfile', 'مشاركة')}
        </button>
        <button onClick={() => navigate('/settings')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${darkMode ? 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
          <Settings className="w-3.5 h-3.5" />{t('profile.settings', 'الإعدادات')}
        </button>
        <button onClick={() => navigate('/promotions')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${darkMode ? 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
          <Zap className="w-3.5 h-3.5" />{t('profile.promote', 'ترقية')}
        </button>
      </div>

      {/* ─── Wallet Card ─── */}
      <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 rounded-2xl p-5 text-white shadow-xl shadow-orange-200/40 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/5 rounded-full -ml-12 -mb-12 blur-lg" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md"><Wallet className="w-5 h-5" /></div>
              <span className="font-bold text-base">{t('profile.myWallet', 'محفظتي')}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5" /><span className="text-[10px] font-black">{t('profile.safeProtected', 'آمنة')}</span>
            </div>
          </div>
          <div className="mb-4">
            <span className="text-[11px] block mb-1 text-orange-100">{t('profile.currentBalance', 'الرصيد الحالي')}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tracking-tight">{currentUser.walletBalance?.toLocaleString() || '0'}</span>
              <span className="text-xl font-bold opacity-80">{t('common.egp', 'ج.م')}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-[10px] opacity-80">{t('profile.totalSpent', 'إجمالي الإنفاق')}</p>
              <p className="text-sm font-black">{spending.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-[10px] opacity-80">{t('profile.totalRewards', 'إجمالي المكافآت')}</p>
              <p className="text-sm font-black">{rewards.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/wallet')} className="flex-1 bg-white text-orange-600 py-3 rounded-xl font-black text-sm hover:bg-gray-50 transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2">
              <CreditCard className="w-4 h-4" />{t('profile.chargeWallet', 'شحن')}
            </button>
            <button onClick={() => navigate('/wallet')} className="flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20">
              <Clock className="w-4 h-4" />{t('profile.transactionHistory', 'السجل')}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Interests Section ─── */}
      <div className={`${cardCls} p-5 mb-6`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600'}`}><Sparkles className="w-4 h-4" /></div>
            <h3 className={`font-black text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('profile.myInterests', 'اهتماماتي')}</h3>
          </div>
          <button onClick={() => { setEditInterests(currentUser?.interests || []); setShowInterestPicker(true); }} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
            <Edit3 className="w-3 h-3" />{t('profile.editInterests', 'تعديل')}
          </button>
        </div>
        {currentUser.interests && currentUser.interests.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {currentUser.interests.map((interest, idx) => {
              const data = interestCategories.find(i => i.id === interest);
              return <span key={idx} className={`px-3 py-1.5 rounded-full text-xs font-bold ${interestColors[idx % interestColors.length]}`}>{data ? `${data.icon} ${t(data.nameKey)}` : t(`interests.${interest}`)}</span>;
            })}
          </div>
        ) : <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('profile.addInterests', 'أضف اهتماماتك')}</p>}
      </div>

      {/* ─── Promoted Ads ─── */}
      <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => navigate('/promotions')}
        className={`${cardCls} p-5 mb-6 cursor-pointer transition-all hover:shadow-md`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-600'}`}><Zap className="w-6 h-6" /></div>
            <div>
              <h3 className={`font-black text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('profile.myPromotedAds', 'إعلاناتي المروّجة')}</h3>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('profile.activePromotions', { count: promotionRequests.filter(r => r.postAuthor.id === currentUser.id && r.status === 'approved').length, defaultValue: `${promotionRequests.filter(r => r.postAuthor.id === currentUser.id && r.status === 'approved').length} ترويج نشط` })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className={`w-4 h-4 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
            <ArrowRight className={`w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          </div>
        </div>
      </motion.div>

      {/* ─── Interests Picker Modal ─── */}
      <AnimatePresence>
        {showInterestPicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowInterestPicker(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className={`rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[85vh] flex flex-col ${darkMode ? 'bg-gray-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
              <div className={`flex items-center justify-between p-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <h3 className={`font-black text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('profile.editInterestsBtn', 'تعديل الاهتمامات')}</h3>
                <button onClick={() => setShowInterestPicker(false)} className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 overflow-y-auto flex-1">
                <div className="flex gap-2 mb-4">
                  <button onClick={() => setEditInterests(interestCategories.map(i => i.id))} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}><Check className="w-3.5 h-3.5" />{t('auth.selectAll', 'تحديد الكل')}</button>
                  <button onClick={() => setEditInterests([])} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}><X className="w-3.5 h-3.5" />{t('auth.deselectAll', 'إلغاء الكل')}</button>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
                  <button onClick={() => setPickerGroup('all')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${pickerGroup === 'all' ? (darkMode ? 'bg-gray-600 text-white' : 'bg-gray-900 text-white') : (darkMode ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}`}>{t('common.all', 'الكل')}</button>
                  {interestGroups.map(group => (
                    <button key={group.id} onClick={() => setPickerGroup(group.id)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${pickerGroup === group.id ? (darkMode ? 'bg-gray-600 text-white' : 'bg-gray-900 text-white') : (darkMode ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}`}>
                      <span>{group.icon}</span>{t(group.nameKey)}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(pickerGroup === 'all' ? interestCategories : getInterestsByGroup(pickerGroup as InterestGroup)).map(interest => {
                    const isSelected = editInterests.includes(interest.id);
                    return (
                      <button key={interest.id} onClick={() => setEditInterests(prev => isSelected ? prev.filter(i => i !== interest.id) : [...prev, interest.id])}
                        className={`relative rounded-xl p-3 text-start transition-all overflow-hidden ${isSelected ? `ring-2 ring-orange-500 shadow-sm ${darkMode ? 'bg-gray-700' : 'bg-white'}` : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100 border border-gray-100'}`}>
                        {isSelected && <div className={`absolute inset-0 bg-gradient-to-br ${interest.color} opacity-10`} />}
                        {isSelected && <div className="absolute top-1.5 left-1.5 w-4 h-4 bg-orange-600 rounded-full flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div>}
                        <div className="relative z-10">
                          <div className="flex items-center gap-1.5 mb-1"><span className="text-lg">{interest.icon}</span><span className={`text-[11px] font-black ${isSelected ? (darkMode ? 'text-white' : 'text-gray-900') : (darkMode ? 'text-gray-300' : 'text-gray-700')}`}>{t(interest.nameKey)}</span></div>
                          <p className="text-[9px] leading-relaxed text-gray-400">{t(interest.descriptionKey)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                {editInterests.length > 0 && <p className={`text-center text-xs font-bold mb-3 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>{t('profile.interestsSelected', { count: editInterests.length, defaultValue: `${editInterests.length} اهتمام محدد` })}</p>}
                <button onClick={() => { updateProfile({ interests: editInterests }); setShowInterestPicker(false); toast.success(t('profile.interestsUpdated', 'تم تحديث الاهتمامات')); }} disabled={editInterests.length === 0}
                  className="w-full bg-orange-600 text-white py-3.5 rounded-xl font-black text-sm hover:bg-orange-700 active:scale-95 transition-all shadow-lg shadow-orange-200/40 disabled:opacity-50 disabled:cursor-not-allowed">{t('profile.saveInterests', 'حفظ الاهتمامات')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Edit Profile Modal ─── */}
      <AnimatePresence>
        {isEditing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setIsEditing(false)}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} transition={{ type: 'spring', damping: 25 }}
              className={`rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col ${darkMode ? 'bg-gray-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
              <div className={`flex items-center justify-between p-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <h3 className={`font-black text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('profile.editProfile', 'تعديل الملف الشخصي')}</h3>
                <button onClick={() => setIsEditing(false)} className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                {/* Photo section */}
                <div className="flex gap-3">
                  <button onClick={() => modalAvatarRef.current?.click()} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all active:scale-95 ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    <Camera className="w-4 h-4" />{t('profile.changeAvatar', 'تغيير الصورة')}
                  </button>
                  <button onClick={() => modalCoverRef.current?.click()} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all active:scale-95 ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    <ImageIcon className="w-4 h-4" />{t('profile.changeCover', 'تغيير الغلاف')}
                  </button>
                </div>
                {/* Name */}
                <div>
                  <label className={`text-xs font-bold mb-1.5 block ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('profile.name', 'الاسم')}</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)} className={inputCls} />
                </div>
                {/* Bio */}
                <div>
                  <label className={`text-xs font-bold mb-1.5 block ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('profile.bio', 'النبذة')}</label>
                  <textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={3} className={`${inputCls} resize-none`} />
                </div>
                {/* Phone + Location */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-xs font-bold mb-1.5 block ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('profile.phone', 'الهاتف')}</label>
                    <input value={editPhone} onChange={e => setEditPhone(e.target.value)} className={inputCls} dir="ltr" />
                  </div>
                  <div>
                    <label className={`text-xs font-bold mb-1.5 block ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('profile.location', 'الموقع')}</label>
                    <input value={editLocation} onChange={e => setEditLocation(e.target.value)} className={inputCls} />
                  </div>
                </div>
                {/* Gender */}
                <div>
                  <label className={`text-xs font-bold mb-1.5 block ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('profile.gender', 'الجنس')}</label>
                  <div className="flex gap-2">
                    {(['male', 'female'] as const).map(g => (
                      <button key={g} onClick={() => setEditGender(g)} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${editGender === g ? 'bg-orange-600 text-white' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {g === 'male' ? t('profile.male', 'ذكر') : t('profile.female', 'أنثى')}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Date of Birth */}
                <div>
                  <label className={`text-xs font-bold mb-1.5 block ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('profile.dateOfBirth', 'تاريخ الميلاد')}</label>
                  <div className="grid grid-cols-3 gap-2">
                    <select value={editDobDay} onChange={e => setEditDobDay(e.target.value)} className={inputCls}>
                      <option value="">{t('profile.day', 'يوم')}</option>
                      {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}
                    </select>
                    <select value={editDobMonth} onChange={e => setEditDobMonth(e.target.value)} className={inputCls}>
                      <option value="">{t('profile.month', 'شهر')}</option>
                      {arabicMonths.map((m, i) => <option key={i + 1} value={String(i + 1)}>{m}</option>)}
                    </select>
                    <select value={editDobYear} onChange={e => setEditDobYear(e.target.value)} className={inputCls}>
                      <option value="">{t('profile.year', 'سنة')}</option>
                      {Array.from({ length: 80 }, (_, i) => { const y = new Date().getFullYear() - 14 - i; return <option key={y} value={String(y)}>{y}</option>; })}
                    </select>
                  </div>
                </div>
                {/* Toggles */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('profile.showPhone', 'إظهار الهاتف')}</span>
                    <button onClick={() => setEditShowPhone(!editShowPhone)} className={`relative w-11 h-6 rounded-full transition-colors ${editShowPhone ? 'bg-orange-600' : darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${editShowPhone ? 'left-0.5' : 'left-5'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('profile.showLocation', 'إظهار الموقع')}</span>
                    <button onClick={() => setEditShowLocation(!editShowLocation)} className={`relative w-11 h-6 rounded-full transition-colors ${editShowLocation ? 'bg-orange-600' : darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${editShowLocation ? 'left-0.5' : 'left-5'}`} />
                    </button>
                  </div>
                </div>
              </div>
              <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <button onClick={handleSaveProfile} className="w-full bg-orange-600 text-white py-3.5 rounded-xl font-black text-sm hover:bg-orange-700 active:scale-95 transition-all shadow-lg shadow-orange-200/40">{t('profile.saveChanges', 'حفظ التغييرات')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Tabs ─── */}
      <div className={`flex gap-1 p-1 rounded-xl mb-6 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === tab.id ? (darkMode ? 'bg-gray-700 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm') : (darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')}`}>
            {tab.icon}<span className="hidden sm:inline">{tab.label}</span>
            {tab.badge && tab.badge > 0 && <span className="bg-red-500 text-white text-[8px] font-black min-w-[16px] h-4 flex items-center justify-center rounded-full px-1">{tab.badge}</span>}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ─── */}
      <AnimatePresence mode="wait">
        {/* Posts Tab */}
        {activeTab === 'posts' && (
          <motion.div key="posts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {userPosts.length > 0 ? (
              <div className="space-y-3">{userPosts.map(post => (
                <div key={post.id} onClick={() => navigate(`/post/${post.id}`)} className={`${cardCls} p-4 cursor-pointer transition-all hover:shadow-md`}>
                  {post.image && <img src={post.image} alt="" className="w-full h-40 object-cover rounded-xl mb-3" />}
                  <p className={`text-sm leading-relaxed mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{post.content}</p>
                  <div className={`flex items-center gap-4 text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {post.likes}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {post.comments}</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.reachCount || 0}</span>
                    <span className="mr-auto">{post.timestamp}</span>
                  </div>
                </div>
              ))}</div>
            ) : (
              <div className={`${cardCls} p-12 text-center`}>
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 ${darkMode ? 'bg-gray-700' : 'bg-orange-50'}`}>
                  <FileText className={`w-10 h-10 ${darkMode ? 'text-gray-500' : 'text-orange-300'}`} />
                </div>
                <p className={`font-black text-lg mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{t('profile.noPostsYet', 'لا توجد منشورات')}</p>
                <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{t('profile.startSharing', 'ابدأ بمشاركة أول منشور لك')}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Ads Tab */}
        {activeTab === 'ads' && (
          <motion.div key="ads" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {userAds.length > 0 ? (
              <div className="space-y-3">{userAds.map(ad => (
                <div key={ad.id} onClick={() => navigate(`/post/${ad.id}`)} className={`${cardCls} p-4 cursor-pointer transition-all hover:shadow-md`}>
                  <div className="flex items-start gap-3">
                    {ad.image && <img src={ad.image} alt="" className="w-24 h-24 rounded-xl object-cover flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-relaxed mb-2 line-clamp-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{ad.content}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {ad.price && <span className="text-sm font-black text-orange-600">{ad.price.toLocaleString()} {ad.currency}</span>}
                        {ad.location && <span className={`text-[11px] flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}><MapPin className="w-3 h-3" />{ad.location}</span>}
                      </div>
                      {ad.isPromoted && ad.promotionStatus === 'approved' && (
                        <div className={`mt-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-50 text-yellow-700'}`}>
                          <TrendingUp className="w-3 h-3" />{t('profile.promoted', 'مروّج')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}</div>
            ) : (
              <div className={`${cardCls} p-12 text-center`}>
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 ${darkMode ? 'bg-gray-700' : 'bg-green-50'}`}>
                  <ShoppingBag className={`w-10 h-10 ${darkMode ? 'text-gray-500' : 'text-green-300'}`} />
                </div>
                <p className={`font-black text-lg mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{t('profile.noAdsYet', 'لا توجد إعلانات')}</p>
                <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{t('profile.createFirstAd', 'أنشئ أول إعلان لك')}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <motion.div key="friends" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            {friendRequestsList.length > 0 && (
              <div>
                <h3 className={`text-sm font-black mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <UserPlus className="w-4 h-4 text-orange-500" />{t('profile.friendRequests', 'طلبات الصداقة')}
                  <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{friendRequestsList.length}</span>
                </h3>
                <div className="space-y-2">{friendRequestsList.map((req: any) => (
                  <div key={req.id} className={`${cardCls} flex items-center gap-3 p-3`}>
                    <img src={req.user?.avatar || req.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.user?.id || req.id}`} alt="" className="w-12 h-12 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate(`/user/${req.user?.id || req.user_id}`)} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate cursor-pointer hover:text-orange-600 transition-colors ${darkMode ? 'text-white' : 'text-gray-900'}`} onClick={() => navigate(`/user/${req.user?.id || req.user_id}`)}>{req.user?.name || req.name || 'مستخدم'}</p>
                      <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{req.timestamp ? new Date(req.timestamp).toLocaleDateString('ar-EG') : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleAcceptFriend(req.id)} className="w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 active:scale-90 transition-all" title={t('friends.accept', 'قبول')}><UserCheck className="w-4 h-4" /></button>
                      <button onClick={() => handleRejectFriend(req.id)} className="w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 active:scale-90 transition-all" title={t('friends.reject', 'رفض')}><UserX className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}</div>
              </div>
            )}
            <div>
              <h3 className={`text-sm font-black mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <Users className="w-4 h-4 text-blue-500" />{t('profile.myFriends', 'أصدقائي')}<span className={`text-[10px] font-bold ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>({friendsCount})</span>
              </h3>
              {friendsList.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">{friendsList.map((friend: any) => (
                  <div key={friend.id} onClick={() => navigate(`/user/${friend.id}`)} className={`${cardCls} flex items-center gap-3 p-3 cursor-pointer transition-all hover:shadow-md`}>
                    <img src={friend.avatarBase64 || friend.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.id}`} alt="" className="w-11 h-11 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{friend.name}</p>
                      {friend.location && <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{friend.location}</p>}
                    </div>
                    <ArrowUpRight className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  </div>
                ))}</div>
              ) : (
                <div className={`${cardCls} p-12 text-center`}>
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                    <Users className={`w-10 h-10 ${darkMode ? 'text-gray-500' : 'text-blue-300'}`} />
                  </div>
                  <p className={`font-black text-lg mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{t('profile.noFriendsYet', 'لا يوجد أصدقاء')}</p>
                  <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{t('profile.addFriends', 'ابدأ بإضافة أصدقاء')}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <motion.div key="about" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            {/* Personal Info Card */}
            <div className={`${cardCls} p-5`}>
              <h3 className={`font-black text-sm mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <UserIcon className="w-4 h-4 text-orange-500" />{t('profile.personalInfo', 'المعلومات الشخصية')}
              </h3>
              <div className="space-y-3">
                {currentUser.gender && (
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-600'}`}><UserIcon className="w-4 h-4" /></div>
                    <div><p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('profile.gender', 'الجنس')}</p><p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{currentUser.gender === 'male' ? t('profile.male', 'ذكر') : t('profile.female', 'أنثى')}</p></div>
                  </div>
                )}
                {(currentUser.dateOfBirth || currentUser.age) && (
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600'}`}><Calendar className="w-4 h-4" /></div>
                    <div><p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('profile.dateOfBirth', 'تاريخ الميلاد')}</p><p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{currentUser.dateOfBirth ? new Date(currentUser.dateOfBirth).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}{currentUser.age ? ` (${currentUser.age} ${t('profile.years', 'سنة')})` : ''}</p></div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'}`}><Calendar className="w-4 h-4" /></div>
                  <div><p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('profile.joinDate', 'تاريخ الانضمام')}</p><p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{currentUser.joinDate ? new Date(currentUser.joinDate).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</p></div>
                </div>
                {currentUser.location && (
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><MapPin className="w-4 h-4" /></div>
                    <div><p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('profile.location', 'الموقع')}</p><p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{currentUser.showLocation ? currentUser.location : <Lock className="w-3 h-3 inline" />}</p></div>
                  </div>
                )}
                {currentUser.phone && (
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}><Phone className="w-4 h-4" /></div>
                    <div><p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('profile.phone', 'الهاتف')}</p><p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{currentUser.showPhone ? currentUser.phone : <span className="flex items-center gap-1"><Lock className="w-3 h-3" />{t('profile.hidden', 'مخفي')}</span>}</p></div>
                  </div>
                )}
              </div>
            </div>
            {/* Trust & Verification Card */}
            <div className={`${cardCls} p-5`}>
              <h3 className={`font-black text-sm mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <ShieldCheck className="w-4 h-4 text-green-500" />{t('profile.trustVerification', 'الثقة والتوثيق')}
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('profile.trustScore', 'نسبة الثقة')}</span>
                    <span className="text-xs font-black text-orange-600">{currentUser.trustScore || 0}%</span>
                  </div>
                  <div className={`w-full h-2.5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div className="h-full bg-gradient-to-l from-green-500 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${currentUser.trustScore || 0}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${currentUser.isVerified ? (darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600') : (darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400')}`}>
                    <BadgeCheck className="w-4 h-4" />
                  </div>
                  <div><p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('profile.verificationStatus', 'حالة التوثيق')}</p><p className={`text-sm font-bold ${currentUser.isVerified ? 'text-blue-500' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{currentUser.isVerified ? t('profile.verified', 'موثق') : t('profile.notVerified', 'غير موثق')}</p></div>
                </div>
              </div>
            </div>
            {/* Payment Methods Card */}
            {currentUser.paymentMethods && currentUser.paymentMethods.length > 0 && (
              <div className={`${cardCls} p-5`}>
                <h3 className={`font-black text-sm mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <CreditCard className="w-4 h-4 text-orange-500" />{t('profile.paymentMethods', 'طرق الدفع')}
                </h3>
                <div className="space-y-2">{currentUser.paymentMethods.map(pm => (
                  <div key={pm.id} className={`flex items-center gap-3 p-2.5 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <span className="text-lg">{pm.icon}</span>
                    <div><p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{pm.name}</p><p className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{pm.details}</p></div>
                  </div>
                ))}</div>
              </div>
            )}
          </motion.div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <motion.div key="activity" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {activityItems.length > 0 ? (
              <div className="space-y-2">{activityItems.map(item => (
                <div key={item.id} className={`${cardCls} flex items-center gap-3 p-4`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${item.iconBg}`}>{item.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.text}</p>
                    <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{item.relative || item.time}</p>
                  </div>
                </div>
              ))}</div>
            ) : (
              <div className={`${cardCls} p-12 text-center`}>
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 ${darkMode ? 'bg-gray-700' : 'bg-purple-50'}`}>
                  <Activity className={`w-10 h-10 ${darkMode ? 'text-gray-500' : 'text-purple-300'}`} />
                </div>
                <p className={`font-black text-lg mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{t('profile.noActivity', 'لا يوجد نشاط')}</p>
                <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{t('profile.activityWillAppear', 'سيظهر النشاط هنا')}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
