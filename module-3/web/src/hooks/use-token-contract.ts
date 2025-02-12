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
        [polygon.id]: '0xFb9DC938DE68A2F8daAfFf7493c486d6f8cc73D2',
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