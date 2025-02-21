import { createConfig, http } from 'wagmi'
import {  sepolia, polygon,  anvil } from 'wagmi/chains'
import { walletConnect, injected } from 'wagmi/connectors'

const isProd = import.meta.env.MODE === 'production'

const chainsEnv = isProd ? [polygon] : [anvil, polygon];

const transportsEnv = isProd ? {
  [polygon.id]: http('https://polygon-rpc.com'),
} : {
  [polygon.id]: http('https://polygon-rpc.com'),
  [anvil.id]: http('http://127.0.0.1:8545', {
    timeout: 2000, 
  }),
};

export const wagmiConfig = createConfig({
  // @ts-ignore
  chains: chainsEnv,
  // @ts-ignore
  transports: transportsEnv,
  connectors: [
    injected(), 
  ],
})
