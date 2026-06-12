import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Package, LayoutDashboard, CreditCard, Zap, Newspaper, Plus,
  Flag, Wallet, Database, Settings, ChevronLeft, ChevronRight, Menu,
  RefreshCw, MessageSquare, Link2, Activity, Radio, MessageCircle,
  Image as ImageIcon, ShoppingBag, BarChart3,
  Phone as PhoneIcon, Moon, Sun, LogOut, Bell,
  Search, Heart, Video, Brain, TrendingUp, Shield,
  AlertTriangle, Clock, Sparkles, X, Command,
  UserCheck, DollarSign, Eye, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { DashboardStats, ChartDataPoint, NewsItem } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { adminFetch } from './helpers';
import { AdminTab, TabConfig, AdminUser, ReportItem, SiteSettings, TransactionItem, CommentItem, StoryItem, ChatMessageItem, ActivityItem, DatabaseInfo, MarketPromoRequest } from './types';

// Tab components - lazy loaded for better performance
const OverviewTab = lazy(() => import('./OverviewTab').then(m => ({ default: m.OverviewTab })));
const UsersTab = lazy(() => import('./UsersTab').then(m => ({ default: m.UsersTab })));
const PostsTab = lazy(() => import('./PostsTab').then(m => ({ default: m.PostsTab })));
const SupportTab = lazy(() => import('./SupportTab').then(m => ({ default: m.SupportTab })));
const CommentsTab = lazy(() => import('./CommentsTab').then(m => ({ default: m.CommentsTab })));
const ChargingTab = lazy(() => import('./ChargingTab').then(m => ({ default: m.ChargingTab })));
const PromotionsTab = lazy(() => import('./PromotionsTab').then(m => ({ default: m.PromotionsTab })));
const MarketPromotionsTab = lazy(() => import('./MarketPromotionsTab').then(m => ({ default: m.MarketPromotionsTab })));
const NewsTab = lazy(() => import('./NewsTab').then(m => ({ default: m.NewsTab })));
const PublishTab = lazy(() => import('./PublishTab').then(m => ({ default: m.PublishTab })));
const ReportsTab = lazy(() => import('./ReportsTab').then(m => ({ default: m.ReportsTab })));
const CategoriesTab = lazy(() => import('./CategoriesTab').then(m => ({ default: m.CategoriesTab })));
const TransactionsTab = lazy(() => import('./TransactionsTab').then(m => ({ default: m.TransactionsTab })));
const StoriesTab = lazy(() => import('./StoriesTab').then(m => ({ default: m.StoriesTab })));
const MessagesTab = lazy(() => import('./MessagesTab').then(m => ({ default: m.MessagesTab })));
const SmartLinksTab = lazy(() => import('./SmartLinksTab').then(m => ({ default: m.SmartLinksTab })));
const ActivityTab = lazy(() => import('./ActivityTab').then(m => ({ default: m.ActivityTab })));
const BroadcastTab = lazy(() => import('./BroadcastTab').then(m => ({ default: m.BroadcastTab })));
const DatabaseTab = lazy(() => import('./DatabaseTab').then(m => ({ default: m.DatabaseTab })));
const SettingsTab = lazy(() => import('./SettingsTab').then(m => ({ default: m.SettingsTab })));
const FriendsManagementTab = lazy(() => import('./FriendsManagementTab').then(m => ({ default: m.FriendsManagementTab })));
const LiveStreamTab = lazy(() => import('./LiveStreamTab').then(m => ({ default: m.LiveStreamTab })));
const AIAnalyticsTab = lazy(() => import('./AIAnalyticsTab').then(m => ({ default: m.AIAnalyticsTab })));
const AdminNotificationsTab = lazy(() => import('./AdminNotificationsTab').then(m => ({ default: m.AdminNotificationsTab })));

// ─── Tab Fallback Loader ──
const TabLoader: React.FC<{ darkMode?: boolean }> = ({ darkMode }) => (
  <div className="flex items-center justify-center py-20">
    <div className="text-center space-y-3">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
      <p className={`text-sm font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>جاري التحميل...</p>
    </div>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────
export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const {
    promotionRequests, setPromotionRequests, approvePromotion, rejectPromotion,
    chargingRequests, setChargingRequests, approveCharging, rejectCharging,
    addAdminAlert, refreshData, darkMode, toggleDarkMode,
  } = useAppContext();
  const { dir } = useLanguage();
  const { t } = useTranslation();

  // ─── Core State ──
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [detailedStats, setDetailedStats] = useState<any>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  // ─── Users ──
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({ siteName: t('app.nameAr'), maintenanceMode: false, maxUploadSize: 5, defaultWalletBalance: 0 });
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [allNews, setAllNews] = useState<any[]>([]);

  // ─── Transactions ──
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [txFilter, setTxFilter] = useState<string>('all');
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);

  // ─── Stories / Messages / Comments / Activity ──
  const [adminStories, setAdminStories] = useState<StoryItem[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([]);
  const [adminComments, setAdminComments] = useState<CommentItem[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityItem[]>([]);
  const [smartLinksData, setSmartLinksData] = useState<any>(null);
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [realtimeStats, setRealtimeStats] = useState<any>(null);

  // ─── Market Promos ──
  const [marketPromoRequests, setMarketPromoRequests] = useState<MarketPromoRequest[]>([]);

  // ─── Notification badge ──
  const pendingCount = useMemo(() => {
    return chargingRequests.filter(c => c.status === 'pending').length
      + promotionRequests.filter(p => p.status === 'pending').length
      + marketPromoRequests.filter(p => p.status === 'pending').length
      + reports.length;
  }, [chargingRequests, promotionRequests, marketPromoRequests, reports]);

  // ─── Data Loaders ──
  const loadUsers = useCallback(async () => {
    try {
      const users = await api.getAdminUsers().catch(() => []);
      setAllUsers(
        (users as any).map((u: any) => ({
          id: u.id, name: u.name, email: u.email, avatar: u.avatar,
          phone: u.phone || '', location: u.location || '',
          walletBalance: u.wallet_balance || u.walletBalance || 0,
          trustScore: u.trust_score || u.trustScore || 0,
          isVerified: !!u.is_verified || !!u.isVerified,
          isAdmin: !!u.is_admin || !!u.isAdmin,
          isTrusted: !!u.is_trusted || !!u.isTrusted,
          isDeactivated: !!u.is_deactivated || !!u.isDeactivated,
          joinDate: u.join_date || u.joinDate || '',
          gender: u.gender || 'male',
          showPhone: !!u.show_phone || !!u.showPhone,
          dateOfBirth: u.date_of_birth || u.dateOfBirth || '',
          interests: (() => { try { return JSON.parse(u.interests || '[]'); } catch { return []; } })(),
        }))
      );
    } catch {}
  }, []);

  const loadReports = useCallback(async () => {
    try {
      const data = await adminFetch('GET', '/admin/reports').catch(() => []);
      if (Array.isArray(data))
        setReports(
          data.map((r: any) => ({
            id: r.id, postId: r.post_id, userId: r.user_id,
            reporterId: r.reporter_id || '', reporterName: r.reporter_name || t('admin.unknown'),
            reason: r.reason || '', postContent: r.post_content,
            userName: r.user_name, status: r.status || 'pending', createdAt: r.created_at || '',
          }))
        );
    } catch {}
  }, [t]);

  const loadSettings = useCallback(async () => {
    try {
      const data = await adminFetch('GET', '/admin/settings').catch(() => null);
      if (data && typeof data === 'object')
        setSiteSettings(prev => ({
          ...prev, ...(data as any),
          maintenanceMode: !!(data as any).maintenanceMode,
          maxUploadSize: (data as any).maxUploadSize || 5,
          defaultWalletBalance: (data as any).defaultWalletBalance || 0,
          siteName: (data as any).siteName || t('app.nameAr'),
        }));
    } catch {}
  }, [t]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await api.getCategories().catch(() => []);
      if (Array.isArray(data)) setAllCategories(data as any[]);
    } catch {}
  }, []);

  const loadNews = useCallback(async () => {
    try {
      const data = await adminFetch('GET', '/admin/news?limit=100').catch(() => []);
      if (Array.isArray(data)) setAllNews(data as any[]);
    } catch {}
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(txPage), limit: '50' });
      if (txFilter !== 'all') params.set('type', txFilter);
      const data = await adminFetch('GET', `/admin/transactions?${params.toString()}`).catch(() => ({ transactions: [], total: 0 }));
      if (data && (data as any).transactions) {
        setTransactions((data as any).transactions);
        setTxTotal((data as any).total || 0);
      }
    } catch {}
  }, [txPage, txFilter]);

  const loadStories = useCallback(async () => {
    try {
      const data = await adminFetch('GET', '/admin/stories').catch(() => []);
      if (Array.isArray(data))
        setAdminStories(
          data.map((s: any) => ({
            id: s.id, user_id: s.user_id, user_name: s.user_name || t('admin.unknown'),
            user_avatar: s.user_avatar || '', image: s.image || '',
            type: s.type || 'image', text: s.text || '', created_at: s.created_at || '',
          }))
        );
    } catch {}
  }, [t]);

  const loadChatMessages = useCallback(async () => {
    try {
      const data = await adminFetch('GET', '/admin/chat-messages?limit=200').catch(() => []);
      if (Array.isArray(data))
        setChatMessages(
          data.map((m: any) => ({
            id: m.id, sender_id: m.sender_id, receiver_id: m.receiver_id,
            text: m.text || m.content || '', sender_name: m.sender_name || t('admin.unknown'),
            receiver_name: m.receiver_name || t('admin.unknown'), created_at: m.created_at || '',
          }))
        );
    } catch {}
  }, [t]);

  const loadActivityLog = useCallback(async () => {
    try {
      const data = await adminFetch('GET', '/admin/activity-log?limit=100').catch(() => []);
      if (Array.isArray(data)) setActivityLog(data as ActivityItem[]);
    } catch {}
  }, []);

  const loadDatabaseInfo = useCallback(async () => {
    try {
      const data = await adminFetch('GET', '/admin/database-info').catch(() => null);
      if (data) setDbInfo(data as DatabaseInfo);
    } catch {}
  }, []);

  const loadComments = useCallback(async () => {
    try {
      const data = await adminFetch('GET', '/admin/comments?limit=200').catch(() => []);
      if (Array.isArray(data)) setAdminComments(data as CommentItem[]);
    } catch {}
  }, []);

  const loadSmartLinks = useCallback(async () => {
    try {
      const data = await adminFetch('GET', '/admin/smart-links').catch(() => null);
      if (data) setSmartLinksData(data);
    } catch {}
  }, []);

  const loadRealtimeStats = useCallback(async () => {
    try {
      const data = await adminFetch('GET', '/admin/dashboard/realtime').catch(() => null);
      if (data) setRealtimeStats(data);
    } catch {}
  }, []);

  // ─── Initial Data Loading ──
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [statsData, chartDataRes, postsData, promoReqs, chargeReqs, detStats, marketPromoReqs] = await Promise.all([
          api.getAdminStats().catch(() => null),
          api.getAdminChart().catch(() => []),
          adminFetch('GET', '/admin/all-posts?limit=50').catch(() => ({ posts: [] })),
          api.getPromotionRequests().catch(() => []),
          api.getChargingRequests().catch(() => []),
          api.getAdminDetailedStats().catch(() => null),
          api.getMarketPromotionRequests().catch(() => []),
        ]);
        if (statsData) setStats(statsData as any);
        if (detStats) setDetailedStats(detStats);
        if (Array.isArray(chartDataRes) && chartDataRes.length > 0) setChartData(chartDataRes as any);
        if (postsData && (postsData as any).posts) {
          setPosts((postsData as any).posts);
        }
        if (Array.isArray(promoReqs)) {
          setPromotionRequests(
            (promoReqs as any[]).map((r: any) => ({
              id: r.id, postId: r.post_id, postContent: r.post_content,
              postAuthor: { id: r.author_id, name: r.author_name, avatar: r.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.author_id}` },
              tier: r.tier, price: r.price, status: r.status, createdAt: r.created_at,
              packageName: r.package_name, duration: r.duration, estimatedReach: r.estimated_reach,
              maxNotifications: r.max_notifications, includeMessages: !!r.include_messages, targeting: r.targeting,
              targetCity: r.target_city, targetInterests: r.target_interests ? JSON.parse(r.target_interests) : [],
              targetAgeMin: r.target_age_min || 0, targetAgeMax: r.target_age_max || 0,
              cityCount: r.city_count || 1,
            }))
          );
        }
        if (Array.isArray(chargeReqs)) {
          setChargingRequests(
            (chargeReqs as any[]).map((r: any) => ({
              id: r.id, userId: r.user_id, userName: r.user_name,
              userAvatar: r.user_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.user_id}`,
              userPhone: r.user_phone || '', amount: r.amount, method: r.method,
              receiptImage: r.receipt_image || '', status: r.status, createdAt: r.created_at,
            }))
          );
        }
        if (Array.isArray(marketPromoReqs)) {
          setMarketPromoRequests(
            (marketPromoReqs as any[]).map((r: any) => ({
              id: r.id, listingId: r.listing_id,
              listingTitle: r.listing_title || r.listing_id,
              sellerId: r.seller_id, sellerName: r.seller_name || t('common.user'),
              sellerAvatar: r.seller_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.seller_id}`,
              tier: r.tier, packageName: r.package_name, price: r.price,
              duration: r.duration, estimatedReach: r.estimated_reach,
              targeting: r.targeting, targetCity: r.target_city,
              targetInterests: r.target_interests,
              targetAgeMin: r.target_age_min || 0, targetAgeMax: r.target_age_max || 0,
              status: r.status, createdAt: r.created_at,
            }))
          );
        }
      } catch (e) {
        console.error('Error fetching admin data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
    loadUsers();
    loadReports();
    loadSettings();
    loadCategories();
    loadNews();
  }, []);

  // ─── Tab-based lazy loading ──
  useEffect(() => {
    if (activeTab === 'transactions') loadTransactions();
    if (activeTab === 'stories') loadStories();
    if (activeTab === 'messages') loadChatMessages();
    if (activeTab === 'activity') loadActivityLog();
    if (activeTab === 'database') loadDatabaseInfo();
    if (activeTab === 'comments') loadComments();
    if (activeTab === 'smartlinks') loadSmartLinks();
    if (activeTab === 'overview') loadRealtimeStats();
  }, [activeTab, txPage, txFilter]);

  // ─── Periodic refresh for real-time stats (every 30 seconds) ──────
  useEffect(() => {
    // Initial load
    loadRealtimeStats();
    // Refresh every 30 seconds to keep admin data fresh
    const interval = setInterval(() => {
      loadRealtimeStats();
      // Also refresh core stats periodically
      api.getAdminStats().then(data => { if (data) setStats(data as any); }).catch(() => {});
      api.getAdminDetailedStats().then(data => { if (data) setDetailedStats(data); }).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // ─── Real-time updates via WebSocket ──────────────────────────────
  // Listen for data change events from WebSocket and auto-refresh
  // the relevant admin data without requiring a manual page refresh
  useEffect(() => {
    const handleAdminDataChanged = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { eventType } = customEvent.detail || {};

      // Refresh stats and detailed stats for ALL changes
      api.getAdminStats().then(data => { if (data) setStats(data as any); }).catch(() => {});
      api.getAdminDetailedStats().then(data => { if (data) setDetailedStats(data); }).catch(() => {});
      loadRealtimeStats();

      // Specific refreshes based on event type
      if (eventType === 'admin:promotion-request-created' || eventType === 'admin:promotion-request-updated') {
        // New or updated promotion request - refresh promotion list
        api.getPromotionRequests().then(promoReqs => {
          if (Array.isArray(promoReqs)) {
            setPromotionRequests(
              (promoReqs as any[]).map((r: any) => ({
                id: r.id, postId: r.post_id, postContent: r.post_content,
                postAuthor: { id: r.author_id, name: r.author_name, avatar: r.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.author_id}` },
                tier: r.tier, price: r.price, status: r.status, createdAt: r.created_at,
                packageName: r.package_name, duration: r.duration, estimatedReach: r.estimated_reach,
                maxNotifications: r.max_notifications, includeMessages: !!r.include_messages, targeting: r.targeting,
                targetCity: r.target_city, targetInterests: r.target_interests ? JSON.parse(r.target_interests) : [],
                targetAgeMin: r.target_age_min || 0, targetAgeMax: r.target_age_max || 0,
                cityCount: r.city_count || 1,
              }))
            );
          }
        }).catch(() => {});
      }

      if (eventType === 'admin:charging-request-created' || eventType === 'admin:charging-request-updated') {
        // New or updated charging request - refresh charging list
        api.getChargingRequests().then(chargeReqs => {
          if (Array.isArray(chargeReqs)) {
            setChargingRequests(
              (chargeReqs as any[]).map((r: any) => ({
                id: r.id, userId: r.user_id, userName: r.user_name,
                userAvatar: r.user_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.user_id}`,
                userPhone: r.user_phone || '', amount: r.amount, method: r.method,
                receiptImage: r.receipt_image || '', status: r.status, createdAt: r.created_at,
              }))
            );
          }
        }).catch(() => {});
      }

      if (eventType === 'admin:market-promotion-request-created' || eventType === 'admin:market-promotion-request-updated') {
        // New or updated market promotion request - refresh market promo list
        api.getMarketPromotionRequests().then(marketPromoReqs => {
          if (Array.isArray(marketPromoReqs)) {
            setMarketPromoRequests(
              (marketPromoReqs as any[]).map((r: any) => ({
                id: r.id, listingId: r.listing_id,
                listingTitle: r.listing_title || r.listing_id,
                sellerId: r.seller_id, sellerName: r.seller_name || t('common.user'),
                sellerAvatar: r.seller_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.seller_id}`,
                tier: r.tier, packageName: r.package_name, price: r.price,
                duration: r.duration, estimatedReach: r.estimated_reach,
                targeting: r.targeting, targetCity: r.target_city,
                targetInterests: r.target_interests,
                targetAgeMin: r.target_age_min || 0, targetAgeMax: r.target_age_max || 0,
                status: r.status, createdAt: r.created_at,
              }))
            );
          }
        }).catch(() => {});
      }

      // Always refresh transaction data on any admin change
      // (transactions change when charging/promotion requests are processed)
      loadTransactions();

      // Refresh posts list when any admin event occurs
      adminFetch('GET', '/admin/all-posts?limit=50').then(postsData => {
        if (postsData && (postsData as any).posts) {
          setPosts((postsData as any).posts);
        }
      }).catch(() => {});

      // Refresh users list on any admin change (new users, status changes)
      loadUsers();

      // Refresh news list on any admin change (news/alerts created or deleted)
      loadNews();

      // Refresh activity log on any admin change
      if (activeTab === 'activity') loadActivityLog();
    };

    window.addEventListener('nawaqes:admin-data-changed', handleAdminDataChanged);
    return () => window.removeEventListener('nawaqes:admin-data-changed', handleAdminDataChanged);
  }, [activeTab, t]);

  // ─── Keyboard shortcut for search ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ─── Sidebar Tab Groups ──
  type SidebarTab = { id: AdminTab; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string };
  const tabGroups = useMemo((): { label: string; tabs: SidebarTab[] }[] => [
    {
      label: t('admin.groupMain'),
      tabs: [
        { id: 'overview' as AdminTab, label: t('admin.tab_overview'), icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
        { id: 'admin-notifications' as AdminTab, label: 'الإشعارات', icon: <Bell className="w-[18px] h-[18px]" />, badge: (stats?.pendingCharging || 0) + (stats?.pendingPromotions || 0) + (stats?.pendingMarketPromotions || 0), badgeColor: 'orange' },
        { id: 'users' as AdminTab, label: t('admin.tab_users'), icon: <Users className="w-[18px] h-[18px]" />, badge: allUsers.length },
        { id: 'posts' as AdminTab, label: t('admin.tab_posts'), icon: <Package className="w-[18px] h-[18px]" />, badge: posts.length },
      ],
    },
    {
      label: t('admin.groupModeration'),
      tabs: [
        { id: 'support' as AdminTab, label: t('admin.tab_support'), icon: <PhoneIcon className="w-[18px] h-[18px]" /> },
        { id: 'comments' as AdminTab, label: t('admin.tab_comments'), icon: <MessageCircle className="w-[18px] h-[18px]" /> },
        { id: 'reports' as AdminTab, label: t('admin.tab_reports'), icon: <Flag className="w-[18px] h-[18px]" />, badge: reports.length, badgeColor: 'red' },
        { id: 'stories' as AdminTab, label: t('admin.tab_stories'), icon: <ImageIcon className="w-[18px] h-[18px]" /> },
      ],
    },
    {
      label: t('admin.groupFinancial'),
      tabs: [
        { id: 'charging' as AdminTab, label: t('admin.tab_chargeRequests'), icon: <CreditCard className="w-[18px] h-[18px]" />, badge: chargingRequests.filter(c => c.status === 'pending').length, badgeColor: 'amber' },
        { id: 'promotions' as AdminTab, label: t('admin.tab_promotionRequests'), icon: <Zap className="w-[18px] h-[18px]" />, badge: promotionRequests.filter(p => p.status === 'pending').length, badgeColor: 'amber' },
        { id: 'market-promotions' as AdminTab, label: t('admin.tab_marketPromotions'), icon: <ShoppingBag className="w-[18px] h-[18px]" />, badge: marketPromoRequests.filter(p => p.status === 'pending').length, badgeColor: 'amber' },
        { id: 'transactions' as AdminTab, label: t('admin.tab_financial'), icon: <Wallet className="w-[18px] h-[18px]" /> },
      ],
    },
    {
      label: t('admin.groupContent'),
      tabs: [
        { id: 'news' as AdminTab, label: t('admin.tab_news'), icon: <Newspaper className="w-[18px] h-[18px]" />, badge: allNews.length },
        { id: 'publish' as AdminTab, label: t('admin.tab_publishAsAdmin'), icon: <Plus className="w-[18px] h-[18px]" /> },
        { id: 'categories' as AdminTab, label: t('admin.tab_categories'), icon: <BarChart3 className="w-[18px] h-[18px]" /> },
      ],
    },
    {
      label: t('admin.groupCommunity'),
      tabs: [
        { id: 'friends-mgmt' as AdminTab, label: t('admin.tab_friendsManagement'), icon: <Heart className="w-[18px] h-[18px]" /> },
        { id: 'messages' as AdminTab, label: t('admin.tab_messages'), icon: <MessageSquare className="w-[18px] h-[18px]" /> },
        { id: 'livestream' as AdminTab, label: t('admin.tab_livestream'), icon: <Video className="w-[18px] h-[18px]" /> },
      ],
    },
    {
      label: t('admin.groupAnalytics'),
      tabs: [
        { id: 'smartlinks' as AdminTab, label: t('admin.tab_smartReach'), icon: <Link2 className="w-[18px] h-[18px]" /> },
        { id: 'ai-analytics' as AdminTab, label: t('admin.tab_aiAnalytics'), icon: <Brain className="w-[18px] h-[18px]" /> },
        { id: 'activity' as AdminTab, label: t('admin.tab_activity'), icon: <Activity className="w-[18px] h-[18px]" /> },
      ],
    },
    {
      label: t('admin.groupSystem'),
      tabs: [
        { id: 'broadcast' as AdminTab, label: t('admin.tab_broadcast'), icon: <Radio className="w-[18px] h-[18px]" /> },
        { id: 'database' as AdminTab, label: t('admin.tab_database'), icon: <Database className="w-[18px] h-[18px]" /> },
        { id: 'settings' as AdminTab, label: t('admin.tab_settings'), icon: <Settings className="w-[18px] h-[18px]" /> },
      ],
    },
  ], [t, allUsers, posts, reports, chargingRequests, promotionRequests, marketPromoRequests, allNews]);

  // ─── Quick search results ──
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const results: { id: string; type: string; label: string; tab: AdminTab }[] = [];
    // Search tabs
    tabGroups.forEach(group => {
      group.tabs.forEach(tab => {
        if (tab.label.toLowerCase().includes(q)) {
          results.push({ id: tab.id, type: 'tab', label: tab.label, tab: tab.id });
        }
      });
    });
    // Search users
    allUsers.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach(u => results.push({ id: u.id, type: 'user', label: `${u.name} (${u.email})`, tab: 'users' }));
    return results;
  }, [searchQuery, tabGroups, allUsers]);

  // ─── Loading ──
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`} dir="rtl">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
                <LayoutDashboard className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
          <div>
            <p className={`font-black text-lg ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('admin.loading')}</p>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>{t('admin.platformManagement')}</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render ──
  return (
    <div className={`min-h-screen flex overflow-x-hidden ${darkMode ? 'bg-gray-950' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`} dir={dir}>
      {/* ─── Mobile Overlay ─── */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* ─── Sidebar ─── */}
      <aside
        className={`${sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'} ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        } border-l flex flex-col transition-all duration-300 sticky top-0 h-screen overflow-hidden shrink-0 shadow-sm
        ${mobileSidebarOpen ? 'fixed z-50 right-0' : 'hidden lg:flex'}`}
      >
        {/* Logo Area */}
        <div className={`p-3 border-b flex items-center gap-2.5 ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
          <button
            onClick={() => navigate('/')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
              darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-orange-400' : 'bg-gray-50 text-gray-500 hover:bg-orange-50 hover:text-orange-500'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-lg shadow-orange-200/30">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h1 className={`text-sm font-black truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {t('admin.title')}
                </h1>
                <p className={`text-[9px] font-medium ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                  {t('admin.platformManagement')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats Bar */}
        {!sidebarCollapsed && detailedStats && (
          <div className={`px-3 py-2.5 border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
            <div className="grid grid-cols-2 gap-2">
              <div className={`${darkMode ? 'bg-green-900/20' : 'bg-green-50'} rounded-lg px-2.5 py-2`}>
                <p className={`text-[9px] font-medium ${darkMode ? 'text-green-500' : 'text-green-600'}`}>{t('admin.users')}</p>
                <p className={`text-sm font-black ${darkMode ? 'text-green-400' : 'text-green-700'}`}>{detailedStats.activeUsers || 0}</p>
              </div>
              <div className={`${darkMode ? 'bg-orange-900/20' : 'bg-orange-50'} rounded-lg px-2.5 py-2`}>
                <p className={`text-[9px] font-medium ${darkMode ? 'text-orange-500' : 'text-orange-600'}`}>{t('admin.revenue')}</p>
                <p className={`text-sm font-black ${darkMode ? 'text-orange-400' : 'text-orange-700'}`}>{detailedStats.totalRevenue || 0}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-4 custom-scrollbar">
          {tabGroups.map((group, gi) => (
            <div key={gi}>
              {!sidebarCollapsed && (
                <p className={`text-[9px] font-black uppercase tracking-wider px-2.5 mb-1.5 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setMobileSidebarOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 group relative ${
                      activeTab === tab.id
                        ? `bg-gradient-to-l from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20`
                        : darkMode
                          ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } ${sidebarCollapsed ? 'justify-center' : ''}`}
                    title={tab.label}
                  >
                    <span className={`shrink-0 transition-transform duration-200 ${activeTab !== tab.id ? 'group-hover:scale-110' : ''}`}>
                      {tab.icon}
                    </span>
                    {!sidebarCollapsed && (
                      <>
                        <span className="truncate flex-1 text-start">{tab.label}</span>
                        {tab.badge ? (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-black min-w-[18px] text-center ${
                              activeTab === tab.id
                                ? 'bg-white/20 text-white'
                                : tab.badgeColor === 'red'
                                  ? darkMode ? 'bg-red-900/40 text-red-400' : 'bg-red-50 text-red-600'
                                  : tab.badgeColor === 'amber'
                                    ? darkMode ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-50 text-amber-600'
                                    : darkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {tab.badge}
                          </span>
                        ) : null}
                      </>
                    )}
                    {sidebarCollapsed && tab.badge ? (
                      <span className={`absolute -top-0.5 -left-0.5 w-4 h-4 rounded-full text-[8px] font-black flex items-center justify-center ${
                        tab.badgeColor === 'red' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                      }`}>
                        {tab.badge > 99 ? '99+' : tab.badge}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse Button */}
        <div className={`p-2 border-t ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`w-full flex items-center justify-center gap-2 px-2 py-2.5 rounded-xl transition-colors ${
              darkMode ? 'text-gray-500 hover:bg-gray-800 hover:text-gray-300' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
            }`}
          >
            {sidebarCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {!sidebarCollapsed && <span className="text-[10px] font-bold">{t('admin.collapseSidebar')}</span>}
          </button>
        </div>

        {/* User Info */}
        <div className={`p-2.5 border-t ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2.5 px-2 py-2">
            {currentUser && (
              <div className="relative shrink-0">
                <img
                  src={currentUser.avatarBase64 || currentUser.avatar}
                  alt=""
                  className="w-9 h-9 rounded-xl border-2 border-orange-400 shadow-sm"
                />
                <div className="absolute -bottom-0.5 -left-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
              </div>
            )}
            {!sidebarCollapsed && currentUser && (
              <div className="min-w-0 flex-1">
                <p className={`text-[11px] font-black truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  {currentUser.name}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                    darkMode ? 'bg-green-900/40 text-green-400' : 'bg-green-50 text-green-600'
                  }`}>
                    {t('admin.admin')}
                  </span>
                  {currentUser.isTrusted && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                      darkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {t('admin.trustedLabel')}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
        {/* Header */}
        <header
          className={`${darkMode ? 'bg-gray-900/80 border-gray-800' : 'bg-white/80 border-gray-200'} border-b sticky top-0 z-40 backdrop-blur-xl px-3 md:px-6 py-3`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className={`lg:hidden w-10 h-10 rounded-xl flex items-center justify-center ${
                  darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'
                }`}
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h2 className={`text-lg font-black truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {tabGroups.flatMap(g => g.tabs).find(tab => tab.id === activeTab)?.label || t('admin.title')}
                </h2>
                <p className={`text-[10px] font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Search Button */}
              <button
                onClick={() => setSearchOpen(true)}
                className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                  darkMode ? 'border-gray-700 text-gray-400 hover:bg-gray-800' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{t('admin.search')}</span>
                <kbd className={`hidden md:inline text-[9px] px-1.5 py-0.5 rounded font-mono ${
                  darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'
                }`}>⌘K</kbd>
              </button>

              {/* Notifications Badge */}
              {pendingCount > 0 && (
                <button
                  className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute -top-0.5 -left-0.5 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                </button>
              )}

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  darkMode ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
                title={darkMode ? t('admin.lightMode') : t('admin.darkMode')}
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Go to Site */}
              <button
                onClick={() => navigate('/')}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-orange-400' : 'bg-gray-50 text-gray-500 hover:bg-orange-50 hover:text-orange-500'
                }`}
                title={t('admin.homePage')}
              >
                <ArrowUpRight className="w-4 h-4" />
              </button>

              {/* Refresh */}
              <button
                onClick={refreshData}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-orange-400' : 'bg-gray-50 text-gray-500 hover:bg-orange-50 hover:text-orange-500'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{t('admin.update')}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-2 sm:p-4 md:p-6 max-w-[1400px] mx-auto">
          <Suspense fallback={<TabLoader darkMode={darkMode} />}>
            {activeTab === 'overview' && (
              <OverviewTab
                stats={stats}
                detailedStats={detailedStats}
                chartData={chartData}
                posts={posts}
                realtimeStats={realtimeStats}
                darkMode={darkMode}
                loadRealtimeStats={loadRealtimeStats}
              />
            )}
            {activeTab === 'users' && (
              <UsersTab
                allUsers={allUsers}
                setAllUsers={setAllUsers}
                loadUsers={loadUsers}
                darkMode={darkMode}
              />
            )}
            {activeTab === 'posts' && (
              <PostsTab
                posts={posts}
                setPosts={setPosts}
                darkMode={darkMode}
              />
            )}
            {activeTab === 'support' && (
              <SupportTab
                posts={posts}
                setPosts={setPosts}
                darkMode={darkMode}
                navigate={navigate}
              />
            )}
            {activeTab === 'comments' && (
              <CommentsTab
                adminComments={adminComments}
                setAdminComments={setAdminComments}
                darkMode={darkMode}
              />
            )}
            {activeTab === 'charging' && (
              <ChargingTab
                chargingRequests={chargingRequests}
                approveCharging={approveCharging}
                rejectCharging={rejectCharging}
                darkMode={darkMode}
              />
            )}
            {activeTab === 'promotions' && (
              <PromotionsTab
                promotionRequests={promotionRequests}
                approvePromotion={approvePromotion}
                rejectPromotion={rejectPromotion}
                darkMode={darkMode}
                navigate={navigate}
              />
            )}
            {activeTab === 'market-promotions' && (
              <MarketPromotionsTab
                marketPromoRequests={marketPromoRequests}
                setMarketPromoRequests={setMarketPromoRequests}
                darkMode={darkMode}
              />
            )}
            {activeTab === 'news' && (
              <NewsTab
                allNews={allNews}
                loadNews={loadNews}
                refreshData={refreshData}
                addAdminAlert={addAdminAlert}
                darkMode={darkMode}
              />
            )}
            {activeTab === 'publish' && (
              <PublishTab darkMode={darkMode} refreshData={refreshData} />
            )}
            {activeTab === 'reports' && (
              <ReportsTab reports={reports} setReports={setReports} darkMode={darkMode} />
            )}
            {activeTab === 'categories' && (
              <CategoriesTab
                allCategories={allCategories}
                loadCategories={loadCategories}
                darkMode={darkMode}
              />
            )}
            {activeTab === 'transactions' && (
              <TransactionsTab
                transactions={transactions}
                txFilter={txFilter}
                setTxFilter={setTxFilter}
                txPage={txPage}
                setTxPage={setTxPage}
                txTotal={txTotal}
                darkMode={darkMode}
              />
            )}
            {activeTab === 'stories' && (
              <StoriesTab adminStories={adminStories} setAdminStories={setAdminStories} darkMode={darkMode} />
            )}
            {activeTab === 'messages' && (
              <MessagesTab chatMessages={chatMessages} setChatMessages={setChatMessages} darkMode={darkMode} />
            )}
            {activeTab === 'smartlinks' && (
              <SmartLinksTab smartLinksData={smartLinksData} darkMode={darkMode} />
            )}
            {activeTab === 'activity' && (
              <ActivityTab activityLog={activityLog} darkMode={darkMode} loadActivityLog={loadActivityLog} />
            )}
            {activeTab === 'broadcast' && (
              <BroadcastTab darkMode={darkMode} />
            )}
            {activeTab === 'database' && (
              <DatabaseTab dbInfo={dbInfo} loadDatabaseInfo={loadDatabaseInfo} darkMode={darkMode} />
            )}
            {activeTab === 'settings' && (
              <SettingsTab
                siteSettings={siteSettings}
                setSiteSettings={setSiteSettings}
                loadSettings={loadSettings}
                darkMode={darkMode}
              />
            )}
            {activeTab === 'friends-mgmt' && (
              <FriendsManagementTab darkMode={darkMode} />
            )}
            {activeTab === 'livestream' && (
              <LiveStreamTab darkMode={darkMode} />
            )}
            {activeTab === 'ai-analytics' && (
              <AIAnalyticsTab darkMode={darkMode} />
            )}
            {activeTab === 'admin-notifications' && (
              <AdminNotificationsTab
                darkMode={darkMode}
                pendingCharging={stats?.pendingCharging || 0}
                pendingPromotions={stats?.pendingPromotions || 0}
                pendingMarketPromotions={stats?.pendingMarketPromotions || 0}
                reportsCount={reports.length}
                allNews={allNews}
                activityLog={activityLog}
              />
            )}
          </Suspense>
        </div>
      </main>

      {/* ─── Search Modal ─── */}
      {searchOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-start justify-center pt-[15vh] p-4" onClick={() => setSearchOpen(false)}>
          <div
            className={`${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-2xl w-full max-w-lg shadow-2xl border overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}">
              <Search className={`w-5 h-5 shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('admin.searchPlaceholder')}
                className={`flex-1 bg-transparent outline-none text-sm font-medium ${darkMode ? 'text-white placeholder-gray-600' : 'text-gray-900 placeholder-gray-400'}`}
              />
              <kbd className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${darkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>ESC</kbd>
            </div>
            {searchResults.length > 0 && (
              <div className="max-h-64 overflow-y-auto py-2">
                {searchResults.map(result => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => { setActiveTab(result.tab); setSearchOpen(false); setSearchQuery(''); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-start transition-colors ${
                      darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      result.type === 'user'
                        ? darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-500'
                        : darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {result.type === 'user' ? <Users className="w-4 h-4" /> : <LayoutDashboard className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{result.label}</p>
                      <p className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>{result.type === 'user' ? t('admin.user') : t('admin.page')}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {searchQuery && searchResults.length === 0 && (
              <div className="py-8 text-center">
                <p className={`text-sm ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>{t('admin.noSearchResults')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
