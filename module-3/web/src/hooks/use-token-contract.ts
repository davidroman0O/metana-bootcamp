import { useAccount } from 'wagmi'
import { sepolia, polygon, anvil } from 'wagmi/chains'
import ABI from './abi/ERC1155Token'
import { TOKEN_ADDRESSES } from "@/config/networks";


export function useTokenContractAddress() {
  const { chain = polygon } = useAccount()

  return useMemo(
    () =>
      TOKEN_ADDRESSES[chain.id],
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