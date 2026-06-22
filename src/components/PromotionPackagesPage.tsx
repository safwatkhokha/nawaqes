import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { promotionPackages, cityTiers } from '../data/promotionPackages';
import { marketPromotionPackages } from '../data/marketPromotionPackages';
import {
  ArrowRight,
  Zap,
  Eye,
  Clock,
  Bell,
  MessageCircle,
  Sparkles,
  Target,
  MapPin,
  Brain,
  Crown,
  CheckCircle2,
  Wallet,
  TrendingUp,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Star,
  Megaphone,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';

export const PromotionPackagesPage: React.FC = () => {
  const navigate = useNavigate();
  const { darkMode } = useAppContext();
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const { dir } = useLanguage();

  const [activeTab, setActiveTab] = useState<'posts' | 'market'>('posts');
  const [expandedPkg, setExpandedPkg] = useState<string | null>(null);
  const [showCityTiers, setShowCityTiers] = useState(false);

  if (!currentUser) return null;

  const walletBalance = currentUser.walletBalance || 0;
  const currentPackages = activeTab === 'posts' ? promotionPackages : marketPromotionPackages;

  const getTargetingIcon = (targeting: string) => {
    switch (targeting) {
      case 'city': return <MapPin className="w-4 h-4" />;
      case 'interests': return <Brain className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getTargetingLabel = (targeting: string) => {
    switch (targeting) {
      case 'city': return t('promotionPackagesPage.cityTargeting', 'استهداف جغرافي');
      case 'interests': return t('promotionPackagesPage.interestTargeting', 'استهداف ذكي');
      default: return t('promotionPackagesPage.allUsers', 'جميع المستخدمين');
    }
  };

  return (
    <div className="max-w-2xl mx-auto" dir={dir}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {t('promotionPackagesPage.title', 'باقات الترويج')}
          </h1>
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {t('promotionPackagesPage.subtitle', 'اختر الباقة المناسبة وزد وصول إعلانك')}
          </p>
        </div>
      </div>

      {/* Wallet Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl p-4 mb-6 border ${
          darkMode
            ? 'bg-gradient-to-l from-orange-900/30 to-amber-900/20 border-orange-800/30'
            : 'bg-gradient-to-l from-orange-50 to-amber-50 border-orange-100'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              darkMode ? 'bg-orange-900/50 text-orange-400' : 'bg-orange-100 text-orange-600'
            }`}>
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-[10px] font-bold ${darkMode ? 'text-orange-400/70' : 'text-orange-600/70'}`}>
                {t('promotionPackagesPage.walletBalance', 'رصيد محفظتك')}
              </p>
              <p className={`text-lg font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {walletBalance.toLocaleString()} <span className="text-xs">{t('common.egp', 'ج.م')}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/wallet')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              walletBalance > 0
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : darkMode
                  ? 'bg-orange-900/40 text-orange-400 hover:bg-orange-900/60'
                  : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
            }`}
          >
            {walletBalance > 0
              ? t('promotionPackagesPage.chargeMore', 'شحن المزيد')
              : t('promotionPackagesPage.chargeWallet', 'شحن المحفظة')
            }
          </button>
        </div>
      </motion.div>

      {/* How It Works */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`rounded-2xl p-5 mb-6 border ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
        }`}
      >
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className={`w-5 h-5 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
          <h3 className={`font-black text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {t('promotionPackagesPage.howItWorks', 'كيف يعمل الترويج؟')}
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              icon: <Megaphone className="w-5 h-5" />,
              step: '1',
              title: t('promotionPackagesPage.step1Title', 'اختر الباقة'),
              desc: t('promotionPackagesPage.step1Desc', 'اختر باقة تناسب ميزانيتك'),
            },
            {
              icon: <CreditCard className="w-5 h-5" />,
              step: '2',
              title: t('promotionPackagesPage.step2Title', 'ادفع من المحفظة'),
              desc: t('promotionPackagesPage.step2Desc', 'يُخصم المبلغ من رصيدك'),
            },
            {
              icon: <TrendingUp className="w-5 h-5" />,
              step: '3',
              title: t('promotionPackagesPage.step3Title', 'وصل للآلاف'),
              desc: t('promotionPackagesPage.step3Desc', 'إعلانك يصل للمهتمين'),
            },
          ].map((item, idx) => (
            <div key={idx} className="text-center">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${
                darkMode ? 'bg-gray-700 text-orange-400' : 'bg-orange-50 text-orange-600'
              }`}>
                {item.icon}
              </div>
              <p className={`text-[10px] font-black mb-0.5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {item.title}
              </p>
              <p className={`text-[9px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tabs: Posts vs Market */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex-1 justify-center ${
            activeTab === 'posts'
              ? 'bg-gradient-to-l from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-200'
              : darkMode
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 shadow-sm'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          {t('promotionPackagesPage.postPromotions', 'ترويج المنشورات')}
        </button>
        <button
          onClick={() => setActiveTab('market')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex-1 justify-center ${
            activeTab === 'market'
              ? 'bg-gradient-to-l from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-200'
              : darkMode
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 shadow-sm'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          {t('promotionPackagesPage.marketPromotions', 'ترويج السوق الذكي')}
        </button>
      </div>

      {/* Packages List */}
      <div className="space-y-4">
        {currentPackages.map((pkg, idx) => {
          const isExpanded = expandedPkg === pkg.id;
          const canAfford = walletBalance >= pkg.price;
          const isPopular = pkg.id === 'premium';

          return (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className={`rounded-2xl border overflow-hidden transition-all ${
                isPopular
                  ? darkMode
                    ? 'border-purple-500/50 ring-1 ring-purple-500/20'
                    : 'border-purple-200 ring-1 ring-purple-100'
                  : darkMode
                    ? 'border-gray-700'
                    : 'border-gray-100'
              } ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
            >
              {/* Popular Badge */}
              {isPopular && (
                <div className="bg-gradient-to-l from-purple-500 to-pink-500 px-4 py-1.5 flex items-center justify-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-white" />
                  <span className="text-[10px] font-black text-white">
                    {t('promotionPackagesPage.mostPopular', 'الأكثر طلباً')}
                  </span>
                </div>
              )}

              {/* Package Header */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpandedPkg(isExpanded ? null : pkg.id)}
              >
                <div className="flex items-start gap-3">
                  {/* Package Icon */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${pkg.color} flex items-center justify-center text-xl flex-shrink-0 shadow-md`}>
                    {pkg.icon}
                  </div>

                  {/* Package Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-black text-base ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {pkg.name}
                      </h3>
                      {getTargetingIcon(pkg.targeting || 'all')}
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                        darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {getTargetingLabel(pkg.targeting || 'all')}
                      </span>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className={`flex items-center gap-1 text-[10px] font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Eye className="w-3 h-3" />
                        ~{pkg.estimatedReach.toLocaleString()} {t('promotionPackagesPage.reach', 'وصول')}
                      </span>
                      <span className={`flex items-center gap-1 text-[10px] font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Clock className="w-3 h-3" />
                        {pkg.duration} {t('common.days', 'يوم')}
                      </span>
                      <span className={`flex items-center gap-1 text-[10px] font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Bell className="w-3 h-3" />
                        {pkg.maxNotifications} {t('promotionPackagesPage.notifications', 'إشعار')}
                      </span>
                    </div>

                    {/* Features Preview */}
                    <div className="flex flex-wrap gap-1.5">
                      {pkg.features.slice(0, isExpanded ? pkg.features.length : 2).map((feature, fIdx) => (
                        <span
                          key={fIdx}
                          className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md ${
                            darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-600'
                          }`}
                        >
                          <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
                          {feature}
                        </span>
                      ))}
                      {!isExpanded && pkg.features.length > 2 && (
                        <span className={`text-[9px] font-bold px-1 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                          +{pkg.features.length - 2} {t('promotionPackagesPage.more', 'المزيد')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price + Expand */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="text-end">
                      <span className={`text-2xl font-black ${canAfford
                        ? darkMode ? 'text-green-400' : 'text-green-600'
                        : darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {pkg.price}
                      </span>
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}> {t('common.egp', 'ج.م')}</span>
                    </div>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform ${
                      darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
                    } ${isExpanded ? 'rotate-180' : ''}`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className={`px-4 pb-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                      {/* All Features */}
                      <div className="pt-4 space-y-2">
                        <h4 className={`text-[10px] font-black uppercase tracking-wider mb-2 ${
                          darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {t('promotionPackagesPage.allFeatures', 'جميع المميزات')}
                        </h4>
                        {pkg.features.map((feature, fIdx) => (
                          <div key={fIdx} className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className={`text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {feature}
                            </span>
                          </div>
                        ))}

                        {/* Messages included */}
                        {pkg.includeMessages && (
                          <div className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <span className={`text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {t('promotionPackagesPage.directMessages', 'رسائل ترويجية مباشرة')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* City Tiers for city_target package */}
                      {pkg.id === 'city_target' && (
                        <div className="mt-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowCityTiers(!showCityTiers);
                            }}
                            className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-wider mb-2 ${
                              darkMode ? 'text-orange-400' : 'text-orange-600'
                            }`}
                          >
                            <MapPin className="w-4 h-4" />
                            {t('promotionPackagesPage.cityTiers', 'أسعار استهداف المدن')}
                            {showCityTiers ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                          <AnimatePresence>
                            {showCityTiers && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="space-y-2 mt-2"
                              >
                                {cityTiers.map((tier, tIdx) => (
                                  <div
                                    key={tIdx}
                                    className={`flex items-center justify-between p-2 rounded-xl ${
                                      darkMode ? 'bg-gray-700' : 'bg-gray-50'
                                    }`}
                                  >
                                    <span className={`text-[10px] font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                      {tier.label}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[9px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        ~{(tier.estimatedReach || 0).toLocaleString()} {t('promotionPackagesPage.reach', 'وصول')}
                                      </span>
                                      <span className={`text-[10px] font-black ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                        {tier.price} {t('common.egp', 'ج.م')}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => {
                            if (activeTab === 'posts') {
                              navigate('/');
                            } else {
                              navigate('/market');
                            }
                          }}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                            canAfford
                              ? 'bg-gradient-to-l from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-200 hover:shadow-xl'
                              : darkMode
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <Zap className="w-4 h-4" />
                          {canAfford
                            ? t('promotionPackagesPage.promoteNow', 'ترويج الآن')
                            : t('promotionPackagesPage.chargeToPromote', 'شحن المحفظة للترويج')
                          }
                        </button>
                        {!canAfford && (
                          <button
                            onClick={() => navigate('/wallet')}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                              darkMode
                                ? 'bg-orange-900/40 text-orange-400 hover:bg-orange-900/60'
                                : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                            }`}
                          >
                            <Wallet className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Insufficient balance warning */}
                      {!canAfford && (
                        <div className={`mt-2 p-2 rounded-xl flex items-center gap-2 ${
                          darkMode ? 'bg-red-900/20 border border-red-800/30' : 'bg-red-50 border border-red-100'
                        }`}>
                          <Wallet className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-red-400' : 'text-red-500'}`} />
                          <span className={`text-[10px] font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                            {t('promotionPackagesPage.needMore', 'تحتاج {{amount}} ج.م إضافية في محفظتك', { amount: (pkg.price - walletBalance).toLocaleString() })}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 space-y-3"
      >
        {/* CTA: Go to promote */}
        <button
          onClick={() => {
            if (activeTab === 'posts') {
              navigate('/');
            } else {
              navigate('/market');
            }
          }}
          className="w-full bg-gradient-to-l from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white py-3.5 rounded-2xl font-black text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-orange-200"
        >
          <Zap className="w-5 h-5" />
          {activeTab === 'posts'
            ? t('promotionPackagesPage.goPromotePost', 'روّج منشورك الآن')
            : t('promotionPackagesPage.goPromoteMarket', 'روّج إعلانك في السوق')
          }
        </button>

        {/* CTA: My promotions */}
        <button
          onClick={() => navigate('/promotions')}
          className={`w-full py-3 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
            darkMode
              ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          {t('promotionPackagesPage.myPromotions', 'إعلاناتي المروجة')}
        </button>

        {/* CTA: Charge wallet */}
        {walletBalance < 50 && (
          <button
            onClick={() => navigate('/wallet')}
            className={`w-full py-3 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
              darkMode
                ? 'bg-orange-900/30 text-orange-400 hover:bg-orange-900/50 border border-orange-800/30'
                : 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-100'
            }`}
          >
            <Wallet className="w-4 h-4" />
            {t('promotionPackagesPage.chargeWalletFirst', 'اشحن محفظتك أولاً')}
          </button>
        )}
      </motion.div>

      {/* FAQ Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className={`mt-8 rounded-2xl p-5 border ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
        }`}
      >
        <div className="flex items-center gap-2 mb-4">
          <Crown className={`w-5 h-5 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
          <h3 className={`font-black text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {t('promotionPackagesPage.faqTitle', 'أسئلة شائعة')}
          </h3>
        </div>
        <div className="space-y-3">
          {[
            {
              q: t('promotionPackagesPage.faq1Q', 'كيف أروّج إعلاني؟'),
              a: t('promotionPackagesPage.faq1A', 'اذهب لإعلانك واضغط على زر "ترويج" ثم اختر الباقة المناسبة وادفع من محفظتك. سيتم مراجعة طلبك من الإدارة خلال دقائق.'),
            },
            {
              q: t('promotionPackagesPage.faq2Q', 'متى يبدأ الترويج؟'),
              a: t('promotionPackagesPage.faq2A', 'بعد الموافقة من الإدارة، يبدأ الترويج فوراً ويستمر طوال مدة الباقة المختارة. ستصل إشعارات للمستخدمين المهتمين بتصنيف إعلانك.'),
            },
            {
              q: t('promotionPackagesPage.faq3Q', 'هل يمكنني استرداد المبلغ؟'),
              a: t('promotionPackagesPage.faq3A', 'في حالة رفض طلب الترويج من الإدارة، يتم استرداد المبلغ كاملاً إلى محفظتك تلقائياً.'),
            },
            {
              q: t('promotionPackagesPage.faq4Q', 'ما الفرق بين الباقات؟'),
              a: t('promotionPackagesPage.faq4A', 'كل باقة توفر عدداً مختلفاً من الوصول والإشعارات والمدة. كلما زادت الباقة، زاد وصول إعلانك لعدد أكبر من المهتمين.'),
            },
          ].map((faq, idx) => (
            <div key={idx}>
              <p className={`text-xs font-black mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {faq.q}
              </p>
              <p className={`text-[11px] leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

// CreditCard icon for the steps section
function CreditCard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}
