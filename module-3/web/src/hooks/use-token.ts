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
      // {
      //   ...tokenContract,
      //   functionName: ''
      //   // functionName: 'trade'
      // },
      // {
      //   ...tokenContract,
      //   // functionName: 'getAlive',
      // },
      // {
      //   ...tokenContract,
      //   // functionName: 'love',
      //   args: [address!],
      // },
    ],
  })

  console.log('data', data?.[0])

  return {
    owner: data?.[0]?.result?.toString() ?? undefined,
    // getBoredom: data?.[1]?.toString() ?? undefined,
    // getAlive: data?.[2]?.toString() ?? undefined,
    // loved: data?.[3]?.toString() ?? undefined,
  }
}
