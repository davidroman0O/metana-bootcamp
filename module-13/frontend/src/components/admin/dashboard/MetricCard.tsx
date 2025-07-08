import React from 'react';
import { TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon, Minus as MinusIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  loading?: boolean;
}

const colorClasses = {
  blue: 'bg-blue-900/50 border-blue-500/30 text-blue-400',
  green: 'bg-green-900/50 border-green-500/30 text-green-400',
  yellow: 'bg-yellow-900/50 border-yellow-500/30 text-yellow-400',
  red: 'bg-red-900/50 border-red-500/30 text-red-400',
  purple: 'bg-purple-900/50 border-purple-500/30 text-purple-400',
};

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  icon,
  color = 'blue',
  loading = false,
}) => {
  const getTrendIcon = () => {
    if (change === undefined || change === 0) return <MinusIcon size={16} />;
    return change > 0 ? <TrendingUpIcon size={16} /> : <TrendingDownIcon size={16} />;
  };

  const getTrendColor = () => {
    if (change === undefined || change === 0) return 'text-gray-400';
    return change > 0 ? 'text-green-400' : 'text-red-400';
  };

  if (loading) {
    return (
      <div className={`p-6 rounded-xl border ${colorClasses[color]} animate-pulse`}>
        <div className="h-4 bg-gray-700 rounded w-24 mb-4"></div>
        <div className="h-8 bg-gray-700 rounded w-32 mb-2"></div>
        <div className="h-3 bg-gray-700 rounded w-20"></div>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-xl border ${colorClasses[color]} backdrop-blur-sm`}>
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        {icon && <div className={`${colorClasses[color].split(' ')[2]}`}>{icon}</div>}
      </div>
      
      <div className="space-y-2">
        <p className="text-2xl font-bold text-white">{value}</p>
        
        {subtitle && (
          <p className="text-xs text-gray-500">{subtitle}</p>
        )}
        
        {change !== undefined && (
          <div className={`flex items-center space-x-1 text-sm ${getTrendColor()}`}>
            {getTrendIcon()}
            <span>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
            {changeLabel && <span className="text-gray-500">({changeLabel})</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;