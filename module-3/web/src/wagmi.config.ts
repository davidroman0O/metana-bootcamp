import { createConfig, http } from 'wagmi'
import { bsc, bscTestnet, sepolia, mainnet,  anvil } from 'wagmi/chains'
import { walletConnect } from 'wagmi/connectors'

export const wagmiConfig = createConfig({
  chains: [
    anvil,
    sepolia, 
    // bsc, 
    // bscTestnet, 
    // mainnet, 
    // sepolia,
  ],
  transports: {
    [anvil.id]: http('http://127.0.0.1:8545'),
    [sepolia.id]: http(),
    // [mainnet.id]: http(),
    // [sepolia.id]: http(),
    // [bsc.id]: http(),
    // [bscTestnet.id]: http(),
  },
  connectors: [
    // walletConnect({
    //   projectId: 'f18c88f1b8f4a066d3b705c6b13b71a8',
    // }),
  ],
})
