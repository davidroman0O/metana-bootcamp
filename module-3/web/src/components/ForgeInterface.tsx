import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingMessage } from '@/components/RotatingHourGlass';
import { useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { useToken } from '@/hooks/use-token';
import { useForgeContract } from '@/hooks/use-forge-contract';

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
  isLoading: globalIsLoading,
  txHash: globalTxHash 
}) => {
  const [selectedToken, setSelectedToken] = useState<string>('0');
  const [tradeDestination, setTradeDestination] = useState<string>('0');
  const [localTxHash, setLocalTxHash] = useState<`0x${string}` | null>(null);
  
  const { address } = useAccount();
  const { setApprovalForAll, isApprovalLoading, isApprovedForAll } = useToken();
  const forgeContract = useForgeContract();

  const { 
    isLoading: isWaiting,
    isSuccess,
    isError,
  } = useWaitForTransactionReceipt({
    hash: localTxHash || undefined,
  });

  const isLoading = globalIsLoading || isWaiting || isApprovalLoading;
  const displayHash = localTxHash || globalTxHash;

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
    if (!address || !forgeContract.address) return;
    
    try {
      console.log('Starting forge process for token:', tokenId);

      // First check if already approved
      const isApproved = await isApprovedForAll(forgeContract.address);
      console.log('Is approved:', isApproved, 'for address:', forgeContract.address);
      
      if (!isApproved) {
        console.log('Approving forge contract:', forgeContract.address);
        const approvalHash = await setApprovalForAll(forgeContract.address);
        console.log('Approval transaction:', approvalHash);
        
        // Wait for approval confirmation
        const approvalReceipt = await window.ethereum.request({
          method: 'eth_getTransactionReceipt',
          params: [approvalHash],
        });
        console.log('Approval confirmed:', approvalReceipt);
      }

      console.log('Sending forge transaction...');
      const hash = await forge(BigInt(tokenId));
      console.log('Forge transaction submitted:', hash);
      setLocalTxHash(hash);

    } catch (error) {
      console.error('Forge process failed:', error);
      setLocalTxHash(null);
    }
  };

  const handleTrade = async (): Promise<void> => {
    if (!address || !forgeContract.address) return;

    try {
      // Check approval first
      const isApproved = await isApprovedForAll(forgeContract.address);
      console.log('Is approved for trade:', isApproved);
      
      if (!isApproved) {
        const approvalHash = await setApprovalForAll(forgeContract.address);
        console.log('Trade approval transaction:', approvalHash);
        
        // Wait for approval confirmation
        const approvalReceipt = await window.ethereum.request({
          method: 'eth_getTransactionReceipt',
          params: [approvalHash],
        });
        console.log('Trade approval confirmed:', approvalReceipt);
      }

      const hash = await trade(BigInt(selectedToken), BigInt(tradeDestination));
      console.log('Trade transaction:', hash);
      setLocalTxHash(hash);

    } catch (error) {
      console.error('Trade error:', error);
      setLocalTxHash(null);
    }
  };

  // Reset local tx hash when transaction completes
  React.useEffect(() => {
    if (isSuccess || isError) {
      setLocalTxHash(null);
    }
  }, [isSuccess, isError]);

  const getTransactionStatus = () => {
    if (isApprovalLoading) return "Approving tokens...";
    if (!displayHash) return null;
    if (isError) return `❌ Transaction ${displayHash} failed`;
    if (isLoading) return <LoadingMessage txHash={displayHash} />;
    if (isSuccess) return `✅ Transaction ${displayHash} is confirmed!`;
    return `Transaction ${displayHash} is in progress...`;
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Transaction Status */}
      {(displayHash || isApprovalLoading) && (
        <div className="p-4 bg-gray-100 rounded-lg">
          {getTransactionStatus()}
        </div>
      )}

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
                    {isApprovalLoading ? 'Approving...' : 'Forge'}
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
                {isApprovalLoading ? 'Approving...' : 'Trade'}
              </Button>
            </div>
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