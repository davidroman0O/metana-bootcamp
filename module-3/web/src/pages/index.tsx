import { shorten } from '@did-network/dapp-sdk'
import { useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { useState, useCallback, useEffect, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/Header'
import { NetworkSwitcher } from '@/components/SwitchNetworks'
import { WalletModal } from '@/components/WalletModal'
import { useForge } from '@/hooks/use-forge'
import { useToken } from "@/hooks/use-token"
import NativeBalance from "@/components/NativeBalance"
import ForgeInterface from "@/components/ForgeInterface"
import NotificationBanner from "@/components/NotificationBanner"
import OpenSeaLink from '@/components/OpenSeaLink';
import NetworkHandler from '@/components/NetworkHandler'
import NetworkDebug from '@/components/NetworkDebug'
import { useNotifications } from '@/hooks/use-notification'
import { AppNotification } from '@/components/NotificationBanner';

const HeaderActions = memo(() => {
  const { address } = useAccount()
  const [show, setShow] = useState(false)
  
  return (
    <div className="flex items-center gap-4"> 
      <NetworkSwitcher />
      {address && (
        <>
          <NativeBalance />
          <OpenSeaLink />
        </>
      )}
      <WalletModal 
        open={show} 
        onOpenChange={setShow} 
        close={() => setShow(false)}
      >
        {({ isLoading: modalLoading }) => (
          <Button className="flex items-center"> 
            {modalLoading && (
              <span className="i-line-md:loading-twotone-loop mr-1 h-4 w-4 inline-flex text-white" />
            )}
            {address ? shorten(address) : 'Connect Wallet'}
          </Button>
        )}
      </WalletModal>
    </div>
  )
})

HeaderActions.displayName = 'HeaderActions'

const StableHeader = memo(() => {
  return <Header action={<HeaderActions />} />
})

StableHeader.displayName = 'StableHeader'

const DEBUG = false


const MainContent = ({
  exists,
  initialized,
  address,
  txHash,
  countdown,
  handleFreeMint,
  tokens,
  isLoading,
  isSuccess,
  isError,
  errorMessage,
  onDismissError,
  notifications,
  onDismissNotification,
  refreshData,
  setTxHash,  
}: {
  exists: boolean;
  initialized: boolean;
  address: string | undefined;
  txHash: `0x${string}` | null;
  countdown: number;
  handleFreeMint: (tokenID: bigint) => Promise<void>;
  tokens: Array<{ tokenId: bigint; balance: bigint }>;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  errorMessage?: string;
  onDismissError: () => void;
  notifications: AppNotification[];
  onDismissNotification: (id: string) => void;
  refreshData: () => Promise<void>;
  setTxHash: (hash: `0x${string}` | null) => void;
}) => {
  const forge = useForge({
    onSuccess: async () => {
      console.log('Transaction successful, refreshing data...')
      await refreshData()
    },
    onTxHash: (hash) => {
      console.log('Got transaction hash:', hash)
      setTxHash(hash)
    }
  });

  const handleTrade = useCallback(async (tokenIDToTrade: bigint, tokenIDToReceive: bigint) => {
    try {
      const hash = await forge.trade(tokenIDToTrade, tokenIDToReceive)
      console.log('Trade transaction submitted:', hash)
    } catch (error) {
      console.error('Trade failed:', error)
    }
  }, [forge]);

  const handleForge = useCallback(async (tokenID: bigint) => {
    try {
      const hash = await forge.forge(tokenID)
      console.log('Forge transaction submitted:', hash)
    } catch (error) {
      console.error('Forge failed:', error)
    }
  }, [forge]);

  return exists ? (
    <>
      <NotificationBanner
        txHash={txHash}
        countdown={countdown}
        initialized={initialized}
        isError={isError}
        isLoading={isLoading}
        isSuccess={isSuccess}
        errorMessage={errorMessage}
        onDismissError={onDismissError}
        notifications={notifications}
        onDismissNotification={onDismissNotification}
      />

      {initialized && address && (
        <div className="flex justify-center px-4">
          <div className="w-full max-w-6xl">
            <ForgeInterface
              tokens={tokens}
              forge={handleForge}
              trade={handleTrade}
              isLoading={isLoading}
              txHash={txHash}
              freeMint={handleFreeMint}
              countdown={countdown}
            />
          </div>
        </div>
      )}
    </>
  ) : null;
};



function Home() {
  const { address } = useAccount();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const { notifications, addNotification, removeNotification, clearAllNotifications } = useNotifications();
  
  const { 
    exists, 
    freeMint, 
    initialized, 
    tokens, 
    countdown,
    refreshData
  } = useToken();
  
  const { 
    isSuccess, 
    isLoading, 
    isError,
  } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
    pollingInterval: 1000,
  });

  // Watch for transaction states
  useEffect(() => {
    if (txHash) {
      if (isLoading) {
        addNotification('Transaction is pending...', 'info', txHash);
      } else if (isSuccess) {
        addNotification('Transaction confirmed!', 'success', txHash);
        refreshData();
        setTxHash(null);
        setErrorMessage("");
      } else if (isError) {
        addNotification('Transaction failed. Please try again.', 'error', txHash);
      }
    }
  }, [txHash, isLoading, isSuccess, isError, addNotification, refreshData]);

  // Reset notifications when switching accounts or networks
  useEffect(() => {
    clearAllNotifications();
    setErrorMessage("");
    setTxHash(null);
  }, [address, clearAllNotifications]);

  const handleDismissError = useCallback(() => {
    setErrorMessage("");
    if (isError) {
      setTxHash(null);
    }
  }, [isError]);

  const handleFreeMint = useCallback(
    async (tokenID: bigint) => {
      // Clear any existing error state
      setErrorMessage("");
      
      if (txHash) {
        setErrorMessage('Previous transaction still pending');
        return;
      }
  
      if (countdown > 0) {
        setErrorMessage(`Please wait ${countdown} seconds before minting again`);
        return;
      }
  
      try {
        const hash = await freeMint(tokenID);
        setTxHash(hash);
      } catch (error: any) {
        console.error('freeMint error:', error);
        let message = "Transaction failed";
        if (error?.message) {
          if (error.message.includes("user rejected")) {
            message = "Transaction was rejected";
          } else if (error.message.includes("insufficient funds")) {
            message = "Insufficient funds to complete transaction";
          } else if (error.message.includes("was already minted")) {
            message = "This token was already minted";
          } else if (error.message.includes("Cooldown active")) {
            message = "Please wait for cooldown to finish before minting again";
          } else {
            // Clean up the error message by taking only the first part before any parentheses
            message = error.message.split('(')[0].trim();
          }
        }
        // Only set the error message, don't add it as a notification
        setErrorMessage(message);
        setTxHash(null);
      }
    },
    [freeMint, txHash, countdown]
  );

  return (
    <div className="min-h-screen">
      <NetworkHandler />
      <StableHeader />
      {
        !exists && (
          <div className="flex justify-center items-center h-96">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-4">Not Found or not accessible</h1>
              <p className="text-lg text-gray-500">It seems the contract address is the wrong one or simply doesn't exists or not accessible</p>
            </div>
          </div>
        ) 
      }
      <MainContent
        exists={exists}
        initialized={initialized}
        address={address}
        txHash={txHash}
        countdown={countdown}
        handleFreeMint={handleFreeMint}
        tokens={tokens}
        isLoading={isLoading}
        isSuccess={isSuccess}
        isError={isError}
        errorMessage={errorMessage}
        onDismissError={handleDismissError}
        notifications={notifications}
        onDismissNotification={removeNotification}
        refreshData={refreshData}
        setTxHash={setTxHash}
      />
    </div>
  );
}

export default Home