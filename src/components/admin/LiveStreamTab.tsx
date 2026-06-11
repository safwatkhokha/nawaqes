import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Video, Users, Eye, Clock, AlertTriangle, Ban, Play, Square,
  RefreshCw, Search, TrendingUp, Radio, Monitor,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch, formatTimeAgo, inputClass } from './helpers';
import { Section, Badge, Btn, EmptyState, StatCard, MetricRow, SubTabBar, Modal } from './shared';

interface LiveStreamTabProps {
  darkMode: boolean;
}

interface StreamInfo {
  id: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  title: string;
  viewerCount: number;
  startedAt: string;
  isActive: boolean;
  category: string;
}

export const LiveStreamTab: React.FC<LiveStreamTabProps> = ({ darkMode }) => {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'history'>('active');
  const [streams, setStreams] = useState<StreamInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStream, setSelectedStream] = useState<StreamInfo | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [streamStats, setStreamStats] = useState<any>(null);

  const loadStreams = async () => {
    setLoading(true);
    try {
      const data = await adminFetch('GET', '/admin/livestreams').catch(() => []);
      if (Array.isArray(data)) {
        setStreams(data.map((s: any) => ({
          id: s.id,
          hostId: s.host_id || s.hostId,
          hostName: s.host_name || s.hostName || t('common.user'),
          hostAvatar: s.host_avatar || s.hostAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.host_id}`,
          title: s.title || t('admin.untitledStream'),
          viewerCount: s.viewer_count || s.viewerCount || 0,
          startedAt: s.started_at || s.startedAt || '',
          isActive: s.is_active ?? s.isActive ?? true,
          category: s.category || t('admin.general'),
        })));
      }
    } catch {}
    setLoading(false);
  };

  const loadStreamStats = async () => {
    try {
      const data = await adminFetch('GET', '/admin/livestream-stats').catch(() => null);
      if (data) setStreamStats(data);
    } catch {}
  };

  useEffect(() => {
    loadStreams();
    loadStreamStats();
  }, []);

  const handleEndStream = async (streamId: string) => {
    if (!confirm(t('admin.confirmEndStream'))) return;
    try {
      await adminFetch('PATCH', `/admin/livestreams/${streamId}/end`);
      toast.success(t('admin.streamEnded'));
      loadStreams();
      loadStreamStats();
    } catch {
      toast.error(t('admin.operationFailed'));
    }
  };

  const handleViewStream = (stream: StreamInfo) => {
    setSelectedStream(stream);
    setShowDetailModal(true);
  };

  const activeStreams = streams.filter(s => s.isActive);
  const pastStreams = streams.filter(s => !s.isActive);
  const totalViewers = activeStreams.reduce((sum, s) => sum + s.viewerCount, 0);

  const displayedStreams = activeSubTab === 'active'
    ? activeStreams.filter(s => !searchQuery || s.hostName.toLowerCase().includes(searchQuery.toLowerCase()) || s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : pastStreams.filter(s => !searchQuery || s.hostName.toLowerCase().includes(searchQuery.toLowerCase()) || s.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard darkMode={darkMode} icon={<Radio className="w-5 h-5" />} label={t('admin.activeStreams')} value={activeStreams.length} color="#ef4444" />
        <StatCard darkMode={darkMode} icon={<Eye className="w-5 h-5" />} label={t('admin.totalViewers')} value={totalViewers} color="#3b82f6" />
        <StatCard darkMode={darkMode} icon={<Video className="w-5 h-5" />} label={t('admin.totalStreams')} value={streams.length} color="#8b5cf6" />
        <StatCard darkMode={darkMode} icon={<TrendingUp className="w-5 h-5" />} label={t('admin.avgViewers')} value={activeStreams.length > 0 ? Math.round(totalViewers / activeStreams.length) : 0} color="#10b981" />
      </div>

      {/* Sub Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <SubTabBar
          tabs={[
            { id: 'active', label: t('admin.activeNow'), count: activeStreams.length },
            { id: 'history', label: t('admin.streamHistory'), count: pastStreams.length },
          ]}
          activeTab={activeSubTab}
          onTabChange={setActiveSubTab}
          darkMode={darkMode}
        />
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className={`absolute right-3 top-2.5 w-4 h-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t('admin.searchStreams')} className={inputClass(darkMode) + ' pr-10 w-48'} />
          </div>
          <Btn darkMode={darkMode} onClick={() => { loadStreams(); loadStreamStats(); }} size="sm"><RefreshCw className="w-3.5 h-3.5" /></Btn>
        </div>
      </div>

      {/* Stream List */}
      {displayedStreams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedStreams.map(stream => (
            <div key={stream.id} className={`${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} rounded-2xl border overflow-hidden`}>
              {/* Stream Preview Header */}
              <div className="relative bg-gradient-to-br from-red-500 to-orange-500 h-32 flex items-center justify-center">
                <Video className="w-12 h-12 text-white/40" />
                {stream.isActive && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-600 text-white px-2 py-1 rounded-full">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-[9px] font-bold">{t('admin.live')}</span>
                  </div>
                )}
                <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/40 text-white px-2 py-1 rounded-full">
                  <Eye className="w-3 h-3" />
                  <span className="text-[10px] font-bold">{stream.viewerCount}</span>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <img src={stream.hostAvatar} alt="" className="w-10 h-10 rounded-xl border-2 border-red-300" />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-black truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stream.hostName}</p>
                    <p className={`text-xs truncate ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{stream.title}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge darkMode={darkMode} color="red" size="sm">{stream.category}</Badge>
                    {stream.startedAt && (
                      <span className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                        <Clock className="w-3 h-3 inline mr-1" />
                        {formatTimeAgo(stream.startedAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Btn darkMode={darkMode} size="xs" variant="outline" onClick={() => handleViewStream(stream)}>
                      <Monitor className="w-3 h-3" />
                    </Btn>
                    {stream.isActive && (
                      <Btn darkMode={darkMode} size="xs" variant="danger" onClick={() => handleEndStream(stream.id)}>
                        <Square className="w-3 h-3" />
                      </Btn>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          darkMode={darkMode}
          icon={<Radio className="w-12 h-12" />}
          text={activeSubTab === 'active' ? t('admin.noActiveStreams') : t('admin.noStreamHistory')}
          action={<Btn darkMode={darkMode} variant="primary" size="sm" onClick={loadStreams}><RefreshCw className="w-3.5 h-3.5" /> {t('admin.refresh')}</Btn>}
        />
      )}

      {/* Stream Detail Modal */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title={t('admin.streamDetails')} darkMode={darkMode} icon={<Video className="w-5 h-5" />}>
        {selectedStream && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src={selectedStream.hostAvatar} alt="" className="w-14 h-14 rounded-xl" />
              <div>
                <p className={`font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedStream.hostName}</p>
                <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{selectedStream.title}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl p-3 text-center`}>
                <Eye className={`w-5 h-5 mx-auto mb-1 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                <p className={`font-black text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedStream.viewerCount}</p>
                <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.viewers')}</p>
              </div>
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl p-3 text-center`}>
                <Clock className={`w-5 h-5 mx-auto mb-1 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />
                <p className={`font-black text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {selectedStream.startedAt ? formatTimeAgo(selectedStream.startedAt) : '-'}
                </p>
                <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.duration')}</p>
              </div>
            </div>
            {selectedStream.isActive && (
              <Btn darkMode={darkMode} variant="danger" fullWidth onClick={() => { handleEndStream(selectedStream.id); setShowDetailModal(false); }}>
                <Square className="w-4 h-4" /> {t('admin.endStream')}
              </Btn>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
