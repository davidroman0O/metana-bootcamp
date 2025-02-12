import { shorten } from '@did-network/dapp-sdk'
import { useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/Header'
import { NetworkSwitcher } from '@/components/SwitchNetworks'
import { WalletModal } from '@/components/WalletModal'
import { useCopyToClipboard } from '@/hooks/use-copy'
import { useForge } from '@/hooks/use-forge'
import { useToken } from "@/hooks/use-token"
import { useToast } from '@/components/ui/use-toast'


// TODO: fix the bug with the selector of network when we hav ea countdown

function Home() {
  const { address } = useAccount()
  const [show, setShow] = useState(false)
  const toggleModal = (e: boolean) => {
    setShow(e)
  }
  
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)

  const { 
    tokenAddress,
    owner,
  } = useForge()

  const {
    freeMint,
    owner: ownerToken,
    canMint,
    cooldownRemaining,
    balances,
    initialized,
    lastMintTime,
    tokens,
    remainingMintTime,
    countdown,
    exists,
  } = useToken()

  
  // Only use useWaitForTransactionReceipt if the contract exists
  const { 
    isSuccess, 
    isLoading, 
    isError,
  } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
    pollingInterval: 1000,
  })

  // Handle transaction completion
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

  // Handle transaction error
  useEffect(() => {
    if (!exists || !isError || !txHash) return
    if (isError && txHash) {
      console.error('Transaction failed:', txHash)
      setTxHash(null)
    }
  }, [exists, isError, txHash])

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

  const Action = () => (
    <>
      <NetworkSwitcher />
      <WalletModal open={show} onOpenChange={toggleModal} close={() => setShow(false)}>
        {({ isLoading: modalLoading }) => (
          <Button className="mr-4 flex items-center">
            {modalLoading && (
              <span className="i-line-md:loading-twotone-loop mr-1 h-4 w-4 inline-flex text-white" />
            )}
            {address ? shorten(address) : 'Connect Wallet'}
          </Button>
        )}
      </WalletModal>
    </>
  )

  const getTransactionStatus = () => {
    if (!initialized) return 'Reading blocks...'
    if (countdown > 0) {
      return `⏳ Cooldown active: ${countdown}s remaining before next mint`
    }
    if (!txHash) return 'Ready to mint'
    if (isError) return `❌ Transaction ${txHash} failed`
    if (isLoading) return `⏳ Transaction ${txHash} is pending...`
    if (isSuccess) return `✅ Transaction ${txHash} is confirmed!`
    return `Transaction ${txHash} is in progress...`
  }

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

  return (
    <>
      <Header action={<Action />} />

      {
        // exists ? "exists" : "does not exist"
      }
      
      {
        exists &&
        <>
        <div className="p-4 rounded-lg bg-gray-100 my-4">
          <div className="text-lg font-semibold mb-2 text-center">Minting Status</div>
          <div className="text-md text-center font-medium">
            {getTransactionStatus()}
          </div>
          {countdown > 0 && (
            <div className="text-sm text-gray-600 mt-2 text-center">
              Please wait {countdown} seconds before minting again
            </div>
          )}
        </div>

        {initialized && address && (
          <div className='flex flex-col items-center justify-center gap-4'>
            <div className='flex flex-row items-center justify-center gap-4 m-5'>
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
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              {tokens.map(({ tokenId, balance }) => (
                <div key={tokenId.toString()} className="flex gap-2">
                  <span className="font-medium">Token {tokenId}:</span>
                  <span>{balance.toString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}


        {initialized && 
          <div className="text-xs mt-8 p-4 bg-gray-50 rounded">
            <div className="font-semibold mb-2">Debug Information</div>
            <div>txHash: {txHash || 'null'}</div>
            <div>canMint: {String(canMint)}</div>
            <div>cooldownRemaining: {cooldownRemaining?.toString() || 'null'}</div>
            <div>lastMintTime: {lastMintTime}</div>
            <div>remainingMintTime: {remainingMintTime}</div>
            <div>countdown {countdown}</div>
            <div>isLoading: {String(isLoading)}</div>
            <div>isSuccess: {String(isSuccess)}</div>
            <div>isError: {String(isError)}</div>
          </div>}
        </>
      }

    </>
  )
}

export default Home