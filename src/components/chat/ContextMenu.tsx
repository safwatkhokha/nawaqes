import React from 'react';
import { Reply, Smile, Copy, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useChatContext } from './ChatContext';
import { ReactionPicker } from './ReactionPicker';
import { useTranslation } from 'react-i18next';

export const ContextMenu: React.FC = () => {
  const {
    contextMenu, setContextMenu, messages, handleReplyToMessage,
    setShowReactionPicker, showReactionPicker, handleCopyMessage,
    handleDeleteMessage, handleReactToMessage,
  } = useChatContext();
  const ctx = useChatContext();
  const darkMode = (ctx as any).darkMode as boolean;
  const { t } = useTranslation();

  if (!contextMenu) return null;

  const msg = messages.find(m => m.id === contextMenu.messageId);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed z-50"
        style={{
          left: Math.min(contextMenu.x, window.innerWidth - 180),
          top: Math.min(contextMenu.y, window.innerHeight - 200),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`rounded-xl shadow-xl border overflow-hidden py-1 min-w-[160px] ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          {/* Reply */}
          <button
            onClick={() => { if (msg) handleReplyToMessage(msg); }}
            className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
              darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Reply className="w-4 h-4" />
            {t('messages.reply')}
          </button>

          {/* React */}
          <button
            onClick={() => setShowReactionPicker(contextMenu.messageId)}
            className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
              darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Smile className="w-4 h-4" />
            {t('messages.react')}
          </button>

          {/* Copy */}
          <button
            onClick={() => { if (msg) handleCopyMessage(msg.text); }}
            className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
              darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Copy className="w-4 h-4" />
            {t('messages.copyMessage')}
          </button>

          {/* Delete */}
          <button
            onClick={() => handleDeleteMessage(contextMenu.messageId)}
            className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
              darkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-red-50'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {t('messages.deleteMessage')}
          </button>
        </div>

        {/* Inline Reaction Picker */}
        {showReactionPicker === contextMenu.messageId && (
          <ReactionPicker messageId={contextMenu.messageId} />
        )}
      </motion.div>
    </AnimatePresence>
  );
};
