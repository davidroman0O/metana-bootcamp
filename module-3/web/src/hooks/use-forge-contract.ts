import { useAccount } from 'wagmi'
import { sepolia, polygon, anvil } from 'wagmi/chains'

import ABI from './abi/Forge'
import ADDRESS from './anvil/forge';


export function useForgeContractAddress() {
  const { chain = polygon } = useAccount()

  return useMemo(
    () =>
      ({
        [anvil.id]: ADDRESS, 
        [polygon.id]: '0x042397d98fa5CcDAd97F79De0b686f2F9EBA5679',
      })[chain.id],
    [chain],
  )
}

export function useForgeContract() {
  const address = useForgeContractAddress()
  return useMemo(
    () => ({
      address: address! as `0x${string}`,
      abi: ABI,
    }),
    [address],
  )
}