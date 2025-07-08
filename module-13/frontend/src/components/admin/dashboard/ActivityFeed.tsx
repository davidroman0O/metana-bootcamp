import React from 'react';
import { formatEther } from 'viem';
import { format } from 'date-fns';
import { Activity as ActivityIcon, TrendingUp as TrendingUpIcon, Award as AwardIcon, Zap as ZapIcon } from 'lucide-react';

interface SpinActivity {
  player: { address: string };
  betAmount: string;
  payout: string;
  payoutTypeName: string;
  isJackpot: boolean;
  completedTimestamp: string;
  reelCombination: string;
}

interface ActivityFeedProps {
  recentSpins?: SpinActivity[];
  bigWinsToday?: SpinActivity[];
  loading?: boolean;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ recentSpins = [], bigWinsToday = [], loading }) => {
  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;
  
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(parseInt(timestamp) * 1000);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return format(date, 'MMM d, HH:mm');
  };

  const getPayoutColor = (payoutType: string, isJackpot: boolean) => {
    if (isJackpot) return 'text-yellow-400';
    if (payoutType.includes('MEGA') || payoutType.includes('ULTRA')) return 'text-purple-400';
    if (payoutType.includes('BIG')) return 'text-blue-400';
    if (payoutType.includes('WIN')) return 'text-green-400';
    return 'text-gray-400';
  };

  const getPayoutIcon = (payoutType: string, isJackpot: boolean) => {
    if (isJackpot) return <AwardIcon className="text-yellow-400" size={16} />;
    if (payoutType.includes('MEGA') || payoutType.includes('ULTRA')) return <ZapIcon className="text-purple-400" size={16} />;
    if (payoutType.includes('BIG')) return <TrendingUpIcon className="text-blue-400" size={16} />;
    return <ActivityIcon className="text-green-400" size={16} />;
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-32 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
        <ActivityIcon size={20} />
        <span>Live Activity Feed</span>
      </h3>

      {/* Big Wins Alert */}
      {bigWinsToday.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-500/30 rounded-lg">
          <p className="text-sm font-semibold text-yellow-400 mb-2">🔥 Big Wins Today</p>
          <div className="space-y-2">
            {bigWinsToday.slice(0, 3).map((win, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{formatAddress(win.player.address)}</span>
                <span className="font-mono text-yellow-400">
                  {parseFloat(formatEther(BigInt(win.payout))).toFixed(2)} CHIPS
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="space-y-3">
        {recentSpins.map((spin, index) => {
          const betAmount = parseFloat(formatEther(BigInt(spin.betAmount)));
          const payoutAmount = parseFloat(formatEther(BigInt(spin.payout)));
          const profit = payoutAmount - betAmount;
          
          return (
            <div key={index} className="p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    {getPayoutIcon(spin.payoutTypeName, spin.isJackpot)}
                    <span className="text-sm font-mono text-gray-300">
                      {formatAddress(spin.player.address)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(spin.completedTimestamp)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-xs">
                    <span className="text-gray-400">
                      Bet: <span className="font-mono text-white">{betAmount.toFixed(2)}</span>
                    </span>
                    <span className="text-gray-400">
                      Reels: <span className="font-mono text-gray-300">[{spin.reelCombination}]</span>
                    </span>
                    <span className={getPayoutColor(spin.payoutTypeName, spin.isJackpot)}>
                      {spin.payoutTypeName}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-mono font-semibold ${profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {profit > 0 ? '+' : ''}{profit.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">CHIPS</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {recentSpins.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <ActivityIcon size={32} className="mx-auto mb-2 opacity-50" />
          <p>No recent activity</p>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;