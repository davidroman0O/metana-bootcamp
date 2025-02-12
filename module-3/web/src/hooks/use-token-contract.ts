import { useAccount } from 'wagmi'
import { sepolia, polygon, anvil } from 'wagmi/chains'

import ABI from './abi/ERC1155Token'
import ADDRESS from './anvil/token';

export function useTokenContractAddress() {
  const { chain = polygon } = useAccount()

  return useMemo(
    () =>
      ({
        [anvil.id]: ADDRESS, 
        [polygon.id]: '0xF61Cce508003e372Faf0f7162f5944d40c534186',
      })[chain.id],
    [chain],
  )
}

export function useTokenContract() {
  const address = useTokenContractAddress()
  return useMemo(
    () => ({
      address: address! as `0x${string}`,
      abi: ABI,
    }),
    [address],
  )
}