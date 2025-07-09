import React from 'react';
import { formatEther } from 'viem';
import { format } from 'date-fns';
import { Zap as ZapIcon, Coins as CoinsIcon, Wallet as WalletIcon, Trophy as TrophyIcon } from 'lucide-react';

interface Jackpot {
  amount: string;
  player: { address: string };
  timestamp: string;
  requestId?: string;
  reelCount?: number;
  reelCombination?: string;
}

interface QuickStatsProps {
  totalBets?: string;
  totalPayouts?: string;
  contractBalance?: string;
  chipsSupply?: string;
  recentJackpots?: Jackpot[];
  currentPrizePool?: string;
  loading?: boolean;
}

const QuickStats: React.FC<QuickStatsProps> = ({
  totalBets,
  totalPayouts,
  contractBalance,
  chipsSupply,
  recentJackpots = [],
  currentPrizePool,
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
                {/* After some calculation, i understand the negative now! Even though players are winning big at the slots (negative house edge), the contract profits from the ETH fees collected on every spin. 
                The calculation is correct. The negative house edge simply means players are on a lucky streak with the slot payouts, but the contract still profits from transaction fees. */}
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

      {/* Current Progressive Jackpot */}
      {currentPrizePool && (
        <div className="mt-6 p-4 bg-gradient-to-r from-yellow-900/30 to-yellow-800/30 border border-yellow-600/30 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-yellow-400 font-semibold uppercase tracking-wider">Current Progressive Jackpot</p>
              <p className="text-2xl font-bold text-white mt-1">{formatCHIPS(currentPrizePool)} CHIPS</p>
            </div>
            <TrophyIcon className="text-yellow-400" size={32} />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-yellow-300">
              🎰 Hit all <span className="font-bold">JACKPOT symbols (6)</span> to win <span className="font-bold">25%</span> of the pool!
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="bg-yellow-900/40 px-2 py-1 rounded">
                <span className="text-yellow-400">3-reel: 6-6-6</span>
                <span className="text-gray-500 ml-1">(1:216)</span>
              </div>
              <div className="bg-yellow-900/40 px-2 py-1 rounded">
                <span className="text-yellow-400">4-reel: 6-6-6-6</span>
                <span className="text-gray-500 ml-1">(1:1,296)</span>
              </div>
              <div className="bg-yellow-900/40 px-2 py-1 rounded">
                <span className="text-yellow-400">5-reel: 6-6-6-6-6</span>
                <span className="text-gray-500 ml-1">(1:7,776)</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 italic">Shared pool across all machines • Odds shown are for hitting all 6s</p>
          </div>
        </div>
      )}

      {/* Recent Jackpots */}
      {recentJackpots.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center space-x-2 group relative">
            <TrophyIcon className="text-yellow-400" size={16} />
            <span>Progressive Jackpot History</span>
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10">
              <div className="bg-gray-900 text-xs text-gray-300 p-3 rounded-lg shadow-lg border border-gray-700 w-64">
                <p className="font-semibold text-yellow-400 mb-1">Progressive Jackpot</p>
                <p>The progressive jackpot is a special prize pool that builds up over time from a portion of each bet.</p>
                <p className="mt-1">This is different from regular "big wins" which are standard slot payouts.</p>
              </div>
            </div>
          </h4>
          <p className="text-xs text-gray-500 mb-3">{recentJackpots.length} jackpot{recentJackpots.length !== 1 ? 's' : ''} hit all-time</p>
          <div className="space-y-2">
            {recentJackpots.slice(0, 3).map((jackpot, index) => (
              <div key={index} className="p-3 bg-yellow-900/10 rounded-lg border border-yellow-600/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 font-mono text-sm">
                    {formatAddress(jackpot.player.address)}
                  </span>
                  <span className="text-yellow-400 font-semibold">
                    {formatCHIPS(jackpot.amount)} CHIPS
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-500">
                      {jackpot.reelCount ? `${jackpot.reelCount}-reel` : 'Loading...'}
                    </span>
                    {jackpot.reelCombination && (
                      <span className="font-mono bg-yellow-900/30 px-2 py-1 rounded text-yellow-400">
                        {jackpot.reelCombination}
                      </span>
                    )}
                  </div>
                  <span className="text-gray-600">
                    {format(new Date(parseInt(jackpot.timestamp) * 1000), 'MMM d, yyyy')}
                  </span>
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