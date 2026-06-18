// src/components/ptz/PTZControls.jsx
import { useState } from 'react';
import { ptzService } from '../../services/api';
import toast from 'react-hot-toast';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Home, Crosshair } from 'lucide-react';
import clsx from 'clsx';

export default function PTZControls({ camera }) {
  const [speed, setSpeed] = useState(5);
  const [loading, setLoading] = useState(null);

  const sendCmd = async (command, opts = {}) => {
    if (!opts.silent) setLoading(command);
    try {
      await ptzService.sendCommand(camera._id, command, speed);
    } catch (err) {
      const msg = err.response?.data?.message || `PTZ command failed: ${command}`;
      const details = err.response?.data?.error;
      toast.error(details ? `${msg} — ${details}` : msg);
    } finally {
      if (!opts.silent) setLoading(null);
    }
  };

  const PTZBtn = ({ cmd, icon: Icon, label, className = '', continuous = false }) => (
    <button
      type="button"
      onClick={() => !continuous && sendCmd(cmd)}
      onMouseDown={() => continuous && sendCmd(cmd)}
      onMouseUp={() => continuous && sendCmd('stop', { silent: true })}
      onMouseLeave={() => continuous && sendCmd('stop', { silent: true })}
      onTouchStart={() => continuous && sendCmd(cmd)}
      onTouchEnd={() => continuous && sendCmd('stop', { silent: true })}
      disabled={!!loading && loading !== cmd}
      className={clsx(
        'flex items-center justify-center w-12 h-12 rounded-xl bg-dark-600 hover:bg-dark-500 border border-dark-400',
        'text-gray-300 hover:text-white transition-all active:scale-95 disabled:opacity-50',
        loading === cmd && 'bg-accent-blue/20 border-accent-blue/30 text-accent-blue',
        className
      )}
      title={label}
    >
      <Icon size={18} />
    </button>
  );

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Crosshair size={14} className="text-accent-blue" />
        <h3 className="text-sm font-semibold text-white">PTZ Controls</h3>
      </div>

      {/* D-pad */}
      <div className="grid grid-cols-3 gap-1.5 mb-4">
        <div />
        <PTZBtn cmd="up" icon={ChevronUp} label="Pan Up" continuous />
        <div />
        <PTZBtn cmd="left" icon={ChevronLeft} label="Pan Left" continuous />
        <PTZBtn cmd="home" icon={Home} label="Home Position" />
        <PTZBtn cmd="right" icon={ChevronRight} label="Pan Right" continuous />
        <div />
        <PTZBtn cmd="down" icon={ChevronDown} label="Pan Down" continuous />
        <div />
      </div>

      {/* Zoom */}
      <div className="flex gap-1.5 mb-4">
        <PTZBtn cmd="zoom_in" icon={ZoomIn} label="Zoom In" className="flex-1" continuous />
        <PTZBtn cmd="zoom_out" icon={ZoomOut} label="Zoom Out" className="flex-1" continuous />
      </div>

      {/* Speed */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>Speed</span>
          <span className="font-mono text-white">{speed}</span>
        </div>
        <input
          type="range" min={1} max={10} value={speed}
          onChange={e => setSpeed(parseInt(e.target.value))}
          className="w-full accent-accent-blue"
        />
        <div className="flex justify-between text-xs text-gray-600 mt-0.5">
          <span>Slow</span><span>Fast</span>
        </div>
      </div>

      <p className="text-xs text-gray-600 mt-3 text-center">
        {camera.ptzConfig?.protocol?.toUpperCase() || 'HTTP'} protocol
      </p>
    </div>
  );
}
