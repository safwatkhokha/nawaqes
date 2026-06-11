import React from 'react';
import { ORANGE } from './helpers';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ─── Stat Card Component (Enhanced) ──────────────────────────────────
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  trendLabel?: string;
  color?: string;
  darkMode?: boolean;
  subtitle?: string;
  sparkline?: number[];
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon, label, value, trend, trendLabel, color = ORANGE, darkMode = false, subtitle, sparkline, onClick,
}) => {
  const isPositive = trend?.startsWith('+');
  const isNegative = trend?.startsWith('-');
  const trendIcon = isPositive ? <TrendingUp className="w-3 h-3" /> : isNegative ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />;

  return (
    <div
      onClick={onClick}
      className={`${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} rounded-2xl p-5 border hover:shadow-lg transition-all duration-300 group relative overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Gradient accent */}
      <div
        className="absolute top-0 left-0 w-full h-1 rounded-t-2xl opacity-80"
        style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }}
      />
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
          style={{ backgroundColor: color + '18' }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
        {trend && (
          <div className={`flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isPositive
              ? darkMode ? 'bg-green-900/40 text-green-400' : 'bg-green-50 text-green-600'
              : isNegative
                ? darkMode ? 'bg-red-900/40 text-red-400' : 'bg-red-50 text-red-500'
                : darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'
          }`}>
            {trendIcon}
            {trend}
          </div>
        )}
      </div>
      <p className={`text-2xl font-black mb-0.5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        {value}
      </p>
      <p className={`text-xs font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{label}</p>
      {subtitle && (
        <p className={`text-[10px] mt-1 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`}>{subtitle}</p>
      )}
      {/* Mini sparkline */}
      {sparkline && sparkline.length > 1 && (
        <div className="mt-2 flex items-end gap-[2px] h-6">
          {sparkline.map((v, i) => {
            const max = Math.max(...sparkline);
            const height = max > 0 ? (v / max) * 100 : 0;
            return (
              <div
                key={i}
                className="flex-1 rounded-sm transition-all"
                style={{
                  height: `${Math.max(height, 5)}%`,
                  backgroundColor: color,
                  opacity: 0.3 + (i / sparkline.length) * 0.7,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── KPI Card (Large metric card) ────────────────────────────────────
interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change?: string;
  changeDirection?: 'up' | 'down' | 'neutral';
  color?: string;
  darkMode?: boolean;
  children?: React.ReactNode;
}

export const KPICard: React.FC<KPICardProps> = ({
  icon, label, value, change, changeDirection = 'neutral', color = ORANGE, darkMode = false, children,
}) => (
  <div className={`${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} rounded-2xl border p-6 relative overflow-hidden`}>
    <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: color }} />
    <div className="flex items-start justify-between">
      <div>
        <p className={`text-xs font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{label}</p>
        <p className={`text-3xl font-black mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</p>
        {change && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${
            changeDirection === 'up'
              ? darkMode ? 'text-green-400' : 'text-green-600'
              : changeDirection === 'down'
                ? darkMode ? 'text-red-400' : 'text-red-500'
                : darkMode ? 'text-gray-500' : 'text-gray-400'
          }`}>
            {changeDirection === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : changeDirection === 'down' ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
            {change}
          </div>
        )}
      </div>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '15' }}>
        <span style={{ color }}>{icon}</span>
      </div>
    </div>
    {children}
  </div>
);

// ─── Section Card (Enhanced) ─────────────────────────────────────────
interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  darkMode?: boolean;
  noPadding?: boolean;
  className?: string;
}

export const Section: React.FC<SectionProps> = ({
  title, icon, children, action, darkMode = false, noPadding = false, className = '',
}) => (
  <div className={`${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} rounded-2xl border overflow-hidden ${className}`}>
    <div className={`flex items-center justify-between px-5 py-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-50'}`}>
      <h3 className={`text-sm font-black flex items-center gap-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
        <span className="text-orange-500">{icon}</span>
        {title}
      </h3>
      {action}
    </div>
    <div className={noPadding ? '' : 'p-5'}>{children}</div>
  </div>
);

// ─── Badge (Enhanced) ───────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  darkMode?: boolean;
  dot?: boolean;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ children, color = 'gray', darkMode = false, dot, size = 'sm' }) => {
  const lightCls: Record<string, string> = {
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-500',
    orange: 'bg-orange-50 text-orange-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    gray: 'bg-gray-50 text-gray-500',
    pink: 'bg-pink-50 text-pink-600',
    cyan: 'bg-cyan-50 text-cyan-600',
  };
  const darkCls: Record<string, string> = {
    green: 'bg-green-900/40 text-green-400',
    red: 'bg-red-900/40 text-red-400',
    orange: 'bg-orange-900/40 text-orange-400',
    blue: 'bg-blue-900/40 text-blue-400',
    purple: 'bg-purple-900/40 text-purple-400',
    yellow: 'bg-yellow-900/40 text-yellow-400',
    gray: 'bg-gray-800 text-gray-400',
    pink: 'bg-pink-900/40 text-pink-400',
    cyan: 'bg-cyan-900/40 text-cyan-400',
  };
  const colorMap = darkMode ? darkCls : lightCls;
  const sizeClass = size === 'md' ? 'text-[11px] px-2.5 py-1' : 'text-[10px] px-2 py-0.5';
  return (
    <span className={`${sizeClass} rounded-full font-bold inline-flex items-center gap-1 ${colorMap[color] || colorMap.gray}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${color === 'green' ? 'bg-green-500' : color === 'red' ? 'bg-red-500' : color === 'orange' ? 'bg-orange-500' : 'bg-gray-400'}`} />}
      {children}
    </span>
  );
};

// ─── Button (Enhanced) ──────────────────────────────────────────────
interface BtnProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'ghost' | 'primary' | 'danger' | 'outline' | 'success';
  size?: 'sm' | 'md' | 'xs' | 'lg';
  disabled?: boolean;
  className?: string;
  title?: string;
  darkMode?: boolean;
  fullWidth?: boolean;
}

export const Btn: React.FC<BtnProps> = ({
  children, onClick, variant = 'ghost', size = 'sm', disabled, className = '', title, darkMode = false, fullWidth,
}) => {
  const base = 'inline-flex items-center justify-center gap-1.5 font-bold rounded-xl transition-all disabled:opacity-40 cursor-pointer active:scale-[0.97] ';
  const vars: Record<string, string> = darkMode
    ? {
        ghost: 'text-gray-400 hover:bg-gray-800 ',
        primary: 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm shadow-orange-900/30 ',
        danger: 'text-red-400 hover:bg-red-900/30 ',
        outline: 'border border-gray-700 text-gray-300 hover:bg-gray-800 ',
        success: 'text-green-400 hover:bg-green-900/30 ',
      }
    : {
        ghost: 'text-gray-500 hover:bg-gray-50 ',
        primary: 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm shadow-orange-200/50 ',
        danger: 'text-red-500 hover:bg-red-50 ',
        outline: 'border border-gray-200 text-gray-600 hover:bg-gray-50 ',
        success: 'text-green-600 hover:bg-green-50 ',
      };
  const sizes: Record<string, string> = {
    xs: 'px-2 py-1 text-[10px]',
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${base}${vars[variant]}${sizes[size]}${fullWidth ? 'w-full ' : ''}${className}`}
    >
      {children}
    </button>
  );
};

// ─── Empty State (Enhanced) ─────────────────────────────────────────
interface EmptyStateProps {
  icon: React.ReactNode;
  text: string;
  darkMode?: boolean;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, text, darkMode = false, action }) => (
  <div className={`flex flex-col items-center justify-center py-16 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`}>
    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
      {icon}
    </div>
    <p className={`text-sm font-medium mb-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{text}</p>
    {action}
  </div>
);

// ─── Modal (Enhanced) ───────────────────────────────────────────────
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  darkMode?: boolean;
  maxWidth?: string;
  icon?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen, onClose, title, children, darkMode = false, maxWidth = 'max-w-lg', icon,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} rounded-2xl w-full ${maxWidth} max-h-[85vh] overflow-y-auto shadow-2xl border`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`p-5 border-b flex items-center justify-between ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2.5">
            {icon && <span className="text-orange-500">{icon}</span>}
            <h3 className={`font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              darkMode ? 'text-gray-500 hover:bg-gray-800' : 'text-gray-400 hover:bg-gray-100'
            }`}
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

// ─── Data Table Component ───────────────────────────────────────────
interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  darkMode?: boolean;
  keyField?: string;
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  emptyText?: string;
  emptyIcon?: React.ReactNode;
  pageSize?: number;
}

export function DataTable<T extends Record<string, any>>({
  data, columns, darkMode = false, keyField = 'id', onRowClick, selectable, selectedIds = [], onSelectionChange, emptyText, emptyIcon, pageSize = 20,
}: DataTableProps<T>) {
  const [page, setPage] = React.useState(1);
  const totalPages = Math.ceil(data.length / pageSize);
  const pagedData = data.slice((page - 1) * pageSize, page * pageSize);

  const toggleSelect = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const toggleAll = () => {
    if (!onSelectionChange) return;
    const pageIds = pagedData.map(d => d[keyField]);
    if (pageIds.every(id => selectedIds.includes(id))) {
      onSelectionChange(selectedIds.filter(id => !pageIds.includes(id)));
    } else {
      onSelectionChange([...new Set([...selectedIds, ...pageIds])]);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className={`border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
            {selectable && (
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={pagedData.length > 0 && pagedData.every(d => selectedIds.includes(d[keyField]))}
                  onChange={toggleAll}
                  className="w-3.5 h-3.5 accent-orange-500 rounded"
                />
              </th>
            )}
            {columns.map(col => (
              <th
                key={col.key}
                className={`px-3 py-3 text-start text-[10px] font-black uppercase tracking-wider ${darkMode ? 'text-gray-500' : 'text-gray-400'} ${col.width || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pagedData.map((item, i) => (
            <tr
              key={item[keyField] || i}
              onClick={() => onRowClick?.(item)}
              className={`border-b transition-colors ${
                onRowClick ? 'cursor-pointer' : ''
              } ${
                selectedIds.includes(item[keyField])
                  ? darkMode ? 'bg-orange-900/10' : 'bg-orange-50/50'
                  : ''
              } ${darkMode ? 'border-gray-800/50 hover:bg-gray-800/30' : 'border-gray-50 hover:bg-gray-50/50'}`}
            >
              {selectable && (
                <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item[keyField])}
                    onChange={() => toggleSelect(item[keyField])}
                    className="w-3.5 h-3.5 accent-orange-500 rounded"
                  />
                </td>
              )}
              {columns.map(col => (
                <td key={col.key} className={`px-3 py-3 text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {col.render ? col.render(item) : item[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <EmptyState
          darkMode={darkMode}
          icon={emptyIcon || <LayoutDashboard className="w-8 h-8" />}
          text={emptyText || 'لا توجد بيانات'}
        />
      )}
      {totalPages > 1 && (
        <div className={`flex items-center justify-between px-3 py-3 border-t ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
          <span className={`text-[10px] font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            عرض {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, data.length)} من {data.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold disabled:opacity-30 ${
                darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-50 text-gray-500'
              }`}
            >‹</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 5) p = i + 1;
              else if (page <= 3) p = i + 1;
              else if (page >= totalPages - 2) p = totalPages - 4 + i;
              else p = page - 2 + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                    p === page
                      ? 'bg-orange-500 text-white shadow-sm'
                      : darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-50 text-gray-500'
                  }`}
                >{p}</button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold disabled:opacity-30 ${
                darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-50 text-gray-500'
              }`}
            >›</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton Loader ─────────────────────────────────────────────────
export const Skeleton: React.FC<{ className?: string; darkMode?: boolean }> = ({ className = '', darkMode = false }) => (
  <div className={`animate-pulse ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded-xl ${className}`} />
);

// ─── Loading Spinner ─────────────────────────────────────────────────
export const LoadingSpinner: React.FC<{ darkMode?: boolean; text?: string }> = ({ darkMode, text }) => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center space-y-3">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
      {text && <p className={`text-sm font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{text}</p>}
    </div>
  </div>
);

// ─── Progress Bar ────────────────────────────────────────────────────
interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  darkMode?: boolean;
  label?: string;
  showPercent?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, max, color = ORANGE, darkMode = false, label, showPercent }) => {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      {(label || showPercent) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className={`text-[10px] font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{label}</span>}
          {showPercent && <span className={`text-[10px] font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{percent}%</span>}
        </div>
      )}
      <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

// ─── Metric Row (for compact metric display) ─────────────────────────
interface MetricRowProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
  darkMode?: boolean;
}

export const MetricRow: React.FC<MetricRowProps> = ({ label, value, icon, color = ORANGE, darkMode = false }) => (
  <div className={`flex items-center justify-between py-2 px-3 rounded-xl ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} transition-colors`}>
    <div className="flex items-center gap-2">
      {icon && <span style={{ color }}>{icon}</span>}
      <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
    </div>
    <span className={`text-sm font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</span>
  </div>
);

// ─── Status Dot ──────────────────────────────────────────────────────
interface StatusDotProps {
  status: 'active' | 'pending' | 'inactive' | 'error' | 'success';
  label?: string;
  darkMode?: boolean;
}

export const StatusDot: React.FC<StatusDotProps> = ({ status, label, darkMode = false }) => {
  const colors = {
    active: 'bg-green-500',
    pending: 'bg-amber-500',
    inactive: 'bg-gray-400',
    error: 'bg-red-500',
    success: 'bg-green-500',
  };
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${colors[status]} ${status === 'active' || status === 'pending' ? 'animate-pulse' : ''}`} />
      {label && <span className={`text-[10px] font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>}
    </div>
  );
};

// ─── Tab Bar (sub-tabs within a section) ─────────────────────────────
interface SubTabBarProps {
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onTabChange: (id: any) => void;
  darkMode?: boolean;
}

export const SubTabBar: React.FC<SubTabBarProps> = ({ tabs, activeTab, onTabChange, darkMode = false }) => (
  <div className={`flex gap-1 p-1 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
          activeTab === tab.id
            ? darkMode ? 'bg-gray-700 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm'
            : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        {tab.label}
        {tab.count !== undefined && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
            activeTab === tab.id
              ? darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'
              : darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'
          }`}>
            {tab.count}
          </span>
        )}
      </button>
    ))}
  </div>
);

import { LayoutDashboard } from 'lucide-react';
