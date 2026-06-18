// src/pages/AlertsPage.jsx
import { useState, useEffect } from 'react';
import { alertService } from '../services/api';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  Bell, Check, CheckCheck, Trash2, Filter,
  AlertTriangle, XCircle, Info, CheckCircle, RefreshCw
} from 'lucide-react';
import clsx from 'clsx';

const severityConfig = {
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  critical: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  success: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
};

export default function AlertsPage() {
  const { alerts: socketAlerts } = useSocket() || {};
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [unread, setUnread] = useState(0);

  useEffect(() => { fetchAlerts(); }, [filter]);

  // Merge socket alerts
  useEffect(() => {
    if (socketAlerts?.length) {
      setAlerts(prev => {
        const ids = new Set(prev.map(a => a._id));
        const newOnes = socketAlerts.filter(a => !ids.has(a._id));
        return [...newOnes, ...prev];
      });
    }
  }, [socketAlerts]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter === 'unread') params.isRead = false;
      else if (filter !== 'all') params.severity = filter;

      const [{ data }, countData] = await Promise.all([
        alertService.getAll(params),
        alertService.getUnreadCount()
      ]);
      setAlerts(data.data);
      setUnread(countData.data.count);
    } catch { toast.error('Failed to load alerts'); }
    finally { setLoading(false); }
  };

  const markRead = async (id) => {
    try {
      await alertService.markRead(id);
      setAlerts(prev => prev.map(a => a._id === id ? { ...a, isRead: true } : a));
      setUnread(p => Math.max(0, p - 1));
    } catch { toast.error('Failed to mark as read'); }
  };

  const markAllRead = async () => {
    try {
      await alertService.markAllRead();
      setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
      setUnread(0);
      toast.success('All alerts marked as read');
    } catch { toast.error('Failed to update alerts'); }
  };

  const handleDelete = async (id) => {
    try {
      await alertService.delete(id);
      setAlerts(prev => prev.filter(a => a._id !== id));
      toast.success('Alert deleted');
    } catch { toast.error('Failed to delete alert'); }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell size={20} className="text-accent-blue" /> Alerts
            {unread > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{unread}</span>
            )}
          </h2>
          <p className="text-gray-400 text-sm">{alerts.length} alerts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAlerts} className="btn-secondary text-sm"><RefreshCw size={14} /></button>
          {unread > 0 && (
            <button onClick={markAllRead} className="btn-secondary text-sm">
              <CheckCheck size={14} /> Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 bg-dark-700 border border-dark-500 rounded-lg p-1 w-fit">
        {['all', 'unread', 'critical', 'warning', 'info', 'success'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              'px-3 py-1 rounded-md text-xs font-medium transition-all capitalize',
              filter === f ? 'bg-accent-blue text-white' : 'text-gray-400 hover:text-white'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div className="space-y-2">
        {loading ? (
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="card h-16 animate-pulse bg-dark-600" />
          ))
        ) : alerts.length === 0 ? (
          <div className="card p-16 text-center">
            <CheckCircle size={36} className="mx-auto mb-3 text-emerald-500/30" />
            <p className="text-gray-400">No alerts to show</p>
          </div>
        ) : alerts.map(alert => {
          const cfg = severityConfig[alert.severity] || severityConfig.info;
          const Icon = cfg.icon;
          return (
            <div
              key={alert._id}
              className={clsx(
                'card p-4 flex items-start gap-3 transition-all',
                !alert.isRead && 'border-l-2 border-l-accent-blue'
              )}
            >
              <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5', cfg.bg, 'border', cfg.border)}>
                <Icon size={16} className={cfg.color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={clsx('text-sm font-semibold', !alert.isRead ? 'text-white' : 'text-gray-300')}>
                      {alert.title}
                    </p>
                    <p className="text-sm text-gray-400 mt-0.5">{alert.message}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-gray-600">
                        {format(new Date(alert.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                      </span>
                      {alert.cameraName && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          📷 {alert.cameraName}
                        </span>
                      )}
                      <span className={clsx('text-xs capitalize px-1.5 py-0.5 rounded', cfg.bg, cfg.color)}>
                        {alert.severity}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!alert.isRead && (
                      <button onClick={() => markRead(alert._id)} className="p-1.5 text-gray-500 hover:text-emerald-400 hover:bg-dark-600 rounded-lg transition-colors" title="Mark read">
                        <Check size={13} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(alert._id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-dark-600 rounded-lg transition-colors" title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
