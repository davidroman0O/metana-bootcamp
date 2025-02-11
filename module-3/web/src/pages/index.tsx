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

  return (
    <>
      <Header
        action={<Action />}
      />
      
      <div className='flex flex-row items-center justify-center flex-gap-4 m-5'>
          <Button>Token 0</Button>
          <Button>Token 1</Button>
          <Button>Token 2</Button>
      </div>
    </>
  )
}

export default Home
