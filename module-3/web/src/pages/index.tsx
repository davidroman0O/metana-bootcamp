import { shorten } from '@did-network/dapp-sdk'
import { useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { useState, useCallback, useEffect, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/Header'
import { NetworkSwitcher } from '@/components/SwitchNetworks'
import { WalletModal } from '@/components/WalletModal'
import { useForge } from '@/hooks/use-forge'
import { useToken } from "@/hooks/use-token"
import { LoadingMessage, CooldownMessage } from "@/components/RotatingHourGlass"
import NativeBalance from "@/components/NativeBalance"
import ForgeInterface from "@/components/ForgeInterface"

// Create a stable header actions component
const HeaderActions = memo(() => {
  const { address } = useAccount()
  const [show, setShow] = useState(false)
  
  return (
    <div className="flex items-center gap-4"> 
      <NetworkSwitcher />
      {address && <NativeBalance />}
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

// Create a stable header component
const StableHeader = memo(() => {
  return <Header action={<HeaderActions />} />
})

StableHeader.displayName = 'StableHeader'

const DEBUG  = false

// Main content component that handles the updates
const MainContent = ({
  exists,
  initialized,
  address,
  txHash,
  countdown,
  balances,
  handleFreeMint,
  tokens,
  isLoading,
  isSuccess,
  isError,
  canMint,
  cooldownRemaining,
  lastMintTime,
  remainingMintTime
}: {
  exists: boolean
  initialized: boolean
  address: string | undefined
  txHash: `0x${string}` | null
  countdown: number
  balances: Record<string, bigint>
  handleFreeMint: (tokenID: bigint) => Promise<void>
  tokens: Array<{ tokenId: bigint; balance: bigint }>
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  canMint?: boolean
  cooldownRemaining?: number
  lastMintTime?: number
  remainingMintTime?: number | null
}) => {
  const { forge, trade } = useForge(); 

  const isButtonDisabled = (tokenId: string) => {
    return balances[tokenId] == BigInt(1) || 
           !!txHash || 
           countdown > 0
  }

  const getButtonText = (tokenId: string) => {
    if (balances[tokenId] == BigInt(1)) return `Token ${tokenId} (Owned)`
    if (txHash) return `Token ${tokenId} (Pending...)`
    if (countdown > 0) {
      return `Wait ${countdown}s`
    }
    return `Mint Token ${tokenId}`
  }

  const getTransactionStatus = () => {
    if (!initialized) return 'Reading blocks...'
    if (countdown > 0) {
      return <CooldownMessage countdown={countdown} />
      // return `⏳ Cooldown active: ${countdown}s remaining before next mint`
    }
    if (!txHash) return 'Ready to mint'
    if (isError) return `❌ Transaction ${txHash} failed`
    if (isLoading) return <LoadingMessage txHash={txHash} />
    if (isSuccess) return `✅ Transaction ${txHash} is confirmed!`
    return `Transaction ${txHash} is in progress...`
  }

  return exists ? (
    <>
      <div className="p-4 rounded-lg bg-gray-100 my-4">
        <div className="text-lg font-semibold mb-2 text-center">Minting Status</div>
        <div className="text-md text-center font-medium flex items-center justify-center gap-2">
          {getTransactionStatus()}
        </div>
        {/* {countdown > 0 && (
          <div className="text-sm text-gray-600 mt-2 text-center">
            Please wait {countdown} seconds before minting again
          </div>
        )} */}
      </div>

      {initialized && address && (
        <div className='flex flex-col items-center justify-center gap-4'>
          {/* <div className='flex flex-row items-center justify-center gap-4 m-5'>
            {['0', '1', '2'].map((tokenId) => (
              <Button 
                key={tokenId}
                disabled={isButtonDisabled(tokenId)}
                onClick={() => handleFreeMint(BigInt(tokenId))}
                className="min-w-[120px]"
              >
                {getButtonText(tokenId)}
              </Button>
            ))}
          </div> */}

          <ForgeInterface
            tokens={tokens}
            forge={forge}
            trade={trade}
            isLoading={isLoading}
            txHash={txHash}
            freeMint={handleFreeMint}
          />

          {
            DEBUG && 
            <div className="grid grid-cols-2 gap-2 text-sm">
              {tokens.map(({ tokenId, balance }) => (
                <div key={tokenId.toString()} className="flex gap-2">
                  <span className="font-medium">Token {tokenId}:</span>
                  <span>{balance.toString()}</span>
                </div>
              ))}
            </div>
          }
        </div>
      )}


      {initialized && DEBUG && (
        <div className="text-xs mt-8 p-4 bg-gray-50 rounded">
          <div className="font-semibold mb-2">Debug Information</div>
          <div>txHash: {txHash || 'null'}</div>
          <div>canMint: {String(canMint)}</div>
          <div>cooldownRemaining: {cooldownRemaining?.toString() || 'null'}</div>
          <div>lastMintTime: {lastMintTime}</div>
          <div>remainingMintTime: {remainingMintTime}</div>
          <div>countdown: {countdown}</div>
          <div>isLoading: {String(isLoading)}</div>
          <div>isSuccess: {String(isSuccess)}</div>
          <div>isError: {String(isError)}</div>
        </div>
      )}
    </>
  ) : null
}

// Main page component
function Home() {
  const { address } = useAccount()
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)

  const { 
    exists, 
    freeMint, 
    initialized, 
    balances, 
    tokens, 
    countdown,
    canMint,
    cooldownRemaining,
    lastMintTime,
    remainingMintTime
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

    const handleSuccess = async () => {
      console.log('Transaction confirmed! Refreshing data...', txHash)
      try {
        console.log('Data refreshed successfully')
        setTxHash(null)
      } catch (error) {
        console.error('Failed to refresh balances:', error)
        setTxHash(null)
      }
    }

    handleSuccess()
  }, [isSuccess, txHash, exists])

  useEffect(() => {
    if (!exists || !isError || !txHash) return
    if (isError && txHash) {
      console.error('Transaction failed:', txHash)
      setTxHash(null)
    }
  }, [exists, isError, txHash])

  return (
    <>
      <StableHeader />
      <MainContent
        exists={exists}
        initialized={initialized}
        address={address}
        txHash={txHash}
        countdown={countdown}
        balances={balances}
        handleFreeMint={handleFreeMint}
        tokens={tokens}
        isLoading={isLoading}
        isSuccess={isSuccess}
        isError={isError}
        canMint={canMint}
        cooldownRemaining={cooldownRemaining}
        lastMintTime={lastMintTime}
        remainingMintTime={remainingMintTime}
      />
    </>
  )
}

export default Home