import { shorten } from '@did-network/dapp-sdk'
import { useAccount } from 'wagmi'

import { Header } from '@/components/layout/Header'
import { NetworkSwitcher } from '@/components/SwitchNetworks'
import { WalletModal } from '@/components/WalletModal'
import { useCopyToClipboard } from '@/hooks/use-copy'
import WagmiIcon from '~icons/fisand-icons/wagmi-icon'

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
    </>
  )
}

export default Home
