import { 
  useAccount, 
  useReadContracts,
  useWriteContract,
} from 'wagmi'
import { useForgeContract } from './use-forge-contract'

interface UseForgeConfig {
  onSuccess?: () => Promise<void>
  onTxHash?: (hash: `0x${string}`) => void
}

export function useForge({ onSuccess, onTxHash }: UseForgeConfig = {}) {
  const { address } = useAccount()
  const forgeContract = useForgeContract()
  const { writeContract } = useWriteContract()

  const { data } = useReadContracts({
    contracts: [
      {
        ...forgeContract,
        functionName: 'owner',
      },
    ],
  })

  return {
    owner: data?.[0].result?.toString() ?? undefined,
    
    trade: async (tokenIDToTrade: bigint, tokenIDToReceive: bigint): Promise<`0x${string}`> => {
      return new Promise((resolve, reject) => {
        writeContract(
          {
            ...forgeContract,
            functionName: 'trade',
            args: [tokenIDToTrade, tokenIDToReceive],
          },
          {
            onSuccess: async (hash: `0x${string}`) => {
              try {
                // Report transaction hash immediately
                if (onTxHash) {
                  onTxHash(hash)
                }
                resolve(hash)
              } catch (error) {
                console.error('Error in trade onSuccess:', error)
                reject(error)
              }
            },
            onError: (error: any) => {
              console.error('Error in trade:', error)
              reject(error)
            },
          }
        )
      })
    },
    
    forge: async (tokenID: bigint): Promise<`0x${string}`> => {
      return new Promise((resolve, reject) => {
        writeContract(
          {
            ...forgeContract,
            functionName: 'forge',
            args: [tokenID],
          },
          {
            onSuccess: async (hash: `0x${string}`) => {
              try {
                if (onTxHash) {
                  onTxHash(hash)
                }
                resolve(hash)
              } catch (error) {
                console.error('Error in forge onSuccess:', error)
                reject(error)
              }
            },
            onError: (error: any) => {
              console.error('Error in forge:', error)
              reject(error)
            },
          }
        )
      })
    },
  }
}