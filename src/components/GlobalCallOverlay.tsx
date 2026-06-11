// ─── Global Call Overlay ──────────────────────────────────────────────
// Shows incoming/outgoing/connected call UI on ANY page of the site.
// Listens directly to WebSocket call:signal events via AppContext,
// so it works regardless of which page/component the user is viewing.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import {
  Phone, Video, PhoneCall, PhoneOff, Mic, MicOff, CameraOff, Volume2, VolumeX, AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner';

type CallState = 'idle' | 'outgoing' | 'incoming' | 'connected';

interface IncomingCallData {
  fromId: string;
  fromName: string;
  fromAvatar: string;
  type: 'audio' | 'video';
  offer?: RTCSessionDescriptionInit;
}

interface ActiveCallData {
  type: 'audio' | 'video';
  contactId: string;
  contactName: string;
  contactAvatar: string;
}

export const GlobalCallOverlay: React.FC = () => {
  const navigate = useNavigate();
  const { darkMode, sendCallSignal } = useAppContext();
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const { dir } = useLanguage();

  const myId = currentUser?.id || '';

  // ─── Call state ─────────────────────────────────────────────────────
  const [callState, setCallState] = useState<CallState>('idle');
  const [activeCall, setActiveCall] = useState<ActiveCallData | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [showPermissionGuide, setShowPermissionGuide] = useState<'audio' | 'video' | null>(null);

  // Refs
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const ringingAudioRef = useRef<HTMLAudioElement | null>(null);

  // ─── ICE servers ────────────────────────────────────────────────────
  const [iceServers, setIceServers] = useState<RTCIceServer[]>([]);
  const iceServersFetchedRef = useRef(false);

  useEffect(() => {
    if (iceServersFetchedRef.current) return;
    iceServersFetchedRef.current = true;
    api.getIceServers().then(data => {
      if (data?.iceServers && data.iceServers.length > 0) {
        setIceServers(data.iceServers);
      }
    }).catch(() => {
      setIceServers([
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun.stunprotocol.org:3478' },
        { urls: 'stun:global.stun.twilio.com:3478' },
        { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443?transport=udp', username: 'openrelayproject', credential: 'openrelayproject' },
      ]);
    });
  }, []);

  const getIceConfig = (): RTCConfiguration => ({
    iceServers: iceServers.length > 0 ? iceServers : [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:stun.stunprotocol.org:3478' },
      { urls: 'stun:global.stun.twilio.com:3478' },
      { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443?transport=udp', username: 'openrelayproject', credential: 'openrelayproject' },
    ],
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceCandidatePoolSize: 2,
  });

  // ─── Ringing sound for incoming calls ───────────────────────────────
  const startRinging = useCallback(() => {
    try {
      // Create a simple ringing tone using Web Audio API
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);

      // Ring pattern: beep for 1s, pause for 1s
      const ringPattern = () => {
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime + 1.0);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + 1.5);
      };
      ringPattern();

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 2);

      // Loop the ring pattern
      const intervalId = setInterval(() => {
        try {
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          osc2.frequency.setValueAtTime(440, audioCtx.currentTime);
          osc2.type = 'sine';
          gain2.gain.setValueAtTime(0.3, audioCtx.currentTime);
          gain2.gain.setValueAtTime(0, audioCtx.currentTime + 0.5);
          gain2.gain.setValueAtTime(0.3, audioCtx.currentTime + 1.0);
          gain2.gain.setValueAtTime(0, audioCtx.currentTime + 1.5);
          osc2.start(audioCtx.currentTime);
          osc2.stop(audioCtx.currentTime + 2);
        } catch {}
      }, 2000);

      ringingAudioRef.current = { audioCtx, intervalId } as any;
    } catch (e) {
      console.warn('Could not create ring tone:', e);
    }
  }, []);

  const stopRinging = useCallback(() => {
    const ref = ringingAudioRef.current as any;
    if (ref) {
      try {
        if (ref.intervalId) clearInterval(ref.intervalId);
        if (ref.audioCtx) ref.audioCtx.close();
      } catch {}
      ringingAudioRef.current = null;
    }
  }, []);

  // Keep localStreamRef in sync
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

  // ─── Cleanup call ───────────────────────────────────────────────────
  const cleanupCall = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallState('idle');
    setActiveCall(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsCameraOff(false);
    setCallError(null);
    setIncomingCall(null);
    localStreamRef.current = null;
    stopRinging();
  }, [stopRinging]);

  // ─── Create peer connection ─────────────────────────────────────────
  const createPeerConnection = useCallback((targetId: string, stream: MediaStream | null) => {
    const pc = new RTCPeerConnection(getIceConfig());
    peerConnectionRef.current = pc;

    if (stream) {
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    }

    let remoteTrackCount = 0;
    const remoteTracks: MediaStreamTrack[] = [];
    pc.ontrack = (event) => {
      if (event.streams[0]) {
        event.streams[0].getTracks().forEach(track => {
          if (!remoteTracks.find(t => t.id === track.id)) {
            remoteTracks.push(track);
          }
        });
      } else {
        if (!remoteTracks.find(t => t.id === event.track.id)) {
          remoteTracks.push(event.track);
        }
      }
      remoteTrackCount++;
      const newStream = new MediaStream(remoteTracks);
      setRemoteStream(newStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = newStream;
        remoteVideoRef.current.play().catch(() => {});
      }
      const remoteAudioEl = document.getElementById('global-remote-call-audio') as HTMLAudioElement | null;
      if (remoteAudioEl) {
        remoteAudioEl.srcObject = newStream;
        remoteAudioEl.play().catch(() => {});
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendCallSignal(targetId, { type: 'call-ice-candidate', candidate: event.candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') {
        if (pc.restartIce) {
          try { pc.restartIce(); return; } catch {}
        }
        setCallError(t('messages.callConnectionFailed', 'لم يتم الاتصال - تأكد من اتصال الإنترنت وحاول مرة أخرى'));
        setTimeout(() => cleanupCall(), 3000);
      }
      if (pc.iceConnectionState === 'disconnected') {
        setTimeout(() => {
          if (peerConnectionRef.current && peerConnectionRef.current.iceConnectionState === 'disconnected') {
            setCallError(t('messages.callConnectionFailed', 'لم يتم الاتصال - تأكد من اتصال الإنترنت وحاول مرة أخرى'));
            setTimeout(() => cleanupCall(), 3000);
          }
        }, 5000);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        setCallError(t('messages.callConnectionFailed', 'لم يتم الاتصال - تأكد من اتصال الإنترنت وحاول مرة أخرى'));
        setTimeout(() => cleanupCall(), 3000);
      }
      if (pc.connectionState === 'disconnected') {
        setTimeout(() => {
          if (peerConnectionRef.current && peerConnectionRef.current.connectionState === 'disconnected') {
            setCallError(t('messages.callConnectionFailed', 'لم يتم الاتصال - تأكد من اتصال الإنترنت وحاول مرة أخرى'));
            setTimeout(() => cleanupCall(), 3000);
          }
        }, 5000);
      }
      if (pc.connectionState === 'connected') {
        setCallState('connected');
        setCallError(null);
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        callTimerRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
      }
    };

    return pc;
  }, [sendCallSignal, cleanupCall, t]);

  // ─── Permission check ───────────────────────────────────────────────
  const checkPermissionStatus = async (type: 'audio' | 'video'): Promise<'granted' | 'denied' | 'prompt' | 'unavailable'> => {
    try {
      const micStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (micStatus.state === 'denied') return 'denied';
      if (micStatus.state === 'granted' && type === 'audio') return 'granted';
      if (type === 'video') {
        const camStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (camStatus.state === 'denied') return 'denied';
        if (camStatus.state === 'granted' && micStatus.state === 'granted') return 'granted';
      }
      return micStatus.state as 'prompt' | 'granted';
    } catch {
      return 'unavailable';
    }
  };

  // ─── Accept incoming call ───────────────────────────────────────────
  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCall) return;
    setCallError(null);
    stopRinging();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error(t('messages.callSecureContextRequired', 'يتطلب الاتصال الصوتي/الفيديو اتصالاً آمناً (HTTPS).'));
      rejectIncomingCall();
      return;
    }

    const permStatus = await checkPermissionStatus(incomingCall.type);
    if (permStatus === 'denied') {
      setShowPermissionGuide(incomingCall.type);
      rejectIncomingCall();
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: incomingCall.type === 'video' ? { width: { ideal: 640 }, height: { ideal: 480 } } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      localStreamRef.current = stream;
      if (localVideoRef.current && incomingCall.type === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      setActiveCall({
        type: incomingCall.type,
        contactId: incomingCall.fromId,
        contactName: incomingCall.fromName,
        contactAvatar: incomingCall.fromAvatar,
      });
      setCallState('outgoing');

      const pc = createPeerConnection(incomingCall.fromId, stream);

      if (incomingCall.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const waitForIceGathering = new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') { resolve(); return; }
        const timeout = setTimeout(resolve, 2000);
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') { clearTimeout(timeout); resolve(); }
        };
      });
      await waitForIceGathering;

      sendCallSignal(incomingCall.fromId, {
        type: 'call-answer',
        answer: pc.localDescription,
        toId: incomingCall.fromId,
      });

      setIncomingCall(null);
    } catch (err: any) {
      console.error('Failed to accept call:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setShowPermissionGuide(incomingCall?.type || 'audio');
      } else if (err.name === 'NotFoundError') {
        setCallError(t('messages.callNoDevice', 'لم يتم العثور على كاميرا/ميكروفون.'));
      } else {
        setCallError(t('messages.callAcceptFailed', 'فشل قبول المكالمة.'));
      }
      rejectIncomingCall();
    }
  }, [incomingCall, createPeerConnection, sendCallSignal, stopRinging, t]);

  // ─── Reject incoming call ───────────────────────────────────────────
  const rejectIncomingCall = useCallback(() => {
    if (incomingCall) {
      sendCallSignal(incomingCall.fromId, { type: 'call-reject', toId: incomingCall.fromId });
    }
    setIncomingCall(null);
    cleanupCall();
  }, [incomingCall, sendCallSignal, cleanupCall]);

  // ─── End current call ───────────────────────────────────────────────
  const endCall = useCallback(() => {
    if (activeCall) {
      sendCallSignal(activeCall.contactId, { type: 'call-end', toId: activeCall.contactId });
    }
    const duration = callDuration;
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    if (duration > 0) {
      toast.success(
        activeCall?.type === 'video'
          ? t('messages.videoCallEnded', { duration: `${mins}:${secs.toString().padStart(2, '0')}` })
          : t('messages.audioCallEnded', { duration: `${mins}:${secs.toString().padStart(2, '0')}` })
      );
    }
    cleanupCall();
  }, [activeCall, callDuration, sendCallSignal, cleanupCall, t]);

  // ─── Listen for WebSocket call signals ──────────────────────────────
  useEffect(() => {
    const handleCallSignal = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (!data?.signal) return;
      const signal = data.signal;
      const fromId = data.fromId;

      switch (signal.type) {
        case 'call-offer': {
          // Incoming call — show overlay no matter which page
          setIncomingCall({
            fromId: fromId || signal.fromId,
            fromName: signal.fromName || '',
            fromAvatar: signal.fromAvatar || '',
            type: signal.callType || 'audio',
            offer: signal.offer,
          });
          // Start ringing sound
          startRinging();
          // Also show a browser notification if smart alerts are enabled
          try {
            if (window.Notification?.permission === 'granted') {
              new window.Notification(
                signal.callType === 'video' ? 'مكالمة فيديو واردة' : 'مكالمة صوتية واردة',
                { body: `${signal.fromName || 'مستخدم'} يتصل بك`, tag: 'incoming-call' }
              );
            }
          } catch {}
          break;
        }
        case 'call-answer': {
          if (peerConnectionRef.current && signal.answer) {
            peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal.answer))
              .catch(err => {
                console.error('Failed to set remote description:', err);
                setCallError(t('messages.callConnectionFailed', 'لم يتم الاتصال'));
              });
          }
          break;
        }
        case 'call-ice-candidate': {
          if (peerConnectionRef.current && signal.candidate) {
            peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate))
              .catch(err => console.error('Failed to add ICE candidate:', err));
          }
          break;
        }
        case 'call-reject': {
          toast.info(t('messages.callRejected', 'تم رفض المكالمة'));
          cleanupCall();
          break;
        }
        case 'call-end': {
          const duration = callDuration;
          const mins = Math.floor(duration / 60);
          const secs = duration % 60;
          if (duration > 0 && activeCall) {
            toast.success(
              activeCall.type === 'video'
                ? t('messages.videoCallEnded', { duration: `${mins}:${secs.toString().padStart(2, '0')}` })
                : t('messages.audioCallEnded', { duration: `${mins}:${secs.toString().padStart(2, '0')}` })
            );
          }
          cleanupCall();
          break;
        }
      }
    };

    window.addEventListener('ws:call-signal', handleCallSignal);
    return () => window.removeEventListener('ws:call-signal', handleCallSignal);
  }, [cleanupCall, callDuration, activeCall, t, startRinging]);

  // ─── Attach remote stream to video element ──────────────────────────
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
    if (remoteStream) {
      const remoteAudioEl = document.getElementById('global-remote-call-audio') as HTMLAudioElement | null;
      if (remoteAudioEl) {
        remoteAudioEl.srcObject = remoteStream;
        remoteAudioEl.play().catch(() => {});
      }
    }
  }, [remoteStream]);

  // ─── Attach local stream to video element ───────────────────────────
  useEffect(() => {
    if (localStream && localVideoRef.current && activeCall?.type === 'video' && !isCameraOff) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, activeCall, isCameraOff]);

  // ─── Toggle mute on local audio tracks ──────────────────────────────
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted, localStream]);

  // ─── Toggle camera on local video tracks ────────────────────────────
  useEffect(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isCameraOff;
      });
    }
  }, [isCameraOff, localStream]);

  // ─── Cleanup on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      stopRinging();
    };
  }, [stopRinging]);

  // ─── Expose startCall globally so other components can initiate calls ─
  useEffect(() => {
    const handleStartGlobalCall = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (data?.type && data?.contactId && data?.contactName && data?.contactAvatar) {
        // Start outgoing call from any page
        startOutgoingCall(data.type, data.contactId, data.contactName, data.contactAvatar);
      }
    };
    window.addEventListener('nawaqes:start-call', handleStartGlobalCall);
    return () => window.removeEventListener('nawaqes:start-call', handleStartGlobalCall);
  }, []);

  // ─── Start outgoing call ────────────────────────────────────────────
  const startOutgoingCall = async (type: 'audio' | 'video', contactId: string, contactName: string, contactAvatar: string) => {
    setCallError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCallError(t('messages.callSecureContextRequired', 'يتطلب الاتصال اتصالاً آمناً (HTTPS).'));
      setActiveCall({ type, contactId, contactName, contactAvatar });
      setCallState('outgoing');
      return;
    }

    const permStatus = await checkPermissionStatus(type);
    if (permStatus === 'denied') {
      setShowPermissionGuide(type);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === 'video' ? { width: { ideal: 640 }, height: { ideal: 480 } } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      localStreamRef.current = stream;
      if (localVideoRef.current && type === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      setActiveCall({ type, contactId, contactName, contactAvatar });
      setCallState('outgoing');

      const pc = createPeerConnection(contactId, stream);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const waitForIceGathering = new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') { resolve(); return; }
        const timeout = setTimeout(resolve, 2000);
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') { clearTimeout(timeout); resolve(); }
        };
      });
      await waitForIceGathering;

      sendCallSignal(contactId, {
        type: 'call-offer',
        callType: type,
        fromId: myId,
        fromName: currentUser?.name || '',
        fromAvatar: currentUser?.avatar || '',
        offer: pc.localDescription,
      });
    } catch (err: any) {
      console.error('Failed to start call:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setShowPermissionGuide(type);
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCallError(t('messages.callNoDevice', 'لم يتم العثور على كاميرا/ميكروفون.'));
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCallError(t('messages.callDeviceInUse', 'الكاميرا/الميكروفون قيد الاستخدام.'));
      } else {
        setCallError(t('messages.callStartFailed', 'فشل بدء المكالمة.'));
      }
      cleanupCall();
    }
  };

  // ─── Retry call after permission ────────────────────────────────────
  const retryCallWithPermission = () => {
    const type = showPermissionGuide;
    setShowPermissionGuide(null);
    if (type && activeCall) {
      setTimeout(() => startOutgoingCall(type, activeCall.contactId, activeCall.contactName, activeCall.contactAvatar), 300);
    }
  };

  const formatCallDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Don't render anything if no call activity
  if (callState === 'idle' && !incomingCall && !activeCall) return null;

  return (
    <>
      {/* Hidden audio element for reliable remote audio */}
      <audio id="global-remote-call-audio" autoPlay style={{ display: 'none' }} />

      {/* ─── Incoming Call Overlay ──────────────────────────────────── */}
      <AnimatePresence>
        {incomingCall && !activeCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center"
            dir={dir}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <div className="relative z-10 flex flex-col items-center text-center px-6">
              {/* Avatar */}
              <div className="relative mb-6">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-28 h-28 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl"
                >
                  <img src={incomingCall.fromAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${incomingCall.fromId}`} alt="" className="w-full h-full object-cover" />
                </motion.div>
                {/* Ringing animation */}
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 rounded-full border-2 border-green-400"
                />
                <motion.div
                  animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  className="absolute inset-0 rounded-full border-2 border-green-400"
                />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-lg border-2 border-white">
                  {incomingCall.type === 'audio' ? <PhoneCall className="w-5 h-5 text-white" /> : <Video className="w-5 h-5 text-white" />}
                </div>
              </div>

              <h2 className="text-2xl font-black text-white mb-2">{incomingCall.fromName}</h2>
              <p className="text-green-300 text-sm font-bold mb-1">
                {incomingCall.type === 'video' ? t('messages.videoCall', 'مكالمة فيديو') : t('messages.audioCall', 'مكالمة صوتية')}
              </p>
              <p className="text-white/60 text-sm mb-8">
                {t('messages.incomingCall', 'مكالمة واردة...')}
              </p>

              {/* Accept / Reject Buttons */}
              <div className="flex items-center gap-10">
                <div className="flex flex-col items-center">
                  <button
                    onClick={rejectIncomingCall}
                    className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center transition-all active:scale-90 hover:bg-red-600 shadow-lg shadow-red-500/30"
                  >
                    <PhoneOff className="w-7 h-7 text-white" />
                  </button>
                  <span className="text-white/50 text-[10px] mt-2">{t('messages.reject', 'رفض')}</span>
                </div>
                <div className="flex flex-col items-center">
                  <button
                    onClick={acceptIncomingCall}
                    className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center transition-all active:scale-90 hover:bg-green-600 shadow-lg shadow-green-500/30"
                  >
                    <Phone className="w-7 h-7 text-white" />
                  </button>
                  <span className="text-white/50 text-[10px] mt-2">{t('messages.accept', 'قبول')}</span>
                </div>
              </div>
              <p className="text-white/40 text-[10px] mt-4">
                {t('messages.tapToAccept', 'اضغط للقبول أو الرفض')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Active Call Overlay ───────────────────────────────────── */}
      <AnimatePresence>
        {activeCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex flex-col"
            dir={dir}
          >
            {/* Full-screen background */}
            <div className="absolute inset-0 bg-gray-900">
              {/* Animated gradient circles (shown when no remote video) */}
              {!(activeCall.type === 'video' && remoteStream) && (
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" />
                  <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
                </div>
              )}
            </div>

            {/* Remote video (full screen) */}
            {activeCall.type === 'video' && remoteStream && (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover z-[1]"
              />
            )}

            {/* Local video PIP */}
            {activeCall.type === 'video' && !isCameraOff && localStream && (
              <div className="absolute top-16 right-4 z-[10] w-28 h-40 sm:w-36 sm:h-52 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-gray-800">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                <div className="absolute bottom-1 left-1 right-1 bg-black/50 rounded-lg px-1.5 py-0.5 text-center">
                  <span className="text-white text-[9px] font-bold">{t('common.you', 'أنت')}</span>
                </div>
              </div>
            )}

            {/* Remote user avatar (shown when no remote video) */}
            {!(activeCall.type === 'video' && remoteStream) && (
              <div className="relative z-[5] flex-1 flex flex-col items-center justify-center px-6">
                <div className="relative mb-6">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl"
                  >
                    <img src={activeCall.contactAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeCall.contactId}`} alt="" className="w-full h-full object-cover" />
                  </motion.div>
                  {callState === 'outgoing' && (
                    <>
                      <motion.div
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute inset-0 rounded-full border-2 border-green-400"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                        className="absolute inset-0 rounded-full border-2 border-green-400"
                      />
                    </>
                  )}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-lg border-2 border-white">
                    {activeCall.type === 'audio' ? <PhoneCall className="w-5 h-5 text-white" /> : <Video className="w-5 h-5 text-white" />}
                  </div>
                </div>

                <h2 className="text-2xl font-black text-white mb-2">{activeCall.contactName}</h2>
                <p className="text-green-300 text-sm font-bold mb-1">
                  {callState === 'outgoing'
                    ? t('messages.calling', 'جاري الاتصال...')
                    : activeCall.type === 'video'
                      ? t('messages.videoCall', 'مكالمة فيديو')
                      : t('messages.audioCall', 'مكالمة صوتية')}
                </p>
              </div>
            )}

            {/* When remote video IS showing, overlay the name at top */}
            {activeCall.type === 'video' && remoteStream && (
              <div className="relative z-[5] pt-4 px-4">
                <div className="inline-flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-xl">
                  <h2 className="text-sm font-bold text-white">{activeCall.contactName}</h2>
                  <span className="text-green-300 text-[10px] font-bold">
                    {callState === 'outgoing' ? t('messages.calling', 'جاري الاتصال...') : t('messages.videoCall', 'مكالمة فيديو')}
                  </span>
                </div>
              </div>
            )}

            {/* Call error message */}
            {callError && (
              <div className="relative z-[5] flex justify-center mt-2">
                <div className="px-4 py-2 bg-red-500/20 rounded-xl border border-red-500/30">
                  <p className="text-red-300 text-sm font-bold">{callError}</p>
                </div>
              </div>
            )}

            {/* Duration display */}
            <div className="relative z-[5] flex justify-center mt-1">
              <p className="text-white/80 text-lg font-mono font-bold">
                {formatCallDuration(callDuration)}
              </p>
            </div>

            {/* Spacer */}
            <div className="relative z-[5] flex-1" />

            {/* Navigate to messages button (when not on messages page) */}
            <div className="relative z-[5] flex justify-center">
              <button
                onClick={() => navigate(`/messages?chat=${activeCall.contactId}`)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors backdrop-blur-sm"
              >
                {t('messages.openChat', 'فتح المحادثة')}
              </button>
            </div>

            {/* Call Controls */}
            <div className="relative z-[5] flex items-center justify-center gap-5 py-8 pb-10 bg-gradient-to-t from-black/60 to-transparent">
              {/* Mute */}
              <button
                onClick={() => {
                  const newMuted = !isMuted;
                  setIsMuted(newMuted);
                  if (localStreamRef.current) {
                    localStreamRef.current.getAudioTracks().forEach(track => { track.enabled = !newMuted; });
                  }
                }}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                  isMuted ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              {/* Camera toggle */}
              {activeCall.type === 'video' && (
                <button
                  onClick={() => {
                    const newCamOff = !isCameraOff;
                    setIsCameraOff(newCamOff);
                    if (localStreamRef.current) {
                      localStreamRef.current.getVideoTracks().forEach(track => { track.enabled = !newCamOff; });
                    }
                  }}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                    isCameraOff ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {isCameraOff ? <CameraOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </button>
              )}

              {/* End Call */}
              <button
                onClick={endCall}
                className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center transition-all active:scale-90 hover:bg-red-600 shadow-lg shadow-red-500/30"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </button>

              {/* Speaker toggle */}
              <button
                onClick={() => {
                  const newSpeaker = !isSpeakerOn;
                  setIsSpeakerOn(newSpeaker);
                  const remoteVid = remoteVideoRef.current;
                  const remoteAud = document.getElementById('global-remote-call-audio') as HTMLAudioElement | null;
                  if (remoteVid) {
                    remoteVid.volume = newSpeaker ? 1 : 0.3;
                  }
                  if (remoteAud) {
                    remoteAud.volume = newSpeaker ? 1 : 0.3;
                  }
                }}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                  isSpeakerOn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-orange-500 text-white'
                }`}
              >
                {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Permission Guide Dialog ──────────────────────────────── */}
      <AnimatePresence>
        {showPermissionGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[510] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            dir={dir}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-l from-orange-500 to-amber-600 px-5 py-4 text-center">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  {showPermissionGuide === 'video' ? <Video className="w-7 h-7 text-white" /> : <Mic className="w-7 h-7 text-white" />}
                </div>
                <h3 className="text-white font-black text-lg">
                  {showPermissionGuide === 'video'
                    ? t('messages.permissionVideoTitle', 'السماح بالوصول للكاميرا والميكروفون')
                    : t('messages.permissionAudioTitle', 'السماح بالوصول للميكروفون')}
                </h3>
              </div>

              <div className="p-5 space-y-3">
                <p className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t('messages.permissionInstructions', 'لإجراء مكالمة، يحتاج المتصفح إلى إذن الوصول. اتبع الخطوات التالية:')}
                </p>
                <div className="space-y-2">
                  <div className={`flex items-start gap-3 p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">1</div>
                    <p className={`text-xs font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      {t('messages.permissionStep1', 'انقر على أيقونة القفل في شريط العنوان')}
                    </p>
                  </div>
                  <div className={`flex items-start gap-3 p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">2</div>
                    <p className={`text-xs font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      {showPermissionGuide === 'video'
                        ? t('messages.permissionStep2Video', 'اختر "السماح" للكاميرا والميكروفون')
                        : t('messages.permissionStep2Audio', 'اختر "السماح" للميكروفون')}
                    </p>
                  </div>
                  <div className={`flex items-start gap-3 p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">3</div>
                    <p className={`text-xs font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      {t('messages.permissionStep3', 'أعد تحميل الصفحة ثم حاول مرة أخرى')}
                    </p>
                  </div>
                </div>
                <div className={`flex items-start gap-2 p-3 rounded-xl border ${darkMode ? 'bg-amber-900/20 border-amber-800/40' : 'bg-amber-50 border-amber-200'}`}>
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className={`text-[11px] font-bold ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                    {t('messages.permissionHTTPSNote', 'يتطلب الاتصال اتصالاً آمناً (HTTPS).')}
                  </p>
                </div>
              </div>

              <div className="px-5 pb-5 flex gap-3">
                <button
                  onClick={() => setShowPermissionGuide(null)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {t('common.cancel', 'إلغاء')}
                </button>
                <button
                  onClick={retryCallWithPermission}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-l from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 transition-all active:scale-95"
                >
                  {t('messages.retryCall', 'حاول مرة أخرى')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
