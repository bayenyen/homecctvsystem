// src/pages/SettingsPage.jsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Settings, Lock, User, Save, Eye, EyeOff, Shield, Info } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('profile');
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [showPw, setShowPw] = useState({});
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwords.new.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwords.current,
        newPassword: passwords.new
      });
      toast.success('Password changed successfully');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setLoading(false); }
  };

  const togglePw = (k) => setShowPw(p => ({ ...p, [k]: !p[k] }));

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings size={20} className="text-accent-blue" /> Settings
        </h2>
        <p className="text-gray-400 text-sm">Account and system configuration</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-700 border border-dark-500 rounded-lg p-1 w-fit">
        {[
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'security', label: 'Security', icon: Lock },
          { id: 'system', label: 'System Info', icon: Info },
        ].map(({ id, label, icon: Icon }) => (
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

      {tab === 'profile' && (
        <div className="card p-6">
          <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
            <User size={16} className="text-accent-blue" /> Profile Information
          </h3>
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-dark-500">
            <div className="w-16 h-16 rounded-2xl bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center">
              <span className="text-2xl font-bold text-accent-blue">{user?.fullName?.[0]?.toUpperCase()}</span>
            </div>
            <div>
              <p className="text-white font-semibold text-lg">{user?.fullName}</p>
              <p className="text-gray-400 text-sm">{user?.email}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Shield size={12} className={user?.role === 'admin' ? 'text-accent-blue' : 'text-gray-500'} />
                <span className="text-xs text-gray-400 capitalize">{user?.role}</span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Username', value: user?.username, mono: true },
              { label: 'Email', value: user?.email },
              { label: 'Role', value: user?.role },
              { label: 'Status', value: user?.status },
              { label: 'Member Since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—' },
              { label: 'Last Login', value: user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never' },
            ].map(({ label, value, mono }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-dark-600 last:border-0">
                <span className="text-gray-400 text-sm">{label}</span>
                <span className={`text-sm font-medium text-white capitalize ${mono ? 'font-mono' : ''}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="card p-6">
          <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
            <Lock size={16} className="text-accent-blue" /> Change Password
          </h3>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {[
              { key: 'current', label: 'Current Password' },
              { key: 'new', label: 'New Password' },
              { key: 'confirm', label: 'Confirm New Password' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="label">{label}</label>
                <div className="relative">
                  <input
                    type={showPw[key] ? 'text' : 'password'}
                    className="input-field pr-10"
                    value={passwords[key]}
                    onChange={e => setPasswords(p => ({ ...p, [key]: e.target.value }))}
                    required
                  />
                  <button type="button" onClick={() => togglePw(key)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    {showPw[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            ))}
            <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading}>
              {loading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <Save size={14} /> Change Password
            </button>
          </form>
        </div>
      )}

      {tab === 'system' && (
        <div className="card p-6">
          <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
            <Info size={16} className="text-accent-blue" /> System Information
          </h3>
          <div className="space-y-3">
            {[
              { label: 'System Name', value: 'V380 CCTV Management System' },
              { label: 'Version', value: '1.0.0' },
              { label: 'Compatible Devices', value: 'V380 / V380PRO' },
              { label: 'Backend', value: 'Node.js + Express.js' },
              { label: 'Database', value: 'MongoDB' },
              { label: 'Stream Processing', value: 'FFmpeg' },
              { label: 'Real-time', value: 'Socket.IO' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-dark-600 last:border-0">
                <span className="text-gray-400 text-sm">{label}</span>
                <span className="text-sm text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
