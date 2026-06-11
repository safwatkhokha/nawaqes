// ─── Auth Context (JWT-based) ───────────────────────────────────────
import React, { useState, useEffect, createContext, useContext } from 'react';
import { api } from '../services/api';
import { User } from '../types';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { getDefaultAvatar } from '../utils/avatar';
import { connectWebSocket, disconnectWebSocket } from '../hooks/useWebSocket';

interface AuthContextType {
  currentUser: User | null;
  isLoggedIn: boolean;
  initializing: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, interests?: string[], phone?: string, gender?: 'male' | 'female', dateOfBirth?: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  allUsers: User[];
}

export const AuthContext = createContext<AuthContextType>({
  currentUser: null, isLoggedIn: false, initializing: true,
  login: async () => false, register: async () => false,
  logout: () => {}, updateProfile: async () => {}, refreshCurrentUser: async () => {}, allUsers: [],
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const { t } = useTranslation();

  // Use a ref for the isLoggingIn flag to ensure synchronous reads
  // in event handlers (React state may be stale due to batching)
  const isLoggingInRef = React.useRef(false);

  const login = async (email: string, password: string): Promise<boolean> => {
    isLoggingInRef.current = true;
    try {
      const data = await api.login(email, password);
      const user = mapApiUser(data.user);
      // Set token and user state atomically to prevent race conditions
      api.setToken(data.token); // Ensure token is explicitly set
      setCurrentUser(user);
      setIsLoggedIn(true);
      // Connect WebSocket after successful login
      connectWebSocket(data.token);
      toast.success(t('auth.welcomeUser', { name: user.name }));
      return true;
    } catch (err: any) {
      // Don't show session expired on login failure - show login failed instead
      const msg = err.message === i18n.t('api.sessionExpired') ? t('auth.loginFailed') : (err.message || t('auth.loginFailed'));
      toast.error(msg);
      return false;
    } finally {
      // Delay resetting the flag to allow any pending stale requests to finish
      setTimeout(() => { isLoggingInRef.current = false; }, 5000);
    }
  };

  const register = async (name: string, email: string, password: string, interests?: string[], phone?: string, gender?: 'male' | 'female', dateOfBirth?: string): Promise<boolean> => {
    isLoggingInRef.current = true;
    try {
      const data = await api.register(name, email, password, interests, phone, gender, dateOfBirth);
      const user = mapApiUser(data.user);
      api.setToken(data.token); // Ensure token is explicitly set
      setCurrentUser(user);
      setIsLoggedIn(true);
      // Connect WebSocket after successful registration
      connectWebSocket(data.token);
      toast.success(t('auth.accountCreated', { name }));
      return true;
    } catch (err: any) {
      toast.error(err.message || t('auth.accountCreationFailed'));
      return false;
    } finally {
      setTimeout(() => { isLoggingInRef.current = false; }, 5000);
    }
  };

  const logout = () => {
    // Disconnect WebSocket before clearing session
    disconnectWebSocket();
    api.setToken(null);
    setCurrentUser(null);
    setIsLoggedIn(false);
    toast.info(t('auth.loggedOut'));
  };

  const updateProfile = async (updates: Partial<User>) => {
    try {
      const data = await api.updateProfile(updates as any);
      setCurrentUser(mapApiUser(data));
    } catch (err: any) {
      toast.error(err.message || t('auth.profileUpdateFailed'));
    }
  };

  // Refresh current user data from server without triggering a profile update API call
  // Use this after operations that change server-side state (wallet balance, etc.)
  const refreshCurrentUser = async () => {
    try {
      const data = await api.getMe();
      setCurrentUser(mapApiUser(data));
    } catch {
      // Silently fail - the local state will be stale but not broken
    }
  };

  // Track whether we've completed initial auth check
  const authCheckedRef = React.useRef(false);

  // ─── Proactive Token Refresh ──────────────────────────────────────
  // Periodically check if the token is about to expire and refresh it
  // before it does. This prevents unexpected 401 errors and the brief
  // disruption of silent refresh retries.
  useEffect(() => {
    if (!isLoggedIn) return;

    // Check token every 6 hours and proactively refresh it
    const TOKEN_REFRESH_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

    const checkAndRefresh = async () => {
      try {
        const result = await api.refreshToken();
        if (result?.token) {
          // Token was refreshed — WebSocket will be updated via the
          // auth:token-refreshed event dispatched by api.refreshToken()
          console.log('[Auth] Proactive token refresh successful');
        }
      } catch {
        // Silently ignore — the token might still be valid
      }
    };

    // Initial check after 30 seconds (don't do it immediately on mount)
    const initialTimer = setTimeout(() => {
      checkAndRefresh();
    }, 30000);

    // Then check periodically
    const interval = setInterval(checkAndRefresh, TOKEN_REFRESH_INTERVAL);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [isLoggedIn]);

  // Check for existing session on mount
  useEffect(() => {
    const init = async () => {
      const token = api.getToken();
      if (token) {
        try {
          const data = await api.getMe();
          setCurrentUser(mapApiUser(data));
          setIsLoggedIn(true);
          // ─── FIX: Connect WebSocket after successful session restoration ───
          // Previously, WebSocket only connected on login/register, not on page reload.
          // This caused real-time features (notifications, chat, wallet updates) to
          // stop working after a page refresh, requiring manual re-login.
          connectWebSocket(token);
        } catch (err: any) {
          // Only clear token on 401 (authentication error)
          // Don't clear on network errors - the token might still be valid
          const isSessionExpired = err?.message === i18n.t('api.sessionExpired');
          if (isSessionExpired) {
            // Token is stale/invalid - clear silently without triggering logout toast
            api.setToken(null);
          } else {
            // Network error or other issue - keep the token
            // Set isLoggedIn to true so user isn't redirected to login on refresh
            // Use a placeholder user to avoid null crashes, real data will load on retry
            setIsLoggedIn(true);
            setCurrentUser({
              id: 'pending',
              name: '...',
              avatar: '',
              isVerified: false,
              isAdmin: false,
              isTrusted: false,
              walletBalance: 0,
              trustScore: 50,
              gender: 'male',
              phone: '',
              location: '',
              bio: '',
              interests: [],
              paymentMethods: [],
              isDeactivated: false,
            });
            // Still try to connect WebSocket even on network error
            // The token might be valid — real-time features should work once connection is up
            connectWebSocket(token);
            // Schedule a retry to fetch user data
            setTimeout(async () => {
              try {
                const data = await api.getMe();
                setCurrentUser(mapApiUser(data));
              } catch {
                // If retry also fails, don't keep trying
              }
            }, 3000);
          }
        }
      }
      setInitializing(false);
      authCheckedRef.current = true;
    };
    init();
  }, []);

  // Listen for auth expired events - only act after initial check is done
  // During initialization, a stale token will trigger auth:expired but we
  // don't want to show a confusing 'logged out' toast to a user who wasn't logged in
  // Also, during login, don't process auth:expired from stale requests
  // IMPORTANT: Use a ref for isLoggingIn to avoid stale closure issues
  const isLoggedInRef = React.useRef(false);
  isLoggedInRef.current = isLoggedIn;

  // Keep a ref to the current user ID to detect legitimate session expiry
  // vs. stale requests from a previous session
  const currentUserIdRef = React.useRef<string | null>(null);
  currentUserIdRef.current = currentUser?.id ?? null;

  // Track the last time we processed an auth:expired event to debounce
  // rapid consecutive events from multiple failed requests
  const lastAuthExpiredRef = React.useRef(0);

  useEffect(() => {
    const handler = (e: Event) => {
      // Skip if we're in the middle of logging in (stale request race condition)
      if (isLoggingInRef.current) return;
      // Skip if initial auth check hasn't completed yet
      if (!authCheckedRef.current) return;
      // Skip if user is on a placeholder/pending state (still initializing)
      if (currentUser?.id === 'pending') return;
      // Debounce: ignore auth:expired events within 2 seconds of each other
      // This prevents multiple concurrent 401 responses from triggering multiple logouts
      const now = Date.now();
      if (now - lastAuthExpiredRef.current < 2000) return;
      lastAuthExpiredRef.current = now;
      // Only show logout toast if user was actually logged in
      if (isLoggedInRef.current) {
        // Disconnect WebSocket before clearing session
        disconnectWebSocket();
        setCurrentUser(null);
        setIsLoggedIn(false);
        toast.info(t('auth.loggedOut'));
      }
    };
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, []);

  // ─── Listen for token refresh events from api.ts ───────────────────
  // When the API client silently refreshes the token, we need to:
  // 1. Update the user data (in case it changed on the server)
  // 2. Reconnect the WebSocket with the new token
  useEffect(() => {
    const handler = (e: Event) => {
      const { token, user } = (e as CustomEvent).detail || {};
      if (!token) return;

      console.log('[Auth] Token refreshed, updating session...');

      // Update user data if provided
      if (user) {
        setCurrentUser(mapApiUser(user));
      } else {
        // Fetch latest user data
        api.getMe().then((data) => {
          setCurrentUser(mapApiUser(data));
        }).catch(() => {});
      }

      // Reconnect WebSocket with the new token
      connectWebSocket(token);
    };
    window.addEventListener('auth:token-refreshed', handler);
    return () => window.removeEventListener('auth:token-refreshed', handler);
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, isLoggedIn, initializing, login, register, logout, updateProfile, refreshCurrentUser, allUsers }}>
      {children}
    </AuthContext.Provider>
  );
}

// Map API user to frontend User type
function mapApiUser(data: any): User {
  return {
    id: data.id,
    name: data.name,
    avatar: data.avatar || getDefaultAvatar(data.name, data.gender),
    isVerified: !!data.is_verified,
    isAdmin: !!data.is_admin,
    isTrusted: !!data.is_trusted,
    walletBalance: data.wallet_balance ?? 0,
    trustScore: data.trust_score ?? 50,
    showPhone: !!data.show_phone,
    showLocation: !!data.show_location,
    gender: data.gender || 'male',
    phone: data.phone || '',
    location: data.location || '',
    bio: data.bio || '',
    coverPhoto: data.cover_photo || '',
    interests: Array.isArray(data.interests) ? data.interests : (() => { try { return JSON.parse(data.interests || '[]'); } catch { return []; } })(),
    paymentMethods: Array.isArray(data.payment_methods) ? data.payment_methods : (() => { try { return JSON.parse(data.payment_methods || '[]'); } catch { return []; } })(),
    joinDate: data.join_date || data.created_at,
    avatarBase64: data.avatar_base64,
    isDeactivated: !!data.is_deactivated,
    dateOfBirth: data.date_of_birth || '',
  };
}
