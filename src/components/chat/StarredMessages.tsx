// ─── Starred Messages Panel ──────────────────────────────────────────
import React, { useEffect } from 'react';
import { useChatContext } from './ChatContext';
import { useTranslation } from 'react-i18next';
import { X, Star, Image as ImageIcon, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const StarredMessages: React.FC = () => {
  const { showStarredPanel, setShowStarredPanel, starredMessages, loadStarredMessages, darkMode, myId } = useChatContext() as any;
  const { t } = useTranslation();

  useEffect(() => {
    if (showStarredPanel) {
      loadStarredMessages();
    }
  }, [showStarredPanel]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!showStarredPanel) return null;

  const bgCard = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const bgHover = darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50';

  const formatTime = (timestamp: string) => {
    try {
      const d = new Date(timestamp);
      return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }) + ' ' +
        d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={() => setShowStarredPanel(false)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`w-full max-w-md max-h-[80vh] rounded-2xl border shadow-2xl ${bgCard} flex flex-col`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-orange-500 fill-orange-500" />
              <h3 className={`text-lg font-bold ${textPrimary}`}>
                {t('messages.starredMessages', 'الرسائل المميزة')}
              </h3>
            </div>
            <button
              onClick={() => setShowStarredPanel(false)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-3">
            {starredMessages.length === 0 ? (
              <div className={`text-center py-12 ${textMuted}`}>
                <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{t('messages.noStarredMessages', 'لا توجد رسائل مميزة')}</p>
                <p className="text-xs mt-1 opacity-70">
                  {t('messages.starHint', 'اضغط مطولاً على رسالة واختر "تمييز" لحفظها هنا')}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {starredMessages.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-xl ${bgHover} transition-colors ${
                      darkMode ? 'bg-gray-900/50' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Star className="w-4 h-4 text-orange-500 fill-orange-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        {msg.messageType === 'image' && (
                          <div className="flex items-center gap-1 text-xs text-blue-500 mb-1">
                            <ImageIcon className="w-3 h-3" />
                            {t('messages.imageSent', 'تم إرسال الصورة')}
                          </div>
                        )}
                        {msg.messageType === 'voice' && (
                          <div className="flex items-center gap-1 text-xs text-green-500 mb-1">
                            <Mic className="w-3 h-3" />
                            {t('messages.voiceMessage', 'رسالة صوتية')}
                          </div>
                        )}
                        {msg.text && (
                          <p className={`text-sm ${textPrimary} line-clamp-3`}>{msg.text}</p>
                        )}
                        <p className={`text-xs mt-1 ${textMuted}`}>
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
