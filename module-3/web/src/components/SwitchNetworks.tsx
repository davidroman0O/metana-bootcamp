import { useAccount, useSwitchChain, useChainId } from 'wagmi'
import { useBlockProvider } from '@/hooks/use-block-provider'
import { useMemo, useState, useCallback, useEffect } from 'react'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { polygon, sepolia, anvil } from 'wagmi/chains'

// const SUPPORTED_CHAINS = [polygon, sepolia, anvil];
const SUPPORTED_CHAINS = [polygon,  anvil];
const FALLBACK_CHAIN = polygon;

// Simple notification component
const Notification = ({ message }: { message: string }) => (
  <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in-out">
    {message}
  </div>
);

export function NetworkSwitcher() {
  const { switchChain, isPending, chains: configuredChains } = useSwitchChain()
  const { chain } = useAccount()
  const block = useBlockProvider()
  const chainId = useChainId()
  const [showNotification, setShowNotification] = useState(false);
  
  const defaultValue = useMemo(() => chain?.id.toString(), [chain?.id])
  const [pendingChainId, setPendingChainId] = useState<number>()

  const isChainAccessible = useCallback(async (chainId: number) => {
    try {
      const provider = window.ethereum;
      if (!provider) return false;
      
      await provider.request({
        method: 'eth_getBlockByNumber',
        params: ['latest', false],
      });
      return true;
    } catch (error) {
      console.warn(`Chain ${chainId} not accessible:`, error);
      return false;
    }
  }, []);

  useEffect(() => {
    const checkChainAccess = async () => {
      if (!chain || !chainId) return;
      
      const accessible = await isChainAccessible(chainId);
      if (!accessible && chainId !== FALLBACK_CHAIN.id) {
        console.log('Current chain not accessible, switching to Polygon...');
        switchChain({ chainId: FALLBACK_CHAIN.id });
        
        // Show notification
        setShowNotification(true);
        // Hide after 3 seconds
        setTimeout(() => setShowNotification(false), 3000);
      }
    };

    checkChainAccess();
  }, [chainId, chain, isChainAccessible, switchChain]);

  const handleValueChange = useCallback((val: string) => {
    setPendingChainId(+val)
    switchChain({
      chainId: Number(val),
    })
  }, [switchChain])

  const chainOptions = useMemo(() => 
    SUPPORTED_CHAINS.filter(chain => 
      configuredChains.some(configChain => configChain.id === chain.id)
    ),
    [configuredChains]
  )

  const isInitializing = !block 

  if (!chain) return null

  return (
    <>
      {showNotification && (
        <Notification message={`Network unavailable - Switching to ${FALLBACK_CHAIN.name}`} />
      )}
      <Select
        onValueChange={handleValueChange}
        defaultValue={defaultValue}
        value={defaultValue}
      >
        <SelectTrigger className="max-w-auto lt-sm:hidden">
          <SelectValue>
            <span className="flex items-center">
              {(isPending || isInitializing) && (
                <span className="i-line-md:loading-twotone-loop mr-1 h-4 w-4 inline-flex text-primary" />
              )}
              {' '}
              {chain.name}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {chainOptions.map(x => (
              <SelectItem value={`${x.id}`} key={x.id}>
                <span className="flex items-center">
                  {(isPending && x.id === pendingChainId) && (
                    <span className="i-line-md:loading-twotone-loop mr-1 h-4 w-4 inline-flex text-primary" />
                  )}
                  {' '}
                  {x.name}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </>
  )
}
