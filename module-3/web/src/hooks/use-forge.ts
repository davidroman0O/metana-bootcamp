import { 
  useAccount, 
  useReadContracts,
} from 'wagmi'

import { useForgeContract} from './use-forge-contract'

export function useForge() {
  const { address } = useAccount()
  const forgeContract = useForgeContract()

  const { data } = useReadContracts({
    contracts: [
      {
        ...forgeContract,
        functionName: 'getAddress',
      },
      {
        ...forgeContract,
        functionName: 'owner',
      },
      // {
      //   ...forgeContract,
      //   functionName: ''
      //   // functionName: 'trade'
      // },
      // {
      //   ...forgeContract,
      //   // functionName: ''
      //   // functionName: 'getAlive',
      // },
      // {
      //   ...forgeContract,
      //   // functionName: 'love',
      //   args: [address!],
      // },
    ],
  })

  // console.log('data', data?.[0])

  return {
    tokenAddress: data?.[0].result?.toString() ?? undefined,
    owner: data?.[1].result?.toString() ?? undefined,
    // getBoredom: data?.[1]?.toString() ?? undefined,
    // getAlive: data?.[2]?.toString() ?? undefined,
    // loved: data?.[3]?.toString() ?? undefined,
    // status: data?.[0]?.toString() ?? undefined,
  }
}
