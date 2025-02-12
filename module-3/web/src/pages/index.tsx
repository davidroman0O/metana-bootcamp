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

      {DEBUG && initialized && (
        <div className="text-xs mt-8 p-4 bg-gray-50 rounded">
          <div className="font-semibold mb-2">Debug Information</div>
          <div>txHash: {txHash || 'null'}</div>
          <div>countdown: {countdown}</div>
          <div>isLoading: {String(isLoading)}</div>
          <div>isSuccess: {String(isSuccess)}</div>
          <div>isError: {String(isError)}</div>
        </div>
      )}
    </>
  ) : null
}

function Home() {
  const { address } = useAccount()
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)

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

  const handleFreeMint = useCallback(
    async (tokenID: bigint) => {
      if (txHash) {
        console.log('Previous transaction still pending:', txHash)
        return
      }

      if (countdown > 0) {
        console.log('Cooldown still active:', countdown)
        return
      }

      try {
        const hash = await freeMint(tokenID)
        console.log('New freeMint hash:', hash)
        setTxHash(hash)
      } catch (error) {
        console.error('freeMint error:', error)
      }
    },
    [freeMint, txHash, countdown]
  )

  useEffect(() => {
    if (!exists || !txHash || !isSuccess) return
    console.log('Transaction confirmed! Refreshing data...', txHash)
    setTxHash(null)
  }, [isSuccess, txHash, exists])

  useEffect(() => {
    if (!exists || !isError || !txHash) return
    if (isError && txHash) {
      console.error('Transaction failed:', txHash)
      setTxHash(null)
    }
  }, [exists, isError, txHash])

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
        isError={isError}
      />
    </div>
  )
}

export default Home