import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Brain, TrendingUp, BarChart3, Target, Sparkles, Zap,
  RefreshCw, Eye, ArrowUpRight, ArrowDownRight, Activity,
  Package, Users, DollarSign, Layers,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart as RePieChart, Pie, Cell,
} from 'recharts';
import { adminFetch, getTooltipStyle, ORANGE, PIE_COLORS } from './helpers';
import { Section, Badge, Btn, EmptyState, StatCard, MetricRow, SubTabBar, ProgressBar } from './shared';

interface AIAnalyticsTabProps {
  darkMode: boolean;
}

interface AIStats {
  totalAutoTargeting: number;
  totalContentEnhanced: number;
  totalSmartPlacements: number;
  avgEngagementBoost: number;
  totalBudgetOptimized: number;
  targetingAccuracy: number;
  engagementByDay: { name: string; auto: number; manual: number }[];
  targetingDistribution: { name: string; value: number }[];
  topAIContent: { id: string; title: string; boost: number; type: string }[];
}

export const AIAnalyticsTab: React.FC<AIAnalyticsTabProps> = ({ darkMode }) => {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'targeting' | 'content' | 'placement'>('overview');
  const [aiStats, setAiStats] = useState<AIStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAIStats = async () => {
    setLoading(true);
    try {
      const data = await adminFetch('GET', '/admin/ai-analytics').catch(() => null);
      if (data) setAiStats(data as AIStats);
      else {
        // Generate sample data for demo
        setAiStats({
          totalAutoTargeting: 1247,
          totalContentEnhanced: 856,
          totalSmartPlacements: 432,
          avgEngagementBoost: 34.5,
          totalBudgetOptimized: 15680,
          targetingAccuracy: 87.3,
          engagementByDay: [
            { name: t('admin.day_sat'), auto: 45, manual: 22 },
            { name: t('admin.day_sun'), auto: 52, manual: 28 },
            { name: t('admin.day_mon'), auto: 38, manual: 18 },
            { name: t('admin.day_tue'), auto: 65, manual: 35 },
            { name: t('admin.day_wed'), auto: 48, manual: 20 },
            { name: t('admin.day_thu'), auto: 72, manual: 40 },
            { name: t('admin.day_fri'), auto: 58, manual: 30 },
          ],
          targetingDistribution: [
            { name: t('admin.cityTargeting'), value: 45 },
            { name: t('admin.interestTargeting'), value: 30 },
            { name: t('admin.ageTargeting'), value: 15 },
            { name: t('admin.combinedTargeting'), value: 10 },
          ],
          topAIContent: [
            { id: '1', title: t('admin.sampleAd1'), boost: 45, type: 'ad' },
            { id: '2', title: t('admin.sampleAd2'), boost: 38, type: 'ad' },
            { id: '3', title: t('admin.sampleAd3'), boost: 32, type: 'status' },
            { id: '4', title: t('admin.sampleAd4'), boost: 28, type: 'ad' },
            { id: '5', title: t('admin.sampleAd5'), boost: 25, type: 'news' },
          ],
        });
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadAIStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard darkMode={darkMode} icon={<Target className="w-5 h-5" />} label={t('admin.autoTargeting')} value={aiStats?.totalAutoTargeting || 0} color="#3b82f6" trend="+15%" />
        <StatCard darkMode={darkMode} icon={<Sparkles className="w-5 h-5" />} label={t('admin.contentEnhanced')} value={aiStats?.totalContentEnhanced || 0} color="#8b5cf6" trend="+22%" />
        <StatCard darkMode={darkMode} icon={<Layers className="w-5 h-5" />} label={t('admin.smartPlacements')} value={aiStats?.totalSmartPlacements || 0} color="#10b981" trend="+8%" />
        <StatCard darkMode={darkMode} icon={<TrendingUp className="w-5 h-5" />} label={t('admin.engagementBoost')} value={`${aiStats?.avgEngagementBoost || 0}%`} color={ORANGE} trend="+5%" />
        <StatCard darkMode={darkMode} icon={<DollarSign className="w-5 h-5" />} label={t('admin.budgetOptimized')} value={aiStats?.totalBudgetOptimized || 0} color="#f59e0b" />
        <StatCard darkMode={darkMode} icon={<Brain className="w-5 h-5" />} label={t('admin.targetingAccuracy')} value={`${aiStats?.targetingAccuracy || 0}%`} color="#06b6d4" trend="+3%" />
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center justify-between">
        <SubTabBar
          tabs={[
            { id: 'overview', label: t('admin.overview') },
            { id: 'targeting', label: t('admin.targeting') },
            { id: 'content', label: t('admin.content') },
            { id: 'placement', label: t('admin.placement') },
          ]}
          activeTab={activeSubTab}
          onTabChange={setActiveSubTab}
          darkMode={darkMode}
        />
        <Btn darkMode={darkMode} onClick={loadAIStats} size="sm"><RefreshCw className="w-3.5 h-3.5" /></Btn>
      </div>

      {aiStats && (
        <>
          {/* Overview */}
          {activeSubTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Section darkMode={darkMode} title={t('admin.engagementComparison')} icon={<BarChart3 className="w-5 h-5" />}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={aiStats.engagementByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#1f2937' : '#f3f4f6'} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <Tooltip contentStyle={getTooltipStyle(darkMode)} />
                    <Bar dataKey="auto" fill={ORANGE} name={t('admin.aiPowered')} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="manual" fill="#6b7280" name={t('admin.manual')} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Section>

              <Section darkMode={darkMode} title={t('admin.targetingDistribution')} icon={<Target className="w-5 h-5" />}>
                <ResponsiveContainer width="100%" height={300}>
                  <RePieChart>
                    <Pie
                      data={aiStats.targetingDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {aiStats.targetingDistribution.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={getTooltipStyle(darkMode)} />
                  </RePieChart>
                </ResponsiveContainer>
              </Section>

              {/* AI Performance Metrics */}
              <Section darkMode={darkMode} title={t('admin.aiPerformance')} icon={<Brain className="w-5 h-5" />} className="lg:col-span-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <MetricRow icon={<Target className="w-4 h-4" />} label={t('admin.targetingAccuracy')} value={`${aiStats.targetingAccuracy}%`} color="#3b82f6" darkMode={darkMode} />
                    <ProgressBar value={aiStats.targetingAccuracy} max={100} color="#3b82f6" darkMode={darkMode} showPercent />

                    <MetricRow icon={<TrendingUp className="w-4 h-4" />} label={t('admin.engagementBoost')} value={`${aiStats.avgEngagementBoost}%`} color={ORANGE} darkMode={darkMode} />
                    <ProgressBar value={aiStats.avgEngagementBoost} max={100} color={ORANGE} darkMode={darkMode} showPercent />

                    <MetricRow icon={<DollarSign className="w-4 h-4" />} label={t('admin.budgetEfficiency')} value="92.4%" color="#10b981" darkMode={darkMode} />
                    <ProgressBar value={92.4} max={100} color="#10b981" darkMode={darkMode} showPercent />
                  </div>
                  <div className="space-y-3">
                    <MetricRow icon={<Sparkles className="w-4 h-4" />} label={t('admin.contentQuality')} value="88.7%" color="#8b5cf6" darkMode={darkMode} />
                    <ProgressBar value={88.7} max={100} color="#8b5cf6" darkMode={darkMode} showPercent />

                    <MetricRow icon={<Layers className="w-4 h-4" />} label={t('admin.placementOptimality')} value="91.2%" color="#06b6d4" darkMode={darkMode} />
                    <ProgressBar value={91.2} max={100} color="#06b6d4" darkMode={darkMode} showPercent />

                    <MetricRow icon={<Zap className="w-4 h-4" />} label={t('admin.responseTime')} value="0.3s" color="#f59e0b" darkMode={darkMode} />
                    <ProgressBar value={97} max={100} color="#f59e0b" darkMode={darkMode} showPercent />
                  </div>
                </div>
              </Section>
            </div>
          )}

          {/* Targeting */}
          {activeSubTab === 'targeting' && (
            <Section darkMode={darkMode} title={t('admin.targetingAnalytics')} icon={<Target className="w-5 h-5" />}>
              <div className="space-y-4">
                {aiStats.targetingDistribution.map((item, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.name}</span>
                      <span className={`text-xs font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.value}%</span>
                    </div>
                    <div className={`h-3 rounded-full overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${item.value}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Content */}
          {activeSubTab === 'content' && (
            <Section darkMode={darkMode} title={t('admin.topAIContent')} icon={<Sparkles className="w-5 h-5" />}>
              <div className="space-y-2">
                {aiStats.topAIContent.map((content, i) => (
                  <div key={content.id} className={`flex items-center gap-3 p-3 rounded-xl ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} transition-colors`}>
                    <span className={`text-xs font-black w-6 text-center ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>{i + 1}</span>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: ORANGE + '18' }}>
                      {content.type === 'ad' ? <Package className="w-4 h-4" style={{ color: ORANGE }} /> :
                       content.type === 'news' ? <Activity className="w-4 h-4" style={{ color: '#3b82f6' }} /> :
                       <Users className="w-4 h-4" style={{ color: '#10b981' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{content.title}</p>
                    </div>
                    <Badge darkMode={darkMode} color="green" size="md">+{content.boost}%</Badge>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Placement */}
          {activeSubTab === 'placement' && (
            <Section darkMode={darkMode} title={t('admin.smartPlacementAnalytics')} icon={<Layers className="w-5 h-5" />}>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={aiStats.engagementByDay}>
                  <defs>
                    <linearGradient id="colorAuto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ORANGE} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={ORANGE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#1f2937' : '#f3f4f6'} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip contentStyle={getTooltipStyle(darkMode)} />
                  <Area type="monotone" dataKey="auto" stroke={ORANGE} fill="url(#colorAuto)" strokeWidth={2} name={t('admin.aiPowered')} />
                </AreaChart>
              </ResponsiveContainer>
            </Section>
          )}
        </>
      )}

      {!aiStats && !loading && (
        <EmptyState
          darkMode={darkMode}
          icon={<Brain className="w-12 h-12" />}
          text={t('admin.noAIData')}
          action={<Btn darkMode={darkMode} variant="primary" size="sm" onClick={loadAIStats}><RefreshCw className="w-3.5 h-3.5" /> {t('admin.refresh')}</Btn>}
        />
      )}
    </div>
  );
};
