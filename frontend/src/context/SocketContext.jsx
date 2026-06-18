// src/context/SocketContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [cameraStatuses, setCameraStatuses] = useState({});

  useEffect(() => {
    if (!user) {
      if (socket) { socket.disconnect(); setSocket(null); setConnected(false); }
      return;
    }

    const token = localStorage.getItem('token');
    const s = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    s.on('connect', () => { setConnected(true); });
    s.on('disconnect', () => { setConnected(false); });

    s.on('new_alert', (alert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 49)]);

      // Show toast for important alerts
      const toastFn = alert.severity === 'critical' ? toast.error
        : alert.severity === 'warning' ? toast
        : alert.severity === 'success' ? toast.success
        : toast;

      toastFn(alert.message, { duration: 5000, position: 'top-right' });
    });

    s.on('camera_status', ({ cameraId, status }) => {
      setCameraStatuses(prev => ({ ...prev, [cameraId]: status }));
    });

    s.on('recording_event', (event) => {
      if (event.event === 'started') {
        toast.success(`Recording started: ${event.cameraName}`, { duration: 3000 });
      }
    });

    s.on('storage_warning', (data) => {
      if (data.level === 'critical') {
        toast.error(`⚠️ Storage Critical: ${data.usagePercent?.toFixed(1)}% used!`, { duration: 8000 });
      }
    });

    setSocket(s);
    return () => { s.disconnect(); };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, connected, alerts, setAlerts, cameraStatuses }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
