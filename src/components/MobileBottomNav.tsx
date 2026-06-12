// ─── Mobile Bottom Navigation Bar ─ شريط التنقل السفلي للجوال ────────
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, PlusCircle, MessageCircle, Bell, Users } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';

export const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { chatUnreadCount, notifications, readNotificationIds, darkMode, friendRequests } = useAppContext();
  const { dir } = useLanguage();
  const { t } = useTranslation();

  // Count unread notifications
  const unreadNotificationCount = notifications.filter(
    (n) => !readNotificationIds.has(n.id)
  ).length;

  // Count friend requests
  const friendRequestCount = friendRequests?.length || 0;

  // Determine active tab based on current route
  const currentPath = location.pathname;

  // Hide bottom nav on pages that have their own full-screen controls or don't need it
  const hiddenRoutes = ['/livestream', '/live-stream', '/messages', '/login', '/admin'];
  if (hiddenRoutes.some(route => currentPath.startsWith(route))) return null;

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  const navItems = [
    {
      id: 'home',
      path: '/',
      icon: Home,
      label: t('navbar.home') || 'الرئيسية',
      isCenter: false,
    },
    {
      id: 'market',
      path: '/market',
      icon: ShoppingBag,
      label: t('navbar.market') || 'السوق',
      isCenter: false,
    },
    {
      id: 'create',
      path: '/create-post',
      icon: PlusCircle,
      label: t('navbar.createPost') || 'نشر',
      isCenter: true,
    },
    {
      id: 'friends',
      path: '/friends',
      icon: Users,
      label: t('navbar.friends') || 'أصدقاء',
      badge: friendRequestCount,
      isCenter: false,
    },
    {
      id: 'messages',
      path: '/messages',
      icon: MessageCircle,
      label: t('navbar.messages') || 'رسائل',
      badge: chatUnreadCount,
      isCenter: false,
    },
    {
      id: 'notifications',
      path: '/notifications',
      icon: Bell,
      label: t('navbar.notifications') || 'إشعارات',
      badge: unreadNotificationCount,
      isCenter: false,
    },
  ];

  const handleNavClick = (path: string, id: string) => {
    if (id === 'create') {
      // Navigate to home and trigger create post
      navigate('/');
      // Dispatch a custom event to open the create post modal
      window.dispatchEvent(new CustomEvent('nawaqes-create-post'));
    } else {
      navigate(path);
    }
  };

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-[100] lg:hidden mobile-bottom-nav ${
        darkMode
          ? 'bg-gray-900 border-gray-800'
          : 'bg-white border-gray-200'
      } border-t`}
      dir={dir}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-end justify-around h-14 sm:h-16 mx-auto px-0.5 max-w-lg">
        {navItems.map((item) => {
          const active = item.isCenter ? false : isActive(item.path);
          const Icon = item.icon;

          if (item.isCenter) {
            // Center "Create Post" button - raised like a FAB
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.path, item.id)}
                className="flex flex-col items-center justify-center -mt-5 relative"
                aria-label={item.label}
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-300/30 active:scale-95 transition-transform">
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <span className={`text-[9px] sm:text-[10px] font-bold mt-1 ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.path, item.id)}
              className="flex flex-col items-center justify-center h-full relative active:scale-95 transition-transform min-w-0 flex-1"
              aria-label={item.label}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors ${
                    active
                      ? 'text-orange-500'
                      : darkMode
                        ? 'text-gray-500'
                        : 'text-gray-400'
                  }`}
                />
                {/* Badge */}
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 flex items-center justify-center min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : null}
              </div>
              <span
                className={`text-[9px] sm:text-[10px] font-bold mt-1 transition-colors ${
                  active
                    ? 'text-orange-500'
                    : darkMode
                      ? 'text-gray-500'
                      : 'text-gray-400'
                }`}
              >
                {item.label}
              </span>
              {/* Active dot indicator */}
              {active && (
                <div className="absolute bottom-1 w-1 h-1 bg-orange-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
