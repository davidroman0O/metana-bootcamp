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
  balances: TokenBalances
  freeMint: (tokenID: bigint) => void
}


export function useToken(): UseTokenReturn {
  const { address } = useAccount()
  const tokenContract = useTokenContract()
  const { writeContract } = useWriteContract()

  const tokenIds: bigint[] = Array.from({ length: 6 }, (_, i) => BigInt(i))
  const accounts: HexAddress[] = Array(tokenIds.length).fill(address as HexAddress)

  const { data } = useReadContracts({
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
    balances,
    freeMint: (tokenID: bigint) => {
      writeContract({ 
        ...tokenContract,
        functionName: 'freeMint',
        args: [tokenID],
      })
    },
  }
}
