// src/pages/UsersPage.jsx
import { useState, useEffect } from 'react';
import { userService } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Users, Plus, Edit2, Trash2, Key, Shield, User } from 'lucide-react';
import clsx from 'clsx';
import UserFormModal from '../components/users/UserFormModal';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [newPass, setNewPass] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await userService.getAll();
      setUsers(data.data);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this user?')) return;
    try {
      await userService.delete(id);
      setUsers(prev => prev.filter(u => u._id !== id));
      toast.success('User deleted');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
  };

  const handleResetPassword = async () => {
    if (!newPass || newPass.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    try {
      await userService.resetPassword(resetUser._id, newPass);
      toast.success(`Password reset for ${resetUser.username}`);
      setResetUser(null);
      setNewPass('');
    } catch { toast.error('Failed to reset password'); }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users size={20} className="text-accent-blue" /> Users
          </h2>
          <p className="text-gray-400 text-sm">{users.length} users</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary text-sm">
          <Plus size={14} /> Add User
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-500">
              {['User', 'Username', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <tr key={i} className="border-b border-dark-500">
                  {Array(6).fill(0).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-dark-600 rounded animate-pulse" /></td>)}
                </tr>
              ))
            ) : users.map(user => (
              <tr key={user._id} className="table-row">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-accent-blue text-xs font-bold">{user.fullName?.[0]?.toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="font-medium text-white">{user.fullName}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-sm text-gray-300">{user.username}</td>
                <td className="px-4 py-3">
                  <span className={clsx(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border capitalize',
                    user.role === 'admin'
                      ? 'bg-accent-blue/20 text-accent-blue border-accent-blue/30'
                      : 'bg-dark-600 text-gray-400 border-dark-400'
                  )}>
                    {user.role === 'admin' ? <Shield size={10} /> : <User size={10} />}
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={clsx(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border capitalize',
                    user.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                  )}>
                    {user.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {user.lastLogin ? format(new Date(user.lastLogin), 'MMM dd, HH:mm') : 'Never'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => { setEditUser(user); setShowModal(true); }} className="p-1.5 text-gray-500 hover:text-white hover:bg-dark-600 rounded-lg transition-colors">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => setResetUser(user)} className="p-1.5 text-gray-500 hover:text-yellow-400 hover:bg-dark-600 rounded-lg transition-colors" title="Reset password">
                      <Key size={13} />
                    </button>
                    <button onClick={() => handleDelete(user._id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-dark-600 rounded-lg transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reset password modal */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-dark-800 border border-dark-500 rounded-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-white mb-1">Reset Password</h3>
            <p className="text-xs text-gray-500 mb-4">For user: {resetUser.username}</p>
            <input
              type="password" className="input-field mb-4" placeholder="New password (min 6 chars)"
              value={newPass} onChange={e => setNewPass(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setResetUser(null); setNewPass(''); }} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleResetPassword} className="btn-primary text-sm">Reset</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <UserFormModal
          user={editUser}
          onSave={() => { setShowModal(false); setEditUser(null); fetchUsers(); }}
          onClose={() => { setShowModal(false); setEditUser(null); }}
        />
      )}
    </div>
  );
}
