import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useBalance, useChainId } from 'wagmi';
import { formatEther } from 'viem';
import { LogOut as LogOutIcon, Shield as ShieldIcon, Activity as ActivityIcon } from 'lucide-react';
import { useSystemState } from '../../../hooks/admin/useGraphQLQueries';
import { checkGraphQLConnection } from '../../../graphql/apollo-client';

const AdminHeader: React.FC = () => {
  const navigate = useNavigate();
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({ address });
  const { data: systemData, loading: systemLoading } = useSystemState();
  const [graphQLConnected, setGraphQLConnected] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    checkGraphQLConnection(chainId).then(setGraphQLConnected);
    const interval = setInterval(() => {
      checkGraphQLConnection(chainId).then(setGraphQLConnected);
    }, 5000); // Check every 5 seconds but i should learn to use a more efficient cause i learned that thegraph got rate limits
    return () => clearInterval(interval);
  }, [chainId]);

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <header className="bg-gray-800 border-b border-gray-700 shadow-lg">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Title and Badge */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <ShieldIcon className="text-yellow-400" size={24} />
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            </div>
            <span className="px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded-full">
              RESTRICTED
            </span>
          </div>

          {/* Right: Status and Account Info */}
          <div className="flex items-center space-x-6">
            {/* GraphQL Connection Status */}
            <div className="flex items-center space-x-2">
              <ActivityIcon 
                className={graphQLConnected ? 'text-green-400' : 'text-red-400'} 
                size={16} 
              />
              <span className={`text-sm ${graphQLConnected ? 'text-green-400' : 'text-red-400'}`}>
                {graphQLConnected === null ? 'Checking...' : graphQLConnected ? 'Subgraph Connected' : 'Subgraph Offline'}
              </span>
            </div>

            {/* System Status */}
            {systemData?.systemState && (
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${systemData.systemState.isPaused ? 'bg-red-500' : 'bg-green-500'}`}></div>
                <span className="text-sm text-gray-300">
                  System: {systemData.systemState.isPaused ? 'Paused' : 'Active'}
                </span>
              </div>
            )}

            {/* Account Info */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-400">Admin Account</p>
                <p className="text-sm font-mono text-white">{address && formatAddress(address)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Balance</p>
                <p className="text-sm font-mono text-white">
                  {balance ? `${parseFloat(formatEther(balance.value)).toFixed(4)} ETH` : '0.0000 ETH'}
                </p>
              </div>
              <button
                onClick={() => navigate('/')}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                title="Exit Admin Dashboard"
              >
                <LogOutIcon size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;