import { shorten } from '@did-network/dapp-sdk'
import { useAccount, useConnections, useWaitForTransactionReceipt } from 'wagmi'
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
import { useForgeContract } from '@/hooks/use-forge-contract';
import { waitForTransactionReceipt } from 'wagmi/actions';
import {wagmiConfig} from "@/wagmi.config"

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
  openModal,
  from,
  to,
  handleForge,
  handleTrade,
  handleTradeApproval,
  handleCancelTrade,
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
  openModal: boolean;
  from: bigint;
  to: bigint;
  handleForge: (tokenId: bigint) => Promise<void>;
  handleTradeApproval: (tokenId: bigint) => Promise<void>;
  handleTrade: (tokenId: bigint) => Promise<void>;
  handleCancelTrade: () => void;
}) => {
  

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
              openModal={openModal}
              from={from}
              to={to}
              handleTradeApproval={handleTradeApproval}
              handleTrade={handleTrade}
              handleForge={handleForge}
              handleCancelTrade={handleCancelTrade}
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
  const [ openModal, setModal ] = useState<boolean>(false);
  const [ fromToken, setFromToken ] = useState<bigint>(BigInt(0));
  const [ toToken, setToToken ] = useState<bigint>(BigInt(0));
  const connections = useConnections()

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

  const forgeContract = useForgeContract();
  const { setApprovalForAll, isApprovedForAll } = useToken();
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

  // Watch for transaction states
  useEffect(() => {
    if (txHash) {
      if (isError) {
        console.error('Transaction error:', txHash);
        // Clear existing notifications for this hash
        notifications
          .filter(n => n.txHash === txHash)
          .forEach(n => removeNotification(n.id));
        addNotification('Transaction failed', 'error', txHash);
        setTxHash(null); // Stop watching failed transaction
      } else if (isLoading) {
        // Clear existing notifications for this hash
        notifications
          .filter(n => n.txHash === txHash)
          .forEach(n => removeNotification(n.id));
        addNotification('Transaction is pending...', 'info', txHash);
      } else if (isSuccess) {
        // Clear existing notifications for this hash
        notifications
          .filter(n => n.txHash === txHash)
          .forEach(n => removeNotification(n.id));
        addNotification('Transaction confirmed!', 'success', txHash);
        refreshData();
        setTxHash(null);
        setErrorMessage("");
      }
    }
  }, [txHash, isLoading, isSuccess, isError, addNotification, refreshData, removeNotification, notifications]);

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

  const handleForge = useCallback(async (tokenId: bigint) => {
    try {
      const hash = await forge.forge(tokenId);
      console.log('Forge transaction submitted:', hash);
    } catch (error) {
      console.error('Forge failed:', error);
    }
  }, [forge]);

  const handleCancelTrade = useCallback(() => {
    setModal(false);
  }, [])

  const handleTradeApproval = useCallback(async (tokenId: bigint) => {
    try {
      const isApproved = await isApprovedForAll(forgeContract.address);
      console.log('Trade preparation:', {
        tokenId: tokenId.toString(),
        forgeContract: forgeContract.address,
        isApproved,
      });

      if (!isApproved) {
        console.log('Setting approval for forge contract...');
        const approvalHash = await setApprovalForAll(forgeContract.address);

        addNotification('Approval transaction submitted', 'info', approvalHash);
        console.log('Approval transaction hash:', approvalHash);
        
        // Wait for the approval transaction to be mined
        try {
          var data = await waitForTransactionReceipt(wagmiConfig, {
            hash: approvalHash,
          });
          if (data.status === "reverted") {
            console.log('Approval transaction reverted', data);
            throw new Error('Approval transaction failed');
          }
          addNotification('Approval transaction confirmed', 'success', approvalHash);
          console.log('Approval transaction confirmed', data);
        } catch (error) {
          setErrorMessage("Failed to confirm approval transaction");
          addNotification('Approval transaction failed', 'error', approvalHash);
          console.error('Approval confirmation failed:', error);
          return;
        }
      }
      
      setFromToken(tokenId);
      setModal(true);
    } catch (error) {
      console.error("Error in handleTrade:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
      setModal(false);
    }
  }, [])

  const handleTradeConfirm = useCallback(async (from: bigint, to: bigint) => {
    if (from === null) {
      console.error("Invalid trading token ID:", from);
      addNotification('Invalid trading token ID', 'error');
      setModal(false);
      return;
    }
    setToToken(from);
    try {
      const hash = await forge.trade(from, to);
      addNotification('Trade transaction submitted', 'info', hash);
      console.log('Trade transaction submitted:', hash);
      setModal(false);
      try {
        var data = await waitForTransactionReceipt(wagmiConfig, {
          hash: hash,
        });
        if (data.status === "reverted") {
          console.log('Trade transaction reverted', data);
          throw new Error('Trade transaction failed');
        }
        addNotification('Trade transaction confirmed', 'success', hash);
        console.log('Trade transaction confirmed', data);
      } catch (error) {
        addNotification('Trade transaction failed', 'error');
        console.error('Trade failed:', error);
      }
    } catch (error) {
      addNotification('Trade transaction failed', 'error');
      console.error('Trade failed:', error);
    } finally {
      setModal(false);
      setToToken(BigInt(0));
      setFromToken(BigInt(0));
    }
  }, []);

  const handleFreeMint = useCallback(
    async (tokenID: bigint) => {
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
            message = error.message.split('(')[0].trim();
          }
        }
        setErrorMessage(message);
        setTxHash(null);
      }
    },
    [freeMint, txHash, countdown]
  );

  return (
    <div className="min-h-screen">
      {/* <NetworkDebug /> */}
      <NetworkHandler />
      <StableHeader />
      {
        !exists && connections.length > 0 && (
          <div className="flex justify-center items-center h-96">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-4">Not Found or not accessible</h1>
              <p className="text-lg text-gray-500">It seems the contract address is the wrong one or simply doesn't exists or not accessible</p>
              <div data-exists={exists} data-connections={connections.length} />
            </div>
          </div>
        ) 
      }
      {
        connections.length === 0 && (
          <div className="flex justify-center items-center h-96">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-4">No connections found</h1>
              <p className="text-lg text-gray-500">Please connect your wallet!</p>
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
        openModal={openModal}
        from={fromToken}
        to={toToken}
        handleForge={(tokenId: bigint) => handleForge(tokenId)}
        handleTradeApproval={(tokenId: bigint) => handleTradeApproval(tokenId)}
        handleTrade={(tokenId: bigint) => handleTradeConfirm(fromToken, tokenId)}
        handleCancelTrade={handleCancelTrade}
      />
    </div>
  );
}

export default Home