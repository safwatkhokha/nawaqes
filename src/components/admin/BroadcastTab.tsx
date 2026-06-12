import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Radio, Send, RefreshCw, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch, formatTimeAgo } from './helpers';
import { Btn, Badge, EmptyState } from './shared';

interface BroadcastRecord {
  id: string;
  title: string;
  message: string;
  type: string;
  recipientCount: number;
  sentAt: string;
}

interface BroadcastTabProps {
  darkMode: boolean;
}

export const BroadcastTab: React.FC<BroadcastTabProps> = ({ darkMode }) => {
  const { t } = useTranslation();
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState<'system' | 'alert' | 'promotion'>('system');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastHistory, setBroadcastHistory] = useState<BroadcastRecord[]>([]);

  // Load broadcast history from news_items that are alerts
  const loadBroadcastHistory = async () => {
    try {
      const data = await adminFetch('GET', '/admin/news?limit=20').catch(() => []);
      if (Array.isArray(data)) {
        // Filter for alert-type news items (these are effectively broadcasts)
        const alertItems = data
          .filter((n: any) => n.is_alert)
          .map((n: any) => ({
            id: n.id,
            title: n.title || '',
            message: n.content || '',
            type: n.category === 'urgent' ? 'alert' : n.category === 'promotion' ? 'promotion' : 'system',
            recipientCount: 0, // We don't store this per-broadcast
            sentAt: n.created_at || '',
          }));
        setBroadcastHistory(alertItems);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    loadBroadcastHistory();
  }, []);

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) { toast.error(t('admin.enterBroadcastMessage')); return; }
    setBroadcastSending(true);
    try {
      const result = await adminFetch('POST', '/admin/broadcast', {
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        type: broadcastType,
      });
      const count = (result as any).count || 0;
      toast.success(t('admin.broadcastSent', { count }));

      // Add to local history for immediate display
      setBroadcastHistory(prev => [{
        id: `bc_${Date.now()}`,
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        type: broadcastType,
        recipientCount: count,
        sentAt: new Date().toISOString(),
      }, ...prev]);

      setBroadcastTitle('');
      setBroadcastMessage('');

      // Also reload history from server to keep in sync
      loadBroadcastHistory();
    } catch { toast.error(t('admin.broadcastFailed')); }
    finally { setBroadcastSending(false); }
  };

  const typeConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    system: { label: t('admin.type_system'), color: 'blue', icon: <Radio className="w-3.5 h-3.5" /> },
    alert: { label: t('admin.type_alert'), color: 'red', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    promotion: { label: t('admin.type_promotion'), color: 'orange', icon: <Send className="w-3.5 h-3.5" /> },
  };

  return (
    <div className="space-y-6">
      {/* Send Broadcast Form */}
      <div className={`max-w-2xl mx-auto ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl border p-6 space-y-4`}>
        <h3 className={`text-sm font-black flex items-center gap-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          <Radio className="w-4 h-4 text-orange-500" />{t('admin.sendBroadcast')}
        </h3>
        <div className="flex gap-2">
          {(['system', 'alert', 'promotion'] as const).map(type => (
            <button key={type} onClick={() => setBroadcastType(type)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${broadcastType === type ? 'bg-orange-500 text-white shadow-sm' : darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
              {type === 'system' ? t('admin.type_system') : type === 'alert' ? t('admin.type_alert') : t('admin.type_promotion')}
            </button>
          ))}
        </div>
        <input value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)} placeholder={t('admin.broadcastTitle')} className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:border-orange-300 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-200'}`} />
        <textarea value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder={t('admin.broadcastMessage')} rows={4} className={`w-full px-3 py-2 rounded-xl border text-sm resize-none focus:outline-none focus:border-orange-300 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'}`} />
        <div className="flex justify-end">
          <Btn darkMode={darkMode} variant="primary" size="md" onClick={handleBroadcast} disabled={broadcastSending}>
            {broadcastSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {broadcastSending ? t('admin.sending') : t('admin.sendToAll')}
          </Btn>
        </div>
      </div>

      {/* Broadcast History */}
      <div className={`max-w-2xl mx-auto ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl border p-5 space-y-3`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-black flex items-center gap-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            <Clock className="w-4 h-4 text-orange-500" />{t('admin.broadcastHistory')}
          </h3>
          <button
            onClick={loadBroadcastHistory}
            className={`text-xs font-bold ${darkMode ? 'text-gray-500 hover:text-orange-400' : 'text-gray-400 hover:text-orange-500'}`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {broadcastHistory.length === 0 ? (
          <EmptyState darkMode={darkMode} icon={<Radio className="w-12 h-12" />} text={t('admin.noBroadcasts')} />
        ) : (
          <div className="space-y-2 max-h-[calc(100vh-500px)] overflow-y-auto custom-scrollbar">
            {broadcastHistory.map((record) => {
              const config = typeConfig[record.type] || typeConfig.system;
              return (
                <div key={record.id} className={`${darkMode ? 'bg-gray-900/50 border-gray-700/50' : 'bg-gray-50 border-gray-100'} rounded-xl border p-3`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      record.type === 'alert'
                        ? darkMode ? 'bg-red-900/40 text-red-400' : 'bg-red-50 text-red-500'
                        : record.type === 'promotion'
                          ? darkMode ? 'bg-orange-900/40 text-orange-400' : 'bg-orange-50 text-orange-500'
                          : darkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-500'
                    }`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {record.title || record.message.slice(0, 50)}
                        </span>
                        <Badge darkMode={darkMode} color={config.color}>{config.label}</Badge>
                      </div>
                      {record.title && record.message && (
                        <p className={`text-[11px] mt-0.5 line-clamp-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {record.message}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        {record.recipientCount > 0 && (
                          <span className={`text-[10px] flex items-center gap-1 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                            <CheckCircle className="w-2.5 h-2.5" />
                            {record.recipientCount} {t('admin.recipients')}
                          </span>
                        )}
                        <span className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-gray-300'}`}>
                          {record.sentAt ? formatTimeAgo(record.sentAt) : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
