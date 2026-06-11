import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3, Users, CheckCircle, DollarSign, CreditCard, Zap,
  Shield, Wallet, Star, Activity, Package, PieChart, TrendingUp,
  ArrowUpRight, ArrowDownRight, Eye, Clock, RefreshCw,
  UserCheck, AlertTriangle, ShoppingBag, Video, Heart,
  Globe, Smartphone, Monitor,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart as RePieChart, Pie, Cell,
  AreaChart, Area, LineChart, Line, Legend,
} from 'recharts';
import { DashboardStats, ChartDataPoint } from '../../types';
import { StatCard, Section, Badge, Btn, EmptyState, KPICard, ProgressBar, MetricRow, StatusDot, SubTabBar } from './shared';
import { ORANGE, PIE_COLORS, getDefaultChartData, getTooltipStyle, formatTimeAgo } from './helpers';

interface OverviewTabProps {
  stats: DashboardStats | null;
  detailedStats: any;
  chartData: ChartDataPoint[];
  posts: any[];
  realtimeStats: any;
  darkMode: boolean;
  loadRealtimeStats: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  stats, detailedStats, chartData, posts, realtimeStats, darkMode, loadRealtimeStats,
}) => {
  const { t } = useTranslation();
  const [chartPeriod, setChartPeriod] = useState<'7d' | '30d'>('7d');
  const [activeChart, setActiveChart] = useState<'area' | 'bar' | 'line'>('area');

  const defaultStats: DashboardStats = stats || { totalUsers: 0, activeAds: 0, totalTransactions: 0, dailyGrowth: 0, revenue: 0 };
  const defaultChart = chartData.length > 0 ? chartData : getDefaultChartData(t);

  const typePieData = React.useMemo(() => {
    return [
      { name: t('admin.ads'), value: posts.filter((p: any) => p.type === 'ad').length },
      { name: t('admin.news'), value: posts.filter((p: any) => p.type === 'news').length },
      { name: t('admin.statuses'), value: posts.filter((p: any) => p.type === 'status').length },
    ].filter(d => d.value > 0);
  }, [posts, t]);

  // Category distribution
  const categoryData = React.useMemo(() => {
    const catCounts: Record<string, number> = {};
    posts.forEach((p: any) => {
      const cat = p.category || t('admin.uncategorized');
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    return Object.entries(catCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [posts, t]);

  // User growth data from detailedStats
  const userGrowthData = React.useMemo(() => {
    if (detailedStats?.dailyNewUsers?.length) {
      return detailedStats.dailyNewUsers.map((d: any) => ({
        name: d.date ? new Date(d.date).toLocaleDateString('ar-EG', { weekday: 'short' }) : '',
        users: d.count,
      })).reverse();
    }
    return defaultChart.map(d => ({ name: d.name, users: Math.floor(Math.random() * 10) + 1 }));
  }, [detailedStats, defaultChart]);

  return (
    <div className="space-y-6">
      {/* ─── Realtime Stats Banner ─── */}
      {realtimeStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 text-white shadow-lg shadow-orange-500/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-20 h-20 bg-white/10 rounded-full -ml-5 -mt-5" />
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <p className="text-[10px] opacity-80 font-medium">{t('admin.onlineNow')}</p>
              </div>
              <p className="text-3xl font-black">{realtimeStats.onlineUsers}</p>
              <p className="text-[9px] opacity-60 mt-0.5">{t('admin.liveUsers')}</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg shadow-green-500/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-20 h-20 bg-white/10 rounded-full -ml-5 -mt-5" />
            <div className="relative">
              <p className="text-[10px] opacity-80 font-medium mb-1">{t('admin.postsToday')}</p>
              <p className="text-3xl font-black">{realtimeStats.newPostsToday}</p>
              <p className="text-[9px] opacity-60 mt-0.5">{t('admin.newToday')}</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-20 h-20 bg-white/10 rounded-full -ml-5 -mt-5" />
            <div className="relative">
              <p className="text-[10px] opacity-80 font-medium mb-1">{t('admin.newUsersToday')}</p>
              <p className="text-3xl font-black">{realtimeStats.newUsersToday}</p>
              <p className="text-[9px] opacity-60 mt-0.5">{t('admin.registeredToday')}</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-4 text-white shadow-lg shadow-red-500/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-20 h-20 bg-white/10 rounded-full -ml-5 -mt-5" />
            <div className="relative">
              <p className="text-[10px] opacity-80 font-medium mb-1">{t('admin.pendingItems')}</p>
              <p className="text-3xl font-black">{realtimeStats.pendingItems}</p>
              <p className="text-[9px] opacity-60 mt-0.5">{t('admin.needsAction')}</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── KPI Cards Row ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard darkMode={darkMode} icon={<Users className="w-5 h-5" />} label={t('admin.users')} value={detailedStats?.totalUsers || defaultStats.totalUsers} trend="+12%" color="#3b82f6" sparkline={[30, 40, 35, 50, 49, 60, 70]} />
        <StatCard darkMode={darkMode} icon={<CheckCircle className="w-5 h-5" />} label={t('admin.activePosts')} value={detailedStats?.activeAds || defaultStats.activeAds} trend="+8%" color="#10b981" sparkline={[20, 30, 25, 40, 35, 50, 45]} />
        <StatCard darkMode={darkMode} icon={<DollarSign className="w-5 h-5" />} label={t('admin.revenue')} value={`${detailedStats?.totalRevenue || defaultStats.revenue} ${t('common.egp')}`} trend="+23%" color="#8b5cf6" sparkline={[10, 20, 15, 30, 25, 45, 55]} />
        <StatCard darkMode={darkMode} icon={<CreditCard className="w-5 h-5" />} label={t('admin.chargeRequests')} value={detailedStats?.pendingCharging || 0} color="#f59e0b" />
        <StatCard darkMode={darkMode} icon={<Zap className="w-5 h-5" />} label={t('admin.promotionRequestsLabel')} value={detailedStats?.pendingPromotions || 0} color="#06b6d4" />
        <StatCard darkMode={darkMode} icon={<Shield className="w-5 h-5" />} label={t('admin.flaggedPosts')} value={detailedStats?.flaggedPosts || 0} color="#ef4444" />
        <StatCard darkMode={darkMode} icon={<Wallet className="w-5 h-5" />} label={t('admin.walletsBalance')} value={`${detailedStats?.totalWalletBalance || 0} ${t('common.egp')}`} color="#ec4899" />
        <StatCard darkMode={darkMode} icon={<Star className="w-5 h-5" />} label={t('admin.verifiedUsers')} value={detailedStats?.verifiedUsers || 0} color="#f59e0b" />
      </div>

      {/* ─── User Growth & Demographics Row ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Activity Chart */}
        <div className="lg:col-span-2">
          <Section
            darkMode={darkMode}
            title={t('admin.weeklyActivity')}
            icon={<BarChart3 className="w-5 h-5" />}
            action={
              <div className="flex items-center gap-2">
                <SubTabBar
                  tabs={[
                    { id: 'area', label: t('admin.chartArea') },
                    { id: 'bar', label: t('admin.chartBar') },
                    { id: 'line', label: t('admin.chartLine') },
                  ]}
                  activeTab={activeChart}
                  onTabChange={setActiveChart}
                  darkMode={darkMode}
                />
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              {activeChart === 'bar' ? (
                <BarChart data={defaultChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#1f2937' : '#f3f4f6'} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip contentStyle={getTooltipStyle(darkMode)} />
                  <Bar dataKey="ads" fill={ORANGE} radius={[6, 6, 0, 0]} />
                </BarChart>
              ) : activeChart === 'line' ? (
                <LineChart data={defaultChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#1f2937' : '#f3f4f6'} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip contentStyle={getTooltipStyle(darkMode)} />
                  <Line type="monotone" dataKey="ads" stroke={ORANGE} strokeWidth={3} dot={{ fill: ORANGE, r: 4 }} />
                </LineChart>
              ) : (
                <AreaChart data={defaultChart}>
                  <defs>
                    <linearGradient id="colorAds" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ORANGE} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={ORANGE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#1f2937' : '#f3f4f6'} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip contentStyle={getTooltipStyle(darkMode)} />
                  <Area type="monotone" dataKey="ads" stroke={ORANGE} fill="url(#colorAds)" strokeWidth={2} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </Section>
        </div>

        {/* Post Type Distribution */}
        <Section darkMode={darkMode} title={t('admin.postTypes')} icon={<PieChart className="w-5 h-5" />}>
          {typePieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={typePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {typePieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={getTooltipStyle(darkMode)} />
              </RePieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState darkMode={darkMode} icon={<BarChart3 className="w-12 h-12" />} text={t('admin.noPostsYet')} />
          )}
        </Section>
      </div>

      {/* ─── User Growth & Category Distribution ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Section darkMode={darkMode} title={t('admin.userGrowth')} icon={<TrendingUp className="w-5 h-5" />}>
          {userGrowthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={userGrowthData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#1f2937' : '#f3f4f6'} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip contentStyle={getTooltipStyle(darkMode)} />
                <Area type="monotone" dataKey="users" stroke="#3b82f6" fill="url(#colorUsers)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState darkMode={darkMode} icon={<Users className="w-12 h-12" />} text={t('admin.noUserData')} />
          )}
        </Section>

        {/* Category Distribution */}
        <Section darkMode={darkMode} title={t('admin.categoryDistribution')} icon={<BarChart3 className="w-5 h-5" />}>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#1f2937' : '#f3f4f6'} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} width={80} />
                <Tooltip contentStyle={getTooltipStyle(darkMode)} />
                <Bar dataKey="value" fill={ORANGE} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState darkMode={darkMode} icon={<BarChart3 className="w-12 h-12" />} text={t('admin.noCategoryData')} />
          )}
        </Section>
      </div>

      {/* ─── Platform Metrics & Quick Actions ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Platform Health */}
        <Section darkMode={darkMode} title={t('admin.platformHealth')} icon={<Shield className="w-5 h-5" />}>
          <div className="space-y-2">
            <MetricRow icon={<UserCheck className="w-4 h-4" />} label={t('admin.verifiedUsers')} value={detailedStats?.verifiedUsers || 0} color="#10b981" darkMode={darkMode} />
            <MetricRow icon={<AlertTriangle className="w-4 h-4" />} label={t('admin.flaggedContent')} value={detailedStats?.flaggedPosts || 0} color="#ef4444" darkMode={darkMode} />
            <MetricRow icon={<ShoppingBag className="w-4 h-4" />} label={t('admin.marketListings')} value={detailedStats?.promotedPosts || 0} color="#8b5cf6" darkMode={darkMode} />
            <MetricRow icon={<CreditCard className="w-4 h-4" />} label={t('admin.pendingCharges')} value={`${detailedStats?.pendingChargingAmount || 0} ${t('common.egp')}`} color="#f59e0b" darkMode={darkMode} />
            <MetricRow icon={<Video className="w-4 h-4" />} label={t('admin.activeStreams')} value={realtimeStats?.activeStreams || 0} color="#ec4899" darkMode={darkMode} />
            <MetricRow icon={<Heart className="w-4 h-4" />} label={t('admin.totalFriendships')} value={realtimeStats?.totalFriendships || 0} color="#06b6d4" darkMode={darkMode} />
          </div>
          {/* Platform Health Indicators */}
          <div className="mt-4 space-y-3">
            <ProgressBar value={detailedStats?.verifiedUsers || 0} max={detailedStats?.totalUsers || 1} color="#10b981" darkMode={darkMode} label={t('admin.verificationRate')} showPercent />
            <ProgressBar value={detailedStats?.activeAds || 0} max={detailedStats?.totalUsers || 1} color={ORANGE} darkMode={darkMode} label={t('admin.adPostRate')} showPercent />
          </div>
        </Section>

        {/* Financial Overview */}
        <Section darkMode={darkMode} title={t('admin.financialOverview')} icon={<Wallet className="w-5 h-5" />}>
          <div className="space-y-3">
            <KPICard
              icon={<DollarSign className="w-5 h-5" />}
              label={t('admin.totalRevenue')}
              value={`${detailedStats?.totalRevenue || 0} ${t('common.egp')}`}
              changeDirection="up"
              change={`+${t('admin.thisMonth')}`}
              color="#8b5cf6"
              darkMode={darkMode}
            />
            <div className="space-y-2 mt-3">
              <MetricRow icon={<CreditCard className="w-4 h-4" />} label={t('admin.pendingCharging')} value={detailedStats?.pendingCharging || 0} color="#f59e0b" darkMode={darkMode} />
              <MetricRow icon={<Zap className="w-4 h-4" />} label={t('admin.pendingPromotions')} value={detailedStats?.pendingPromotions || 0} color="#06b6d4" darkMode={darkMode} />
              <MetricRow icon={<ShoppingBag className="w-4 h-4" />} label={t('admin.marketPromotions')} value={detailedStats?.pendingMarketPromotions || 0} color="#ec4899" darkMode={darkMode} />
              <MetricRow icon={<Wallet className="w-4 h-4" />} label={t('admin.walletsBalance')} value={`${detailedStats?.totalWalletBalance || 0} ${t('common.egp')}`} color="#10b981" darkMode={darkMode} />
            </div>
          </div>
        </Section>

        {/* Recent Activity */}
        <Section
          darkMode={darkMode}
          title={t('admin.recentActivity')}
          icon={<Activity className="w-5 h-5" />}
          action={<Btn darkMode={darkMode} onClick={loadRealtimeStats} size="xs"><RefreshCw className="w-3 h-3" /></Btn>}
        >
          {realtimeStats?.recentActivity?.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
              {realtimeStats.recentActivity.map((item: any, i: number) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                    darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      item.type === 'user'
                        ? darkMode ? 'bg-green-900/40 text-green-400' : 'bg-green-50 text-green-500'
                        : item.type === 'post'
                          ? darkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-500'
                          : darkMode ? 'bg-purple-900/40 text-purple-400' : 'bg-purple-50 text-purple-500'
                    }`}
                  >
                    {item.type === 'user' ? <Users className="w-4 h-4" /> : item.type === 'post' ? <Package className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {item.description}
                    </p>
                    <p className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                      {item.created_at ? formatTimeAgo(item.created_at) : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState darkMode={darkMode} icon={<Activity className="w-12 h-12" />} text={t('admin.noRecentActivity')} />
          )}
        </Section>
      </div>

      {/* ─── Daily New Users Chart ─── */}
      {detailedStats?.dailyNewUsers?.length > 0 && (
        <Section darkMode={darkMode} title={t('admin.dailyNewUsers')} icon={<Users className="w-5 h-5" />}>
          <div className="grid grid-cols-7 gap-2">
            {detailedStats.dailyNewUsers.slice(0, 7).map((day: any, i: number) => {
              const maxCount = Math.max(...detailedStats.dailyNewUsers.map((d: any) => d.count));
              const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
              const dateLabel = day.date ? new Date(day.date).toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric' }) : '';
              return (
                <div key={i} className="text-center">
                  <div className={`h-24 flex items-end justify-center mb-1`}>
                    <div
                      className="w-full rounded-t-lg transition-all duration-500"
                      style={{
                        height: `${Math.max(height, 5)}%`,
                        background: `linear-gradient(180deg, ${ORANGE}, ${ORANGE}88)`,
                      }}
                    />
                  </div>
                  <p className={`text-[9px] font-bold ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{dateLabel}</p>
                  <p className={`text-xs font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{day.count}</p>
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
};
