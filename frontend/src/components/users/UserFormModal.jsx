// src/components/users/UserFormModal.jsx
import { useState, useEffect } from 'react';
import { userService } from '../../services/api';
import toast from 'react-hot-toast';
import { X, Users } from 'lucide-react';

export default function UserFormModal({ user, onSave, onClose }) {
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '', role: 'security', status: 'active' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) setForm({ ...user, password: '' });
  }, [user]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (user) {
        const { password, ...updates } = form;
        await userService.update(user._id, updates);
        toast.success('User updated');
      } else {
        await userService.create(form);
        toast.success('User created');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save user');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-dark-800 border border-dark-500 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-dark-500">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Users size={16} className="text-accent-blue" />
            {user ? 'Edit User' : 'Add User'}
          </h2>
          <button onClick={onClose}><X size={18} className="text-gray-500 hover:text-white" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input type="text" className="input-field" value={form.fullName} onChange={e => set('fullName', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Username *</label>
              <input type="text" className="input-field" value={form.username} onChange={e => set('username', e.target.value)} required disabled={!!user} />
            </div>
            <div>
              <label className="label">Email *</label>
              <input type="email" className="input-field" value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>
          </div>
          {!user && (
            <div>
              <label className="label">Password *</label>
              <input type="password" className="input-field" value={form.password} onChange={e => set('password', e.target.value)} required minLength={6} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Role</label>
              <select className="input-field" value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="security">Security Staff</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input-field" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {user ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
