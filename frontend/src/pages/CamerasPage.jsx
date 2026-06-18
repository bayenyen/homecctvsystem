// src/pages/CamerasPage.jsx
import { useState, useEffect } from 'react';
import { cameraService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';
import CameraCard from '../components/cameras/CameraCard';
import CameraFormModal from '../components/cameras/CameraFormModal';
import {
  Camera, Plus, Search, Grid, List, RefreshCw, Filter
} from 'lucide-react';
import clsx from 'clsx';

export default function CamerasPage() {
  const { user } = useAuth();
  const { cameraStatuses } = useSocket() || {};
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [showModal, setShowModal] = useState(false);
  const [editCamera, setEditCamera] = useState(null);
  const [discovered, setDiscovered] = useState([]);
  const [discovering, setDiscovering] = useState(false);
  const [addedSet, setAddedSet] = useState(new Set());

  const fetchCameras = async () => {
    try {
      const { data } = await cameraService.getAll();
      setCameras(data.data);
      setAddedSet(new Set((data.data || []).map(c => c.ipAddress)));
    } catch { toast.error('Failed to load cameras'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCameras(); }, []);

  // Update camera statuses from socket
  useEffect(() => {
    if (cameraStatuses && Object.keys(cameraStatuses).length) {
      setCameras(prev => prev.map(c => ({
        ...c,
        status: cameraStatuses[c._id] || c.status
      })));
    }
  }, [cameraStatuses]);

  const handleDelete = async (id) => {
    if (!confirm('Remove this camera?')) return;
    try {
      await cameraService.delete(id);
      setCameras(prev => prev.filter(c => c._id !== id));
      toast.success('Camera removed');
    } catch { toast.error('Failed to remove camera'); }
  };

  const handleRecordingToggle = async (camera) => {
    try {
      if (camera.isRecording) {
        await cameraService.stopRecording(camera._id);
        toast.success(`Stopped recording: ${camera.name}`);
      } else {
        await cameraService.startRecording(camera._id);
        toast.success(`Started recording: ${camera.name}`);
      }
      fetchCameras();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleSave = () => {
    setShowModal(false);
    setEditCamera(null);
    fetchCameras();
  };

  const discoverCameras = async () => {
    setDiscovering(true);
    try {
      const { data } = await cameraService.discover();
      setDiscovered(data.data);
      toast.success(`Found ${data.count} network camera${data.count === 1 ? '' : 's'}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to discover cameras');
    } finally {
      setDiscovering(false);
    }
  };

  const handleAddDiscovered = (camera) => {
    setEditCamera({
      name: `Discovered ${camera.ipAddress}`,
      ipAddress: camera.ipAddress,
      port: camera.port || 554,
      username: camera.source === 'v380-udp' ? 'admin' : 'admin',
      password: '',
      streamUrl: camera.streamUrl || '',
      streamType: camera.streamType || (camera.source === 'v380-udp' ? 'manual' : 'rtsp'),
      location: '',
      description: camera.rawResponse ? `deviceId:${camera.deviceId || ''}` : '',
      recordingMode: 'continuous',
      resolution: '1080p',
      fps: 15,
      ptzSupported: camera.ptzSupported || false,
      tags: []
    });
    setShowModal(true);
  };

  const [quickAdding, setQuickAdding] = useState([]);

  const quickAdd = async (camera) => {
    const key = `${camera.ipAddress}:${camera.port}`;
    if (quickAdding.includes(key)) return;
    if (addedSet.has(camera.ipAddress)) {
      toast('Camera already exists');
      return;
    }
    setQuickAdding((s) => [...s, key]);
    try {
      // Probe for RTSP URL and PTZ support
      let ptzSupported = camera.ptzSupported || false;
      try {
        const { data: probeData } = await cameraService.probe({ ipAddress: camera.ipAddress, port: camera.port });
        if (probeData?.data?.streamUrl) {
          camera.streamUrl = probeData.data.streamUrl;
        }
        if (probeData?.data?.ptzSupported !== undefined) {
          ptzSupported = probeData.data.ptzSupported;
        }
        if (probeData?.data?.ptzConfig) {
          camera.ptzConfig = probeData.data.ptzConfig;
        }
      } catch (probeErr) {
        // probe failure is non-fatal; continue without streamUrl
      }
      const payload = {
        name: `Discovered ${camera.ipAddress}`,
        ipAddress: camera.ipAddress,
        port: camera.port || 554,
        username: camera.source === 'v380-udp' ? 'admin' : 'admin',
        password: '',
        streamUrl: camera.streamUrl || '',
        streamType: camera.streamType || (camera.source === 'v380-udp' ? 'manual' : 'rtsp'),
        location: '',
        description: camera.rawResponse ? `deviceId:${camera.deviceId || ''}` : '',
        recordingMode: 'continuous',
        resolution: '1080p',
        fps: 15,
        ptzSupported: ptzSupported,
        ptzConfig: camera.ptzConfig,
        tags: []
      };

      await cameraService.add(payload);
      toast.success(`Camera ${camera.ipAddress} added`);
      // Mark as exists in discovered list
      setDiscovered((prev) => prev.map((d) => (d.ipAddress === camera.ipAddress ? { ...d, exists: true } : d)));
      setAddedSet((s) => new Set(Array.from(s).concat([camera.ipAddress])));
      fetchCameras();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add camera');
    } finally {
      setQuickAdding((s) => s.filter((x) => x !== key));
    }
  };

  const filtered = cameras.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.ipAddress.includes(search) ||
      (c.location || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || c.status === filter ||
      (filter === 'recording' && c.isRecording);
    return matchSearch && matchFilter;
  });

  const filterCounts = {
    all: cameras.length,
    online: cameras.filter(c => c.status === 'online').length,
    offline: cameras.filter(c => c.status === 'offline').length,
    recording: cameras.filter(c => c.isRecording).length,
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Cameras</h2>
          <p className="text-gray-400 text-sm">{cameras.length} cameras configured</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchCameras} className="btn-secondary text-sm">
            <RefreshCw size={14} />
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={discoverCameras}
              className="btn-secondary text-sm"
              disabled={discovering}
            >
              {discovering ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search size={14} />
              )}
              Discover
            </button>
          )}
          {user?.role === 'admin' && (
            <button onClick={() => setShowModal(true)} className="btn-primary text-sm">
              <Plus size={14} /> Add Camera
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            className="input-field pl-9 py-2 text-sm"
            placeholder="Search cameras..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-1 bg-dark-700 border border-dark-500 rounded-lg p-1">
          {Object.entries(filterCounts).map(([key, count]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={clsx(
                'px-3 py-1 rounded-md text-xs font-medium transition-all capitalize',
                filter === key ? 'bg-accent-blue text-white' : 'text-gray-400 hover:text-white'
              )}
            >
              {key} ({count})
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-dark-700 border border-dark-500 rounded-lg p-1">
          <button onClick={() => setViewMode('grid')} className={clsx('p-1.5 rounded', viewMode === 'grid' ? 'bg-dark-500 text-white' : 'text-gray-500')}>
            <Grid size={14} />
          </button>
          <button onClick={() => setViewMode('list')} className={clsx('p-1.5 rounded', viewMode === 'list' ? 'bg-dark-500 text-white' : 'text-gray-500')}>
            <List size={14} />
          </button>
        </div>
      </div>

      {/* Discovered Cameras */}
      {discovered.length > 0 && (
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Discovered Network Cameras</h3>
              <p className="text-gray-400 text-sm">Detected cameras on the same network.</p>
            </div>
            <div className="text-sm text-gray-400">{discovered.length} found</div>
          </div>
          <div className="space-y-3">
            {discovered.map((camera) => (
              <div key={`${camera.ipAddress}:${camera.port}`} className="flex flex-wrap items-center justify-between gap-3 p-4 bg-dark-700 rounded-xl border border-dark-500">
                <div>
                  <p className="text-sm text-white">{camera.ipAddress}:{camera.port}</p>
                  <p className="text-xs text-gray-400">{camera.exists ? 'Already configured' : 'New camera candidate'}</p>
                </div>
                  <div className="flex gap-2">
                  <>
                    <button
                      onClick={() => quickAdd(camera)}
                      className="btn-secondary text-sm"
                      disabled={addedSet.has(camera.ipAddress) || quickAdding.includes(`${camera.ipAddress}:${camera.port}`)}
                    >
                      {addedSet.has(camera.ipAddress) ? 'Added' : quickAdding.includes(`${camera.ipAddress}:${camera.port}`) ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Add'
                      )}
                    </button>
                    <button
                      onClick={() => handleAddDiscovered(camera)}
                      className="btn-outline text-sm"
                    >
                      Edit
                    </button>
                  </>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Camera Grid/List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="card h-48 animate-pulse bg-dark-600" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <Camera size={40} className="mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400 font-medium">
            {cameras.length === 0 ? 'No cameras added yet' : 'No cameras match your search'}
          </p>
          {cameras.length === 0 && user?.role === 'admin' && (
            <button onClick={() => setShowModal(true)} className="btn-primary mt-4 mx-auto">
              <Plus size={14} /> Add First Camera
            </button>
          )}
        </div>
      ) : (
        <div className={clsx(
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
            : 'space-y-3'
        )}>
          {filtered.map(camera => (
            <CameraCard
              key={camera._id}
              camera={camera}
              viewMode={viewMode}
              onEdit={() => { setEditCamera(camera); setShowModal(true); }}
              onDelete={() => handleDelete(camera._id)}
              onRecordingToggle={() => handleRecordingToggle(camera)}
              isAdmin={user?.role === 'admin'}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <CameraFormModal
          camera={editCamera}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditCamera(null); }}
        />
      )}
    </div>
  );
}
