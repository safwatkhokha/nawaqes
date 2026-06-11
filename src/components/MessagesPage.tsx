import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import {
  ArrowRight, Search, Send, Phone, MoreVertical, CheckCircle2, Check, Image as ImageIcon, Paperclip, UserPlus, ShoppingBag, RefreshCw, Eye, Info, X, MessageCircle, Video, Reply, Trash2, Copy, Smile, PhoneCall, VideoOff, PhoneOff, Mic, MicOff, CameraOff, Clock, AlertCircle, Volume2, VolumeX,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage, ChatContact } from '../types';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner';
import { isUserOnline, initializeMockPresence } from '../utils/presence';
import { useImageModal } from './ImageModal';

const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🎉'];

export const MessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const chatParam = searchParams.get('chat');
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
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const { openImageModal, imageModalElement } = useImageModal();
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
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
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

  // ─── Dynamic ICE servers (fetched from backend for reliable cross-network calls) ───
  const [iceServers, setIceServers] = useState<RTCIceServer[]>([]);
  const iceServersFetchedRef = useRef(false);

  // Fetch ICE servers from backend on mount
  useEffect(() => {
    if (iceServersFetchedRef.current) return;
    iceServersFetchedRef.current = true;
    api.getIceServers().then(data => {
      if (data?.iceServers && data.iceServers.length > 0) {
        setIceServers(data.iceServers);
      }
    }).catch(() => {
      // Fallback: use hardcoded servers if API fails
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

  // Build ICE config from fetched servers (or fallback)
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
    // Enable ICE candidate gathering on all interfaces
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceCandidatePoolSize: 2,
  });

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
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't close header menu if clicking inside the menu or its toggle button
      if (showHeaderMenu && target.closest('[data-header-menu]')) return;
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

  // Auto-select contact from URL ?chat=userId parameter
  useEffect(() => {
    if (chatParam && !selectedContactId) {
      setSelectedContactId(chatParam);
    }
  }, [chatParam]);

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
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 100MB for video, 10MB for image
    if (file.size > maxSize) {
      toast.error(isVideo ? t('marketLive.fileTooLarge') : t('createPost.imageSizeError'));
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
      // Just select the contact and open the chat — don't send any auto-message
      setApiContacts(prev => {
        if (prev.find(c => c.id === userId)) return prev;
        return [...prev, {
          id: userId,
          name: userName,
          avatar: userAvatar,
          lastMessage: '',
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
    const pc = new RTCPeerConnection(getIceConfig());
    peerConnectionRef.current = pc;

    // Add local tracks from the provided stream
    if (stream) {
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    }

    // Handle remote stream — collect tracks into a new MediaStream
    let remoteTrackCount = 0;
    const remoteTracks: MediaStreamTrack[] = [];
    pc.ontrack = (event) => {
      // Add the track to our collection
      if (event.streams[0]) {
        event.streams[0].getTracks().forEach(track => {
          if (!remoteTracks.find(t => t.id === track.id)) {
            remoteTracks.push(track);
          }
        });
      } else {
        // Fallback: use event.track directly when streams[0] is undefined
        if (!remoteTracks.find(t => t.id === event.track.id)) {
          remoteTracks.push(event.track);
        }
      }
      remoteTrackCount++;
      // Create a NEW MediaStream each time so React detects the change (different reference)
      const newStream = new MediaStream(remoteTracks);
      setRemoteStream(newStream);
      // Try to set srcObject immediately (works if video element already mounted)
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = newStream;
        remoteVideoRef.current.play().catch(() => {});
      }
      // Also set remote audio on a dedicated audio element for reliable audio playback
      const remoteAudioEl = document.getElementById('remote-call-audio') as HTMLAudioElement | null;
      if (remoteAudioEl) {
        remoteAudioEl.srcObject = newStream;
        remoteAudioEl.play().catch(() => {});
      }
    };

    // Handle ICE candidates — send to remote via WebSocket
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendCallSignal(targetId, { type: 'call-ice-candidate', candidate: event.candidate });
      }
    };

    // Handle ICE connection state changes (more granular than connection state)
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') {
        // Try ICE restart before giving up
        if (pc.restartIce) {
          try {
            pc.restartIce();
            return; // Don't give up yet — wait for restart to complete
          } catch { /* restart failed, will fall through to cleanup */ }
        }
        setCallError(t('messages.callConnectionFailed', 'لم يتم الاتصال - تأكد من اتصال الإنترنت وحاول مرة أخرى'));
        setTimeout(() => cleanupCall(), 3000);
      }
      if (pc.iceConnectionState === 'disconnected') {
        // Don't immediately fail — wait a bit for reconnection
        setTimeout(() => {
          if (peerConnectionRef.current && peerConnectionRef.current.iceConnectionState === 'disconnected') {
            setCallError(t('messages.callConnectionFailed', 'لم يتم الاتصال - تأكد من اتصال الإنترنت وحاول مرة أخرى'));
            setTimeout(() => cleanupCall(), 3000);
          }
        }, 5000);
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        setCallError(t('messages.callConnectionFailed', 'لم يتم الاتصال - تأكد من اتصال الإنترنت وحاول مرة أخرى'));
        setTimeout(() => cleanupCall(), 3000);
      }
      if (pc.connectionState === 'disconnected') {
        // Wait for potential reconnection
        setTimeout(() => {
          if (peerConnectionRef.current && peerConnectionRef.current.connectionState === 'disconnected') {
            setCallError(t('messages.callConnectionFailed', 'لم يتم الاتصال - تأكد من اتصال الإنترنت وحاول مرة أخرى'));
            setTimeout(() => cleanupCall(), 3000);
          }
        }, 5000);
      }
      if (pc.connectionState === 'connected') {
        setCallState('connected');
        setCallError(null); // Clear any previous error
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

  // ─── Start an outgoing call (delegates to GlobalCallOverlay) ────────
  const startCall = (type: 'audio' | 'video') => {
    if (!selectedContact) return;
    // Dispatch a global event that GlobalCallOverlay listens to
    // This ensures calls work from ANY page on the site
    window.dispatchEvent(new CustomEvent('nawaqes:start-call', {
      detail: {
        type,
        contactId: selectedContact.id,
        contactName: selectedContact.name,
        contactAvatar: selectedContact.avatar,
      },
    }));
  };

  // ─── Retry call after granting permissions (delegated to GlobalCallOverlay) ──
  const retryCallWithPermission = () => {
    setShowPermissionGuide(null);
  };

  // ─── Accept an incoming call (now handled by GlobalCallOverlay) ──────
  const acceptIncomingCall = () => {
    // The GlobalCallOverlay handles the actual WebRTC connection
    // MessagesPage just clears its local state since the overlay takes over
    setIncomingCall(null);
  };

  // ─── Reject an incoming call (now handled by GlobalCallOverlay) ──────
  const rejectIncomingCall = () => {
    // The GlobalCallOverlay handles rejection and WebSocket signaling
    // MessagesPage just clears its local state
    setIncomingCall(null);
  };

  // ─── End the current call (now handled by GlobalCallOverlay) ──────────
  const endCall = useCallback(() => {
    cleanupCall();
  }, [cleanupCall]);

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
                setCallError(t('messages.callConnectionFailed', 'لم يتم الاتصال - تأكد من اتصال الإنترنت وحاول مرة أخرى'));
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

  // Attach REMOTE video when remoteStream changes — CRITICAL FIX
  // The <video ref={remoteVideoRef}> element is conditionally rendered (only when remoteStream is truthy),
  // so when ontrack fires and sets remoteStream, the video element doesn't exist yet.
  // This useEffect runs AFTER React renders the video element, so we can safely attach the stream.
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
    // Also attach to the hidden audio element for reliable audio playback
    if (remoteStream) {
      const remoteAudioEl = document.getElementById('remote-call-audio') as HTMLAudioElement | null;
      if (remoteAudioEl) {
        remoteAudioEl.srcObject = remoteStream;
        remoteAudioEl.play().catch(() => {});
      }
    }
  }, [remoteStream]);

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
                  {/* Audio call button - visible on all screens */}
                  <button
                    onClick={() => startCall('audio')}
                    title={t('messages.audioCall')}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${darkMode ? 'hover:bg-gray-700 text-green-400' : 'hover:bg-green-50 text-green-600'}`}
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  {/* Video call button - visible on all screens */}
                  <button
                    onClick={() => startCall('video')}
                    title={t('messages.videoCall')}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${darkMode ? 'hover:bg-gray-700 text-blue-400' : 'hover:bg-blue-50 text-blue-600'}`}
                  >
                    <Video className="w-4 h-4" />
                  </button>
                  {/* More menu button */}
                  <div className="relative" data-header-menu>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowHeaderMenu(!showHeaderMenu); }}
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
                          {/* Audio call */}
                          <button
                            onClick={() => startCall('audio')}
                            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                              darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <Phone className="w-4 h-4 text-green-500" />
                            {t('messages.audioCall', 'مكالمة صوتية')}
                          </button>
                          {/* Video call */}
                          <button
                            onClick={() => startCall('video')}
                            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
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
                                  // Redirect to friend requests page so user can see sent requests
                                  navigate('/friends?tab=sent');
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
                              onClick={() => openImageModal(msg.imageUrl!, 'Chat image')}
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
                  accept="image/*,video/*,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.tiff,.avif,.heic,.heif,.ico,.jfif,.mp4,.webm,.mov,.avi,.3gp,.mkv,.flv,.wmv,.m4v,.ogg,.mpeg,.mpg,.ts,.m2ts,.vob,.asf,.rm,.rmvb,.divx,.xvid"
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

      {/* Image Modal */}
      {imageModalElement}

      {/* Note: Call UI (incoming/outgoing/connected) is now handled by GlobalCallOverlay
          which renders at the app root level (App.tsx) and works on ALL pages,
          not just the messages page. */}
    </div>
  );
};
