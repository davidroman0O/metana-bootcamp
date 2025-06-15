import React from 'react';

interface PoolStatsProps {
  poolETH: string | null;
  ethPrice: string | null;
  chipRate: string | null;
  isLoading: boolean;
  error: string | null;
  layout?: 'horizontal' | 'vertical';
  showLabels?: boolean;
  className?: string;
}

const PoolStats: React.FC<PoolStatsProps> = ({
  poolETH,
  ethPrice,
  chipRate,
  isLoading,
  error,
  layout = 'horizontal',
  showLabels = true,
  className = ''
}) => {
  // Loading state
  if (isLoading) {
    return (
      <div className={`flex ${layout === 'horizontal' ? 'flex-row space-x-4' : 'flex-col space-y-2'} ${className}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-700/50 rounded-lg p-3 flex-1">
            <div className="h-4 bg-gray-600 rounded mb-1"></div>
            <div className="h-3 bg-gray-600 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-red-500/20 border border-red-500/30 rounded-lg p-3 ${className}`}>
        <div className="text-red-400 text-sm text-center">
          Failed to load pool data
        </div>
      </div>
    );
  }

  // Success state
  const stats = [
    {
      value: poolETH,
      label: showLabels ? 'Pool ETH' : 'ETH',
      color: 'text-blue-400',
      fallback: '-.--'
    },
    {
      value: ethPrice,
      label: showLabels ? 'ETH Price' : 'Price',
      color: 'text-green-400',
      fallback: '--'
    },
    {
      value: chipRate,
      label: showLabels ? 'CHIPS/ETH' : 'Rate',
      color: 'text-yellow-400',
      fallback: '---'
    }
  ];

  return (
    <div className={`flex ${layout === 'horizontal' ? 'flex-row space-x-4' : 'flex-col space-y-2'} ${className}`}>
      {stats.map((stat, index) => (
        <div key={index} className="bg-black/30 rounded-lg p-3 text-center flex-1">
          <div className={`text-lg font-bold ${stat.color}`}>
            {stat.value || stat.fallback}
          </div>
          <div className="text-xs text-gray-400">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PoolStats; 