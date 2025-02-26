import { shorten } from '@did-network/dapp-sdk'
import { useAccount } from 'wagmi'

// import { Header } from '@/components/layout/Header'
// import { NetworkSwitcher } from '@/components/SwitchNetworks'
// import { WalletModal } from '@/components/WalletModal'
// import { useCopyToClipboard } from '@/hooks/use-copy'
// import WagmiIcon from '~icons/fisand-icons/wagmi-icon'
import BlockchainDashboard from '@/components/BlockchainDashboard';

function Home() {
  

  return (
    <>
      <div className="container mx-auto py-8">
        <BlockchainDashboard />
      </div>
    </>
  )
}

export default Home
