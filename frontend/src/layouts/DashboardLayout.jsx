// src/layouts/DashboardLayout.jsx
import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import AlertDropdown from '../components/alerts/AlertDropdown';
import {
  LayoutDashboard, Camera, Monitor, Film, Bell,
  Users, BarChart3, HardDrive, Settings, LogOut,
  Menu, X, Wifi, WifiOff, Shield, ChevronRight
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'security'] },
  { path: '/live', label: 'Live View', icon: Monitor, roles: ['admin', 'security'] },
  { path: '/cameras', label: 'Cameras', icon: Camera, roles: ['admin', 'security'] },
  { path: '/recordings', label: 'Recordings', icon: Film, roles: ['admin', 'security'] },
  { path: '/alerts', label: 'Alerts', icon: Bell, roles: ['admin', 'security'], badge: true },
  { path: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'security'] },
  { path: '/storage', label: 'Storage', icon: HardDrive, roles: ['admin'] },
  { path: '/users', label: 'Users', icon: Users, roles: ['admin'] },
  { path: '/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { connected, alerts } = useSocket() || {};
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAlerts, setShowAlerts] = useState(false);

  const unreadAlerts = alerts?.filter(a => !a.isRead)?.length || 0;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredNav = navItems.filter(item => item.roles.includes(user?.role));

  return (
    <div className="flex h-screen bg-dark-900 overflow-hidden">
      {/* Sidebar */}
      <aside className={clsx(
        'flex flex-col bg-dark-800 border-r border-dark-500 transition-all duration-300 z-30',
        sidebarOpen ? 'w-64' : 'w-16'
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-dark-500 h-16">
          {sidebarOpen && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-accent-blue rounded-lg flex items-center justify-center">
                <Camera size={16} className="text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-white leading-tight">V380 CCTV</div>
                <div className="text-xs text-gray-500 leading-tight">Management System</div>
              </div>
            </div>
          )}
          {!sidebarOpen && (
            <div className="w-8 h-8 bg-accent-blue rounded-lg flex items-center justify-center mx-auto">
              <Camera size={16} className="text-white" />
            </div>
          )}
          {sidebarOpen && (
            <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-white p-1">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredNav.map(({ path, label, icon: Icon, badge }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => clsx(
                'sidebar-link relative',
                isActive && 'active',
                !sidebarOpen && 'justify-center px-2'
              )}
              title={!sidebarOpen ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {sidebarOpen && <span>{label}</span>}
              {badge && unreadAlerts > 0 && (
                <span className={clsx(
                  'bg-accent-red text-white text-xs rounded-full h-5 min-w-[20px] flex items-center justify-center px-1',
                  sidebarOpen ? 'ml-auto' : 'absolute top-1 right-1 h-4 min-w-[16px]'
                )}>
                  {unreadAlerts > 99 ? '99+' : unreadAlerts}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="p-3 border-t border-dark-500">
          <div className={clsx('flex items-center gap-3', !sidebarOpen && 'justify-center')}>
            <div className="w-8 h-8 rounded-full bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center flex-shrink-0">
              <span className="text-accent-blue text-xs font-bold">
                {user?.fullName?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{user?.fullName}</div>
                <div className="flex items-center gap-1.5">
                  <Shield size={10} className={user?.role === 'admin' ? 'text-accent-blue' : 'text-gray-500'} />
                  <span className="text-xs text-gray-500 capitalize">{user?.role}</span>
                </div>
              </div>
            )}
            {sidebarOpen && (
              <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 transition-colors" title="Logout">
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navbar */}
        <header className="h-16 bg-dark-800 border-b border-dark-500 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white">
                <Menu size={20} />
              </button>
            )}
            <h1 className="text-white font-semibold hidden md:block">
              V380 CCTV Management System
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection status */}
            <div className={clsx(
              'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full',
              connected ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
            )}>
              {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span className="hidden sm:block">{connected ? 'Live' : 'Offline'}</span>
            </div>

            {/* Alerts bell */}
            <div className="relative">
              <button
                onClick={() => setShowAlerts(!showAlerts)}
                className="relative text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-dark-600 transition-colors"
              >
                <Bell size={18} />
                {unreadAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white">
                    {unreadAlerts > 9 ? '9+' : unreadAlerts}
                  </span>
                )}
              </button>
              {showAlerts && (
                <AlertDropdown onClose={() => setShowAlerts(false)} />
              )}
            </div>

            {/* Time */}
            <LiveClock />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useState(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  });

  return (
    <div className="text-xs text-gray-400 font-mono hidden sm:block">
      {time.toLocaleTimeString()}
    </div>
  );
}
