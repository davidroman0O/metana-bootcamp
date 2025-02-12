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
        [polygon.id]: '0xf41C0CbB57F655a33e48d5dD9e833f0B5DdFAf2e',
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