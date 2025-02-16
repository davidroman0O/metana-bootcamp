import { useAccount } from 'wagmi'
import { sepolia, polygon, anvil } from 'wagmi/chains'

import ABI from './abi/Forge'


import { FORGE_ADDRESSES } from "@/config/networks";

export function useForgeContractAddress() {
  const { chain = polygon } = useAccount()

  return useMemo(
    () =>
      FORGE_ADDRESSES[chain.id],
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