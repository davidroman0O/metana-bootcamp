import React, { useState } from 'react';
import { formatEther } from 'viem';
import { CreditCard, AlertTriangle, DollarSign, Percent, Shield, TrendingUp, ArrowDownCircle } from 'lucide-react';

interface CreditLoanProps {
  isConnected: boolean;
  // Player stats from our improved hook
  borrowedAmount: bigint | undefined;
  accountLiquidity: bigint | undefined;
  userCollateralETH: bigint | undefined;
  
  // Compound functions
  onDepositCollateral: (ethAmount: string) => void;
  onBorrowChips: (ethAmount: string) => void;
  onRepayLoan: (chipAmount: string) => void;
  onRepayLoanWithETH: (ethAmount: string) => void;
  onWithdrawCollateral: (ethAmount: string) => void;
  
  // Transaction states
  isDepositingCollateral: boolean;
  isBorrowingChips: boolean;
  isRepayingLoan: boolean;
  isWithdrawingCollateral: boolean;
  
  // Helper functions
  canWithdrawCollateral: boolean;
  getCollateralizationRatio: () => number;
  getLiquidationRisk: () => { level: string; color: string; percentage: number };
  
  // Compound position info
  compoundPosition: {
    collateralFactor: bigint;
    totalCollateralETH: bigint;
  };
}

const CreditLoan: React.FC<CreditLoanProps> = ({
  isConnected,
  borrowedAmount,
  accountLiquidity,
  userCollateralETH,
  onDepositCollateral,
  onBorrowChips,
  onRepayLoan,
  onRepayLoanWithETH,
  onWithdrawCollateral,
  isDepositingCollateral,
  isBorrowingChips,
  isRepayingLoan,
  isWithdrawingCollateral,
  canWithdrawCollateral,
  getCollateralizationRatio,
  getLiquidationRisk,
  compoundPosition,
}) => {
  const [collateralAmount, setCollateralAmount] = useState<string>('0.5');
  const [borrowAmount, setBorrowAmount] = useState<string>('0.1');
  const [repayChipsAmount, setRepayChipsAmount] = useState<string>('');
  const [repayETHAmount, setRepayETHAmount] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');

  if (!isConnected) return null;

  const formattedBorrowedAmount = borrowedAmount ? parseFloat(formatEther(borrowedAmount)).toFixed(4) : '0.0000';
  const formattedLiquidity = accountLiquidity ? parseFloat(formatEther(accountLiquidity)).toFixed(4) : '0.0000';
  const formattedCollateral = userCollateralETH ? parseFloat(formatEther(userCollateralETH)).toFixed(4) : '0.0000';
  
  // Calculate liquidation risk
  const hasDebt = borrowedAmount && borrowedAmount > 0n;
  const hasCollateral = userCollateralETH && userCollateralETH > 0n;
  const liquidationRisk = getLiquidationRisk();
  const collateralizationRatio = getCollateralizationRatio();
  const collateralFactorPercent = Number(compoundPosition.collateralFactor || 75n);

  return (
    <div className="credit-loan bg-gradient-to-br from-red-900/50 to-pink-900/50 rounded-2xl p-6 border border-red-500/30">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="text-red-400" size={24} />
        <h2 className="text-xl font-bold text-white">Leverage & Credit</h2>
        <span className="text-sm text-gray-400">(Powered by Compound Finance)</span>
      </div>

      {/* Enhanced Position Overview */}
      <div className="position-overview mb-6">
        <h3 className="text-lg font-bold text-purple-400 mb-4">📊 Your Position</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Collateral Deposited */}
          <div className="stat-card bg-black/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="text-blue-400" size={16} />
              <span className="text-sm text-gray-400">Collateral</span>
            </div>
            <div className="text-xl font-bold text-blue-400">{formattedCollateral} ETH</div>
            <div className="text-xs text-gray-500">
              Factor: {collateralFactorPercent}%
            </div>
          </div>

          {/* Outstanding Debt */}
          <div className="stat-card bg-black/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="text-red-400" size={16} />
              <span className="text-sm text-gray-400">Debt</span>
            </div>
            <div className="text-xl font-bold text-red-400">{formattedBorrowedAmount} ETH</div>
            <div className="text-xs text-gray-500">
              Borrowed equivalent
            </div>
          </div>

          {/* Available to Borrow */}
          <div className="stat-card bg-black/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="text-green-400" size={16} />
              <span className="text-sm text-gray-400">Available</span>
            </div>
            <div className="text-xl font-bold text-green-400">{formattedLiquidity} ETH</div>
            <div className="text-xs text-gray-500">
              To borrow
            </div>
          </div>
        </div>

        {/* Liquidation Risk Display */}
        {!!hasDebt && (
          <div className={`liquidation-warning p-4 rounded-lg border mb-4 ${liquidationRisk.level === 'CRITICAL' ? 'bg-red-900/30 border-red-500/50' : 
            liquidationRisk.level === 'HIGH' ? 'bg-orange-900/30 border-orange-500/50' : 
            liquidationRisk.level === 'MEDIUM' ? 'bg-yellow-900/30 border-yellow-500/50' : 
            'bg-green-900/30 border-green-500/50'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className={liquidationRisk.color} size={20} />
                <span className="font-bold text-white">Liquidation Risk: {liquidationRisk.level}</span>
              </div>
              <div className={`font-bold ${liquidationRisk.color}`}>
                {collateralizationRatio.toFixed(1)}% Ratio
              </div>
            </div>
            
            {/* Risk Progress Bar */}
            <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  liquidationRisk.level === 'CRITICAL' ? 'bg-red-500' :
                  liquidationRisk.level === 'HIGH' ? 'bg-orange-500' :
                  liquidationRisk.level === 'MEDIUM' ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${liquidationRisk.percentage}%` }}
              ></div>
            </div>
            
            <div className="text-sm text-gray-300">
              {liquidationRisk.level === 'CRITICAL' && 
                "⚠️ URGENT: Deposit more collateral or repay debt immediately!"}
              {liquidationRisk.level === 'HIGH' && 
                "⚠️ HIGH RISK: Consider adding collateral or reducing debt"}
              {liquidationRisk.level === 'MEDIUM' && 
                "📊 Monitor your position closely"}
              {liquidationRisk.level === 'LOW' && 
                "✅ Your position is healthy"}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Actions */}
      <div className="credit-actions space-y-6">
        
        {/* Deposit Collateral */}
        <div className="action-section bg-black/30 rounded-lg p-4">
          <h4 className="text-md font-bold text-blue-400 mb-3">
            <Shield className="inline mr-2" size={16} />
            Deposit Collateral
          </h4>
          <div className="flex items-center gap-4 mb-2">
            <input
              type="number"
              placeholder="ETH amount"
              value={collateralAmount}
              onChange={(e) => setCollateralAmount(e.target.value)}
              disabled={isDepositingCollateral}
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              step="0.01"
              min="0"
            />
            <button
              onClick={() => onDepositCollateral(collateralAmount)}
              disabled={isDepositingCollateral || !collateralAmount || parseFloat(collateralAmount) <= 0}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-all duration-200"
            >
              {isDepositingCollateral ? 'Depositing...' : 'Deposit'}
            </button>
          </div>
          <div className="text-xs text-gray-400">
            💡 Increases borrowing power by ~{(parseFloat(collateralAmount || '0') * collateralFactorPercent / 100).toFixed(3)} ETH
          </div>
        </div>

        {/* Borrow CHIPS */}
        <div className="action-section bg-black/30 rounded-lg p-4">
          <h4 className="text-md font-bold text-yellow-400 mb-3">
            <DollarSign className="inline mr-2" size={16} />
            Borrow CHIPS
          </h4>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 relative">
              <input
                type="number"
                placeholder="ETH equivalent"
                value={borrowAmount}
                onChange={(e) => {
                  const value = e.target.value;
                  const maxBorrow = parseFloat(formattedLiquidity);
                  // Cap input to max borrowable amount
                  if (value === '' || (parseFloat(value) <= maxBorrow)) {
                    setBorrowAmount(value);
                  }
                }}
                disabled={isBorrowingChips}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 pr-12 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none disabled:opacity-50"
                step="0.01"
                min="0"
                max={formattedLiquidity}
              />
              <button
                onClick={() => setBorrowAmount(formattedLiquidity)}
                disabled={isBorrowingChips || parseFloat(formattedLiquidity) === 0}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-yellow-600/30 disabled:bg-gray-600/30 disabled:cursor-not-allowed text-yellow-400 disabled:text-gray-500 text-xs font-bold px-2 py-1 rounded select-none"
                style={{ transform: 'translateY(-50%)', position: 'absolute', right: '8px', top: '50%' }}
              >
                MAX
              </button>
            </div>
            <button
              onClick={() => onBorrowChips(borrowAmount)}
              disabled={isBorrowingChips || !borrowAmount || parseFloat(borrowAmount) <= 0 || parseFloat(borrowAmount) > parseFloat(formattedLiquidity)}
              className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-all duration-200"
            >
              {isBorrowingChips ? 'Borrowing...' : 'Borrow'}
            </button>
          </div>
          <div className="text-xs text-gray-400">
            🎰 Max available: {formattedLiquidity} ETH worth of CHIPS
          </div>
        </div>

        {/* Repay Loans - Enhanced with dual options */}
        {!!hasDebt && (
          <div className="action-section bg-black/30 rounded-lg p-4">
            <h4 className="text-md font-bold text-green-400 mb-3">
              <Percent className="inline mr-2" size={16} />
              Repay Loan
            </h4>
            
            {/* Repay with CHIPS */}
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">Repay with CHIPS</label>
              <div className="flex items-center gap-4 mb-2">
                <input
                  type="number"
                  placeholder="CHIPS amount"
                  value={repayChipsAmount}
                  onChange={(e) => setRepayChipsAmount(e.target.value)}
                  disabled={isRepayingLoan}
                  className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                  step="1"
                  min="0"
                />
                <button
                  onClick={() => onRepayLoan(repayChipsAmount)}
                  disabled={isRepayingLoan || !repayChipsAmount || parseFloat(repayChipsAmount) <= 0}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-all duration-200"
                >
                  {isRepayingLoan ? 'Repaying...' : 'Pay CHIPS'}
                </button>
              </div>
            </div>

            {/* Repay with ETH */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Repay with ETH directly</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="number"
                    placeholder="ETH amount"
                    value={repayETHAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      const maxRepay = parseFloat(formattedBorrowedAmount);
                      // Cap input to max repayable amount
                      if (value === '' || (parseFloat(value) <= maxRepay)) {
                        setRepayETHAmount(value);
                      }
                    }}
                    disabled={isRepayingLoan}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 pr-12 text-white placeholder-gray-400 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none disabled:opacity-50"
                    step="0.01"
                    min="0"
                    max={formattedBorrowedAmount}
                  />
                  <button
                    onClick={() => setRepayETHAmount(formattedBorrowedAmount)}
                    disabled={isRepayingLoan || parseFloat(formattedBorrowedAmount) === 0}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-600/30 disabled:bg-gray-600/30 disabled:cursor-not-allowed text-green-400 disabled:text-gray-500 text-xs font-bold px-2 py-1 rounded select-none"
                    style={{ transform: 'translateY(-50%)', position: 'absolute', right: '8px', top: '50%' }}
                  >
                    MAX
                  </button>
                </div>
                <button
                  onClick={() => onRepayLoanWithETH(repayETHAmount)}
                  disabled={isRepayingLoan || !repayETHAmount || parseFloat(repayETHAmount) <= 0 || parseFloat(repayETHAmount) > parseFloat(formattedBorrowedAmount)}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-all duration-200"
                >
                  {isRepayingLoan ? 'Repaying...' : 'Pay ETH'}
                </button>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                💰 Max repayable: {formattedBorrowedAmount} ETH
              </div>
            </div>
          </div>
        )}

        {/* NEW: Withdraw Collateral */}
        {!!hasCollateral && (
          <div className="action-section bg-black/30 rounded-lg p-4">
            <h4 className="text-md font-bold text-purple-400 mb-3">
              <ArrowDownCircle className="inline mr-2" size={16} />
              Withdraw Collateral
            </h4>
            
            {canWithdrawCollateral ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      placeholder="ETH amount"
                      value={withdrawAmount}
                      onChange={(e) => {
                        const value = e.target.value;
                        const maxWithdraw = parseFloat(formattedCollateral);
                        // Cap input to max withdrawable amount
                        if (value === '' || (parseFloat(value) <= maxWithdraw)) {
                          setWithdrawAmount(value);
                        }
                      }}
                      disabled={isWithdrawingCollateral}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 pr-12 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none disabled:opacity-50"
                      step="0.01"
                      min="0"
                      max={formattedCollateral}
                    />
                    <button
                      onClick={() => setWithdrawAmount(formattedCollateral)}
                      disabled={isWithdrawingCollateral || parseFloat(formattedCollateral) === 0}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-purple-600/30 disabled:bg-gray-600/30 disabled:cursor-not-allowed text-purple-400 disabled:text-gray-500 text-xs font-bold px-2 py-1 rounded select-none"
                      style={{ transform: 'translateY(-50%)', position: 'absolute', right: '8px', top: '50%' }}
                    >
                      MAX
                    </button>
                  </div>
                  <button
                    onClick={() => onWithdrawCollateral(withdrawAmount)}
                    disabled={isWithdrawingCollateral || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > parseFloat(formattedCollateral)}
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-all duration-200"
                  >
                    {isWithdrawingCollateral ? 'Withdrawing...' : 'Withdraw'}
                  </button>
                </div>
                <div className="text-xs text-gray-400">
                  💎 Available to withdraw: {formattedCollateral} ETH
                </div>
              </>
            ) : (
              <div className="text-center p-4 bg-gray-800/50 rounded-lg border border-gray-600">
                <div className="text-gray-400 text-sm">
                  {hasDebt ? 
                    "🔒 Repay all loans before withdrawing collateral" : 
                    "🏦 No collateral deposited"}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Enhanced Warning Notice */}
      <div className="mt-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
        <div className="text-sm text-red-300">
          <span className="font-medium">⚠️ Leverage Warning:</span> Borrowing against collateral involves liquidation risk. 
          Monitor your collateralization ratio and maintain sufficient margin to avoid liquidation.
        </div>
        <div className="text-xs text-gray-400 mt-2">
          💡 Collateral is secured by Compound Finance. Borrowing power is limited by {collateralFactorPercent}% collateral factor.
        </div>
      </div>
    </div>
  );
};

export default CreditLoan; 