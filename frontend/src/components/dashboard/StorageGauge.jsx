// src/components/dashboard/StorageGauge.jsx
import clsx from 'clsx';

export default function StorageGauge({ stats }) {
  const pct = Math.min(stats?.usagePercent || 0, 100);
  const color = pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-yellow-500' : 'bg-accent-blue';
  const textColor = pct >= 90 ? 'text-red-400' : pct >= 75 ? 'text-yellow-400' : 'text-accent-blue';

  return (
    <div className="space-y-4">
      {/* Circular gauge */}
      <div className="flex items-center justify-center">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#1c2845" strokeWidth="12" />
            <circle
              cx="60" cy="60" r="50" fill="none"
              stroke={pct >= 90 ? '#ef4444' : pct >= 75 ? '#f59e0b' : '#3b82f6'}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 50}`}
              strokeDashoffset={`${2 * Math.PI * 50 * (1 - pct / 100)}`}
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={clsx('text-2xl font-bold', textColor)}>{pct.toFixed(0)}%</span>
            <span className="text-xs text-gray-500">used</span>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Used</span>
          <span className="text-white font-medium">{stats?.usedDiskFormatted || '—'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Free</span>
          <span className="text-white font-medium">{stats?.freeDiskFormatted || '—'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Recordings</span>
          <span className="text-white font-medium">{stats?.recordingsSizeFormatted || '—'}</span>
        </div>
      </div>

      {/* Bar */}
      <div className="h-2 bg-dark-500 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {pct >= 75 && (
        <p className={clsx('text-xs text-center', textColor)}>
          {pct >= 90 ? '⚠️ Critical storage level!' : '⚡ Storage running low'}
        </p>
      )}
    </div>
  );
}
