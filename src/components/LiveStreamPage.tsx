// ─── Live Stream Page - Real Video Broadcasting with WebSocket Chat ─
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  Video, VideoOff, Mic, MicOff, Radio, Eye, MessageCircle,
  Settings, RotateCcw, PhoneOff, Send, Link2, X, Check,
  Clock, Users, ChevronDown, AlertCircle, Megaphone, ArrowRight
} from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { useWebSocket } from '../hooks/useWebSocket';
import { toast } from 'sonner';

// ─── Quality Options ──────────────────────────────────────────────
const qualityOptions = [
  { id: '360p', label: '360p', width: 640, height: 360 },
  { id: '480p', label: '480p', width: 854, height: 480 },
  { id: '720p', label: '720p', width: 1280, height: 720 },
];

// ─── Chat message type ────────────────────────────────────────────
interface LiveChatMsg {
  id: string;
  user: string;
  avatar: string;
  text: string;
  time: Date;
  isSelf?: boolean;
}

// ─── LiveStreamPage Component ─────────────────────────────────────
export const LiveStreamPage: React.FC = () => {
  const { darkMode, posts } = useAppContext();
  const { currentUser } = useAuth();
  const { dir } = useLanguage();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ─── State ──────────────────────────────────────────────────────
  const [isLive, setIsLive] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isFacingFront, setIsFacingFront] = useState(true);
  const [selectedQuality, setSelectedQuality] = useState('720p');
  const [showSettings, setShowSettings] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [peakViewers, setPeakViewers] = useState(0);
  const [duration, setDuration] = useState(0);
  const [chatMessages, setChatMessages] = useState<LiveChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [linkedAdId, setLinkedAdId] = useState<string | null>(null);
  const [showAdLinker, setShowAdLinker] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  // ─── Refs ───────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Stream ID = current user ID (each user has one active stream)
  const streamId = currentUser?.id || '';

  // ─── WebSocket for livestream events ────────────────────────────
  const {
    sendLivestreamStart,
    sendLivestreamEnd,
    sendLivestreamChat,
    sendLivestreamJoin,
    sendLivestreamLeave,
    onLivestreamChat,
    onLivestreamViewerJoined,
    onLivestreamViewerLeft,
  } = useWebSocket({
    autoConnect: true,
    onLivestreamChat: (data: any) => {
      // Receive chat messages from other users
      const msg: LiveChatMsg = {
        id: `msg_${Date.now()}_${Math.random()}`,
        user: data.userName || 'مستخدم',
        avatar: data.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.userId}`,
        text: data.text,
        time: new Date(data.time || Date.now()),
        isSelf: data.userId === currentUser?.id,
      };
      setChatMessages(prev => [...prev, msg]);
    },
    onLivestreamViewerJoined: () => {
      setViewerCount(prev => prev + 1);
    },
    onLivestreamViewerLeft: () => {
      setViewerCount(prev => Math.max(0, prev - 1));
    },
  });

  // ─── Start Camera ───────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Check if mediaDevices API is available (requires HTTPS or localhost)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error(t('livestream.cameraError') + ' - ' + (t('messages.callSecureContextRequired', 'يتطلب اتصالاً آمناً (HTTPS)')));
        return null;
      }

      // Pre-check permission status using Permissions API
      try {
        const micPerm = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (micPerm.state === 'denied') {
          toast.error(t('livestream.cameraError') + ' - ' + (t('messages.permissionAudioTitle', 'السماح بالوصول للميكروفون من إعدادات المتصفح')));
          return null;
        }
        const camPerm = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (camPerm.state === 'denied') {
          toast.error(t('livestream.cameraError') + ' - ' + (t('messages.permissionVideoTitle', 'السماح بالوصول للكاميرا من إعدادات المتصفح')));
          return null;
        }
      } catch {
        // Permissions API not supported — continue with getUserMedia
      }

      const quality = qualityOptions.find(q => q.id === selectedQuality) || qualityOptions[2];
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: isFacingFront ? 'user' : 'environment',
          width: { ideal: quality.width },
          height: { ideal: quality.height },
        },
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Mute video element if mic is off
      stream.getAudioTracks().forEach(track => {
        track.enabled = isMicOn;
      });

      return stream;
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error(t('livestream.cameraError') + ' - ' + (t('messages.permissionStep1', 'انقر على أيقونة القفل في شريط العنوان للسماح بالوصول')));
      } else if (err.name === 'NotFoundError') {
        toast.error(t('livestream.cameraError') + ' - لا يوجد كاميرا/ميكروفون متاح');
      } else if (err.name === 'NotReadableError') {
        toast.error(t('livestream.cameraError') + ' - الكاميرا/الميكروفون قيد الاستخدام');
      } else {
        toast.error(t('livestream.cameraError'));
      }
      return null;
    }
  }, [isFacingFront, selectedQuality, isMicOn, t]);

  // ─── Stop Camera ────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // ─── Start Broadcast ────────────────────────────────────────────
  const startBroadcast = async () => {
    const stream = await startCamera();
    if (!stream) return;

    setIsLive(true);
    setDuration(0);
    setViewerCount(0);
    setPeakViewers(0);
    setShowSummary(false);
    setChatMessages([]);

    // Notify all users via WebSocket that livestream started
    sendLivestreamStart({
      streamId,
      title: '',
      userName: currentUser?.name || '',
      userAvatar: currentUser?.avatar || '',
    });

    toast.success(t('livestream.started'));
  };

  // ─── End Broadcast ──────────────────────────────────────────────
  const endBroadcast = () => {
    setShowEndConfirm(true);
  };

  const confirmEndBroadcast = () => {
    setIsLive(false);
    stopCamera();
    setShowEndConfirm(false);
    setShowSummary(true);

    // Notify all users via WebSocket that livestream ended
    sendLivestreamEnd(streamId);

    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
  };

  // ─── Toggle Mic ─────────────────────────────────────────────────
  const toggleMic = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !isMicOn;
      });
    }
    setIsMicOn(prev => !prev);
  };

  // ─── Toggle Camera ──────────────────────────────────────────────
  const toggleCamera = async () => {
    if (isCamOn) {
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach(track => track.stop());
      }
      setIsCamOn(false);
    } else {
      const stream = await startCamera();
      if (stream) {
        setIsCamOn(true);
      }
    }
  };

  // ─── Flip Camera ────────────────────────────────────────────────
  const flipCamera = async () => {
    setIsFacingFront(prev => !prev);
    if (isLive || streamRef.current) {
      const stream = await startCamera();
      if (stream) {
        setIsCamOn(true);
      }
    }
  };

  // ─── Duration Timer ─────────────────────────────────────────────
  useEffect(() => {
    if (isLive) {
      durationTimerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [isLive]);

  // ─── Track Peak Viewers ─────────────────────────────────────────
  useEffect(() => {
    if (viewerCount > peakViewers) {
      setPeakViewers(viewerCount);
    }
  }, [viewerCount, peakViewers]);

  // ─── Auto-scroll chat ───────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ─── Send Chat Message ──────────────────────────────────────────
  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    const msg: LiveChatMsg = {
      id: `msg_${Date.now()}_self`,
      user: currentUser?.name || t('livestream.you'),
      avatar: currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=self`,
      text: chatInput.trim(),
      time: new Date(),
      isSelf: true,
    };
    setChatMessages(prev => [...prev, msg]);

    // Send via WebSocket to all viewers
    sendLivestreamChat(streamId, chatInput.trim());

    setChatInput('');
  };

  // ─── Format Duration ────────────────────────────────────────────
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ─── User's ads for linking ─────────────────────────────────────
  const myAds = posts.filter(p => p.author.id === currentUser?.id && p.type === 'ad');

  // ─── Cleanup on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopCamera();
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      // Notify end if still live
      if (isLive) {
        sendLivestreamEnd(streamId);
      }
    };
  }, [stopCamera]);

  const bgMain = darkMode ? 'bg-gray-900' : 'bg-[#f8f9fa]';
  const bgCard = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';

  // ─── Broadcast Summary ──────────────────────────────────────────
  if (showSummary) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${bgMain}`} dir={dir}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`w-full max-w-md rounded-3xl p-6 shadow-xl ${bgCard}`}
        >
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className={`text-2xl font-black ${textPrimary}`}>
              {t('livestream.ended')}
            </h2>
            <p className={`text-sm mt-1 ${textMuted}`}>
              {t('livestream.summaryDesc')}
            </p>
          </div>

          <div className="space-y-3">
            <div className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                <Clock className={`w-5 h-5 ${textMuted}`} />
                <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{t('livestream.duration')}</span>
              </div>
              <span className={`text-sm font-black ${textPrimary}`}>{formatDuration(duration)}</span>
            </div>
            <div className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                <Eye className={`w-5 h-5 ${textMuted}`} />
                <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{t('livestream.peakViewers')}</span>
              </div>
              <span className={`text-sm font-black ${textPrimary}`}>{peakViewers}</span>
            </div>
            <div className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                <MessageCircle className={`w-5 h-5 ${textMuted}`} />
                <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{t('livestream.chatMessages')}</span>
              </div>
              <span className={`text-sm font-black ${textPrimary}`}>{chatMessages.length}</span>
            </div>
            {linkedAdId && (
              <div className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  <Link2 className={`w-5 h-5 ${textMuted}`} />
                  <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{t('livestream.linkedAd')}</span>
                </div>
                <span className={`text-sm font-black ${textPrimary}`}>{t('livestream.linked')}</span>
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => { setShowSummary(false); setChatMessages([]); setDuration(0); setPeakViewers(0); setViewerCount(0); }}
              className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors active:scale-95"
            >
              {t('livestream.newBroadcast')}
            </button>
            <button
              onClick={() => navigate('/')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors active:scale-95 ${
                darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {t('livestream.backToHome')}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${bgMain}`} dir={dir}>
      {/* ─── Top Bar ───────────────────────────────────────────────── */}
      <div className={`flex items-center justify-between px-3 py-2.5 border-b ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
      }`}>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <ArrowRight className="w-4 h-4" />
          </button>
          {isLive && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex items-center gap-1 bg-red-500 px-2 py-0.5 rounded-full"
            >
              <Radio className="w-3 h-3 text-white" />
              <span className="text-white text-[10px] font-black">{t('livestream.live')}</span>
            </motion.div>
          )}
          <h1 className={`text-base font-black ${textPrimary}`}>
            {t('livestream.liveStream')}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {isLive && (
            <>
              <div className="flex items-center gap-1">
                <Eye className={`w-3.5 h-3.5 ${textMuted}`} />
                <span className={`text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {viewerCount}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className={`w-3.5 h-3.5 ${textMuted}`} />
                <span className={`text-xs font-bold tabular-nums ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {formatDuration(duration)}
                </span>
              </div>
            </>
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Main Content ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Video area */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className={`relative flex-1 flex items-center justify-center min-h-0 ${
            darkMode ? 'bg-gray-950' : 'bg-gray-900'
          }`}>
            {/* Video preview */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isCamOn ? '' : 'hidden'}`}
              style={{ transform: isFacingFront ? 'scaleX(-1)' : 'none' }}
            />

            {/* Camera off overlay */}
            {!isCamOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center">
                  <VideoOff className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 font-bold text-sm">{t('livestream.cameraOff')}</p>
                </div>
              </div>
            )}

            {/* Not live placeholder */}
            {!isLive && !streamRef.current && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center px-6">
                  <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Video className="w-12 h-12 text-gray-600" />
                  </div>
                  <p className="text-gray-400 font-bold text-lg mb-2">{t('livestream.readyToStream')}</p>
                  <p className="text-gray-500 text-sm mb-6">{t('livestream.readyToStreamDesc')}</p>
                  {/* Start button directly on the video area for mobile visibility */}
                  <button
                    onClick={startBroadcast}
                    className="px-8 py-3.5 rounded-2xl bg-gradient-to-l from-green-500 to-green-600 text-white font-bold text-base shadow-lg shadow-green-500/30 active:scale-95 transition-transform flex items-center gap-2 mx-auto"
                  >
                    <Radio className="w-5 h-5" />
                    {t('livestream.liveStream')}
                  </button>
                </div>
              </div>
            )}

            {/* Live indicator overlay */}
            {isLive && (
              <div className="absolute top-3 right-3 lg:top-4 lg:right-4 flex items-center gap-2">
                <motion.div
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex items-center gap-1.5 bg-red-600/90 backdrop-blur-sm px-2.5 py-1 rounded-lg"
                >
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  <span className="text-white text-[10px] font-black">{t('livestream.live')}</span>
                </motion.div>
              </div>
            )}

            {/* Viewers badge overlay */}
            {isLive && (
              <div className="absolute top-3 left-3 lg:top-4 lg:left-4 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                <Eye className="w-3 h-3 text-white" />
                <span className="text-white text-[10px] font-bold">{viewerCount}</span>
              </div>
            )}

            {/* Mobile Chat toggle button (only when live) */}
            {isLive && (
              <button
                onClick={() => setShowMobileChat(!showMobileChat)}
                className={`lg:hidden absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-2 rounded-xl shadow-lg transition-all active:scale-95 ${
                  showMobileChat
                    ? 'bg-orange-500 text-white'
                    : 'bg-black/60 backdrop-blur-sm text-white'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-[10px] font-bold">{chatMessages.length}</span>
              </button>
            )}

            {/* Linked ad badge */}
            {isLive && linkedAdId && (
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-orange-600/80 backdrop-blur-sm px-2.5 py-1.5 rounded-lg">
                <Link2 className="w-3.5 h-3.5 text-white" />
                <span className="text-white text-[10px] font-bold">{t('livestream.linkedAd')}</span>
              </div>
            )}
          </div>

          {/* Controls bar — always visible, mobile-friendly */}
          <div className={`flex items-center justify-center gap-2 sm:gap-3 px-2 sm:px-4 py-3 sm:py-3 border-t ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
          }`} style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            {/* Mic toggle */}
            <button
              onClick={toggleMic}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                isMicOn
                  ? (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            {/* Camera toggle */}
            <button
              onClick={toggleCamera}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                isCamOn
                  ? (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              {isCamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            {/* Flip camera */}
            <button
              onClick={flipCamera}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Link ad */}
            <button
              onClick={() => setShowAdLinker(true)}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                linkedAdId
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Link2 className="w-5 h-5" />
            </button>

            {/* Start/End Broadcast */}
            {isLive ? (
              <button
                onClick={endBroadcast}
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg active:scale-90"
                style={{ width: '3.25rem', height: '3.25rem' }}
              >
                <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            ) : (
              <button
                onClick={startBroadcast}
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center bg-green-600 text-white hover:bg-green-700 transition-all shadow-lg active:scale-90"
                style={{ width: '3.25rem', height: '3.25rem' }}
              >
                <Radio className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}
          </div>
        </div>

        {/* ─── Chat Panel — Desktop: sidebar, Mobile: overlay ──── */}
        {isLive && (
          <>
            {/* Desktop: sidebar */}
            <div className={`hidden lg:flex w-80 flex-col border-l ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
            }`}>
              <div className={`px-4 py-3 border-b flex items-center justify-between ${
                darkMode ? 'border-gray-700' : 'border-gray-100'
              }`}>
                <div className="flex items-center gap-2">
                  <MessageCircle className={`w-4 h-4 ${textMuted}`} />
                  <span className={`text-sm font-black ${textPrimary}`}>
                    {t('livestream.liveChat')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className={`w-3.5 h-3.5 ${textMuted}`} />
                  <span className={`text-xs font-bold ${textMuted}`}>{viewerCount}</span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {chatMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className={`text-xs ${textMuted}`}>{t('livestream.noMessagesYet')}</p>
                  </div>
                ) : chatMessages.map(msg => (
                  <div key={msg.id} className="flex items-start gap-2">
                    <img src={msg.avatar} alt={msg.user} className="w-6 h-6 rounded-full shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className={`text-[10px] font-black ${msg.isSelf ? 'text-blue-400' : (darkMode ? 'text-orange-400' : 'text-orange-600')}`}>
                        {msg.user}
                      </span>
                      <p className={`text-xs leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{msg.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat input */}
              <div className={`p-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={t('livestream.typeMessage')}
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') sendChatMessage(); }}
                    className={`flex-1 px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                      darkMode ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600' : 'bg-gray-50 text-gray-900 placeholder-gray-400 border-gray-200'
                    }`}
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={!chatInput.trim()}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      chatInput.trim() ? 'bg-orange-500 text-white hover:bg-orange-600 active:scale-95' : darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile: overlay chat panel */}
            <AnimatePresence>
              {showMobileChat && (
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="lg:hidden fixed inset-x-0 bottom-0 z-[200] flex flex-col"
                  style={{ maxHeight: '60vh' }}
                >
                  <div
                    className={`flex items-center justify-between px-4 py-2.5 border-b cursor-pointer ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
                    onClick={() => setShowMobileChat(false)}
                  >
                    <div className="flex items-center gap-2">
                      <MessageCircle className={`w-4 h-4 ${textMuted}`} />
                      <span className={`text-sm font-black ${textPrimary}`}>{t('livestream.liveChat')}</span>
                    </div>
                    <X className={`w-4 h-4 ${textMuted}`} />
                  </div>

                  <div className={`flex-1 overflow-y-auto p-3 space-y-2 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                    {chatMessages.length === 0 ? (
                      <div className="flex items-center justify-center h-20">
                        <p className={`text-xs ${textMuted}`}>{t('livestream.noMessagesYet')}</p>
                      </div>
                    ) : chatMessages.map(msg => (
                      <div key={msg.id} className="flex items-start gap-2">
                        <img src={msg.avatar} alt={msg.user} className="w-6 h-6 rounded-full shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className={`text-[10px] font-black ${msg.isSelf ? 'text-blue-400' : (darkMode ? 'text-orange-400' : 'text-orange-600')}`}>
                            {msg.user}
                          </span>
                          <p className={`text-xs leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{msg.text}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  <div className={`p-3 border-t ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={t('livestream.typeMessage')}
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') sendChatMessage(); }}
                        className={`flex-1 px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                          darkMode ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600' : 'bg-gray-50 text-gray-900 placeholder-gray-400 border-gray-200'
                        }`}
                      />
                      <button
                        onClick={sendChatMessage}
                        disabled={!chatInput.trim()}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          chatInput.trim() ? 'bg-orange-500 text-white hover:bg-orange-600 active:scale-95' : darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* ─── Settings Panel ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-[250] flex items-end justify-center"
            onClick={() => setShowSettings(false)}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              className={`relative w-full max-w-lg rounded-t-3xl p-5 shadow-xl ${bgCard}`}
              onClick={e => e.stopPropagation()}
              dir={dir}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className={`text-lg font-black ${textPrimary}`}>{t('livestream.settings')}</h3>
                <button onClick={() => setShowSettings(false)} className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-4">
                <p className={`text-xs font-black mb-2 ${textMuted}`}>{t('livestream.streamQuality')}</p>
                <div className="flex gap-2">
                  {qualityOptions.map(q => (
                    <button key={q.id} onClick={() => setSelectedQuality(q.id)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        selectedQuality === q.id ? 'bg-orange-500 text-white shadow-md' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >{q.label}</button>
                  ))}
                </div>
              </div>

              <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Video className={`w-4 h-4 ${textMuted}`} />
                  <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{t('livestream.camera')}</span>
                </div>
                <p className={`text-xs ${textMuted}`}>{isFacingFront ? t('livestream.frontCamera') : t('livestream.rearCamera')}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── End Broadcast Confirmation ─────────────────────────────── */}
      <AnimatePresence>
        {showEndConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowEndConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-sm rounded-2xl p-5 shadow-xl ${bgCard}`}
              onClick={e => e.stopPropagation()}
              dir={dir}
            >
              <div className="text-center mb-5">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="w-7 h-7 text-red-600" />
                </div>
                <h3 className={`text-lg font-black ${textPrimary}`}>{t('livestream.endStream')}</h3>
                <p className={`text-sm mt-1 ${textMuted}`}>{t('livestream.endStreamConfirm')}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                >{t('livestream.cancel')}</button>
                <button
                  onClick={confirmEndBroadcast}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors active:scale-95"
                >{t('livestream.yesEndStream')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Ad Linker Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showAdLinker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowAdLinker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-sm rounded-2xl p-5 shadow-xl ${bgCard}`}
              onClick={e => e.stopPropagation()}
              dir={dir}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-black ${textPrimary}`}>{t('livestream.linkAd')}</h3>
                <button onClick={() => setShowAdLinker(false)} className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {myAds.length === 0 ? (
                <div className="text-center py-6">
                  <Megaphone className={`w-10 h-10 mx-auto mb-2 ${textMuted}`} />
                  <p className={`text-sm ${textMuted}`}>{t('livestream.noAdsToLink')}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {myAds.map(ad => (
                    <button
                      key={ad.id}
                      onClick={() => {
                        setLinkedAdId(prev => prev === ad.id ? null : ad.id);
                        toast.success(prev => prev === ad.id ? t('livestream.adUnlinked') : t('livestream.adLinked'));
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-right ${
                        linkedAdId === ad.id
                          ? (darkMode ? 'bg-orange-900/30 border border-orange-500' : 'bg-orange-50 border border-orange-300')
                          : (darkMode ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100')
                      }`}
                    >
                      <img src={ad.images?.[0] || ad.author?.avatar || ''} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${textPrimary}`}>{ad.content.slice(0, 40)}...</p>
                        {ad.price && <p className="text-xs text-orange-500 font-bold">{ad.price} {t('livestream.egp')}</p>}
                      </div>
                      {linkedAdId === ad.id && <Check className="w-5 h-5 text-orange-500" />}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
