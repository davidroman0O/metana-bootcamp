import React from 'react';
import { formatEther } from 'viem';
import { format } from 'date-fns';
import { Zap as ZapIcon, Coins as CoinsIcon, Wallet as WalletIcon, Trophy as TrophyIcon } from 'lucide-react';

interface Jackpot {
  amount: string;
  player: { address: string };
  timestamp: string;
}

interface QuickStatsProps {
  totalBets?: string;
  totalPayouts?: string;
  contractBalance?: string;
  chipsSupply?: string;
  recentJackpots?: Jackpot[];
  loading?: boolean;
}

const QuickStats: React.FC<QuickStatsProps> = ({
  totalBets,
  totalPayouts,
  contractBalance,
  chipsSupply,
  recentJackpots = [],
  loading,
}) => {
  const formatCHIPS = (value: string): string => {
    if (!value) return '0';
    const chips = parseFloat(formatEther(BigInt(value)));
    if (chips >= 1000000) return `${(chips / 1000000).toFixed(2)}M`;
    if (chips >= 1000) return `${(chips / 1000).toFixed(1)}K`;
    return chips.toFixed(2);
  };

  const formatETH = (value: string): string => {
    if (!value) return '0';
    return parseFloat(formatEther(BigInt(value))).toFixed(4);
  };

  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  const calculateHouseEdge = () => {
    if (!totalBets || !totalPayouts) return '0';
    const bets = parseFloat(formatEther(BigInt(totalBets)));
    const payouts = parseFloat(formatEther(BigInt(totalPayouts)));
    const edge = ((bets - payouts) / bets) * 100;
    return edge.toFixed(2);
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-32 mb-4"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
        <ZapIcon size={20} />
        <span>Quick Stats</span>
      </h3>

      <div className="space-y-4">
        {/* Total Volume */}
        <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
          <div className="flex items-center space-x-3">
            <CoinsIcon className="text-blue-400" size={20} />
            <div>
              <p className="text-xs text-gray-400">Total Volume</p>
              <p className="text-sm font-semibold text-white">
                {totalBets ? formatCHIPS(totalBets) : '0'} CHIPS
              </p>
            </div>
          </div>
        </div>

        {/* House Edge */}
        <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="text-green-400">%</div>
            <div>
              <p className="text-xs text-gray-400">Actual House Edge</p>
              <p className="text-sm font-semibold text-white">
                {calculateHouseEdge()}%
              </p>
            </div>
          </div>
        </div>

        {/* Contract Balance */}
        <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
          <div className="flex items-center space-x-3">
            <WalletIcon className="text-yellow-400" size={20} />
            <div>
              <p className="text-xs text-gray-400">Contract ETH</p>
              <p className="text-sm font-semibold text-white">
                {contractBalance ? formatETH(contractBalance) : '0'} ETH
              </p>
            </div>
          </div>
        </div>

        {/* CHIPS Supply */}
        <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
          <div className="flex items-center space-x-3">
            <CoinsIcon className="text-purple-400" size={20} />
            <div>
              <p className="text-xs text-gray-400">CHIPS Supply</p>
              <p className="text-sm font-semibold text-white">
                {chipsSupply ? formatCHIPS(chipsSupply) : '0'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Jackpots */}
      {recentJackpots.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center space-x-2">
            <TrophyIcon className="text-yellow-400" size={16} />
            <span>Recent Jackpots</span>
          </h4>
          <div className="space-y-2">
            {recentJackpots.slice(0, 3).map((jackpot, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-mono">
                  {formatAddress(jackpot.player.address)}
                </span>
                <div className="text-right">
                  <p className="text-yellow-400 font-semibold">
                    {formatCHIPS(jackpot.amount)} CHIPS
                  </p>
                  <p className="text-gray-600">
                    {format(new Date(parseInt(jackpot.timestamp) * 1000), 'MMM d')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickStats;