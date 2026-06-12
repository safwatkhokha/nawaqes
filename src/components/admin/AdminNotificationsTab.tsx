import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bell, AlertTriangle, Zap, CreditCard, ShoppingBag, Flag,
  RefreshCw, Check, CheckCheck, Trash2, Clock, UserPlus,
  FileText, DollarSign, Megaphone, Newspaper, Eye,
  Filter,
} from 'lucide-react';
import { formatTimeAgo } from './helpers';
import { Badge, Btn, EmptyState } from './shared';

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isRead: boolean;
  relatedId?: string;
  relatedType?: string;
  createdAt: string;
}

interface AdminNotificationsTabProps {
  darkMode: boolean;
  // Real-time data from admin dashboard
  pendingCharging: number;
  pendingPromotions: number;
  pendingMarketPromotions: number;
  reportsCount: number;
  allNews: any[];
  activityLog: any[];
}

// Normalize activity data into admin notification format
function buildAdminNotifications(
  pendingCharging: number,
  pendingPromotions: number,
  pendingMarketPromotions: number,
  reportsCount: number,
  allNews: any[],
  activityLog: any[],
): AdminNotification[] {
  const notifications: AdminNotification[] = [];
  let counter = 0;

  // 1. Pending charging requests (urgent - money involved)
  if (pendingCharging > 0) {
    notifications.push({
      id: `notif-charging-${++counter}`,
      type: 'charging',
      title: 'طلبات شحن معلقة',
      message: `يوجد ${pendingCharging} طلب شحن محفظة بانتظار المراجعة والموافقة`,
      priority: 'urgent',
      isRead: false,
      relatedType: 'charging',
      createdAt: new Date().toISOString(),
    });
  }

  // 2. Pending post promotion requests
  if (pendingPromotions > 0) {
    notifications.push({
      id: `notif-promo-${++counter}`,
      type: 'promotion',
      title: 'طلبات ترويج منشورات معلقة',
      message: `يوجد ${pendingPromotions} طلب ترويج منشورات بانتظار الموافقة`,
      priority: 'high',
      isRead: false,
      relatedType: 'promotions',
      createdAt: new Date().toISOString(),
    });
  }

  // 3. Pending market promotion requests
  if (pendingMarketPromotions > 0) {
    notifications.push({
      id: `notif-market-promo-${++counter}`,
      type: 'market_promotion',
      title: 'طلبات ترويج السوق الذكي معلقة',
      message: `يوجد ${pendingMarketPromotions} طلب ترويج في السوق الذكي بانتظار الموافقة`,
      priority: 'high',
      isRead: false,
      relatedType: 'market-promotions',
      createdAt: new Date().toISOString(),
    });
  }

  // 4. Pending reports
  if (reportsCount > 0) {
    notifications.push({
      id: `notif-reports-${++counter}`,
      type: 'report',
      title: 'بلاغات جديدة',
      message: `يوجد ${reportsCount} بلاغ بانتظار المراجعة والمعالجة`,
      priority: 'high',
      isRead: false,
      relatedType: 'reports',
      createdAt: new Date().toISOString(),
    });
  }

  // 5. Recent activity items as notifications
  activityLog.slice(0, 15).forEach((item: any, idx: number) => {
    const actType = (item.activity_type || item.type || '').toLowerCase();
    let title = '';
    let message = '';
    let priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal';
    let notifType = 'activity';

    switch (actType) {
      case 'user':
      case 'user_register':
        title = 'مستخدم جديد';
        message = `${item.user_name || item.name || 'مستخدم'} سجّل في المنصة`;
        priority = 'low';
        notifType = 'user';
        break;
      case 'post':
        title = 'منشور جديد';
        message = item.content ? (item.content.length > 80 ? item.content.slice(0, 80) + '...' : item.content) : 'تم إنشاء منشور جديد';
        priority = 'low';
        notifType = 'post';
        break;
      case 'transaction':
        title = 'معاملة مالية';
        message = `${item.user_name || 'مستخدم'} - ${item.tx_type || 'معاملة'} ${item.amount ? item.amount + ' ج.م' : ''}`;
        priority = 'normal';
        notifType = 'transaction';
        break;
      case 'promotion':
        title = 'طلب ترويج';
        message = `${item.user_name || 'مستخدم'} طلب باقة ${item.package_name || 'ترويج'}${item.price ? ` (${item.price} ج.م)` : ''}`;
        priority = 'high';
        notifType = 'promotion';
        break;
      case 'news':
        title = 'خبر/تنبيه جديد';
        message = item.content ? (item.content.length > 80 ? item.content.slice(0, 80) + '...' : item.content) : 'تم نشر خبر جديد';
        priority = 'normal';
        notifType = 'news';
        break;
      default:
        return; // Skip unknown types
    }

    notifications.push({
      id: `notif-activity-${idx}-${++counter}`,
      type: notifType,
      title,
      message,
      priority,
      isRead: true,
      relatedType: actType,
      createdAt: item.created_at || new Date().toISOString(),
    });
  });

  // 6. Recent alerts from news items
  allNews.filter((n: any) => n.is_alert).slice(0, 5).forEach((n: any, idx: number) => {
    notifications.push({
      id: `notif-alert-${idx}-${++counter}`,
      type: 'alert',
      title: `تنبيه: ${n.title || 'تنبيه إداري'}`,
      message: n.content || 'تنبيه إداري نشط',
      priority: n.priority === 'urgent' ? 'urgent' : n.priority === 'important' ? 'high' : 'normal',
      isRead: true,
      relatedType: 'news',
      createdAt: n.created_at || new Date().toISOString(),
    });
  });

  // Sort by priority then by date
  const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
  return notifications.sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

// Icon mapping for notification types
const typeIcons: Record<string, React.ReactNode> = {
  charging: <CreditCard className="w-3.5 h-3.5" />,
  promotion: <Zap className="w-3.5 h-3.5" />,
  market_promotion: <ShoppingBag className="w-3.5 h-3.5" />,
  report: <Flag className="w-3.5 h-3.5" />,
  user: <UserPlus className="w-3.5 h-3.5" />,
  post: <FileText className="w-3.5 h-3.5" />,
  transaction: <DollarSign className="w-3.5 h-3.5" />,
  news: <Newspaper className="w-3.5 h-3.5" />,
  alert: <AlertTriangle className="w-3.5 h-3.5" />,
  activity: <Bell className="w-3.5 h-3.5" />,
};

const priorityColors: Record<string, string> = {
  urgent: 'red',
  high: 'orange',
  normal: 'blue',
  low: 'gray',
};

const typeColors: Record<string, string> = {
  charging: 'green',
  promotion: 'orange',
  market_promotion: 'emerald',
  report: 'red',
  user: 'blue',
  post: 'indigo',
  transaction: 'purple',
  news: 'cyan',
  alert: 'red',
  activity: 'gray',
};

export const AdminNotificationsTab: React.FC<AdminNotificationsTabProps> = ({
  darkMode,
  pendingCharging,
  pendingPromotions,
  pendingMarketPromotions,
  reportsCount,
  allNews,
  activityLog,
}) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<string>('all');
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());

  const allNotifications = useMemo(
    () => buildAdminNotifications(pendingCharging, pendingPromotions, pendingMarketPromotions, reportsCount, allNews, activityLog),
    [pendingCharging, pendingPromotions, pendingMarketPromotions, reportsCount, allNews, activityLog]
  );

  const unreadCount = allNotifications.filter(n => !n.isRead && !readNotifications.has(n.id)).length;

  const filteredNotifications = filter === 'all'
    ? allNotifications
    : filter === 'unread'
      ? allNotifications.filter(n => !n.isRead && !readNotifications.has(n.id))
      : allNotifications.filter(n => n.type === filter);

  // Count by type
  const typeCounts = allNotifications.reduce<Record<string, number>>((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    return acc;
  }, {});

  const typeLabels: Record<string, string> = {
    charging: 'طلبات الشحن',
    promotion: 'ترويج المنشورات',
    market_promotion: 'ترويج السوق',
    report: 'البلاغات',
    user: 'المستخدمين',
    post: 'المنشورات',
    transaction: 'المعاملات',
    news: 'الأخبار',
    alert: 'التنبيهات',
    activity: 'النشاط',
  };

  const bgColors: Record<string, string> = darkMode ? {
    charging: 'bg-green-900/40 text-green-400',
    promotion: 'bg-orange-900/40 text-orange-400',
    market_promotion: 'bg-emerald-900/40 text-emerald-400',
    report: 'bg-red-900/40 text-red-400',
    user: 'bg-blue-900/40 text-blue-400',
    post: 'bg-indigo-900/40 text-indigo-400',
    transaction: 'bg-purple-900/40 text-purple-400',
    news: 'bg-cyan-900/40 text-cyan-400',
    alert: 'bg-red-900/40 text-red-400',
    activity: 'bg-gray-700 text-gray-400',
  } : {
    charging: 'bg-green-50 text-green-500',
    promotion: 'bg-orange-50 text-orange-500',
    market_promotion: 'bg-emerald-50 text-emerald-500',
    report: 'bg-red-50 text-red-500',
    user: 'bg-blue-50 text-blue-500',
    post: 'bg-indigo-50 text-indigo-500',
    transaction: 'bg-purple-50 text-purple-500',
    news: 'bg-cyan-50 text-cyan-500',
    alert: 'bg-red-50 text-red-500',
    activity: 'bg-gray-50 text-gray-500',
  };

  const markAsRead = (id: string) => {
    setReadNotifications(prev => new Set(prev).add(id));
  };

  const markAllAsRead = () => {
    setReadNotifications(new Set(allNotifications.map(n => n.id)));
  };

  const isUnread = (n: AdminNotification) => !n.isRead && !readNotifications.has(n.id);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`${darkMode ? 'bg-red-900/20 border-red-800/30' : 'bg-red-50 border-red-100'} border rounded-xl p-3 text-center`}>
          <p className={`text-lg font-black ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{pendingCharging}</p>
          <p className={`text-[10px] font-bold ${darkMode ? 'text-red-400/70' : 'text-red-500/70'}`}>طلبات شحن</p>
        </div>
        <div className={`${darkMode ? 'bg-orange-900/20 border-orange-800/30' : 'bg-orange-50 border-orange-100'} border rounded-xl p-3 text-center`}>
          <p className={`text-lg font-black ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>{pendingPromotions}</p>
          <p className={`text-[10px] font-bold ${darkMode ? 'text-orange-400/70' : 'text-orange-500/70'}`}>ترويج منشورات</p>
        </div>
        <div className={`${darkMode ? 'bg-emerald-900/20 border-emerald-800/30' : 'bg-emerald-50 border-emerald-100'} border rounded-xl p-3 text-center`}>
          <p className={`text-lg font-black ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{pendingMarketPromotions}</p>
          <p className={`text-[10px] font-bold ${darkMode ? 'text-emerald-400/70' : 'text-emerald-500/70'}`}>ترويج سوق</p>
        </div>
        <div className={`${darkMode ? 'bg-amber-900/20 border-amber-800/30' : 'bg-amber-50 border-amber-100'} border rounded-xl p-3 text-center`}>
          <p className={`text-lg font-black ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>{reportsCount}</p>
          <p className={`text-[10px] font-bold ${darkMode ? 'text-amber-400/70' : 'text-amber-500/70'}`}>بلاغات</p>
        </div>
      </div>

      {/* Header with filter and actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'all' ? 'bg-orange-500 text-white' : darkMode ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            الكل ({allNotifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${filter === 'unread' ? 'bg-orange-500 text-white' : darkMode ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            <Eye className="w-3 h-3" />
            غير مقروء ({unreadCount})
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
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Btn darkMode={darkMode} size="xs" onClick={markAllAsRead}>
              <CheckCheck className="w-3 h-3" />
              قراءة الكل
            </Btn>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-[calc(100vh-380px)] overflow-y-auto custom-scrollbar space-y-2">
        {filteredNotifications.map((notif) => {
          const unread = isUnread(notif);
          return (
            <div
              key={notif.id}
              onClick={() => markAsRead(notif.id)}
              className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-xl border p-3 flex items-start gap-3 cursor-pointer transition-all hover:shadow-sm ${unread ? (darkMode ? 'border-l-4 border-l-orange-500' : 'border-l-4 border-l-orange-500') : ''}`}
            >
              {/* Unread dot */}
              <div className="flex flex-col items-center gap-2 pt-0.5">
                {unread && <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bgColors[notif.type] || (darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-500')}`}>
                  {typeIcons[notif.type] || <Bell className="w-3.5 h-3.5" />}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{notif.title}</span>
                  <Badge darkMode={darkMode} color={priorityColors[notif.priority]}>
                    {notif.priority === 'urgent' ? 'عاجل' : notif.priority === 'high' ? 'مهم' : notif.priority === 'normal' ? 'عادي' : 'منخفض'}
                  </Badge>
                  <Badge darkMode={darkMode} color={typeColors[notif.type] || 'gray'}>
                    {typeLabels[notif.type] || notif.type}
                  </Badge>
                </div>
                <p className={`text-[11px] mt-1 leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{notif.message}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className={`w-3 h-3 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                  <span className={`text-[9px] ${darkMode ? 'text-gray-600' : 'text-gray-300'}`}>
                    {notif.createdAt ? formatTimeAgo(notif.createdAt) : ''}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {filteredNotifications.length === 0 && (
          <EmptyState darkMode={darkMode} icon={<Bell className="w-12 h-12" />} text="لا توجد إشعارات حالياً" />
        )}
      </div>
    </div>
  );
};
