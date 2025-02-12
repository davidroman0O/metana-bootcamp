import { useAccount } from 'wagmi'
import { sepolia, mainnet, anvil } from 'wagmi/chains'

import ABI from './abi/ERC1155Token'
import ADDRESS from './anvil/token';

export function useTokenContractAddress() {
  const { chain = mainnet } = useAccount()

  return useMemo(
    () =>
      ({
        [anvil.id]: ADDRESS, 
        [mainnet.id]: '0xCafac3dD18aC6c6e92c921884f9E4176737C052c',
        [sepolia.id]: '0xCafac3dD18aC6c6e92c921884f9E4176737C052c',
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