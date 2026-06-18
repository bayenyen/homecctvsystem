// src/components/cameras/CameraCard.jsx
import { Link } from 'react-router-dom';
import { Camera, MapPin, Circle, Film, Edit2, Trash2, Play, Square, Eye, Wifi } from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';

const statusColors = {
  online: 'badge-online',
  offline: 'badge-offline',
  unknown: 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30',
  error: 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30',
};

export default function CameraCard({ camera, viewMode, onEdit, onDelete, onRecordingToggle, isAdmin }) {
  if (viewMode === 'list') {
    return (
      <div className="card p-4 flex items-center gap-4 hover:border-dark-400 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-dark-600 flex items-center justify-center flex-shrink-0">
          <Camera size={18} className="text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-white">{camera.name}</span>
            <span className={statusColors[camera.status] || statusColors.unknown}>
              <span className={clsx('w-1.5 h-1.5 rounded-full', camera.status === 'online' ? 'bg-emerald-400' : 'bg-red-400')} />
              {camera.status}
            </span>
            {camera.isRecording && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 recording-indicator" />REC
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
            <span className="font-mono">{camera.ipAddress}:{camera.port}</span>
            {camera.location && <span className="flex items-center gap-1"><MapPin size={10} />{camera.location}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link to={`/live?camera=${camera._id}`} className="btn-secondary text-xs py-1.5 px-3">
            <Eye size={12} /> View
          </Link>
          <button onClick={onRecordingToggle} className={clsx('text-xs py-1.5 px-3 rounded-lg font-medium flex items-center gap-1 transition-colors',
            camera.isRecording ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
          )}>
            {camera.isRecording ? <><Square size={12} />Stop</> : <><Play size={12} />Rec</>}
          </button>
          {isAdmin && (
            <>
              <button onClick={onEdit} className="p-1.5 text-gray-500 hover:text-white transition-colors"><Edit2 size={14} /></button>
              <button onClick={onDelete} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden hover:border-dark-400 transition-all duration-200 group">
      {/* Video preview area */}
      <div className="relative h-44 bg-dark-900 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <Camera size={36} className="text-dark-500" />
        </div>
        {/* Scan line effect */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)' }} />

        {/* Status badge */}
        <div className="absolute top-2 left-2">
          <span className={statusColors[camera.status] || statusColors.unknown}>
            <span className={clsx('w-1.5 h-1.5 rounded-full',
              camera.status === 'online' ? 'bg-emerald-400' : camera.status === 'offline' ? 'bg-red-400' : 'bg-gray-400'
            )} />
            {camera.status}
          </span>
        </div>

        {/* Recording indicator */}
        {camera.isRecording && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-500/20 border border-red-500/30 text-red-400 text-xs px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full recording-indicator" />
            REC
          </div>
        )}

        {/* View button on hover */}
        <Link
          to={`/live?camera=${camera._id}`}
          className="absolute inset-0 flex items-center justify-center bg-dark-900/60 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <span className="flex items-center gap-2 bg-accent-blue text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Eye size={14} /> Live View
          </span>
        </Link>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-white truncate">{camera.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Wifi size={11} className="text-gray-500" />
              <span className="text-xs text-gray-500 font-mono">{camera.ipAddress}:{camera.port}</span>
            </div>
            {camera.location && (
              <div className="flex items-center gap-1 mt-1">
                <MapPin size={11} className="text-gray-600" />
                <span className="text-xs text-gray-500">{camera.location}</span>
              </div>
            )}
          </div>
          {isAdmin && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button onClick={onEdit} className="p-1.5 text-gray-500 hover:text-white hover:bg-dark-500 rounded-lg transition-colors">
                <Edit2 size={13} />
              </button>
              <button onClick={onDelete} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-dark-500 rounded-lg transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-dark-500">
          <button
            onClick={onRecordingToggle}
            className={clsx(
              'flex-1 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors',
              camera.isRecording
                ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30'
                : 'bg-dark-600 text-gray-400 hover:text-white hover:bg-dark-500 border border-dark-400'
            )}
          >
            {camera.isRecording ? <><Square size={11} />Stop Rec</> : <><Play size={11} />Start Rec</>}
          </button>
          {camera.lastSeen && (
            <span className="text-xs text-gray-600">
              {formatDistanceToNow(new Date(camera.lastSeen), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
