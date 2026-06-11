import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Post } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { PromotionWizard } from './PromotionWizard';
import { EditPostModal } from './EditPostModal';
import {
  ThumbsUp, MessageCircle, Share2, MoreHorizontal, X, MessageSquare, Globe,
  CheckCircle2, ShieldCheck, BarChart3, MapPin, Bookmark, BookmarkCheck,
  Flag, EyeOff, Eye, ShoppingBag, Send, Zap, Crown, TrendingUp, Sparkles,
  Clock, ImagePlus, Trash2, ChevronDown, ChevronUp, Edit3,
  Heart, Phone, MessageCircle as WhatsAppIcon, Tag, Package,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import { useImageModal } from './ImageModal';

// ─── Payment Method Config ──────────────────────────────────────────
const PAYMENT_METHOD_CONFIG: Record<string, { labelKey: string; color: string; darkColor: string; icon: string }> = {
  vf_cash: { labelKey: 'postCard.vodafoneCash', color: 'bg-red-50 text-red-600 border-red-100', darkColor: 'bg-red-900/30 text-red-400 border-red-800', icon: '📱' },
  instapay: { labelKey: 'postCard.instaPay', color: 'bg-blue-50 text-blue-600 border-blue-100', darkColor: 'bg-blue-900/30 text-blue-400 border-blue-800', icon: '💳' },
  cash: { labelKey: 'postCard.cash', color: 'bg-green-50 text-green-600 border-green-100', darkColor: 'bg-green-900/30 text-green-400 border-green-800', icon: '💵' },
  bank_transfer: { labelKey: 'postCard.bankTransfer', color: 'bg-purple-50 text-purple-600 border-purple-100', darkColor: 'bg-purple-900/30 text-purple-400 border-purple-800', icon: '🏦' },
  fawry: { labelKey: 'postCard.fawry', color: 'bg-orange-50 text-orange-600 border-orange-100', darkColor: 'bg-orange-900/30 text-orange-400 border-orange-800', icon: '🏧' },
  vodafone_cash: { labelKey: 'postCard.vodafoneCash', color: 'bg-red-50 text-red-600 border-red-100', darkColor: 'bg-red-900/30 text-red-400 border-red-800', icon: '📱' },
};

// ─── Feeling/Activity Display Config ────────────────────────────────
const FEELING_CONFIG: Record<string, { emoji: string; labelKey: string }> = {
  happy: { emoji: '😊', labelKey: 'feelings.happy' },
  sad: { emoji: '😢', labelKey: 'feelings.sad' },
  excited: { emoji: '🎉', labelKey: 'feelings.excited' },
  grateful: { emoji: '🙏', labelKey: 'feelings.grateful' },
  proud: { emoji: '💪', labelKey: 'feelings.proud' },
  love: { emoji: '❤️', labelKey: 'feelings.love' },
  thinking: { emoji: '🤔', labelKey: 'feelings.thinking' },
  celebrating: { emoji: '🎊', labelKey: 'feelings.celebrating' },
  relaxed: { emoji: '😌', labelKey: 'feelings.relaxed' },
  motivated: { emoji: '🔥', labelKey: 'feelings.motivated' },
  surprised: { emoji: '😮', labelKey: 'feelings.surprised' },
  thankful: { emoji: '🌟', labelKey: 'feelings.thankful' },
};

const ACTIVITY_CONFIG: Record<string, { emoji: string; labelKey: string }> = {
  selling: { emoji: '🛒', labelKey: 'activities.selling' },
  buying: { emoji: '💰', labelKey: 'activities.buying' },
  working: { emoji: '💼', labelKey: 'activities.working' },
  traveling: { emoji: '✈️', labelKey: 'activities.traveling' },
  studying: { emoji: '📚', labelKey: 'activities.studying' },
  cooking: { emoji: '🍳', labelKey: 'activities.cooking' },
  gaming: { emoji: '🎮', labelKey: 'activities.gaming' },
  exercising: { emoji: '🏋️', labelKey: 'activities.exercising' },
};

// ─── Category Config ────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { emoji: string; labelKey: string }> = {
  phones: { emoji: '📱', labelKey: 'categories.phones' },
  cars: { emoji: '🚗', labelKey: 'categories.cars' },
  electronics: { emoji: '💻', labelKey: 'categories.electronics' },
  realEstate: { emoji: '🏠', labelKey: 'categories.realEstate' },
  games: { emoji: '🎮', labelKey: 'categories.games' },
  fashion: { emoji: '👕', labelKey: 'categories.fashion' },
  services: { emoji: '🛎️', labelKey: 'categories.services' },
  books: { emoji: '📚', labelKey: 'categories.books' },
  sports: { emoji: '⚽', labelKey: 'categories.sports' },
  animals: { emoji: '🐾', labelKey: 'categories.animals' },
  jobs: { emoji: '💼', labelKey: 'categories.jobs' },
  other: { emoji: '📦', labelKey: 'categories.other' },
};

// ─── Relative Time Helper ───────────────────────────────────────────
function getRelativeTime(dateStr: string, t: (key: string, opts?: any) => string): string {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return t('common.justNow', 'الآن');
  if (diffMin < 60) return t('common.minutesAgo', { count: diffMin });
  if (diffHour < 24) return t('common.hoursAgo', { count: diffHour });
  if (diffDay < 7) return t('common.daysAgo', { count: diffDay });
  if (diffWeek < 4) return t('common.weeksAgo', { count: diffWeek });
  if (diffMonth < 12) return t('common.monthsAgo', { count: diffMonth });
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Condition Labels ───────────────────────────────────────────────
const CONDITION_CONFIG: Record<string, { labelKey: string; color: string; darkColor: string }> = {
  new: { labelKey: 'common.newCondition', color: 'bg-green-50 text-green-700 border-green-200', darkColor: 'bg-green-900/30 text-green-400 border-green-800' },
  used: { labelKey: 'common.used', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', darkColor: 'bg-yellow-900/30 text-yellow-400 border-yellow-800' },
  refurbished: { labelKey: 'common.refurbished', color: 'bg-blue-50 text-blue-700 border-blue-200', darkColor: 'bg-blue-900/30 text-blue-400 border-blue-800' },
  like_new: { labelKey: 'common.likeNew', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', darkColor: 'bg-emerald-900/30 text-emerald-400 border-emerald-800' },
};

interface CommentData {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string;
  content: string;
  parent_id: string;
  likes: number;
  image_url: string;
  isLiked: boolean;
  created_at: string;
  replies: CommentData[];
}

interface PostCardProps {
  post: Post;
  onHidePost?: (postId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onHidePost }) => {
  const navigate = useNavigate();
  const { darkMode, savedPosts, toggleSavePost, openShareModal, sendMessage, refreshData } = useAppContext();
  const { currentUser, refreshCurrentUser } = useAuth();
  const { t } = useTranslation();
  const { dir } = useLanguage();

  const [liked, setLiked] = useState((post as any).isLiked || false);
  const [likesCount, setLikesCount] = useState(post.likes);

  // Sync likesCount when post.likes changes from parent re-renders
  useEffect(() => {
    setLikesCount(post.likes);
    if ((post as any).isLiked !== undefined) setLiked((post as any).isLiked);
  }, [post.likes, (post as any).isLiked]);

  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<CommentData[]>([]);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [promotingPost, setPromotingPost] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [showLikesList, setShowLikesList] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { openImageModal, imageModalElement } = useImageModal();

  const isSaved = savedPosts.includes(post.id);
  const isMyPost = currentUser?.id === post.author.id;

  // Relative timestamp
  const relativeTime = useMemo(() => getRelativeTime(post.timestamp, t), [post.timestamp, t]);

  const handleLike = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount(prev => newLiked ? prev + 1 : prev - 1);
    try {
      const result = await api.likePost(post.id);
      setLiked(result.liked);
      setLikesCount(result.likes);
    } catch {
      setLiked(!newLiked);
      setLikesCount(prev => newLiked ? prev - 1 : prev + 1);
    }
  };

  const handlePostClick = () => {
    if (post.isPromoted && post.promotionStatus === 'approved') {
      api.trackClick(post.id).catch(() => { /* silent fail */ });
    }
    navigate(`/post/${post.id}`);
  };
  const handleAuthorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post.author.id) return;
    if (currentUser && post.author.id === currentUser.id) {
      navigate('/profile');
    } else {
      navigate(`/user/${post.author.id}`);
    }
  };
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    openShareModal(post);
    // Track share
    api.trackShare(post.id, 'general').catch(() => { /* silent */ });
  };

  const handleContactSeller = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) { toast.error(t('postCard.mustLogin')); return; }
    if (isMyPost) { toast.info(t('postCard.yourAd')); return; }
    navigate(`/messages?chat=${post.author.id}`);
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = (post as any).phone || (post as any).whatsapp;
    if (phone) {
      window.open(`https://wa.me/${phone.replace(/[^0-9+]/g, '')}`, '_blank');
    } else {
      toast.info(t('postCard.noPhoneAvailable', 'لا يوجد رقم واتساب متاح'));
    }
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSavePost(post.id);
    toast.success(isSaved ? t('postCard.removedFromSaved') : t('postCard.savedPost'));
  };

  const handleToggleComments = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showComments && !commentsLoaded) {
      try {
        const data = await api.getComments(post.id);
        setComments(data as CommentData[]);
        setCommentsLoaded(true);
      } catch {
        // fallback to empty
      }
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && !commentImage) return;
    const text = commentText.trim();
    try {
      const newComment = await api.commentPost(post.id, text, undefined, commentImage || undefined) as any;
      setComments(prev => [{
        id: newComment?.id || `c_${Date.now()}`,
        author_id: currentUser?.id || '',
        author_name: currentUser?.name || t('common.you'),
        author_avatar: currentUser?.avatar || '',
        content: text,
        parent_id: '',
        likes: 0,
        image_url: commentImage || '',
        isLiked: false,
        created_at: new Date().toISOString(),
        replies: [],
      }, ...prev]);
      setCommentText('');
      setCommentImage(null);
      toast.success(t('postCard.commentSent'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleReplyToComment = async (parentId: string) => {
    if (!replyText.trim()) return;
    const text = replyText.trim();
    try {
      const newReply = await api.commentPost(post.id, text, parentId, undefined) as any;
      const addReply = (comments: CommentData[]): CommentData[] => {
        return comments.map(c => {
          if (c.id === parentId) {
            return {
              ...c,
              replies: [...c.replies, {
                id: newReply?.id || `r_${Date.now()}`,
                author_id: currentUser?.id || '',
                author_name: currentUser?.name || t('common.you'),
                author_avatar: currentUser?.avatar || '',
                content: text,
                parent_id: parentId,
                likes: 0,
                image_url: '',
                isLiked: false,
                created_at: new Date().toISOString(),
                replies: [],
              }],
            };
          }
          if (c.replies.length > 0) {
            return { ...c, replies: addReply(c.replies) };
          }
          return c;
        });
      };
      setComments(prev => addReply(prev));
      setReplyText('');
      setReplyingTo(null);
      setExpandedReplies(prev => new Set(prev).add(parentId));
      toast.success(t('postCard.commentSent'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      const result = await api.likeComment(post.id, commentId) as any;
      const updateLike = (comments: CommentData[]): CommentData[] => {
        return comments.map(c => {
          if (c.id === commentId) {
            return { ...c, isLiked: result.liked, likes: result.likes };
          }
          if (c.replies.length > 0) {
            return { ...c, replies: updateLike(c.replies) };
          }
          return c;
        });
      };
      setComments(prev => updateLike(prev));
    } catch {
      // ignore
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm(t('postCard.confirmDeleteComment'))) return;
    try {
      await api.deleteComment(post.id, commentId);
      const removeComment = (comments: CommentData[]): CommentData[] => {
        return comments.filter(c => c.id !== commentId).map(c => {
          if (c.replies.length > 0) {
            return { ...c, replies: removeComment(c.replies) };
          }
          return c;
        });
      };
      setComments(prev => removeComment(prev));
      toast.success(t('postCard.commentDeleted'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const handleCommentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('createPost.imageSizeError'));
      return;
    }
    try {
      const result = await api.uploadImage(file);
      setCommentImage(result.url);
    } catch {
      toast.error(t('common.error'));
    }
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // ─── Render Payment Method Badge ────────────────────────────────
  const renderPaymentBadge = (method: string) => {
    const config = PAYMENT_METHOD_CONFIG[method];
    if (!config) return null;
    return (
      <div key={method} className={`px-1.5 py-0.5 rounded-md text-[8px] font-black border ${darkMode ? config.darkColor : config.color}`}>
        {config.icon} {t(config.labelKey)}
      </div>
    );
  };

  const renderComment = (comment: CommentData, depth: number = 0) => {
    const isOwn = currentUser?.id === comment.author_id;
    const isRTL = dir === 'rtl';
    const hasReplies = comment.replies && comment.replies.length > 0;
    const showReplies = expandedReplies.has(comment.id);
    const commentTime = getRelativeTime(comment.created_at, t);

    return (
      <div key={comment.id}>
        <div
          className={`flex items-start gap-2.5 ${depth > 0 ? (isRTL ? 'mr-5 sm:mr-8 border-r-2 border-orange-300 pr-2' : 'ml-5 sm:ml-8 border-l-2 border-orange-300 pl-2') : ''}`}
          dir={dir}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 overflow-hidden ${darkMode ? 'bg-gray-600 text-gray-300' : 'bg-orange-100 text-orange-700'}`}>
            {comment.author_avatar ? (
              <img src={comment.author_avatar} alt="" className="w-full h-full object-cover rounded-full" />
            ) : (
              comment.author_name?.charAt(0) || '?'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className={`rounded-lg px-3 py-2 ${darkMode ? 'bg-gray-700' : 'bg-white'} border ${darkMode ? 'border-gray-600' : 'border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs sm:text-sm font-bold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{comment.author_name}</span>
                {isOwn && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteComment(comment.id); }}
                    className={`p-0.5 rounded transition-colors ${darkMode ? 'hover:bg-gray-600 text-gray-500 hover:text-red-400' : 'hover:bg-gray-100 text-gray-400 hover:text-red-500'}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className={`text-sm sm:text-base mt-0.5 break-words ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{comment.content}</p>
              {comment.image_url && (
                <img src={comment.image_url} alt="" className="mt-1.5 rounded-md max-h-32 object-cover cursor-pointer" onClick={(e) => { e.stopPropagation(); openImageModal(comment.image_url, 'Comment image'); }} />
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-[11px] sm:text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {commentTime}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); handleLikeComment(comment.id); }}
                className={`flex items-center gap-1 text-xs font-semibold transition-colors ${comment.isLiked ? 'text-blue-600' : darkMode ? 'text-gray-500 hover:text-blue-400' : 'text-gray-400 hover:text-blue-600'}`}
              >
                <ThumbsUp className={`w-3.5 h-3.5 ${comment.isLiked ? 'fill-blue-600' : ''}`} />
                {comment.likes > 0 && comment.likes}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText(''); }}
                className={`text-xs font-semibold transition-colors ${darkMode ? 'text-gray-500 hover:text-orange-400' : 'text-gray-400 hover:text-orange-600'}`}
              >
                {t('postCard.reply')}
              </button>
            </div>

            {/* Reply input */}
            {replyingTo === comment.id && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-1.5">
                <form onSubmit={(e) => { e.preventDefault(); handleReplyToComment(comment.id); }} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder={t('postCard.writeReply')}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    className={`flex-1 text-sm px-3 py-2 rounded-md border outline-none transition-colors ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-orange-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-400'}`}
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim()}
                    onClick={(e) => e.stopPropagation()}
                    className={`p-1 rounded-md transition-all ${replyText.trim() ? 'bg-orange-600 text-white hover:bg-orange-700' : darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'}`}
                  >
                    <Send className="w-3 h-3" />
                  </button>
                </form>
              </motion.div>
            )}

            {/* View Replies toggle */}
            {hasReplies && depth === 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleReplies(comment.id); }}
                className={`flex items-center gap-1 mt-1 text-xs font-semibold transition-colors ${darkMode ? 'text-orange-400 hover:text-orange-300' : 'text-orange-600 hover:text-orange-700'}`}
              >
                {showReplies ? (
                  <><ChevronUp className="w-3 h-3" />{t('postCard.hideReplies')}</>
                ) : (
                  <><ChevronDown className="w-3 h-3" />{t('postCard.viewReplies', { count: comment.replies.length })}</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Nested replies */}
        {hasReplies && (depth > 0 || showReplies) && (
          <div className="mt-1.5 space-y-1.5">
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };


  // ─── Promoted Post Styling Helper ──────────────────────────────────
  const getPromotedStyle = () => {
    if (!(post.isPromoted && post.promotionStatus === 'approved')) {
      return darkMode
        ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
        : 'bg-white border-gray-100 hover:border-gray-200';
    }
    const tierStyles: Record<string, { light: string; dark: string; accent: string }> = {
      vip: {
        light: 'ring-2 ring-amber-400/50 shadow-lg shadow-amber-100 bg-white border-amber-200 hover:shadow-amber-200/40',
        dark: 'ring-2 ring-amber-400/40 shadow-lg shadow-amber-900/20 bg-gray-800 border-amber-500/30 hover:shadow-amber-900/30',
        accent: 'border-t-4 border-t-amber-500',
      },
      premium: {
        light: 'ring-2 ring-purple-400/40 shadow-lg shadow-purple-100 bg-white border-purple-200 hover:shadow-purple-200/40',
        dark: 'ring-2 ring-purple-400/30 shadow-lg shadow-purple-900/20 bg-gray-800 border-purple-500/30 hover:shadow-purple-900/30',
        accent: 'border-t-4 border-t-purple-500',
      },
      standard: {
        light: 'ring-2 ring-orange-400/40 shadow-lg shadow-orange-100 bg-white border-orange-200 hover:shadow-orange-200/40',
        dark: 'ring-2 ring-orange-400/30 shadow-lg shadow-orange-900/20 bg-gray-800 border-orange-500/30 hover:shadow-orange-900/30',
        accent: 'border-t-4 border-t-orange-500',
      },
      city_target: {
        light: 'ring-2 ring-green-400/40 shadow-lg shadow-green-100 bg-white border-green-200 hover:shadow-green-200/40',
        dark: 'ring-2 ring-green-400/30 shadow-lg shadow-green-900/20 bg-gray-800 border-green-500/30 hover:shadow-green-900/30',
        accent: 'border-t-4 border-t-green-500',
      },
      interest_target: {
        light: 'ring-2 ring-rose-400/40 shadow-lg shadow-rose-100 bg-white border-rose-200 hover:shadow-rose-200/40',
        dark: 'ring-2 ring-rose-400/30 shadow-lg shadow-rose-900/20 bg-gray-800 border-rose-500/30 hover:shadow-rose-900/30',
        accent: 'border-t-4 border-t-rose-500',
      },
    };
    const style = tierStyles[post.promotionTier || 'basic'] || tierStyles.standard;
    return `${darkMode ? style.dark : style.light} ${style.accent}`;
  };

  // ─── Promoted Tier Config ──────────────────────────────────────────
  const getTierConfig = () => {
    const configs: Record<string, { gradient: string; label: string; icon: string; badgeBg: string }> = {
      vip: { gradient: 'from-yellow-400 via-amber-500 to-orange-500', label: 'VIP', icon: '💎', badgeBg: 'from-yellow-400 to-amber-500' },
      premium: { gradient: 'from-purple-500 via-violet-500 to-purple-600', label: t('postCard.premium'), icon: '👑', badgeBg: 'from-purple-500 to-purple-600' },
      standard: { gradient: 'from-orange-500 via-amber-500 to-orange-600', label: t('postCard.standard'), icon: '⚡', badgeBg: 'from-orange-500 to-orange-600' },
      city_target: { gradient: 'from-green-500 via-emerald-500 to-green-600', label: t('postCard.cityTarget'), icon: '📍', badgeBg: 'from-green-500 to-green-600' },
      interest_target: { gradient: 'from-rose-500 via-pink-500 to-rose-600', label: t('postCard.interestTarget'), icon: '🎯', badgeBg: 'from-rose-500 to-rose-600' },
    };
    return configs[post.promotionTier || 'basic'] || configs.standard;
  };

  const isPromotedActive = post.isPromoted && post.promotionStatus === 'approved';
  const tierConfig = isPromotedActive ? getTierConfig() : null;

  // Feeling/Activity display
  const feelingConfig = post.feeling ? FEELING_CONFIG[post.feeling] : null;
  const activityConfig = post.activity ? ACTIVITY_CONFIG[post.activity] : null;
  const categoryConfig = post.category ? CATEGORY_CONFIG[post.category] : null;

  // Ad condition
  const conditionConfig = (post as any).condition ? CONDITION_CONFIG[(post as any).condition] : null;

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        dir={dir}
        className={`rounded-xl shadow-sm border mb-4 overflow-hidden cursor-pointer transition-all duration-300 ${getPromotedStyle()}`}
        onClick={handlePostClick}>

        {/* Pending Promotion Banner */}
        {post.promotionStatus === 'pending' && !post.isPromoted && post.promotionTier && (
          <div className={`px-3 py-2 flex items-center gap-2 ${darkMode ? 'bg-amber-900/30 border-b border-amber-800/30' : 'bg-amber-50 border-b border-amber-200'}`}>
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span className="text-[10px] font-black text-amber-600">{t('postCard.promotionPending')}</span>
          </div>
        )}

        {/* Promoted Badge */}
        {isPromotedActive && tierConfig && (
          <div className={`px-3 py-2.5 flex items-center justify-between ${darkMode ? 'bg-gradient-to-l from-gray-800 via-gray-800/95 to-gray-800/90 border-b border-gray-700/50' : 'bg-gradient-to-l from-gray-50 via-white to-gray-50/80 border-b border-gray-100'}`}>
            <div className="flex items-center gap-2">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-md bg-gradient-to-l ${tierConfig.gradient}`}>
                <span className="text-xs">{tierConfig.icon}</span>
                <span className="text-[10px] font-black text-white tracking-wide">{t('postCard.aiPromoted')}</span>
              </div>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-black text-white bg-gradient-to-l ${tierConfig.badgeBg}`}>
                {tierConfig.label}
              </span>
            </div>
            {post.reachCount && (
              <div className={`flex items-center gap-1 text-[9px] font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <Eye className="w-3 h-3" />
                <span>{post.reachCount.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        {/* Header */}
        <div className="px-3 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative" onClick={handleAuthorClick}>
              <img src={post.author.avatar} alt={post.author.name} className="w-9 h-9 rounded-full bg-gray-100 cursor-pointer hover:opacity-80 transition-opacity" />
              {(post.author as any)?.isOnline && (
                <div className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1 leading-none mb-0.5">
                <h4 className={`font-bold text-xs hover:underline cursor-pointer ${darkMode ? 'text-white hover:text-orange-400' : 'text-gray-900'}`} onClick={handleAuthorClick}>{post.author.name}</h4>
                {post.author.isVerified && <CheckCircle2 className="w-3 h-3 text-orange-600 fill-orange-600/10" />}
                {post.author.trustScore !== undefined && post.author.trustScore > 0 && (
                  <div className={`text-[8px] px-1 py-0 rounded-md font-bold flex items-center gap-0.5 ${post.author.trustScore >= 70 ? 'bg-green-50 text-green-700' : post.author.trustScore >= 40 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                    <ShieldCheck className="w-2 h-2" />{post.author.trustScore}%
                  </div>
                )}
              </div>
              <div className={`flex items-center gap-1 text-[9px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <span>{relativeTime}</span><span>·</span><Globe className="w-2.5 h-2.5" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 relative">
            <button onClick={(e) => { e.stopPropagation(); handleSave(e); }} className={`p-1.5 rounded-full transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'} ${isSaved ? 'text-orange-600' : ''}`} title={isSaved ? t('postCard.removeFromSaved') : t('postCard.savePost')}>
              {isSaved ? <BookmarkCheck className="w-4 h-4 fill-orange-600" /> : <Bookmark className="w-4 h-4" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); setShowMoreMenu(!showMoreMenu); }} className={`p-1.5 rounded-full transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {showMoreMenu && (
                <motion.div initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  className={`absolute top-full ${dir === 'rtl' ? 'left-0' : 'right-0'} mt-1 w-48 rounded-xl shadow-xl border z-50 overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`} onClick={(e) => e.stopPropagation()}>
                  {isMyPost && (
                    <button onClick={(e) => { e.stopPropagation(); setEditingPost(post); setShowMoreMenu(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${darkMode ? 'text-blue-400 hover:bg-gray-700' : 'text-blue-600 hover:bg-blue-50'}`}>
                      <Edit3 className="w-4 h-4" />{t('common.edit')}
                    </button>
                  )}
                  {isMyPost && !post.isPromoted && post.promotionStatus !== 'pending' && (
                    <button onClick={(e) => { e.stopPropagation(); setPromotingPost(post); setShowMoreMenu(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${darkMode ? 'text-orange-400 hover:bg-gray-700' : 'text-orange-600 hover:bg-orange-50'}`}>
                      <Zap className="w-4 h-4" />{t('postCard.promotePost')}
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); setShowMoreMenu(false); toast.success(t('postCard.postHidden')); onHidePost?.(post.id); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <EyeOff className="w-4 h-4" />{t('postCard.hidePost')}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setShowMoreMenu(false); toast.success(t('postCard.postReported')); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${darkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-red-50'}`}>
                    <Flag className="w-4 h-4" />{t('postCard.reportPost')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Content */}
        <div className="px-3 pb-2">
          <p className={`text-xs sm:text-sm leading-relaxed whitespace-pre-wrap line-clamp-4 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{post.content}</p>

          {/* Feeling & Activity Display */}
          {(feelingConfig || activityConfig) && (
            <div className={`mt-1.5 flex items-center gap-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {feelingConfig && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-orange-50 text-orange-700'}`}>
                  {feelingConfig.emoji} {t(feelingConfig.labelKey)}
                </span>
              )}
              {activityConfig && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-blue-50 text-blue-700'}`}>
                  {activityConfig.emoji} {t(activityConfig.labelKey)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Category & Condition Badges */}
        {(categoryConfig || conditionConfig) && (
          <div className="px-3 pb-2 flex items-center gap-1.5 flex-wrap">
            {categoryConfig && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${darkMode ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                <Tag className="w-2.5 h-2.5" /> {categoryConfig.emoji} {t(categoryConfig.labelKey)}
              </span>
            )}
            {conditionConfig && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${darkMode ? conditionConfig.darkColor : conditionConfig.color}`}>
                <Package className="w-2.5 h-2.5" /> {t(conditionConfig.labelKey)}
              </span>
            )}
          </div>
        )}

        {/* Location */}
        {post.location && (
          <div className={`px-3 pb-2 flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <MapPin className="w-3 h-3 text-orange-500" /><span className="text-[10px] font-medium">{post.location}</span>
          </div>
        )}

        {/* Ad Details - Enhanced */}
        {post.type === 'ad' && (
          <div className={`mx-3 mb-2 p-2.5 rounded-xl border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className={`text-[8px] font-bold uppercase tracking-wider block mb-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('postCard.listedPrice')}</span>
                <span className={`text-lg font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{post.price?.toLocaleString()} {post.currency}</span>
              </div>
              {post.isBoosted && (
                <div className="flex flex-col items-end gap-0.5">
                  <div className="bg-orange-600 text-white text-[8px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg shadow-orange-100">
                    <span className="w-1 h-1 bg-white rounded-full animate-pulse" />{t('postCard.smartReach')}
                  </div>
                  {post.reachCount && (
                    <div className="flex items-center gap-1 text-[8px] text-orange-500 font-bold">
                      <BarChart3 className="w-2.5 h-2.5" />{t('postCard.reached', { count: post.reachCount.toLocaleString() })}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* All Payment Methods */}
            {post.paymentMethods && post.paymentMethods.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                <span className={`text-[8px] font-bold ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('postCard.paymentAvailable')}</span>
                {post.paymentMethods.map(method => renderPaymentBadge(method))}
              </div>
            )}
            {/* Contact Buttons Row */}
            <div className="flex items-center gap-1.5">
              <button onClick={handleContactSeller}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg text-[11px] font-bold shadow-lg shadow-orange-100 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" />{t('postCard.contactForPurchase')}
              </button>
              {((post as any).phone || (post as any).whatsapp) && (
                <button onClick={handleWhatsApp}
                  className={`p-2 rounded-lg transition-all active:scale-95 border ${darkMode ? 'bg-green-900/30 border-green-800 text-green-400 hover:bg-green-900/50' : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'}`}
                  title="WhatsApp">
                  <Phone className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Image */}
        {post.image && (
          <div
            className={`max-h-[280px] overflow-hidden border-y cursor-pointer ${darkMode ? 'bg-gray-700 border-gray-700' : 'bg-gray-50 border-gray-100'}`}
            onClick={(e) => { e.stopPropagation(); openImageModal(post.image!, 'Post content'); }}
          >
            <img src={post.image} alt="Post content" className="w-full h-full object-contain" loading="lazy" />
          </div>
        )}

        {/* Stats - Enhanced with view count */}
        <div className={`px-3 py-1.5 flex items-center justify-between text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <div className="flex items-center gap-2">
            <span className="font-medium flex items-center gap-1">
              {liked ? <Heart className="w-3 h-3 text-blue-600 fill-blue-600" /> : <ThumbsUp className="w-3 h-3" />}
              {likesCount} {t('postCard.like')}
            </span>
            {(post as any).viewsCount > 0 && (
              <span className="flex items-center gap-0.5">
                <Eye className="w-2.5 h-2.5" />{(post as any).viewsCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="hover:underline cursor-pointer">{post.comments} {t('postCard.comment')}</span>
            <span className="hover:underline cursor-pointer">{post.shares} {t('postCard.share')}</span>
          </div>
        </div>

        {/* Actions */}
        <div className={`mx-2 border-t py-0.5 flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <button onClick={(e) => { e.stopPropagation(); handleLike(e); }}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg transition-colors group ${liked ? 'text-blue-600' : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            <ThumbsUp className={`w-4 h-4 ${liked ? 'text-blue-600 fill-blue-600' : darkMode ? 'text-gray-400 group-hover:text-blue-500' : 'text-gray-500 group-hover:text-blue-600'}`} />
            <span className={`text-[11px] font-semibold ${liked ? 'text-blue-600' : darkMode ? 'text-gray-400 group-hover:text-blue-500' : 'text-gray-600 group-hover:text-blue-600'}`}>{t('postCard.liked')}</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleToggleComments(e); }}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg transition-colors group ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            <MessageSquare className={`w-4 h-4 ${darkMode ? 'text-gray-400 group-hover:text-gray-200' : 'text-gray-500 group-hover:text-gray-900'}`} />
            <span className={`text-[11px] font-semibold ${darkMode ? 'text-gray-400 group-hover:text-gray-200' : 'text-gray-600 group-hover:text-gray-900'}`}>{t('postCard.comment')}</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleShare(e); }}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg transition-colors group ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            <Share2 className={`w-4 h-4 ${darkMode ? 'text-gray-400 group-hover:text-green-400' : 'text-gray-500 group-hover:text-green-600'}`} />
            <span className={`text-[11px] font-semibold ${darkMode ? 'text-gray-400 group-hover:text-green-400' : 'text-gray-600 group-hover:text-green-600'}`}>{t('postCard.share')}</span>
          </button>
          {isMyPost && (
            <button onClick={(e) => { e.stopPropagation(); setEditingPost(post); }}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg transition-colors group ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
              <Edit3 className={`w-4 h-4 ${darkMode ? 'text-gray-400 group-hover:text-orange-400' : 'text-gray-500 group-hover:text-orange-600'}`} />
              <span className={`text-[11px] font-semibold ${darkMode ? 'text-gray-400 group-hover:text-orange-400' : 'text-gray-600 group-hover:text-orange-600'}`}>{t('common.edit')}</span>
            </button>
          )}
        </div>

        {/* Comments */}
        <AnimatePresence>
          {showComments && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                {comments.length > 0 && (
                  <div className={`px-3 py-2 space-y-3 max-h-[50vh] overflow-y-auto ${darkMode ? 'bg-gray-800/50' : 'bg-gray-50/50'}`}>
                    {comments.map(comment => renderComment(comment))}
                  </div>
                )}
                <form onSubmit={handleAddComment} className={`flex items-center gap-2 px-3 py-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                  {commentImage && (
                    <div className="relative flex-shrink-0">
                      <img src={commentImage} alt="" className="w-8 h-8 rounded-md object-cover" />
                      <button type="button" onClick={() => setCommentImage(null)}
                        className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full flex items-center justify-center">
                        <X className="w-2 h-2" />
                      </button>
                    </div>
                  )}
                  <input type="text" placeholder={t('postCard.writeComment')} value={commentText} onChange={(e) => setCommentText(e.target.value)}
                    className={`flex-1 text-sm px-4 py-2 rounded-lg border outline-none transition-colors ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-orange-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-400'}`} />
                  <input type="file" ref={imageInputRef} accept="image/*,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.tiff,.avif,.heic,.heif,.ico,.jfif" className="hidden" onChange={handleCommentImageUpload} />
                  <button type="button" onClick={(e) => { e.stopPropagation(); imageInputRef.current?.click(); }}
                    className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-400 hover:text-orange-400' : 'hover:bg-gray-100 text-gray-400 hover:text-orange-600'}`}>
                    <ImagePlus className="w-3.5 h-3.5" />
                  </button>
                  <button type="submit" disabled={!commentText.trim() && !commentImage}
                    className={`p-1.5 rounded-lg transition-all ${commentText.trim() || commentImage ? 'bg-orange-600 text-white hover:bg-orange-700 active:scale-95' : darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Promotion Wizard */}
      {promotingPost && (
        <PromotionWizard
          post={promotingPost}
          onClose={() => setPromotingPost(null)}
          onPromotionCreated={() => {
            refreshData();
            refreshCurrentUser();
          }}
        />
      )}

      {/* Edit Post Modal */}
      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSaved={() => {
            refreshData();
            setEditingPost(null);
          }}
        />
      )}

      {/* Image Modal */}
      {imageModalElement}
    </>
  );
};
