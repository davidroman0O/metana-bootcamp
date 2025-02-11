import { shorten } from '@did-network/dapp-sdk'
import { useAccount } from 'wagmi'

import { Header } from '@/components/layout/Header'
import { NetworkSwitcher } from '@/components/SwitchNetworks'
import { WalletModal } from '@/components/WalletModal'
import { useCopyToClipboard } from '@/hooks/use-copy'
import { useForge } from '@/hooks/use-forge'
import { useToken } from "@/hooks/use-token"



function Home() {
  const { address } = useAccount()

  const [show, setShow] = useState(false)

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
  } = useForge();

  const {
    owner: ownerToken,
    freeMint,
    canMint,
    balances,
  } = useToken();

  // eslint-disable-next-line @eslint-react/no-nested-components
  const Action = () => (
    <>
      <NetworkSwitcher />
      <WalletModal open={show} onOpenChange={toggleModal} close={() => setShow(false)}>
        {({ isLoading }) => (
          <Button className="mr-4 flex items-center">
            {isLoading && (
              <span className="i-line-md:loading-twotone-loop mr-1 h-4 w-4 inline-flex text-white" />
            )}
            {' '}
            {address ? shorten(address) : 'Connect Wallet'}
          </Button>
        )}
      </WalletModal>
    </>
  )

  const memoBalances = useMemo(() => {
    return Object.entries(balances).map(([tokenId, balance]) => ({
      tokenId: BigInt(tokenId), // Convert back to bigint if needed
      balance,
    }))
  }, [balances])

  return (
    <>
      <Header
        action={<Action />}
      />
      
      {
        address &&
        <div className='flex flex-row items-center justify-center flex-gap-4 m-5'>
            <Button disabled={balances['0'] == BigInt(1)} onClick={() => freeMint(BigInt(0))}>Token 0</Button>
            <Button disabled={balances['1'] == BigInt(1)} onClick={() => freeMint(BigInt(1))}>Token 1</Button>
            <Button disabled={balances['2'] == BigInt(1)} onClick={() => freeMint(BigInt(2))}>Token 2</Button>
        </div>
      }

        
      <div>{`Can mint: ${canMint}`}</div>

      <div>
        {
            memoBalances.map(({ tokenId, balance }) => (
              <div key={tokenId}>{`Token ${tokenId}: ${balance}`}</div>
            ))
        }
      </div>
    </>
  )
}

export default Home
