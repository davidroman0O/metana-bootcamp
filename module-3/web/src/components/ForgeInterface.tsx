import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingMessage } from '@/components/RotatingHourGlass';

interface TokenData {
  tokenId: bigint;
  balance: bigint;
}

interface ForgeRecipe {
  inputs: number[];
  name: string;
}

interface ForgeRecipes {
  [key: number]: ForgeRecipe;
}

interface ForgeInterfaceProps {
  tokens: TokenData[];
  forge: (tokenId: bigint) => Promise<`0x${string}`>;
  trade: (tokenIdToTrade: bigint, tokenIdToReceive: bigint) => Promise<`0x${string}`>;
  isLoading: boolean;
  txHash: `0x${string}` | null;
}

const ForgeInterface: React.FC<ForgeInterfaceProps> = ({ 
  tokens, 
  forge, 
  trade,
  isLoading,
  txHash 
}) => {
  const [selectedToken, setSelectedToken] = useState<string>('0');
  const [tradeDestination, setTradeDestination] = useState<string>('0');

  const forgeRecipes: ForgeRecipes = {
    3: { inputs: [0, 1], name: "Token 3" },
    4: { inputs: [1, 2], name: "Token 4" },
    5: { inputs: [0, 2], name: "Token 5" },
    6: { inputs: [0, 1, 2], name: "Token 6" }
  };

  const canForge = (tokenId: number): boolean => {
    const recipe = forgeRecipes[tokenId];
    return recipe.inputs.every(input => {
      const token = tokens.find(t => t.tokenId === BigInt(input));
      return token?.balance !== undefined && token.balance > BigInt(0);
    });
  };

  const handleForge = async (tokenId: number): Promise<void> => {
    try {
      await forge(BigInt(tokenId));
    } catch (error) {
      console.error('Forge error:', error);
    }
  };

  const handleTrade = async (): Promise<void> => {
    try {
      await trade(BigInt(selectedToken), BigInt(tradeDestination));
    } catch (error) {
      console.error('Trade error:', error);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Forge Recipes */}
      <Card>
        <CardHeader>
          <CardTitle>Forge Recipes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(forgeRecipes).map(([tokenId, recipe]) => (
              <div key={tokenId} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium">{recipe.name}</span>
                  <Button 
                    onClick={() => handleForge(Number(tokenId))}
                    disabled={!canForge(Number(tokenId)) || isLoading}
                  >
                    Forge
                  </Button>
                </div>
                <div className="text-sm">
                  Requires: {recipe.inputs.map((input: number) => `Token ${input}`).join(' + ')}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trading Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Trade Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Select 
                value={selectedToken} 
                onValueChange={(value: string) => setSelectedToken(value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent>
                  {tokens.filter(t => t.balance > BigInt(0)).map(token => (
                    <SelectItem 
                      key={token.tokenId.toString()} 
                      value={token.tokenId.toString()}
                    >
                      Token {token.tokenId.toString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span>for</span>

              <Select 
                value={tradeDestination} 
                onValueChange={(value: string) => setTradeDestination(value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2].map(id => (
                    <SelectItem key={id} value={id.toString()}>
                      Token {id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                onClick={() => handleTrade()}
                disabled={isLoading || !tokens.find(t => t.tokenId === BigInt(selectedToken))?.balance}
              >
                Trade
              </Button>
            </div>

            {txHash && isLoading && (
              <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                <LoadingMessage txHash={txHash} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Balances */}
      <Card>
        <CardHeader>
          <CardTitle>Your Token Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {tokens.map(({ tokenId, balance }) => (
              <div key={tokenId.toString()} className="p-2 border rounded">
                <div className="font-medium">Token {tokenId.toString()}</div>
                <div className="text-sm text-gray-600">Balance: {balance.toString()}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgeInterface;