// ─── Admin Alert Bar - Shows Only Admin Alerts (No Breaking News) ────
// Replaces the old NewsTicker which mixed regular news with admin alerts
// This bar ONLY appears when the admin sends an alert, keeping it clean
import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminAlertBar: React.FC = () => {
  const { darkMode, adminAlerts } = useAppContext();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Track dismissed alert IDs for this session
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Only show admin alerts (isAlert=true), filter out dismissed ones
  const activeAlerts = adminAlerts.filter(
    (a) => a.isAlert && !dismissedIds.has(String(a.id))
  );

  // Auto-rotate through alerts
  useEffect(() => {
    if (isPaused || activeAlerts.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeAlerts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused, activeAlerts.length]);

  // Reset index if it exceeds the list length
  useEffect(() => {
    if (currentIndex >= activeAlerts.length && activeAlerts.length > 0) {
      setCurrentIndex(0);
    }
  }, [activeAlerts.length, currentIndex]);

  const handleDismiss = useCallback((e: React.MouseEvent, alertId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissedIds((prev) => new Set([...prev, String(alertId)]));
  }, []);

  const handleDismissAll = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const allIds = activeAlerts.map((a) => String(a.id));
    setDismissedIds((prev) => new Set([...prev, ...allIds]));
  }, [activeAlerts]);

  const handleAlertClick = useCallback(
    (e: React.MouseEvent, alertId: string) => {
      e.preventDefault();
      e.stopPropagation();
      navigate(`/notifications?filter=alert&newsId=${alertId}`);
    },
    [navigate]
  );

  // Don't render anything if no active alerts
  if (activeAlerts.length === 0) return null;

  const currentAlert = activeAlerts[currentIndex] || activeAlerts[0];

  return (
    <div
      className={`sticky top-14 z-50 overflow-hidden transition-all duration-300 ${
        darkMode
          ? 'bg-gradient-to-l from-red-950/90 via-red-900/80 to-red-950/90 border-b border-red-800/50'
          : 'bg-gradient-to-l from-red-600 via-red-700 to-red-600 border-b border-red-700'
      }`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center h-10 max-w-[1600px] mx-auto px-3">
        {/* ─── Admin Shield Icon + Label ─── */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg flex-shrink-0 ${
            darkMode ? 'bg-red-800/60' : 'bg-red-800/30'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
          <span className="text-[11px] font-black text-white whitespace-nowrap">
            {t('adminAlertBar.title')}
          </span>
        </div>

        {/* ─── Separator ─── */}
        <div
          className={`w-px h-5 mx-2.5 ${darkMode ? 'bg-red-700/60' : 'bg-white/20'}`}
        />

        {/* ─── Current Alert Text ─── */}
        <div
          className="flex-1 flex items-center min-w-0 cursor-pointer group"
          onClick={(e) => currentAlert && handleAlertClick(e, currentAlert.id)}
        >
          <div className="flex items-center gap-2 min-w-0 w-full">
            {/* Pulsing red dot */}
            <span className="w-2 h-2 rounded-full bg-yellow-300 animate-pulse flex-shrink-0" />

            {/* Alert title with smooth transition */}
            <p
              key={currentAlert?.id}
              className="text-[13px] font-bold text-white truncate animate-[fadeIn_0.3s_ease] group-hover:underline decoration-white/50"
            >
              {currentAlert?.title}
            </p>

            {/* Source tag */}
            {currentAlert?.source && (
              <span className="text-[10px] font-medium text-white/50 flex-shrink-0">
                [{currentAlert.source}]
              </span>
            )}
          </div>
        </div>

        {/* ─── Navigation (multiple alerts) ─── */}
        {activeAlerts.length > 1 && (
          <div className="flex items-center gap-1 mx-2 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex((prev) =>
                  prev === 0 ? activeAlerts.length - 1 : prev - 1
                );
              }}
              className={`p-0.5 rounded transition-colors ${
                darkMode ? 'hover:bg-red-800' : 'hover:bg-red-800/30'
              }`}
            >
              <ChevronLeft className="w-3 h-3 text-white/60" />
            </button>
            <span className="text-[10px] font-bold text-white/70 whitespace-nowrap min-w-[28px] text-center">
              {currentIndex + 1}/{activeAlerts.length}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex((prev) => (prev + 1) % activeAlerts.length);
              }}
              className={`p-0.5 rounded transition-colors ${
                darkMode ? 'hover:bg-red-800' : 'hover:bg-red-800/30'
              }`}
            >
              <ChevronRight className="w-3 h-3 text-white/60" />
            </button>
          </div>
        )}

        {/* ─── Dismiss All Button ─── */}
        <button
          onClick={(e) => handleDismissAll(e)}
          className={`p-1 rounded-md flex-shrink-0 transition-colors ${
            darkMode ? 'hover:bg-red-800' : 'hover:bg-red-800/30'
          }`}
          title={t('adminAlertBar.dismissAll')}
        >
          <X className="w-3.5 h-3.5 text-white/60 hover:text-white" />
        </button>
      </div>
    </div>
  );
};
