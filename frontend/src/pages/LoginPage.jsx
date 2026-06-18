// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Camera, Eye, EyeOff, Lock, User, Shield } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      toast.error('Please enter username and password');
      return;
    }
    setLoading(true);
    try {
      await login(form.username, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-blue/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-accent-blue/20 border border-accent-blue/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Camera size={28} className="text-accent-blue" />
          </div>
          <h1 className="text-2xl font-bold text-white">V380 CCTV</h1>
          <p className="text-gray-400 text-sm mt-1">Management & Recording System</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <div className="flex items-center gap-2 mb-6">
            <Shield size={16} className="text-accent-blue" />
            <span className="text-sm text-gray-300 font-medium">Secure Login</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Username or Email</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  className="input-field pl-9"
                  placeholder="Enter your username"
                  value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input-field pl-9 pr-10"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading}>
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-dark-500">
            <p className="text-xs text-gray-500 text-center">
              Default credentials: <span className="text-gray-400 font-mono">admin / Admin@123</span>
            </p>
            <p className="text-xs text-gray-600 text-center mt-1">Run <span className="font-mono">npm run seed</span> to create admin account</p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          V380 CCTV Management System v1.0.0
        </p>
      </div>
    </div>
  );
}
