import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import {
  User,
  Wallet,
  Shield,
  Bell,
  Lock,
  Moon,
  Sun,
  Trash2,
  HardDrive,
  ChevronLeft,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
  Smartphone,
  DollarSign,
  Tag,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';

interface NotificationSettings {
  pushNotifs: boolean;
  matchAlerts: boolean;
  paymentAlerts: boolean;
  priceDrops: boolean;
}

interface PrivacySettings {
  profilePublic: boolean;
  showPhone: boolean;
  showLocation: boolean;
}

type SettingsSection = 'account' | 'notifications' | 'privacy' | 'darkmode' | 'danger';

const ToggleSwitch: React.FC<{
  enabled: boolean;
  onToggle: () => void;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}> = ({ enabled, onToggle, label, description, icon }) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex items-center gap-3">
      {icon && <div className="text-gray-400">{icon}</div>}
      <div>
        <p className={`text-sm font-bold ${enabled ? '' : ''}`}>{label}</p>
        {description && <p className="text-[11px] text-gray-400 mt-0.5">{description}</p>}
      </div>
    </div>
    <button
      onClick={onToggle}
      className={`relative w-12 h-7 rounded-full transition-all duration-300 flex-shrink-0 ${
        enabled ? 'bg-orange-500' : 'bg-gray-300'
      }`}
    >
      <motion.div
        className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md"
        animate={{ left: enabled ? '1.375rem' : '0.125rem' }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  </div>
);

const SectionCard: React.FC<{
  darkMode: boolean;
  children: React.ReactNode;
}> = ({ darkMode, children }) => (
  <div className={`rounded-2xl border overflow-hidden ${
    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  }`}>
    {children}
  </div>
);

const SectionHeader: React.FC<{
  darkMode: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}> = ({ darkMode, icon, title, subtitle }) => (
  <div className={`px-5 py-4 border-b flex items-center gap-3 ${
    darkMode ? 'border-gray-700' : 'border-gray-100'
  }`}>
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
      darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-600'
    }`}>
      {icon}
    </div>
    <div>
      <h3 className={`font-black text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
      {subtitle && <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{subtitle}</p>}
    </div>
  </div>
);

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode, priceDropAlerts, togglePriceDropAlerts, smartAlertsEnabled, enableSmartAlerts, disableSmartAlerts } = useAppContext();
  const { currentUser, updateProfile, logout } = useAuth();
  const { t } = useTranslation();
  const { dir } = useLanguage();

  const [activeSection, setActiveSection] = useState<SettingsSection | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const storageKey = currentUser ? `nawaqes_settings_${currentUser.id}` : '';

  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    pushNotifs: smartAlertsEnabled,
    matchAlerts: true,
    paymentAlerts: true,
    priceDrops: priceDropAlerts,
  });

  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    profilePublic: true,
    showPhone: false,
    showLocation: true,
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    if (!currentUser) return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.notifications) setNotifSettings(parsed.notifications);
        if (parsed.privacy) setPrivacySettings(parsed.privacy);
      } else {
        // Initialize from user profile
        setPrivacySettings({
          profilePublic: true,
          showPhone: (currentUser as any).showPhone ?? false,
          showLocation: (currentUser as any).showLocation ?? true,
        });
      }
    } catch {
      // use defaults
    }
  }, [currentUser, storageKey]);

  // Persist settings to localStorage whenever they change
  useEffect(() => {
    if (!currentUser || !storageKey) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          notifications: notifSettings,
          privacy: privacySettings,
        })
      );
    } catch {
      // ignore storage errors
    }
  }, [notifSettings, privacySettings, currentUser, storageKey]);

  const handleNotifToggle = (key: keyof NotificationSettings) => {
    if (key === 'priceDrops') {
      togglePriceDropAlerts();
      setNotifSettings(prev => ({ ...prev, priceDrops: !prev.priceDrops }));
      toast.success(!notifSettings.priceDrops ? t('settings.priceDropAlertsEnabled') : t('settings.priceDropAlertsDisabled'));
      return;
    }
    if (key === 'pushNotifs') {
      // Toggle smart alerts - if currently enabled, disable; if disabled, request permission
      if (notifSettings.pushNotifs) {
        // Turning off - use the AppContext function to properly update state
        disableSmartAlerts();
        setNotifSettings(prev => ({ ...prev, pushNotifs: false }));
        toast.success(t('settings.settingsUpdated'));
      } else {
        // Turning on - request Firebase Push Notification permission FIRST
        import('../lib/firebase').then(async ({ requestNotificationPermission }) => {
          const token = await requestNotificationPermission();
          if (token) {
            // Firebase token obtained — also enable smart alerts
            enableSmartAlerts().then(success => {
              if (success) {
                setNotifSettings(prev => ({ ...prev, pushNotifs: true }));
                toast.success('✅ تم تفعيل الإشعارات الفورية بنجاح!');
              }
            });
          } else {
            toast.error('تعذّر الحصول على إذن الإشعارات. تأكد من السماح بالإشعارات في المتصفح.');
          }
        });
      }
      return;
    }
    setNotifSettings(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success(t('settings.settingsUpdated'));
  };

  const handlePrivacyToggle = (key: keyof PrivacySettings) => {
    const newValue = !privacySettings[key];
    setPrivacySettings(prev => ({ ...prev, [key]: newValue }));

    if (key === 'showPhone') {
      updateProfile({ showPhone: newValue } as any);
      toast.success(newValue ? t('settings.phoneShown') : t('settings.phoneHidden'));
    } else if (key === 'showLocation') {
      updateProfile({ showLocation: newValue } as any);
      toast.success(newValue ? t('settings.locationShown') : t('settings.locationHidden'));
    } else if (key === 'profilePublic') {
      // Persist profilePublic by updating both showPhone and showLocation
      updateProfile({ showPhone: newValue, showLocation: newValue } as any);
      toast.success(newValue ? t('settings.profilePublic') : t('settings.profilePrivate'));
    }
  };

  const handleClearCache = () => {
    // Keep user session and settings, clear other cached data
    if (currentUser) {
      const keysToKeep = [
        'nawaqes_session',
        `nawaqes_settings_${currentUser.id}`,
        `nawaqes_saved_${currentUser.id}`,
        `nawaqes_read_notifs_${currentUser.id}`,
        `nawaqes_friend_requests_${currentUser.id}`,
        `nawaqes_transactions_${currentUser.id}`,
        'nawaqes_users',
        'nawaqes_darkmode',
      ];
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('nawaqes_') && !keysToKeep.includes(key)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
    toast.success(t('settings.cacheCleared'));
  };

  const handleDeleteAccount = () => {
    if (!currentUser) return;
    // Remove user from stored users
    try {
      const usersStr = localStorage.getItem('nawaqes_users');
      if (usersStr) {
        const users = JSON.parse(usersStr);
        const filtered = users.filter((u: any) => u.id !== currentUser.id);
        localStorage.setItem('nawaqes_users', JSON.stringify(filtered));
      }
      // Remove user-specific data
      [
        `nawaqes_settings_${currentUser.id}`,
        `nawaqes_saved_${currentUser.id}`,
        `nawaqes_read_notifs_${currentUser.id}`,
        `nawaqes_friend_requests_${currentUser.id}`,
        `nawaqes_transactions_${currentUser.id}`,
      ].forEach(key => localStorage.removeItem(key));
      localStorage.removeItem('nawaqes_session');
    } catch {
      // ignore
    }
    logout();
    toast.success(t('settings.accountDeleted'));
    navigate('/login');
  };

  const sections: { id: SettingsSection; icon: React.ReactNode; title: string; subtitle: string }[] = [
    { id: 'account', icon: <User className="w-5 h-5" />, title: t('settings.accountSettings'), subtitle: t('settings.accountSettingsDesc') },
    { id: 'notifications', icon: <Bell className="w-5 h-5" />, title: t('settings.notifications'), subtitle: t('settings.notificationsDesc') },
    { id: 'privacy', icon: <Lock className="w-5 h-5" />, title: t('settings.privacy'), subtitle: t('settings.privacyDesc') },
    { id: 'darkmode', icon: <Moon className="w-5 h-5" />, title: t('settings.darkMode'), subtitle: t('settings.darkModeDesc') },
    { id: 'danger', icon: <AlertTriangle className="w-5 h-5" />, title: t('settings.dangerZone'), subtitle: t('settings.dangerZoneDesc') },
  ];

  return (
    <div className="max-w-2xl mx-auto overflow-x-hidden" dir={dir}>
      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-2xl font-black mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {t('settings.title')}
        </h1>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {t('settings.titleDesc')}
        </p>
      </div>

      {/* Section Navigation */}
      <div className="space-y-2 mb-6">
        {sections.map(section => (
          <motion.button
            key={section.id}
            onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
              activeSection === section.id
                ? darkMode
                  ? 'bg-orange-900/20 border-orange-700'
                  : 'bg-orange-50 border-orange-200'
                : darkMode
                  ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                activeSection === section.id
                  ? darkMode ? 'bg-orange-900/40 text-orange-400' : 'bg-orange-100 text-orange-600'
                  : darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-500'
              }`}>
                {section.icon}
              </div>
              <div className="text-right">
                <p className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{section.title}</p>
                <p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{section.subtitle}</p>
              </div>
            </div>
            <ChevronLeft className={`w-5 h-5 transition-transform ${
              activeSection === section.id ? '-rotate-90' : ''
            } ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          </motion.button>
        ))}
      </div>

      {/* Expanded Section Content */}
      <AnimatePresence mode="wait">
        {activeSection === 'account' && (
          <motion.div
            key="account"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <SectionCard darkMode={darkMode}>
              <SectionHeader darkMode={darkMode} icon={<User className="w-5 h-5" />} title={t('settings.accountSettings')} subtitle={t('settings.accountSettingsDesc')} />
              <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                {/* Profile */}
                <button
                  onClick={() => navigate('/profile')}
                  className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${
                    darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'
                    }`}>
                      <User className="w-4 h-4" />
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('settings.profile')}</p>
                      <p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {currentUser?.name} · {currentUser?.isVerified ? t('settings.verified') : t('settings.unverified')} · {currentUser?.email_verified ? '✉️ ' + t('emailVerification.badge') : '⚠️ ' + t('emailVerification.notVerified')}
                      </p>
                    </div>
                  </div>
                  <ChevronLeft className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                </button>
                {/* Wallet */}
                <button
                  onClick={() => navigate('/wallet')}
                  className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${
                    darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'
                    }`}>
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('settings.walletSection')}</p>
                      <p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {t('settings.balance', { balance: (currentUser?.walletBalance || 0).toLocaleString() })}
                      </p>
                    </div>
                  </div>
                  <ChevronLeft className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                </button>
                {/* Security */}
                <button
                  onClick={() => toast.info(t('settings.securityComingSoon'))}
                  className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${
                    darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600'
                    }`}>
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('settings.security')}</p>
                      <p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {t('settings.securityDesc')}
                      </p>
                    </div>
                  </div>
                  <ChevronLeft className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                </button>
                {/* Email Verification */}
                {!currentUser?.email_verified && (
                  <button
                    onClick={() => navigate('/verify-email')}
                    className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${darkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('emailVerification.verifyNow')}</p>
                        <p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('emailVerification.verifyDesc')}</p>
                      </div>
                    </div>
                    <ChevronLeft className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  </button>
                )}
              </div>
            </SectionCard>
          </motion.div>
        )}

        {activeSection === 'notifications' && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <SectionCard darkMode={darkMode}>
              <SectionHeader darkMode={darkMode} icon={<Bell className="w-5 h-5" />} title={t('settings.notifications')} subtitle={t('settings.controlAlerts')} />
              <div className="px-5 py-2">
                <ToggleSwitch
                  enabled={notifSettings.pushNotifs}
                  onToggle={() => handleNotifToggle('pushNotifs')}
                  label={t('settings.pushNotifications')}
                  description={t('settings.pushNotificationsDesc')}
                  icon={<Smartphone className="w-4 h-4" />}
                />
                <ToggleSwitch
                  enabled={notifSettings.matchAlerts}
                  onToggle={() => handleNotifToggle('matchAlerts')}
                  label={t('settings.matchAlerts')}
                  description={t('settings.matchAlertsDesc')}
                  icon={<Eye className="w-4 h-4" />}
                />
                <ToggleSwitch
                  enabled={notifSettings.paymentAlerts}
                  onToggle={() => handleNotifToggle('paymentAlerts')}
                  label={t('settings.paymentAlerts')}
                  description={t('settings.paymentAlertsDesc')}
                  icon={<DollarSign className="w-4 h-4" />}
                />
                <ToggleSwitch
                  enabled={notifSettings.priceDrops}
                  onToggle={() => handleNotifToggle('priceDrops')}
                  label={t('settings.priceDropAlerts')}
                  description={t('settings.priceDropAlertsDesc')}
                  icon={<Tag className="w-4 h-4" />}
                />
              </div>
            </SectionCard>
          </motion.div>
        )}

        {activeSection === 'privacy' && (
          <motion.div
            key="privacy"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <SectionCard darkMode={darkMode}>
              <SectionHeader darkMode={darkMode} icon={<Lock className="w-5 h-5" />} title={t('settings.privacy')} subtitle={t('settings.controlDataVisibility')} />
              <div className="px-5 py-2">
                <ToggleSwitch
                  enabled={privacySettings.profilePublic}
                  onToggle={() => handlePrivacyToggle('profilePublic')}
                  label={t('settings.publicProfile')}
                  description={t('settings.publicProfileDesc')}
                  icon={<Eye className="w-4 h-4" />}
                />
                <ToggleSwitch
                  enabled={privacySettings.showPhone}
                  onToggle={() => handlePrivacyToggle('showPhone')}
                  label={t('settings.showPhone')}
                  description={t('settings.showPhoneDesc')}
                  icon={<Smartphone className="w-4 h-4" />}
                />
                <ToggleSwitch
                  enabled={privacySettings.showLocation}
                  onToggle={() => handlePrivacyToggle('showLocation')}
                  label={t('settings.showLocation')}
                  description={t('settings.showLocationDesc')}
                  icon={<Lock className="w-4 h-4" />}
                />
              </div>
            </SectionCard>
          </motion.div>
        )}

        {activeSection === 'darkmode' && (
          <motion.div
            key="darkmode"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <SectionCard darkMode={darkMode}>
              <SectionHeader darkMode={darkMode} icon={<Moon className="w-5 h-5" />} title={t('settings.darkMode')} subtitle={t('settings.customizeAppearance')} />
              <div className="px-5 py-4">
                <ToggleSwitch
                  enabled={darkMode}
                  onToggle={toggleDarkMode}
                  label={t('settings.darkModeToggle')}
                  description={t('settings.darkModeToggleDesc')}
                  icon={darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                />

                {/* Preview Cards */}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {/* Light mode preview */}
                  <div
                    className={`rounded-xl border-2 p-3 transition-all cursor-pointer ${
                      !darkMode
                        ? 'border-orange-500 shadow-lg shadow-orange-100'
                        : 'border-gray-300'
                    }`}
                    onClick={() => { if (darkMode) toggleDarkMode(); }}
                  >
                    <div className="bg-white rounded-lg p-3 border border-gray-100 mb-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-gray-200 rounded-full" />
                        <div className="h-2.5 bg-gray-200 rounded w-16" />
                      </div>
                      <div className="h-2 bg-gray-100 rounded w-full mb-1.5" />
                      <div className="h-2 bg-gray-100 rounded w-3/4" />
                    </div>
                    <div className="flex items-center justify-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-[11px] font-bold text-gray-600">{t('settings.light')}</span>
                    </div>
                  </div>

                  {/* Dark mode preview */}
                  <div
                    className={`rounded-xl border-2 p-3 transition-all cursor-pointer ${
                      darkMode
                        ? 'border-orange-500 shadow-lg shadow-orange-900/30'
                        : 'border-gray-300'
                    }`}
                    onClick={() => { if (!darkMode) toggleDarkMode(); }}
                  >
                    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 mb-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-gray-600 rounded-full" />
                        <div className="h-2.5 bg-gray-600 rounded w-16" />
                      </div>
                      <div className="h-2 bg-gray-700 rounded w-full mb-1.5" />
                      <div className="h-2 bg-gray-700 rounded w-3/4" />
                    </div>
                    <div className="flex items-center justify-center gap-1.5">
                      <Moon className="w-3.5 h-3.5 text-blue-400" />
                      <span className={`text-[11px] font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{t('settings.dark')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>
          </motion.div>
        )}

        {activeSection === 'danger' && (
          <motion.div
            key="danger"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <SectionCard darkMode={darkMode}>
              <SectionHeader darkMode={darkMode} icon={<AlertTriangle className="w-5 h-5" />} title={t('settings.dangerZone')} subtitle={t('settings.irreversibleActions')} />
              <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                {/* Clear Cache */}
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-50 text-yellow-600'
                    }`}>
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('settings.clearCache')}</p>
                      <p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {t('settings.clearCacheDesc')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClearCache}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                      darkMode
                        ? 'bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50'
                        : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                    }`}
                  >
                    {t('common.clear')}
                  </button>
                </div>

                {/* Delete Account */}
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'
                      }`}>
                        <Trash2 className="w-4 h-4" />
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{t('settings.deleteAccount')}</p>
                        <p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {t('settings.deleteAccountDesc')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-all active:scale-95"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                  <AnimatePresence>
                    {showDeleteConfirm && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`rounded-xl p-4 border ${
                          darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start gap-2 mb-3">
                          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <p className={`text-xs leading-relaxed ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                            {t('settings.deleteConfirm')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleDeleteAccount}
                            className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-red-700 active:scale-95 transition-all"
                          >
                            {t('settings.yesDeleteAccount')}
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                              darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </SectionCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
