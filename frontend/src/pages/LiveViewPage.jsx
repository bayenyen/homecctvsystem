// src/pages/LiveViewPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cameraService } from '../services/api';
import { useSocket } from '../context/SocketContext';
import PTZControls from '../components/ptz/PTZControls';
import { Monitor, Grid, Maximize2, Camera, Wifi, WifiOff, Circle } from 'lucide-react';
import clsx from 'clsx';

const LAYOUTS = [
  { id: '1x1', label: '1 Camera', cols: 1 },
  { id: '2x2', label: '4 Cameras', cols: 2 },
  { id: '3x3', label: '9 Cameras', cols: 3 },
];

export default function LiveViewPage() {
  const [searchParams] = useSearchParams();
  const { cameraStatuses } = useSocket() || {};
  const [cameras, setCameras] = useState([]);
  const [layout, setLayout] = useState('2x2');
  const [selected, setSelected] = useState(null);
  const [showPTZ, setShowPTZ] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cameraService.getAll().then(({ data }) => {
      setCameras(data.data);
      const camParam = searchParams.get('camera');
      if (camParam) {
        setSelected(camParam);
        setLayout('1x1');
      }
    }).finally(() => setLoading(false));
  }, []);

  const displayedCameras = (() => {
    const cols = LAYOUTS.find(l => l.id === layout)?.cols || 2;
    const max = cols * cols;
    if (selected) {
      const cam = cameras.find(c => c._id === selected);
      return cam ? [cam] : cameras.slice(0, max);
    }
    return cameras.slice(0, max);
  })();

  const selectedCamera = cameras.find(c => c._id === selected);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Monitor size={20} className="text-accent-blue" /> Live Monitor
          </h2>
          <p className="text-gray-400 text-sm">{cameras.filter(c => c.status === 'online').length} cameras online</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Layout selector */}
          <div className="flex gap-1 bg-dark-700 border border-dark-500 rounded-lg p-1">
            {LAYOUTS.map(l => (
              <button
                key={l.id}
                onClick={() => { setLayout(l.id); setSelected(null); }}
                className={clsx('px-3 py-1 rounded-md text-xs font-medium transition-all',
                  layout === l.id && !selected ? 'bg-accent-blue text-white' : 'text-gray-400 hover:text-white'
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
          {selectedCamera?.ptzSupported && (
            <button
              onClick={() => setShowPTZ(!showPTZ)}
              className={clsx('btn-secondary text-sm', showPTZ && 'bg-dark-500')}
            >
              PTZ Controls
            </button>
          )}
          {selected && (
            <button onClick={() => setSelected(null)} className="btn-secondary text-sm">
              Show All
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        {/* Video Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="aspect-video bg-dark-700 rounded-xl animate-pulse" />)}
            </div>
          ) : cameras.length === 0 ? (
            <div className="card p-16 text-center">
              <Camera size={40} className="mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400">No cameras configured</p>
            </div>
          ) : (
            <div className={clsx(
              'grid gap-3',
              layout === '1x1' ? 'grid-cols-1' :
              layout === '2x2' ? 'grid-cols-2' : 'grid-cols-3'
            )}>
              {displayedCameras.map(camera => (
                <CameraFeed
                  key={camera._id}
                  camera={camera}
                  isSelected={selected === camera._id}
                  quality={selected === camera._id ? 'main' : 'grid'}
                  liveStatus={cameraStatuses?.[camera._id] || camera.status}
                  onClick={() => {
                    if (selected === camera._id) { setSelected(null); setLayout('2x2'); }
                    else { setSelected(camera._id); setLayout('1x1'); }
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* PTZ Panel */}
        {showPTZ && selectedCamera?.ptzSupported && (
          <div className="w-64 flex-shrink-0">
            <PTZControls camera={selectedCamera} />
          </div>
        )}
      </div>

      {/* Camera list selector */}
      {cameras.length > 0 && (
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">All Cameras</p>
          <div className="flex flex-wrap gap-2">
            {cameras.map(cam => {
              const status = cameraStatuses?.[cam._id] || cam.status;
              return (
                <button
                  key={cam._id}
                  onClick={() => { setSelected(cam._id); setLayout('1x1'); }}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                    selected === cam._id
                      ? 'bg-accent-blue/20 border-accent-blue/40 text-accent-blue'
                      : 'bg-dark-700 border-dark-500 text-gray-400 hover:text-white hover:border-dark-400'
                  )}
                >
                  <span className={clsx('w-1.5 h-1.5 rounded-full',
                    status === 'online' ? 'bg-emerald-400' : 'bg-red-400'
                  )} />
                  {cam.name}
                  {cam.isRecording && <span className="w-1.5 h-1.5 rounded-full bg-red-500 recording-indicator" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CameraFeed({ camera, isSelected, quality = 'grid', liveStatus, onClick }) {
  const isOnline = liveStatus === 'online';
  const videoRef = useRef(null);
  const lastProgressRef = useRef({ time: 0, checkedAt: Date.now() });
  const restartTimerRef = useRef(null);
  const [videoError, setVideoError] = useState(false);
  const [videoKey, setVideoKey] = useState(0);
  const liveUrl = cameraService.getLiveUrl(camera._id, { quality });
  const showVideo = isOnline && camera.streamUrl && !videoError;

  const restartStream = () => {
    setVideoError(false);
    setVideoKey(prev => prev + 1);
    lastProgressRef.current = { time: 0, checkedAt: Date.now() };
  };

  const scheduleRestart = (delay = 1500) => {
    if (restartTimerRef.current) return;
    restartTimerRef.current = setTimeout(() => {
      restartTimerRef.current = null;
      if (isOnline && camera.streamUrl) restartStream();
    }, delay);
  };

  // Restart stream when page becomes visible (fixes pause when switching tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && showVideo) {
        restartStream();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [showVideo]);

  useEffect(() => {
    if (!videoError || !isOnline || !camera.streamUrl) return undefined;
    const timer = setTimeout(restartStream, 5000);
    return () => clearTimeout(timer);
  }, [videoError, isOnline, camera.streamUrl]);

  useEffect(() => {
    if (!showVideo) return undefined;

    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.paused || video.ended) return;

      const currentTime = video.currentTime || 0;
      const last = lastProgressRef.current;
      const hasProgressed = Math.abs(currentTime - last.time) > 0.05;

      if (hasProgressed) {
        lastProgressRef.current = { time: currentTime, checkedAt: Date.now() };
        return;
      }

      // Increased timeout from 12s to 30s to prevent false restarts on slow cameras
      // This fixes the "timestamp freezing then jumping back" issue on low-FPS cameras
      if (Date.now() - last.checkedAt > 30000) {
        console.warn(`[Stream Freeze] ${camera.name} frozen for 30s, restarting...`);
        scheduleRestart(0);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [showVideo, videoKey]);

  useEffect(() => {
    restartStream();
  }, [quality]);

  useEffect(() => () => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
  }, []);

  return (
    <div
      onClick={onClick}
      className={clsx(
        'relative aspect-video bg-dark-900 rounded-xl overflow-hidden cursor-pointer border-2 transition-all group',
        isSelected ? 'border-accent-blue' : 'border-dark-500 hover:border-dark-400'
      )}
    >
      {showVideo ? (
        <video
          ref={videoRef}
          key={videoKey}
          className="absolute inset-0 w-full h-full object-cover"
          src={liveUrl}
          autoPlay
          muted
          playsInline
          controls={false}
          onCanPlay={() => setVideoError(false)}
          onTimeUpdate={(event) => {
            lastProgressRef.current = {
              time: event.currentTarget.currentTime || 0,
              checkedAt: Date.now()
            };
          }}
          onWaiting={() => scheduleRestart(10000)}
          onStalled={() => scheduleRestart(8000)}
          onEnded={() => scheduleRestart(500)}
          onError={() => {
            setVideoError(true);
            scheduleRestart(5000);
          }}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center gap-2">
          <Camera size={32} className="text-dark-500 mb-2" />
          <p className="text-xs text-gray-400 font-mono break-words">{camera.ipAddress}</p>
          {camera.streamUrl ? (
            <>
              <p className="text-xs text-gray-500">
                {isOnline ? 'Live proxy unavailable. Try opening in an external player.' : 'Camera is offline or not ready.'}
              </p>
              <a
                href={camera.streamUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-accent-blue underline"
              >Open in external player</a>
            </>
          ) : (
            <p className="text-xs text-gray-500">No stream URL configured.</p>
          )}
        </div>
      )}

      {/* Scanlines overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-5"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)' }} />

      {/* Status overlay */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5">
        <span className={clsx(
          'flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
          isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
        )}>
          {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
          {isOnline ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>

      {/* Recording */}
      {camera.isRecording && (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-500/20 border border-red-500/30 text-red-400 text-xs px-2 py-0.5 rounded">
          <Circle size={8} className="fill-red-400 recording-indicator" /> REC
        </div>
      )}

      {/* Camera name */}
      <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-dark-900/90 to-transparent">
        <p className="text-xs font-medium text-white truncate">{camera.name}</p>
        {camera.location && <p className="text-xs text-gray-500 truncate">{camera.location}</p>}
      </div>

      {/* Timestamp */}
      <div className="absolute top-2 right-12 text-xs text-gray-500 font-mono hidden group-hover:block">
        <LiveTimestamp />
      </div>
    </div>
  );
}

function LiveTimestamp() {
  const [t, setT] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  return <span>{t.toLocaleTimeString()}</span>;
}
