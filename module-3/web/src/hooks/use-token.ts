import { 
  useAccount, 
  useReadContracts,
  useWriteContract,
  
} from 'wagmi'


import { useTokenContract } from './use-token-contract'

type HexAddress = `0x${string}`

interface TokenBalances {
  [tokenId: string]: bigint // Maps tokenId to balance as string
}

interface UseTokenReturn {
  owner?: HexAddress
  canMint?: boolean
  cooldownRemaining?: bigint
  balances: TokenBalances
  refreshBalances: () => Promise<void>
  freeMint: (tokenID: bigint) => Promise<any>
}

export function useToken(): UseTokenReturn {
  const { address } = useAccount()
  const tokenContract = useTokenContract()
  const { writeContract } = useWriteContract()

  const tokenIds: bigint[] = Array.from({ length: 6 }, (_, i) => BigInt(i))
  const accounts: HexAddress[] = Array(tokenIds.length).fill(address as HexAddress)

  const { data, refetch } = useReadContracts({
    contracts: [
      {
        ...tokenContract,
        functionName: 'owner',
      },
      {
        ...tokenContract,
        functionName: 'canMint',
      },
      {
        ...tokenContract,
        functionName: 'balanceOfBatch',
        args: [accounts, tokenIds],
      },
      {
        ...tokenContract,
        functionName: 'getRemainingCooldown',
      },
    ],
  })

  const balances: TokenBalances = {}
  const balanceResults = data?.[2]?.result as bigint[] | undefined

  if (balanceResults) {
    tokenIds.forEach((tokenId, index) => {
      balances[tokenId.toString()] = balanceResults[index] ?? BigInt(0)
    })
  }

  return {
    owner: data?.[0]?.result?.toString() as HexAddress | undefined,
    canMint: data?.[1]?.result as boolean | undefined,
    cooldownRemaining: data?.[3]?.result as bigint | undefined,
    balances,


    refreshBalances: async () => {
      try {
        await refetch()
      } catch (error) {
        console.error('Failed to refresh balances:', error)
      }
    },

    
    freeMint: (tokenID: bigint): Promise<any> => {
      return new Promise<any>((resolve, reject) => {
        writeContract(
          {
            ...tokenContract,
            functionName: 'freeMint',
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
        );
      });
    },
    
  }
}
