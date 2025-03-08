import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Address } from 'viem';
import { TokenInfo } from '@/types';

// Popular ERC20 tokens
const POPULAR_TOKENS: TokenInfo[] = [
  { name: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
  { name: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
  { name: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
  { name: 'BNB', address: '0xB8c77482e45F1F44dE1745F52C74426C631bDD52', decimals: 18 },
  { name: 'SHIB', address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', decimals: 18 },
];

interface TokenSelectorProps {
  onTokenChange: (address: Address, name: string, decimals: number) => void;
}

export default function TokenSelector({ onTokenChange }: TokenSelectorProps) {
  const [customAddress, setCustomAddress] = useState('');
  const [customName, setCustomName] = useState('');
  const [customDecimals, setCustomDecimals] = useState('18');
  const [showCustom, setShowCustom] = useState(false);

  const handleSelectToken = (value: string) => {
    if (value === 'custom') {
      setShowCustom(true);
    } else {
      const token = POPULAR_TOKENS.find(t => t.name === value);
      if (token) {
        onTokenChange(token.address, token.name, token.decimals);
      }
      setShowCustom(false);
    }
  };

  const handleAddCustomToken = () => {
    if (customAddress && customName) {
      const decimals = parseInt(customDecimals, 10) || 18;
      onTokenChange(customAddress as Address, customName, decimals);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Select onValueChange={handleSelectToken}>
          <SelectTrigger className="w-full md:w-60">
            <SelectValue placeholder="Select a token" />
          </SelectTrigger>
          <SelectContent>
            {POPULAR_TOKENS.map(token => (
              <SelectItem key={token.address} value={token.name}>
                {token.name}
              </SelectItem>
            ))}
            <SelectItem value="custom">Custom Token</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showCustom && (
        <div className="flex flex-col space-y-2">
          <Input
            placeholder="Token Name (e.g., DAI)"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
          />
          <Input
            placeholder="Token Address (0x...)"
            value={customAddress}
            onChange={(e) => setCustomAddress(e.target.value)}
          />
          <Input
            placeholder="Token Decimals (e.g., 18)"
            value={customDecimals}
            type="number"
            min="0"
            max="30"
            onChange={(e) => setCustomDecimals(e.target.value)}
          />
          <Button onClick={handleAddCustomToken}>Add Custom Token</Button>
        </div>
      )}
    </div>
  );
}