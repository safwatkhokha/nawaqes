import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import {
  ArrowRight,
  Wallet,
  Smartphone,
  Cpu,
  ShieldCheck,
  X,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CreditCard,
  Camera,
  ImagePlus,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Zap,
  Phone,
  Gift,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  RefreshCw,
  Lock,
  Shield,
  Star,
  Info,
  ArrowLeftRight,
  PiggyBank,
  Award,
  Medal,
  Search,
  Target,
  Calendar,
  Plus,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';

export const WalletPage: React.FC = () => {
  const navigate = useNavigate();
  const { darkMode, transactions, addTransaction, addChargingRequest, addNotification } = useAppContext();
  const { currentUser, refreshCurrentUser } = useAuth();
  const { t } = useTranslation();
  const { dir, language } = useLanguage();

  const [showDeposit, setShowDeposit] = useState(false);
  const [amount, setAmount] = useState('');
  const [confirmStep, setConfirmStep] = useState<'input' | 'confirm' | 'success'>('input');
  const [pendingAmount, setPendingAmount] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState<string>('vfcash');
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const [additionalPhone, setAdditionalPhone] = useState('');
  const [txFilter, setTxFilter] = useState<'all' | 'charge_request' | 'deposit' | 'promotion_debit' | 'promotion_refund'>('all');
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [showHistory, setShowHistory] = useState(true);
  const [activeWalletTab, setActiveWalletTab] = useState<'overview' | 'charge' | 'history' | 'savings'>('overview');
  const [txSearch, setTxSearch] = useState('');
  const [showNewGoalForm, setShowNewGoalForm] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');
  const [savingsGoals, setSavingsGoals] = useState<{
    id: string;
    name: string;
    target: number;
    current: number;
    deadline: string;
  }[]>([
    { id: 'goal_1', name: t('wallet.defaultGoalName'), target: 500, current: 150, deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser) return null;

  const paymentAccounts = [
    { id: 'vfcash', name: t('wallet.vodafoneCash'), icon: Smartphone, color: 'bg-red-500', number: '01010023494', subtitle: 'Vodafone Cash' },
    { id: 'instapay', name: t('wallet.instaPay'), icon: Cpu, color: 'bg-purple-500', number: 'swIze9495', subtitle: 'InstaPay' },
  ];

  // Wallet Stats
  const walletStats = useMemo(() => {
    const deposits = transactions.filter(tx => tx.type === 'deposit');
    const promotions = transactions.filter(tx => tx.type === 'promotion_debit');
    const refunds = transactions.filter(tx => tx.type === 'promotion_refund');
    const chargeRequests = transactions.filter(tx => tx.type === 'charge_request');
    const totalDeposited = deposits.reduce((s, tx) => s + tx.amount, 0);
    const totalSpent = promotions.reduce((s, tx) => s + tx.amount, 0);
    const totalRefunded = refunds.reduce((s, tx) => s + tx.amount, 0);
    const pendingCount = transactions.filter(tx => tx.status === 'pending').length;
    const pendingAmount = transactions.filter(tx => tx.status === 'pending').reduce((s, tx) => s + tx.amount, 0);
    return { totalDeposited, totalSpent, totalRefunded, pendingCount, pendingAmount, depositCount: deposits.length, promotionCount: promotions.length, chargeRequestCount: chargeRequests.length };
  }, [transactions]);

  // Recent transactions (last 5)
  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 5);
  }, [transactions]);

  // Filtered transactions (with search)
  const filteredTransactions = useMemo(() => {
    let filtered = txFilter === 'all' ? transactions : transactions.filter(tx => tx.type === txFilter);
    if (txSearch.trim()) {
      const q = txSearch.trim().toLowerCase();
      filtered = filtered.filter(tx =>
        (tx.method && tx.method.toLowerCase().includes(q)) ||
        (tx.type && tx.type.toLowerCase().includes(q)) ||
        (tx.amount && tx.amount.toString().includes(q))
      );
    }
    return filtered;
  }, [transactions, txFilter, txSearch]);

  // Balance history for mini-chart (last 7 entries based on running balance)
  const balanceHistory = useMemo(() => {
    let runningBalance = currentUser.walletBalance || 0;
    const entries: { label: string; value: number }[] = [];
    const recent = transactions.slice(0, 7).reverse();
    for (const tx of recent) {
      runningBalance += tx.type === 'promotion_debit' ? tx.amount : -tx.amount;
      entries.push({
        label: tx.timestamp ? new Date(tx.timestamp).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' }) : '',
        value: Math.max(0, runningBalance),
      });
    }
    entries.push({ label: t('common.now'), value: currentUser.walletBalance || 0 });
    return entries.slice(-7);
  }, [transactions, currentUser.walletBalance, t, language]);

  // Rewards & Cashback calculations
  const rewardsInfo = useMemo(() => {
    const totalSpent = walletStats.totalSpent;
    const points = Math.floor(totalSpent / 10);
    let tier: string;
    let tierColor: string;
    let tierBg: string;
    let cashbackPercent: number;
    let nextTierAmount: number;
    if (totalSpent >= 2000) {
      tier = 'ذهبي';
      tierColor = 'text-yellow-500';
      tierBg = darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50';
      cashbackPercent = 5;
      nextTierAmount = 0;
    } else if (totalSpent >= 500) {
      tier = 'فضي';
      tierColor = 'text-gray-400';
      tierBg = darkMode ? 'bg-gray-600/30' : 'bg-gray-100';
      cashbackPercent = 3;
      nextTierAmount = 2000 - totalSpent;
    } else {
      tier = 'برونزي';
      tierColor = 'text-orange-600';
      tierBg = darkMode ? 'bg-orange-900/30' : 'bg-orange-50';
      cashbackPercent = 1;
      nextTierAmount = 500 - totalSpent;
    }
    return { points, tier, tierColor, tierBg, cashbackPercent, nextTierAmount, totalSpent };
  }, [walletStats.totalSpent, darkMode]);

  // Add savings goal handler
  const handleAddGoal = () => {
    if (!newGoalName.trim() || !newGoalTarget || parseFloat(newGoalTarget) <= 0) {
      toast.error(t('wallet.invalidGoalInfo'));
      return;
    }
    setSavingsGoals(prev => [...prev, {
      id: `goal_${Date.now()}`,
      name: newGoalName.trim(),
      target: parseFloat(newGoalTarget),
      current: 0,
      deadline: newGoalDeadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }]);
    setNewGoalName('');
    setNewGoalTarget('');
    setNewGoalDeadline('');
    setShowNewGoalForm(false);
    toast.success(t('wallet.goalAdded'));
  };

  // Delete savings goal handler
  const handleDeleteGoal = (id: string) => {
    setSavingsGoals(prev => prev.filter(g => g.id !== id));
    toast.success(t('wallet.goalDeleted'));
  };

  // Spending percentage for visual bar
  const spendingPercentage = walletStats.totalDeposited > 0
    ? Math.round((walletStats.totalSpent / walletStats.totalDeposited) * 100)
    : 0;

  // Quick charge amounts
  const quickAmounts = [50, 100, 200, 500, 1000, 5000];

  const handleDeposit = () => {
    const val = parseFloat(amount);
    if (!amount || val <= 0) {
      toast.error(t('wallet.enterValidAmount'));
      return;
    }
    if (!receiptImage || receiptImage.trim() === '') {
      toast.error(t('wallet.receiptRequiredError'));
      return;
    }
    if (!currentUser?.phone || currentUser.phone.trim() === '') {
      toast.error(t('wallet.phoneRequired'));
      return;
    }
    setPendingAmount(val);
    setConfirmStep('confirm');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('wallet.imageTooLarge'));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const result = await api.uploadImage(file);
      setReceiptImage(result.url);
      toast.success(t('wallet.receiptUploadSuccess'));
    } catch {
      toast.error(t('wallet.imageUploadFailed'));
    }
  };

  const removeReceiptImage = () => {
    setReceiptImage('');
    setReceiptPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmTransaction = async () => {
    const methodName = selectedMethod === 'vfcash' ? t('wallet.vodafoneCash') : t('wallet.instaPay');
    try {
      await api.chargeRequest(pendingAmount, selectedMethod, receiptImage, additionalPhone);
      addChargingRequest({
        id: `charge_${Date.now()}`,
        userId: currentUser!.id,
        userName: currentUser!.name,
        userAvatar: currentUser!.avatar,
        userPhone: currentUser!.phone || '',
        amount: pendingAmount,
        method: methodName,
        receiptImage: receiptImage || undefined,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      addTransaction({
        id: `tx_${Date.now()}`,
        type: 'charge_request',
        amount: pendingAmount,
        method: methodName,
        timestamp: new Date().toISOString(),
        status: 'pending',
      });
      toast.success(t('wallet.chargeRequestSubmitted', { amount: pendingAmount.toLocaleString() }));
      await refreshCurrentUser();
      setConfirmStep('success');
      setAmount('');
      setReceiptImage('');
      setReceiptPreview('');
      setAdditionalPhone('');
      setTimeout(() => {
        setConfirmStep('input');
        setShowDeposit(false);
        setActiveWalletTab('overview');
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || t('wallet.chargeFailed'));
    }
  };

  const handleCancelTransaction = () => {
    setConfirmStep('input');
    setPendingAmount(0);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(t('wallet.copiedToClipboard'));
    }).catch(() => {});
  };

  const bgCard = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const bgSection = darkMode ? 'bg-gray-700/50' : 'bg-gray-50';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-300' : 'text-gray-700';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="max-w-2xl mx-auto" dir={dir}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className={`text-2xl font-black ${textPrimary}`}>
            {t('wallet.smartWallet')}
          </h1>
          <p className={`text-sm ${textMuted}`}>
            {t('wallet.manageBalance')}
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
          <Shield className={`w-3.5 h-3.5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
          <span className={`text-[10px] font-black ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{t('wallet.walletSafe')}</span>
        </div>
      </div>

      {/* ═══════════ COMPACT BALANCE CARD ═══════════ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl mb-4"
      >
        <div className="relative bg-gradient-to-l from-orange-500 via-orange-600 to-amber-600 p-4 text-white shadow-xl shadow-orange-200/20">
          {/* Single decorative glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />

          {/* Top Row: Wallet Icon + Balance */}
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[9px] text-white/60 font-bold leading-none">{t('wallet.availableBalance')}</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-3xl font-black tracking-tight leading-none">{currentUser.walletBalance?.toLocaleString() || '0'}</span>
                  <span className="text-sm font-bold opacity-70">{t('common.egp')}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-0.5 bg-white/10 px-1.5 py-0.5 rounded">
                  <ShieldCheck className="w-3 h-3" />
                  <span className="text-[8px] font-black">{t('wallet.walletSafe')}</span>
                </div>
                <div className="flex items-center gap-0.5 bg-white/10 px-1.5 py-0.5 rounded">
                  <Lock className="w-3 h-3" />
                  <span className="text-[8px] font-black">SSL</span>
                </div>
              </div>
              {walletStats.pendingCount > 0 && (
                <div className="flex items-center gap-1 bg-yellow-400/20 px-1.5 py-0.5 rounded">
                  <Clock className="w-3 h-3 text-yellow-200" />
                  <span className="text-[8px] font-bold text-yellow-100">{walletStats.pendingCount} {t('wallet.pendingRequests')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions - Horizontal compact row */}
          <div className="flex gap-2 relative z-10">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => { setActiveWalletTab('charge'); setShowDeposit(true); setConfirmStep('input'); setAmount(''); setReceiptImage(''); setReceiptPreview(''); setAdditionalPhone(''); }}
              className="flex-1 bg-white text-orange-600 py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md hover:bg-gray-50 transition-colors"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>{t('wallet.chargeWallet')}</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/promotion-packages')}
              className="flex-1 bg-white/15 backdrop-blur-sm text-white py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-white/20 hover:bg-white/25 transition-colors"
            >
              <Zap className="w-4 h-4" />
              <span>{t('wallet.promote')}</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/promotions')}
              className="flex-1 bg-white/15 backdrop-blur-sm text-white py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-white/20 hover:bg-white/25 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              <span>{t('wallet.analytics')}</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* ═══════════ WALLET TABS ═══════════ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`flex gap-1 p-1.5 rounded-2xl border mb-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
      >
        {[
          { id: 'overview' as const, label: t('wallet.overview'), icon: <Wallet className="w-4 h-4" /> },
          { id: 'charge' as const, label: t('wallet.chargeWallet'), icon: <ArrowUpRight className="w-4 h-4" /> },
          { id: 'history' as const, label: t('wallet.history'), icon: <Clock className="w-4 h-4" /> },
          { id: 'savings' as const, label: t('wallet.savingsGoals'), icon: <PiggyBank className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveWalletTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
              activeWalletTab === tab.id
                ? 'bg-gradient-to-l from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-200/30'
                : darkMode
                  ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </motion.div>

      {/* ═══════════ OVERVIEW TAB ═══════════ */}
      <AnimatePresence mode="wait">
        {activeWalletTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-5"
          >
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className={`rounded-2xl border p-4 ${bgCard}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                    <TrendingUp className={`w-4.5 h-4.5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                  </div>
                  <span className={`text-[10px] font-bold ${textMuted}`}>{t('wallet.totalDeposited')}</span>
                </div>
                <p className={`text-2xl font-black ${textPrimary}`}>{walletStats.totalDeposited.toLocaleString()}</p>
                <p className={`text-[9px] ${textMuted}`}>{t('common.egp')}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`rounded-2xl border p-4 ${bgCard}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${darkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
                    <TrendingDown className={`w-4.5 h-4.5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                  </div>
                  <span className={`text-[10px] font-bold ${textMuted}`}>{t('wallet.totalSpent')}</span>
                </div>
                <p className={`text-2xl font-black ${textPrimary}`}>{walletStats.totalSpent.toLocaleString()}</p>
                <p className={`text-[9px] ${textMuted}`}>{t('common.egp')}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className={`rounded-2xl border p-4 ${bgCard}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
                    <Activity className={`w-4.5 h-4.5 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                  </div>
                  <span className={`text-[10px] font-bold ${textMuted}`}>{t('wallet.pendingRequests')}</span>
                </div>
                <p className={`text-2xl font-black ${textPrimary}`}>{walletStats.pendingCount}</p>
                <p className={`text-[9px] ${textMuted}`}>{t('wallet.waitingApproval')}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`rounded-2xl border p-4 ${bgCard}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                    <RefreshCw className={`w-4.5 h-4.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <span className={`text-[10px] font-bold ${textMuted}`}>{t('wallet.totalRefunded')}</span>
                </div>
                <p className={`text-2xl font-black ${textPrimary}`}>{walletStats.totalRefunded.toLocaleString()}</p>
                <p className={`text-[9px] ${textMuted}`}>{t('common.egp')}</p>
              </motion.div>
            </div>

            {/* Spending Progress */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className={`rounded-2xl border p-5 ${bgCard}`}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                  <BarChart3 className={`w-4 h-4 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                </div>
                <h3 className={`font-black text-sm ${textPrimary}`}>{t('wallet.spendingRatio')}</h3>
                <span className={`text-sm font-black ${darkMode ? 'text-purple-400' : 'text-purple-600'} ms-auto`}>{spendingPercentage}%</span>
              </div>

              <div className={`h-3 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(spendingPercentage, 100)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full ${
                    spendingPercentage > 80 ? 'bg-gradient-to-l from-red-500 to-red-400' :
                    spendingPercentage > 50 ? 'bg-gradient-to-l from-orange-500 to-amber-400' :
                    'bg-gradient-to-l from-green-500 to-emerald-400'
                  }`}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className={`text-[9px] ${textMuted}`}>{t('wallet.totalSpent')}: {walletStats.totalSpent.toLocaleString()}</span>
                <span className={`text-[9px] ${textMuted}`}>{t('wallet.totalDeposited')}: {walletStats.totalDeposited.toLocaleString()}</span>
              </div>
            </motion.div>

            {/* Balance History Mini-Chart */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.27 }}
              className={`rounded-2xl border p-5 ${bgCard}`}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-teal-900/30' : 'bg-teal-50'}`}>
                  <Activity className={`w-4 h-4 ${darkMode ? 'text-teal-400' : 'text-teal-600'}`} />
                </div>
                <h3 className={`font-black text-sm ${textPrimary}`}>{t('wallet.balanceHistory')}</h3>
              </div>
              {balanceHistory.length > 1 ? (
                <div className="flex items-end gap-2 h-28">
                  {balanceHistory.map((entry, i) => {
                    const maxVal = Math.max(...balanceHistory.map(e => e.value), 1);
                    const heightPct = (entry.value / maxVal) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className={`text-[8px] font-bold ${textMuted}`}>{entry.value > 0 ? entry.value.toLocaleString() : '0'}</span>
                        <div className="w-full relative" style={{ height: '80px' }}>
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max(heightPct, 4)}%` }}
                            transition={{ duration: 0.5, delay: i * 0.05 }}
                            className={`absolute bottom-0 left-0 right-0 rounded-t-lg ${
                              i === balanceHistory.length - 1
                                ? 'bg-gradient-to-t from-orange-500 to-amber-400'
                                : darkMode ? 'bg-gray-600' : 'bg-gray-300'
                            }`}
                          />
                        </div>
                        <span className={`text-[7px] font-bold ${textMuted} truncate w-full text-center`}>{entry.label}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className={`text-xs ${textMuted} text-center py-4`}>{t('wallet.noBalanceHistory')}</p>
              )}
            </motion.div>

            {/* Rewards & Cashback Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.29 }}
              className={`rounded-2xl border p-5 ${bgCard}`}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${rewardsInfo.tierBg}`}>
                  <Award className={`w-4 h-4 ${rewardsInfo.tierColor}`} />
                </div>
                <h3 className={`font-black text-sm ${textPrimary}`}>{t('wallet.rewardsCashback')}</h3>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${rewardsInfo.tierBg} ${rewardsInfo.tierColor} ms-auto`}>{rewardsInfo.tier === 'ذهبي' ? t('wallet.tierGold') : rewardsInfo.tier === 'فضي' ? t('wallet.tierSilver') : t('wallet.tierBronze')}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className={`rounded-xl p-3 text-center ${bgSection}`}>
                  <Star className={`w-4 h-4 mx-auto mb-1 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
                  <p className={`text-lg font-black ${textPrimary}`}>{rewardsInfo.points.toLocaleString()}</p>
                  <p className={`text-[9px] font-bold ${textMuted}`}>{t('wallet.points')}</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${bgSection}`}>
                  <Medal className={`w-4 h-4 mx-auto mb-1 ${rewardsInfo.tierColor}`} />
                  <p className={`text-lg font-black ${textPrimary}`}>{rewardsInfo.cashbackPercent}%</p>
                  <p className={`text-[9px] font-bold ${textMuted}`}>{t('wallet.cashback')}</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${bgSection}`}>
                  <Gift className={`w-4 h-4 mx-auto mb-1 ${darkMode ? 'text-pink-400' : 'text-pink-500'}`} />
                  <p className={`text-lg font-black ${textPrimary}`}>{rewardsInfo.totalSpent.toLocaleString()}</p>
                  <p className={`text-[9px] font-bold ${textMuted}`}>{t('wallet.totalSpent')}</p>
                </div>
              </div>
              {rewardsInfo.nextTierAmount > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-bold ${textMuted}`}>{t('wallet.nextTierProgress')}</span>
                    <span className={`text-[10px] font-bold ${textPrimary}`}>{rewardsInfo.nextTierAmount.toLocaleString()} {t('common.egp')}</span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(((rewardsInfo.totalSpent % (rewardsInfo.tier === 'برونزي' ? 500 : 2000)) / (rewardsInfo.tier === 'برونزي' ? 500 : 2000)) * 100, 100)}%` }}
                      transition={{ duration: 0.8 }}
                      className="h-full rounded-full bg-gradient-to-l from-orange-500 to-amber-400"
                    />
                  </div>
                  <p className={`text-[9px] mt-1 ${textMuted}`}>{t('wallet.remainingForNextTier', { amount: rewardsInfo.nextTierAmount.toLocaleString() })}</p>
                </div>
              )}
              <div className={`mt-3 rounded-xl p-2.5 flex items-center gap-2 ${darkMode ? 'bg-orange-900/10' : 'bg-orange-50'}`}>
                <Info className={`w-3.5 h-3.5 flex-shrink-0 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                <p className={`text-[9px] ${darkMode ? 'text-orange-300/70' : 'text-orange-600'}`}>{t('wallet.rewardsInfo')}</p>
              </div>
            </motion.div>

            {/* Payment Methods */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`rounded-2xl border p-5 ${bgCard}`}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-amber-900/30' : 'bg-amber-50'}`}>
                  <CreditCard className={`w-4 h-4 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                </div>
                <h3 className={`font-black text-sm ${textPrimary}`}>{t('wallet.availableMethods')}</h3>
              </div>
              <div className="space-y-3">
                {paymentAccounts.map(acc => (
                  <div key={acc.id} className={`flex items-center gap-3 p-3 rounded-xl ${bgSection}`}>
                    <div className={`p-2.5 rounded-xl ${acc.color} shadow-md`}>
                      <acc.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-black block ${textPrimary}`}>{acc.name}</span>
                      <span className={`text-[10px] ${textMuted}`}>{acc.subtitle}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className={`text-xs font-bold px-3 py-1.5 rounded-lg ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`} dir="ltr">{acc.number}</code>
                      <button
                        onClick={() => copyToClipboard(acc.number)}
                        className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Recent Transactions Preview */}
            {recentTransactions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className={`rounded-2xl border overflow-hidden ${bgCard}`}
              >
                <div className={`px-5 py-4 border-b flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <h3 className={`font-black text-sm ${textPrimary}`}>{t('wallet.recentTransactions')}</h3>
                  </div>
                  <button
                    onClick={() => setActiveWalletTab('history')}
                    className="text-[10px] font-bold text-orange-600 hover:underline"
                  >
                    {t('wallet.viewAll')}
                  </button>
                </div>
                <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                  {recentTransactions.map(tx => (
                    <div key={tx.id} className="px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          tx.type === 'deposit' || tx.type === 'promotion_refund' || tx.type === 'charge_request'
                            ? darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'
                            : darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'
                        }`}>
                          {tx.type === 'deposit' || tx.type === 'promotion_refund' ? <ArrowDownRight className="w-4 h-4" /> :
                           tx.type === 'charge_request' ? <Clock className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${textPrimary}`}>
                            {tx.type === 'charge_request' ? t('wallet.chargeRequest') : tx.type === 'deposit' ? t('wallet.deposit') : tx.type === 'promotion_debit' ? t('wallet.promotionDebit') : tx.type === 'promotion_refund' ? t('wallet.promotionRefund') : tx.type}
                          </p>
                          <p className={`text-[10px] ${textMuted}`}>{tx.method}</p>
                        </div>
                      </div>
                      <div className="text-end">
                        <span className={`text-sm font-black ${tx.type === 'deposit' || tx.type === 'promotion_refund' || tx.type === 'charge_request' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'deposit' || tx.type === 'promotion_refund' || tx.type === 'charge_request' ? '+' : '-'}{tx.amount.toLocaleString()}
                        </span>
                        <div className="flex items-center gap-1 justify-end">
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${
                            tx.status === 'completed'
                              ? darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'
                              : tx.status === 'pending'
                                ? darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-50 text-yellow-600'
                                : darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'
                          }`}>
                            {tx.status === 'completed' ? t('wallet.completed') : tx.status === 'pending' ? t('wallet.inProgress') : t('common.cancel')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

          </motion.div>
        )}

        {/* ═══════════ CHARGE TAB ═══════════ */}
        {activeWalletTab === 'charge' && (
          <motion.div
            key="charge"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-5"
          >
            {/* Charge Form Card */}
            <div className={`rounded-2xl border overflow-hidden ${bgCard}`}>
              {/* Method Selection */}
              <div className={`p-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className={`w-4 h-4 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                  <h3 className={`font-black text-sm ${textPrimary}`}>{t('wallet.chooseMethod')}</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {paymentAccounts.map(acc => (
                    <button
                      key={acc.id}
                      onClick={() => setSelectedMethod(acc.id)}
                      className={`p-4 rounded-xl text-center transition-all border-2 ${
                        selectedMethod === acc.id
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-md'
                          : darkMode ? 'border-gray-700 bg-gray-700/50 hover:border-gray-600' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl ${acc.color} shadow-sm mx-auto w-fit mb-2`}>
                        <acc.icon className="w-5 h-5 text-white" />
                      </div>
                      <p className={`text-xs font-black ${textPrimary}`}>{acc.name}</p>
                      <div className="flex items-center justify-center gap-1 mt-1.5">
                        <code className={`text-[10px] font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} dir="ltr">{acc.number}</code>
                        <button
                          onClick={(e) => { e.stopPropagation(); copyToClipboard(acc.number); }}
                          className={`p-1 rounded ${darkMode ? 'hover:bg-gray-600 text-gray-500' : 'hover:bg-gray-200 text-gray-400'}`}
                        >
                          <Copy className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
                {/* Transfer instructions */}
                <div className={`mt-3 rounded-xl p-3 ${darkMode ? 'bg-blue-900/20 border-blue-800/30' : 'bg-blue-50 border-blue-100'} border`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Info className={`w-3.5 h-3.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <span className={`text-[10px] font-black ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{t('wallet.transferInstructions')}</span>
                  </div>
                  <p className={`text-[9px] leading-relaxed ${darkMode ? 'text-blue-400/70' : 'text-blue-600'}`}>
                    {t('wallet.transferInstructionsDesc')}
                  </p>
                </div>
              </div>

              {/* Phone Number Section */}
              <div className={`p-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                {(!currentUser?.phone || currentUser.phone.trim() === '') ? (
                  <div className={`rounded-xl p-3 flex items-start gap-2 ${darkMode ? 'bg-red-900/20 border-red-800/30' : 'bg-red-50 border-red-100'} border`}>
                    <Phone className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                    <div>
                      <p className={`text-xs font-bold ${darkMode ? 'text-red-300' : 'text-red-700'}`}>{t('wallet.phoneRequiredTitle')}</p>
                      <p className={`text-[10px] mt-0.5 ${darkMode ? 'text-red-400/70' : 'text-red-600'}`}>{t('wallet.phoneRequiredDesc')}</p>
                      <button onClick={() => navigate('/settings')} className={`text-[10px] font-bold mt-1.5 underline ${darkMode ? 'text-red-300' : 'text-red-700'}`}>{t('wallet.goToSettings')}</button>
                    </div>
                  </div>
                ) : (
                  <div className={`rounded-xl p-3 ${darkMode ? 'bg-green-900/20 border-green-800/30' : 'bg-green-50 border-green-100'} border`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Phone className={`w-3.5 h-3.5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                      <span className={`text-[10px] font-bold ${darkMode ? 'text-green-300' : 'text-green-700'}`}>{t('wallet.senderPhoneLabel')}</span>
                      <span className="text-[8px] bg-green-500/30 text-green-200 px-1.5 py-0.5 rounded-full font-bold">{t('wallet.mandatory')}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-sm font-black ${darkMode ? 'text-white' : 'text-gray-900'} tracking-wide`} dir="ltr">{currentUser.phone}</span>
                      <span className={`text-[9px] ms-auto ${darkMode ? 'text-green-400/60' : 'text-green-500'}`}>{t('wallet.phoneMatchHint')}</span>
                    </div>
                  </div>
                )}

                {/* Additional Phone */}
                <div className="mt-3">
                  <div className={`rounded-xl p-3 ${bgSection}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className={`w-3.5 h-3.5 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                      <span className={`text-[10px] font-bold ${textSecondary}`}>{t('wallet.additionalPhoneLabel')}</span>
                    </div>
                    <p className={`text-[9px] mb-2 ${textMuted}`}>{t('wallet.additionalPhoneHint')}</p>
                    <input
                      type="tel"
                      value={additionalPhone}
                      onChange={(e) => setAdditionalPhone(e.target.value)}
                      placeholder={t('wallet.additionalPhonePlaceholder')}
                      className={`w-full px-3 py-2 rounded-lg text-sm font-bold outline-none transition-colors ${
                        darkMode ? 'bg-gray-700 text-white placeholder-gray-500 border-gray-600 focus:ring-orange-500/30' : 'bg-white text-gray-900 placeholder-gray-400 border-gray-200 focus:ring-orange-400/30'
                      } border focus:ring-2`}
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Amount & Receipt Section */}
              <div className="p-5">
                {/* Amount Input */}
                <div className="mb-4">
                  <label className={`text-[10px] font-bold ${textMuted} block mb-2`}>{t('wallet.amountInEgp')}</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={t('wallet.amountInEgp')}
                    className={`w-full px-4 py-4 rounded-xl text-2xl font-black outline-none text-center transition-colors ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:ring-orange-500/30' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-300 focus:ring-orange-400/30'
                    } border focus:ring-2`}
                  />
                </div>

                {/* Quick Amounts */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {quickAmounts.map(v => (
                    <button
                      key={v}
                      onClick={() => setAmount(v.toString())}
                      className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                        amount === v.toString()
                          ? 'bg-orange-600 text-white shadow-md'
                          : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {v.toLocaleString()} {t('common.egp')}
                    </button>
                  ))}
                </div>

                {/* Receipt Upload */}
                <div className={`rounded-xl p-4 mb-4 ${bgSection}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Camera className={`w-4 h-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                    <span className={`text-xs font-black ${textPrimary}`}>{t('wallet.receiptImage')}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'}`}>{t('wallet.receiptRequired')}</span>
                    {receiptPreview && (
                      <button onClick={removeReceiptImage} className={`ms-auto p-1 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}>
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className={`text-[9px] mb-3 ${textMuted}`}>{t('wallet.receiptHint')}</p>
                  {receiptPreview ? (
                    <div className="relative rounded-xl overflow-hidden border-2 border-green-500/30">
                      <img src={receiptPreview} alt="Receipt" className="w-full h-36 object-cover" />
                      <div className={`absolute bottom-0 left-0 right-0 p-2 flex items-center justify-center gap-1.5 ${darkMode ? 'bg-green-900/80' : 'bg-green-500/90'}`}>
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        <span className="text-[10px] text-white font-bold">{t('wallet.receiptAttached')}</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full border-2 border-dashed rounded-xl py-6 flex flex-col items-center justify-center gap-2 transition-colors group ${
                        darkMode ? 'border-gray-600 hover:border-orange-500/50 hover:bg-gray-700/50' : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/30'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${darkMode ? 'bg-gray-700 group-hover:bg-orange-900/30' : 'bg-gray-100 group-hover:bg-orange-100'}`}>
                        <ImagePlus className={`w-5 h-5 ${darkMode ? 'text-gray-400 group-hover:text-orange-400' : 'text-gray-400 group-hover:text-orange-500'}`} />
                      </div>
                      <span className={`text-xs font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('wallet.clickToUpload')}</span>
                      <span className={`text-[9px] ${textMuted}`}>{t('wallet.maxSize')}</span>
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.tiff,.avif,.heic,.heif,.ico,.jfif" onChange={handleImageUpload} className="hidden" />
                </div>

                {/* Confirm Button */}
                <AnimatePresence mode="wait">
                  {confirmStep === 'input' && (
                    <motion.button
                      key="confirm-input"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={handleDeposit}
                      className="w-full bg-gradient-to-l from-orange-500 to-orange-600 text-white py-4 rounded-xl text-base font-black hover:from-orange-600 hover:to-orange-700 transition-all active:scale-[0.98] shadow-lg shadow-orange-200/30 flex items-center justify-center gap-2"
                    >
                      <ArrowUpRight className="w-5 h-5" />
                      {t('wallet.confirmCharge')}
                    </motion.button>
                  )}
                  {confirmStep === 'confirm' && (
                    <motion.div
                      key="confirm-step"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      <div className={`rounded-xl p-4 text-center ${bgSection}`}>
                        <p className={`text-xs mb-1 ${textMuted}`}>{t('wallet.willBeCharged')}</p>
                        <p className={`text-3xl font-black ${textPrimary}`}>{pendingAmount.toLocaleString()} <span className="text-lg">{t('common.egp')}</span></p>
                        <p className={`text-[10px] mt-1 ${textMuted}`}>{t('wallet.via')} {selectedMethod === 'vfcash' ? t('wallet.vodafoneCash') : t('wallet.instaPay')}</p>
                        <p className={`text-[10px] mt-1 ${textMuted}`}>{t('wallet.balanceAfterCharge')} {((currentUser.walletBalance || 0) + pendingAmount).toLocaleString()} {t('common.egp')}</p>
                        {currentUser?.phone && <p className={`text-[10px] mt-2 flex items-center justify-center gap-1 ${textSecondary}`}><Phone className="w-3 h-3" /> {t('wallet.sentFromPhone')}: {currentUser.phone}</p>}
                        {additionalPhone && additionalPhone.trim() !== '' && <p className={`text-[10px] mt-1 flex items-center justify-center gap-1 ${textSecondary}`}><Phone className="w-3 h-3" /> {t('wallet.additionalPhoneLabel')}: <span dir="ltr">{additionalPhone}</span></p>}
                      </div>
                      {receiptPreview && (
                        <div className={`rounded-xl overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                          <img src={receiptPreview} alt="Receipt" className="w-full max-h-20 object-cover" />
                          <div className={`${bgSection} px-3 py-1.5 text-[9px] flex items-center gap-1 ${textMuted}`}>
                            <Camera className="w-3 h-3" />
                            {t('wallet.receiptImage')}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button onClick={handleConfirmTransaction} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3.5 rounded-xl text-xs font-black transition-colors active:scale-95 flex items-center justify-center gap-2 shadow-md">
                          <CheckCircle2 className="w-4 h-4" /> {t('wallet.sendRequest')}
                        </button>
                        <button onClick={handleCancelTransaction} className={`flex-1 py-3.5 rounded-xl text-xs font-bold transition-colors ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t('common.cancel')}</button>
                      </div>
                    </motion.div>
                  )}
                  {confirmStep === 'success' && (
                    <motion.div
                      key="confirm-success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-6"
                    >
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                        <CheckCircle2 className={`w-8 h-8 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                      </div>
                      <p className={`font-black ${textPrimary}`}>{t('wallet.chargeRequestSent')}</p>
                      <p className={`text-sm mt-1 ${textMuted}`}>{t('wallet.chargeRequestPending', { amount: pendingAmount.toLocaleString() })}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════ HISTORY TAB ═══════════ */}
        {activeWalletTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-5"
          >
            {/* Transaction Filters */}
            <div className={`rounded-2xl border overflow-hidden ${bgCard}`}>
              <div className={`px-5 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <h3 className={`font-black text-sm ${textPrimary}`}>{t('wallet.transactionHistory')}</h3>
                  </div>
                  <span className={`text-[10px] ${textMuted}`}>{t('wallet.transactionCount', { count: filteredTransactions.length })}</span>
                </div>
                {/* Search Input */}
                <div className="relative mb-3">
                  <Search className={`absolute top-1/2 -translate-y-1/2 ${dir === 'rtl' ? 'right-3' : 'left-3'} w-4 h-4 ${textMuted}`} />
                  <input
                    type="text"
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    placeholder={t('wallet.searchTransactions')}
                    className={`w-full ${dir === 'rtl' ? 'pr-10 pl-3' : 'pl-10 pr-3'} py-2.5 rounded-xl text-xs font-bold outline-none transition-colors ${
                      darkMode ? 'bg-gray-700 text-white placeholder-gray-500 border-gray-600 focus:ring-orange-500/30' : 'bg-gray-50 text-gray-900 placeholder-gray-400 border-gray-200 focus:ring-orange-400/30'
                    } border focus:ring-2`}
                  />
                  {txSearch && (
                    <button
                      onClick={() => setTxSearch('')}
                      className={`absolute top-1/2 -translate-y-1/2 ${dir === 'rtl' ? 'left-3' : 'right-3'} p-0.5 rounded ${darkMode ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'all' as const, label: t('common.all') },
                    { id: 'charge_request' as const, label: t('wallet.chargeRequest') },
                    { id: 'deposit' as const, label: t('wallet.deposit') },
                    { id: 'promotion_debit' as const, label: t('wallet.promotionDebit') },
                    { id: 'promotion_refund' as const, label: t('wallet.promotionRefund') },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setTxFilter(f.id)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                        txFilter === f.id
                          ? 'bg-orange-600 text-white shadow-sm'
                          : darkMode ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredTransactions.length > 0 ? (
                <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                  {filteredTransactions.map((tx, i) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="px-5 py-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          tx.type === 'deposit' || tx.type === 'promotion_refund' || tx.type === 'charge_request'
                            ? darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'
                            : darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'
                        }`}>
                          {tx.type === 'deposit' || tx.type === 'promotion_refund' ? <ArrowDownRight className="w-5 h-5" /> :
                           tx.type === 'charge_request' ? <Clock className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${textPrimary}`}>
                              {tx.type === 'charge_request' ? t('wallet.chargeRequest') : tx.type === 'deposit' ? t('wallet.deposit') : tx.type === 'promotion_debit' ? t('wallet.promotionDebit') : tx.type === 'promotion_refund' ? t('wallet.promotionRefund') : tx.type}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                              tx.status === 'completed'
                                ? darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'
                                : tx.status === 'pending'
                                  ? darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-50 text-yellow-600'
                                  : darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'
                            }`}>
                              {tx.status === 'completed' ? t('wallet.completed') : tx.status === 'pending' ? t('wallet.inProgress') : t('common.cancel')}
                            </span>
                          </div>
                          <span className={`text-[11px] ${textMuted}`}>
                            {tx.method} · {tx.timestamp}
                          </span>
                        </div>
                      </div>
                      <span className={`text-sm font-black ${tx.type === 'deposit' || tx.type === 'promotion_refund' || tx.type === 'charge_request' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'deposit' || tx.type === 'promotion_refund' || tx.type === 'charge_request' ? '+' : '-'}{tx.amount.toLocaleString()} {t('common.egp')}
                      </span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <Clock className={`w-8 h-8 ${textMuted}`} />
                  </div>
                  <p className={`font-bold ${textPrimary}`}>{t('wallet.noTransactions')}</p>
                  <p className={`text-sm mt-1 ${textMuted}`}>{t('wallet.noTransactionsDesc')}</p>
                </div>
              )}
            </div>

            {/* Monthly Summary */}
            {transactions.length > 0 && (
              <div className={`rounded-2xl border p-5 ${bgCard}`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-indigo-900/30' : 'bg-indigo-50'}`}>
                    <BarChart3 className={`w-4 h-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                  </div>
                  <h3 className={`font-black text-sm ${textPrimary}`}>{t('wallet.monthlySummary')}</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className={`rounded-xl p-3 text-center ${bgSection}`}>
                    <TrendingUp className={`w-4 h-4 mx-auto mb-1 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                    <p className={`text-sm font-black ${textPrimary}`}>{walletStats.depositCount}</p>
                    <p className={`text-[9px] font-bold ${textMuted}`}>{t('wallet.deposit')}</p>
                  </div>
                  <div className={`rounded-xl p-3 text-center ${bgSection}`}>
                    <TrendingDown className={`w-4 h-4 mx-auto mb-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                    <p className={`text-sm font-black ${textPrimary}`}>{walletStats.promotionCount}</p>
                    <p className={`text-[9px] font-bold ${textMuted}`}>{t('wallet.promotionDebit')}</p>
                  </div>
                  <div className={`rounded-xl p-3 text-center ${bgSection}`}>
                    <RefreshCw className={`w-4 h-4 mx-auto mb-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <p className={`text-sm font-black ${textPrimary}`}>{walletStats.chargeRequestCount}</p>
                    <p className={`text-[9px] font-bold ${textMuted}`}>{t('wallet.chargeRequest')}</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══════════ SAVINGS TAB ═══════════ */}
        {activeWalletTab === 'savings' && (
          <motion.div
            key="savings"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-5"
          >
            {/* Savings Header */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className={`rounded-2xl border p-5 ${bgCard}`}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-emerald-900/30' : 'bg-emerald-50'}`}>
                  <PiggyBank className={`w-5 h-5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                </div>
                <div>
                  <h3 className={`font-black text-sm ${textPrimary}`}>{t('wallet.savingsGoals')}</h3>
                  <p className={`text-[10px] ${textMuted}`}>{t('wallet.savingsGoalsDesc')}</p>
                </div>
                <button
                  onClick={() => setShowNewGoalForm(!showNewGoalForm)}
                  className={`ms-auto w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                    showNewGoalForm
                      ? 'bg-orange-500 text-white'
                      : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Add New Goal Form */}
              <AnimatePresence>
                {showNewGoalForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className={`rounded-xl p-4 mb-4 ${bgSection} space-y-3`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Target className={`w-4 h-4 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                        <span className={`text-xs font-black ${textPrimary}`}>{t('wallet.addNewGoal')}</span>
                      </div>
                      <div>
                        <label className={`text-[10px] font-bold ${textMuted} block mb-1.5`}>{t('wallet.goalName')}</label>
                        <input
                          type="text"
                          value={newGoalName}
                          onChange={(e) => setNewGoalName(e.target.value)}
                          placeholder={t('wallet.goalNamePlaceholder')}
                          className={`w-full px-3 py-2.5 rounded-lg text-xs font-bold outline-none transition-colors ${
                            darkMode ? 'bg-gray-800 text-white placeholder-gray-500 border-gray-600 focus:ring-orange-500/30' : 'bg-white text-gray-900 placeholder-gray-400 border-gray-200 focus:ring-orange-400/30'
                          } border focus:ring-2`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`text-[10px] font-bold ${textMuted} block mb-1.5`}>{t('wallet.targetAmount')}</label>
                          <input
                            type="number"
                            value={newGoalTarget}
                            onChange={(e) => setNewGoalTarget(e.target.value)}
                            placeholder="0"
                            className={`w-full px-3 py-2.5 rounded-lg text-xs font-bold outline-none transition-colors ${
                              darkMode ? 'bg-gray-800 text-white placeholder-gray-500 border-gray-600 focus:ring-orange-500/30' : 'bg-white text-gray-900 placeholder-gray-400 border-gray-200 focus:ring-orange-400/30'
                            } border focus:ring-2`}
                          />
                        </div>
                        <div>
                          <label className={`text-[10px] font-bold ${textMuted} block mb-1.5`}>{t('wallet.deadline')}</label>
                          <input
                            type="date"
                            value={newGoalDeadline}
                            onChange={(e) => setNewGoalDeadline(e.target.value)}
                            className={`w-full px-3 py-2.5 rounded-lg text-xs font-bold outline-none transition-colors ${
                              darkMode ? 'bg-gray-800 text-white border-gray-600 focus:ring-orange-500/30' : 'bg-white text-gray-900 border-gray-200 focus:ring-orange-400/30'
                            } border focus:ring-2`}
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleAddGoal}
                        className="w-full bg-gradient-to-l from-orange-500 to-orange-600 text-white py-3 rounded-xl text-xs font-black hover:from-orange-600 hover:to-orange-700 transition-all active:scale-[0.98] shadow-lg shadow-orange-200/30 flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        {t('wallet.addGoal')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Savings Goals List */}
              {savingsGoals.length > 0 ? (
                <div className="space-y-3">
                  {savingsGoals.map((goal, i) => {
                    const progressPct = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
                    const deadlineDate = new Date(goal.deadline);
                    const now = new Date();
                    const daysRemaining = Math.max(0, Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                    const isCompleted = progressPct >= 100;
                    return (
                      <motion.div
                        key={goal.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`rounded-xl p-4 ${bgSection} relative overflow-hidden`}
                      >
                        {/* Completion overlay */}
                        {isCompleted && (
                          <div className="absolute inset-0 bg-green-500/5 flex items-center justify-center pointer-events-none">
                            <CheckCircle2 className={`w-12 h-12 ${darkMode ? 'text-green-400/20' : 'text-green-500/20'}`} />
                          </div>
                        )}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              isCompleted
                                ? darkMode ? 'bg-green-900/30' : 'bg-green-50'
                                : darkMode ? 'bg-orange-900/30' : 'bg-orange-50'
                            }`}>
                              <Target className={`w-4 h-4 ${
                                isCompleted
                                  ? darkMode ? 'text-green-400' : 'text-green-600'
                                  : darkMode ? 'text-orange-400' : 'text-orange-600'
                              }`} />
                            </div>
                            <div>
                              <p className={`text-sm font-black ${textPrimary}`}>{goal.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Calendar className={`w-3 h-3 ${textMuted}`} />
                                <span className={`text-[9px] ${textMuted}`}>{daysRemaining > 0 ? t('wallet.daysRemaining', { count: daysRemaining }) : t('wallet.deadlinePassed')}</span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-red-900/30 text-gray-500 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {/* Progress */}
                        <div className="mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-bold ${textPrimary}`}>{goal.current.toLocaleString()} / {goal.target.toLocaleString()} {t('common.egp')}</span>
                            <span className={`text-xs font-black ${isCompleted ? 'text-green-600' : 'text-orange-600'}`}>{progressPct}%</span>
                          </div>
                          <div className={`h-2.5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(progressPct, 100)}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              className={`h-full rounded-full ${
                                isCompleted
                                  ? 'bg-gradient-to-l from-green-500 to-emerald-400'
                                  : progressPct > 60
                                    ? 'bg-gradient-to-l from-orange-500 to-amber-400'
                                    : 'bg-gradient-to-l from-orange-400 to-yellow-300'
                              }`}
                            />
                          </div>
                        </div>
                        {/* Quick add to goal */}
                        {!isCompleted && (
                          <div className="flex items-center gap-2 mt-2">
                            {[50, 100, 200].map(amt => (
                              <button
                                key={amt}
                                onClick={() => {
                                  setSavingsGoals(prev => prev.map(g =>
                                    g.id === goal.id ? { ...g, current: Math.min(g.current + amt, g.target) } : g
                                  ));
                                  toast.success(t('wallet.amountAddedToGoal', { amount: amt.toLocaleString() }));
                                }}
                                className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-colors ${
                                  darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-50'
                                } border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}
                              >
                                +{amt}
                              </button>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <PiggyBank className={`w-8 h-8 ${textMuted}`} />
                  </div>
                  <p className={`font-bold ${textPrimary}`}>{t('wallet.noSavingsGoals')}</p>
                  <p className={`text-sm mt-1 ${textMuted}`}>{t('wallet.noSavingsGoalsDesc')}</p>
                  <button
                    onClick={() => setShowNewGoalForm(true)}
                    className="mt-3 px-4 py-2 rounded-xl text-xs font-bold bg-orange-600 text-white hover:bg-orange-700 transition-colors inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t('wallet.createFirstGoal')}
                  </button>
                </div>
              )}
            </motion.div>

            {/* Savings Summary */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={`rounded-2xl border p-5 ${bgCard}`}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-teal-900/30' : 'bg-teal-50'}`}>
                  <BarChart3 className={`w-4 h-4 ${darkMode ? 'text-teal-400' : 'text-teal-600'}`} />
                </div>
                <h3 className={`font-black text-sm ${textPrimary}`}>{t('wallet.savingsSummary')}</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className={`rounded-xl p-3 text-center ${bgSection}`}>
                  <Target className={`w-4 h-4 mx-auto mb-1 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                  <p className={`text-sm font-black ${textPrimary}`}>{savingsGoals.length}</p>
                  <p className={`text-[9px] font-bold ${textMuted}`}>{t('wallet.totalGoals')}</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${bgSection}`}>
                  <PiggyBank className={`w-4 h-4 mx-auto mb-1 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                  <p className={`text-sm font-black ${textPrimary}`}>{savingsGoals.reduce((s, g) => s + g.current, 0).toLocaleString()}</p>
                  <p className={`text-[9px] font-bold ${textMuted}`}>{t('wallet.totalSaved')}</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${bgSection}`}>
                  <CheckCircle2 className={`w-4 h-4 mx-auto mb-1 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <p className={`text-sm font-black ${textPrimary}`}>{savingsGoals.filter(g => g.current >= g.target).length}</p>
                  <p className={`text-[9px] font-bold ${textMuted}`}>{t('wallet.completedGoals')}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
