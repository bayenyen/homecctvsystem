// src/pages/StoragePage.jsx
import { useState, useEffect } from 'react';
import { storageService, recordingService } from '../services/api';
import toast from 'react-hot-toast';
import { HardDrive, Trash2, RefreshCw, AlertTriangle, CheckCircle, Database } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import clsx from 'clsx';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

export default function StoragePage() {
  const [stats, setStats] = useState(null);
  const [byCamera, setByCamera] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, byCamRes] = await Promise.all([
        storageService.getStats(),
        storageService.getByCamera()
      ]);
      setStats(statsRes.data.data);
      setByCamera(byCamRes.data.data);
    } catch { toast.error('Failed to load storage data'); }
    finally { setLoading(false); }
  };

  const handleAutoClean = async () => {
    if (!confirm('Auto-delete the oldest recordings to free space? This cannot be undone.')) return;
    setCleaning(true);
    try {
      const { data } = await storageService.autoClean();
      toast.success(`Deleted ${data.deleted} old recordings`);
      fetchData();
    } catch { toast.error('Auto-clean failed'); }
    finally { setCleaning(false); }
  };

  const pct = stats?.usagePercent || 0;
  const statusColor = pct >= 90 ? 'text-red-400' : pct >= 75 ? 'text-yellow-400' : 'text-emerald-400';
  const statusLabel = pct >= 90 ? 'Critical' : pct >= 75 ? 'Low' : 'Healthy';

  const pieData = byCamera.slice(0, 6).map((c, i) => ({
    name: c.cameraName || 'Unknown',
    value: c.totalSize,
    formatted: c.totalSizeFormatted
  }));

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <HardDrive size={20} className="text-accent-blue" /> Storage Management
          </h2>
          <p className="text-gray-400 text-sm">Monitor and manage recording storage</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="btn-secondary text-sm"><RefreshCw size={14} /></button>
          <button onClick={handleAutoClean} disabled={cleaning} className="btn-danger text-sm">
            {cleaning ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 size={14} />}
            Auto-Clean
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="card h-40 animate-pulse bg-dark-600" />)}
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Disk', value: stats?.totalDiskFormatted || '—', icon: Database, color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
              { label: 'Used Space', value: stats?.usedDiskFormatted || '—', icon: HardDrive, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
              { label: 'Free Space', value: stats?.freeDiskFormatted || '—', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Recordings', value: `${stats?.recordingsSize ? (stats.recordingsSize / (1024*1024*1024)).toFixed(2) : '0'} GB`, icon: HardDrive, color: 'text-purple-400', bg: 'bg-purple-500/10' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="card p-4 flex items-center gap-3">
                <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', bg)}>
                  <Icon size={18} className={color} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-sm font-bold text-white">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Main storage info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Usage gauge */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Disk Usage</h3>
                <span className={clsx('text-sm font-semibold', statusColor)}>{statusLabel}</span>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Storage Used</span>
                  <span className={clsx('font-semibold', statusColor)}>{pct.toFixed(1)}%</span>
                </div>
                <div className="h-4 bg-dark-500 rounded-full overflow-hidden">
                  <div
                    className={clsx('h-full rounded-full transition-all duration-700',
                      pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-yellow-500' : 'bg-accent-blue'
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{stats?.usedDiskFormatted} used</span>
                  <span>{stats?.freeDiskFormatted} free</span>
                </div>
              </div>

              {pct >= 75 && (
                <div className={clsx('flex items-start gap-2 p-3 rounded-lg border text-sm',
                  pct >= 90 ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
                )}>
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>
                    {pct >= 90
                      ? 'Critical: Storage almost full. Enable auto-delete or manually clean old recordings immediately.'
                      : 'Warning: Storage is running low. Consider cleaning up old recordings.'}
                  </span>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="bg-dark-600 rounded-lg p-3">
                  <p className="text-gray-500 text-xs">Total Recordings</p>
                  <p className="font-bold text-white mt-0.5">{stats?.recordingCount || 0}</p>
                </div>
                <div className="bg-dark-600 rounded-lg p-3">
                  <p className="text-gray-500 text-xs">Active Now</p>
                  <p className="font-bold text-red-400 mt-0.5">{stats?.activeCount || 0}</p>
                </div>
              </div>
            </div>

            {/* Per-camera pie chart */}
            <div className="card p-5">
              <h3 className="font-semibold text-white mb-4">Storage by Camera</h3>
              {pieData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-gray-500">No recording data</div>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={180}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" strokeWidth={0}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip
                        formatter={(val) => `${(val / (1024 * 1024)).toFixed(1)} MB`}
                        contentStyle={{ backgroundColor: '#0f1629', border: '1px solid #243157', borderRadius: 8 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {pieData.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-gray-300 truncate flex-1">{item.name}</span>
                        <span className="text-gray-500">{item.formatted}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Per-camera table */}
          {byCamera.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-dark-500">
                <h3 className="font-semibold text-white">Storage Breakdown by Camera</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-500">
                    {['Camera', 'Recordings', 'Total Size', 'Usage Bar'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byCamera.map((cam, i) => {
                    const camPct = stats?.recordingsSize
                      ? Math.min((cam.totalSize / stats.recordingsSize) * 100, 100)
                      : 0;
                    return (
                      <tr key={cam._id?.toString() || i} className="table-row">
                        <td className="px-5 py-3 font-medium text-white">{cam.cameraName || 'Unknown'}</td>
                        <td className="px-5 py-3 text-gray-300">{cam.count}</td>
                        <td className="px-5 py-3 text-gray-300">{cam.totalSizeFormatted}</td>
                        <td className="px-5 py-3 w-48">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-dark-500 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${camPct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-10 text-right">{camPct.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
