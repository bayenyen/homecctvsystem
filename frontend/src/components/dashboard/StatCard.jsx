// src/components/dashboard/StatCard.jsx
import { Link } from 'react-router-dom';
import clsx from 'clsx';

export default function StatCard({ title, value, icon: Icon, iconColor, iconBg, trend, trendColor, pulse, alert, link }) {
  const content = (
    <div className={clsx('card p-5 transition-all duration-200', link && 'hover:border-dark-400 cursor-pointer')}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{title}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <p className="text-2xl font-bold text-white">{value}</p>
            {pulse && value > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 recording-indicator" />
            )}
          </div>
          {trend && <p className={clsx('text-xs mt-1', trendColor || 'text-gray-500')}>{trend}</p>}
        </div>
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
          <Icon size={18} className={iconColor} />
        </div>
      </div>
    </div>
  );
  return link ? <Link to={link}>{content}</Link> : content;
}
