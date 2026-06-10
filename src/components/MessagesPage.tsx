import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import {
  ArrowRight, Search, Send, Phone, MoreVertical, CheckCircle2, Check, Image as ImageIcon, Paperclip, UserPlus, ShoppingBag, RefreshCw, Eye, Info, X, MessageCircle, Video, Reply, Trash2, Copy, Smile, PhoneCall, VideoOff, PhoneOff, Mic, MicOff, CameraOff, Clock, AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage, ChatContact } from '../types';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner';
import { isUserOnline, initializeMockPresence } from '../utils/presence';

const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🎉'];

export const MessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const { darkMode, chatMessages, sendMessage, getChatContacts, markMessagesRead, posts, wsConnected, sendTyping, sendReadReceipt, sendCallSignal, isUserOnlineWs } = useAppContext();
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const { dir } = useLanguage();

  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [apiContacts, setApiContacts] = useState<ChatContact[]>([]);
  const [apiMessages, setApiMessages] = useState<ChatMessage[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendingFriendRequest, setSendingFriendRequest] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState<string | null>(null);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // New features state
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [contextMenu, setContextMenu] = useState<{ messageId: string; x: number; y: number } | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null); // messageId
  const [showImagePreview, setShowImagePreview] = useState<string | null>(null);
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Call states — WebRTC
  type CallState = 'idle' | 'outgoing' | 'incoming' | 'connected';
  const [callState, setCallState] = useState<CallState>('idle');
  const [activeCall, setActiveCall] = useState<{ type: 'audio' | 'video'; contactId: string; contactName: string; contactAvatar: string } | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ fromId: string; fromName: string; fromAvatar: string; type: 'audio' | 'video'; offer?: RTCSessionDescriptionInit } | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [showPermissionGuide, setShowPermissionGuide] = useState<'audio' | 'video' | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const ICE_SERVERS: RTCConfiguration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  };

  // Last seen state
  const [contactLastSeen, setContactLastSeen] = useState<string | null>(null);

  const myId = currentUser?.id || '';

  // ─── WebSocket: Real-time typing indicator ──────────────────────────
  // Listen for ws:typing custom event dispatched by AppContext
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleWsTyping = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (data?.senderId && data.senderId === selectedContactId) {
        setShowTypingIndicator(true);
        // Auto-hide after 3 seconds of no new typing events
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setShowTypingIndicator(false), 3000);
      }
    };
    window.addEventListener('ws:typing', handleWsTyping);
    return () => {
      window.removeEventListener('ws:typing', handleWsTyping);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [selectedContactId]);

  // ─── WebSocket: Real-time read receipts ─────────────────────────────
  // Listen for ws:read custom event dispatched by AppContext
  useEffect(() => {
    const handleWsRead = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (data?.readerId && data.readerId === selectedContactId) {
        // Mark all messages sent by me to this contact as read
        setApiMessages(prev => prev.map(m =>
          m.senderId === myId && m.receiverId === selectedContactId
            ? { ...m, read: true }
            : m
        ));
      }
    };
    window.addEventListener('ws:read', handleWsRead);
    return () => window.removeEventListener('ws:read', handleWsRead);
  }, [selectedContactId, myId]);

  // ─── Send typing indicator when composing (debounced) ──────────────
  const lastTypingSentRef = useRef<number>(0);

  useEffect(() => {
    if (!messageText.trim() || !selectedContactId) return;
    const now = Date.now();
    // Only send typing event every 3 seconds max
    if (now - lastTypingSentRef.current >= 3000) {
      lastTypingSentRef.current = now;
      sendTyping(selectedContactId);
    }
  }, [messageText, selectedContactId, sendTyping]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
      setShowReactionPicker(null);
      setShowHeaderMenu(false);
    };
    if (contextMenu || showReactionPicker || showHeaderMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu, showReactionPicker, showHeaderMenu]);

  // Load contacts from API
  const loadContacts = useCallback(async () => {
    if (!currentUser) return;
    setLoadingContacts(true);
    try {
      const contacts = await api.getChatContacts();
      if (Array.isArray(contacts)) {
        setApiContacts(contacts as ChatContact[]);
      }
    } catch (err) {
      console.error('Error loading contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  }, [currentUser]);

  // Load messages for selected contact from API
  const loadMessages = useCallback(async (contactId: string) => {
    if (!currentUser) return;
    setLoadingMessages(true);
    try {
      const messages = await api.getChatMessages(contactId);
      if (Array.isArray(messages)) {
        const mapped: ChatMessage[] = (messages as any[]).map((m: any) => ({
          id: m.id,
          senderId: m.sender_id || m.senderId,
          receiverId: m.receiver_id || m.receiverId,
          text: m.text,
          timestamp: m.created_at || m.timestamp || new Date().toISOString(),
          read: !!(m.read),
          postId: m.post_id || m.postId,
          messageType: m.message_type || m.messageType || 'text',
          imageUrl: m.image_url || m.imageUrl || '',
          replyToId: m.reply_to_id || m.replyToId || undefined,
          reactions: (() => { try { return JSON.parse(m.reactions || '{}'); } catch { return {}; } })(),
          deletedFor: m.deleted_for || '',
        }));
        setApiMessages(mapped);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [currentUser]);

  // Load contacts on mount
  useEffect(() => {
    loadContacts();
    // Also load friends as potential contacts
    api.getFriendsList().then((friends: any) => {
      if (Array.isArray(friends)) {
        setApiContacts(prev => {
          // Merge friends into contacts without duplicates
          const existing = new Set(prev.map(c => c.id));
          const newContacts = [...prev];
          for (const f of friends) {
            if (!existing.has(f.id)) {
              newContacts.push({
                id: f.id,
                name: f.name,
                avatar: f.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.id}`,
                lastMessage: '',
                lastTime: '',
                unread: 0,
                online: isUserOnline(f.id),
              });
              existing.add(f.id);
            }
          }
          return newContacts;
        });
      }
    }).catch(() => {});
  }, [loadContacts]);

  // Load messages when contact is selected
  useEffect(() => {
    if (selectedContactId) {
      loadMessages(selectedContactId);
      markMessagesRead(selectedContactId);
      // Send read receipt via WebSocket
      sendReadReceipt(selectedContactId);
      // Check friendship status with this contact using the dedicated endpoint
      if (currentUser && selectedContactId !== currentUser.id) {
        api.getFriendshipStatus(selectedContactId).then(data => {
          setFriendshipStatus(data?.friendshipStatus || null);
          setContactLastSeen(data?.lastSeenAt || null);
        }).catch(() => {
          setFriendshipStatus(null);
          setContactLastSeen(null);
        });
      }
    } else {
      setApiMessages([]);
      setFriendshipStatus(null);
      setContactLastSeen(null);
    }
  }, [selectedContactId]);

  // Refresh contactLastSeen every 30 seconds when a contact is selected
  useEffect(() => {
    if (!selectedContactId || !currentUser || selectedContactId === currentUser.id) return;
    const interval = setInterval(() => {
      api.getFriendshipStatus(selectedContactId!).then(data => {
        setContactLastSeen(data?.lastSeenAt || null);
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedContactId, currentUser]);

  // Merge local contacts with API contacts
  const localContacts = getChatContacts();
  const allContactsMap = new Map<string, ChatContact>();

  // Add API contacts first (they have real names/avatars)
  for (const c of apiContacts) {
    allContactsMap.set(c.id, c);
  }

  // Add local contacts (only if not already in API contacts)
  for (const c of localContacts) {
    if (!allContactsMap.has(c.id)) {
      allContactsMap.set(c.id, c);
    }
  }

  // Apply online status — prefer WebSocket presence, fallback to local presence system
  const contacts = Array.from(allContactsMap.values()).map(c => ({
    ...c,
    online: isUserOnlineWs(c.id) || isUserOnline(c.id),
  }));

  // Find contact info for selected
  const selectedContact = contacts.find(c => c.id === selectedContactId) || null;

  // Get messages for selected contact: merge API + local
  const getMessages = (): ChatMessage[] => {
    if (!selectedContactId || !currentUser) return [];
    // API messages
    const msgs = [...apiMessages];
    // Add any local messages not already in API results
    const chatKey = [currentUser.id, selectedContactId].sort().join('_');
    const localMsgs = chatMessages[chatKey] || [];
    for (const lm of localMsgs) {
      if (!msgs.find(m => m.id === lm.id)) {
        msgs.push(lm);
      }
    }
    // Sort by timestamp
    msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return msgs;
  };
  const currentMessages = getMessages();

  // Helper to get a message by ID for reply previews
  const getMessageById = useCallback((msgId: string): ChatMessage | undefined => {
    return currentMessages.find(m => m.id === msgId);
  }, [currentMessages]);

  // Handle scroll position tracking
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    setShouldAutoScroll(scrollHeight - scrollTop - clientHeight < 100);
  }, []);

  // Only auto-scroll when shouldAutoScroll is true and messages change
  useEffect(() => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentMessages, shouldAutoScroll]);

  // Handle sending message
  const handleSendMessage = async (e?: React.FormEvent, overrideMessageType?: string, overrideImageUrl?: string) => {
    if (e) e.preventDefault();
    if (!selectedContactId || !myId) return;

    const isImageMsg = overrideMessageType === 'image';
    const textToSend = isImageMsg ? '' : messageText.trim();
    if (!isImageMsg && !textToSend) return;

    if (!isImageMsg) setMessageText('');
    setSendingMessage(true);

    // Optimistically add message to UI immediately
    const tempId = `temp_${Date.now()}`;
    const newMsg: ChatMessage = {
      id: tempId,
      senderId: myId,
      receiverId: selectedContactId,
      text: textToSend,
      timestamp: new Date().toISOString(),
      read: false,
      messageType: isImageMsg ? 'image' : 'text',
      imageUrl: overrideImageUrl || '',
      replyToId: replyToMessage?.id || undefined,
    };
    setApiMessages(prev => [...prev, newMsg]);
    setReplyToMessage(null);

    // Typing indicator is now handled via WebSocket (ws:typing event)
    // No longer using fake setTimeout simulation

    try {
      const result = await api.sendMessage(
        selectedContactId,
        textToSend || '📷',
        undefined,
        isImageMsg ? 'image' : 'text',
        overrideImageUrl,
        newMsg.replyToId,
      );
      // Replace temp message with server-confirmed message
      setApiMessages(prev => prev.map(m =>
        m.id === tempId
          ? { ...m, id: (result as any)?.id || tempId }
          : m
      ));
      // Reload contacts to update last message
      loadContacts();
    } catch (err: any) {
      console.error('Message send failed:', err);
      // Mark the optimistic message as failed
      setApiMessages(prev => prev.map(m =>
        m.id === tempId
          ? { ...m, _failed: true }
          : m
      ));
      toast.error(err?.message || t('messages.sendFailed', 'فشل إرسال الرسالة'));
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('createPost.imageSizeError'));
      return;
    }
    setUploadingImage(true);
    try {
      const { url } = await api.uploadChatImage(file);
      await handleSendMessage(undefined, 'image', url);
      toast.success(t('messages.imageSent'));
    } catch (err: any) {
      toast.error(err?.message || t('api.imageUploadFailed'));
    } finally {
      setUploadingImage(false);
      // Reset file input
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  // Handle message context menu actions
  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(t('messages.copyMessage'));
    }).catch(() => {
      toast.error(t('common.error'));
    });
    setContextMenu(null);
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await api.deleteMessage(messageId);
      setApiMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success(t('messages.messageDeleted'));
    } catch (err: any) {
      toast.error(err?.message || t('common.error'));
    }
    setContextMenu(null);
  };

  const handleReactToMessage = async (messageId: string, emoji: string) => {
    try {
      const result = await api.reactToMessage(messageId, emoji);
      // Update the message in local state
      setApiMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, reactions: result.reactions || {} }
          : m
      ));
    } catch (err: any) {
      toast.error(err?.message || t('common.error'));
    }
    setShowReactionPicker(null);
    setContextMenu(null);
  };

  const handleReplyToMessage = (msg: ChatMessage) => {
    setReplyToMessage(msg);
    setContextMenu(null);
  };

  // Context menu handler
  const handleContextMenu = (e: React.MouseEvent, messageId: string) => {
    e.preventDefault();
    setContextMenu({ messageId, x: e.clientX, y: e.clientY });
  };

  // Long press handlers for mobile
  const handleTouchStart = (messageId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setContextMenu({ messageId, x: window.innerWidth / 2, y: window.innerHeight / 3 });
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Double-tap to react
  const handleDoubleClick = (messageId: string) => {
    setShowReactionPicker(messageId);
  };

  const handleStartChat = async (userId: string, userName: string, userAvatar: string) => {
    try {
      const result = await api.sendMessage(userId, 'مرحباً!');
      // Add to contacts
      setApiContacts(prev => {
        if (prev.find(c => c.id === userId)) return prev;
        return [...prev, {
          id: userId,
          name: userName,
          avatar: userAvatar,
          lastMessage: 'مرحباً!',
          lastTime: new Date().toISOString(),
          unread: 0,
          online: false,
        }];
      });
      setSelectedContactId(userId);
      setShowNewChat(false);
      // Load messages for this contact
      loadMessages(userId);
    } catch (err: any) {
      toast.error(err.message || 'فشل بدء المحادثة');
    }
  };

  // ─── Call functions (WebRTC) ──────────────────────────────────────────
  const formatLastSeen = (lastSeenAt: string | null): string => {
    if (!lastSeenAt) return t('messages.lastSeenHour');
    try {
      const lastSeen = new Date(lastSeenAt);
      const now = new Date();
      const diffMs = now.getTime() - lastSeen.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 2) return t('messages.onlineNow');
      if (diffMins < 60) return t('messages.lastSeenMinutes', { count: diffMins });
      if (diffHours < 24) return t('messages.lastSeenHours', { count: diffHours });
      if (diffDays < 7) return t('messages.lastSeenDays', { count: diffDays });
      return lastSeen.toLocaleDateString(dir === 'rtl' ? 'ar-EG' : 'en-US');
    } catch {
      return t('messages.lastSeenHour');
    }
  };

  // Keep localStreamRef in sync with localStream state
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

  // Cleanup helper for call resources - uses ref to avoid circular deps
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
  }, []);

  // Create peer connection and attach streams — uses refs to avoid stale closures
  const createPeerConnection = useCallback((targetId: string, stream: MediaStream | null) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // Add local tracks from the provided stream
    if (stream) {
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    }

    // Handle remote stream
    const newRemoteStream = new MediaStream();
    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach(track => {
        newRemoteStream.addTrack(track);
      });
      setRemoteStream(newRemoteStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = newRemoteStream;
      }
    };

    // Handle ICE candidates — send to remote via WebSocket
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendCallSignal(targetId, { type: 'call-ice-candidate', candidate: event.candidate });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setCallError(t('messages.callConnectionFailed', 'لم يتم الاتصال - تأكد من أنك على نفس الشبكة'));
        setTimeout(() => cleanupCall(), 3000);
      }
      if (pc.connectionState === 'connected') {
        setCallState('connected');
        // Start duration timer
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        callTimerRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
      }
    };

    return pc;
  }, [sendCallSignal, cleanupCall, t]);

  // ─── Check current permission status using Permissions API ──────────
  const checkPermissionStatus = async (type: 'audio' | 'video'): Promise<'granted' | 'denied' | 'prompt' | 'unavailable'> => {
    try {
      // Check microphone permission
      const micStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (micStatus.state === 'denied') return 'denied';
      if (micStatus.state === 'granted' && type === 'audio') return 'granted';

      // Check camera permission (for video calls)
      if (type === 'video') {
        const camStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (camStatus.state === 'denied') return 'denied';
        if (camStatus.state === 'granted' && micStatus.state === 'granted') return 'granted';
      }

      return micStatus.state as 'prompt' | 'granted';
    } catch {
      // Permissions API not supported in some browsers — fall through to getUserMedia
      return 'unavailable';
    }
  };

  // ─── Start an outgoing call ──────────────────────────────────────────
  const startCall = async (type: 'audio' | 'video') => {
    if (!selectedContact) return;
    setCallError(null);

    // Check if mediaDevices API is available (requires HTTPS or localhost)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCallError(t('messages.callSecureContextRequired', 'يتطلب الاتصال الصوتي/الفيديو اتصالاً آمناً (HTTPS). يرجى الوصول للموقع عبر HTTPS.'));
      // Show call overlay with error - use 'outgoing' state to show error overlay
      setActiveCall({
        type,
        contactId: selectedContact.id,
        contactName: selectedContact.name,
        contactAvatar: selectedContact.avatar,
      });
      setCallState('outgoing');
      return;
    }

    // Pre-check permission status using the Permissions API
    const permStatus = await checkPermissionStatus(type);
    if (permStatus === 'denied') {
      // Permission was previously denied — show the guide dialog directly
      setShowPermissionGuide(type);
      return;
    }

    try {
      const testConstraints: MediaStreamConstraints = {
        audio: true,
        video: type === 'video' ? { width: { ideal: 640 }, height: { ideal: 480 } } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(testConstraints);
      setLocalStream(stream);
      localStreamRef.current = stream;
      if (localVideoRef.current && type === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      setActiveCall({
        type,
        contactId: selectedContact.id,
        contactName: selectedContact.name,
        contactAvatar: selectedContact.avatar,
      });
      setCallState('outgoing');

      // Create peer connection — pass the stream directly to avoid stale closure
      const pc = createPeerConnection(selectedContact.id, stream);

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering to complete (with a timeout fallback)
      const waitForIceGathering = new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') {
          resolve();
          return;
        }
        const timeout = setTimeout(resolve, 2000); // Max 2 seconds wait
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') {
            clearTimeout(timeout);
            resolve();
          }
        };
      });
      await waitForIceGathering;

      // Send the local description (which now includes gathered ICE candidates)
      sendCallSignal(selectedContact.id, {
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
        // Show permission guide dialog instead of just an error message
        setShowPermissionGuide(type);
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCallError(t('messages.callNoDevice', 'لم يتم العثور على كاميرا/ميكروفون. تأكد من توصيل جهاز الصوت/الفيديو.'));
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCallError(t('messages.callDeviceInUse', 'الكاميرا/الميكروفون قيد الاستخدام من قبل تطبيق آخر. أغلق التطبيقات الأخرى وحاول مرة أخرى.'));
      } else {
        setCallError(t('messages.callStartFailed', 'فشل بدء المكالمة. تأكد من أن الموقع يعمل عبر HTTPS وأن الأذونات مفعّلة.'));
      }
      cleanupCall();
    }
  };

  // ─── Retry call after granting permissions ──────────────────────────
  const retryCallWithPermission = async () => {
    const type = showPermissionGuide;
    setShowPermissionGuide(null);
    if (type) {
      // Small delay to let the dialog close
      setTimeout(() => startCall(type), 300);
    }
  };

  // ─── Accept an incoming call ──────────────────────────────────────────
  const acceptIncomingCall = async () => {
    if (!incomingCall) return;
    setCallError(null);

    // Check if mediaDevices API is available (requires HTTPS or localhost)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error(t('messages.callSecureContextRequired', 'يتطلب الاتصال الصوتي/الفيديو اتصالاً آمناً (HTTPS). يرجى الوصول للموقع عبر HTTPS.'));
      rejectIncomingCall();
      return;
    }

    // Pre-check permission status using the Permissions API
    const permStatus = await checkPermissionStatus(incomingCall.type);
    if (permStatus === 'denied') {
      // Permission was previously denied — show the guide dialog instead
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
      // Don't set 'connected' yet — wait for onconnectionstatechange to fire
      setCallState('outgoing'); // 'outgoing' shows the connecting overlay

      // Create peer connection — pass the stream directly
      const pc = createPeerConnection(incomingCall.fromId, stream);

      // Set remote description (the offer)
      if (incomingCall.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      }

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Wait for ICE gathering to complete (with a timeout fallback)
      const waitForIceGathering = new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') {
          resolve();
          return;
        }
        const timeout = setTimeout(resolve, 2000);
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') {
            clearTimeout(timeout);
            resolve();
          }
        };
      });
      await waitForIceGathering;

      // Send answer via WebSocket
      sendCallSignal(incomingCall.fromId, {
        type: 'call-answer',
        answer: pc.localDescription,
        toId: incomingCall.fromId,
      });

      setIncomingCall(null);
      // Duration timer will be started by onconnectionstatechange when state becomes 'connected'
    } catch (err: any) {
      console.error('Failed to accept call:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        // Show permission guide dialog instead of just an error
        setShowPermissionGuide(incomingCall?.type || 'audio');
      } else if (err.name === 'NotFoundError') {
        setCallError(t('messages.callNoDevice', 'لم يتم العثور على كاميرا/ميكروفون.'));
      } else {
        setCallError(t('messages.callAcceptFailed', 'فشل قبول المكالمة.'));
      }
      rejectIncomingCall();
    }
  };

  // ─── Reject an incoming call ──────────────────────────────────────────
  const rejectIncomingCall = () => {
    if (incomingCall) {
      sendCallSignal(incomingCall.fromId, { type: 'call-reject', toId: incomingCall.fromId });
    }
    setIncomingCall(null);
    cleanupCall();
  };

  // ─── End the current call ──────────────────────────────────────────────
  const endCall = useCallback(() => {
    if (activeCall) {
      // Notify remote user
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

  // ─── Listen for incoming call signals via WebSocket ──────────────────
  useEffect(() => {
    const handleCallSignal = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (!data?.signal) return;
      const signal = data.signal;
      const fromId = data.fromId;

      switch (signal.type) {
        case 'call-offer': {
          // Incoming call
          setIncomingCall({
            fromId: fromId || signal.fromId,
            fromName: signal.fromName || '',
            fromAvatar: signal.fromAvatar || '',
            type: signal.callType || 'audio',
            offer: signal.offer,
          });
          break;
        }
        case 'call-answer': {
          // Remote user accepted our call
          if (peerConnectionRef.current && signal.answer) {
            peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal.answer))
              .catch(err => {
                console.error('Failed to set remote description:', err);
                setCallError(t('messages.callConnectionFailed', 'لم يتم الاتصال - تأكد من أنك على نفس الشبكة'));
              });
          }
          break;
        }
        case 'call-ice-candidate': {
          // Remote ICE candidate
          if (peerConnectionRef.current && signal.candidate) {
            peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate))
              .catch(err => console.error('Failed to add ICE candidate:', err));
          }
          break;
        }
        case 'call-reject': {
          // Remote user rejected our call
          toast.info(t('messages.callRejected', 'تم رفض المكالمة'));
          cleanupCall();
          break;
        }
        case 'call-end': {
          // Remote user ended the call
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
  }, [cleanupCall, callDuration, activeCall, t]);

  // Attach local video when stream changes
  useEffect(() => {
    if (localStream && localVideoRef.current && activeCall?.type === 'video' && !isCameraOff) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, activeCall, isCameraOff]);

  // Toggle mute on local audio tracks
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted, localStream]);

  // Toggle camera on local video tracks
  useEffect(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isCameraOff;
      });
    }
  }, [isCameraOff, localStream]);

  const formatCallDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup call resources on unmount
  useEffect(() => {
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  const filteredContacts = contacts.filter(c =>
    c.name.includes(searchQuery) || c.lastMessage.includes(searchQuery)
  );

  // Get post authors AND all users for new chat
  const postAuthors = posts
    .filter(p => p.author.id !== currentUser?.id && p.type === 'ad')
    .reduce((acc, p) => {
      if (!acc.find(a => a.id === p.author.id)) {
        acc.push({ id: p.author.id, name: p.author.name, avatar: p.author.avatar, postContent: p.content.slice(0, 50), postId: p.id });
      }
      return acc;
    }, [] as { id: string; name: string; avatar: string; postContent: string; postId: string }[]);

  // Search users for new chat
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const handleUserSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) { setUserSearchResults([]); return; }
    setSearchingUsers(true);
    try {
      const results = await api.searchUsers(query);
      setUserSearchResults(Array.isArray(results) ? results : []);
    } catch {
      setUserSearchResults([]);
    } finally {
      setSearchingUsers(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => handleUserSearch(userSearchQuery), 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery, handleUserSearch]);

  const bgMain = darkMode ? 'bg-gray-900' : 'bg-[#f8f9fa]';
  const bgCard = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const bgInput = darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-300' : 'text-gray-700';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';

  // Render reactions for a message
  const renderReactions = (msg: ChatMessage) => {
    const reactions = msg.reactions || {};
    const emojiCounts: Record<string, number> = {};
    for (const [, emoji] of Object.entries(reactions)) {
      emojiCounts[emoji] = (emojiCounts[emoji] || 0) + 1;
    }
    if (Object.keys(emojiCounts).length === 0) return null;
    return (
      <div className={`flex flex-wrap gap-1 mt-1 ${msg.senderId === myId ? 'justify-end' : 'justify-start'}`}>
        {Object.entries(emojiCounts).map(([emoji, count]) => (
          <button
            key={emoji}
            onClick={() => handleReactToMessage(msg.id, emoji)}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs ${
              darkMode ? 'bg-gray-600/60 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
            } transition-colors`}
          >
            <span>{emoji}</span>
            {count > 1 && <span className={textMuted}>{count}</span>}
          </button>
        ))}
      </div>
    );
  };

  // Render reply preview inside a message bubble
  const renderReplyPreview = (msg: ChatMessage) => {
    if (!msg.replyToId) return null;
    const replyToMsg = getMessageById(msg.replyToId);
    if (!replyToMsg) return null;
    return (
      <div className={`mb-1.5 px-2.5 py-1.5 rounded-lg border-r-2 text-xs ${
        msg.senderId === myId
          ? (darkMode ? 'bg-orange-700/30 border-orange-300' : 'bg-orange-100 border-orange-400')
          : (darkMode ? 'bg-gray-600/40 border-gray-400' : 'bg-gray-100 border-gray-300')
      }`}>
        <p className={`font-bold ${msg.senderId === myId ? 'text-orange-200' : textSecondary}`}>
          {replyToMsg.senderId === myId ? t('common.you') : selectedContact?.name || ''}
        </p>
        <p className={textMuted} style={{ direction: dir }}>
          {replyToMsg.messageType === 'image'
            ? '📷 ' + t('messages.imageSent')
            : replyToMsg.text.length > 60 ? replyToMsg.text.slice(0, 60) + '...' : replyToMsg.text}
        </p>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto" dir={dir}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
          <ArrowRight className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className={`text-2xl font-black ${textPrimary}`}>{t('messages.title')}</h1>
          <p className={`text-sm ${textMuted}`}>{t('messages.titleDesc')}</p>
        </div>
        <button onClick={loadContacts} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
          <RefreshCw className={`w-4 h-4 ${loadingContacts ? 'animate-spin' : ''}`} />
        </button>
        <button onClick={() => setShowNewChat(!showNewChat)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`}>
          <UserPlus className="w-4 h-4" />
          {t('messages.newConversation')}
        </button>
      </div>

      {/* New Chat Panel */}
      <AnimatePresence>
        {showNewChat && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className={`mb-4 rounded-2xl border overflow-hidden ${bgCard}`}>
            <div className="p-4">
              {/* Search for users */}
              <h4 className={`font-bold text-sm mb-3 ${textPrimary}`}>{t('messages.contactSeller', 'تواصل مع مستخدم')}</h4>
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="ابحث عن مستخدم بالاسم..."
                  value={userSearchQuery}
                  onChange={e => setUserSearchQuery(e.target.value)}
                  className={`bg-transparent border-none outline-none text-sm w-full ${darkMode ? 'text-white placeholder:text-gray-500' : 'text-gray-900 placeholder:text-gray-400'}`}
                />
                {searchingUsers && <RefreshCw className="w-4 h-4 animate-spin text-orange-500" />}
              </div>

              {/* Search Results */}
              {userSearchResults.length > 0 && (
                <div className="space-y-2 mb-4">
                  <p className={`text-[10px] font-bold ${textMuted}`}>نتائج البحث</p>
                  {userSearchResults.map((user: any) => (
                    <button key={user.id} onClick={() => { handleStartChat(user.id, user.name, user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`); setUserSearchQuery(''); setUserSearchResults([]); }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                      <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} alt="" className="w-10 h-10 rounded-full" />
                      <div className="flex-1 text-right">
                        <span className={`text-sm font-bold block ${textPrimary}`}>{user.name}</span>
                        <span className={`text-[10px] ${textMuted}`}>
                          {user.friendshipStatus === 'accepted' ? 'صديق' : user.friendshipStatus === 'pending' ? 'قيد الانتظار' : 'مستخدم'}
                        </span>
                      </div>
                      <MessageCircle className="w-4 h-4 text-orange-500" />
                    </button>
                  ))}
                </div>
              )}

              {/* Post Authors (Sellers) */}
              {postAuthors.length > 0 && (
                <div className="space-y-2">
                  <p className={`text-[10px] font-bold ${textMuted}`}>البائعون</p>
                  {postAuthors.map(author => (
                    <button key={author.id} onClick={() => handleStartChat(author.id, author.name, author.avatar)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                      <img src={author.avatar} alt="" className="w-10 h-10 rounded-full" />
                      <div className="flex-1 text-right">
                        <span className={`text-sm font-bold block ${textPrimary}`}>{author.name}</span>
                        <span className={`text-[10px] ${textMuted}`}>{author.postContent}...</span>
                      </div>
                      <ShoppingBag className="w-4 h-4 text-orange-500" />
                    </button>
                  ))}
                </div>
              )}

              {userSearchResults.length === 0 && postAuthors.length === 0 && (
                <p className={`text-sm text-center py-4 ${textMuted}`}>{t('messages.noSellers', 'لا يوجد بائعين حالياً - ابحث عن مستخدم')}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Container */}
      <div className={`rounded-2xl border overflow-hidden flex ${bgCard}`} style={{ height: 'calc(100vh - 12rem)', minHeight: '400px' }}>
        {/* Contacts List */}
        <div className={`w-80 border-l flex flex-col ${darkMode ? 'border-gray-700' : 'border-gray-100'} ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3">
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <Search className="w-4 h-4 text-gray-400" />
              <input type="text" placeholder={t('messages.searchConversations')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className={`bg-transparent border-none outline-none text-sm w-full ${darkMode ? 'text-white placeholder:text-gray-500' : 'text-gray-900 placeholder:text-gray-400'}`} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingContacts && apiContacts.length === 0 ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400 mb-2" />
                <p className={`text-sm ${textMuted}`}>{t('messages.loading', 'جاري التحميل...')}</p>
              </div>
            ) : filteredContacts.length > 0 ? filteredContacts.map(contact => (
              <button key={contact.id} onClick={() => setSelectedContactId(contact.id)}
                className={`w-full flex items-center gap-3 p-3 transition-colors text-right ${selectedContactId === contact.id ? (darkMode ? 'bg-orange-900/20' : 'bg-orange-50') : (darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50')}`}>
                <div className="relative flex-shrink-0">
                  <img src={contact.avatar} alt={contact.name} className="w-12 h-12 rounded-full" />
                  {contact.online && <div className="absolute bottom-0 left-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold truncate ${textPrimary}`}>{contact.name}</span>
                    <span className={`text-[10px] flex-shrink-0 ${textMuted}`}>
                      {contact.lastTime ? new Date(contact.lastTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs truncate ${textMuted}`}>{contact.lastMessage}</span>
                    {contact.unread > 0 && (
                      <span className="bg-orange-600 text-white text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full font-bold px-1 flex-shrink-0">{contact.unread}</span>
                    )}
                  </div>
                </div>
              </button>
            )) : (
              <div className="p-8 text-center">
                <p className={`text-sm ${textMuted}`}>{t('messages.noConversations')}</p>
                <p className={`text-xs mt-1 ${textMuted}`}>{t('messages.noConversationsDesc')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col ${!selectedContact ? 'hidden md:flex' : 'flex'}`}>
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedContactId(null)} className={`md:hidden w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <div
                    className="relative cursor-pointer"
                    onClick={() => { if (selectedContactId && selectedContactId !== myId) navigate(`/user/${selectedContactId}`); }}
                  >
                    <img src={selectedContact.avatar} alt={selectedContact.name} className="w-10 h-10 rounded-full hover:opacity-80 transition-opacity" />
                    {selectedContact.online && <div className="absolute bottom-0 left-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />}
                  </div>
                  <div
                    className="cursor-pointer"
                    onClick={() => { if (selectedContactId && selectedContactId !== myId) navigate(`/user/${selectedContactId}`); }}
                  >
                    <h4 className={`text-sm font-bold ${textPrimary} hover:text-orange-600 transition-colors`}>{selectedContact.name}</h4>
                    <span className={`text-[10px] ${showTypingIndicator ? 'text-orange-500' : selectedContact.online ? 'text-green-600' : textMuted}`}>
                      {showTypingIndicator ? t('messages.typing') : selectedContact.online ? t('messages.onlineNow') : formatLastSeen(contactLastSeen)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* Call buttons - visible on md+ screens */}
                  <button
                    onClick={() => startCall('audio')}
                    title={t('messages.audioCall')}
                    className={`hidden md:flex w-9 h-9 rounded-full items-center justify-center transition-colors ${darkMode ? 'hover:bg-gray-700 text-green-400' : 'hover:bg-green-50 text-green-600'}`}
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => startCall('video')}
                    title={t('messages.videoCall')}
                    className={`hidden md:flex w-9 h-9 rounded-full items-center justify-center transition-colors ${darkMode ? 'hover:bg-gray-700 text-blue-400' : 'hover:bg-blue-50 text-blue-600'}`}
                  >
                    <Video className="w-4 h-4" />
                  </button>
                  {/* More menu button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                      title="مزيد من الخيارات"
                      className={`w-9 h-9 rounded-full flex items-center justify-center ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {showHeaderMenu && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className={`absolute left-0 top-full mt-1 rounded-xl shadow-xl border overflow-hidden py-1 min-w-[180px] z-50 ${
                            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                          }`}
                          onClick={() => setShowHeaderMenu(false)}
                        >
                          {/* Audio call - mobile only */}
                          <button
                            onClick={() => startCall('audio')}
                            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors md:hidden ${
                              darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <Phone className="w-4 h-4 text-green-500" />
                            {t('messages.audioCall', 'مكالمة صوتية')}
                          </button>
                          {/* Video call - mobile only */}
                          <button
                            onClick={() => startCall('video')}
                            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors md:hidden ${
                              darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <Video className="w-4 h-4 text-blue-500" />
                            {t('messages.videoCall', 'مكالمة فيديو')}
                          </button>
                          {/* View profile */}
                          <button
                            onClick={() => { if (selectedContactId && selectedContactId !== myId) navigate(`/user/${selectedContactId}`); }}
                            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                              darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <Eye className="w-4 h-4" />
                            {t('messages.viewProfile', 'عرض الملف الشخصي')}
                          </button>
                          {/* Add friend */}
                          {friendshipStatus !== 'accepted' && selectedContactId && (
                            <button
                              onClick={async () => {
                                if (friendshipStatus === 'pending') return;
                                setSendingFriendRequest(true);
                                try {
                                  await api.sendFriendRequest(selectedContactId!);
                                  setFriendshipStatus('pending');
                                  toast.success(t('messages.friendRequestSent', 'تم إرسال طلب الصداقة'));
                                } catch (err: any) {
                                  toast.error(err.message || t('messages.sendFailed', 'فشل إرسال طلب الصداقة'));
                                } finally {
                                  setSendingFriendRequest(false);
                                }
                              }}
                              disabled={sendingFriendRequest || friendshipStatus === 'pending'}
                              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                                friendshipStatus === 'pending'
                                  ? (darkMode ? 'text-yellow-400' : 'text-yellow-600')
                                  : (darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50')
                              }`}
                            >
                              {sendingFriendRequest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                              {friendshipStatus === 'pending' ? t('messages.pendingRequest', 'قيد الانتظار') : t('messages.addFriend', 'إضافة صديق')}
                            </button>
                          )}
                          {/* Refresh messages */}
                          <button
                            onClick={() => loadMessages(selectedContactId!)}
                            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                              darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <RefreshCw className={`w-4 h-4 ${loadingMessages ? 'animate-spin' : ''}`} />
                            تحديث الرسائل
                          </button>
                          {/* Contact info */}
                          <button
                            onClick={() => setShowContactInfo(!showContactInfo)}
                            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                              darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <Info className="w-4 h-4" />
                            معلومات جهة الاتصال
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Contact Info Panel */}
              <AnimatePresence>
                {showContactInfo && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className={`overflow-hidden border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'}`}
                  >
                    <div className="p-4 flex items-center gap-4">
                      <img src={selectedContact.avatar} alt="" className="w-14 h-14 rounded-xl" />
                      <div className="flex-1">
                        <h4 className={`font-bold text-sm ${textPrimary}`}>{selectedContact.name}</h4>
                        <p className={`text-[10px] ${textMuted}`}>
                          {friendshipStatus === 'accepted' ? t('messages.friendRequestAccepted') : friendshipStatus === 'pending' ? t('messages.pendingRequest', 'طلب صداقة قيد الانتظار') : t('messages.notFriend', 'ليس صديقاً بعد')}
                        </p>
                        <p className={`text-[10px] ${selectedContact.online ? 'text-green-600' : textMuted}`}>
                          {selectedContact.online ? t('messages.onlineNow') : formatLastSeen(contactLastSeen)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { startCall('audio'); setShowContactInfo(false); }}
                          className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          title={t('messages.audioCall')}
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { startCall('video'); setShowContactInfo(false); }}
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          title={t('messages.videoCall')}
                        >
                          <Video className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { if (selectedContactId && selectedContactId !== myId) navigate(`/user/${selectedContactId}`); setShowContactInfo(false); }}
                          className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-[10px] font-bold hover:bg-orange-700 transition-colors"
                        >
                          عرض الملف
                        </button>
                        <button
                          onClick={() => setShowContactInfo(false)}
                          className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages */}
              <div ref={messagesContainerRef} onScroll={handleScroll} className={`flex-1 overflow-y-auto p-4 space-y-3 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                {loadingMessages ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400 mb-2" />
                    <p className={`text-sm ${textMuted}`}>{t('messages.loadingMessages', 'جاري تحميل الرسائل...')}</p>
                  </div>
                ) : currentMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <span className="text-2xl">👋</span>
                    </div>
                    <p className={`font-bold ${textPrimary}`}>{t('messages.startConversation')}</p>
                    <p className={`text-xs mt-1 ${textMuted}`}>{t('messages.sendMessageToStart', { name: selectedContact.name })}</p>
                  </div>
                ) : currentMessages.map(msg => {
                  const isMine = msg.senderId === myId;
                  const isFailed = msg._failed;
                  return (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      onContextMenu={(e) => handleContextMenu(e, msg.id)}
                      onTouchStart={() => handleTouchStart(msg.id)}
                      onTouchEnd={handleTouchEnd}
                      onDoubleClick={() => handleDoubleClick(msg.id)}
                    >
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 relative ${
                        isFailed
                          ? 'bg-red-100 text-red-700 border border-red-200 rounded-bl-md'
                          : isMine
                            ? (darkMode ? 'bg-orange-600 text-white rounded-bl-md' : 'bg-orange-500 text-white rounded-bl-md')
                            : (darkMode ? 'bg-gray-700 text-gray-100 rounded-br-md' : 'bg-white text-gray-900 rounded-br-md shadow-sm border border-gray-100')
                      }`}>
                        {/* Reply preview */}
                        {renderReplyPreview(msg)}

                        {/* Image message */}
                        {msg.messageType === 'image' && msg.imageUrl && (
                          <div className="mb-2">
                            <img
                              src={msg.imageUrl}
                              alt="Chat image"
                              className="max-w-full max-h-64 rounded-xl cursor-pointer hover:opacity-90 transition-opacity object-cover"
                              onClick={() => setShowImagePreview(msg.imageUrl!)}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </div>
                        )}

                        {/* Text content */}
                        {msg.text && msg.messageType !== 'image' && (
                          <p className="text-sm leading-relaxed">{msg.text}</p>
                        )}

                        {/* Timestamp & status */}
                        <div className={`flex items-center justify-end gap-1 mt-1 ${isMine ? 'text-orange-200' : textMuted}`}>
                          <span className="text-[10px]">
                            {new Date(msg.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isFailed && <span className="text-[9px] text-red-500 font-bold">فشل الإرسال</span>}
                          {isMine && !isFailed && <Check className={`w-3 h-3 ${msg.read ? 'text-blue-300' : ''}`} />}
                        </div>

                        {/* Reactions */}
                        {renderReactions(msg)}
                      </div>
                    </motion.div>
                  );
                })}

                {/* Typing indicator */}
                <AnimatePresence>
                  {showTypingIndicator && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="flex justify-start"
                    >
                      <div className={`rounded-2xl px-4 py-2.5 ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-500 shadow-sm border border-gray-100'}`}>
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span className="text-[10px]">{t('messages.typing')}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
              </div>

              {/* Reply Preview Bar */}
              <AnimatePresence>
                {replyToMessage && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className={`overflow-hidden border-t ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'}`}
                  >
                    <div className="px-4 py-2 flex items-center gap-3">
                      <div className={`w-1 h-8 rounded-full bg-orange-500`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-[10px] font-bold ${textSecondary}`}>
                          {t('messages.replyTo')} {replyToMessage.senderId === myId ? t('common.you') : selectedContact?.name}
                        </p>
                        <p className={`text-xs truncate ${textMuted}`}>
                          {replyToMessage.messageType === 'image'
                            ? '📷 ' + t('messages.imageSent')
                            : replyToMessage.text.length > 50 ? replyToMessage.text.slice(0, 50) + '...' : replyToMessage.text}
                        </p>
                      </div>
                      <button
                        onClick={() => setReplyToMessage(null)}
                        className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Message Input */}
              <form onSubmit={(e) => handleSendMessage(e)} className={`flex items-center gap-2 px-3 py-2.5 pb-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                {/* Hidden file input for image upload */}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                {/* Image upload button */}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    uploadingImage
                      ? (darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400')
                      : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                  }`}
                  title={t('messages.sendImage')}
                >
                  {uploadingImage ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                </button>
                <input type="text" placeholder={t('messages.typeMessage')} value={messageText} onChange={e => setMessageText(e.target.value)}
                  disabled={sendingMessage}
                  className={`flex-1 px-4 py-2.5 rounded-xl border outline-none text-sm transition-colors ${bgInput} ${darkMode ? 'placeholder:text-gray-500 focus:border-orange-500' : 'placeholder:text-gray-400 focus:border-orange-400'} disabled:opacity-50`} />
                <button type="submit" disabled={(!messageText.trim() && !uploadingImage) || sendingMessage || !myId}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    messageText.trim() && !sendingMessage && myId ? 'bg-orange-600 text-white hover:bg-orange-700 active:scale-95' : (darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400')
                  }`}>
                  {sendingMessage ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <span className="text-3xl">💬</span>
                </div>
                <p className={`font-bold text-lg ${textPrimary}`}>{t('messages.nawaqesMessages')}</p>
                <p className={`text-sm mt-1 ${textMuted}`}>{t('messages.chooseOrStart')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed z-50"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 180),
              top: Math.min(contextMenu.y, window.innerHeight - 200),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`rounded-xl shadow-xl border overflow-hidden py-1 min-w-[160px] ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <button
                onClick={() => {
                  const msg = currentMessages.find(m => m.id === contextMenu.messageId);
                  if (msg) handleReplyToMessage(msg);
                }}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                  darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Reply className="w-4 h-4" />
                {t('messages.reply')}
              </button>
              <button
                onClick={() => setShowReactionPicker(contextMenu.messageId)}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                  darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Smile className="w-4 h-4" />
                {t('messages.react')}
              </button>
              <button
                onClick={() => {
                  const msg = currentMessages.find(m => m.id === contextMenu.messageId);
                  if (msg) handleCopyMessage(msg.text);
                }}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                  darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Copy className="w-4 h-4" />
                {t('messages.copyMessage')}
              </button>
              <button
                onClick={() => handleDeleteMessage(contextMenu.messageId)}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                  darkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-red-50'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                {t('messages.deleteMessage')}
              </button>
            </div>

            {/* Reaction Picker (inline below context menu) */}
            <AnimatePresence>
              {showReactionPicker === contextMenu.messageId && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className={`mt-1 rounded-xl shadow-xl border p-2 flex gap-1 ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}
                >
                  {REACTION_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleReactToMessage(contextMenu.messageId, emoji)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-lg transition-transform hover:scale-125"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Reaction Picker (for double-tap) */}
      <AnimatePresence>
        {showReactionPicker && !contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`rounded-2xl shadow-xl border p-2 flex gap-1 ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className={`text-[10px] font-bold ${textMuted} px-2 py-1 self-center`}>{t('messages.selectReaction')}</div>
              {REACTION_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    if (showReactionPicker) handleReactToMessage(showReactionPicker, emoji);
                  }}
                  className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-xl transition-transform hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
              <button
                onClick={() => setShowReactionPicker(null)}
                className={`w-10 h-10 flex items-center justify-center rounded-xl ${
                  darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incoming Call UI */}
      <AnimatePresence>
        {incomingCall && !activeCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[310] flex items-center justify-center"
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
                  <img src={incomingCall.fromAvatar} alt="" className="w-full h-full object-cover" />
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
                <button
                  onClick={rejectIncomingCall}
                  className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center transition-all active:scale-90 hover:bg-red-600 shadow-lg shadow-red-500/30"
                >
                  <PhoneOff className="w-7 h-7 text-white" />
                </button>
                <button
                  onClick={acceptIncomingCall}
                  className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center transition-all active:scale-90 hover:bg-green-600 shadow-lg shadow-green-500/30"
                >
                  <Phone className="w-7 h-7 text-white" />
                </button>
              </div>
              <p className="text-white/40 text-[10px] mt-4">
                {t('messages.tapToAccept', 'اضغط للقبول أو الرفض')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Call UI Overlay */}
      <AnimatePresence>
        {activeCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center"
            dir={dir}
          >
            {/* Background */}
            <div className={`absolute inset-0 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-b from-gray-800 to-gray-900'}`}>
              {/* Animated gradient circles */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
              </div>
            </div>

            {/* Remote video (full screen behind content) */}
            {activeCall.type === 'video' && remoteStream && (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover z-[1]"
              />
            )}

            {/* Call Content */}
            <div className="relative z-10 flex flex-col items-center text-center px-6">
              {/* Avatar — shown when no remote video */}
              {!(activeCall.type === 'video' && remoteStream) && (
                <div className="relative mb-6">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-28 h-28 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl"
                  >
                    <img src={activeCall.contactAvatar} alt="" className="w-full h-full object-cover" />
                  </motion.div>
                  {/* Calling animation rings */}
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
                  {/* Call type icon */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-lg border-2 border-white">
                    {activeCall.type === 'audio' ? <PhoneCall className="w-5 h-5 text-white" /> : <Video className="w-5 h-5 text-white" />}
                  </div>
                </div>
              )}

              {/* Name & Status */}
              <h2 className="text-2xl font-black text-white mb-2">{activeCall.contactName}</h2>
              <p className="text-green-300 text-sm font-bold mb-1">
                {callState === 'outgoing'
                  ? t('messages.calling', 'جاري الاتصال...')
                  : activeCall.type === 'video'
                    ? t('messages.videoCall', 'مكالمة فيديو')
                    : t('messages.audioCall', 'مكالمة صوتية')}
              </p>
              <p className="text-white/60 text-lg font-mono font-bold">
                {formatCallDuration(callDuration)}
              </p>

              {/* Call error message */}
              {callError && (
                <div className="mt-3 px-4 py-2 bg-red-500/20 rounded-xl border border-red-500/30">
                  <p className="text-red-300 text-sm font-bold">{callError}</p>
                </div>
              )}

              {/* Local video preview (small PIP) */}
              {activeCall.type === 'video' && !isCameraOff && (
                <div className="mt-4 w-40 h-30 rounded-2xl bg-gray-800/50 border border-white/10 overflow-hidden shadow-lg">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Call Controls */}
              <div className="flex items-center gap-6 mt-8">
                {/* Mute */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                    isMuted ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>

                {/* Camera toggle (video call only) */}
                {activeCall.type === 'video' && (
                  <button
                    onClick={() => setIsCameraOff(!isCameraOff)}
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

                {/* Speaker */}
                <button className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-all">
                  <Phone className="w-6 h-6" />
                </button>
              </div>

              {/* Call Duration Info */}
              <p className="text-white/40 text-[10px] mt-6">
                {activeCall.type === 'video' ? t('messages.videoCallActive') : t('messages.audioCallActive')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-size Image Preview Modal */}
      <AnimatePresence>
        {showImagePreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setShowImagePreview(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-3xl max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={showImagePreview}
                alt="Preview"
                className="max-w-full max-h-[85vh] rounded-xl object-contain"
              />
              <button
                onClick={() => setShowImagePreview(null)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Permission Guide Dialog ─── */}
      <AnimatePresence>
        {showPermissionGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[320] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            dir={dir}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-l from-orange-500 to-amber-600 px-5 py-4 text-center">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  {showPermissionGuide === 'video' ? (
                    <Video className="w-7 h-7 text-white" />
                  ) : (
                    <Mic className="w-7 h-7 text-white" />
                  )}
                </div>
                <h3 className="text-white font-black text-lg">
                  {showPermissionGuide === 'video'
                    ? t('messages.permissionVideoTitle', 'السماح بالوصول للكاميرا والميكروفون')
                    : t('messages.permissionAudioTitle', 'السماح بالوصول للميكروفون')}
                </h3>
              </div>

              {/* Instructions */}
              <div className="p-5 space-y-3">
                <p className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t('messages.permissionInstructions', 'لإجراء مكالمة، يحتاج المتصفح إلى إذن الوصول. اتبع الخطوات التالية:')}
                </p>

                <div className="space-y-2">
                  {/* Step 1 */}
                  <div className={`flex items-start gap-3 p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">1</div>
                    <div>
                      <p className={`text-xs font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {t('messages.permissionStep1', 'انقر على أيقونة القفل (🔒) أو إعدادات الموقع في شريط العنوان')}
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className={`flex items-start gap-3 p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">2</div>
                    <div>
                      <p className={`text-xs font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {showPermissionGuide === 'video'
                          ? t('messages.permissionStep2Video', 'ابحث عن "الكاميرا" و"الميكروفون" واختر "السماح"')
                          : t('messages.permissionStep2Audio', 'ابحث عن "الميكروفون" واختر "السماح"')
                        }
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className={`flex items-start gap-3 p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">3</div>
                    <div>
                      <p className={`text-xs font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {t('messages.permissionStep3', 'أعد تحميل الصفحة ثم حاول المكالمة مرة أخرى')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* HTTPS Note */}
                <div className={`flex items-start gap-2 p-3 rounded-xl border ${darkMode ? 'bg-amber-900/20 border-amber-800/40' : 'bg-amber-50 border-amber-200'}`}>
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className={`text-[11px] font-bold ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                    {t('messages.permissionHTTPSNote', 'ملاحظة: يتطلب الاتصال الصوتي/الفيديو اتصالاً آمناً (HTTPS). إذا كنت تستخدم HTTP، يجب التحويل لـ HTTPS أولاً.')}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className={`px-5 pb-5 flex gap-3`}>
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
    </div>
  );
};
