import React, { useMemo } from 'react';
import { formatEther } from 'viem';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';
import { Dices as DicesIcon } from 'lucide-react';

interface ReelDistributionProps {
  reelCounts: Record<number, number> | null;
  totalSpins: number;
  loading: boolean;
}

const ReelDistribution: React.FC<ReelDistributionProps> = ({ reelCounts, totalSpins, loading }) => {
  const chartData = useMemo(() => {
    if (!reelCounts) return [];
    
    return Object.entries(reelCounts).map(([reelCount, count]) => ({
      reelCount: `${reelCount} Reels`,
      spins: count,
      percentage: totalSpins > 0 ? (count / totalSpins * 100).toFixed(1) : '0',
    }));
  }, [reelCounts, totalSpins]);

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const formatNumber = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-sm">
          <p className="font-semibold text-white mb-2">{label}</p>
          <p className="text-gray-300">Spins: {formatNumber(data.spins)}</p>
          <p className="text-gray-300">{data.percentage}% of total</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <DicesIcon size={20} />
          <span>Spins by Reel Count</span>
        </h3>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-400"></div>
        </div>
      </div>
    );
  }

  if (!reelCounts || chartData.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <DicesIcon size={20} />
          <span>Spins by Reel Count</span>
        </h3>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <DicesIcon size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg">No spins in the last 24 hours</p>
            <p className="text-sm mt-2">Data will appear as players spin</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
        <DicesIcon size={20} />
        <span>Spins by Reel Count</span>
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="reelCount" stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" tickFormatter={formatNumber} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="spins" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Stats Summary */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-400">Total spins: <span className="font-semibold text-white">{formatNumber(totalSpins)}</span></p>
      </div>
    </div>
  );
};

export default ReelDistribution;