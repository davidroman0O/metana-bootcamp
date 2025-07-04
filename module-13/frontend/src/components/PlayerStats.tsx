import React from 'react';
import { formatEther } from 'viem';
import { User, TrendingUp, Target, Award } from 'lucide-react';

interface PlayerStatsProps {
  chipBalance: bigint | undefined;
  borrowedAmount: bigint | undefined;
  totalWins: number;
  totalSpins: number;
  biggestWin: string;
  isConnected: boolean;
}

const PlayerStats: React.FC<PlayerStatsProps> = ({
  chipBalance,
  borrowedAmount,
  totalWins,
  totalSpins,
  biggestWin,
  isConnected,
}) => {
  if (!isConnected) return null;

  const winRate = totalSpins > 0 ? ((totalWins / totalSpins) * 100).toFixed(1) : '0.0';
  const formattedChipBalance = chipBalance ? parseFloat(formatEther(chipBalance)).toFixed(2) : '0.00';
  const formattedBorrowedAmount = borrowedAmount ? parseFloat(formatEther(borrowedAmount)).toFixed(2) : '0.00';

  return (
    <div className="player-stats bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-2xl p-6 border border-blue-500/30">
      <div className="flex items-center gap-3 mb-4">
        <User className="text-blue-400" size={24} />
        <h2 className="text-xl font-bold text-white">Player Statistics</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* CHIP Balance */}
        <div className="stat-item bg-black/30 rounded-lg p-4 text-center">
          <div className="text-2xl mb-2">💎</div>
          <div className="text-lg font-bold text-blue-400">{formattedChipBalance}</div>
          <div className="text-sm text-gray-400">CHIPS</div>
        </div>

        {/* Win Rate */}
        <div className="stat-item bg-black/30 rounded-lg p-4 text-center">
          <TrendingUp className="text-green-400 mx-auto mb-2" size={24} />
          <div className="text-lg font-bold text-green-400">{winRate}%</div>
          <div className="text-sm text-gray-400">Win Rate</div>
        </div>

        {/* Total Spins */}
        <div className="stat-item bg-black/30 rounded-lg p-4 text-center">
          <Target className="text-purple-400 mx-auto mb-2" size={24} />
          <div className="text-lg font-bold text-purple-400">{totalSpins}</div>
          <div className="text-sm text-gray-400">Total Spins</div>
        </div>

        {/* Biggest Win */}
        <div className="stat-item bg-black/30 rounded-lg p-4 text-center">
          <Award className="text-yellow-400 mx-auto mb-2" size={24} />
          <div className="text-lg font-bold text-yellow-400">{biggestWin}</div>
          <div className="text-sm text-gray-400">Biggest Win</div>
        </div>
      </div>

      {/* Debt Warning */}
      {Boolean(borrowedAmount && borrowedAmount > 0n) && (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-red-400">⚠️</span>
            <span className="text-red-400 font-medium">
              Outstanding Debt: {formattedBorrowedAmount} ETH equivalent
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerStats; 