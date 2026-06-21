import React from 'react';
import { ChatContact } from '../../types';
import { useChatContext } from './ChatContext';

interface ContactItemProps {
  contact: ChatContact;
}

export const ContactItem: React.FC<ContactItemProps> = ({ contact }) => {
  const { selectedContactId, selectContact } = useChatContext();
  const ctx = useChatContext();
  const darkMode = (ctx as any).darkMode as boolean;
  const dir = (ctx as any).dir as 'rtl' | 'ltr';

  const isSelected = selectedContactId === contact.id;

  return (
    <button
      onClick={() => selectContact(contact.id)}
      className={`w-full flex items-center gap-3 p-3 transition-all text-right relative group ${
        isSelected
          ? darkMode
            ? 'bg-orange-900/20 border-s-2 border-e-2 border-orange-500'
            : 'bg-orange-50 border-s-2 border-e-2 border-orange-400'
          : darkMode
            ? 'hover:bg-gray-800/50'
            : 'hover:bg-gray-50'
      }`}
    >
      {/* Avatar with online indicator */}
      <div className="relative flex-shrink-0">
        <img
          src={contact.avatar}
          alt={contact.name}
          className={`w-12 h-12 rounded-full object-cover transition-transform group-hover:scale-105 ${
            isSelected ? 'ring-2 ring-orange-400' : ''
          }`}
        />
        {contact.online && (
          <div className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full animate-pulse" />
        )}
      </div>

      {/* Contact info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-bold truncate ${
            isSelected
              ? 'text-orange-600 dark:text-orange-400'
              : darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {contact.name}
          </span>
          <span className={`text-[10px] flex-shrink-0 ms-2 ${
            isSelected ? 'text-orange-400' : darkMode ? 'text-gray-500' : 'text-gray-400'
          }`}>
            {contact.lastTime
              ? new Date(contact.lastTime).toLocaleTimeString(
                  dir === 'rtl' ? 'ar-EG' : 'en-US',
                  { hour: '2-digit', minute: '2-digit' }
                )
              : ''
            }
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className={`text-xs truncate ${
            isSelected ? 'text-orange-500/70' : darkMode ? 'text-gray-500' : 'text-gray-500'
          }`}>
            {contact.lastMessage}
          </span>
          {contact.unread > 0 && (
            <span className="bg-orange-500 text-white text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full font-bold px-1 flex-shrink-0 ms-2 shadow-sm">
              {contact.unread > 99 ? '99+' : contact.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};
