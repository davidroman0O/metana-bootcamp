import React, { useState } from 'react';
import { formatEther } from 'viem';
import { Home, DollarSign, TrendingUp, Coins } from 'lucide-react';
import toast from 'react-hot-toast';

interface HouseComponentProps {
  // Pool data
  poolETH: string;
  ethPrice: string;
  chipRate: string;
  
  // Buy chips functionality
  isConnected: boolean;
  isBuying: boolean;
  onBuyChips: (ethAmount: string) => void;
  
  // Expected chips calculation
  expectedChips: string;
}

const HouseComponent: React.FC<HouseComponentProps> = ({
  poolETH,
  ethPrice,
  chipRate,
  isConnected,
  isBuying,
  onBuyChips,
  expectedChips,
}) => {
  const [ethAmount, setEthAmount] = useState<string>('0.1');

  const handleBuyChips = () => {
    if (!ethAmount || parseFloat(ethAmount) <= 0) {
      toast.error('Please enter a valid ETH amount');
      return;
    }
    onBuyChips(ethAmount);
  };

  return (
    <div className="house-component bg-gradient-to-br from-green-900/50 to-emerald-900/50 rounded-2xl p-6 border border-green-500/30">
      <div className="flex items-center gap-3 mb-6">
        <Home className="text-green-400" size={24} />
        <h2 className="text-xl font-bold text-white">House Statistics</h2>
      </div>

      {/* House Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Pool Size */}
        <div className="stat-card bg-black/30 rounded-lg p-4 text-center">
          <div className="text-2xl mb-2">🏦</div>
          <div className="text-lg font-bold text-blue-400">{parseFloat(poolETH).toFixed(2)}</div>
          <div className="text-sm text-gray-400">Pool Size (ETH)</div>
        </div>

        {/* ETH Price from Chainlink */}
        <div className="stat-card bg-black/30 rounded-lg p-4 text-center">
          <TrendingUp className="text-purple-400 mx-auto mb-2" size={20} />
          <div className="text-lg font-bold text-purple-400">{ethPrice}</div>
          <div className="text-sm text-gray-400">ETH Price (Chainlink)</div>
        </div>

        {/* CHIP Rate */}
        <div className="stat-card bg-black/30 rounded-lg p-4 text-center">
          <Coins className="text-orange-400 mx-auto mb-2" size={20} />
          <div className="text-lg font-bold text-orange-400">{chipRate}</div>
          <div className="text-sm text-gray-400">CHIPS per ETH</div>
        </div>
      </div>

      {/* Buy CHIPS Section */}
      {isConnected && (
        <div className="buy-chips-section bg-black/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="text-green-400" size={20} />
            <h3 className="text-lg font-bold text-green-400">Buy $CHIPs</h3>
          </div>

          <div className="space-y-4">
            {/* ETH Input */}
            <div className="flex items-center gap-4">
              <input
                type="number"
                placeholder="ETH amount"
                value={ethAmount}
                onChange={(e) => setEthAmount(e.target.value)}
                disabled={isBuying}
                className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                step="0.01"
                min="0"
              />
              
              <button
                onClick={handleBuyChips}
                disabled={isBuying || !ethAmount || parseFloat(ethAmount) <= 0}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
              >
                {isBuying ? 'Buying...' : 'Buy CHIPs'}
              </button>
            </div>

            {/* Expected CHIPS Display */}
            {ethAmount && parseFloat(ethAmount) > 0 && (
              <div className="text-sm text-gray-300">
                Expected: <span className="text-green-400 font-medium">{parseFloat(expectedChips).toFixed(0)} CHIPs</span>
              </div>
            )}

            {/* Info Text */}
            <div className="text-xs text-gray-400">
              💡 CHIPs are automatically approved for unlimited use when purchased
            </div>
          </div>
        </div>
      )}

      {/* House Edge Info */}
      <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
        <div className="text-sm text-yellow-300">
          <span className="font-medium">🎲 House Edge:</span> Built into payout multipliers • 
          <span className="font-medium"> Win Rate:</span> 21.8% • 
          <span className="font-medium"> Max Payout:</span> 666x
        </div>
      </div>
    </div>
  );
};

export default HouseComponent; 