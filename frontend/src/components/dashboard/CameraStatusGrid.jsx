// src/components/dashboard/CameraStatusGrid.jsx
import { Link } from 'react-router-dom';
import { Camera } from 'lucide-react';
import clsx from 'clsx';

export default function CameraStatusGrid({ cameras }) {
  const total = cameras?.total || 0;
  const online = cameras?.online || 0;
  const offline = cameras?.offline || 0;
  const unknown = cameras?.unknown || 0;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Camera size={16} className="text-accent-blue" /> Camera Status
        </h3>
        <Link to="/cameras" className="text-xs text-accent-blue hover:underline">Manage</Link>
      </div>

      {total === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Camera size={24} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No cameras configured</p>
          <Link to="/cameras" className="text-xs text-accent-blue hover:underline mt-1 block">Add your first camera</Link>
        </div>
      ) : (
        <>
          {/* Visual breakdown */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Online', value: online, color: 'text-emerald-400', bg: 'bg-emerald-500', dot: 'bg-emerald-500' },
              { label: 'Offline', value: offline, color: 'text-red-400', bg: 'bg-red-500', dot: 'bg-red-500' },
              { label: 'Unknown', value: unknown, color: 'text-gray-400', bg: 'bg-gray-500', dot: 'bg-gray-500' },
            ].map(({ label, value, color, dot }) => (
              <div key={label} className="bg-dark-600 rounded-lg p-3 text-center">
                <div className={clsx('text-xl font-bold', color)}>{value}</div>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <div className={clsx('w-1.5 h-1.5 rounded-full', dot)} />
                  <span className="text-xs text-gray-500">{label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Camera availability</span>
              <span>{total > 0 ? Math.round((online / total) * 100) : 0}%</span>
            </div>
            <div className="h-2 bg-dark-500 rounded-full overflow-hidden flex">
              <div className="bg-emerald-500 h-full transition-all" style={{ width: `${total > 0 ? (online / total) * 100 : 0}%` }} />
              <div className="bg-red-500 h-full transition-all" style={{ width: `${total > 0 ? (offline / total) * 100 : 0}%` }} />
              <div className="bg-gray-600 h-full flex-1" />
            </div>
            <div className="flex gap-4 text-xs text-gray-600">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Online</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Offline</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-600 inline-block" />Unknown</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
