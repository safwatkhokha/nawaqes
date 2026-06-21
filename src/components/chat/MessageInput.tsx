import React, { useEffect, useState } from 'react';
import { Send, Image as ImageIcon, RefreshCw, X, Mic, MicOff, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useChatContext } from './ChatContext';
import { useTranslation } from 'react-i18next';

export const MessageInput: React.FC = () => {
  const {
    messageText, setMessageText, sendMessage, sendingMessage,
    uploadingImage, handleImageUpload, replyToMessage, setReplyToMessage,
    myId, imageInputRef, selectedContactId,
    editingMessage, setEditingMessage, handleEditMessage,
    isRecording, startRecording, stopRecording,
  } = useChatContext();
  const ctx = useChatContext();
  const darkMode = (ctx as any).darkMode as boolean;
  const dir = (ctx as any).dir as 'rtl' | 'ltr';
  const { t } = useTranslation();

  const textSecondary = darkMode ? 'text-gray-300' : 'text-gray-700';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';

  const [editText, setEditText] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingTimer, setRecordingTimer] = useState<ReturnType<typeof setInterval> | null>(null);

  // Sync editText when editingMessage changes
  useEffect(() => {
    if (editingMessage) {
      setEditText(editingMessage.text);
    }
  }, [editingMessage]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      setRecordingTime(0);
      const timer = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      setRecordingTimer(timer);
    } else {
      if (recordingTimer) {
        clearInterval(recordingTimer);
        setRecordingTimer(null);
      }
      setRecordingTime(0);
    }
  }, [isRecording]); // eslint-disable-line react-hooks/exhaustive-deps

  const canSend = messageText.trim() && !sendingMessage && myId && selectedContactId && !isRecording;
  const canEdit = editText.trim() && editingMessage;

  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ─── Edit mode bar ──────────────────────────────────────────────
  const renderEditMode = () => (
    <div className={`border-t ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'}`}>
      <div className="px-4 py-2 flex items-center gap-3">
        <div className="w-1 h-8 rounded-full bg-orange-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-bold ${textSecondary}`}>
            {t('messages.editMessage')}
          </p>
          <p className={`text-xs truncate ${textMuted}`}>
            {(editingMessage?.text || '').length > 50 ? (editingMessage?.text || '').slice(0, 50) + '...' : editingMessage?.text || ''}
          </p>
        </div>
        <button
          onClick={() => setEditingMessage(null)}
          className={`p-1 rounded-full flex-shrink-0 ${
            darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canEdit) handleEditMessage(editingMessage.id, editText);
        }}
        className={`flex items-center gap-2 px-3 py-2.5 pb-3 border-t ${
          darkMode ? 'border-gray-700' : 'border-gray-100'
        }`}
      >
        <input
          type="text"
          placeholder={t('messages.editMessage')}
          value={editText}
          onChange={e => setEditText(e.target.value)}
          autoFocus
          className={`flex-1 px-4 py-2.5 rounded-full border outline-none text-sm transition-colors ${
            darkMode
              ? 'bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 focus:border-orange-500'
              : 'bg-gray-100 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-orange-400'
          }`}
          dir={dir}
        />
        <button
          type="submit"
          disabled={!canEdit}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
            canEdit
              ? 'bg-orange-500 text-white hover:bg-orange-600 active:scale-95 shadow-sm shadow-orange-500/30'
              : (darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400')
          }`}
        >
          <Send className={`w-4 h-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
        </button>
      </form>
    </div>
  );

  // ─── Recording indicator ──────────────────────────────────────────
  const renderRecordingIndicator = () => (
    <div className={`flex items-center gap-3 flex-1 px-2 ${
      darkMode ? 'text-red-400' : 'text-red-500'
    }`}>
      <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
      <span className="text-sm font-bold">{t('messages.recording')}</span>
      <span className="text-sm font-mono">{formatRecordingTime(recordingTime)}</span>
    </div>
  );

  // ─── Normal input ──────────────────────────────────────────────────
  const renderNormalInput = () => (
    <form
      onSubmit={(e) => sendMessage(e)}
      className={`flex items-center gap-2 px-3 py-2.5 pb-3 border-t ${
        darkMode ? 'border-gray-700' : 'border-gray-100'
      }`}
    >
      {/* Hidden file input for image upload */}
      <input
        id="chat-image-input"
        ref={imageInputRef}
        type="file"
        accept="image/*,video/*,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.tiff,.avif,.heic,.heif,.ico,.jfif,.mp4,.webm,.mov,.avi,.3gp,.mkv,.flv,.wmv,.m4v,.ogg,.mpeg,.mpg,.ts,.m2ts,.vob,.asf,.rm,.rmvb,.divx,.xvid"
        className="sr-only"
        onChange={handleImageUpload}
      />

      {/* Attachment button */}
      <label
        htmlFor="chat-image-input"
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
          uploadingImage
            ? (darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400')
            : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
        }`}
        title={t('messages.sendImage')}
        style={{ cursor: uploadingImage ? 'not-allowed' : 'pointer', opacity: uploadingImage ? 0.5 : 1 }}
      >
        {uploadingImage ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
      </label>

      {/* Text input */}
      <input
        type="text"
        placeholder={t('messages.typeMessage')}
        value={messageText}
        onChange={e => setMessageText(e.target.value)}
        disabled={sendingMessage || isRecording}
        className={`flex-1 px-4 py-2.5 rounded-full border outline-none text-sm transition-colors ${
          darkMode
            ? 'bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 focus:border-orange-500'
            : 'bg-gray-100 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-orange-400'
        } disabled:opacity-50`}
        dir={dir}
      />

      {/* Voice recording / Send button */}
      {isRecording ? (
        <button
          type="button"
          onClick={stopRecording}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 bg-red-500 text-white hover:bg-red-600 active:scale-95 shadow-sm shadow-red-500/30"
        >
          <Square className="w-4 h-4" />
        </button>
      ) : canSend ? (
        <button
          type="submit"
          disabled={!canSend}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
            canSend
              ? 'bg-orange-500 text-white hover:bg-orange-600 active:scale-95 shadow-sm shadow-orange-500/30'
              : (darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400')
          }`}
        >
          {sendingMessage ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Send className={`w-4 h-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={startRecording}
          disabled={sendingMessage || !selectedContactId}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
            sendingMessage || !selectedContactId
              ? (darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400')
              : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
          }`}
          title={t('messages.voiceMessage')}
        >
          <Mic className="w-4 h-4" />
        </button>
      )}
    </form>
  );

  // ─── Recording mode ─────────────────────────────────────────────────
  if (isRecording) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2.5 pb-3 border-t ${
        darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'
      }`}>
        {renderRecordingIndicator()}
        <button
          onClick={stopRecording}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 bg-red-500 text-white hover:bg-red-600 active:scale-95 shadow-sm shadow-red-500/30"
        >
          <Square className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ─── Edit mode ──────────────────────────────────────────────────────
  if (editingMessage) {
    return renderEditMode();
  }

  // ─── Normal mode ────────────────────────────────────────────────────
  return (
    <>
      {/* Reply Preview Bar */}
      <AnimatePresence>
        {replyToMessage && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`overflow-hidden border-t ${
              darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'
            }`}
          >
            <div className="px-4 py-2 flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-orange-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-bold ${textSecondary}`}>
                  {t('messages.replyTo')} {replyToMessage.senderId === myId ? t('common.you') : (ctx as any).selectedContact?.name}
                </p>
                <p className={`text-xs truncate ${textMuted}`}>
                  {replyToMessage.messageType === 'image'
                    ? '📷 ' + t('messages.imageSent')
                    : replyToMessage.messageType === 'voice'
                      ? '🎤 ' + t('messages.voiceMessage')
                      : replyToMessage.text.length > 50 ? replyToMessage.text.slice(0, 50) + '...' : replyToMessage.text}
                </p>
              </div>
              <button
                onClick={() => setReplyToMessage(null)}
                className={`p-1 rounded-full flex-shrink-0 ${
                  darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {renderNormalInput()}
    </>
  );
};
