import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { interestCategories } from '../config/interests';
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Phone,
  ShoppingBag,
  FileText,
  User as UserIcon,
  Calendar,
  Award,
  MessageCircle,
  UserPlus,
  RefreshCw,
  Radio,
  Users,
  Share2,
  Flag,
  Ban,
  MoreVertical,
  Eye,
  Clock,
  Heart,
  Package,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

type ProfileTab = 'posts' | 'ads' | 'about';

const INTEREST_COLORS = [
  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
];

export const UserProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { darkMode, posts, sendMessage, isUserOnlineWs } = useAppContext();
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const { dir } = useLanguage();

  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [targetUser, setTargetUser] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingFriendRequest, setSendingFriendRequest] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUserLive, setIsUserLive] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const [mutualFriends, setMutualFriends] = useState<any[]>([]);
  const [friendsCount, setFriendsCount] = useState(0);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const isOnline = userId ? isUserOnlineWs(userId) : false;

  // Fetch user profile
  useEffect(() => {
    if (!userId) { setTargetUser(null); setLoading(false); return; }
    setLoading(true); setError(null);
    api.getUserProfile(userId)
      .then((data: any) => {
        if (data && data.id) {
          setTargetUser(data);
          if (data.posts && Array.isArray(data.posts)) {
            setUserPosts(data.posts.map((p: any) => ({
              id: p.id, content: p.content || '', image: p.image || undefined,
              likes: p.likes || 0, comments: p.comments || 0, shares: p.shares || 0,
              timestamp: p.created_at || '', type: p.type || 'ad',
              price: p.price || undefined, currency: p.currency || 'EGP',
              location: p.location || undefined, category: p.category || undefined, status: p.status,
            })));
          }
          if (currentUser && currentUser.id !== userId) {
            api.getFriendshipStatus(userId).then(d => {
              setFriendshipStatus(d?.friendshipStatus || null);
              setLastSeenAt(d?.lastSeenAt || null);
            }).catch(() => { setFriendshipStatus(null); });
          }
        } else { setTargetUser(null); setError(t('userProfile.userNotFound', 'المستخدم غير موجود')); }
      })
      .catch(() => { setTargetUser(null); setError(t('userProfile.profileLoadFailed', 'فشل تحميل الملف الشخصي')); })
      .finally(() => setLoading(false));
  }, [userId, currentUser]);

  // Check live status
  useEffect(() => {
    if (!userId) return;
    const check = async () => { try { const s = await api.getActiveLivestreams(); if (Array.isArray(s)) setIsUserLive(s.some((x: any) => x.hostId === userId)); } catch {} };
    check(); const iv = setInterval(check, 15000); return () => clearInterval(iv);
  }, [userId]);

  // Fetch mutual friends & friends count
  useEffect(() => {
    if (!userId || !currentUser || currentUser.id === userId) return;
    Promise.all([api.getFriendsList().catch(() => []), api.getUserProfile(userId).catch(() => ({}) as any)])
      .then(([myFriends, _]) => {
        const mine = Array.isArray(myFriends) ? myFriends : [];
        setFriendsCount(mine.length);
        // Approximate mutuals from own friend list (API may return mutualFriends on profile)
        if ((targetUser as any)?.mutualFriends) {
          setMutualFriends((targetUser as any).mutualFriends);
        }
      }).catch(() => {});
  }, [userId, currentUser, targetUser?.id]);

  const handleSendFriendRequest = async () => {
    if (!userId) return;
    setSendingFriendRequest(true);
    try {
      await api.sendFriendRequest(userId);
      setFriendshipStatus('pending');
      toast.success(t('userProfile.friendRequestSent', 'تم إرسال طلب الصداقة'));
      navigate('/friends?tab=sent');
    } catch (err: any) { toast.error(err.message || t('userProfile.friendRequestFailed', 'فشل إرسال طلب الصداقة')); }
    finally { setSendingFriendRequest(false); }
  };

  const handleMessage = () => { if (targetUser) navigate(`/messages?chat=${targetUser.id}`); };

  const handleShareProfile = () => {
    const url = `${window.location.origin}/user/${userId}`;
    if (navigator.share) { navigator.share({ title: targetUser?.name || 'نواقص', url }).catch(() => {}); }
    else { navigator.clipboard.writeText(url); toast.success(t('userProfile.linkCopied', 'تم نسخ الرابط')); }
  };

  const handleBlockUser = async () => {
    if (!userId || blocking) return;
    setBlocking(true);
    try { await api.blockUser(userId); toast.success(t('userProfile.userBlocked', 'تم حظر المستخدم')); navigate(-1); }
    catch (err: any) { toast.error(err.message || t('userProfile.blockFailed', 'فشل حظر المستخدم')); }
    finally { setBlocking(false); setShowActionMenu(false); }
  };

  const handleReportUser = () => {
    navigate(`/complaint?userId=${userId}`);
    setShowActionMenu(false);
  };

  const formatLastSeen = (dateStr: string | null) => {
    if (!dateStr) return t('userProfile.offline', 'غير متصل');
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return t('userProfile.justNow', 'الآن');
    if (diffMin < 60) return t('common.minutesAgo', `منذ ${diffMin} دقيقة`, { count: diffMin });
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return t('common.hoursAgo', `منذ ${diffH} ساعة`, { count: diffH });
    const diffD = Math.floor(diffH / 24);
    return t('common.daysAgo', `منذ ${diffD} يوم`, { count: diffD });
  };

  const userAds = useMemo(() => userPosts.filter((p: any) => p.type === 'ad'), [userPosts]);

  // ─── Loading State ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto" dir={dir}>
        <div className="h-48 rounded-2xl animate-pulse" style={{ background: darkMode ? 'linear-gradient(to left, #9a3412, #c2410c, #dc2626)' : 'linear-gradient(to left, #ea580c, #f97316, #ef4444)', opacity: 0.5 }} />
        <div className="px-4 -mt-14">
          <div className={`w-28 h-28 rounded-2xl border-4 ${darkMode ? 'border-gray-900' : 'border-white'} animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
        </div>
        <div className="px-4 mt-4 space-y-3">
          <div className={`h-6 w-40 rounded-lg animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
          <div className={`h-4 w-64 rounded-lg animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
          <div className="grid grid-cols-4 gap-3 mt-4">
            {[1,2,3,4].map(i => <div key={i} className={`h-20 rounded-2xl animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />)}
          </div>
        </div>
      </div>
    );
  }

  // ─── Error State ──────────────────────────────────────────────────
  if (!targetUser) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20" dir={dir}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <UserIcon className={`w-10 h-10 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
          </div>
        </motion.div>
        <h2 className={`text-xl font-black mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{error || t('userProfile.userNotFound', 'المستخدم غير موجود')}</h2>
        <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{userId ? t('userProfile.userNotFoundDesc', 'لم يتم العثور على هذا المستخدم') : t('userProfile.noUserSelected', 'لم يتم تحديد مستخدم')}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('/')} className="bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-orange-700 transition-colors">{t('userProfile.backToHome', 'العودة للرئيسية')}</button>
          {userId && <button onClick={() => window.location.reload()} className={`px-6 py-2.5 rounded-xl font-bold ${darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t('userProfile.retry', 'إعادة المحاولة')}</button>}
        </div>
      </div>
    );
  }

  const avatarUrl = targetUser.avatarBase64 || targetUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetUser.id}`;
  const coverPhoto = targetUser.coverPhoto || targetUser.cover_photo;
  const trustScore = targetUser.trust_score || targetUser.trustScore || 0;
  const joinDate = targetUser.join_date || targetUser.joinDate || targetUser.created_at;

  const trustColor = trustScore >= 80 ? 'text-green-500' : trustScore >= 50 ? 'text-amber-500' : 'text-red-500';
  const trustBarColor = trustScore >= 80 ? 'bg-green-500' : trustScore >= 50 ? 'bg-amber-500' : 'bg-red-500';

  const tabs: { id: ProfileTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'posts', label: t('userProfile.tabPosts', 'المنشورات'), icon: <FileText className="w-4 h-4" />, count: userPosts.length },
    { id: 'ads', label: t('userProfile.tabAds', 'الإعلانات'), icon: <ShoppingBag className="w-4 h-4" />, count: userAds.length },
    { id: 'about', label: t('userProfile.tabAbout', 'نبذة'), icon: <UserIcon className="w-4 h-4" /> },
  ];

  const stats = [
    { label: t('userProfile.tabPosts', 'المنشورات'), value: userPosts.length, icon: <FileText className="w-5 h-5" />, color: darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600' },
    { label: t('userProfile.tabAds', 'الإعلانات'), value: userAds.length, icon: <ShoppingBag className="w-5 h-5" />, color: darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600' },
    { label: t('userProfile.trustScore', 'نسبة الثقة'), value: `${trustScore}%`, icon: <Award className="w-5 h-5" />, color: darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600' },
    { label: t('userProfile.friends', 'الأصدقاء'), value: friendsCount, icon: <Users className="w-5 h-5" />, color: darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-600' },
  ];

  return (
    <div className="max-w-2xl mx-auto" dir={dir}>
      {/* ─── Cover & Avatar ──────────────────────────────────────── */}
      <div className="relative mb-20">
        <div className="h-52 sm:h-60 relative rounded-2xl overflow-hidden">
          {coverPhoto ? (
            <img src={coverPhoto} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-l from-orange-500 via-orange-600 to-red-500" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          {/* Back button */}
          <button onClick={() => navigate(-1)} className="absolute top-3 right-3 z-20 w-10 h-10 rounded-xl flex items-center justify-center bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors">
            <ArrowRight className="w-5 h-5" />
          </button>
          {/* Action buttons on cover */}
          {currentUser && currentUser.id !== targetUser.id && (
            <div className="absolute top-3 left-3 flex gap-2 z-20">
              {isUserLive && (
                <motion.button onClick={() => navigate(`/live-stream/${targetUser.id}`)} animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-red-500 text-white hover:bg-red-600 backdrop-blur-md shadow-lg">
                  <Radio className="w-3.5 h-3.5" /> {t('userProfile.watchLive', 'شاهد البث')}
                </motion.button>
              )}
              <button onClick={handleMessage} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/20 text-white hover:bg-white/30 backdrop-blur-md shadow-lg transition-colors">
                <MessageCircle className="w-3.5 h-3.5" /> {t('userProfile.message', 'مراسلة')}
              </button>
              {friendshipStatus === 'accepted' ? (
                <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-green-500/30 text-green-200 backdrop-blur-md">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t('userProfile.friend', 'صديق')}
                </span>
              ) : friendshipStatus === 'pending' ? (
                <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-yellow-500/30 text-yellow-200 backdrop-blur-md">
                  <Clock className="w-3.5 h-3.5" /> {t('userProfile.pending', 'قيد الانتظار')}
                </span>
              ) : (
                <button onClick={handleSendFriendRequest} disabled={sendingFriendRequest} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-orange-600 text-white hover:bg-orange-700 backdrop-blur-md shadow-lg transition-colors disabled:opacity-50">
                  {sendingFriendRequest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />} {t('userProfile.addFriend', 'إضافة صديق')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="absolute -bottom-16 right-5">
          <div className="relative">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15 }} className={`w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-4 ${darkMode ? 'border-gray-900' : 'border-white'} shadow-2xl overflow-hidden`}>
              <img src={avatarUrl} alt={targetUser.name} className="w-full h-full object-cover" />
            </motion.div>
            {/* Online indicator */}
            {isOnline && (
              <div className="absolute bottom-1 left-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow-lg" />
            )}
            {targetUser.is_verified && (
              <div className="absolute -bottom-1 -left-1 w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center border-2 border-white shadow-lg z-10">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Share & More buttons */}
        <div className="absolute bottom-4 left-5 flex gap-2">
          <button onClick={handleShareProfile} className={`w-9 h-9 rounded-xl flex items-center justify-center ${darkMode ? 'bg-gray-800/80 text-gray-300 hover:bg-gray-700' : 'bg-white/90 text-gray-600 hover:bg-white'} backdrop-blur-md shadow-lg transition-colors`}>
            <Share2 className="w-4 h-4" />
          </button>
          {currentUser && currentUser.id !== targetUser.id && (
            <div className="relative">
              <button onClick={() => setShowActionMenu(!showActionMenu)} className={`w-9 h-9 rounded-xl flex items-center justify-center ${darkMode ? 'bg-gray-800/80 text-gray-300 hover:bg-gray-700' : 'bg-white/90 text-gray-600 hover:bg-white'} backdrop-blur-md shadow-lg transition-colors`}>
                <MoreVertical className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showActionMenu && (
                  <motion.div initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -5 }} className={`absolute left-0 bottom-11 w-44 rounded-xl border shadow-xl z-30 overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <button onClick={handleReportUser} className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-bold transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                      <Flag className="w-4 h-4 text-amber-500" /> {t('userProfile.reportUser', 'الإبلاغ')}
                    </button>
                    <button onClick={handleBlockUser} disabled={blocking} className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-bold transition-colors ${darkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-red-50'}`}>
                      <Ban className="w-4 h-4" /> {blocking ? <RefreshCw className="w-4 h-4 animate-spin" /> : null} {t('userProfile.blockUser', 'حظر المستخدم')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close action menu */}
      {showActionMenu && <div className="fixed inset-0 z-20" onClick={() => setShowActionMenu(false)} />}

      {/* ─── User Info ────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="px-1 mb-5">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h2 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{targetUser.name}</h2>
          {targetUser.is_verified && <CheckCircle2 className="w-5 h-5 text-orange-600 fill-orange-600/10" />}
          {isUserLive && (
            <motion.button onClick={() => navigate(`/live-stream/${targetUser.id}`)} animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500 text-white text-[11px] font-black shadow-lg shadow-red-500/30">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> <Radio className="w-3 h-3" /> {t('userProfile.liveNow', 'مباشر')}
            </motion.button>
          )}
        </div>
        {/* Online / Last Seen */}
        <div className="flex items-center gap-2 mb-2">
          {isOnline ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-green-500"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> {t('userProfile.onlineNow', 'متصل الآن')}</span>
          ) : lastSeenAt ? (
            <span className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}><Clock className="w-3 h-3" /> {formatLastSeen(lastSeenAt)}</span>
          ) : null}
        </div>
        {/* Badges */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {trustScore > 0 && <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-[11px] px-2.5 py-1 rounded-lg font-bold flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />{trustScore}%</div>}
          {targetUser.gender && <div className={`text-[11px] px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 ${targetUser.gender === 'female' ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400'}`}>{targetUser.gender === 'female' ? t('userProfile.female', 'أنثى') : t('userProfile.male', 'ذكر')}</div>}
          {targetUser.is_admin && <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-[11px] px-2.5 py-1 rounded-lg font-bold">{t('userProfile.admin', 'مدير')}</div>}
          {targetUser.is_trusted && <div className="bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 text-[11px] px-2.5 py-1 rounded-lg font-bold">{t('userProfile.trusted', 'موثوق')}</div>}
        </div>
        {targetUser.bio && <p className={`text-sm mb-3 leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{targetUser.bio}</p>}
        <div className="flex items-center gap-4 flex-wrap">
          {targetUser.location && <div className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}><MapPin className="w-3.5 h-3.5 text-orange-500" />{targetUser.location}</div>}
          {targetUser.phone && (targetUser.show_phone !== false) && <div className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}><Phone className="w-3.5 h-3.5 text-green-500" />{targetUser.phone}</div>}
        </div>
      </motion.div>

      {/* ─── Mutual Friends ───────────────────────────────────────── */}
      {mutualFriends.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className={`mb-5 rounded-2xl border p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-orange-500" />
            <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('userProfile.mutualFriends', 'أصدقاء مشتركين')}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>{mutualFriends.length}</span>
          </div>
          <div className="flex items-center -space-x-2 rtl:space-x-reverse">
            {mutualFriends.slice(0, 5).map((f: any) => (
              <img key={f.id} src={f.avatarBase64 || f.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.id}`} alt={f.name} className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 object-cover" title={f.name} />
            ))}
            {mutualFriends.length > 5 && <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${darkMode ? 'bg-gray-700 border-gray-800 text-gray-300' : 'bg-gray-100 border-white text-gray-500'}`}>+{mutualFriends.length - 5}</div>}
          </div>
        </motion.div>
      )}

      {/* ─── Stats Cards ──────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-4 gap-2 sm:gap-3 mb-6">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} whileHover={{ y: -2 }} className={`rounded-2xl border p-3 text-center transition-shadow hover:shadow-md ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-1.5 ${stat.color}`}>{stat.icon}</div>
            <p className={`text-lg font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stat.value}</p>
            <p className={`text-[10px] font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* ─── Tabs ─────────────────────────────────────────────────── */}
      <div className={`flex gap-1 p-1 rounded-xl mb-6 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.id
                ? darkMode ? 'bg-gray-700 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm'
                : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab.icon} {tab.label}
            {tab.count !== undefined && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-orange-600 text-white' : darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ──────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === 'posts' && (
          <motion.div key="posts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            {userPosts.length > 0 ? (
              <div className="space-y-3">
                {userPosts.map((post: any) => (
                  <motion.div key={post.id} whileHover={{ scale: 1.01 }} onClick={() => navigate(`/post/${post.id}`)} className={`rounded-2xl border p-4 cursor-pointer transition-colors ${darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                    <p className={`text-sm leading-relaxed mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{post.content}</p>
                    {post.image && <img src={post.image} alt="" className="w-full rounded-xl mb-2 max-h-48 object-cover" />}
                    <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                      <span>{post.timestamp}</span><span>·</span>
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{post.likes}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{post.comments}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<FileText className="w-10 h-10" />} title={t('userProfile.noPostsYet', 'لا توجد منشورات بعد')} darkMode={darkMode} />
            )}
          </motion.div>
        )}

        {activeTab === 'ads' && (
          <motion.div key="ads" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            {userAds.length > 0 ? (
              <div className="space-y-3">
                {userAds.map((ad: any) => (
                  <motion.div key={ad.id} whileHover={{ scale: 1.01 }} onClick={() => navigate(`/post/${ad.id}`)} className={`rounded-2xl border p-4 cursor-pointer transition-colors ${darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                    <div className="flex items-start gap-3">
                      {ad.image && <img src={ad.image} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-relaxed mb-2 line-clamp-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{ad.content}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {ad.price && <span className="text-sm font-black text-orange-600">{ad.price.toLocaleString()} {ad.currency}</span>}
                          {ad.location && <span className={`text-[11px] flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}><MapPin className="w-3 h-3" />{ad.location}</span>}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<ShoppingBag className="w-10 h-10" />} title={t('userProfile.noAdsYet', 'لا توجد إعلانات بعد')} darkMode={darkMode} />
            )}
          </motion.div>
        )}

        {activeTab === 'about' && (
          <motion.div key="about" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-4">
            {/* Personal Info Card */}
            <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`px-5 py-3 font-bold text-sm flex items-center gap-2 ${darkMode ? 'bg-gray-750 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
                <UserIcon className="w-4 h-4 text-orange-500" /> {t('userProfile.personalInfo', 'المعلومات الشخصية')}
              </div>
              <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                <AboutRow icon={<UserIcon className="w-4 h-4" />} iconBg={darkMode ? 'bg-sky-900/30 text-sky-400' : 'bg-sky-50 text-sky-600'} label={t('userProfile.aboutName', 'الاسم')} value={targetUser.name} darkMode={darkMode} />
                {targetUser.gender && <AboutRow icon={<UserIcon className="w-4 h-4" />} iconBg={targetUser.gender === 'female' ? (darkMode ? 'bg-pink-900/30 text-pink-400' : 'bg-pink-50 text-pink-600') : (darkMode ? 'bg-sky-900/30 text-sky-400' : 'bg-sky-50 text-sky-600')} label={t('userProfile.aboutGender', 'الجنس')} value={targetUser.gender === 'female' ? t('userProfile.female', 'أنثى') : t('userProfile.male', 'ذكر')} darkMode={darkMode} />}
                {(targetUser.date_of_birth || targetUser.dateOfBirth) && <AboutRow icon={<Calendar className="w-4 h-4" />} iconBg={darkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-600'} label={t('userProfile.dob', 'تاريخ الميلاد')} value={new Date(targetUser.date_of_birth || targetUser.dateOfBirth).toLocaleDateString(dir === 'rtl' ? 'ar-EG' : 'en-US')} darkMode={darkMode} />}
                {targetUser.location && <AboutRow icon={<MapPin className="w-4 h-4" />} iconBg={darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-600'} label={t('userProfile.aboutLocation', 'الموقع')} value={targetUser.location} darkMode={darkMode} />}
                {targetUser.phone && (targetUser.show_phone !== false) && <AboutRow icon={<Phone className="w-4 h-4" />} iconBg={darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'} label={t('userProfile.phone', 'الهاتف')} value={targetUser.phone} darkMode={darkMode} />}
                {joinDate && <AboutRow icon={<Calendar className="w-4 h-4" />} iconBg={darkMode ? 'bg-violet-900/30 text-violet-400' : 'bg-violet-50 text-violet-600'} label={t('userProfile.aboutJoinDate', 'تاريخ الانضمام')} value={new Date(joinDate).toLocaleDateString(dir === 'rtl' ? 'ar-EG' : 'en-US')} darkMode={darkMode} />}
              </div>
            </div>

            {/* Trust & Verification Card */}
            <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`px-5 py-3 font-bold text-sm flex items-center gap-2 ${darkMode ? 'bg-gray-750 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
                <ShieldCheck className="w-4 h-4 text-orange-500" /> {t('userProfile.trustVerification', 'الثقة والتوثيق')}
              </div>
              <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('userProfile.trustScore', 'نسبة الثقة')}</span>
                    <span className={`text-sm font-black ${trustColor}`}>{trustScore}%</span>
                  </div>
                  <div className={`w-full h-2.5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${trustScore}%` }} transition={{ duration: 0.8, delay: 0.2 }} className={`h-full rounded-full ${trustBarColor}`} />
                  </div>
                </div>
                <AboutRow icon={<CheckCircle2 className="w-4 h-4" />} iconBg={targetUser.is_verified ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600') : (darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-400')} label={t('userProfile.aboutVerification', 'حالة التوثيق')} value={targetUser.is_verified ? t('userProfile.verified', 'موثّق') : t('userProfile.unverified', 'غير موثّق')} darkMode={darkMode} valueColor={targetUser.is_verified ? 'text-green-600' : undefined} />
              </div>
            </div>

            {/* Interests Card */}
            {targetUser.interests && Array.isArray(targetUser.interests) && targetUser.interests.length > 0 && (
              <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className={`px-5 py-3 font-bold text-sm flex items-center gap-2 ${darkMode ? 'bg-gray-750 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
                  <Package className="w-4 h-4 text-orange-500" /> {t('userProfile.interests', 'الاهتمامات')}
                </div>
                <div className="p-4 flex flex-wrap gap-2">
                  {targetUser.interests.map((int: string, idx: number) => {
                    const category = interestCategories.find(c => c.id === int);
                    const colorClass = INTEREST_COLORS[idx % INTEREST_COLORS.length];
                    return (
                      <motion.span key={int} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}
                        className={`text-[11px] px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 ${colorClass}`}>
                        {category?.icon && <span>{category.icon}</span>}
                        {t(`interests.${int}`, int)}
                      </motion.span>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────────────

function AboutRow({ icon, iconBg, label, value, darkMode, valueColor }: {
  icon: React.ReactNode; iconBg: string; label: string; value: string; darkMode: boolean; valueColor?: string;
}) {
  return (
    <div className="px-5 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>{icon}</div>
        <span className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
      </div>
      <span className={`text-sm font-bold ${valueColor || (darkMode ? 'text-white' : 'text-gray-900')}`}>{value}</span>
    </div>
  );
}

function EmptyState({ icon, title, darkMode }: { icon: React.ReactNode; title: string; darkMode: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`p-12 text-center rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
        <div className={darkMode ? 'text-gray-500' : 'text-gray-300'}>{icon}</div>
      </div>
      <p className={`font-bold ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{title}</p>
      <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{darkMode ? '—' : '—'}</p>
    </motion.div>
  );
}
