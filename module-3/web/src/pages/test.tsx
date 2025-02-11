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

export default function Test() {
    const { address } = useAccount()
    const [show, setShow] = useState(false)
    const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
    const [localCooldown, setLocalCooldown] = useState<number>(0)

    const toggleModal = (e: boolean) => {
        setShow(e)
    }

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

    const {
        freeMint,
        // refresh,
        balances,
        initialized,
        canMint,
        cooldownRemaining,
        owner,
        lastMintTime,
    } = useToken()

    // const [  sState ] = useState<RefreshedData | null>(null)

    // useEffect(() => {
    //     const timer = setInterval(() => {
    //     refresh().then((state) => {
    //         console.log('Refreshed data:', state);
    //         sState(state)
    //     })
    //     }, 1000)
    //     return () => clearInterval(timer)
    // }, [refresh])


    const memoBalances = useMemo(() => {
        if (balances === undefined || balances === null) {
            return []
        }
        // @ts-ignore
        return Object.entries(balances).map(([tokenId, balance]) => ({
            tokenId: BigInt(tokenId),
            balance,
        }))
    }, [balances])


    return (
        <>
        <Header action={<Action />} />
            {
                initialized &&
                    <div>
                        <h1>Owner: {owner}</h1>
                        <h1>Can Mint: {canMint ? "yes" : "no"}</h1>
                        <h1>Cooldown Remaining: {cooldownRemaining}</h1>
                        <h1>Last Mint Time: {lastMintTime}</h1>
                        <h1>Balances: {memoBalances.map(({ tokenId, balance }) => (
                            <div key={tokenId.toString()} className="flex gap-2">
                                <span className="font-medium">Token {tokenId}:</span>
                                <span>{balance.toString()}</span>
                            </div>
                            ))}</h1>
                    </div>

            }
        </>
    );
    
}