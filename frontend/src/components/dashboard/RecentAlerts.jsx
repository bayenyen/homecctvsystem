// src/components/dashboard/RecentAlerts.jsx
import { Link } from 'react-router-dom';
import { Bell, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';

const severityConfig = {
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  critical: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  success: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};

export default function RecentAlerts({ alerts }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Bell size={16} className="text-accent-blue" /> Recent Alerts
        </h3>
        <Link to="/alerts" className="text-xs text-accent-blue hover:underline">View all</Link>
      </div>
      {alerts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <CheckCircle size={24} className="mx-auto mb-2 text-emerald-500/50" />
          <p className="text-sm">No recent alerts</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {alerts.map((alert) => {
            const cfg = severityConfig[alert.severity] || severityConfig.info;
            const Icon = cfg.icon;
            return (
              <div key={alert._id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-dark-600 transition-colors">
                <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', cfg.bg)}>
                  <Icon size={13} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 font-medium truncate">{alert.title}</p>
                  <p className="text-xs text-gray-500 truncate">{alert.message}</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                  </p>
                </div>
                {!alert.isRead && <div className="w-1.5 h-1.5 bg-accent-blue rounded-full mt-2 flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
