import React, { useEffect } from 'react';
import { Phone, Video, X, Image as ImageIcon, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useChatContext } from './ChatContext';
import { useTranslation } from 'react-i18next';

export const ContactInfo: React.FC = () => {
  const {
    showContactInfo, setShowContactInfo, selectedContact, friendshipStatus,
    contactLastSeen, startCall, myId, formatLastSeen,
    sharedMedia, loadSharedMedia, selectedContactId, setShowImagePreview,
  } = useChatContext();
  const ctx = useChatContext();
  const darkMode = (ctx as any).darkMode as boolean;
  const navigate = (ctx as any).navigate as (path: string) => void;
  const { t } = useTranslation();

  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';

  // Load shared media when panel opens
  useEffect(() => {
    if (showContactInfo && selectedContactId) {
      loadSharedMedia(selectedContactId);
    }
  }, [showContactInfo, selectedContactId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!selectedContact) return null;

  const imageMedia = sharedMedia.filter(m => m.messageType === 'image' && m.imageUrl);
  const voiceMedia = sharedMedia.filter(m => m.messageType === 'voice');

  return (
    <AnimatePresence>
      {showContactInfo && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className={`overflow-hidden border-b ${
            darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'
          }`}
        >
          <div className="p-4">
            {/* Contact info header */}
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <img
                src={selectedContact.avatar}
                alt=""
                className="w-14 h-14 rounded-xl object-cover"
              />

              {/* Info */}
              <div className="flex-1">
                <h4 className={`font-bold text-sm ${textPrimary}`}>{selectedContact.name}</h4>
                <p className={`text-[10px] ${textMuted}`}>
                  {friendshipStatus === 'accepted'
                    ? t('messages.friendRequestAccepted')
                    : friendshipStatus === 'pending'
                      ? t('messages.pendingRequest', 'طلب صداقة قيد الانتظار')
                      : t('messages.notFriend', 'ليس صديقاً بعد')
                  }
                </p>
                <p className={`text-[10px] ${selectedContact.online ? 'text-green-600' : textMuted}`}>
                  {selectedContact.online ? t('messages.onlineNow') : formatLastSeen(contactLastSeen)}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => { startCall('audio'); setShowContactInfo(false); }}
                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  title={t('messages.audioCall')}
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { startCall('video'); setShowContactInfo(false); }}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  title={t('messages.videoCall')}
                >
                  <Video className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { if (selectedContactId && selectedContactId !== myId) navigate(`/user/${selectedContactId}`); setShowContactInfo(false); }}
                  className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-[10px] font-bold hover:bg-orange-700 transition-colors"
                >
                  {t('messages.viewProfile', 'عرض الملف')}
                </button>
                <button
                  onClick={() => setShowContactInfo(false)}
                  className={`p-1.5 rounded-lg ${
                    darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Shared Media Section */}
            {sharedMedia.length > 0 && (
              <div className="mt-4">
                <h5 className={`text-xs font-bold mb-2 ${textMuted}`}>
                  {t('messages.sharedMedia')}
                </h5>

                {/* Image grid */}
                {imageMedia.length > 0 && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {imageMedia.slice(0, 8).map((m) => (
                      <div
                        key={m.id}
                        className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer group ${
                          darkMode ? 'bg-gray-700' : 'bg-gray-200'
                        }`}
                        onClick={() => m.imageUrl && setShowImagePreview(m.imageUrl)}
                      >
                        <img
                          src={m.imageUrl}
                          alt=""
                          className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Voice messages count */}
                {voiceMedia.length > 0 && (
                  <div className={`flex items-center gap-2 mt-2 px-2 py-1.5 rounded-lg ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-200'
                  }`}>
                    <Music className={`w-3.5 h-3.5 ${textMuted}`} />
                    <span className={`text-xs ${textMuted}`}>
                      {voiceMedia.length} {t('messages.voiceMessage')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
