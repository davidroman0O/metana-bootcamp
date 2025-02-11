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

function Home() {
  const { address } = useAccount()
  const [show, setShow] = useState(false)
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const [localCooldown, setLocalCooldown] = useState<number>(0)
  const lastMintTimeRef = useRef<number | null>(null)

  const toggleModal = (e: boolean) => {
    setShow(e)
  }

  const [, copy] = useCopyToClipboard()
  const { toast } = useToast()

  const copyHandler = useCallback(() => {
    copy('pnpm dlx fisand')
    toast({
      title: 'Copied success!',
    })
  }, [copy, toast])

  const { 
    tokenAddress,
    owner,
  } = useForge()

  const {
    owner: ownerToken,
    freeMint,
    canMint,
    cooldownRemaining,
    balances,
    refreshBalances,
  } = useToken()

  // Local timer to update cooldown every second
  useEffect(() => {
    const timer = setInterval(() => {
      if (lastMintTimeRef.current) {
        const elapsed = Math.floor((Date.now() - lastMintTimeRef.current) / 1000)
        const remaining = Math.max(0, 60 - elapsed) // 60 seconds cooldown
        setLocalCooldown(remaining)
        
        // When local cooldown ends, refresh blockchain state
        if (remaining === 0) {
          refreshBalances()
          lastMintTimeRef.current = null
        }
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [refreshBalances])

  // Sync blockchain cooldown with local cooldown
  useEffect(() => {
    if (cooldownRemaining && cooldownRemaining > 0n) {
      const remaining = Number(cooldownRemaining)
      setLocalCooldown(remaining)
      lastMintTimeRef.current = Date.now() - ((60 - remaining) * 1000)
    }
  }, [cooldownRemaining])

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
    if (!txHash || !isSuccess) return

    const handleSuccess = async () => {
      console.log('Transaction confirmed! Refreshing data...', txHash)
      try {
        lastMintTimeRef.current = Date.now() // Start local cooldown
        setLocalCooldown(60) // Set initial cooldown
        await refreshBalances()
        console.log('Data refreshed successfully')
        setTxHash(null)
      } catch (error) {
        console.error('Failed to refresh balances:', error)
        setTxHash(null)
      }
    }

    handleSuccess()
  }, [isSuccess, txHash, refreshBalances])

  // Handle transaction error
  useEffect(() => {
    if (isError && txHash) {
      console.error('Transaction failed:', txHash)
      setTxHash(null)
    }
  }, [isError, txHash])

  const handleFreeMint = useCallback(
    async (tokenID: bigint) => {
      if (txHash) {
        console.log('Previous transaction still pending:', txHash)
        return
      }

      if (localCooldown > 0) {
        console.log('Cooldown still active:', localCooldown)
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
    [freeMint, txHash, localCooldown]
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

  const memoBalances = useMemo(() => {
    return Object.entries(balances).map(([tokenId, balance]) => ({
      tokenId: BigInt(tokenId),
      balance,
    }))
  }, [balances])

  const getTransactionStatus = () => {
    if (localCooldown > 0) {
      return `⏳ Cooldown active: ${localCooldown}s remaining before next mint`
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
           !canMint ||
           localCooldown > 0
  }

  const getButtonText = (tokenId: string) => {
    if (balances[tokenId] == BigInt(1)) return `Token ${tokenId} (Owned)`
    if (txHash) return `Token ${tokenId} (Pending...)`
    if (localCooldown > 0) {
      return `Wait ${localCooldown}s`
    }
    return `Mint Token ${tokenId}`
  }

  return (
    <>
      <Header action={<Action />} />
      
      <div className="p-4 rounded-lg bg-gray-100 my-4">
        <div className="text-lg font-semibold mb-2 text-center">Minting Status</div>
        <div className="text-md text-center font-medium">
          {getTransactionStatus()}
        </div>
        {localCooldown > 0 && (
          <div className="text-sm text-gray-600 mt-2 text-center">
            Please wait {localCooldown} seconds before minting again
          </div>
        )}
      </div>

      {address && (
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
            {memoBalances.map(({ tokenId, balance }) => (
              <div key={tokenId.toString()} className="flex gap-2">
                <span className="font-medium">Token {tokenId}:</span>
                <span>{balance.toString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}


      <div className="text-xs mt-8 p-4 bg-gray-50 rounded">
        <div className="font-semibold mb-2">Debug Information</div>
        <div>txHash: {txHash || 'null'}</div>
        <div>canMint: {String(canMint)}</div>
        <div>localCooldown: {localCooldown}</div>
        <div>cooldownRemaining: {cooldownRemaining?.toString() || 'null'}</div>
        <div>lastMintTime: {lastMintTimeRef.current ? new Date(lastMintTimeRef.current).toISOString() : 'null'}</div>
        <div>isLoading: {String(isLoading)}</div>
        <div>isSuccess: {String(isSuccess)}</div>
        <div>isError: {String(isError)}</div>
      </div>
    </>
  )
}

export default Home