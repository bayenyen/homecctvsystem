// src/components/cameras/CameraFormModal.jsx
import { useState, useEffect } from 'react';
import { cameraService } from '../../services/api';
import toast from 'react-hot-toast';
import { X, Camera, Eye, EyeOff, Info } from 'lucide-react';

const defaultForm = {
  name: '', ipAddress: '', port: 554, username: 'admin', password: '',
  streamUrl: '', streamType: 'rtsp', location: '', description: '',
  recordingMode: 'continuous', resolution: '1080p', fps: 15,
  ptzSupported: false, ptzConfig: { protocol: 'http', controlUrl: '', port: 8899 }, tags: ''
};

export default function CameraFormModal({ camera, onSave, onClose }) {
  const [form, setForm] = useState(defaultForm);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('basic');

  useEffect(() => {
    if (camera) {
      setForm({
        ...defaultForm,
        ...camera,
        tags: Array.isArray(camera.tags) ? camera.tags.join(', ') : ''
      });
    }
  }, [camera]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.ipAddress) {
      toast.error('Camera name and IP address are required');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      };

      if (camera && camera._id) {
        await cameraService.update(camera._id, payload);
        toast.success('Camera updated');
      } else {
        await cameraService.add(payload);
        toast.success('Camera added successfully');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save camera');
    } finally {
      setLoading(false);
    }
  };

  const previewUrl = form.streamUrl || (form.ipAddress
    ? `rtsp://${form.username ? `${form.username}:***@` : ''}${form.ipAddress}:${form.port}/stream`
    : '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-800 border border-dark-500 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-dark-500">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-accent-blue/10 rounded-lg flex items-center justify-center">
              <Camera size={16} className="text-accent-blue" />
            </div>
            <h2 className="font-semibold text-white">{camera && camera._id ? 'Edit Camera' : 'Add New Camera'}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-500 px-5">
          {['basic', 'stream', 'recording', 'ptz'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                tab === t ? 'border-accent-blue text-accent-blue' : 'border-transparent text-gray-500 hover:text-white'
              }`}
            >
              {t === 'ptz' ? 'PTZ' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5">
          {tab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Camera Name *</label>
                  <input type="text" className="input-field" placeholder="e.g. Front Door Camera" value={form.name} onChange={e => set('name', e.target.value)} required />
                </div>
                <div>
                  <label className="label">IP Address *</label>
                  <input type="text" className="input-field font-mono" placeholder="192.168.1.100" value={form.ipAddress} onChange={e => set('ipAddress', e.target.value)} required />
                </div>
                <div>
                  <label className="label">Port</label>
                  <input type="number" className="input-field font-mono" placeholder="554" value={form.port} onChange={e => set('port', parseInt(e.target.value))} />
                </div>
                <div>
                  <label className="label">Username</label>
                  <input type="text" className="input-field" placeholder="admin" value={form.username} onChange={e => set('username', e.target.value)} />
                </div>
                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} className="input-field pr-9" placeholder="Camera password" value={form.password} onChange={e => set('password', e.target.value)} />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500">
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Location</label>
                  <input type="text" className="input-field" placeholder="e.g. Main Entrance" value={form.location} onChange={e => set('location', e.target.value)} />
                </div>
                <div>
                  <label className="label">Tags (comma separated)</label>
                  <input type="text" className="input-field" placeholder="outdoor, entrance" value={form.tags} onChange={e => set('tags', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="label">Description</label>
                  <textarea className="input-field resize-none" rows={2} placeholder="Optional camera description" value={form.description} onChange={e => set('description', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {tab === 'stream' && (
            <div className="space-y-4">
              <div>
                <label className="label">Stream Type</label>
                <select className="input-field" value={form.streamType} onChange={e => set('streamType', e.target.value)}>
                  <option value="rtsp">RTSP (Recommended for V380)</option>
                  <option value="rtmp">RTMP</option>
                  <option value="http">HTTP</option>
                  <option value="hls">HLS</option>
                  <option value="manual">Manual URL</option>
                </select>
              </div>
              <div>
                <label className="label">Custom Stream URL</label>
                <input type="text" className="input-field font-mono text-sm" placeholder="rtsp://admin:password@192.168.1.100:554/stream" value={form.streamUrl} onChange={e => set('streamUrl', e.target.value)} />
                <p className="text-xs text-gray-500 mt-1">Leave blank to auto-generate from IP/Port/Credentials</p>
              </div>
              {previewUrl && (
                <div className="bg-dark-700 rounded-lg p-3 border border-dark-500">
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Info size={11} /> Generated Stream URL</p>
                  <p className="text-xs font-mono text-gray-300 break-all">{previewUrl}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Resolution</label>
                  <select className="input-field" value={form.resolution} onChange={e => set('resolution', e.target.value)}>
                    {['360p', '480p', '720p', '1080p', '4K'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">FPS</label>
                  <select className="input-field" value={form.fps} onChange={e => set('fps', parseInt(e.target.value))}>
                    {[5, 10, 15, 20, 25, 30].map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {tab === 'recording' && (
            <div className="space-y-4">
              <div>
                <label className="label">Recording Mode</label>
                <select className="input-field" value={form.recordingMode} onChange={e => set('recordingMode', e.target.value)}>
                  <option value="continuous">Continuous (24/7)</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="manual">Manual Only</option>
                  <option value="motion">Motion Triggered</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
              <div className="bg-dark-700 rounded-lg p-3 border border-dark-500">
                <p className="text-xs text-gray-400">
                  <strong className="text-white">Continuous:</strong> Records 24/7 automatically<br />
                  <strong className="text-white">Scheduled:</strong> Records during set hours<br />
                  <strong className="text-white">Manual:</strong> Only records when manually started<br />
                  <strong className="text-white">Disabled:</strong> No automatic recording
                </p>
              </div>
            </div>
          )}

          {tab === 'ptz' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg border border-dark-500">
                <div>
                  <p className="text-sm font-medium text-white">PTZ Support</p>
                  <p className="text-xs text-gray-500">Enable if this camera supports Pan-Tilt-Zoom</p>
                </div>
                <button
                  type="button"
                  onClick={() => set('ptzSupported', !form.ptzSupported)}
                  className={`w-11 h-6 rounded-full transition-colors ${form.ptzSupported ? 'bg-accent-blue' : 'bg-dark-400'}`}
                >
                  <span className={`block w-4 h-4 rounded-full bg-white transition-transform mx-1 ${form.ptzSupported ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              {form.ptzSupported && (
                <>
                  <div>
                    <label className="label">PTZ Protocol</label>
                    <select className="input-field" value={form.ptzConfig?.protocol || 'http'} onChange={e => set('ptzConfig', { ...form.ptzConfig, protocol: e.target.value })}>
                      <option value="http">HTTP (V380 Standard)</option>
                      <option value="onvif">ONVIF</option>
                      <option value="v380api">V380 API</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">ONVIF Port</label>
                      <input
                        type="number"
                        className="input-field"
                        placeholder="8899"
                        value={form.ptzConfig?.port || 8899}
                        onChange={e => set('ptzConfig', { ...form.ptzConfig, port: parseInt(e.target.value) || 8899 })}
                      />
                      <p className="text-xs text-gray-500 mt-1">V380 cameras use port 8899 for ONVIF PTZ</p>
                    </div>
                    <div>
                      <label className="label">PTZ Control URL</label>
                      <input
                        type="text"
                        className="input-field font-mono"
                        placeholder="e.g. /ptzctrl.cgi (optional)"
                        value={form.ptzConfig?.controlUrl || ''}
                        onChange={e => set('ptzConfig', { ...form.ptzConfig, controlUrl: e.target.value })}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Optional: manual control endpoint
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-dark-500">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} className="btn-primary" disabled={loading}>
            {loading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {camera && camera._id ? 'Save Changes' : 'Add Camera'}
          </button>
        </div>
      </div>
    </div>
  );
}
