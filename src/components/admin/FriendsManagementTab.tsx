import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Heart, Users, UserPlus, UserMinus, Shield, Search, RefreshCw,
  CheckCircle, XCircle, Clock, AlertTriangle, TrendingUp, BarChart3,
  Eye, Ban, Unlock,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch, formatTimeAgo, inputClass, selectClass } from './helpers';
import { Section, Badge, Btn, Modal, EmptyState, StatCard, SubTabBar, DataTable, MetricRow } from './shared';

interface FriendsManagementTabProps {
  darkMode: boolean;
}

interface FriendshipData {
  id: string;
  requester_id: string;
  addressee_id: string;
  requester_name: string;
  addressee_name: string;
  requester_avatar: string;
  addressee_avatar: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
}

interface FriendStats {
  totalFriendships: number;
  pendingRequests: number;
  activeFriendships: number;
  blockedUsers: number;
  newThisWeek: number;
  avgFriendsPerUser: number;
  topConnectors: { user_id: string; name: string; avatar: string; friendCount: number }[];
}

export const FriendsManagementTab: React.FC<FriendsManagementTabProps> = ({ darkMode }) => {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'all' | 'pending' | 'blocked'>('overview');
  const [friendships, setFriendships] = useState<FriendshipData[]>([]);
  const [friendStats, setFriendStats] = useState<FriendStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadFriendships = async () => {
    setLoading(true);
    try {
      const data = await adminFetch('GET', '/admin/friendships?limit=200').catch(() => []);
      if (Array.isArray(data)) {
        setFriendships(data.map((f: any) => ({
          id: f.id,
          requester_id: f.requester_id,
          addressee_id: f.addressee_id,
          requester_name: f.requester_name || t('common.user'),
          addressee_name: f.addressee_name || t('common.user'),
          requester_avatar: f.requester_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.requester_id}`,
          addressee_avatar: f.addressee_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.addressee_id}`,
          status: f.status || 'pending',
          created_at: f.created_at || '',
        })));
      }
    } catch {}
    setLoading(false);
  };

  const loadFriendStats = async () => {
    try {
      const data = await adminFetch('GET', '/admin/friend-stats').catch(() => null);
      if (data) setFriendStats(data as FriendStats);
    } catch {}
  };

  useEffect(() => {
    loadFriendships();
    loadFriendStats();
  }, []);

  const filteredFriendships = useMemo(() => {
    let result = friendships;
    if (activeSubTab === 'pending') result = friendships.filter(f => f.status === 'pending');
    else if (activeSubTab === 'blocked') result = friendships.filter(f => f.status === 'blocked');
    else if (activeSubTab === 'all') result = friendships.filter(f => f.status === 'accepted');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f =>
        f.requester_name.toLowerCase().includes(q) || f.addressee_name.toLowerCase().includes(q)
      );
    }
    return result;
  }, [friendships, activeSubTab, searchQuery]);

  const handleForceAccept = async (id: string) => {
    try {
      await adminFetch('PATCH', `/admin/friendships/${id}/accept`);
      toast.success(t('admin.friendForceAccepted'));
      loadFriendships();
      loadFriendStats();
    } catch {
      toast.error(t('admin.operationFailed'));
    }
  };

  const handleForceRemove = async (id: string) => {
    if (!confirm(t('admin.confirmRemoveFriendship'))) return;
    try {
      await adminFetch('DELETE', `/admin/friendships/${id}`);
      toast.success(t('admin.friendshipRemoved'));
      loadFriendships();
      loadFriendStats();
    } catch {
      toast.error(t('admin.operationFailed'));
    }
  };

  const handleForceUnblock = async (id: string) => {
    try {
      await adminFetch('PATCH', `/admin/friendships/${id}/unblock`);
      toast.success(t('admin.userUnblocked'));
      loadFriendships();
      loadFriendStats();
    } catch {
      toast.error(t('admin.operationFailed'));
    }
  };

  const pendingCount = friendships.filter(f => f.status === 'pending').length;
  const blockedCount = friendships.filter(f => f.status === 'blocked').length;
  const acceptedCount = friendships.filter(f => f.status === 'accepted').length;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard darkMode={darkMode} icon={<Heart className="w-5 h-5" />} label={t('admin.totalFriendships')} value={friendStats?.totalFriendships || acceptedCount} color="#ec4899" trend="+5%" />
        <StatCard darkMode={darkMode} icon={<Clock className="w-5 h-5" />} label={t('admin.pendingRequests')} value={friendStats?.pendingRequests || pendingCount} color="#f59e0b" />
        <StatCard darkMode={darkMode} icon={<Ban className="w-5 h-5" />} label={t('admin.blockedUsers')} value={friendStats?.blockedUsers || blockedCount} color="#ef4444" />
        <StatCard darkMode={darkMode} icon={<TrendingUp className="w-5 h-5" />} label={t('admin.newThisWeek')} value={friendStats?.newThisWeek || 0} color="#10b981" />
      </div>

      {/* Sub Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <SubTabBar
          tabs={[
            { id: 'overview', label: t('admin.overview'), count: friendships.length },
            { id: 'all', label: t('admin.activeFriends'), count: acceptedCount },
            { id: 'pending', label: t('admin.pendingRequests'), count: pendingCount },
            { id: 'blocked', label: t('admin.blockedUsers'), count: blockedCount },
          ]}
          activeTab={activeSubTab}
          onTabChange={setActiveSubTab}
          darkMode={darkMode}
        />
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className={`absolute right-3 top-2.5 w-4 h-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('admin.searchFriendships')}
              className={inputClass(darkMode) + ' pr-10 w-48'}
            />
          </div>
          <Btn darkMode={darkMode} onClick={() => { loadFriendships(); loadFriendStats(); }} size="sm">
            <RefreshCw className="w-3.5 h-3.5" />
          </Btn>
        </div>
      </div>

      {/* Overview Tab */}
      {activeSubTab === 'overview' && friendStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section darkMode={darkMode} title={t('admin.friendshipStats')} icon={<BarChart3 className="w-5 h-5" />}>
            <div className="space-y-2">
              <MetricRow icon={<Users className="w-4 h-4" />} label={t('admin.avgFriendsPerUser')} value={friendStats.avgFriendsPerUser?.toFixed(1) || '0'} color="#3b82f6" darkMode={darkMode} />
              <MetricRow icon={<Heart className="w-4 h-4" />} label={t('admin.activeFriendships')} value={friendStats.activeFriendships || acceptedCount} color="#ec4899" darkMode={darkMode} />
              <MetricRow icon={<Clock className="w-4 h-4" />} label={t('admin.pendingRequests')} value={friendStats.pendingRequests || pendingCount} color="#f59e0b" darkMode={darkMode} />
              <MetricRow icon={<Ban className="w-4 h-4" />} label={t('admin.blockedUsers')} value={friendStats.blockedUsers || blockedCount} color="#ef4444" darkMode={darkMode} />
              <MetricRow icon={<TrendingUp className="w-4 h-4" />} label={t('admin.newThisWeek')} value={friendStats.newThisWeek || 0} color="#10b981" darkMode={darkMode} />
            </div>
          </Section>

          <Section darkMode={darkMode} title={t('admin.topConnectors')} icon={<Users className="w-5 h-5" />}>
            {friendStats.topConnectors?.length > 0 ? (
              <div className="space-y-2">
                {friendStats.topConnectors.slice(0, 10).map((user, i) => (
                  <div key={user.user_id} className={`flex items-center gap-3 p-2.5 rounded-xl ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} transition-colors`}>
                    <span className={`text-xs font-black w-6 text-center ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>{i + 1}</span>
                    <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.user_id}`} alt="" className="w-8 h-8 rounded-lg" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{user.name}</p>
                    </div>
                    <Badge darkMode={darkMode} color="pink">{user.friendCount} {t('admin.friends')}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState darkMode={darkMode} icon={<Users className="w-12 h-12" />} text={t('admin.noData')} />
            )}
          </Section>
        </div>
      )}

      {/* Friendships List */}
      {activeSubTab !== 'overview' && (
        <Section darkMode={darkMode} title={t('admin.friendshipList')} icon={<Heart className="w-5 h-5" />} noPadding>
          {filteredFriendships.length > 0 ? (
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {filteredFriendships.map(f => (
                <div key={f.id} className={`flex items-center gap-3 px-5 py-3.5 ${darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'} transition-colors`}>
                  {/* Requester */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <img src={f.requester_avatar} alt="" className="w-8 h-8 rounded-lg shrink-0" />
                    <p className={`text-xs font-bold truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{f.requester_name}</p>
                  </div>

                  {/* Status */}
                  <div className="shrink-0">
                    {f.status === 'pending' && <Badge darkMode={darkMode} color="amber" dot>{t('admin.pending')}</Badge>}
                    {f.status === 'accepted' && <Badge darkMode={darkMode} color="green" dot>{t('admin.accepted')}</Badge>}
                    {f.status === 'blocked' && <Badge darkMode={darkMode} color="red" dot>{t('admin.blocked')}</Badge>}
                  </div>

                  {/* Arrow */}
                  <span className={`text-lg ${darkMode ? 'text-gray-700' : 'text-gray-300'}`}>←</span>

                  {/* Addressee */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <img src={f.addressee_avatar} alt="" className="w-8 h-8 rounded-lg shrink-0" />
                    <p className={`text-xs font-bold truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{f.addressee_name}</p>
                  </div>

                  {/* Date */}
                  <span className={`text-[10px] font-medium shrink-0 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    {f.created_at ? formatTimeAgo(f.created_at) : ''}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {f.status === 'pending' && (
                      <Btn darkMode={darkMode} size="xs" variant="success" onClick={() => handleForceAccept(f.id)} title={t('admin.forceAccept')}>
                        <CheckCircle className="w-3 h-3" />
                      </Btn>
                    )}
                    {f.status === 'blocked' && (
                      <Btn darkMode={darkMode} size="xs" variant="success" onClick={() => handleForceUnblock(f.id)} title={t('admin.forceUnblock')}>
                        <Unlock className="w-3 h-3" />
                      </Btn>
                    )}
                    <Btn darkMode={darkMode} size="xs" variant="danger" onClick={() => handleForceRemove(f.id)} title={t('admin.removeFriendship')}>
                      <XCircle className="w-3 h-3" />
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState darkMode={darkMode} icon={<Heart className="w-12 h-12" />} text={t('admin.noFriendshipsFound')} />
          )}
        </Section>
      )}
    </div>
  );
};
