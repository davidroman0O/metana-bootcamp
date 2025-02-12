import { 
  useAccount, 
  useReadContracts,
  useWriteContract,
} from 'wagmi'

import { useForgeContract} from './use-forge-contract'

export function useForge() {
  const { address } = useAccount()
  const forgeContract = useForgeContract()
  const { writeContract } = useWriteContract()

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
    ],
  })

  return {
    tokenAddress: data?.[0].result?.toString() ?? undefined,
    owner: data?.[1].result?.toString() ?? undefined,
    
    trade(tokenIDToTrade: bigint, tokenIDToReceive: bigint): Promise<any> {
      return new Promise<any>((resolve, reject) => {
        return writeContract(
          {
            ...forgeContract,
            functionName: 'trade',
            args: [tokenIDToTrade, tokenIDToReceive],
          },
          {
            onSuccess: (data: any, variables: unknown, context: unknown) => {
              resolve(data);
            },
            onError: (error: any, variables: unknown, context: unknown) => {
              reject(error);
            },
          }
        )
      });
    },
    
    forge(tokenID: bigint): Promise<any> {
      return new Promise<any>((resolve, reject) => {
        return writeContract(
          {
            ...forgeContract,
            functionName: 'forge',
            args: [tokenID],
          },
          {
            onSuccess: (data: any, variables: unknown, context: unknown) => {
              resolve(data);
            },
            onError: (error: any, variables: unknown, context: unknown) => {
              reject(error);
            },
          }
        )
      });
    }
  }
}
