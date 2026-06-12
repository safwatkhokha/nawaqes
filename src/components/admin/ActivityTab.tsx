import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Package, DollarSign, Zap, Flag, Activity, UserPlus, FileText, CreditCard, Megaphone, RefreshCw, Newspaper } from 'lucide-react';
import { formatTimeAgo } from './helpers';
import { ActivityItem } from './types';
import { Badge, EmptyState, Btn } from './shared';

interface ActivityTabProps {
  activityLog: ActivityItem[];
  darkMode: boolean;
  loadActivityLog: () => void;
}

// Normalize activity_type to a display category
function normalizeType(raw: string | undefined): string {
  if (!raw) return 'post';
  const lower = raw.toLowerCase();
  if (lower === 'user' || lower === 'user_register') return 'user';
  if (lower === 'post') return 'post';
  if (lower === 'transaction') return 'transaction';
  if (lower === 'promotion') return 'promotion';
  if (lower === 'report') return 'report';
  if (lower === 'news') return 'news';
  return lower;
}

// Build a human-readable description for each activity item
function buildDescription(item: ActivityItem, t: (key: string, options?: Record<string, string | number>) => string): string {
  const type = normalizeType(item.activity_type || item.type);
  const userName = item.user_name || t('admin.unknown');

  switch (type) {
    case 'user':
      return t('admin.activityUserRegistered', { name: userName });
    case 'post': {
      const preview = item.content
        ? item.content.length > 60 ? item.content.slice(0, 60) + '...' : item.content
        : '';
      return t('admin.activityNewPost', { name: userName, preview });
    }
    case 'transaction': {
      const txType = item.tx_type || item.type || '';
      const amount = item.amount ? `${item.amount} ${t('common.egp')}` : '';
      return t('admin.activityTransaction', { name: userName, type: txType, amount });
    }
    case 'promotion': {
      const pkg = item.package_name || '';
      return t('admin.activityPromotion', { name: userName, package: pkg });
    }
    case 'news': {
      const preview = item.content
        ? item.content.length > 60 ? item.content.slice(0, 60) + '...' : item.content
        : '';
      return t('admin.activityNews', { name: userName, preview }) || `خبر جديد: ${preview}`;
    }
    case 'report':
      return t('admin.activityReport', { name: userName });
    default:
      return item.content || item.package_name || item.tx_type || '';
  }
}

export const ActivityTab: React.FC<ActivityTabProps> = ({ activityLog, darkMode, loadActivityLog }) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  const colors: Record<string, string> = { user: 'green', post: 'blue', transaction: 'purple', promotion: 'orange', report: 'red', news: 'cyan' };
  const typeLabels: Record<string, string> = {
    user: t('admin.activityTypeUser'),
    post: t('admin.activityTypePost'),
    transaction: t('admin.activityTypeTransaction'),
    promotion: t('admin.activityTypePromotion'),
    report: t('admin.activityTypeReport'),
    news: t('admin.activityTypeNews', 'أخبار'),
  };
  const icons: Record<string, React.ReactNode> = {
    user: <UserPlus className="w-3.5 h-3.5" />,
    post: <FileText className="w-3.5 h-3.5" />,
    transaction: <CreditCard className="w-3.5 h-3.5" />,
    promotion: <Megaphone className="w-3.5 h-3.5" />,
    report: <Flag className="w-3.5 h-3.5" />,
    news: <Newspaper className="w-3.5 h-3.5" />,
  };
  const bgColors: Record<string, string> = darkMode ? {
    user: 'bg-green-900/40 text-green-400',
    post: 'bg-blue-900/40 text-blue-400',
    transaction: 'bg-purple-900/40 text-purple-400',
    promotion: 'bg-orange-900/40 text-orange-400',
    report: 'bg-red-900/40 text-red-400',
    news: 'bg-cyan-900/40 text-cyan-400',
  } : {
    user: 'bg-green-50 text-green-500',
    post: 'bg-blue-50 text-blue-500',
    transaction: 'bg-purple-50 text-purple-500',
    promotion: 'bg-orange-50 text-orange-500',
    report: 'bg-red-50 text-red-500',
    news: 'bg-cyan-50 text-cyan-500',
  };

  // Filter activities
  const filteredLog = filter === 'all'
    ? activityLog
    : activityLog.filter(item => normalizeType(item.activity_type || item.type) === filter);

  // Count by type
  const typeCounts = activityLog.reduce<Record<string, number>>((acc, item) => {
    const type = normalizeType(item.activity_type || item.type);
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const handleRefresh = async () => {
    setLoading(true);
    loadActivityLog();
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <div className="space-y-4">
      {/* Header with filter and refresh */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'all' ? 'bg-orange-500 text-white' : darkMode ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            {t('common.all')} ({activityLog.length})
          </button>
          {Object.entries(typeCounts).map(([type, count]) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === type ? 'bg-orange-500 text-white' : darkMode ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              {typeLabels[type] || type} ({count})
            </button>
          ))}
        </div>
        <Btn darkMode={darkMode} size="xs" onClick={handleRefresh}>
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          {t('admin.update')}
        </Btn>
      </div>

      {/* Activity List */}
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar space-y-2">
        {filteredLog.map((item, i) => {
          const displayType = normalizeType(item.activity_type || item.type);
          const description = buildDescription(item, t);
          return (
            <div key={item.id || i} className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-xl border p-3 flex items-center gap-3`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bgColors[displayType] || (darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-500')}`}>
                {icons[displayType] || <Activity className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {description}
                </p>
                <p className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-gray-300'}`}>{item.created_at ? formatTimeAgo(item.created_at) : ''}</p>
              </div>
              <Badge darkMode={darkMode} color={colors[displayType] || 'gray'}>{typeLabels[displayType] || displayType}</Badge>
            </div>
          );
        })}
        {filteredLog.length === 0 && <EmptyState darkMode={darkMode} icon={<Activity className="w-12 h-12" />} text={t('admin.noActivity')} />}
      </div>
    </div>
  );
};
