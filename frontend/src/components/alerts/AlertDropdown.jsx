// src/components/alerts/AlertDropdown.jsx
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { alertService } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck, AlertTriangle, XCircle, Info, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

const icons = {
  critical: XCircle, warning: AlertTriangle, success: CheckCircle, info: Info
};
const colors = {
  critical: 'text-red-400', warning: 'text-yellow-400', success: 'text-emerald-400', info: 'text-blue-400'
};

export default function AlertDropdown({ onClose }) {
  const { alerts, setAlerts } = useSocket() || {};
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const markAllRead = async () => {
    try {
      await alertService.markAllRead();
      setAlerts?.(prev => prev.map(a => ({ ...a, isRead: true })));
    } catch { /* ignore */ }
  };

  const recent = (alerts || []).slice(0, 8);
  const unread = recent.filter(a => !a.isRead).length;

  return (
    <div ref={ref} className="absolute right-0 top-10 w-80 bg-dark-800 border border-dark-500 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-500">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-accent-blue" />
          <span className="text-sm font-semibold text-white">Notifications</span>
          {unread > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-1.5">{unread}</span>}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-xs text-accent-blue hover:underline flex items-center gap-1">
            <CheckCheck size={11} /> Mark all read
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto">
        {recent.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">No notifications</div>
        ) : recent.map(alert => {
          const Icon = icons[alert.severity] || Info;
          return (
            <div key={alert._id} className={clsx(
              'px-4 py-3 flex gap-2.5 border-b border-dark-600 hover:bg-dark-700 transition-colors last:border-0',
              !alert.isRead && 'bg-dark-700/50'
            )}>
              <Icon size={14} className={clsx('flex-shrink-0 mt-0.5', colors[alert.severity] || colors.info)} />
              <div className="flex-1 min-w-0">
                <p className={clsx('text-xs font-medium truncate', !alert.isRead ? 'text-white' : 'text-gray-400')}>
                  {alert.title}
                </p>
                <p className="text-xs text-gray-500 truncate">{alert.message}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                </p>
              </div>
              {!alert.isRead && <div className="w-1.5 h-1.5 bg-accent-blue rounded-full flex-shrink-0 mt-1" />}
            </div>
          );
        })}
      </div>

      <div className="px-4 py-2 border-t border-dark-500">
        <Link to="/alerts" onClick={onClose} className="text-xs text-accent-blue hover:underline block text-center">
          View all alerts →
        </Link>
      </div>
    </div>
  );
}
