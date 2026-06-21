// ─── Forward Message Dialog ──────────────────────────────────────────
import React, { useState } from 'react';
import { useChatContext } from './ChatContext';
import { useTranslation } from 'react-i18next';
import { X, Send, Search, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ForwardDialog: React.FC = () => {
  const { showForwardDialog, setShowForwardDialog, contacts, handleForwardMessage, myId, darkMode, selectedContactId } = useChatContext() as any;
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [forwarding, setForwarding] = useState(false);

  if (!showForwardDialog) return null;

  const filteredContacts = contacts.filter((c: any) =>
    c.id !== myId && c.id !== selectedContactId &&
    (c.name.includes(searchQuery) || c.lastMessage.includes(searchQuery))
  );

  const handleForward = async (contactId: string) => {
    setForwarding(true);
    await handleForwardMessage(showForwardDialog, contactId);
    setForwarding(false);
  };

  const bgCard = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const bgHover = darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50';
  const bgInput = darkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={() => setShowForwardDialog(null)}
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
              {t('messages.forwardTo', 'إعادة توجيه إلى')}
            </h3>
            <button
              onClick={() => setShowForwardDialog(null)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="p-3">
            <div className="relative">
              <Search className={`absolute top-1/2 -translate-y-1/2 ${darkMode ? 'left-3' : 'left-3'} w-4 h-4 ${textMuted}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('messages.searchConversations', 'بحث في المحادثات...')}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm ${bgInput} focus:outline-none focus:ring-2 focus:ring-orange-400`}
              />
            </div>
          </div>

          {/* Contact list */}
          <div className="max-h-64 overflow-y-auto px-2 pb-2">
            {filteredContacts.length === 0 ? (
              <div className={`text-center py-8 ${textMuted} text-sm`}>
                {t('messages.noConversations', 'لا توجد محادثات بعد')}
              </div>
            ) : (
              filteredContacts.map((contact: any) => (
                <button
                  key={contact.id}
                  onClick={() => handleForward(contact.id)}
                  disabled={forwarding}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${bgHover} ${
                    darkMode ? 'text-gray-200' : 'text-gray-800'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={contact.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`}
                      alt={contact.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    {contact.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-start">
                    <p className="text-sm font-semibold truncate">{contact.name}</p>
                    <p className={`text-xs truncate ${textMuted}`}>
                      {contact.lastMessage || t('messages.startConversation', 'ابدأ المحادثة')}
                    </p>
                  </div>
                  <Send className="w-4 h-4 text-orange-500 flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
