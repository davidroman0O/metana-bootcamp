import React, { useState } from 'react';
import { formatEther } from 'viem';
import { CreditCard, AlertTriangle, DollarSign, Percent } from 'lucide-react';

interface CreditLoanProps {
  isConnected: boolean;
  borrowedAmount: bigint | undefined;
  accountLiquidity: bigint | undefined;
  onDepositCollateral: (ethAmount: string) => void;
  onBorrowChips: (ethAmount: string) => void;
  onRepayLoan: (chipAmount: string) => void;
  isDepositingCollateral: boolean;
  isBorrowingChips: boolean;
  isRepayingLoan: boolean;
}

const CreditLoan: React.FC<CreditLoanProps> = ({
  isConnected,
  borrowedAmount,
  accountLiquidity,
  onDepositCollateral,
  onBorrowChips,
  onRepayLoan,
  isDepositingCollateral,
  isBorrowingChips,
  isRepayingLoan,
}) => {
  const [collateralAmount, setCollateralAmount] = useState<string>('0.5');
  const [borrowAmount, setBorrowAmount] = useState<string>('0.1');
  const [repayAmount, setRepayAmount] = useState<string>('');

  if (!isConnected) return null;

  const formattedBorrowedAmount = borrowedAmount ? parseFloat(formatEther(borrowedAmount)).toFixed(4) : '0.0000';
  const formattedLiquidity = accountLiquidity ? parseFloat(formatEther(accountLiquidity)).toFixed(4) : '0.0000';
  
  // Calculate liquidation risk
  const hasDebt = borrowedAmount && borrowedAmount > 0n;
  const hasLiquidity = accountLiquidity && accountLiquidity > 0n;
  const liquidationRisk = hasDebt && hasLiquidity ? 
    (parseFloat(formattedBorrowedAmount) / parseFloat(formattedLiquidity)) * 100 : 0;

  const getRiskLevel = () => {
    if (liquidationRisk > 80) return { level: 'CRITICAL', color: 'text-red-400', bg: 'bg-red-900/30' };
    if (liquidationRisk > 60) return { level: 'HIGH', color: 'text-orange-400', bg: 'bg-orange-900/30' };
    if (liquidationRisk > 40) return { level: 'MEDIUM', color: 'text-yellow-400', bg: 'bg-yellow-900/30' };
    return { level: 'LOW', color: 'text-green-400', bg: 'bg-green-900/30' };
  };

  const risk = getRiskLevel();

  return (
    <div className="credit-loan bg-gradient-to-br from-red-900/50 to-pink-900/50 rounded-2xl p-6 border border-red-500/30">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="text-red-400" size={24} />
        <h2 className="text-xl font-bold text-white">Credit & Loans</h2>
        <span className="text-sm text-gray-400">(Powered by Compound)</span>
      </div>

      {/* Debt Tracker */}
      <div className="debt-tracker mb-6">
        <h3 className="text-lg font-bold text-red-400 mb-4">📊 Debt Tracker</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Outstanding Debt */}
          <div className="stat-card bg-black/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="text-red-400" size={16} />
              <span className="text-sm text-gray-400">Outstanding Debt</span>
            </div>
            <div className="text-xl font-bold text-red-400">{formattedBorrowedAmount} ETH</div>
          </div>

          {/* Account Liquidity */}
          <div className="stat-card bg-black/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="text-blue-400" size={16} />
              <span className="text-sm text-gray-400">Account Liquidity</span>
            </div>
            <div className="text-xl font-bold text-blue-400">{formattedLiquidity} ETH</div>
          </div>
        </div>

        {/* Liquidation Risk Warning */}
        {Boolean(hasDebt) && (
          <div className={`liquidation-warning p-4 rounded-lg border ${risk.bg} border-${risk.color.split('-')[1]}-500/50`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={risk.color} size={20} />
              <span className="font-bold text-white">Liquidation Risk: {risk.level}</span>
            </div>
            <div className="text-sm text-gray-300">
              Risk Level: <span className={`font-medium ${risk.color}`}>{liquidationRisk.toFixed(1)}%</span>
            </div>
            {liquidationRisk > 60 && (
              <div className="text-sm text-red-400 mt-2">
                ⚠️ Consider depositing more collateral or repaying some debt to reduce liquidation risk
              </div>
            )}
          </div>
        )}
      </div>

      {/* Credit Actions */}
      <div className="credit-actions space-y-6">
        
        {/* Deposit Collateral */}
        <div className="action-section bg-black/30 rounded-lg p-4">
          <h4 className="text-md font-bold text-blue-400 mb-3">🏦 Deposit Collateral</h4>
          <div className="flex items-center gap-4">
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
          <div className="text-xs text-gray-400 mt-2">
            💡 Deposit ETH as collateral to increase your borrowing capacity
          </div>
        </div>

        {/* Borrow CHIPS */}
        <div className="action-section bg-black/30 rounded-lg p-4">
          <h4 className="text-md font-bold text-yellow-400 mb-3">💳 Borrow CHIPS</h4>
          <div className="flex items-center gap-4">
            <input
              type="number"
              placeholder="ETH equivalent amount"
              value={borrowAmount}
              onChange={(e) => setBorrowAmount(e.target.value)}
              disabled={isBorrowingChips}
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none"
              step="0.01"
              min="0"
            />
            <button
              onClick={() => onBorrowChips(borrowAmount)}
              disabled={isBorrowingChips || !borrowAmount || parseFloat(borrowAmount) <= 0}
              className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-all duration-200"
            >
              {isBorrowingChips ? 'Borrowing...' : 'Borrow'}
            </button>
          </div>
          <div className="text-xs text-gray-400 mt-2">
            🎰 Borrow CHIPS against your collateral to keep playing
          </div>
        </div>

        {/* Repay Loan */}
        {Boolean(hasDebt) && (
          <div className="action-section bg-black/30 rounded-lg p-4">
            <h4 className="text-md font-bold text-green-400 mb-3">💰 Repay Loan</h4>
            <div className="flex items-center gap-4">
              <input
                type="number"
                placeholder="CHIP amount"
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                disabled={isRepayingLoan}
                className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                step="1"
                min="0"
              />
              <button
                onClick={() => onRepayLoan(repayAmount)}
                disabled={isRepayingLoan || !repayAmount || parseFloat(repayAmount) <= 0}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-all duration-200"
              >
                {isRepayingLoan ? 'Repaying...' : 'Repay'}
              </button>
            </div>
            <div className="text-xs text-gray-400 mt-2">
              ✅ Repay your loan to reduce liquidation risk
            </div>
          </div>
        )}
      </div>

      {/* Warning Notice */}
      <div className="mt-6 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
        <div className="text-sm text-red-300">
          <span className="font-medium">⚠️ Risk Warning:</span> Borrowing creates liquidation risk. 
          Monitor your debt ratio and maintain sufficient collateral to avoid liquidation.
        </div>
      </div>
    </div>
  );
};

export default CreditLoan; 