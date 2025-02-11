import { 
  useAccount, 
  useReadContracts,
} from 'wagmi'

import { useTokenContract } from './use-token-contract'

export function useToken() {
  const { address } = useAccount()
  const tokenContract = useTokenContract()

  const { data } = useReadContracts({
    contracts: [
      {
        ...tokenContract,
        functionName: 'owner'
      },
      {
        ...tokenContract,
        functionName: 'canMint'
      },
    ],
  })

  // console.log('data', data?.[1])

  return {
    owner: data?.[0]?.result?.toString() ?? undefined,
    canMint: data?.[1]?.result ?? undefined,
    // getBoredom: data?.[1]?.toString() ?? undefined,
    // getAlive: data?.[2]?.toString() ?? undefined,
    // loved: data?.[3]?.toString() ?? undefined,
  }
}
