// ─── سوق لايف - Market Live Enhanced ─────────────────────────────────
// TikTok-style vertical video feed for market listings with enhanced features
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import {
  ArrowRight,
  Heart,
  Bookmark,
  Share2,
  MessageCircle,
  Eye,
  RefreshCw,
  Zap,
  Play,
  Pause,
  Video,
  BadgeCheck,
  ShieldCheck,
  TrendingUp,
  X,
  Flame,
  BarChart3,
  Volume2,
  VolumeX,
  Send,
  ChevronUp,
  Phone,
  MapPin,
  Tag,
  Clock,
  Film,
  ShoppingBag,
  Radio,
  ExternalLink,
  Copy,
  Check,
  Flag,
  MoreVertical,
  Layers,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { VideoRecorder } from './VideoRecorder';

// ─── Category icons map ───────────────────────────────────────────
const categoryIcons: Record<string, string> = {
  phones: '📱', cars: '🚗', electronics: '💻', realEstate: '🏠',
  games: '🎮', fashion: '👗', services: '🛠️', books: '📚',
  sports: '⚽', animals: '🐾', jobs: '💼', other: '📦',
};

const categories = ['all', 'phones', 'cars', 'electronics', 'realEstate', 'games', 'fashion', 'services', 'books', 'sports', 'animals', 'jobs', 'other'];

// ─── Format number compact ────────────────────────────────────────
const formatCompact = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString('ar-EG');
};

// ─── Format time ago ──────────────────────────────────────────────
const timeAgo = (dateStr: string): string => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} يوم`;
  return date.toLocaleDateString('ar-EG');
};

// ─── Comment Interface ────────────────────────────────────────────
interface VideoComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: string;
}

// ─── Video Card Component ─────────────────────────────────────────
interface VideoCardProps {
  video: any;
  isActive: boolean;
  darkMode: boolean;
  dir: string;
  onLike: (videoId: string) => void;
  onSave: (videoId: string) => void;
  onShare: (videoId: string) => void;
  onContact: (video: any) => void;
  onDoubleTap: (videoId: string) => void;
  onViewDetail: (video: any) => void;
  onComment: (video: any) => void;
  liked: boolean;
  saved: boolean;
  showHeart: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
}

const VideoCard: React.FC<VideoCardProps> = ({
  video, isActive, darkMode, dir,
  onLike, onSave, onShare, onContact, onDoubleTap, onViewDetail, onComment,
  liked, saved, showHeart, isMuted, onToggleMute,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTapRef = useRef<number>(0);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewTrackedRef = useRef(false);

  // Auto-play/pause based on visibility
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    if (isActive && video.videoUrl) {
      videoEl.play().catch(() => {});
    } else {
      videoEl.pause();
    }
  }, [isActive, video.videoUrl]);

  // Track view when video becomes active
  useEffect(() => {
    if (isActive && !viewTrackedRef.current) {
      viewTrackedRef.current = true;
      api.marketLiveInteract(video.id, 'view').catch(() => {});
    }
    if (!isActive) {
      viewTrackedRef.current = false;
    }
  }, [isActive, video.id]);

  // Intersection Observer for auto-play
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !video.videoUrl) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.7) {
            videoEl.play().catch(() => {});
          } else {
            videoEl.pause();
          }
        });
      },
      { threshold: 0.7 }
    );
    observer.observe(videoEl);
    return () => observer.disconnect();
  }, [video.videoUrl]);

  const handleTap = () => {
    const now = Date.now();
    const timeDiff = now - lastTapRef.current;
    lastTapRef.current = now;

    if (timeDiff < 300 && timeDiff > 0) {
      // Double tap - like
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      onDoubleTap(video.id);
    } else {
      // Single tap - toggle play/pause (only if video exists)
      tapTimeoutRef.current = setTimeout(() => {
        const videoEl = videoRef.current;
        if (videoEl && video.videoUrl) {
          if (videoEl.paused) {
            videoEl.play().catch(() => {});
          } else {
            videoEl.pause();
          }
        }
      }, 300);
    }
  };

  const hasVideo = video.videoUrl && video.videoUrl.length > 5;
  const catIcon = video.category ? categoryIcons[video.category] || '📦' : '📦';

  return (
    <div
      className="relative w-full h-[85vh] rounded-3xl overflow-hidden snap-start flex-shrink-0"
      onClick={handleTap}
    >
      {/* Video Element or Image Background */}
      {hasVideo ? (
        <video
          ref={videoRef}
          src={video.videoUrl}
          poster={video.thumbnailUrl || video.imageUrl}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay={isActive}
          loop
          muted={isMuted}
          playsInline
        />
      ) : (
        <div className="absolute inset-0">
          {video.imageUrl || video.image ? (
            <img
              src={video.imageUrl || video.image}
              alt={video.description || video.content}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-800'}`}>
              <div className="text-center">
                <ShoppingBag className="w-16 h-16 text-orange-500/40 mx-auto mb-3" />
                <p className="text-white/40 text-sm font-bold">{catIcon} {t(`interests.${video.category}`, { defaultValue: video.category || '' })}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gradient Overlay - bottom */}
      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

      {/* Gradient Overlay - top */}
      <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />

      {/* Play/Pause indicator for videos */}
      {hasVideo && !isActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-8 h-8 text-white fill-white" />
          </div>
        </div>
      )}

      {/* Double-tap heart animation */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
          >
            <Heart className="w-24 h-24 text-red-500 fill-red-500 drop-shadow-lg" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Promoted Badge */}
      {video.isPromoted && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/90 text-white text-[10px] font-black backdrop-blur-sm">
          <Zap className="w-3 h-3" />
          {t('marketLive.promoted')}
        </div>
      )}

      {/* Trending Badge */}
      {video.isTrending && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/90 text-white text-[10px] font-black backdrop-blur-sm">
          <TrendingUp className="w-3 h-3" />
          {t('marketLive.trendingNow')}
        </div>
      )}

      {/* Sound toggle */}
      {hasVideo && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
          className="absolute top-4 left-4 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
        </button>
      )}

      {/* Time badge */}
      {video.createdAt && (
        <div className={`absolute top-4 ${hasVideo ? (video.isPromoted ? 'right-4' : 'left-4') : 'right-4'} z-20 flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white text-[9px] font-bold`}>
          <Clock className="w-3 h-3" />
          {timeAgo(video.createdAt)}
        </div>
      )}

      {/* ─── Left side: Author info & product details ─── */}
      <div className="absolute bottom-6 left-4 right-16 z-10 flex flex-col gap-2.5" dir={dir}>
        {/* Author info */}
        <div className="flex items-center gap-3">
          <div className="relative cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/user/${video.authorId}`); }}>
            <img
              src={video.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.authorId}`}
              alt={video.authorName}
              className="w-11 h-11 rounded-full border-2 border-white/30 object-cover"
            />
            {video.isVerified && (
              <BadgeCheck className="absolute -bottom-0.5 -right-0.5 w-4 h-4 text-blue-400 fill-blue-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-white font-black text-sm truncate">{video.authorName}</span>
              {video.isTrusted && (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
            </div>
            {video.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-white/50" />
                <span className="text-white/50 text-[10px] font-medium">{video.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Product description */}
        <p className="text-white/90 text-sm leading-relaxed line-clamp-2 font-medium">
          {video.description || video.content}
        </p>

        {/* Price & Category */}
        <div className="flex items-center gap-2 flex-wrap">
          {video.price && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/90 backdrop-blur-sm">
              <span className="text-white font-black text-base">{Number(video.price).toLocaleString('ar-EG')}</span>
              <span className="text-white/80 text-[10px] font-bold">{video.currency || t('common.egp')}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm">
            <span className="text-xs">{catIcon}</span>
            <span className="text-white/80 text-[10px] font-bold">
              {t(`interests.${video.category}`, { defaultValue: video.category || '' })}
            </span>
          </div>
          {video.condition && (
            <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm">
              <Tag className="w-3 h-3 text-white/60" />
              <span className="text-white/70 text-[10px] font-bold">{t(`market.${video.condition}`, { defaultValue: video.condition })}</span>
            </div>
          )}
        </div>

        {/* Action buttons row */}
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={(e) => { e.stopPropagation(); onContact(video); }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            {t('marketLive.contactSeller')}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={(e) => { e.stopPropagation(); onViewDetail(video); }}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/15 backdrop-blur-sm hover:bg-white/25 text-white font-bold text-sm transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {t('marketLive.details')}
          </motion.button>
        </div>
      </div>

      {/* ─── Right side: Action buttons ─── */}
      <div className="absolute bottom-24 right-3 z-10 flex flex-col items-center gap-3.5" dir={dir}>
        {/* Like */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e) => { e.stopPropagation(); onLike(video.id); }}
          className="flex flex-col items-center gap-0.5"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors ${
            liked ? 'bg-red-500/20' : 'bg-white/10'
          }`}>
            <Heart className={`w-6 h-6 transition-colors ${liked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
          </div>
          <span className="text-white/80 text-[9px] font-bold">{formatCompact(video.likes || 0)}</span>
        </motion.button>

        {/* Comment */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e) => { e.stopPropagation(); onComment(video); }}
          className="flex flex-col items-center gap-0.5"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-sm">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white/80 text-[9px] font-bold">{formatCompact(video.commentsCount || 0)}</span>
        </motion.button>

        {/* Save */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e) => { e.stopPropagation(); onSave(video.id); }}
          className="flex flex-col items-center gap-0.5"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors ${
            saved ? 'bg-amber-500/20' : 'bg-white/10'
          }`}>
            <Bookmark className={`w-6 h-6 transition-colors ${saved ? 'text-amber-400 fill-amber-400' : 'text-white'}`} />
          </div>
          <span className="text-white/80 text-[9px] font-bold">{t('marketLive.save')}</span>
        </motion.button>

        {/* Share */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e) => { e.stopPropagation(); onShare(video.id); }}
          className="flex flex-col items-center gap-0.5"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-sm">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-white/80 text-[9px] font-bold">{t('marketLive.share')}</span>
        </motion.button>

        {/* Views */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-11 h-11 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-sm">
            <Eye className="w-6 h-6 text-white" />
          </div>
          <span className="text-white/80 text-[9px] font-bold">{formatCompact(video.views || 0)}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Product Detail Bottom Sheet ──────────────────────────────────
interface ProductDetailSheetProps {
  video: any;
  darkMode: boolean;
  dir: string;
  onClose: () => void;
  onContact: (video: any) => void;
  onSave: (videoId: string) => void;
  saved: boolean;
}

const ProductDetailSheet: React.FC<ProductDetailSheetProps> = ({
  video, darkMode, dir, onClose, onContact, onSave, saved,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const catIcon = video.category ? categoryIcons[video.category] || '📦' : '📦';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 400 }}
        animate={{ y: 0 }}
        exit={{ y: 400 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`w-full max-w-lg rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'}`}
        dir={dir}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className={`w-10 h-1 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
        </div>

        <div className="overflow-y-auto max-h-[80vh] p-4 space-y-4">
          {/* Product Image */}
          {(video.imageUrl || video.image || video.thumbnailUrl) && (
            <div className="relative rounded-2xl overflow-hidden">
              <img
                src={video.imageUrl || video.image || video.thumbnailUrl}
                alt={video.description || video.content}
                className="w-full h-56 object-cover"
              />
              {video.isPromoted && (
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/90 text-white text-[10px] font-black backdrop-blur-sm">
                  <Zap className="w-3 h-3" />
                  {t('marketLive.promoted')}
                </div>
              )}
            </div>
          )}

          {/* Seller info */}
          <div className="flex items-center gap-3">
            <img
              src={video.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.authorId}`}
              alt={video.authorName}
              className="w-12 h-12 rounded-full border-2 border-orange-200 object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`font-black text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{video.authorName}</span>
                {video.isVerified && <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500" />}
                {video.isTrusted && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
              </div>
              {video.location && (
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-orange-500" />
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{video.location}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => navigate(`/user/${video.authorId}`)}
              className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-500 text-xs font-bold hover:bg-orange-500/20 transition-colors"
            >
              {t('marketLive.viewProfile')}
            </button>
          </div>

          {/* Description */}
          <div>
            <h3 className={`font-black text-base mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('marketLive.description')}
            </h3>
            <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {video.description || video.content}
            </p>
          </div>

          {/* Product Details Grid */}
          <div className="grid grid-cols-2 gap-2">
            {video.price && (
              <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-orange-50'}`}>
                <span className={`text-[10px] font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('marketLive.price')}</span>
                <p className={`font-black text-base ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {Number(video.price).toLocaleString('ar-EG')} {video.currency || t('common.egp')}
                </p>
              </div>
            )}
            <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <span className={`text-[10px] font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('marketLive.category')}</span>
              <p className={`font-black text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {catIcon} {t(`interests.${video.category}`, { defaultValue: video.category || '' })}
              </p>
            </div>
            {video.condition && (
              <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <span className={`text-[10px] font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('market.condition')}</span>
                <p className={`font-black text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {t(`market.${video.condition}`, { defaultValue: video.condition })}
                </p>
              </div>
            )}
            <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <span className={`text-[10px] font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('marketLive.views')}</span>
              <p className={`font-black text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <Eye className="w-3.5 h-3.5 inline ml-1" />
                {formatCompact(video.views || 0)}
              </p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className={`text-xs font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <Heart className="w-3.5 h-3.5 inline ml-1 text-red-500" />
                {formatCompact(video.likes || 0)}
              </span>
              <span className={`text-xs font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <Share2 className="w-3.5 h-3.5 inline ml-1 text-blue-500" />
                {formatCompact(video.shares || 0)}
              </span>
              <span className={`text-xs font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <Bookmark className="w-3.5 h-3.5 inline ml-1 text-amber-500" />
                {formatCompact(video.saves || 0)}
              </span>
            </div>
            {video.createdAt && (
              <span className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                <Clock className="w-3 h-3 inline ml-1" />
                {timeAgo(video.createdAt)}
              </span>
            )}
          </div>
        </div>

        {/* Bottom Action Buttons */}
        <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => onSave(video.id)}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                saved ? 'bg-amber-500/10 border border-amber-500/30' : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <Bookmark className={`w-5 h-5 ${saved ? 'text-amber-500 fill-amber-500' : darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => onContact(video)}
              className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              {t('marketLive.contactSeller')}
            </motion.button>
            {video.phone && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => window.open(`tel:${video.phone}`)}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                  darkMode ? 'bg-green-700 hover:bg-green-600' : 'bg-green-100 hover:bg-green-200'
                }`}
              >
                <Phone className={`w-5 h-5 ${darkMode ? 'text-white' : 'text-green-600'}`} />
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Comments Bottom Sheet ────────────────────────────────────────
interface CommentsSheetProps {
  videoId: string;
  darkMode: boolean;
  dir: string;
  onClose: () => void;
}

const CommentsSheet: React.FC<CommentsSheetProps> = ({ videoId, darkMode, dir, onClose }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadComments = async () => {
      try {
        const res = await fetch(`/api/market-live/${videoId}/comments`);
        if (res.ok) {
          const data = await res.json();
          setComments(data.comments || []);
        }
      } catch {}
      setLoading(false);
    };
    loadComments();
  }, [videoId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleSendComment = async () => {
    if (!newComment.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/market-live/${videoId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${api.getToken()}`,
        },
        body: JSON.stringify({ text: newComment.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments(prev => [...prev, data.comment]);
        setNewComment('');
      }
    } catch {}
    setSending(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 400 }}
        animate={{ y: 0 }}
        exit={{ y: 400 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`w-full max-w-lg rounded-t-3xl shadow-2xl max-h-[70vh] flex flex-col ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'}`}
        dir={dir}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2">
            <MessageCircle className={`w-5 h-5 ${darkMode ? 'text-orange-400' : 'text-orange-500'}`} />
            <span className={`font-black text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('marketLive.comments')} ({comments.length})
            </span>
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            <X className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
                  <div className="flex-1 space-y-1">
                    <div className={`h-3 w-20 rounded animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
                    <div className={`h-3 w-40 rounded animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <MessageCircle className={`w-12 h-12 mb-3 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={`text-sm font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('marketLive.noComments')}
              </p>
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {t('marketLive.beFirstComment')}
              </p>
            </div>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="flex items-start gap-2.5">
                <img
                  src={comment.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}`}
                  alt={comment.userName}
                  className="w-8 h-8 rounded-full object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                      {comment.userName}
                    </span>
                    <span className={`text-[9px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {timeAgo(comment.createdAt)}
                    </span>
                  </div>
                  <p className={`text-xs leading-relaxed mt-0.5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {comment.text}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Comment input */}
        <div className={`px-4 py-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={t('marketLive.writeComment')}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendComment(); }}
              className={`flex-1 px-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                darkMode
                  ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600'
                  : 'bg-gray-50 text-gray-900 placeholder-gray-400 border-gray-200'
              }`}
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSendComment}
              disabled={!newComment.trim() || sending}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                newComment.trim()
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'
              }`}
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Share Sheet ──────────────────────────────────────────────────
interface ShareSheetProps {
  video: any;
  darkMode: boolean;
  dir: string;
  onClose: () => void;
}

const ShareSheet: React.FC<ShareSheetProps> = ({ video, darkMode, dir, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const shareLink = `${window.location.origin}/market/listing/${video.postId || video.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success(t('marketLive.linkCopied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleShareChat = () => {
    navigate('/messages');
    toast.info(t('marketLive.shareViaChatHint'));
    onClose();
  };

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: video.description || video.content,
          text: `${video.description || video.content} - ${video.price ? Number(video.price).toLocaleString() + ' ' + (video.currency || 'ج.م') : ''}`,
          url: shareLink,
        });
      } else {
        handleCopyLink();
      }
    } catch {}
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 300 }}
        animate={{ y: 0 }}
        exit={{ y: 300 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`w-full max-w-lg rounded-t-3xl shadow-2xl p-5 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'}`}
        dir={dir}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className={`w-10 h-1 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
        </div>

        <h3 className={`font-black text-base mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {t('marketLive.shareProduct')}
        </h3>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <button
            onClick={handleCopyLink}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-colors ${
              darkMode ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            {copied ? <Check className="w-6 h-6 text-green-500" /> : <Copy className="w-6 h-6 text-blue-500" />}
            <span className={`text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {copied ? t('marketLive.copied') : t('marketLive.copyLink')}
            </span>
          </button>
          <button
            onClick={handleShareChat}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-colors ${
              darkMode ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <MessageCircle className="w-6 h-6 text-orange-500" />
            <span className={`text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {t('marketLive.viaChat')}
            </span>
          </button>
          <button
            onClick={handleNativeShare}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-colors ${
              darkMode ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <Share2 className="w-6 h-6 text-green-500" />
            <span className={`text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {t('marketLive.more')}
            </span>
          </button>
        </div>

        {/* Share link preview */}
        <div className={`flex items-center gap-2 p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
          <LinkIcon className={`w-4 h-4 shrink-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          <span className={`text-xs truncate flex-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{shareLink}</span>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Missing icon alias
const LinkIcon = ExternalLink;

// ─── My Videos Tab ────────────────────────────────────────────────
interface MyVideosTabProps {
  darkMode: boolean;
  dir: string;
  onPlayVideo: (video: any) => void;
}

const MyVideosTab: React.FC<MyVideosTabProps> = ({ darkMode, dir, onPlayVideo }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMyVideos = async () => {
      try {
        const data = await api.getMyVideos();
        setVideos(Array.isArray(data) ? data : []);
      } catch {}
      setLoading(false);
    };
    loadMyVideos();
  }, []);

  const bgCard = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`aspect-[3/4] rounded-2xl animate-pulse ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`} />
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className={`rounded-2xl border p-8 text-center ${bgCard}`}>
        <Film className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
        <h3 className={`text-sm font-black mb-1 ${textPrimary}`}>{t('marketLive.noMyVideos')}</h3>
        <p className={`text-xs ${textMuted}`}>{t('marketLive.noMyVideosDesc')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {videos.map((video: any) => (
        <motion.button
          key={video.id}
          whileTap={{ scale: 0.97 }}
          onClick={() => onPlayVideo(video)}
          className="relative aspect-[3/4] rounded-2xl overflow-hidden group"
        >
          {video.video_url ? (
            <video
              src={video.video_url}
              className="w-full h-full object-cover"
              muted
            />
          ) : video.thumbnail_url ? (
            <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
              <Film className={`w-8 h-8 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3" dir={dir}>
            <p className="text-white text-[11px] font-bold line-clamp-2">
              {video.content?.substring(0, 50) || video.post_id}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-white/60 text-[9px] font-bold flex items-center gap-0.5">
                <Eye className="w-3 h-3" /> {video.views || 0}
              </span>
              <span className="text-white/60 text-[9px] font-bold flex items-center gap-0.5">
                <Heart className="w-3 h-3" /> {video.likes || 0}
              </span>
            </div>
          </div>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-8 h-8 text-white drop-shadow-lg" />
          </div>
        </motion.button>
      ))}
    </div>
  );
};

// ─── Main MarketLivePage Component ────────────────────────────────
export const MarketLivePage: React.FC = () => {
  const navigate = useNavigate();
  const { darkMode } = useAppContext();
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const { dir } = useLanguage();

  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [interactingIds, setInteractingIds] = useState<Record<string, { liked?: boolean; saved?: boolean }>>({});
  const [heartAnimationIds, setHeartAnimationIds] = useState<Set<string>>(new Set());
  const [showRecorder, setShowRecorder] = useState(false);
  const [stats, setStats] = useState<{ newToday: number; totalViews: number; totalVideos: number; categoryDist: any[] }>({
    newToday: 0, totalViews: 0, totalVideos: 0, categoryDist: [],
  });
  const [isMuted, setIsMuted] = useState(true);
  const [activeTab, setActiveTab] = useState<'feed' | 'myvideos'>('feed');
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [commentVideoId, setCommentVideoId] = useState<string | null>(null);
  const [shareVideo, setShareVideo] = useState<any>(null);

  const feedRef = useRef<HTMLDivElement>(null);

  const bgCard = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';

  // ─── Load feed data ─────────────────────────────────────────────
  const loadFeed = useCallback(async (resetPage = false) => {
    const pageNum = resetPage ? 1 : page;
    if (resetPage) setPage(1);

    try {
      const data = await api.getMarketLiveFeed(
        category !== 'all' ? category : undefined,
        pageNum,
        10
      );
      if (data && data.videos) {
        const mapped = data.videos.map((v: any) => ({
          id: v.id,
          videoUrl: v.videoUrl || v.video_url || '',
          thumbnailUrl: v.thumbnailUrl || v.thumbnail_url || '',
          imageUrl: v.post?.image || v.image || '',
          description: v.post?.content || v.content || '',
          content: v.post?.content || v.content || '',
          price: v.post?.price || v.price,
          currency: v.post?.currency || v.currency || 'ج.م',
          category: v.post?.category || v.category || '',
          location: v.post?.location || v.location || '',
          condition: v.condition || '',
          phone: v.phone || '',
          isPromoted: v.post?.isPromoted || v.isPromoted || false,
          isTrending: (v.views || 0) > 100,
          isVerified: v.author?.isVerified || v.isVerified || false,
          isTrusted: v.author?.isTrusted || v.isTrusted || false,
          authorId: v.author?.id || v.authorId || v.author_id || '',
          authorName: v.author?.name || v.authorName || v.author_name || '',
          authorAvatar: v.author?.avatar || v.authorAvatar || v.author_avatar || '',
          likes: v.likes || 0,
          views: v.views || 0,
          shares: v.shares || 0,
          saves: v.saves || 0,
          commentsCount: v.commentsCount || 0,
          postId: v.post?.id || v.post_id || v.id,
          createdAt: v.createdAt || v.created_at || '',
          isLiked: v.isLiked || false,
          isSaved: v.isSaved || false,
        }));
        if (resetPage) {
          setVideos(mapped);
        } else {
          setVideos(prev => [...prev, ...mapped]);
        }
        setHasMore(data.hasMore ?? false);
      }
    } catch (err) {
      console.error('Failed to load market live feed:', err);
      // Fallback: try direct fetch
      try {
        const params = new URLSearchParams();
        if (category !== 'all') params.set('category', category);
        params.set('page', pageNum.toString());
        params.set('limit', '10');
        const res = await fetch(`/api/market-live/feed?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.videos) {
            const mapped = data.videos.map((v: any) => ({
              id: v.id,
              videoUrl: v.videoUrl || v.video_url || '',
              thumbnailUrl: v.thumbnailUrl || v.thumbnail_url || '',
              imageUrl: v.post?.image || v.image || '',
              description: v.post?.content || v.content || '',
              content: v.post?.content || v.content || '',
              price: v.post?.price || v.price,
              currency: v.post?.currency || v.currency || 'ج.م',
              category: v.post?.category || v.category || '',
              location: v.post?.location || v.location || '',
              condition: v.condition || '',
              phone: v.phone || '',
              isPromoted: v.post?.isPromoted || v.isPromoted || false,
              isTrending: (v.views || 0) > 100,
              isVerified: v.author?.isVerified || v.isVerified || false,
              isTrusted: v.author?.isTrusted || v.isTrusted || false,
              authorId: v.author?.id || v.authorId || v.author_id || '',
              authorName: v.author?.name || v.authorName || v.author_name || '',
              authorAvatar: v.author?.avatar || v.authorAvatar || v.author_avatar || '',
              likes: v.likes || 0,
              views: v.views || 0,
              shares: v.shares || 0,
              saves: v.saves || 0,
              commentsCount: v.commentsCount || 0,
              postId: v.post?.id || v.post_id || v.id,
              createdAt: v.createdAt || v.created_at || '',
              isLiked: v.isLiked || false,
              isSaved: v.isSaved || false,
            }));
            if (resetPage) {
              setVideos(mapped);
            } else {
              setVideos(prev => [...prev, ...mapped]);
            }
            setHasMore(data.hasMore ?? false);
          }
        }
      } catch {}
    }
    setLoading(false);
  }, [category, page]);

  // ─── Load stats ─────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const data = await api.getMarketLiveStats();
      if (data) {
        setStats({
          newToday: data.newToday || data.todayVideos || data.videosToday || 0,
          totalViews: data.totalViews || 0,
          totalVideos: data.totalVideos || 0,
          categoryDist: data.categoryDist || [],
        });
      }
    } catch {}
  }, []);

  // ─── Initial load ───────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'feed') {
      setLoading(true);
      loadFeed(true);
      loadStats();
    }
  }, [category, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Scroll handler to track current video index ────────────────
  const handleScroll = useCallback(() => {
    if (!feedRef.current) return;
    const container = feedRef.current;
    const scrollTop = container.scrollTop;
    const cardHeight = container.clientHeight * 0.85;
    const newIndex = Math.round(scrollTop / cardHeight);
    if (newIndex !== currentVideoIndex) {
      setCurrentVideoIndex(newIndex);
    }
  }, [currentVideoIndex]);

  // ─── Interaction handlers ───────────────────────────────────────
  const handleLike = useCallback(async (videoId: string) => {
    const current = interactingIds[videoId]?.liked ?? false;
    setInteractingIds(prev => ({
      ...prev,
      [videoId]: { ...prev[videoId], liked: !current },
    }));
    setVideos(prev => prev.map(v =>
      v.id === videoId ? { ...v, likes: v.likes + (current ? -1 : 1) } : v
    ));
    try {
      await api.marketLiveInteract(videoId, 'like');
    } catch {}
    toast.success(t(current ? 'marketLive.unliked' : 'marketLive.liked'));
  }, [interactingIds, t]);

  const handleSave = useCallback(async (videoId: string) => {
    const current = interactingIds[videoId]?.saved ?? false;
    setInteractingIds(prev => ({
      ...prev,
      [videoId]: { ...prev[videoId], saved: !current },
    }));
    try {
      await api.marketLiveInteract(videoId, 'save');
    } catch {}
    toast.success(t(current ? 'marketLive.unsaved' : 'marketLive.saved'));
  }, [interactingIds, t]);

  const handleShare = useCallback(async (videoId: string) => {
    const video = videos.find(v => v.id === videoId);
    if (video) {
      setShareVideo(video);
    }
    try {
      await api.marketLiveInteract(videoId, 'share');
    } catch {}
  }, [videos]);

  const handleContact = useCallback((video: any) => {
    if (video.authorId) {
      navigate(`/messages?contact=${video.authorId}`);
    }
  }, [navigate]);

  const handleDoubleTap = useCallback(async (videoId: string) => {
    setInteractingIds(prev => ({
      ...prev,
      [videoId]: { ...prev[videoId], liked: true },
    }));
    setVideos(prev => prev.map(v =>
      v.id === videoId && !v.isLiked ? { ...v, likes: v.likes + 1, isLiked: true } : v
    ));
    setHeartAnimationIds(prev => new Set(prev).add(videoId));
    setTimeout(() => {
      setHeartAnimationIds(prev => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    }, 800);
    try {
      await api.marketLiveInteract(videoId, 'like');
    } catch {}
  }, []);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    await loadFeed(true);
    await loadStats();
    toast.success(t('marketLive.refreshed'));
  }, [loadFeed, loadStats, t]);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    setPage(prev => prev + 1);
    await loadFeed(false);
  }, [hasMore, loading, loadFeed]);

  const handleViewDetail = useCallback((video: any) => {
    setSelectedVideo(video);
    setShowDetailSheet(true);
  }, []);

  const handleComment = useCallback((video: any) => {
    setCommentVideoId(video.id);
  }, []);

  // ─── Pull to refresh ────────────────────────────────────────────
  const [pullStart, setPullStart] = useState(0);
  const [pulling, setPulling] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (feedRef.current && feedRef.current.scrollTop === 0) {
      setPullStart(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStart > 0 && e.touches[0].clientY - pullStart > 80) {
      setPulling(true);
    }
  };

  const handleTouchEnd = () => {
    if (pulling) {
      handleRefresh();
    }
    setPullStart(0);
    setPulling(false);
  };

  // ─── Category pills ─────────────────────────────────────────────
  const categoryPills = useMemo(() => {
    return categories.map(cat => ({
      id: cat,
      label: cat === 'all' ? t('marketLive.allCategories') : t(`interests.${cat}`, cat),
      icon: cat === 'all' ? '🔥' : categoryIcons[cat] || '📦',
    }));
  }, [t]);

  return (
    <div className="max-w-md mx-auto" dir={dir}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 px-1">
        <button
          onClick={() => navigate('/')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className={`text-xl font-black flex items-center gap-2 ${textPrimary}`}>
            <Video className="w-5 h-5 text-orange-500" />
            {t('marketLive.title')}
          </h1>
          <p className={`text-[10px] ${textMuted}`}>
            {t('marketLive.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] bg-red-500 text-white px-2 py-1 rounded-full font-bold animate-pulse flex items-center gap-1">
            <Flame className="w-3 h-3" />
            {t('marketLive.live')}
          </span>
          <button
            onClick={() => navigate('/live-stream')}
            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-100 text-red-500'}`}
            title={t('marketLive.liveStream')}
          >
            <Radio className="w-4 h-4" />
          </button>
          <button
            onClick={handleRefresh}
            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <RefreshCw className={`w-4 h-4 ${textMuted}`} />
          </button>
        </div>
      </div>

      {/* Live Stats Ticker */}
      <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-3 ${
        darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-orange-50 border border-orange-100'
      }`}>
        <div className="flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-orange-500" />
          <span className={`text-[11px] font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {t('marketLive.newToday')}: <span className="text-orange-500 font-black">{stats.newToday}</span>
          </span>
        </div>
        <div className={`w-px h-4 ${darkMode ? 'bg-gray-700' : 'bg-orange-200'}`} />
        <div className="flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
          <span className={`text-[11px] font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {t('marketLive.totalViews')}: <span className="text-blue-500 font-black">{formatCompact(stats.totalViews)}</span>
          </span>
        </div>
        <div className={`w-px h-4 ${darkMode ? 'bg-gray-700' : 'bg-orange-200'}`} />
        <div className="flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5 text-purple-500" />
          <span className={`text-[11px] font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <span className="text-purple-500 font-black">{stats.totalVideos}</span>
          </span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className={`flex items-center gap-1 p-1 rounded-xl mb-3 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-black transition-all ${
            activeTab === 'feed'
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
              : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          {t('marketLive.feed')}
        </button>
        <button
          onClick={() => setActiveTab('myvideos')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-black transition-all ${
            activeTab === 'myvideos'
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
              : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          {t('marketLive.myVideos')}
        </button>
      </div>

      {activeTab === 'feed' ? (
        <>
          {/* Category Channel Switcher */}
          <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-hide">
            {categoryPills.map(cat => (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                  category === cat.id
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                    : darkMode
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="text-xs">{cat.icon}</span>
                {cat.label}
              </motion.button>
            ))}
          </div>

          {/* Add Video Button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowRecorder(true)}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl mb-3 font-black text-sm transition-colors ${
              darkMode
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-500 hover:to-amber-500'
                : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600'
            } shadow-lg shadow-orange-500/20`}
          >
            <Sparkles className="w-4 h-4" />
            {t('marketLive.addYourVideo')}
          </motion.button>

          {/* ─── Video Feed ──────────────────────────────────────────── */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-[85vh] rounded-3xl animate-pulse overflow-hidden">
                  <div className={`w-full h-full ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className={`w-16 h-16 ${darkMode ? 'text-gray-700' : 'text-gray-300'}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : videos.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-3xl border p-8 text-center ${bgCard}`}
            >
              <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
                darkMode ? 'bg-gray-700' : 'bg-orange-50'
              }`}>
                <Video className={`w-10 h-10 ${darkMode ? 'text-gray-500' : 'text-orange-300'}`} />
              </div>
              <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>
                {t('marketLive.noVideos')}
              </h3>
              <p className={`text-sm mb-4 ${textMuted}`}>
                {t('marketLive.noVideosDesc')}
              </p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowRecorder(true)}
                className="px-6 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-colors"
              >
                {t('marketLive.addVideo')}
              </motion.button>
              <p className={`text-[10px] mt-3 ${textMuted}`}>
                {t('marketLive.swipeNavigation')}
              </p>
            </motion.div>
          ) : (
            <>
              {/* Pull to refresh indicator */}
              <AnimatePresence>
                {pulling && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 40, opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex items-center justify-center gap-2 text-orange-500 text-xs font-bold"
                  >
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {t('marketLive.refresh')}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Vertical Video Feed */}
              <div
                ref={feedRef}
                onScroll={handleScroll}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="h-[85vh] overflow-y-auto snap-y snap-mandatory space-y-2 scrollbar-hide rounded-3xl"
                style={{ scrollSnapType: 'y mandatory' }}
              >
                {videos.map((video, index) => (
                  <div key={video.id || index} style={{ scrollSnapAlign: 'start' }}>
                    <VideoCard
                      video={video}
                      isActive={index === currentVideoIndex}
                      darkMode={darkMode}
                      dir={dir}
                      onLike={handleLike}
                      onSave={handleSave}
                      onShare={handleShare}
                      onContact={handleContact}
                      onDoubleTap={handleDoubleTap}
                      onViewDetail={handleViewDetail}
                      onComment={handleComment}
                      liked={interactingIds[video.id]?.liked ?? video.isLiked ?? false}
                      saved={interactingIds[video.id]?.saved ?? video.isSaved ?? false}
                      showHeart={heartAnimationIds.has(video.id)}
                      isMuted={isMuted}
                      onToggleMute={() => setIsMuted(prev => !prev)}
                    />
                  </div>
                ))}

                {/* Load More Button */}
                {hasMore && (
                  <div className="flex justify-center py-4">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleLoadMore}
                      className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                        darkMode
                          ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {t('marketLive.loadMore')}
                    </motion.button>
                  </div>
                )}
              </div>

              {/* Navigation Dots */}
              {videos.length > 1 && (
                <div className="flex items-center justify-center gap-1 mt-3">
                  {videos.slice(0, 10).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        i === currentVideoIndex
                          ? 'bg-orange-500 w-4'
                          : darkMode ? 'bg-gray-600' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <MyVideosTab darkMode={darkMode} dir={dir} onPlayVideo={(video) => {
          navigate(`/market/listing/${video.post_id || video.id}`);
        }} />
      )}

      {/* ─── Video Recorder Modal ─── */}
      <AnimatePresence>
        {showRecorder && (
          <VideoRecorder
            onClose={() => setShowRecorder(false)}
            onLinked={() => {
              setShowRecorder(false);
              if (activeTab === 'feed') loadFeed(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* ─── Product Detail Sheet ─── */}
      <AnimatePresence>
        {showDetailSheet && selectedVideo && (
          <ProductDetailSheet
            video={selectedVideo}
            darkMode={darkMode}
            dir={dir}
            onClose={() => { setShowDetailSheet(false); setSelectedVideo(null); }}
            onContact={handleContact}
            onSave={handleSave}
            saved={interactingIds[selectedVideo.id]?.saved ?? selectedVideo.isSaved ?? false}
          />
        )}
      </AnimatePresence>

      {/* ─── Comments Sheet ─── */}
      <AnimatePresence>
        {commentVideoId && (
          <CommentsSheet
            videoId={commentVideoId}
            darkMode={darkMode}
            dir={dir}
            onClose={() => setCommentVideoId(null)}
          />
        )}
      </AnimatePresence>

      {/* ─── Share Sheet ─── */}
      <AnimatePresence>
        {shareVideo && (
          <ShareSheet
            video={shareVideo}
            darkMode={darkMode}
            dir={dir}
            onClose={() => setShareVideo(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
