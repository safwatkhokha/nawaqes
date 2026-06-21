import React, { useState } from 'react';
import { ArrowRight, Phone, Video, MoreVertical, Eye, UserPlus, RefreshCw, Info, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useChatContext } from './ChatContext';
import { MessageSearch } from './MessageSearch';
import { useTranslation } from 'react-i18next';

export const ChatHeader: React.FC = () => {
  const {
    selectedContact, selectedContactId, showTypingIndicator, contactLastSeen,
    startCall, setShowHeaderMenu, showHeaderMenu, setShowContactInfo, showContactInfo,
    friendshipStatus, loadMessages, loadingMessages, formatLastSeen,
    myId, selectContact, sendFriendRequest, sendingFriendRequest,
  } = useChatContext();
  const ctx = useChatContext();
  const darkMode = (ctx as any).darkMode as boolean;
  const navigate = (ctx as any).navigate as (path: string) => void;
  const { t } = useTranslation();

  const [showSearch, setShowSearch] = useState(false);

  if (!selectedContact) return null;

  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <>
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        darkMode ? 'border-gray-700' : 'border-gray-100'
      }`}>
        {/* Left side: back button + avatar + name */}
        <div className="flex items-center gap-3">
          {/* Mobile back button */}
          <button
            onClick={() => selectContact(null)}
            className={`md:hidden w-8 h-8 rounded-full flex items-center justify-center ${
              darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <ArrowRight className="w-5 h-5" />
          </button>

          {/* Avatar */}
          <div
            className="relative cursor-pointer"
            onClick={() => { if (selectedContactId && selectedContactId !== myId) navigate(`/user/${selectedContactId}`); }}
          >
            <img
              src={selectedContact.avatar}
              alt={selectedContact.name}
              className="w-10 h-10 rounded-full hover:opacity-80 transition-opacity object-cover"
            />
            {selectedContact.online && (
              <div className="absolute bottom-0 left-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
            )}
          </div>

          {/* Name & status */}
          <div
            className="cursor-pointer"
            onClick={() => { if (selectedContactId && selectedContactId !== myId) navigate(`/user/${selectedContactId}`); }}
          >
            <h4 className={`text-sm font-bold ${textPrimary} hover:text-orange-600 transition-colors`}>
              {selectedContact.name}
            </h4>
            <span className={`text-[10px] ${
              showTypingIndicator
                ? 'text-orange-500'
                : selectedContact.online
                  ? 'text-green-600'
                  : textMuted
            }`}>
              {showTypingIndicator
                ? t('messages.typing')
                : selectedContact.online
                  ? t('messages.onlineNow')
                  : formatLastSeen(contactLastSeen)
              }
            </span>
          </div>
        </div>

        {/* Right side: search + call buttons + menu */}
        <div className="flex items-center gap-1">
          {/* Search button */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            title={t('messages.searchMessages')}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              showSearch
                ? (darkMode ? 'bg-gray-700 text-orange-400' : 'bg-orange-50 text-orange-600')
                : (darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500')
            }`}
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Audio call */}
          <button
            onClick={() => startCall('audio')}
            title={t('messages.audioCall')}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              darkMode ? 'hover:bg-gray-700 text-green-400' : 'hover:bg-green-50 text-green-600'
            }`}
          >
            <Phone className="w-4 h-4" />
          </button>

          {/* Video call */}
          <button
            onClick={() => startCall('video')}
            title={t('messages.videoCall')}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              darkMode ? 'hover:bg-gray-700 text-blue-400' : 'hover:bg-blue-50 text-blue-600'
            }`}
          >
            <Video className="w-4 h-4" />
          </button>

          {/* More menu */}
          <div className="relative" data-header-menu>
            <button
              onClick={(e) => { e.stopPropagation(); setShowHeaderMenu(!showHeaderMenu); }}
              title={t('messages.moreOptions', 'مزيد من الخيارات')}
              className={`w-9 h-9 rounded-full flex items-center justify-center ${
                darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {showHeaderMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`absolute left-0 top-full mt-1 rounded-xl shadow-xl border overflow-hidden py-1 min-w-[180px] z-50 ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}
                  onClick={() => setShowHeaderMenu(false)}
                >
                  {/* Audio call */}
                  <button
                    onClick={() => startCall('audio')}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                      darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Phone className="w-4 h-4 text-green-500" />
                    {t('messages.audioCall', 'مكالمة صوتية')}
                  </button>

                  {/* Video call */}
                  <button
                    onClick={() => startCall('video')}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                      darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Video className="w-4 h-4 text-blue-500" />
                    {t('messages.videoCall', 'مكالمة فيديو')}
                  </button>

                  {/* Search */}
                  <button
                    onClick={() => setShowSearch(true)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                      darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Search className="w-4 h-4" />
                    {t('messages.searchMessages')}
                  </button>

                  {/* View profile */}
                  <button
                    onClick={() => { if (selectedContactId && selectedContactId !== myId) navigate(`/user/${selectedContactId}`); }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                      darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    {t('messages.viewProfile', 'عرض الملف الشخصي')}
                  </button>

                  {/* Add friend */}
                  {friendshipStatus !== 'accepted' && selectedContactId && (
                    <button
                      onClick={sendFriendRequest}
                      disabled={sendingFriendRequest || friendshipStatus === 'pending'}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                        friendshipStatus === 'pending'
                          ? (darkMode ? 'text-yellow-400' : 'text-yellow-600')
                          : (darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50')
                      }`}
                    >
                      {sendingFriendRequest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      {friendshipStatus === 'pending' ? t('messages.pendingRequest', 'قيد الانتظار') : t('messages.addFriend', 'إضافة صديق')}
                    </button>
                  )}

                  {/* Refresh messages */}
                  <button
                    onClick={() => { if (selectedContactId) loadMessages(selectedContactId); }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                      darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingMessages ? 'animate-spin' : ''}`} />
                    {t('messages.refreshMessages', 'تحديث الرسائل')}
                  </button>

                  {/* Contact info */}
                  <button
                    onClick={() => setShowContactInfo(!showContactInfo)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                      darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Info className="w-4 h-4" />
                    {t('messages.contactInfo', 'معلومات جهة الاتصال')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <MessageSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </>
  );
};
