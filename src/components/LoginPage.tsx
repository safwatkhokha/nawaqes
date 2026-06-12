import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
  TrendingUp,
  Sparkles,
  KeyRound,
  Phone,
  Calendar,
  Check,
  X,
  AtSign,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  LogIn,
  Globe,
  Star,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { interestCategories, interestGroups, getInterestsByGroup, type InterestGroup } from '../config/interests';

type AuthTab = 'login' | 'register-step1' | 'register-step2' | 'interests' | 'forgot-password';
type LoginMethod = 'email' | 'phone';

// ─── Password Strength Calculator ──────────────────────────────────
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return { score: 1, label: 'weak', color: 'bg-red-500' };
  if (score <= 3) return { score: 2, label: 'fair', color: 'bg-amber-500' };
  if (score <= 4) return { score: 3, label: 'good', color: 'bg-blue-500' };
  return { score: 4, label: 'strong', color: 'bg-green-500' };
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, register, currentUser, isLoggedIn } = useAuth();
  const { t } = useTranslation();
  const { dir } = useLanguage();

  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Register step 1 - Account info
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');

  // Register step 2 - Personal info
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerDateOfBirth, setRegisterDateOfBirth] = useState('');
  const [registerGender, setRegisterGender] = useState<'male' | 'female'>('male');

  // Interests step
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [activeGroup, setActiveGroup] = useState<InterestGroup | 'all'>('all');

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<'email' | 'code'>('email');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Account stats (social proof)
  const [accountStats, setAccountStats] = useState<{ totalUsers: number; accountsCreatedToday: number } | null>(null);

  // Popular interests for quick selection
  const popularInterestIds = ['phones', 'cars', 'electronics', 'fashion', 'jobs', 'realEstate'];

  // Fetch account stats on mount
  useEffect(() => {
    api.getAuthStats().then(setAccountStats).catch(() => {});
  }, []);

  // Load saved login method
  useEffect(() => {
    const saved = localStorage.getItem('nawaqes_login_method');
    if (saved === 'phone' || saved === 'email') setLoginMethod(saved);
    const savedId = localStorage.getItem('nawaqes_login_id');
    if (savedId) setLoginIdentifier(savedId);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword.trim()) return;
    setIsLoggingIn(true);
    try {
      const success = await login(loginIdentifier, loginPassword);
      if (success && rememberMe) {
        localStorage.setItem('nawaqes_login_method', loginMethod);
        localStorage.setItem('nawaqes_login_id', loginIdentifier);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Navigate after login once currentUser is populated
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      if (currentUser.isAdmin) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  }, [isLoggedIn, currentUser, navigate]);

  const handleRegisterStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName.trim()) {
      toast.error(t('auth.fullName') + ' *');
      return;
    }
    if (!registerEmail.trim()) {
      toast.error(t('auth.email') + ' *');
      return;
    }
    if (!registerPassword || registerPassword.length < 8) {
      toast.error(t('auth.passwordRequirements'));
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      toast.error(t('auth.passwordsDoNotMatch'));
      return;
    }
    setActiveTab('register-step2');
  };

  const handleRegisterStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerPhone.trim() || registerPhone.trim().length < 11) {
      toast.error(t('auth.phoneRequired'));
      return;
    }
    if (!registerDateOfBirth) {
      toast.error(t('auth.dateOfBirthRequired'));
      return;
    }
    setActiveTab('interests');
  };

  const handleInterestToggle = (interestId: string) => {
    setSelectedInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(i => i !== interestId)
        : [...prev, interestId]
    );
  };

  const handleFinishRegistration = async () => {
    if (selectedInterests.length === 0) {
      toast.error(t('auth.minInterests'));
      return;
    }
    setIsRegistering(true);
    try {
      const success = await register(registerName, registerEmail, registerPassword, selectedInterests, registerPhone, registerGender, registerDateOfBirth);
      if (success) {
        navigate('/');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setIsSendingCode(true);
    try {
      const data = await api.forgotPassword(forgotEmail);
      toast.success(data.message);
      if (data.resetCode) {
        toast.info(t('auth.resetCodeInfo', { code: data.resetCode }), { duration: 15000 });
      }
      setResetStep('code');
    } catch (err: any) {
      toast.error(err.message || t('auth.forgotPasswordFailed'));
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode.trim() || !newPassword.trim()) return;
    setIsResetting(true);
    try {
      const data = await api.resetPassword(resetCode, newPassword);
      toast.success(data.message);
      api.setToken(data.token);
      setActiveTab('login');
      setLoginIdentifier(forgotEmail);
      toast.success(t('auth.passwordResetSuccess'));
    } catch (err: any) {
      toast.error(err.message || t('auth.resetFailed'));
    } finally {
      setIsResetting(false);
    }
  };

  const passwordStrength = getPasswordStrength(registerPassword);

  // Step indicators for registration
  const registerSteps = [
    { id: 'register-step1', label: t('auth.stepAccount'), icon: User },
    { id: 'register-step2', label: t('auth.stepPersonal'), icon: Phone },
    { id: 'interests', label: t('auth.stepInterests'), icon: Sparkles },
  ] as const;

  const getCurrentStepIndex = () => {
    if (activeTab === 'register-step1') return 0;
    if (activeTab === 'register-step2') return 1;
    if (activeTab === 'interests') return 2;
    return 0;
  };

  return (
    <div className="min-h-screen flex" dir={dir}>
      {/* Mobile-safe overlay to prevent bottom nav overlap */}
      <style>{`
        @media (max-width: 1023px) {
          .login-scroll-container {
            padding-bottom: 2rem;
          }
        }
      `}</style>
      {/* ─── Left Side - Branding (Desktop only) ─── */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-orange-600 via-orange-700 to-red-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ij48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCA0LTRzNCAyIDQgNC0yIDQtNCA0LTQtMi00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-black/10 rounded-full -ml-40 -mb-40 blur-3xl" />
        {/* Animated floating elements */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/5 rounded-full animate-pulse" />
        <div className="absolute bottom-40 right-16 w-24 h-24 bg-white/5 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative z-10 flex flex-col justify-center p-12 text-white w-full">
          <div className="mb-10">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center text-4xl font-black backdrop-blur-md mb-6 shadow-2xl"
            >
              ن
            </motion.div>
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-5xl font-black mb-4 leading-tight"
            >
              {t('auth.platformName')}
            </motion.h1>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-orange-100 text-lg leading-relaxed max-w-md"
            >
              {t('auth.platformDesc')}
            </motion.p>
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            {[
              { icon: <ShieldCheck className="w-5 h-5" />, title: t('auth.sellerVerification'), desc: t('auth.sellerVerificationDesc') },
              { icon: <Zap className="w-5 h-5" />, title: t('auth.smartReach'), desc: t('auth.smartReachDesc') },
              { icon: <Users className="w-5 h-5" />, title: t('auth.safeCommunity'), desc: t('auth.safeCommunityDesc') },
              { icon: <TrendingUp className="w-5 h-5" />, title: t('auth.marketReports'), desc: t('auth.marketReportsDesc') },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md flex-shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-bold text-sm">{feature.title}</h3>
                  <p className="text-orange-200 text-xs">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Social proof counter */}
          {accountStats && accountStats.totalUsers > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="mt-8 p-4 bg-white/10 rounded-2xl backdrop-blur-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2 rtl:space-x-reverse">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full bg-white/20 border-2 border-orange-600 flex items-center justify-center text-xs font-bold">
                      {['أ', 'م', 'س', 'ع'][i - 1]}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-bold">{t('auth.joinCommunity')}</p>
                  <p className="text-orange-200 text-xs">{t('auth.accountsCreated', { count: accountStats.totalUsers })}</p>
                </div>
              </div>
            </motion.div>
          )}

          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-orange-200 text-xs">{t('auth.copyright')}</p>
          </div>
        </div>
      </div>

      {/* ─── Right Side - Auth Form ─── */}
      <div className="flex-1 flex flex-col items-center justify-start lg:justify-center p-4 sm:p-6 bg-gradient-to-b from-[#f8f9fa] to-white overflow-y-auto login-scroll-container">
        <div className="w-full max-w-[420px] my-4 lg:my-0">
          {/* Mobile Logo - compact on mobile */}
          <div className="lg:hidden text-center mb-4 sm:mb-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-black text-white mx-auto mb-2 sm:mb-3 shadow-lg shadow-orange-200"
            >
              ن
            </motion.div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">{t('app.name')}</h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-0.5 sm:mt-1">{t('auth.smartAdsPlatform')}</p>

            {/* Social proof mobile */}
            {accountStats && accountStats.totalUsers > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-2 sm:mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-full"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-orange-700">
                  {t('auth.accountsCreated', { count: accountStats.totalUsers })}
                </span>
              </motion.div>
            )}
          </div>

          {/* ─── Main Tabs (Login / Register) ─── */}
          {activeTab !== 'forgot-password' && (
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-5">
              {[
                { id: 'login' as AuthTab, label: t('auth.login'), icon: LogIn },
                { id: 'register-step1' as AuthTab, label: t('auth.register'), icon: UserPlus },
              ].map(tab => {
                const isRegister = ['register-step1', 'register-step2', 'interests'].includes(activeTab);
                const isActive = tab.id === 'login' ? activeTab === 'login' : isRegister;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${
                      isActive
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* ─── Registration Step Indicator ─── */}
          {['register-step1', 'register-step2', 'interests'].includes(activeTab) && (
            <div className="flex items-center gap-1 sm:gap-2 mb-3 sm:mb-5">
              {registerSteps.map((step, i) => {
                const currentIdx = getCurrentStepIndex();
                const isCompleted = i < currentIdx;
                const isCurrent = i === currentIdx;
                const StepIcon = step.icon;
                return (
                  <React.Fragment key={step.id}>
                    {i > 0 && (
                      <div className={`flex-1 h-0.5 rounded-full transition-colors ${
                        i <= currentIdx ? 'bg-orange-500' : 'bg-gray-200'
                      }`} />
                    )}
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all ${
                        isCompleted ? 'bg-green-500 text-white' :
                        isCurrent ? 'bg-orange-500 text-white' :
                        'bg-gray-200 text-gray-400'
                      }`}>
                        {isCompleted ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : <StepIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                      </div>
                      <span className={`text-[9px] sm:text-[10px] font-bold whitespace-nowrap hidden sm:inline ${
                        isCurrent ? 'text-orange-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* ═══════════ FORGOT PASSWORD ═══════════ */}
            {activeTab === 'forgot-password' ? (
              <motion.div
                key="forgot-password"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <button
                  onClick={() => { setActiveTab('login'); setResetStep('email'); }}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-bold mb-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('common.back')}
                </button>

                <div className="text-center mb-4">
                  <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <KeyRound className="w-7 h-7 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900">{t('auth.resetPassword')}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {resetStep === 'email' ? t('auth.enterEmailForReset') : t('auth.enterResetCode')}
                  </p>
                </div>

                {resetStep === 'email' ? (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1.5">{t('auth.email')}</label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={forgotEmail}
                          onChange={e => setForgotEmail(e.target.value)}
                          placeholder="example@email.com"
                          className="w-full pr-10 pl-4 py-3.5 rounded-xl border border-gray-200 bg-white text-sm font-medium outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSendingCode}
                      className="w-full bg-orange-600 text-white py-4 rounded-xl font-black text-base hover:bg-orange-700 active:scale-[0.98] transition-all shadow-lg shadow-orange-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSendingCode && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      {isSendingCode ? t('common.loading') : t('auth.sendResetCode')}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1.5">{t('auth.resetCode')}</label>
                      <input
                        type="text"
                        value={resetCode}
                        onChange={e => setResetCode(e.target.value)}
                        placeholder="000000"
                        maxLength={6}
                        className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-center tracking-[0.5em] outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1.5">{t('auth.newPassword')}</label>
                      <div className="relative">
                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pr-10 pl-12 py-3.5 rounded-xl border border-gray-200 bg-white text-sm font-medium outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isResetting}
                      className="w-full bg-orange-600 text-white py-4 rounded-xl font-black text-base hover:bg-orange-700 active:scale-[0.98] transition-all shadow-lg shadow-orange-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isResetting && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      {isResetting ? t('common.loading') : t('auth.confirmResetPassword')}
                    </button>
                  </form>
                )}
              </motion.div>

            // ═══════════ LOGIN FORM ═══════════
            ) : activeTab === 'login' ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                {/* Header */}
                <div className="text-center mb-2">
                  <h2 className="text-2xl font-black text-gray-900">{t('auth.welcomeToNawaqes')}</h2>
                  <p className="text-sm text-gray-500 mt-1">{t('auth.loginSubtitle')}</p>
                </div>

                {/* Login Method Toggle */}
                <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setLoginMethod('email')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                      loginMethod === 'email'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    {t('auth.loginWithEmail')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMethod('phone')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                      loginMethod === 'phone'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    {t('auth.loginWithPhone')}
                  </button>
                </div>

                {/* Identifier Field */}
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1.5">
                    {loginMethod === 'email' ? t('auth.email') : t('auth.phone')}
                  </label>
                  <div className="relative">
                    {loginMethod === 'email' ? (
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    ) : (
                      <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    )}
                    <input
                      type={loginMethod === 'email' ? 'email' : 'tel'}
                      value={loginIdentifier}
                      onChange={e => setLoginIdentifier(e.target.value)}
                      placeholder={loginMethod === 'email' ? 'example@email.com' : '01xxxxxxxxx'}
                      className="w-full pr-10 pl-4 py-3.5 rounded-xl border border-gray-200 bg-white text-sm font-medium outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1.5">{t('auth.password')}</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pr-10 pl-12 py-3.5 rounded-xl border border-gray-200 bg-white text-sm font-medium outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me + Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-400 accent-orange-600"
                    />
                    <span className="text-xs font-bold text-gray-600">{t('auth.rememberMe')}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveTab('forgot-password')}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700"
                  >
                    {t('auth.forgotPasswordQuestion')}
                  </button>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-gradient-to-l from-orange-600 to-orange-500 text-white py-4 rounded-xl font-black text-base hover:from-orange-700 hover:to-orange-600 active:scale-[0.98] transition-all shadow-lg shadow-orange-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoggingIn && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {isLoggingIn ? t('common.loading') : t('auth.login')}
                </button>

                {/* Register link */}
                <div className="text-center pt-2">
                  <p className="text-xs text-gray-500">
                    {t('auth.noAccountYet')}{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('register-step1')}
                      className="text-orange-600 hover:text-orange-700 font-black"
                    >
                      {t('auth.createNewAccount')}
                    </button>
                  </p>
                </div>
              </motion.form>

            // ═══════════ REGISTER STEP 1 - Account Info ═══════════
            ) : activeTab === 'register-step1' ? (
              <motion.form
                key="register-step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleRegisterStep1}
                className="space-y-4"
              >
                <div className="text-center mb-2">
                  <h2 className="text-xl font-black text-gray-900">{t('auth.createNewAccount')}</h2>
                  <p className="text-sm text-gray-500 mt-1">{t('auth.stepAccount')}</p>
                </div>

                {/* Name */}
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1.5">{t('auth.fullName')} <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={registerName}
                      onChange={e => setRegisterName(e.target.value)}
                      placeholder={t('auth.namePlaceholder')}
                      className="w-full pr-10 pl-4 py-3.5 rounded-xl border border-gray-200 bg-white text-sm font-medium outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1.5">{t('auth.email')} <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <AtSign className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={registerEmail}
                      onChange={e => setRegisterEmail(e.target.value)}
                      placeholder="example@email.com"
                      className="w-full pr-10 pl-4 py-3.5 rounded-xl border border-gray-200 bg-white text-sm font-medium outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1.5">{t('auth.password')} <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={registerPassword}
                      onChange={e => setRegisterPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pr-10 pl-12 py-3.5 rounded-xl border border-gray-200 bg-white text-sm font-medium outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {/* Password Strength Indicator */}
                  {registerPassword && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4].map(level => (
                          <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full transition-all ${
                              level <= passwordStrength.score
                                ? passwordStrength.color
                                : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-[10px] font-bold ${
                        passwordStrength.label === 'weak' ? 'text-red-500' :
                        passwordStrength.label === 'fair' ? 'text-amber-500' :
                        passwordStrength.label === 'good' ? 'text-blue-500' :
                        passwordStrength.label === 'strong' ? 'text-green-500' : 'text-gray-400'
                      }`}>
                        {passwordStrength.label && t(`auth.passwordStrength${passwordStrength.label.charAt(0).toUpperCase() + passwordStrength.label.slice(1)}`)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1.5">{t('auth.confirmPassword')} <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={registerConfirmPassword}
                      onChange={e => setRegisterConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full pr-10 pl-12 py-3.5 rounded-xl border bg-white text-sm font-medium outline-none focus:ring-2 transition-all ${
                        registerConfirmPassword && registerConfirmPassword !== registerPassword
                          ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                          : 'border-gray-200 focus:border-orange-400 focus:ring-orange-100'
                      }`}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {registerConfirmPassword && registerConfirmPassword !== registerPassword && (
                    <p className="text-[10px] font-bold text-red-500 mt-1">{t('auth.passwordsDoNotMatch')}</p>
                  )}
                </div>

                {/* Next Button */}
                <button
                  type="submit"
                  className="w-full bg-gradient-to-l from-orange-600 to-orange-500 text-white py-4 rounded-xl font-black text-base hover:from-orange-700 hover:to-orange-600 active:scale-[0.98] transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2"
                >
                  {t('common.next')}
                  <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
                </button>

                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    {t('auth.alreadyHaveAccount')}{' '}
                    <button type="button" onClick={() => setActiveTab('login')} className="text-orange-600 hover:text-orange-700 font-black">
                      {t('auth.signInInstead')}
                    </button>
                  </p>
                </div>
              </motion.form>

            // ═══════════ REGISTER STEP 2 - Personal Info ═══════════
            ) : activeTab === 'register-step2' ? (
              <motion.form
                key="register-step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleRegisterStep2}
                className="space-y-4"
              >
                {/* Back button */}
                <button
                  type="button"
                  onClick={() => setActiveTab('register-step1')}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-bold"
                >
                  <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                  {t('common.back')}
                </button>

                <div className="text-center mb-2">
                  <h2 className="text-xl font-black text-gray-900">{t('auth.stepPersonal')}</h2>
                  <p className="text-sm text-gray-500 mt-1">{t('auth.registerSubtitle')}</p>
                </div>

                {/* Phone */}
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1.5">{t('auth.phone')} <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={registerPhone}
                      onChange={e => setRegisterPhone(e.target.value)}
                      placeholder="01xxxxxxxxx"
                      className="w-full pr-10 pl-4 py-3.5 rounded-xl border border-gray-200 bg-white text-sm font-medium outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">{t('auth.invalidPhoneFormat')}</p>
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1.5">{t('auth.dateOfBirth')} <span className="text-red-500">*</span></label>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">{t('auth.birthYear')}</label>
                      <div className="relative">
                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select
                          value={registerDateOfBirth ? registerDateOfBirth.split('-')[0] : ''}
                          onChange={e => {
                            const year = e.target.value;
                            const month = registerDateOfBirth ? registerDateOfBirth.split('-')[1] : '01';
                            const day = registerDateOfBirth ? registerDateOfBirth.split('-')[2] : '01';
                            setRegisterDateOfBirth(`${year}-${month}-${day}`);
                          }}
                          className="w-full pr-10 pl-4 py-3.5 rounded-xl border border-gray-200 bg-white text-sm font-medium outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all appearance-none cursor-pointer"
                          required
                        >
                          <option value="">{t('auth.selectBirthYear')}</option>
                          {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - 13 - i).map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-gray-400 block mb-1">{t('auth.month')}</label>
                        <select
                          value={registerDateOfBirth ? registerDateOfBirth.split('-')[1] : ''}
                          onChange={e => {
                            const month = e.target.value;
                            const year = registerDateOfBirth ? registerDateOfBirth.split('-')[0] : new Date().getFullYear() - 13;
                            const day = registerDateOfBirth ? registerDateOfBirth.split('-')[2] : '01';
                            setRegisterDateOfBirth(`${year}-${month}-${day}`);
                          }}
                          className="w-full px-3 py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all appearance-none cursor-pointer"
                        >
                          <option value="01">{t('months.january')}</option>
                          <option value="02">{t('months.february')}</option>
                          <option value="03">{t('months.march')}</option>
                          <option value="04">{t('months.april')}</option>
                          <option value="05">{t('months.may')}</option>
                          <option value="06">{t('months.june')}</option>
                          <option value="07">{t('months.july')}</option>
                          <option value="08">{t('months.august')}</option>
                          <option value="09">{t('months.september')}</option>
                          <option value="10">{t('months.october')}</option>
                          <option value="11">{t('months.november')}</option>
                          <option value="12">{t('months.december')}</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-gray-400 block mb-1">{t('auth.day')}</label>
                        <select
                          value={registerDateOfBirth ? registerDateOfBirth.split('-')[2] : ''}
                          onChange={e => {
                            const day = e.target.value;
                            const year = registerDateOfBirth ? registerDateOfBirth.split('-')[0] : new Date().getFullYear() - 13;
                            const month = registerDateOfBirth ? registerDateOfBirth.split('-')[1] : '01';
                            setRegisterDateOfBirth(`${year}-${month}-${day}`);
                          }}
                          className="w-full px-3 py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all appearance-none cursor-pointer"
                        >
                          {Array.from({ length: 31 }, (_, i) => {
                            const d = String(i + 1).padStart(2, '0');
                            return <option key={d} value={d}>{i + 1}</option>;
                          })}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1.5">{t('auth.gender')}</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setRegisterGender('male')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border text-sm font-bold transition-all ${
                        registerGender === 'male'
                          ? 'border-orange-400 bg-orange-50 text-orange-600 ring-2 ring-orange-100'
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="8" r="4" /><path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" /></svg>
                      {t('auth.male')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegisterGender('female')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border text-sm font-bold transition-all ${
                        registerGender === 'female'
                          ? 'border-orange-400 bg-orange-50 text-orange-600 ring-2 ring-orange-100'
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="8" r="4" /><path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" /></svg>
                      {t('auth.female')}
                    </button>
                  </div>
                </div>

                {/* Next Button */}
                <button
                  type="submit"
                  className="w-full bg-gradient-to-l from-orange-600 to-orange-500 text-white py-4 rounded-xl font-black text-base hover:from-orange-700 hover:to-orange-600 active:scale-[0.98] transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2"
                >
                  {t('common.next')}
                  <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
                </button>
              </motion.form>

            // ═══════════ INTERESTS SELECTION ═══════════
            ) : (
              <motion.div
                key="interests"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-2 sm:space-y-3"
              >
                {/* Back button */}
                <button
                  type="button"
                  onClick={() => setActiveTab('register-step2')}
                  className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 hover:text-gray-700 font-bold"
                >
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 rtl:rotate-180" />
                  {t('common.back')}
                </button>

                {/* Start Experience Banner - compact on mobile */}
                <div className="bg-gradient-to-l from-orange-50 to-amber-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-orange-100">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-orange-200 flex-shrink-0">
                      <Star className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-gray-900">{t('auth.startYourExperience')}</h3>
                      <p className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5">{t('auth.startYourExperienceDesc')}</p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 sm:mt-3">
                    <div className="w-full h-1.5 sm:h-2 bg-white/60 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((selectedInterests.length / 5) * 100, 100)}%` }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                          selectedInterests.length === 0 ? 'bg-gray-300' :
                          selectedInterests.length < 3 ? 'bg-amber-400' :
                          selectedInterests.length < 5 ? 'bg-orange-500' :
                          'bg-green-500'
                        }`}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-0.5 sm:mt-1">
                      <span className="text-[9px] sm:text-[10px] font-bold text-gray-400">
                        {selectedInterests.length === 0 ? t('auth.minInterests') : t('auth.interestsSelected', { count: selectedInterests.length })}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-bold text-orange-600">
                        {Math.min(Math.round((selectedInterests.length / 5) * 100), 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedInterests(interestCategories.map(i => i.id))}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {t('auth.selectAll')}
                  </button>
                  <button
                    onClick={() => setSelectedInterests([])}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all active:scale-95"
                  >
                    <X className="w-3.5 h-3.5" />
                    {t('auth.deselectAll')}
                  </button>
                </div>

                {/* Popular Interests (Quick Chips) - compact on mobile */}
                <div>
                  <p className="text-[9px] sm:text-[10px] font-black text-orange-600 uppercase tracking-wider mb-1.5 sm:mb-2">{t('auth.recommendedInterests')}</p>
                  <div className="flex flex-wrap gap-1 sm:gap-1.5">
                    {interestCategories.filter(i => popularInterestIds.includes(i.id)).map(interest => {
                      const isSelected = selectedInterests.includes(interest.id);
                      return (
                        <button
                          key={interest.id}
                          onClick={() => handleInterestToggle(interest.id)}
                          className={`flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition-all active:scale-95 ${
                            isSelected
                              ? 'bg-orange-600 text-white shadow-md shadow-orange-200'
                              : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                          }`}
                        >
                          <span className="text-xs sm:text-sm">{interest.icon}</span>
                          {t(interest.nameKey)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Group Tabs */}
                <div className="flex gap-1 sm:gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                  <button
                    onClick={() => setActiveGroup('all')}
                    className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold whitespace-nowrap transition-all ${
                      activeGroup === 'all'
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {t('common.all')}
                  </button>
                  {interestGroups.map(group => (
                    <button
                      key={group.id}
                      onClick={() => setActiveGroup(group.id)}
                      className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold whitespace-nowrap transition-all ${
                        activeGroup === group.id
                          ? 'bg-gray-900 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      <span>{group.icon}</span>
                      {t(group.nameKey)}
                    </button>
                  ))}
                </div>

                {/* Interest Cards Grid - responsive height for mobile */}
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 max-h-[160px] sm:max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
                  {(activeGroup === 'all' ? interestCategories : getInterestsByGroup(activeGroup as InterestGroup)).map(interest => {
                    const isSelected = selectedInterests.includes(interest.id);
                    return (
                      <motion.button
                        key={interest.id}
                        onClick={() => handleInterestToggle(interest.id)}
                        whileTap={{ scale: 0.95 }}
                        className={`relative rounded-lg sm:rounded-xl p-2 sm:p-2.5 text-start transition-all overflow-hidden ${
                          isSelected
                            ? 'ring-2 ring-orange-500 shadow-lg shadow-orange-100 bg-white'
                            : 'bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm'
                        }`}
                      >
                        {isSelected && (
                          <div className={`absolute inset-0 bg-gradient-to-br ${interest.color} opacity-10`} />
                        )}
                        {isSelected && (
                          <div className="absolute top-1 left-1 sm:top-1.5 sm:left-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-orange-600 rounded-full flex items-center justify-center">
                            <Check className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />
                          </div>
                        )}
                        <div className="relative z-10">
                          <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
                            <span className="text-base sm:text-lg">{interest.icon}</span>
                            <span className={`text-[10px] sm:text-[11px] font-black ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                              {t(interest.nameKey)}
                            </span>
                          </div>
                          <p className={`text-[8px] sm:text-[9px] leading-relaxed line-clamp-1 sm:line-clamp-2 ${isSelected ? 'text-gray-600' : 'text-gray-400'}`}>
                            {t(interest.descriptionKey)}
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Create Account Button - sticky on mobile for easy access */}
                <div className="sticky bottom-0 left-0 right-0 pt-3 pb-[env(safe-area-inset-bottom,0px)] bg-gradient-to-t from-[#f8f9fa] via-[#f8f9fa] to-transparent sm:static sm:bg-none sm:pt-0 sm:pb-0">
                <button
                  onClick={handleFinishRegistration}
                  disabled={isRegistering || selectedInterests.length === 0}
                  className="w-full min-h-[48px] bg-gradient-to-l from-orange-600 to-orange-500 text-white py-3.5 sm:py-4 rounded-xl font-black text-sm sm:text-base hover:from-orange-700 hover:to-orange-600 active:scale-[0.98] transition-all shadow-lg shadow-orange-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isRegistering && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {isRegistering ? t('common.loading') : t('auth.createAccount', { count: selectedInterests.length })}
                </button>
                </div>

                <p className="text-[9px] sm:text-[10px] text-gray-400 text-center leading-relaxed">
                  {t('auth.bySigningUp')} {t('auth.termsOfUse')} {t('auth.privacyPolicy')}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
