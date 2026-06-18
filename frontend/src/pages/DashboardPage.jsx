// src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reportService } from '../services/api';
import { useSocket } from '../context/SocketContext';
import StorageGauge from '../components/dashboard/StorageGauge';
import StatCard from '../components/dashboard/StatCard';
import RecentAlerts from '../components/dashboard/RecentAlerts';
import CameraStatusGrid from '../components/dashboard/CameraStatusGrid';
import ActivityChart from '../components/dashboard/ActivityChart';
import {
  Camera, Monitor, Circle, HardDrive,
  Film, Bell, RefreshCw, AlertTriangle
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { cameraStatuses } = useSocket() || {};

  const fetchStats = async () => {
    try {
      setError(null);
      const { data } = await reportService.getDashboard();
      setStats(data.data);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="card p-8 text-center">
      <AlertTriangle size={32} className="text-yellow-400 mx-auto mb-3" />
      <p className="text-gray-400">{error}</p>
      <button onClick={fetchStats} className="btn-secondary mt-4 mx-auto">
        <RefreshCw size={14} /> Retry
      </button>
    </div>
  );

  const cameras = stats?.cameras || {};
  const recordings = stats?.recordings || {};
  const storage = stats?.storage || {};

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Dashboard</h2>
          <p className="text-gray-400 text-sm mt-0.5">System overview and status</p>
        </div>
        <button onClick={fetchStats} className="btn-secondary text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Cameras"
          value={cameras.total || 0}
          icon={Camera}
          iconColor="text-accent-blue"
          iconBg="bg-accent-blue/10"
          link="/cameras"
        />
        <StatCard
          title="Online Cameras"
          value={cameras.online || 0}
          icon={Circle}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
          trend={cameras.total ? `${Math.round((cameras.online / cameras.total) * 100)}% uptime` : null}
          trendColor="text-emerald-400"
        />
        <StatCard
          title="Active Recordings"
          value={recordings.active || 0}
          icon={Film}
          iconColor="text-red-400"
          iconBg="bg-red-500/10"
          pulse={recordings.active > 0}
        />
        <StatCard
          title="Offline Cameras"
          value={cameras.offline || 0}
          icon={AlertTriangle}
          iconColor="text-yellow-400"
          iconBg="bg-yellow-500/10"
          alert={cameras.offline > 0}
        />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Storage gauge */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <HardDrive size={16} className="text-accent-blue" /> Storage
            </h3>
            <Link to="/storage" className="text-xs text-accent-blue hover:underline">Details</Link>
          </div>
          <StorageGauge stats={storage} />
        </div>

        {/* Recording stats */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Film size={16} className="text-accent-blue" /> Recordings
            </h3>
            <Link to="/recordings" className="text-xs text-accent-blue hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Total Recordings', value: recordings.total || 0 },
              { label: 'Active Now', value: recordings.active || 0, highlight: true },
              { label: 'Today', value: recordings.today || 0 },
              { label: 'Total Size', value: recordings.totalSizeFormatted || '0 B' },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-dark-500 last:border-0">
                <span className="text-gray-400 text-sm">{label}</span>
                <span className={`text-sm font-semibold ${highlight ? 'text-red-400' : 'text-white'}`}>
                  {value}
                  {highlight && value > 0 && <span className="ml-1.5 w-2 h-2 bg-red-500 rounded-full inline-block recording-indicator" />}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="card p-5">
          <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
            <Monitor size={16} className="text-accent-blue" /> Quick Actions
          </h3>
          <div className="space-y-2">
            <Link to="/live" className="flex items-center justify-between p-3 rounded-lg bg-dark-600 hover:bg-dark-500 transition-colors group">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center">
                  <Monitor size={14} className="text-accent-blue" />
                </div>
                <span className="text-sm font-medium text-gray-200">Live Monitor</span>
              </div>
              <span className="text-gray-500 group-hover:text-gray-300 text-xs">→</span>
            </Link>
            <Link to="/recordings" className="flex items-center justify-between p-3 rounded-lg bg-dark-600 hover:bg-dark-500 transition-colors group">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Film size={14} className="text-emerald-400" />
                </div>
                <span className="text-sm font-medium text-gray-200">Playback</span>
              </div>
              <span className="text-gray-500 group-hover:text-gray-300 text-xs">→</span>
            </Link>
            <Link to="/alerts" className="flex items-center justify-between p-3 rounded-lg bg-dark-600 hover:bg-dark-500 transition-colors group">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Bell size={14} className="text-yellow-400" />
                </div>
                <span className="text-sm font-medium text-gray-200">Alerts</span>
              </div>
              <span className="text-gray-500 group-hover:text-gray-300 text-xs">→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CameraStatusGrid cameras={stats?.cameras} />
        <RecentAlerts alerts={stats?.recentAlerts || []} />
      </div>
    </div>
  );
}
