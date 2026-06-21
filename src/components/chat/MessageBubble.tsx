import React from 'react';
import { motion } from 'motion/react';
import { Check, CheckCircle2 } from 'lucide-react';
import { ChatMessage } from '../../types';
import { useChatContext } from './ChatContext';
import { useTranslation } from 'react-i18next';

interface MessageBubbleProps {
  msg: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ msg }) => {
  const {
    myId, selectedContact, getMessageById, handleContextMenu,
    handleTouchStart, handleTouchEnd, handleDoubleClick, setShowImagePreview,
  } = useChatContext();
  const ctx = useChatContext();
  const darkMode = (ctx as any).darkMode as boolean;
  const dir = (ctx as any).dir as 'rtl' | 'ltr';
  const { t } = useTranslation();

  const isMine = msg.senderId === myId;
  const isFailed = msg._failed;
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const textSecondary = darkMode ? 'text-gray-300' : 'text-gray-700';

  // ─── Render reactions ────────────────────────────────────────────
  const renderReactions = () => {
    const reactions = msg.reactions || {};
    const emojiCounts: Record<string, number> = {};
    for (const [, emoji] of Object.entries(reactions)) {
      emojiCounts[emoji] = (emojiCounts[emoji] || 0) + 1;
    }
    if (Object.keys(emojiCounts).length === 0) return null;
    return (
      <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
        {Object.entries(emojiCounts).map(([emoji, count]) => (
          <span
            key={emoji}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs ${
              darkMode ? 'bg-white/10' : 'bg-black/5'
            }`}
          >
            <span>{emoji}</span>
            {count > 1 && <span className={textMuted}>{count}</span>}
          </span>
        ))}
      </div>
    );
  };

  // ─── Render reply preview inside bubble ──────────────────────────
  const renderReplyPreview = () => {
    if (!msg.replyToId) return null;
    const replyToMsg = getMessageById(msg.replyToId);
    if (!replyToMsg) return null;
    return (
      <div className={`mb-1.5 px-2.5 py-1.5 rounded-lg border-s-2 text-xs ${
        isMine
          ? (darkMode ? 'bg-orange-700/30 border-orange-300' : 'bg-orange-100/80 border-orange-400')
          : (darkMode ? 'bg-gray-600/40 border-gray-400' : 'bg-gray-100 border-gray-300')
      }`}>
        <p className={`font-bold ${isMine ? 'text-orange-200' : textSecondary}`}>
          {replyToMsg.senderId === myId ? t('common.you') : selectedContact?.name || ''}
        </p>
        <p className={textMuted} style={{ direction: dir }}>
          {replyToMsg.messageType === 'image'
            ? '📷 ' + t('messages.imageSent')
            : replyToMsg.text.length > 60 ? replyToMsg.text.slice(0, 60) + '...' : replyToMsg.text}
        </p>
      </div>
    );
  };

  // ─── Read receipt icon ───────────────────────────────────────────
  const renderReadReceipt = () => {
    if (!isMine || isFailed) return null;
    if (msg.read) {
      return <CheckCircle2 className="w-3 h-3 text-blue-400" />;
    }
    return <Check className="w-3 h-3 text-white/60" />;
  };

  // ─── Bubble styling ──────────────────────────────────────────────
  const bubbleClasses = isFailed
    ? 'bg-red-100 text-red-700 border border-red-200 rounded-2xl rounded-bl-sm'
    : isMine
      ? `bg-gradient-to-bl from-orange-500 to-amber-500 text-white rounded-2xl rounded-bl-sm shadow-sm shadow-orange-500/20`
      : darkMode
        ? 'bg-gray-700 text-gray-100 rounded-2xl rounded-br-sm shadow-sm'
        : 'bg-white text-gray-900 rounded-2xl rounded-br-sm shadow-sm border border-gray-100';

  return (
    <motion.div
      initial={{ opacity: 0, y: 5, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
      onContextMenu={(e) => handleContextMenu(e, msg.id)}
      onTouchStart={() => handleTouchStart(msg.id)}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={() => handleDoubleClick(msg.id)}
    >
      <div className={`max-w-[75%] md:max-w-[75%] sm:max-w-[85%] ${bubbleClasses} px-4 py-2.5 relative`}>
        {/* Reply preview */}
        {renderReplyPreview()}

        {/* Image message */}
        {msg.messageType === 'image' && msg.imageUrl && (
          <div className="mb-2 -mx-1 -mt-1">
            <img
              src={msg.imageUrl}
              alt="Chat image"
              className="max-w-full max-h-64 rounded-xl cursor-pointer hover:opacity-90 transition-opacity object-cover"
              onClick={() => setShowImagePreview(msg.imageUrl!)}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}

        {/* Post reference message */}
        {msg.messageType === 'post' && msg.postId && (
          <div className={`mb-1.5 px-2.5 py-1.5 rounded-lg text-xs ${
            darkMode ? 'bg-gray-600/40' : 'bg-gray-100'
          }`}>
            <p className={`font-bold ${isMine ? 'text-orange-200' : textSecondary}`}>
              📎 {t('messages.postReference', 'إعلان')}
            </p>
          </div>
        )}

        {/* Text content */}
        {msg.text && msg.messageType !== 'image' && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
        )}

        {/* Timestamp & read receipt */}
        <div className={`flex items-center justify-end gap-1 mt-1 ${
          isMine ? 'text-white/70' : textMuted
        }`}>
          {isFailed && (
            <span className="text-[9px] text-red-500 font-bold me-1">
              {t('messages.sendFailed', 'فشل الإرسال')}
            </span>
          )}
          <span className="text-[10px]">
            {new Date(msg.timestamp).toLocaleTimeString(
              dir === 'rtl' ? 'ar-EG' : 'en-US',
              { hour: '2-digit', minute: '2-digit' }
            )}
          </span>
          {renderReadReceipt()}
        </div>

        {/* Reactions */}
        {renderReactions()}

        {/* Message tail indicator */}
        <div className={`absolute bottom-0 ${
          isMine
            ? (dir === 'rtl' ? '-left-1' : '-right-1')
            : (dir === 'rtl' ? '-right-1' : '-left-1')
        } w-2 h-2 overflow-hidden`}>
          <div className={`absolute w-4 h-4 rounded-sm ${
            isMine
              ? 'bg-amber-500'
              : darkMode ? 'bg-gray-700' : 'bg-white'
          } ${
            isMine
              ? (dir === 'rtl' ? '-left-1 bottom-0 rotate-45' : '-right-1 bottom-0 rotate-45')
              : (dir === 'rtl' ? '-right-1 bottom-0 rotate-45' : '-left-1 bottom-0 rotate-45')
          }`} />
        </div>
      </div>
    </motion.div>
  );
};
