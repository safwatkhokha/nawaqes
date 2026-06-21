import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useChatContext } from './ChatContext';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ContactInfo } from './ContactInfo';
import { useTranslation } from 'react-i18next';

export const ChatWindow: React.FC = () => {
  const { selectedContact } = useChatContext();
  const ctx = useChatContext();
  const darkMode = (ctx as any).darkMode as boolean;
  const { t } = useTranslation();

  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';

  if (selectedContact) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <ChatHeader />
        <ContactInfo />
        <MessageList />
        <MessageInput />
      </div>
    );
  }

  // Empty state - no contact selected
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center px-4">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
          darkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          <MessageCircle className={`w-10 h-10 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
        </div>
        <p className={`font-bold text-lg ${textPrimary}`}>{t('messages.nawaqesMessages')}</p>
        <p className={`text-sm mt-1 ${textMuted}`}>{t('messages.chooseOrStart')}</p>
      </div>
    </div>
  );
};
