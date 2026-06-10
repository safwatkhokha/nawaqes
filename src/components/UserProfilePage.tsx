import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';

type ProfileTab = 'posts' | 'ads' | 'about';

export const UserProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { darkMode, posts, sendMessage } = useAppContext();
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

  // Fetch user profile from API
  useEffect(() => {
    if (!userId) {
      setTargetUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    
    api.getUserProfile(userId)
      .then((data: any) => {
        if (data && data.id) {
          setTargetUser(data);
          // Map posts from API
          if (data.posts && Array.isArray(data.posts)) {
            const mapped = data.posts.map((p: any) => ({
              id: p.id,
              content: p.content || '',
              image: p.image || undefined,
              likes: p.likes || 0,
              comments: p.comments || 0,
              shares: p.shares || 0,
              timestamp: p.created_at || '',
              type: p.type || 'ad',
              price: p.price || undefined,
              currency: p.currency || 'EGP',
              location: p.location || undefined,
              category: p.category || undefined,
              status: p.status,
            }));
            setUserPosts(mapped);
          }
          // Check friendship status using the dedicated endpoint
          if (currentUser && currentUser.id !== userId) {
            api.getFriendshipStatus(userId).then(data => {
              setFriendshipStatus(data?.friendshipStatus || null);
            }).catch(() => {
              setFriendshipStatus(null);
            });
          }
        } else {
          setTargetUser(null);
          setError(t('userProfile.userNotFound'));
        }
      })
      .catch((err) => {
        console.error('Error fetching user profile:', err);
        setTargetUser(null);
        setError(t('userProfile.profileLoadFailed'));
      })
      .finally(() => setLoading(false));
  }, [userId, currentUser]);

  // Check if this user is currently live streaming
  useEffect(() => {
    if (!userId) return;
    const checkLiveStatus = async () => {
      try {
        const activeStreams = await api.getActiveLivestreams();
        if (Array.isArray(activeStreams)) {
          setIsUserLive(activeStreams.some((s: any) => s.hostId === userId));
        }
      } catch {}
    };
    checkLiveStatus();
    // Poll every 15 seconds
    const interval = setInterval(checkLiveStatus, 15000);
    return () => clearInterval(interval);
  }, [userId]);

  const handleSendFriendRequest = async () => {
    if (!userId) return;
    setSendingFriendRequest(true);
    try {
      await api.sendFriendRequest(userId);
      setFriendshipStatus('pending');
      toast.success(t('userProfile.friendRequestSent'));
      // Redirect to friend requests page so user can see sent requests
      navigate('/friends?tab=sent');
    } catch (err: any) {
      toast.error(err.message || t('userProfile.friendRequestFailed'));
    } finally {
      setSendingFriendRequest(false);
    }
  };

  const handleMessage = async () => {
    if (!targetUser) return;
    try {
      navigate(`/messages?chat=${targetUser.id}`);
    } catch (err: any) {
      toast.error(err.message || t('userProfile.conversationFailed'));
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20" dir={dir}>
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-orange-500 mb-4" />
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('userProfile.loadingProfile')}</p>
      </div>
    );
  }

  if (!targetUser) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20" dir={dir}>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <UserIcon className={`w-8 h-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
        </div>
        <h2 className={`text-xl font-black mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {error || t('userProfile.userNotFound')}
        </h2>
        <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {userId ? t('userProfile.userNotFoundDesc') : t('userProfile.noUserSelected')}
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('/')} className="bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-orange-700">{t('userProfile.backToHome')}</button>
          {userId && (
            <button onClick={() => window.location.reload()} className={`px-6 py-2.5 rounded-xl font-bold ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t('userProfile.retry')}</button>
          )}
        </div>
      </div>
    );
  }

  const userAds = userPosts.filter((p: any) => p.type === 'ad');

  const tabs: { id: ProfileTab; label: string; icon: React.ReactNode }[] = [
    { id: 'posts', label: t('userProfile.tabPosts'), icon: <FileText className="w-4 h-4" /> },
    { id: 'ads', label: t('userProfile.tabAds'), icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'about', label: t('userProfile.tabAbout'), icon: <UserIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-2xl mx-auto" dir={dir}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('userProfile.title')}</h1>
      </div>

      {/* Cover Image */}
      <div className="relative mb-20">
        <div className="h-40 bg-gradient-to-l from-orange-500 via-orange-600 to-red-500 relative rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ij48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCA0LTRzNCAyIDQgNC0yIDQtNCA0LTQtMi00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        </div>

        {/* Avatar */}
        <div className="absolute -bottom-14 right-6">
          <div className="relative">
            <div className={`w-28 h-28 rounded-2xl border-4 ${darkMode ? 'border-gray-800' : 'border-white'} shadow-xl overflow-hidden`}>
              <img src={targetUser.avatarBase64 || targetUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetUser.id}`} alt={targetUser.name} className="w-full h-full object-cover" />
            </div>
            {targetUser.is_verified && (
              <div className="absolute -bottom-1 -left-1 w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center border-2 border-white shadow-lg z-10">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {currentUser && currentUser.id !== targetUser.id && (
          <div className="absolute top-4 left-4 flex gap-2 z-10">
            {isUserLive && (
              <button
                onClick={() => navigate('/live-stream')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-all active:scale-95 backdrop-blur-md shadow-lg animate-pulse"
              >
                <Radio className="w-3.5 h-3.5" />
                {t('userProfile.watchLive', 'شاهد البث')}
              </button>
            )}
            <button
              onClick={handleMessage}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                darkMode ? 'bg-gray-800/80 text-gray-200 hover:bg-gray-700' : 'bg-white/90 text-gray-700 hover:bg-white'
              } backdrop-blur-md shadow-lg`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              {t('userProfile.message')}
            </button>
            {friendshipStatus === 'accepted' ? (
              <span className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-green-50 text-green-600 backdrop-blur-md shadow-lg">
                <CheckCircle2 className="w-3.5 h-3.5" /> {t('userProfile.friend')}
              </span>
            ) : friendshipStatus === 'pending' ? (
              <span className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-yellow-50 text-yellow-600 backdrop-blur-md shadow-lg">
                {t('userProfile.pending')}
              </span>
            ) : (
              <button
                onClick={handleSendFriendRequest}
                disabled={sendingFriendRequest}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-orange-600 text-white hover:bg-orange-700 transition-all active:scale-95 backdrop-blur-md shadow-lg disabled:opacity-50"
              >
                {sendingFriendRequest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                {t('userProfile.addFriend')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* User Info */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h2 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{targetUser.name}</h2>
          {targetUser.is_verified && <CheckCircle2 className="w-5 h-5 text-orange-600 fill-orange-600/10" />}
          {isUserLive && (
            <motion.button
              onClick={() => navigate('/live-stream')}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500 text-white text-[11px] font-black shadow-lg shadow-red-500/30 hover:bg-red-600 transition-colors"
            >
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <Radio className="w-3 h-3" />
              {t('userProfile.liveNow', 'مباشر')}
            </motion.button>
          )}
        </div>
        <div className="flex items-center gap-3 mb-3">
          {targetUser.trust_score && (
            <div className="bg-green-50 text-green-700 text-[11px] px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {targetUser.trust_score}% {t('userProfile.trustScore')}
            </div>
          )}
          {targetUser.gender && (
            <div className={`text-[11px] px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 ${targetUser.gender === 'female' ? 'bg-pink-50 text-pink-700' : 'bg-blue-50 text-blue-700'}`}>
              {targetUser.gender === 'female' ? t('userProfile.female') : t('userProfile.male')}
            </div>
          )}
          {targetUser.is_admin && (
            <div className="bg-orange-50 text-orange-700 text-[11px] px-2.5 py-1 rounded-lg font-bold">{t('userProfile.admin')}</div>
          )}
          {targetUser.is_trusted && (
            <div className="bg-blue-50 text-blue-700 text-[11px] px-2.5 py-1 rounded-lg font-bold">{t('userProfile.trusted')}</div>
          )}
        </div>
        {targetUser.bio && (
          <p className={`text-sm mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{targetUser.bio}</p>
        )}
        <div className="flex items-center gap-4 flex-wrap">
          {targetUser.location && (
            <div className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <MapPin className="w-3.5 h-3.5 text-orange-500" />
              {targetUser.location}
            </div>
          )}
          {targetUser.phone && (
            <div className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <Phone className="w-3.5 h-3.5 text-green-500" />
              {targetUser.phone}
            </div>
          )}
        </div>
        {targetUser.interests && Array.isArray(targetUser.interests) && targetUser.interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {targetUser.interests.map((int: string) => (
              <span key={int} className={`text-[10px] px-2.5 py-1 rounded-lg font-bold ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                {t(`interests.${int}`, int)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: t('userProfile.tabPosts'), value: userPosts.length, icon: <FileText className="w-4 h-4" /> },
          { label: t('userProfile.tabAds'), value: userAds.length, icon: <ShoppingBag className="w-4 h-4" /> },
          { label: t('userProfile.trustScore'), value: `${targetUser.trust_score || 0}%`, icon: <Award className="w-4 h-4" /> },
        ].map(stat => (
          <div key={stat.label} className={`rounded-2xl border p-4 text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 ${darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
              {stat.icon}
            </div>
            <p className={`text-xl font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stat.value}</p>
            <p className={`text-[10px] font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className={`flex gap-1 p-1 rounded-xl mb-6 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.id ? darkMode ? 'bg-gray-700 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm' : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'posts' && (
          <motion.div key="posts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {userPosts.length > 0 ? (
              <div className="space-y-3">
                {userPosts.map((post: any) => (
                  <div key={post.id} onClick={() => navigate(`/post/${post.id}`)}
                    className={`rounded-xl border p-4 cursor-pointer transition-colors ${darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                    <p className={`text-sm leading-relaxed mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{post.content}</p>
                    <div className={`flex items-center gap-3 text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <span>{post.timestamp}</span><span>·</span><span>{post.likes} {t('userProfile.likes')}</span><span>·</span><span>{post.comments} {t('userProfile.comments')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`p-12 text-center rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <FileText className={`w-8 h-8 ${darkMode ? 'text-gray-500' : 'text-gray-300'}`} />
                </div>
                <p className={`font-bold ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{t('userProfile.noPostsYet')}</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'ads' && (
          <motion.div key="ads" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {userAds.length > 0 ? (
              <div className="space-y-3">
                {userAds.map((ad: any) => (
                  <div key={ad.id} onClick={() => navigate(`/post/${ad.id}`)}
                    className={`rounded-xl border p-4 cursor-pointer transition-colors ${darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
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
                  </div>
                ))}
              </div>
            ) : (
              <div className={`p-12 text-center rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <ShoppingBag className={`w-8 h-8 ${darkMode ? 'text-gray-500' : 'text-gray-300'}`} />
                </div>
                <p className={`font-bold ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{t('userProfile.noAdsYet')}</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'about' && (
          <motion.div key="about" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><UserIcon className="w-4 h-4" /></div>
                    <div><p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('userProfile.aboutName')}</p><p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{targetUser.name}</p></div>
                  </div>
                </div>
                {targetUser.gender && (
                  <div className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${targetUser.gender === 'female' ? (darkMode ? 'bg-pink-900/30 text-pink-400' : 'bg-pink-50 text-pink-600') : (darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600')}`}>
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <div><p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('userProfile.aboutGender')}</p><p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{targetUser.gender === 'female' ? t('userProfile.female') : t('userProfile.male')}</p></div>
                    </div>
                  </div>
                )}
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'}`}><ShieldCheck className="w-4 h-4" /></div>
                    <div><p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('userProfile.trustScore')}</p><p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{targetUser.trust_score || 0}%</p></div>
                  </div>
                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${targetUser.trust_score || 0}%` }} /></div>
                </div>
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600'}`}><CheckCircle2 className="w-4 h-4" /></div>
                    <div><p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('userProfile.aboutVerification')}</p><p className={`text-sm font-bold ${targetUser.is_verified ? 'text-green-600' : darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{targetUser.is_verified ? t('userProfile.verified') : t('userProfile.unverified')}</p></div>
                  </div>
                </div>
                {targetUser.location && (
                  <div className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-600'}`}><MapPin className="w-4 h-4" /></div>
                      <div><p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('userProfile.aboutLocation')}</p><p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{targetUser.location}</p></div>
                    </div>
                  </div>
                )}
                {targetUser.join_date && (
                  <div className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-50 text-yellow-600'}`}><Calendar className="w-4 h-4" /></div>
                      <div><p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('userProfile.aboutJoinDate')}</p><p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{new Date(targetUser.join_date).toLocaleDateString(dir === 'rtl' ? 'ar-EG' : 'en-US')}</p></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
