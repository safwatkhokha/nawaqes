import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { interestCategories, interestGroups, getInterestsByGroup, type InterestGroup } from '../config/interests';

type AuthTab = 'login' | 'register' | 'interests' | 'forgot-password';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, register, currentUser, isLoggedIn } = useAuth();
  const { t } = useTranslation();
  const { dir } = useLanguage();

  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const [showPassword, setShowPassword] = useState(false);

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerDateOfBirth, setRegisterDateOfBirth] = useState('');
  const [registerGender, setRegisterGender] = useState<'male' | 'female'>('male');
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

  // Popular interests for quick selection
  const popularInterestIds = ['phones', 'cars', 'electronics', 'fashion', 'jobs', 'realEstate'];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      await login(loginEmail, loginPassword);
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName.trim()) return;
    if (!registerPhone.trim() || registerPhone.trim().length < 11) {
      toast.error(t('auth.phoneRequired'));
      return;
    }
    if (!registerDateOfBirth) {
      toast.error(t('auth.dateOfBirthRequired'));
      return;
    }
    if (selectedInterests.length === 0) {
      setActiveTab('interests');
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

  const handleInterestToggle = (interestId: string) => {
    setSelectedInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(i => i !== interestId)
        : [...prev, interestId]
    );
  };

  const handleFinishRegistration = async () => {
    if (selectedInterests.length === 0) return;
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
      // If in dev mode, show the reset code
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
      // Auto-login after reset
      api.setToken(data.token);
      setActiveTab('login');
      setLoginEmail(forgotEmail);
      toast.success(t('auth.passwordResetSuccess'));
    } catch (err: any) {
      toast.error(err.message || t('auth.resetFailed'));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex" dir={dir}>
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-600 via-orange-700 to-red-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ij48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCA0LTRzNCAyIDQgNC0yIDQtNCA0LTQtMi00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-black/10 rounded-full -ml-40 -mb-40 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="mb-12">
            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center text-4xl font-black backdrop-blur-md mb-6 shadow-2xl">
              ن
            </div>
            <h1 className="text-5xl font-black mb-4 leading-tight">
              {t('auth.platformName')}
            </h1>
            <p className="text-orange-100 text-lg leading-relaxed max-w-md">
              {t('auth.platformDesc')}
            </p>
          </div>

          <div className="space-y-5">
            {[
              { icon: <ShieldCheck className="w-6 h-6" />, title: t('auth.sellerVerification'), desc: t('auth.sellerVerificationDesc') },
              { icon: <Zap className="w-6 h-6" />, title: t('auth.smartReach'), desc: t('auth.smartReachDesc') },
              { icon: <Users className="w-6 h-6" />, title: t('auth.safeCommunity'), desc: t('auth.safeCommunityDesc') },
              { icon: <TrendingUp className="w-6 h-6" />, title: t('auth.marketReports'), desc: t('auth.marketReportsDesc') },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md flex-shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-bold text-sm">{feature.title}</h3>
                  <p className="text-orange-200 text-xs">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-white/10">
            <p className="text-orange-200 text-xs">{t('auth.copyright')}</p>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#f8f9fa]">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center text-3xl font-black text-white mx-auto mb-4 shadow-lg shadow-orange-200">
              ن
            </div>
            <h1 className="text-2xl font-black text-gray-900">{t('app.name')}</h1>
            <p className="text-gray-500 text-sm mt-1">{t('auth.smartAdsPlatform')}</p>
          </div>

          {/* Tabs - hide when in forgot-password flow */}
          {activeTab !== 'forgot-password' && (
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6">
              {[
                { id: 'login' as AuthTab, label: t('auth.login') },
                { id: 'register' as AuthTab, label: t('auth.register') },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* ─── Forgot Password Flow ─── */}
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
                    {resetStep === 'email'
                      ? t('auth.enterEmailForReset')
                      : t('auth.enterResetCode')
                    }
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
            ) : activeTab === 'login' ? (
              /* ─── Login Form ─── */
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1.5">{t('auth.email')}</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      placeholder="example@email.com"
                      className="w-full pr-10 pl-4 py-3.5 rounded-xl border border-gray-200 bg-white text-sm font-medium outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                      required
                    />
                  </div>
                </div>
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

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-orange-600 text-white py-4 rounded-xl font-black text-base hover:bg-orange-700 active:scale-[0.98] transition-all shadow-lg shadow-orange-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoggingIn && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {isLoggingIn ? t('common.loading') : t('auth.login')}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('forgot-password')}
                  className="w-full text-sm text-orange-600 hover:text-orange-700 font-bold py-2"
                >
                  {t('auth.forgotPassword')}
                </button>

                {/* ─── Download App Button ─── */}
                <div className="pt-4 border-t border-gray-100">
                  <a
                    href="https://huggingface.co/safwatkhokha/nawaqes-apk/resolve/main/nawaqes-latest.apk"
                    download
                    className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-gray-800 active:scale-[0.98] transition-all shadow-md"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    تحميل تطبيق نواقص (APK)
                  </a>
                  <p className="text-center text-[10px] text-gray-400 mt-1.5">
                    الإصدار 2.2.5 • Android 5+ • ~5MB
                  </p>
                </div>
              </motion.form>
            ) : activeTab === 'register' ? (
              /* ─── Register Form ─── */
              <motion.form
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleRegister}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1.5">{t('auth.fullName')}</label>
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
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1.5">{t('auth.email')}</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
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
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1.5">{t('auth.dateOfBirth')} <span className="text-red-500">*</span></label>
                  {/* Easy year + month selector */}
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
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1.5">{t('auth.password')}</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={registerPassword}
                      onChange={e => setRegisterPassword(e.target.value)}
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
                  disabled={isRegistering}
                  className="w-full bg-orange-600 text-white py-4 rounded-xl font-black text-base hover:bg-orange-700 active:scale-[0.98] transition-all shadow-lg shadow-orange-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isRegistering && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {isRegistering ? t('common.loading') : t('auth.nextChooseInterests')}
                </button>

                <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                  {t('auth.termsAgreement', { terms: t('auth.termsOfUse'), privacy: t('auth.privacyPolicy') })}
                </p>
              </motion.form>
            ) : (
              /* ─── Interests Selection (Redesigned) ─── */
              <motion.div
                key="interests"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Header */}
                <div className="text-center mb-2">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-200">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900">{t('auth.chooseInterests')}</h3>
                  <p className="text-sm text-gray-500 mt-1">{t('auth.chooseInterestsDesc')}</p>
                </div>

                {/* Progress Bar */}
                <div className="relative">
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((selectedInterests.length / 5) * 100, 100)}%` }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        selectedInterests.length === 0 ? 'bg-gray-200' :
                        selectedInterests.length < 3 ? 'bg-amber-400' :
                        selectedInterests.length < 5 ? 'bg-orange-500' :
                        'bg-green-500'
                      }`}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] font-bold text-gray-400">
                      {selectedInterests.length === 0 ? t('auth.minInterests') : t('auth.interestsSelected', { count: selectedInterests.length })}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">
                      {Math.min(Math.round((selectedInterests.length / 5) * 100), 100)}%
                    </span>
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

                {/* Popular Interests (Quick Chips) */}
                <div>
                  <p className="text-[10px] font-black text-orange-600 uppercase tracking-wider mb-2">{t('auth.recommendedInterests')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {interestCategories.filter(i => popularInterestIds.includes(i.id)).map(interest => {
                      const isSelected = selectedInterests.includes(interest.id);
                      return (
                        <button
                          key={interest.id}
                          onClick={() => handleInterestToggle(interest.id)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                            isSelected
                              ? 'bg-orange-600 text-white shadow-md shadow-orange-200'
                              : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                          }`}
                        >
                          <span className="text-sm">{interest.icon}</span>
                          {t(interest.nameKey)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Group Tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                  <button
                    onClick={() => setActiveGroup('all')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
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
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
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

                {/* Interest Cards Grid */}
                <div className="grid grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
                  {(activeGroup === 'all' ? interestCategories : getInterestsByGroup(activeGroup as InterestGroup)).map(interest => {
                    const isSelected = selectedInterests.includes(interest.id);
                    return (
                      <motion.button
                        key={interest.id}
                        onClick={() => handleInterestToggle(interest.id)}
                        whileTap={{ scale: 0.95 }}
                        className={`relative rounded-xl p-3 text-start transition-all overflow-hidden ${
                          isSelected
                            ? 'ring-2 ring-orange-500 shadow-lg shadow-orange-100 bg-white'
                            : 'bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm'
                        }`}
                      >
                        {/* Gradient Background on Selection */}
                        {isSelected && (
                          <div className={`absolute inset-0 bg-gradient-to-br ${interest.color} opacity-10`} />
                        )}
                        
                        {/* Check Badge */}
                        {isSelected && (
                          <div className="absolute top-1.5 left-1.5 w-5 h-5 bg-orange-600 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}

                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xl">{interest.icon}</span>
                            <span className={`text-xs font-black ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                              {t(interest.nameKey)}
                            </span>
                          </div>
                          <p className={`text-[10px] leading-relaxed ${isSelected ? 'text-gray-600' : 'text-gray-400'}`}>
                            {t(interest.descriptionKey)}
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Selected Count & Create Button */}
                <button
                  onClick={handleFinishRegistration}
                  disabled={selectedInterests.length === 0 || isRegistering}
                  className="w-full bg-orange-600 text-white py-4 rounded-xl font-black text-base hover:bg-orange-700 active:scale-[0.98] transition-all shadow-lg shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isRegistering && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {isRegistering ? t('common.loading') : t('auth.createAccount', { count: selectedInterests.length })}
                </button>

                <button
                  onClick={() => setActiveTab('register')}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 font-bold"
                >
                  {t('common.back')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
