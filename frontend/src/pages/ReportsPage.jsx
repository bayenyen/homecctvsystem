// src/pages/ReportsPage.jsx
import { useState, useEffect } from 'react';
import { reportService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { BarChart3, Download, RefreshCw, Camera, Clock, HardDrive } from 'lucide-react';

export default function ReportsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('activity');
  const [activityData, setActivityData] = useState([]);
  const [auditData, setAuditData] = useState([]);
  const [storageData, setStorageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', username: '' });

  useEffect(() => { loadReport(); }, [tab]);

  const loadReport = async () => {
    setLoading(true);
    try {
      if (tab === 'activity') {
        const { data } = await reportService.getCameraActivity(filters);
        setActivityData(data.data);
      } else if (tab === 'audit') {
        const { data } = await reportService.getAuditLog({ ...filters, limit: 100 });
        setAuditData(data.data);
      } else if (tab === 'storage') {
        const { data } = await reportService.getStorage();
        setStorageData(data.data);
      }
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  const exportReport = async (type, format) => {
    try {
      const { data } = await reportService.export({ type, format });
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${type}_${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch { toast.error('Export failed'); }
  };

  const tabs = [
    { id: 'activity', label: 'Camera Activity', icon: Camera },
    { id: 'audit', label: 'Audit Log', icon: Clock },
    { id: 'storage', label: 'Storage', icon: HardDrive },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 size={20} className="text-accent-blue" /> Reports
          </h2>
          <p className="text-gray-400 text-sm">System analytics and activity logs</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadReport} className="btn-secondary text-sm"><RefreshCw size={14} /></button>
          {user?.role === 'admin' && (
            <div className="relative group">
              <button className="btn-primary text-sm"><Download size={14} /> Export</button>
              <div className="absolute right-0 top-10 bg-dark-700 border border-dark-500 rounded-lg shadow-xl z-10 hidden group-hover:block w-40">
                {[
                  { label: 'Recordings CSV', action: () => exportReport('recordings', 'csv') },
                  { label: 'Alerts CSV', action: () => exportReport('alerts', 'csv') },
                  { label: 'Audit Log CSV', action: () => exportReport('audit', 'csv') },
                ].map(({ label, action }) => (
                  <button key={label} onClick={action} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-dark-600 hover:text-white first:rounded-t-lg last:rounded-b-lg">
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-700 border border-dark-500 rounded-lg p-1 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === id ? 'bg-accent-blue text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="card h-64 animate-pulse bg-dark-600" />
      ) : tab === 'activity' ? (
        <ActivityReport data={activityData} />
      ) : tab === 'audit' ? (
        <AuditReport data={auditData} />
      ) : tab === 'storage' ? (
        <StorageReport data={storageData} />
      ) : null}
    </div>
  );
}

function ActivityReport({ data }) {
  // Aggregate by camera
  const byCamera = data.reduce((acc, item) => {
    const key = item.cameraName || 'Unknown';
    if (!acc[key]) acc[key] = { camera: key, recordings: 0, duration: 0, size: 0 };
    acc[key].recordings += item.recordings;
    acc[key].duration += item.totalDuration;
    acc[key].size += item.totalSize;
    return acc;
  }, {});

  const chartData = Object.values(byCamera);

  return (
    <div className="space-y-4">
      {chartData.length > 0 && (
        <div className="card p-5">
          <h3 className="font-medium text-white mb-4">Recordings by Camera</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2845" />
              <XAxis dataKey="camera" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f1629', border: '1px solid #243157', color: '#fff', borderRadius: 8 }} />
              <Bar dataKey="recordings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-500">
              {['Camera', 'Recordings', 'Total Duration', 'Total Size'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chartData.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No activity data</td></tr>
            ) : chartData.map((row, i) => (
              <tr key={i} className="table-row">
                <td className="px-4 py-3 font-medium text-white">{row.camera}</td>
                <td className="px-4 py-3 text-gray-300">{row.recordings}</td>
                <td className="px-4 py-3 text-gray-300">{Math.floor(row.duration / 3600)}h {Math.floor((row.duration % 3600) / 60)}m</td>
                <td className="px-4 py-3 text-gray-300">{(row.size / (1024 * 1024)).toFixed(1)} MB</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditReport({ data }) {
  const actionColors = {
    login: 'text-emerald-400', logout: 'text-gray-400',
    login_failed: 'text-red-400', camera_add: 'text-blue-400',
    recording_start: 'text-purple-400', recording_delete: 'text-orange-400',
  };
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-dark-500">
            {['User', 'Action', 'Description', 'IP', 'Time'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No audit logs</td></tr>
          ) : data.map((log) => (
            <tr key={log._id} className="table-row">
              <td className="px-4 py-2.5 text-gray-300 font-mono text-xs">{log.username || '—'}</td>
              <td className="px-4 py-2.5">
                <span className={`text-xs font-medium ${actionColors[log.action] || 'text-gray-400'}`}>
                  {log.action?.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="px-4 py-2.5 text-gray-400 text-xs max-w-xs truncate">{log.description || '—'}</td>
              <td className="px-4 py-2.5 text-gray-500 text-xs font-mono">{log.ipAddress || '—'}</td>
              <td className="px-4 py-2.5 text-gray-500 text-xs">
                {log.createdAt ? format(new Date(log.createdAt), 'MMM dd HH:mm:ss') : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StorageReport({ data }) {
  if (!data) return <div className="card p-8 text-center text-gray-500">No storage data available</div>;

  const chartData = (data.dailyUsage || []).map(d => ({
    date: d._id,
    size: Math.round(d.size / (1024 * 1024)),
    count: d.count
  })).reverse();

  return (
    <div className="space-y-4">
      {chartData.length > 0 && (
        <div className="card p-5">
          <h3 className="font-medium text-white mb-4">Daily Storage Usage (MB)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2845" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f1629', border: '1px solid #243157', color: '#fff', borderRadius: 8 }} />
              <Line type="monotone" dataKey="size" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-500">
              {['Camera', 'Recordings', 'Total Size', 'Oldest', 'Newest'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data.byCamera || []).map((row) => (
              <tr key={row._id} className="table-row">
                <td className="px-4 py-3 font-medium text-white">{row.cameraName || 'Unknown'}</td>
                <td className="px-4 py-3 text-gray-300">{row.count}</td>
                <td className="px-4 py-3 text-gray-300">{row.totalSizeFormatted}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{row.oldestRecording ? format(new Date(row.oldestRecording), 'MMM dd') : '—'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{row.newestRecording ? format(new Date(row.newestRecording), 'MMM dd') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
