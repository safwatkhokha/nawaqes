// ─── Chat Settings Panel ─────────────────────────────────────────────
import React, { useState } from 'react';
import { useChatContext } from './ChatContext';
import { useTranslation } from 'react-i18next';
import {
  X, BellOff, Bell, Clock, Shield, ShieldOff, EyeOff, MessageCircle,
  ChevronDown, AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface ChatSettingsProps {
  show: boolean;
  onClose: () => void;
}

export const ChatSettingsPanel: React.FC<ChatSettingsProps> = ({ show, onClose }) => {
  const {
    selectedContact, chatSettings, updateChatSettings, darkMode,
  } = useChatContext() as any;
  const { t } = useTranslation();

  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [disappearTimeout, setDisappearTimeout] = useState(chatSettings.disappearTimeout || 86400);

  if (!show || !selectedContact) return null;

  const bgCard = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const bgItem = darkMode ? 'bg-gray-900/50 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100';

  const handleToggleMute = async () => {
    await updateChatSettings(selectedContact.id, { isMuted: !chatSettings.isMuted });
  };

  const handleToggleDisappearing = async () => {
    if (!chatSettings.isDisappearing) {
      await updateChatSettings(selectedContact.id, {
        isDisappearing: true,
        disappearTimeout,
      });
    } else {
      await updateChatSettings(selectedContact.id, {
        isDisappearing: false,
        disappearTimeout: 0,
      });
    }
  };

  const handleBlock = async () => {
    await updateChatSettings(selectedContact.id, { isBlocked: true });
    setShowBlockConfirm(false);
    onClose();
  };

  const handleTimeoutChange = async (timeout: number) => {
    setDisappearTimeout(timeout);
    if (chatSettings.isDisappearing) {
      await updateChatSettings(selectedContact.id, { disappearTimeout: timeout });
    }
  };

  const timeoutOptions = [
    { label: t('messages.disappear30s', '30 ثانية'), value: 30 },
    { label: t('messages.disappear5m', '5 دقائق'), value: 300 },
    { label: t('messages.disappear1h', 'ساعة واحدة'), value: 3600 },
    { label: t('messages.disappear8h', '8 ساعات'), value: 28800 },
    { label: t('messages.disappear24h', '24 ساعة'), value: 86400 },
    { label: t('messages.disappear7d', '7 أيام'), value: 604800 },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`w-full max-w-sm rounded-2xl border shadow-2xl ${bgCard}`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className={`text-lg font-bold ${textPrimary}`}>
              {t('messages.chatSettings', 'إعدادات المحادثة')}
            </h3>
            <button
              onClick={onClose}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            {/* Mute */}
            <button
              onClick={handleToggleMute}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${bgItem}`}
            >
              {chatSettings.isMuted ? (
                <BellOff className="w-5 h-5 text-red-500" />
              ) : (
                <Bell className="w-5 h-5 text-blue-500" />
              )}
              <div className="flex-1 text-start">
                <p className={`text-sm font-medium ${textPrimary}`}>
                  {chatSettings.isMuted
                    ? t('messages.unmuteChat', 'إلغاء كتم المحادثة')
                    : t('messages.muteChat', 'كتم المحادثة')
                  }
                </p>
                <p className={`text-xs ${textMuted}`}>
                  {chatSettings.isMuted
                    ? t('messages.muteDesc', 'لن تستلم إشعارات من هذه المحادثة')
                    : t('messages.unmuteDesc', 'استلام الإشعارات بشكل طبيعي')
                  }
                </p>
              </div>
              <div className={`w-10 h-6 rounded-full relative transition-colors ${
                chatSettings.isMuted ? 'bg-red-500' : darkMode ? 'bg-gray-600' : 'bg-gray-300'
              }`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                  chatSettings.isMuted ? 'right-1' : 'left-1'
                }`} />
              </div>
            </button>

            {/* Disappearing Messages */}
            <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
              <button
                onClick={handleToggleDisappearing}
                className="w-full flex items-center gap-3"
              >
                <Clock className="w-5 h-5 text-purple-500" />
                <div className="flex-1 text-start">
                  <p className={`text-sm font-medium ${textPrimary}`}>
                    {t('messages.disappearingMessages', 'الرسائل المؤقتة')}
                  </p>
                  <p className={`text-xs ${textMuted}`}>
                    {chatSettings.isDisappearing
                      ? t('messages.disappearingActive', 'مفعّلة')
                      : t('messages.disappearingInactive', 'معطّلة')
                    }
                  </p>
                </div>
                <div className={`w-10 h-6 rounded-full relative transition-colors ${
                  chatSettings.isDisappearing ? 'bg-purple-500' : darkMode ? 'bg-gray-600' : 'bg-gray-300'
                }`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    chatSettings.isDisappearing ? 'right-1' : 'left-1'
                  }`} />
                </div>
              </button>

              {/* Timeout selector */}
              {chatSettings.isDisappearing && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
                >
                  <p className={`text-xs font-medium mb-2 ${textMuted}`}>
                    {t('messages.disappearTimeout', 'مدة بقاء الرسائل')}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {timeoutOptions.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => handleTimeoutChange(opt.value)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          disappearTimeout === opt.value
                            ? 'bg-purple-500 text-white'
                            : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Block */}
            <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
              {!showBlockConfirm ? (
                <button
                  onClick={() => setShowBlockConfirm(true)}
                  className="w-full flex items-center gap-3"
                >
                  <ShieldOff className="w-5 h-5 text-red-500" />
                  <div className="flex-1 text-start">
                    <p className="text-sm font-medium text-red-500">
                      {t('messages.blockUser', 'حظر المستخدم')}
                    </p>
                    <p className={`text-xs ${textMuted}`}>
                      {t('messages.blockDesc', 'لن يتمكن من إرسال رسائل لك')}
                    </p>
                  </div>
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <p className={`text-sm font-medium ${textPrimary}`}>
                      {t('messages.blockConfirm', 'هل أنت متأكد من حظر {{name}}؟', { name: selectedContact.name })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleBlock}
                      className="flex-1 px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-lg hover:bg-red-600 transition-colors"
                    >
                      {t('messages.block', 'حظر')}
                    </button>
                    <button
                      onClick={() => setShowBlockConfirm(false)}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {t('common.cancel', 'إلغاء')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
