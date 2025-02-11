import { useAccount } from 'wagmi'
import { goerli, mainnet, anvil } from 'wagmi/chains'

import ABI from './abi/Forge'
import ADDRESS from './anvil/forge';

export function useForgeContractAddress() {
  const { chain = mainnet } = useAccount()

  return useMemo(
    () =>
      ({
        [anvil.id]: ADDRESS, 
        [mainnet.id]: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        [goerli.id]: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
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