import { atom, useAtom, useAtomValue } from 'jotai'
import { useAccount, useWatchBlocks,  useReadContract, useChainId } from 'wagmi'
import type { Block } from 'viem'
import { useEffect, useCallback } from 'react'
import { mainnet, goerli, anvil } from 'wagmi/chains'

type BlockCallback = (block: Block) => void

// Create atoms for block state and callbacks
const blockAtom = atom<Block | null>(null)
const blockCallbacksAtom = atom<Set<BlockCallback>>(new Set<BlockCallback>())

// Add an atom for current chain
const chainIdAtom = atom<number | null>(null)

export function useBlockProvider() {
  const [block, setBlock] = useAtom(blockAtom)
  const [callbacks] = useAtom(blockCallbacksAtom)
  const chainId = useChainId()
  const [currentChainId, setCurrentChainId] = useAtom(chainIdAtom)

  // Reset block when chain changes
  useEffect(() => {
    if (chainId !== currentChainId) {
      setBlock(null)
      setCurrentChainId(chainId)
    }
  }, [chainId, currentChainId])

  useWatchBlocks({
    enabled: true,
    pollingInterval: 1000,
    onBlock: async (newBlock) => {
      setBlock(newBlock)
      callbacks.forEach(callback => callback(newBlock))
    },
  })

  return block
}

export function useBlockCallback(callback: BlockCallback) {
  const [callbacks, setCallbacks] = useAtom(blockCallbacksAtom)

  useEffect(() => {
    setCallbacks((prev: Set<BlockCallback>) => {
      const next = new Set(prev)
      next.add(callback)
      return next
    })

    return () => {
      setCallbacks((prev: Set<BlockCallback>) => {
        const next = new Set(prev)
        next.delete(callback)
        return next
      })
    }
  }, [callback, setCallbacks])
}

interface ContractAddresses {
  [chainId: number]: string | undefined
}

export function useContractAvailability(
  addresses: ContractAddresses,
  abi: any,
  functionName: string = 'owner'
) {
  const chainId = useChainId()
  const contractAddress = addresses[chainId]

  const { data, isError, error } = useReadContract({
    abi,
    address: contractAddress as `0x${string}`,
    functionName,
    query: {
      enabled: !!contractAddress,
      retry: false,
    }
  })

  const isAvailable = useCallback(() => {
    // Contract exists if we have a valid address for the current chain
    return !!contractAddress
  }, [contractAddress])

  const isValid = useCallback(() => {
    // Contract is valid if we can call functions on it (got data or specific error)
    return !isError || error?.message?.includes('user rejected')
  }, [isError, error])

  const exists = isAvailable() && isValid()

  return {
    isAvailable: isAvailable(),   // Has address for this chain
    isValid: isValid(),           // Can call functions
    exists,                       // Both available and valid
    contractAddress,
    chainId,
  }
}

// Optional: Add derived atoms for block info
export const blockNumberAtom = atom(get => get(blockAtom)?.number)
export const blockTimestampAtom = atom(get => get(blockAtom)?.timestamp)
export const currentChainAtom = atom(get => get(chainIdAtom))