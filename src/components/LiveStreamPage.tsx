// ─── Live Stream Page - Real Video Broadcasting with WebRTC + WebSocket Chat ─
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Video, VideoOff, Mic, MicOff, Radio, Eye, MessageCircle,
  Settings, RotateCcw, PhoneOff, Send, Link2, X, Check,
  Clock, Users, ChevronDown, AlertCircle, Megaphone, ArrowRight,
  Loader2, UserCircle
} from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { useWebSocket } from '../hooks/useWebSocket';
import { api } from '../services/api';
import { toast } from 'sonner';

// ─── ICE Servers for WebRTC ────────────────────────────────────────
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
};

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
  const { hostId } = useParams<{ hostId?: string }>();

  // Determine mode: broadcaster (no hostId or hostId === me) or viewer
  const isViewer = !!(hostId && hostId !== currentUser?.id);
  const effectiveHostId = isViewer ? hostId! : (currentUser?.id || '');

  // ─── Broadcaster State ──────────────────────────────────────────
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
  const [linkedAdId, setLinkedAdId] = useState<string | null>(null);
  const [showAdLinker, setShowAdLinker] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  // ─── Viewer State ───────────────────────────────────────────────
  const [viewerStream, setViewerStream] = useState<MediaStream | null>(null);
  const [viewerConnecting, setViewerConnecting] = useState(false);
  const [hostInfo, setHostInfo] = useState<{ name: string; avatar: string } | null>(null);

  // ─── Shared State ───────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<LiveChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');

  // ─── Refs ───────────────────────────────────────────────────────
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  // WebRTC peer connections: Map<viewerId, RTCPeerConnection> (broadcaster) or single connection (viewer)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const viewerPeerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // Stream ID = host user ID
  const streamId = effectiveHostId;

  // ─── Track message IDs to prevent duplicates ─────────────────────
  const chatMessageIdsRef = useRef<Set<string>>(new Set());

  // ─── WebSocket for livestream events ────────────────────────────
  const {
    sendLivestreamStart,
    sendLivestreamEnd,
    sendLivestreamChat,
    sendLivestreamJoin,
    sendLivestreamLeave,
    sendLivestreamSignal,
    isConnected: isWsConnected,
  } = useWebSocket({
    autoConnect: true,
    onLivestreamChat: (data: any) => {
      // Skip own messages - we already add them locally in sendChatMessage()
      // This prevents duplicates from the WebSocket broadcast
      if (data.userId === currentUser?.id) return;

      // Create a stable ID to prevent duplicates from reconnections/re-renders
      const msgId = `msg_${data.userId}_${data.time}_${data.text?.substring(0, 20)}`;
      if (chatMessageIdsRef.current.has(msgId)) return; // Already have this message
      chatMessageIdsRef.current.add(msgId);

      const msg: LiveChatMsg = {
        id: msgId,
        user: data.userName || 'مستخدم',
        avatar: data.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.userId}`,
        text: data.text,
        time: new Date(data.time || Date.now()),
        isSelf: false,
      };
      setChatMessages(prev => [...prev, msg]);
    },
    onLivestreamViewerJoined: (data: any) => {
      setViewerCount(prev => prev + 1);
      // CRITICAL: When a viewer joins, the broadcaster MUST create a peer connection
      // and send an offer so the viewer can receive the stream
      if (!isViewer && data.viewerId) {
        console.log('[Livestream] Viewer joined, creating peer connection for:', data.viewerId);
        createBroadcasterPeerConnection(data.viewerId);
      }
    },
    onLivestreamViewerLeft: (data: any) => {
      setViewerCount(prev => Math.max(0, prev - 1));
      // Clean up peer connection for the viewer who left
      if (!isViewer && data.viewerId) {
        const pc = peerConnectionsRef.current.get(data.viewerId);
        if (pc) {
          pc.close();
          peerConnectionsRef.current.delete(data.viewerId);
        }
      }
    },
    // Broadcaster: receive viewer's WebRTC answer
    onLivestreamSignal: (data: any) => {
      handleIncomingSignal(data);
    },
  });

  // ─── Handle incoming WebRTC signals ─────────────────────────────
  const handleIncomingSignal = useCallback(async (data: any) => {
    const { fromId, signal } = data;
    if (!signal) return;

    // Strip non-WebRTC fields from signal (e.g., targetViewer)
    const cleanSignal = { ...signal };
    delete cleanSignal.targetViewer;

    try {
      if (cleanSignal.type === 'answer' && !isViewer) {
        // Broadcaster receives answer from a viewer
        const pc = peerConnectionsRef.current.get(fromId);
        if (pc && pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(cleanSignal));
        }
      } else if (cleanSignal.type === 'offer' && isViewer) {
        // Viewer receives offer from broadcaster
        if (!viewerPeerConnectionRef.current) {
          console.warn('[Livestream] Received offer but no peer connection');
          return;
        }
        const pc = viewerPeerConnectionRef.current;
        // Only process offer if we haven't already set a remote description
        if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
          console.warn('[Livestream] Skipping offer, signaling state:', pc.signalingState);
          return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(cleanSignal));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Wait for ICE gathering
        await new Promise<void>((resolve) => {
          if (pc.iceGatheringState === 'complete') { resolve(); return; }
          const timeout = setTimeout(resolve, 2000);
          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') { clearTimeout(timeout); resolve(); }
          };
        });

        sendLivestreamSignal(streamId, pc.localDescription);
      } else if (cleanSignal.candidate) {
        // ICE candidate - only process if we have a relevant peer connection
        if (isViewer && viewerPeerConnectionRef.current) {
          // Only add ICE candidates from the broadcaster (fromId should be the stream host)
          if (fromId === streamId) {
            await viewerPeerConnectionRef.current.addIceCandidate(new RTCIceCandidate(cleanSignal.candidate));
          }
        } else if (!isViewer) {
          // Broadcaster: add ICE candidate from a specific viewer
          const pc = peerConnectionsRef.current.get(fromId);
          if (pc) await pc.addIceCandidate(new RTCIceCandidate(cleanSignal.candidate));
        }
      }
    } catch (err) {
      console.error('[Livestream] Signal error:', err);
    }
  }, [isViewer, streamId, sendLivestreamSignal]);

  // ─── Broadcaster: Create peer connection for a new viewer ───────
  const createBroadcasterPeerConnection = useCallback((viewerUserId: string) => {
    if (!streamRef.current) return;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current.set(viewerUserId, pc);

    // Add local tracks
    streamRef.current.getTracks().forEach(track => {
      pc.addTrack(track, streamRef.current!);
    });

    // ICE candidates → send to specific viewer via signal
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendLivestreamSignal(streamId, { candidate: event.candidate, targetViewer: viewerUserId });
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        peerConnectionsRef.current.delete(viewerUserId);
      }
    };

    // Create and send offer
    (async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Wait for ICE gathering
        await new Promise<void>((resolve) => {
          if (pc.iceGatheringState === 'complete') { resolve(); return; }
          const timeout = setTimeout(resolve, 2000);
          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') { clearTimeout(timeout); resolve(); }
          };
        });

        // Include targetViewer in the offer so the signal goes to the right viewer
        const offerWithTarget = {
          ...pc.localDescription?.toJSON(),
          targetViewer: viewerUserId,
        };
        sendLivestreamSignal(streamId, offerWithTarget);
      } catch (err) {
        console.error('[Livestream] Offer creation error:', err);
      }
    })();
  }, [streamId, sendLivestreamSignal]);

  // ─── Viewer: Join stream and create WebRTC connection ───────────
  const joinStream = useCallback(async () => {
    if (!hostId) return;
    setViewerConnecting(true);

    try {
      // Get host info from API
      const activeStreams = await api.getActiveLivestreams();
      const hostStream = activeStreams.find((s: any) => s.hostId === hostId);
      if (hostStream) {
        setHostInfo({ name: hostStream.hostName, avatar: hostStream.hostAvatar });
      }

      // Create WebRTC peer connection as viewer
      const pc = new RTCPeerConnection(ICE_SERVERS);
      viewerPeerConnectionRef.current = pc;

      // Collect remote tracks
      const remoteTracks: MediaStreamTrack[] = [];
      pc.ontrack = (event) => {
        if (event.streams[0]) {
          event.streams[0].getTracks().forEach(track => {
            if (!remoteTracks.find(t => t.id === track.id)) remoteTracks.push(track);
          });
        } else {
          if (!remoteTracks.find(t => t.id === event.track.id)) remoteTracks.push(event.track);
        }
        const newStream = new MediaStream(remoteTracks);
        setViewerStream(newStream);
      };

      // ICE candidates → send to broadcaster via signal
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendLivestreamSignal(streamId, { candidate: event.candidate });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setViewerStream(null);
        }
      };

      // Notify the broadcaster that we joined
      sendLivestreamJoin(hostId);

      // The broadcaster will create an offer and send it via signal
      // We handle the offer in handleIncomingSignal
      setViewerConnecting(false);
    } catch (err) {
      console.error('[Livestream] Join error:', err);
      toast.error(t('livestream.joinError', 'فشل الانضمام للبث'));
      setViewerConnecting(false);
    }
  }, [hostId, streamId, sendLivestreamSignal, sendLivestreamJoin, t]);

  // ─── Viewer: Leave stream ───────────────────────────────────────
  const leaveStream = useCallback(() => {
    if (hostId) {
      sendLivestreamLeave(hostId);
    }
    if (viewerPeerConnectionRef.current) {
      viewerPeerConnectionRef.current.close();
      viewerPeerConnectionRef.current = null;
    }
    setViewerStream(null);
    navigate('/');
  }, [hostId, sendLivestreamLeave, navigate]);

  // ─── Attach remote stream to video element (viewer) ─────────────
  useEffect(() => {
    if (viewerStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = viewerStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [viewerStream]);

  // ─── Auto-join as viewer when hostId is set and WebSocket is connected ───
  // CRITICAL: Must wait for WebSocket to be connected before joining,
  // otherwise the join message is lost and the broadcaster never sends an offer
  const hasJoinedRef = useRef(false);
  useEffect(() => {
    if (isViewer && hostId && isWsConnected && !hasJoinedRef.current) {
      hasJoinedRef.current = true;
      joinStream();
    }
    return () => {
      if (viewerPeerConnectionRef.current) {
        viewerPeerConnectionRef.current.close();
        viewerPeerConnectionRef.current = null;
      }
      if (hostId) sendLivestreamLeave(hostId);
    };
  }, [isViewer, hostId, isWsConnected]); // Re-run when WS connects

  // ─── Start Camera (Broadcaster) ─────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error(t('livestream.cameraError') + ' - ' + (t('messages.callSecureContextRequired', 'يتطلب اتصالاً آمناً (HTTPS)')));
        return null;
      }

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
      } catch {}

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

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      stream.getAudioTracks().forEach(track => { track.enabled = isMicOn; });
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

  // ─── Stop Camera (Broadcaster) ──────────────────────────────────
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
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
    chatMessageIdsRef.current.clear(); // Clear dedup tracking

    sendLivestreamStart({
      streamId,
      title: '',
      userName: currentUser?.name || '',
      userAvatar: currentUser?.avatar || '',
    });

    try {
      api.notifyFriendsLivestream('').catch(() => {});
    } catch {}

    toast.success(t('livestream.started'));
  };

  // ─── End Broadcast ──────────────────────────────────────────────
  const endBroadcast = () => { setShowEndConfirm(true); };

  const confirmEndBroadcast = () => {
    setIsLive(false);
    stopCamera();
    setShowEndConfirm(false);
    setShowSummary(true);
    sendLivestreamEnd(streamId);
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
  };

  // ─── Toggle Mic ─────────────────────────────────────────────────
  const toggleMic = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => { track.enabled = !isMicOn; });
    }
    setIsMicOn(prev => !prev);
  };

  // ─── Toggle Camera ──────────────────────────────────────────────
  const toggleCamera = async () => {
    if (isCamOn) {
      if (streamRef.current) { streamRef.current.getVideoTracks().forEach(track => track.stop()); }
      setIsCamOn(false);
    } else {
      const stream = await startCamera();
      if (stream) setIsCamOn(true);
    }
  };

  // ─── Flip Camera ────────────────────────────────────────────────
  const flipCamera = async () => {
    setIsFacingFront(prev => !prev);
    if (isLive || streamRef.current) {
      const stream = await startCamera();
      if (stream) setIsCamOn(true);
    }
  };

  // ─── Duration Timer ─────────────────────────────────────────────
  useEffect(() => {
    if (isLive) {
      durationTimerRef.current = setInterval(() => { setDuration(prev => prev + 1); }, 1000);
    }
    return () => { if (durationTimerRef.current) clearInterval(durationTimerRef.current); };
  }, [isLive]);

  useEffect(() => { if (viewerCount > peakViewers) setPeakViewers(viewerCount); }, [viewerCount, peakViewers]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  // ─── Send Chat Message ──────────────────────────────────────────
  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    const msgId = `msg_self_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    // Track the message ID to prevent duplicates
    chatMessageIdsRef.current.add(msgId);
    const msg: LiveChatMsg = {
      id: msgId,
      user: currentUser?.name || t('livestream.you'),
      avatar: currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=self`,
      text: chatInput.trim(),
      time: new Date(),
      isSelf: true,
    };
    setChatMessages(prev => [...prev, msg]);
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

  const myAds = posts.filter(p => p.author.id === currentUser?.id && p.type === 'ad');

  // ─── Cleanup on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopCamera();
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      if (isLive) sendLivestreamEnd(streamId);
      if (viewerPeerConnectionRef.current) viewerPeerConnectionRef.current.close();
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
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`w-full max-w-md rounded-3xl p-6 shadow-xl ${bgCard}`}>
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className={`text-2xl font-black ${textPrimary}`}>{t('livestream.ended')}</h2>
            <p className={`text-sm mt-1 ${textMuted}`}>{t('livestream.summaryDesc')}</p>
          </div>
          <div className="space-y-3">
            <div className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2"><Clock className={`w-5 h-5 ${textMuted}`} /><span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{t('livestream.duration')}</span></div>
              <span className={`text-sm font-black ${textPrimary}`}>{formatDuration(duration)}</span>
            </div>
            <div className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2"><Eye className={`w-5 h-5 ${textMuted}`} /><span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{t('livestream.peakViewers')}</span></div>
              <span className={`text-sm font-black ${textPrimary}`}>{peakViewers}</span>
            </div>
            <div className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2"><MessageCircle className={`w-5 h-5 ${textMuted}`} /><span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{t('livestream.chatMessages')}</span></div>
              <span className={`text-sm font-black ${textPrimary}`}>{chatMessages.length}</span>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={() => { setShowSummary(false); setChatMessages([]); setDuration(0); setPeakViewers(0); setViewerCount(0); }} className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors active:scale-95">{t('livestream.newBroadcast')}</button>
            <button onClick={() => navigate('/')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors active:scale-95 ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>{t('livestream.backToHome')}</button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ─── VIEWER MODE ─────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════
  if (isViewer) {
    return (
      <div className={`min-h-screen flex flex-col ${bgMain}`} dir={dir}>
        {/* Top Bar */}
        <div className={`flex items-center justify-between px-3 py-2.5 border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center gap-2">
            <button onClick={leaveStream} className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
              <ArrowRight className="w-4 h-4" />
            </button>
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="flex items-center gap-1 bg-red-500 px-2 py-0.5 rounded-full">
              <Radio className="w-3 h-3 text-white" />
              <span className="text-white text-[10px] font-black">{t('livestream.live')}</span>
            </motion.div>
            <h1 className={`text-base font-black ${textPrimary}`}>
              {hostInfo?.name || t('livestream.liveStream')}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Eye className={`w-3.5 h-3.5 ${textMuted}`} />
              <span className={`text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{viewerCount}</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0">
            <div className={`relative flex-1 flex items-center justify-center min-h-0 ${darkMode ? 'bg-gray-950' : 'bg-gray-900'}`}>
              {/* Remote video from broadcaster */}
              <video ref={remoteVideoRef} autoPlay playsInline className={`w-full h-full object-cover ${viewerStream ? '' : 'hidden'}`} />

              {/* Connecting state */}
              {viewerConnecting && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 text-orange-500 mx-auto mb-3 animate-spin" />
                    <p className="text-gray-400 font-bold text-sm">{t('livestream.connecting', 'جاري الاتصال بالبث...')}</p>
                  </div>
                </div>
              )}

              {/* No stream yet - show host info */}
              {!viewerStream && !viewerConnecting && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center px-6">
                    <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                      {hostInfo?.avatar ? (
                        <img src={hostInfo.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle className="w-16 h-16 text-gray-600" />
                      )}
                    </div>
                    <p className="text-gray-400 font-bold text-lg mb-2">{hostInfo?.name || t('livestream.liveStream')}</p>
                    <p className="text-gray-500 text-sm mb-6">{t('livestream.waitingForStream', 'في انتظار بدء البث...')}</p>
                    <button onClick={joinStream} className="px-8 py-3 rounded-2xl bg-orange-500 text-white font-bold text-sm shadow-lg active:scale-95 transition-transform flex items-center gap-2 mx-auto">
                      <Radio className="w-4 h-4" />
                      {t('livestream.joinStream', 'انضم للبث')}
                    </button>
                  </div>
                </div>
              )}

              {/* Live indicator */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 2, repeat: Infinity }} className="flex items-center gap-1.5 bg-red-600/90 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  <span className="text-white text-[10px] font-black">{t('livestream.live')}</span>
                </motion.div>
              </div>

              {/* Viewers badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                <Eye className="w-3 h-3 text-white" />
                <span className="text-white text-[10px] font-bold">{viewerCount}</span>
              </div>

              {/* Mobile Chat toggle */}
              <button onClick={() => setShowMobileChat(!showMobileChat)} className={`lg:hidden absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-2 rounded-xl shadow-lg transition-all active:scale-95 ${showMobileChat ? 'bg-orange-500 text-white' : 'bg-black/60 backdrop-blur-sm text-white'}`}>
                <MessageCircle className="w-4 h-4" />
                <span className="text-[10px] font-bold">{chatMessages.length}</span>
              </button>
            </div>

            {/* Viewer controls */}
            <div className={`flex items-center justify-center gap-3 px-4 py-3 border-t ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`} style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
              <button onClick={leaveStream} className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors active:scale-95 flex items-center gap-2">
                <PhoneOff className="w-4 h-4" />
                {t('livestream.leaveStream', 'مغادرة البث')}
              </button>
            </div>
          </div>

          {/* Chat Panel - same as broadcaster but always visible */}
          <div className={`hidden lg:flex w-80 flex-col border-l ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className={`px-4 py-3 border-b flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex items-center gap-2"><MessageCircle className={`w-4 h-4 ${textMuted}`} /><span className={`text-sm font-black ${textPrimary}`}>{t('livestream.liveChat')}</span></div>
              <div className="flex items-center gap-1.5"><Users className={`w-3.5 h-3.5 ${textMuted}`} /><span className={`text-xs font-bold ${textMuted}`}>{viewerCount}</span></div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full"><p className={`text-xs ${textMuted}`}>{t('livestream.noMessagesYet')}</p></div>
              ) : chatMessages.map(msg => (
                <div key={msg.id} className="flex items-start gap-2">
                  <img src={msg.avatar} alt={msg.user} className="w-6 h-6 rounded-full shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className={`text-[10px] font-black ${msg.isSelf ? 'text-blue-400' : (darkMode ? 'text-orange-400' : 'text-orange-600')}`}>{msg.user}</span>
                    <p className={`text-xs leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{msg.text}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className={`p-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex items-center gap-2">
                <input type="text" placeholder={t('livestream.typeMessage')} value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendChatMessage(); }} className={`flex-1 px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-orange-400 ${darkMode ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600' : 'bg-gray-50 text-gray-900 placeholder-gray-400 border-gray-200'}`} />
                <button onClick={sendChatMessage} disabled={!chatInput.trim()} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${chatInput.trim() ? 'bg-orange-500 text-white hover:bg-orange-600 active:scale-95' : darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'}`}><Send className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Chat overlay */}
        <AnimatePresence>
          {showMobileChat && (
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="lg:hidden fixed inset-x-0 bottom-0 z-[200] flex flex-col" style={{ maxHeight: '60vh' }}>
              <div className={`flex items-center justify-between px-4 py-2.5 border-b cursor-pointer ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`} onClick={() => setShowMobileChat(false)}>
                <div className="flex items-center gap-2"><MessageCircle className={`w-4 h-4 ${textMuted}`} /><span className={`text-sm font-black ${textPrimary}`}>{t('livestream.liveChat')}</span></div>
                <X className={`w-4 h-4 ${textMuted}`} />
              </div>
              <div className={`flex-1 overflow-y-auto p-3 space-y-2 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                {chatMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-20"><p className={`text-xs ${textMuted}`}>{t('livestream.noMessagesYet')}</p></div>
                ) : chatMessages.map(msg => (
                  <div key={msg.id} className="flex items-start gap-2">
                    <img src={msg.avatar} alt={msg.user} className="w-6 h-6 rounded-full shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className={`text-[10px] font-black ${msg.isSelf ? 'text-blue-400' : (darkMode ? 'text-orange-400' : 'text-orange-600')}`}>{msg.user}</span>
                      <p className={`text-xs leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{msg.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className={`p-3 border-t ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <div className="flex items-center gap-2">
                  <input type="text" placeholder={t('livestream.typeMessage')} value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendChatMessage(); }} className={`flex-1 px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-orange-400 ${darkMode ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600' : 'bg-gray-50 text-gray-900 placeholder-gray-400 border-gray-200'}`} />
                  <button onClick={sendChatMessage} disabled={!chatInput.trim()} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${chatInput.trim() ? 'bg-orange-500 text-white hover:bg-orange-600 active:scale-95' : darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'}`}><Send className="w-4 h-4" /></button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ─── BROADCASTER MODE ─────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className={`min-h-screen flex flex-col ${bgMain}`} dir={dir}>
      {/* Top Bar */}
      <div className={`flex items-center justify-between px-3 py-2.5 border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <ArrowRight className="w-4 h-4" />
          </button>
          {isLive && (
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="flex items-center gap-1 bg-red-500 px-2 py-0.5 rounded-full">
              <Radio className="w-3 h-3 text-white" />
              <span className="text-white text-[10px] font-black">{t('livestream.live')}</span>
            </motion.div>
          )}
          <h1 className={`text-base font-black ${textPrimary}`}>{t('livestream.liveStream')}</h1>
        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <>
              <div className="flex items-center gap-1"><Eye className={`w-3.5 h-3.5 ${textMuted}`} /><span className={`text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{viewerCount}</span></div>
              <div className="flex items-center gap-1"><Clock className={`w-3.5 h-3.5 ${textMuted}`} /><span className={`text-xs font-bold tabular-nums ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{formatDuration(duration)}</span></div>
            </>
          )}
          <button onClick={() => setShowSettings(!showSettings)} className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}><Settings className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0">
          <div className={`relative flex-1 flex items-center justify-center min-h-0 ${darkMode ? 'bg-gray-950' : 'bg-gray-900'}`}>
            <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${isCamOn ? '' : 'hidden'}`} style={{ transform: isFacingFront ? 'scaleX(-1)' : 'none' }} />

            {!isCamOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center"><VideoOff className="w-16 h-16 text-gray-600 mx-auto mb-3" /><p className="text-gray-500 font-bold text-sm">{t('livestream.cameraOff')}</p></div>
              </div>
            )}

            {!isLive && !streamRef.current && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center px-6">
                  <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4"><Video className="w-12 h-12 text-gray-600" /></div>
                  <p className="text-gray-400 font-bold text-lg mb-2">{t('livestream.readyToStream')}</p>
                  <p className="text-gray-500 text-sm mb-6">{t('livestream.readyToStreamDesc')}</p>
                  <button onClick={startBroadcast} className="px-8 py-3.5 rounded-2xl bg-gradient-to-l from-green-500 to-green-600 text-white font-bold text-base shadow-lg shadow-green-500/30 active:scale-95 transition-transform flex items-center gap-2 mx-auto">
                    <Radio className="w-5 h-5" />{t('livestream.liveStream')}
                  </button>
                </div>
              </div>
            )}

            {isLive && (
              <>
                <div className="absolute top-3 right-3 lg:top-4 lg:right-4 flex items-center gap-2">
                  <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 2, repeat: Infinity }} className="flex items-center gap-1.5 bg-red-600/90 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                    <div className="w-1.5 h-1.5 bg-white rounded-full" /><span className="text-white text-[10px] font-black">{t('livestream.live')}</span>
                  </motion.div>
                </div>
                <div className="absolute top-3 left-3 lg:top-4 lg:left-4 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                  <Eye className="w-3 h-3 text-white" /><span className="text-white text-[10px] font-bold">{viewerCount}</span>
                </div>
                <button onClick={() => setShowMobileChat(!showMobileChat)} className={`lg:hidden absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-2 rounded-xl shadow-lg transition-all active:scale-95 ${showMobileChat ? 'bg-orange-500 text-white' : 'bg-black/60 backdrop-blur-sm text-white'}`}>
                  <MessageCircle className="w-4 h-4" /><span className="text-[10px] font-bold">{chatMessages.length}</span>
                </button>
                {linkedAdId && (
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-orange-600/80 backdrop-blur-sm px-2.5 py-1.5 rounded-lg">
                    <Link2 className="w-3.5 h-3.5 text-white" /><span className="text-white text-[10px] font-bold">{t('livestream.linkedAd')}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Controls bar */}
          <div className={`flex items-center justify-center gap-2 sm:gap-3 px-2 sm:px-4 py-3 border-t ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`} style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            <button onClick={toggleMic} className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${isMicOn ? (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300') : 'bg-red-500 text-white hover:bg-red-600'}`}>
              {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            <button onClick={toggleCamera} className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${isCamOn ? (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300') : 'bg-red-500 text-white hover:bg-red-600'}`}>
              {isCamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
            <button onClick={flipCamera} className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
              <RotateCcw className="w-5 h-5" />
            </button>
            <button onClick={() => setShowAdLinker(true)} className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${linkedAdId ? 'bg-orange-500 text-white hover:bg-orange-600' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
              <Link2 className="w-5 h-5" />
            </button>
            {isLive ? (
              <button onClick={endBroadcast} className="rounded-full flex items-center justify-center bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg active:scale-90" style={{ width: '3.25rem', height: '3.25rem' }}><PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" /></button>
            ) : (
              <button onClick={startBroadcast} className="rounded-full flex items-center justify-center bg-green-600 text-white hover:bg-green-700 transition-all shadow-lg active:scale-90" style={{ width: '3.25rem', height: '3.25rem' }}><Radio className="w-5 h-5 sm:w-6 sm:h-6" /></button>
            )}
          </div>
        </div>

        {/* Chat Panel - Desktop */}
        {isLive && (
          <>
            <div className={`hidden lg:flex w-80 flex-col border-l ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              <div className={`px-4 py-3 border-b flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2"><MessageCircle className={`w-4 h-4 ${textMuted}`} /><span className={`text-sm font-black ${textPrimary}`}>{t('livestream.liveChat')}</span></div>
                <div className="flex items-center gap-1.5"><Users className={`w-3.5 h-3.5 ${textMuted}`} /><span className={`text-xs font-bold ${textMuted}`}>{viewerCount}</span></div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {chatMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full"><p className={`text-xs ${textMuted}`}>{t('livestream.noMessagesYet')}</p></div>
                ) : chatMessages.map(msg => (
                  <div key={msg.id} className="flex items-start gap-2">
                    <img src={msg.avatar} alt={msg.user} className="w-6 h-6 rounded-full shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className={`text-[10px] font-black ${msg.isSelf ? 'text-blue-400' : (darkMode ? 'text-orange-400' : 'text-orange-600')}`}>{msg.user}</span>
                      <p className={`text-xs leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{msg.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className={`p-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2">
                  <input type="text" placeholder={t('livestream.typeMessage')} value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendChatMessage(); }} className={`flex-1 px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-orange-400 ${darkMode ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600' : 'bg-gray-50 text-gray-900 placeholder-gray-400 border-gray-200'}`} />
                  <button onClick={sendChatMessage} disabled={!chatInput.trim()} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${chatInput.trim() ? 'bg-orange-500 text-white hover:bg-orange-600 active:scale-95' : darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'}`}><Send className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            {/* Mobile Chat overlay */}
            <AnimatePresence>
              {showMobileChat && (
                <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="lg:hidden fixed inset-x-0 bottom-0 z-[200] flex flex-col" style={{ maxHeight: '60vh' }}>
                  <div className={`flex items-center justify-between px-4 py-2.5 border-b cursor-pointer ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`} onClick={() => setShowMobileChat(false)}>
                    <div className="flex items-center gap-2"><MessageCircle className={`w-4 h-4 ${textMuted}`} /><span className={`text-sm font-black ${textPrimary}`}>{t('livestream.liveChat')}</span></div>
                    <X className={`w-4 h-4 ${textMuted}`} />
                  </div>
                  <div className={`flex-1 overflow-y-auto p-3 space-y-2 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                    {chatMessages.length === 0 ? (
                      <div className="flex items-center justify-center h-20"><p className={`text-xs ${textMuted}`}>{t('livestream.noMessagesYet')}</p></div>
                    ) : chatMessages.map(msg => (
                      <div key={msg.id} className="flex items-start gap-2">
                        <img src={msg.avatar} alt={msg.user} className="w-6 h-6 rounded-full shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className={`text-[10px] font-black ${msg.isSelf ? 'text-blue-400' : (darkMode ? 'text-orange-400' : 'text-orange-600')}`}>{msg.user}</span>
                          <p className={`text-xs leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{msg.text}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className={`p-3 border-t ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center gap-2">
                      <input type="text" placeholder={t('livestream.typeMessage')} value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendChatMessage(); }} className={`flex-1 px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-orange-400 ${darkMode ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600' : 'bg-gray-50 text-gray-900 placeholder-gray-400 border-gray-200'}`} />
                      <button onClick={sendChatMessage} disabled={!chatInput.trim()} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${chatInput.trim() ? 'bg-orange-500 text-white hover:bg-orange-600 active:scale-95' : darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'}`}><Send className="w-4 h-4" /></button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed inset-0 z-[250] flex items-end justify-center" onClick={() => setShowSettings(false)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className={`relative w-full max-w-lg rounded-t-3xl p-5 shadow-xl ${bgCard}`} onClick={e => e.stopPropagation()} dir={dir}>
              <div className="flex items-center justify-between mb-5">
                <h3 className={`text-lg font-black ${textPrimary}`}>{t('livestream.settings')}</h3>
                <button onClick={() => setShowSettings(false)} className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}><X className="w-4 h-4" /></button>
              </div>
              <div className="mb-4">
                <p className={`text-xs font-black mb-2 ${textMuted}`}>{t('livestream.streamQuality')}</p>
                <div className="flex gap-2">
                  {qualityOptions.map(q => (
                    <button key={q.id} onClick={() => setSelectedQuality(q.id)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedQuality === q.id ? 'bg-orange-500 text-white shadow-md' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{q.label}</button>
                  ))}
                </div>
              </div>
              <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-2"><Video className={`w-4 h-4 ${textMuted}`} /><span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{t('livestream.camera')}</span></div>
                <p className={`text-xs ${textMuted}`}>{isFacingFront ? t('livestream.frontCamera') : t('livestream.rearCamera')}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End Broadcast Confirmation */}
      <AnimatePresence>
        {showEndConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[250] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowEndConfirm(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className={`w-full max-w-sm rounded-2xl p-5 shadow-xl ${bgCard}`} onClick={e => e.stopPropagation()} dir={dir}>
              <div className="text-center mb-5">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3"><AlertCircle className="w-7 h-7 text-red-600" /></div>
                <h3 className={`text-lg font-black ${textPrimary}`}>{t('livestream.endStream')}</h3>
                <p className={`text-sm mt-1 ${textMuted}`}>{t('livestream.endStreamConfirm')}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowEndConfirm(false)} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>{t('livestream.cancel')}</button>
                <button onClick={confirmEndBroadcast} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors active:scale-95">{t('livestream.yesEndStream')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ad Linker Modal */}
      <AnimatePresence>
        {showAdLinker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[250] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAdLinker(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className={`w-full max-w-sm rounded-2xl p-5 shadow-xl ${bgCard}`} onClick={e => e.stopPropagation()} dir={dir}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-black ${textPrimary}`}>{t('livestream.linkAd')}</h3>
                <button onClick={() => setShowAdLinker(false)} className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}><X className="w-4 h-4" /></button>
              </div>
              {myAds.length === 0 ? (
                <p className={`text-sm ${textMuted}`}>{t('livestream.noAdsToLink')}</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {myAds.map(ad => (
                    <button key={ad.id} onClick={() => { setLinkedAdId(ad.id); setShowAdLinker(false); }} className={`w-full text-start p-3 rounded-xl transition-all ${linkedAdId === ad.id ? 'bg-orange-500 text-white' : darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}>
                      <p className="text-sm font-bold truncate">{ad.content?.substring(0, 60)}</p>
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
