import React from 'react';
import { Info as InfoIcon } from 'lucide-react';

const SymbolLegend: React.FC = () => {
  const symbols = [
    { id: 1, name: 'DUMP', color: 'text-gray-400', description: 'Basic symbol' },
    { id: 2, name: 'COPE', color: 'text-blue-400', description: 'Small win (2x)' },
    { id: 3, name: 'PUMP', color: 'text-green-400', description: 'Medium win (5x)' },
    { id: 4, name: 'DIAMOND', color: 'text-purple-400', description: 'Big win (10x)' },
    { id: 5, name: 'ROCKET', color: 'text-red-400', description: 'Mega win (50x)' },
    { id: 6, name: 'JACKPOT', color: 'text-yellow-400', description: 'Progressive Jackpot (25% of pool)', highlight: true },
  ];

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
        <InfoIcon size={20} />
        <span>Symbol Guide</span>
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {symbols.map((symbol) => (
          <div 
            key={symbol.id} 
            className={`p-3 rounded-lg ${
              symbol.highlight 
                ? 'bg-yellow-900/20 border border-yellow-600/30' 
                : 'bg-gray-700/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className={`text-2xl font-bold ${symbol.color}`}>
                  {symbol.id}
                </span>
                <div>
                  <p className={`font-semibold ${symbol.color}`}>
                    {symbol.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {symbol.description}
                  </p>
                </div>
              </div>
              {symbol.highlight && (
                <span className="text-xs bg-yellow-500 text-black px-2 py-1 rounded font-semibold">
                  ALL MATCH
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 p-3 bg-gray-700/30 rounded-lg">
        <p className="text-xs text-gray-400">
          <span className="font-semibold text-gray-300">Note:</span> Payouts shown are for matching all reels with the same symbol. 
          Mixed combinations have different payouts.
        </p>
      </div>
    </div>
  );
};

export default SymbolLegend;