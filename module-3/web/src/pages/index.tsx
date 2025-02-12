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
  onDismissError, // Add this prop
}: {
  exists: boolean
  initialized: boolean
  address: string | undefined
  txHash: `0x${string}` | null
  countdown: number
  handleFreeMint: (tokenID: bigint) => Promise<void>
  tokens: Array<{ tokenId: bigint; balance: bigint }>
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  errorMessage?: string
  onDismissError: () => void // Add this type
}) => {
  const { forge, trade } = useForge()

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
        onDismissError={onDismissError} // Pass the dismiss handler
      />

      {initialized && address && (
        <div className="flex justify-center px-4">
          <div className="w-full max-w-6xl">
            <ForgeInterface
              tokens={tokens}
              forge={forge}
              trade={trade}
              isLoading={isLoading}
              txHash={txHash}
              freeMint={handleFreeMint}
              countdown={countdown}
            />
          </div>
        </div>
      )}
    </>
  ) : null
}

function Home() {
  const { address } = useAccount()
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>("")

  const { 
    exists, 
    freeMint, 
    initialized, 
    tokens, 
    countdown,
  } = useToken()
  
  const { 
    isSuccess, 
    isLoading, 
    isError,
  } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
    pollingInterval: 1000,
  })

  // Enhanced error dismissal handler
  const handleDismissError = useCallback(() => {
    setErrorMessage("")
    // Also clear txHash if there's an error state
    if (isError) {
      setTxHash(null)
    }
  }, [isError])

  // Clear error states when transaction succeeds
  useEffect(() => {
    if (isSuccess) {
      setErrorMessage("")
      setTxHash(null)
    }
  }, [isSuccess])

  // Set error message when transaction fails
  useEffect(() => {
    if (isError && txHash) {
      setErrorMessage("Transaction failed. Please try again.")
    }
  }, [isError, txHash])

  const handleFreeMint = useCallback(
    async (tokenID: bigint) => {
      // Always clear previous error states when starting new transaction
      setErrorMessage("")
      
      if (txHash) {
        setErrorMessage('Previous transaction still pending')
        return
      }

      if (countdown > 0) {
        setErrorMessage(`Please wait ${countdown} seconds before minting again`)
        return
      }

      try {
        const hash = await freeMint(tokenID)
        console.log('New freeMint hash:', hash)
        setTxHash(hash)
      } catch (error: any) {
        console.error('freeMint error:', error)
        let message = "Transaction failed"
        if (error?.message) {
          if (error.message.includes("user rejected")) {
            message = "Transaction was rejected"
          } else if (error.message.includes("insufficient funds")) {
            message = "Insufficient funds to complete transaction"
          } else if (error.message.includes("was already minted")) {
            message = "This token was already minted"
          } else if (error.message.includes("Cooldown active")) {
            message = "Please wait for cooldown to finish before minting again"
          } else {
            message = error.message.split('(')[0].trim()
          }
        }
        setErrorMessage(message)
        // Always clear txHash when there's an error
        setTxHash(null)
      }
    },
    [freeMint, txHash, countdown]
  )

  // Reset all error states when switching accounts or networks
  useEffect(() => {
    setErrorMessage("")
    setTxHash(null)
  }, [address])

  return (
    <div className="min-h-screen">
      <NetworkHandler />
      <StableHeader />
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
        isError={isError || !!errorMessage}
        errorMessage={errorMessage}
        onDismissError={handleDismissError}
      />
    </div>
  )
}

export default Home