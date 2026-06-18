// src/pages/RecordingsPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { recordingService, cameraService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  Film, Search, Filter, Download, Trash2, Play,
  Calendar, Camera, RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react';
import clsx from 'clsx';

export default function RecordingsPage() {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ cameraId: '', date: '', status: '', page: 1 });
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [stats, setStats] = useState(null);

  useEffect(() => {
    cameraService.getAll().then(({ data }) => setCameras(data.data));
    recordingService.getStats().then(({ data }) => setStats(data.data));
  }, []);

  useEffect(() => { fetchRecordings(); }, [filters]);

  const fetchRecordings = async () => {
    setLoading(true);
    try {
      const params = { ...filters, limit: 20 };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const { data } = await recordingService.getAll(params);
      setRecordings(data.data);
      setPagination({ total: data.total, pages: data.pages });
    } catch { toast.error('Failed to load recordings'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this recording permanently?')) return;
    try {
      await recordingService.delete(id);
      toast.success('Recording deleted');
      fetchRecordings();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  const handleDownload = (id, filename) => {
    const url = recordingService.getDownloadUrl(id);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const setFilter = (k, v) => setFilters(p => ({ ...p, [k]: v, page: 1 }));

  const formatDuration = (secs) => {
    if (!secs) return '—';
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
  };

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Recordings</h2>
          <p className="text-gray-400 text-sm">{pagination.total} recordings total</p>
        </div>
        <button onClick={fetchRecordings} className="btn-secondary text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-white' },
            { label: 'Active', value: stats.active, color: 'text-red-400' },
            { label: 'Today', value: stats.today, color: 'text-accent-blue' },
            { label: 'Total Size', value: stats.totalSizeFormatted, color: 'text-purple-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card p-3 text-center">
              <p className={clsx('text-lg font-bold', color)}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Camera size={14} className="text-gray-500" />
            <select className="input-field py-2 text-sm w-44" value={filters.cameraId} onChange={e => setFilter('cameraId', e.target.value)}>
              <option value="">All Cameras</option>
              {cameras.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-gray-500" />
            <input type="date" className="input-field py-2 text-sm w-40" value={filters.date} onChange={e => setFilter('date', e.target.value)} />
          </div>
          <div>
            <select className="input-field py-2 text-sm" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="recording">Recording</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          {(filters.cameraId || filters.date || filters.status) && (
            <button
              onClick={() => setFilters({ cameraId: '', date: '', status: '', page: 1 })}
              className="btn-secondary text-sm py-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-500">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Camera</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date / Time</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-dark-500">
                    {Array(7).fill(0).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-dark-600 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : recordings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-500">
                    <Film size={32} className="mx-auto mb-3 opacity-30" />
                    <p>No recordings found</p>
                  </td>
                </tr>
              ) : recordings.map(rec => (
                <tr key={rec._id} className="table-row">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{rec.cameraName || rec.camera?.name}</div>
                    {rec.camera?.location && <div className="text-xs text-gray-500">{rec.camera.location}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-300">
                    <div>{format(new Date(rec.startTime), 'MMM dd, yyyy')}</div>
                    <div className="text-gray-500">{format(new Date(rec.startTime), 'HH:mm:ss')}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{formatDuration(rec.duration)}</td>
                  <td className="px-4 py-3 text-gray-300">{formatSize(rec.fileSize)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={rec.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500 capitalize">{rec.recordingType}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {rec.status === 'completed' && (
                        <>
                          <Link
                            to={`/playback/${rec._id}`}
                            className="p-1.5 text-gray-500 hover:text-accent-blue hover:bg-dark-600 rounded-lg transition-colors"
                            title="Playback"
                          >
                            <Play size={13} />
                          </Link>
                          <button
                            onClick={() => handleDownload(rec._id, rec.filename)}
                            className="p-1.5 text-gray-500 hover:text-emerald-400 hover:bg-dark-600 rounded-lg transition-colors"
                            title="Download"
                          >
                            <Download size={13} />
                          </button>
                        </>
                      )}
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => handleDelete(rec._id)}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-dark-600 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-dark-500">
            <p className="text-xs text-gray-500">
              Page {filters.page} of {pagination.pages} ({pagination.total} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('page', Math.max(1, filters.page - 1))}
                disabled={filters.page === 1}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
              >
                <ChevronLeft size={12} /> Prev
              </button>
              <button
                onClick={() => setFilter('page', Math.min(pagination.pages, filters.page + 1))}
                disabled={filters.page === pagination.pages}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
              >
                Next <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    recording: 'bg-red-500/20 text-red-400 border-red-500/30',
    failed: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    corrupted: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border capitalize', styles[status] || styles.corrupted)}>
      {status === 'recording' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 recording-indicator" />}
      {status}
    </span>
  );
}
