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
        [polygon.id]: '0xE2e1dc06094Ba241fAB4A0f93eFd9DB8a0880d53',
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