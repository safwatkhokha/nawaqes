// ─── Live Stream Page - Video Broadcasting with Chat ──────────────
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  Video, VideoOff, Mic, MicOff, Radio, Eye, MessageCircle,
  Settings, RotateCcw, PhoneOff, Send, Link2, X, Check,
  Clock, Users, ChevronDown, AlertCircle, Megaphone
} from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
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
}

// ─── Simulated message translation keys ───────────────────────────
const SIMULATED_MESSAGE_KEYS = [
  'livestream.simMsg1',
  'livestream.simMsg2',
  'livestream.simMsg3',
  'livestream.simMsg4',
  'livestream.simMsg5',
  'livestream.simMsg6',
  'livestream.simMsg7',
  'livestream.simMsg8',
  'livestream.simMsg9',
  'livestream.simMsg10',
];

const SIMULATED_USERS = ['أحمد', 'سارة', 'محمد', 'نور', 'خالد', 'فاطمة', 'علي', 'هدى'];

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
  const viewerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
    setViewerCount(Math.floor(Math.random() * 5) + 1);
    setPeakViewers(1);
    setShowSummary(false);

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

    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    if (viewerTimerRef.current) clearInterval(viewerTimerRef.current);
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
      // Turn off camera - stop video track but keep audio
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach(track => track.stop());
      }
      setIsCamOn(false);
    } else {
      // Turn on camera - restart
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

  // ─── Simulated Viewer Count ─────────────────────────────────────
  useEffect(() => {
    if (isLive) {
      viewerTimerRef.current = setInterval(() => {
        setViewerCount(prev => {
          const change = Math.floor(Math.random() * 5) - 2; // -2 to +2
          const next = Math.max(1, prev + change);
          return next;
        });
      }, 3000);
    }
    return () => {
      if (viewerTimerRef.current) clearInterval(viewerTimerRef.current);
    };
  }, [isLive]);

  // ─── Track Peak Viewers ─────────────────────────────────────────
  useEffect(() => {
    if (viewerCount > peakViewers) {
      setPeakViewers(viewerCount);
    }
  }, [viewerCount, peakViewers]);

  // ─── Simulated Chat Messages ────────────────────────────────────
  useEffect(() => {
    if (!isLive) return;

    const chatTimer = setInterval(() => {
      const user = SIMULATED_USERS[Math.floor(Math.random() * SIMULATED_USERS.length)];
      const msgKey = SIMULATED_MESSAGE_KEYS[Math.floor(Math.random() * SIMULATED_MESSAGE_KEYS.length)];
      const text = t(msgKey);
      const msg: LiveChatMsg = {
        id: `msg_${Date.now()}_${Math.random()}`,
        user,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user}`,
        text,
        time: new Date(),
      };
      setChatMessages(prev => [...prev, msg]);
    }, 4000 + Math.random() * 3000);

    return () => clearInterval(chatTimer);
  }, [isLive, t]);

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
    };
    setChatMessages(prev => [...prev, msg]);
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
      if (viewerTimerRef.current) clearInterval(viewerTimerRef.current);
    };
  }, [stopCamera]);

  // ─── Broadcast Summary ──────────────────────────────────────────
  if (showSummary) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? 'bg-gray-900' : 'bg-[#f8f9fa]'}`} dir={dir}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`w-full max-w-md rounded-3xl p-6 shadow-xl ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'
          }`}
        >
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('livestream.ended')}
            </h2>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('livestream.summaryDesc')}
            </p>
          </div>

          <div className="space-y-3">
            <div className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                <Clock className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{t('livestream.duration')}</span>
              </div>
              <span className={`text-sm font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatDuration(duration)}</span>
            </div>
            <div className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                <Eye className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{t('livestream.peakViewers')}</span>
              </div>
              <span className={`text-sm font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{peakViewers}</span>
            </div>
            <div className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                <MessageCircle className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{t('livestream.chatMessages')}</span>
              </div>
              <span className={`text-sm font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{chatMessages.length}</span>
            </div>
            {linkedAdId && (
              <div className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  <Link2 className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{t('livestream.linkedAd')}</span>
                </div>
                <span className={`text-sm font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('livestream.linked')}</span>
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
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-900' : 'bg-[#f8f9fa]'}`} dir={dir}>
      {/* ─── Top Bar ───────────────────────────────────────────────── */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
      }`}>
        <div className="flex items-center gap-3">
          {isLive && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex items-center gap-1.5 bg-red-500 px-2.5 py-1 rounded-full"
            >
              <Radio className="w-3 h-3 text-white" />
              <span className="text-white text-[10px] font-black">{t('livestream.live')}</span>
            </motion.div>
          )}
          <h1 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {t('livestream.liveStream')}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {isLive && (
            <>
              <div className="flex items-center gap-1.5">
                <Eye className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {viewerCount}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`text-sm font-bold tabular-nums ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
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
                <div className="text-center">
                  <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Video className="w-12 h-12 text-gray-600" />
                  </div>
                  <p className="text-gray-400 font-bold text-lg mb-2">{t('livestream.readyToStream')}</p>
                  <p className="text-gray-500 text-sm">{t('livestream.readyToStreamDesc')}</p>
                </div>
              </div>
            )}

            {/* Live indicator overlay */}
            {isLive && (
              <div className="absolute top-3 right-3 lg:top-4 lg:right-4 flex items-center gap-2">
                <motion.div
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex items-center gap-1.5 bg-red-600/90 backdrop-blur-sm px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-lg"
                >
                  <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-white rounded-full" />
                  <span className="text-white text-[10px] lg:text-xs font-black">{t('livestream.live')}</span>
                </motion.div>
              </div>
            )}

            {/* Viewers badge overlay */}
            {isLive && (
              <div className="absolute top-3 left-3 lg:top-4 lg:left-4 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-lg">
                <Eye className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-white" />
                <span className="text-white text-[10px] lg:text-xs font-bold">{viewerCount}</span>
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
              <div className="absolute bottom-3 left-3 lg:bottom-4 lg:left-4 flex items-center gap-1.5 bg-orange-600/80 backdrop-blur-sm px-2.5 py-1.5 rounded-lg">
                <Link2 className="w-3.5 h-3.5 text-white" />
                <span className="text-white text-[10px] lg:text-xs font-bold">{t('livestream.linkedAd')}</span>
              </div>
            )}
          </div>

          {/* Controls bar — always visible, responsive */}
          <div className={`flex items-center justify-center gap-2 sm:gap-3 px-2 sm:px-4 py-2.5 sm:py-3 border-t safe-bottom ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
          }`}>
            {/* Mic toggle */}
            <button
              onClick={toggleMic}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all ${
                isMicOn
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              {isMicOn ? <Mic className="w-4 h-4 sm:w-5 sm:h-5" /> : <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            {/* Camera toggle */}
            <button
              onClick={toggleCamera}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all ${
                isCamOn
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              {isCamOn ? <Video className="w-4 h-4 sm:w-5 sm:h-5" /> : <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            {/* Flip camera */}
            <button
              onClick={flipCamera}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all ${
                darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Link ad */}
            <button
              onClick={() => setShowAdLinker(true)}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all ${
                linkedAdId
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Link2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Start/End Broadcast */}
            {isLive ? (
              <button
                onClick={endBroadcast}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg active:scale-95"
              >
                <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            ) : (
              <button
                onClick={startBroadcast}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center bg-green-600 text-white hover:bg-green-700 transition-all shadow-lg active:scale-95"
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
                  <MessageCircle className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <span className={`text-sm font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {t('livestream.liveChat')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className={`w-3.5 h-3.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <span className={`text-xs font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {viewerCount}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {chatMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {t('livestream.noMessagesYet')}
                    </p>
                  </div>
                ) : (
                  chatMessages.map(msg => (
                    <div key={msg.id} className="flex items-start gap-2">
                      <img
                        src={msg.avatar}
                        alt={msg.user}
                        className="w-6 h-6 rounded-full shrink-0 mt-0.5"
                      />
                      <div className="min-w-0">
                        <span className={`text-[10px] font-black ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                          {msg.user}
                        </span>
                        <p className={`text-xs leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {msg.text}
                        </p>
                      </div>
                    </div>
                  ))
                )}
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
                    className={`flex-1 px-3 py-2 rounded-xl text-sm ${
                      darkMode
                        ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600'
                        : 'bg-gray-50 text-gray-900 placeholder-gray-400 border-gray-200'
                    } border focus:outline-none focus:ring-2 focus:ring-orange-400`}
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={!chatInput.trim()}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      chatInput.trim()
                        ? 'bg-orange-500 text-white hover:bg-orange-600 active:scale-95'
                        : darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'
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
                  {/* Handle bar */}
                  <div
                    className={`flex items-center justify-between px-4 py-2.5 border-b cursor-pointer ${
                      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
                    }`}
                    onClick={() => setShowMobileChat(false)}
                  >
                    <div className="flex items-center gap-2">
                      <MessageCircle className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <span className={`text-sm font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {t('livestream.liveChat')}
                      </span>
                    </div>
                    <X className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  </div>

                  {/* Messages */}
                  <div className={`flex-1 overflow-y-auto p-3 space-y-2 ${
                    darkMode ? 'bg-gray-900' : 'bg-gray-50'
                  }`}>
                    {chatMessages.length === 0 ? (
                      <div className="flex items-center justify-center h-20">
                        <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {t('livestream.noMessagesYet')}
                        </p>
                      </div>
                    ) : (
                      chatMessages.map(msg => (
                        <div key={msg.id} className="flex items-start gap-2">
                          <img
                            src={msg.avatar}
                            alt={msg.user}
                            className="w-6 h-6 rounded-full shrink-0 mt-0.5"
                          />
                          <div className="min-w-0">
                            <span className={`text-[10px] font-black ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                              {msg.user}
                            </span>
                            <p className={`text-xs leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {msg.text}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat input */}
                  <div className={`p-3 border-t safe-bottom ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={t('livestream.typeMessage')}
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') sendChatMessage(); }}
                        className={`flex-1 px-3 py-2 rounded-xl text-sm ${
                          darkMode
                            ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600'
                            : 'bg-gray-50 text-gray-900 placeholder-gray-400 border-gray-200'
                        } border focus:outline-none focus:ring-2 focus:ring-orange-400`}
                      />
                      <button
                        onClick={sendChatMessage}
                        disabled={!chatInput.trim()}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          chatInput.trim()
                            ? 'bg-orange-500 text-white hover:bg-orange-600 active:scale-95'
                            : darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'
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
            className={`fixed inset-0 z-[250] flex items-end justify-center`}
            onClick={() => setShowSettings(false)}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              className={`relative w-full max-w-lg rounded-t-3xl p-5 shadow-xl ${
                darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'
              }`}
              onClick={e => e.stopPropagation()}
              dir={dir}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {t('livestream.settings')}
                </h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quality selector */}
              <div className="mb-4">
                <p className={`text-xs font-black mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('livestream.streamQuality')}
                </p>
                <div className="flex gap-2">
                  {qualityOptions.map(q => (
                    <button
                      key={q.id}
                      onClick={() => setSelectedQuality(q.id)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        selectedQuality === q.id
                          ? 'bg-orange-500 text-white shadow-md'
                          : darkMode
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Camera info */}
              <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Video className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{t('livestream.camera')}</span>
                </div>
                <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {isFacingFront ? t('livestream.frontCamera') : t('livestream.rearCamera')}
                </p>
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
              className={`w-full max-w-sm rounded-2xl p-5 shadow-xl ${
                darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'
              }`}
              onClick={e => e.stopPropagation()}
              dir={dir}
            >
              <div className="text-center mb-5">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="w-7 h-7 text-red-600" />
                </div>
                <h3 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {t('livestream.endStream')}
                </h3>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('livestream.endStreamConfirm')}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={confirmEndBroadcast}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors active:scale-95"
                >
                  {t('livestream.yesEndStream')}
                </button>
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors active:scale-95 ${
                    darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('livestream.cancel')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Ad Linker Modal ────────────────────────────────────────── */}
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
              className={`w-full max-w-md rounded-2xl shadow-xl overflow-hidden ${
                darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'
              }`}
              onClick={e => e.stopPropagation()}
              dir={dir}
            >
              <div className={`flex items-center justify-between p-4 border-b ${
                darkMode ? 'border-gray-700' : 'border-gray-100'
              }`}>
                <h3 className={`font-black text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {t('livestream.linkAd')}
                </h3>
                <button
                  onClick={() => setShowAdLinker(false)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto p-3">
                {myAds.length === 0 ? (
                  <div className="text-center py-8">
                    <Megaphone className={`w-10 h-10 mx-auto mb-2 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                    <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {t('livestream.noAdsToLink')}
                    </p>
                  </div>
                ) : (
                  myAds.map(ad => (
                    <button
                      key={ad.id}
                      onClick={() => { setLinkedAdId(ad.id); setShowAdLinker(false); toast.success(t('livestream.adLinked')); }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors mb-1 ${
                        linkedAdId === ad.id
                          ? 'bg-orange-500/10 border border-orange-500/30'
                          : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                      }`}
                    >
                      {ad.image && (
                        <img src={ad.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      )}
                      <div className="min-w-0 flex-1 text-right">
                        <p className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {ad.content.slice(0, 50)}
                        </p>
                        {ad.price && (
                          <p className="text-xs text-orange-600 font-bold">{ad.price} {ad.currency || t('livestream.egp')}</p>
                        )}
                      </div>
                      {linkedAdId === ad.id && (
                        <Check className="w-5 h-5 text-orange-500 shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>

              {linkedAdId && (
                <div className={`p-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                  <button
                    onClick={() => { setLinkedAdId(null); toast.info(t('livestream.adUnlinked')); }}
                    className={`w-full py-2 rounded-xl text-sm font-bold transition-colors ${
                      darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {t('livestream.unlinkAd')}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
