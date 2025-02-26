import { useEffect, useState } from 'react';
import { createPublicClient, http, formatGwei, Address } from 'viem';
import { mainnet } from 'viem/chains';
import { parseAbiItem } from 'viem';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import TokenSelector from './TokenSelector';
import BlockDetailsCard from './BlockDetailsCard';
import CorrelationChart from './CorrelationChart';
import Notification from './Notification';
import DashboardLegend from './DashboardLegend';
import { formatLargeNumber } from '@/lib/utils/token';
import { BlockData, NotificationItem } from '@/types';

// ERC20 Transfer event ABI
const transferEventAbi = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');

// USDT token address - one of the most actively transferred tokens
const USDT_ADDRESS: Address = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

// Initialize Viem client
const client = createPublicClient({
  chain: mainnet,
  transport: http('https://eth-mainnet.g.alchemy.com/v2/UlgUe5NUoeezq_0_AxTSKl0qpQQeHSKV'),
});

export default function BlockchainDashboard() {
  const [blockData, setBlockData] = useState<BlockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedToken, setSelectedToken] = useState<Address>(USDT_ADDRESS);
  const [tokenName, setTokenName] = useState('USDT');
  const [tokenDecimals, setTokenDecimals] = useState(USDT_DECIMALS);
  const [newBlockAlert, setNewBlockAlert] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Helper function to determine if a transfer is significant based on token
  const isSignificantTransfer = (volume: number, tokenName: string): boolean => {
    // Different thresholds for different tokens
    const thresholds: Record<string, number> = {
      'USDT': 10000,     // $10,000 worth of USDT
      'USDC': 10000,     // $10,000 worth of USDC
      'WETH': 5,         // 5 ETH (approx $10,000 at ~$2,000/ETH)
      'BNB': 20,         // 20 BNB (approx $10,000 at ~$500/BNB)
      'SHIB': 100000000, // 100M SHIB (approx $2,000 at ~$0.00002/SHIB)
      // Default threshold
      'DEFAULT': 1000
    };
    
    const threshold = thresholds[tokenName] || thresholds['DEFAULT'];
    return volume > threshold;
  };

  // Function to fetch block data
  const fetchBlockData = async (blockNumber: bigint) => {
    try {
      // Get block info
      const block = await client.getBlock({ blockNumber });
      
      // Get token transfer events for this block
      const logs = await client.getLogs({
        address: selectedToken,
        event: transferEventAbi,
        fromBlock: blockNumber,
        toBlock: blockNumber,
      });
      
      // Debug log for token transfers (only in development)
      if (logs.length > 0) {
        console.log(`Block ${blockNumber.toString()}: Found ${logs.length} ${tokenName} transfers`);
        if (logs.length > 0 && logs[0].args.value) {
          console.log(`Sample value: ${logs[0].args.value.toString()}`);
        }
      }
      
      // Calculate total transfer volume for this block with proper decimal handling
      // Use proper formatting based on token decimals
      const transferVolume = logs.reduce((sum, log) => {
        if (log.args.value) {
          try {
            // Manual calculation using the token's decimal places
            return sum + (Number(log.args.value) / (10 ** tokenDecimals));
          } catch (error) {
            console.error('Error calculating token amount:', error);
            return sum;
          }
        }
        return sum;
      }, 0);

      return {
        blockNumber: Number(block.number),
        timestamp: Number(block.timestamp),
        baseFee: block.baseFeePerGas ? Number(formatGwei(block.baseFeePerGas)) : 0,
        gasUsed: Number(block.gasUsed),
        gasLimit: Number(block.gasLimit),
        gasUsedRatio: Number(block.gasUsed) / Number(block.gasLimit) * 100,
        transferVolume,
      };
    } catch (error) {
      console.error('Error fetching block data:', error);
      return null;
    }
  };

  // Initial fetching of the last 10 blocks
  useEffect(() => {
    const fetchInitialBlocks = async () => {
      setLoading(true);
      try {
        // Get latest block number
        const latestBlock = await client.getBlockNumber();
        
        // Fetch data for the last 10 blocks
        const blocksToFetch = Array.from({ length: 10 }, (_, i) => latestBlock - BigInt(9 - i));
        
        const blockDataPromises = blocksToFetch.map(blockNumber => fetchBlockData(blockNumber));
        const blockDataResults = await Promise.all(blockDataPromises);
        
        // Filter out any null results
        const validBlockData = blockDataResults.filter(Boolean) as BlockData[];
        setBlockData(validBlockData);
      } catch (error) {
        console.error('Error in initial block fetch:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialBlocks();
  }, [selectedToken, tokenDecimals]);

  // Subscribe to new blocks
  useEffect(() => {
    const unwatch = client.watchBlocks({
      onBlock: async (block) => {
        const newBlockData = await fetchBlockData(block.number);
        if (newBlockData) {
          setBlockData(currentData => {
            // Keep only the latest 10 blocks
            let updatedData = [...currentData, newBlockData];
            if (updatedData.length > 10) {
              updatedData = updatedData.slice(updatedData.length - 10);
            }
            
            // Check for gas price spikes
            if (updatedData.length >= 2) {
              const lastBlock = updatedData[updatedData.length - 1];
              const prevBlock = updatedData[updatedData.length - 2];
              
              // If the gas price increased by more than 20%
              if (lastBlock.baseFee > prevBlock.baseFee * 1.2) {
                const notificationId = Date.now();
                setNotifications(prev => [...prev, {
                  id: notificationId,
                  message: `Gas price spike detected! ${prevBlock.baseFee.toFixed(2)} → ${lastBlock.baseFee.toFixed(2)} Gwei`,
                  type: 'warning'
                }]);
                
                // Auto-remove notification after 5 seconds
                setTimeout(() => {
                  setNotifications(prev => prev.filter(n => n.id !== notificationId));
                }, 5000);
              }
              
              // Significant token transfer detected
              if (lastBlock.transferVolume > 0 && isSignificantTransfer(lastBlock.transferVolume, tokenName)) {
                const notificationId = Date.now() + 1;
                const formattedVolume = formatLargeNumber(lastBlock.transferVolume);
                
                setNotifications(prev => [...prev, {
                  id: notificationId,
                  message: `Large ${tokenName} transfer detected: ${formattedVolume} ${tokenName}`,
                  type: 'info'
                }]);
                
                setTimeout(() => {
                  setNotifications(prev => prev.filter(n => n.id !== notificationId));
                }, 5000);
              }
            }
            
            return updatedData;
          });
          
          // Show the new block alert
          setNewBlockAlert(true);
          setTimeout(() => setNewBlockAlert(false), 3000);
        }
      },
    });

    return () => {
      unwatch();
    };
  }, [selectedToken, tokenName, tokenDecimals]);

  const handleTokenChange = (address: Address, name: string, decimals: number) => {
    setSelectedToken(address);
    setTokenName(name);
    setTokenDecimals(decimals);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading blockchain data...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Ethereum Blockchain Dashboard</h1>
      <p className="text-gray-500">Displaying real-time data from the latest 10 blocks</p>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Select ERC20 Token to Track</h2>
        <TokenSelector onTokenChange={handleTokenChange} />
      </div>
      
      {newBlockAlert && (
        <Notification
          message="New block detected! Data updated."
          type="success"
          duration={3000}
        />
      )}
      
      {/* Render all other notifications */}
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
        />
      ))}
      
      {blockData.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Latest Block Details</h2>
          <BlockDetailsCard 
            blockData={blockData[blockData.length - 1]} 
            tokenName={tokenName} 
          />
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ERC20 Token Transfers Volume Chart */}
        <Card className="col-span-1 md:col-span-3">
          <CardHeader>
            <CardTitle>{tokenName} Transfer Volume</CardTitle>
          </CardHeader>
          <CardContent>
            {blockData.every(block => block.transferVolume === 0) ? (
              <div className="h-80 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <p className="text-lg mb-2">No {tokenName} transfers found in the last 10 blocks</p>
                  <p>Try selecting a different token or wait for new blocks</p>
                </div>
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={blockData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="blockNumber" />
                    <YAxis />
                    <Tooltip formatter={(value) => {
                      const numValue = typeof value === 'number' ? value : 0;
                      return [`${formatLargeNumber(numValue)} ${tokenName}`, 'Transfer Volume'];
                    }} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="transferVolume" 
                      stroke="#8884d8" 
                      activeDot={{ r: 8 }} 
                      name={`${tokenName} Transfer Volume`}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Base Fee Chart */}
        <Card className="col-span-1 md:col-span-3">
          <CardHeader>
            <CardTitle>Base Fee per Block (Gwei)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={blockData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="blockNumber" />
                  <YAxis />
                  <Tooltip formatter={(value) => {
                    const numValue = typeof value === 'number' ? value : 0;
                    return [`${numValue.toFixed(2)} Gwei`, 'Base Fee'];
                  }} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="baseFee" 
                    stroke="#82ca9d" 
                    activeDot={{ r: 8 }} 
                    name="Base Fee (Gwei)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gas Used Ratio Chart */}
        <Card className="col-span-1 md:col-span-3">
          <CardHeader>
            <CardTitle>Gas Used Ratio (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={blockData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="blockNumber" />
                  <YAxis />
                  <Tooltip formatter={(value) => {
                    const numValue = typeof value === 'number' ? value : 0;
                    return [`${numValue.toFixed(2)}%`, 'Gas Used Ratio'];
                  }} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="gasUsedRatio" 
                    stroke="#ff7300" 
                    activeDot={{ r: 8 }} 
                    name="Gas Used Ratio (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Correlation Chart */}
        <Card className="col-span-1 md:col-span-3">
          <CardContent>
            <CorrelationChart blockData={blockData} />
          </CardContent>
        </Card>
        
        {/* Legend & Instructions */}
        <div className="col-span-1 md:col-span-3 mt-6">
          <DashboardLegend />
        </div>
      </div>
    </div>
  );
}