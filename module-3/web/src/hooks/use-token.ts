import { 
  useAccount, 
  useReadContracts,
  useReadContract,
  useWriteContract,
  useChainId,
} from 'wagmi'
import type { ReadContractsErrorType } from '@wagmi/core'
import type { MulticallResponse } from "viem"
import {
  QueryObserverResult,
} from "@tanstack/react-query"
import { useTokenContract } from './use-token-contract'
import { useContractAvailability } from './use-block-provider'
import { anvil, polygon } from 'wagmi/chains'
import { useState, useEffect, useCallback } from 'react'

type HexAddress = `0x${string}`

interface TokenBalances {
  [tokenId: string]: bigint
}

interface TokenData {
  tokenId: bigint
  balance: bigint
}

interface UseTokenReturn {
  owner?: HexAddress
  canMint?: boolean
  cooldownRemaining?: number
  balances: TokenBalances
  initialized: boolean
  lastMintTime?: number
  tokens: TokenData[]
  countdown: number
  remainingMintTime?: number | null
  exists: boolean
  freeMint: (tokenID: bigint) => Promise<any>
  setApprovalForAll: (spenderAddress: `0x${string}`) => Promise<`0x${string}`>
  isApprovalLoading: boolean
  isApprovedForAll: (spenderAddress: `0x${string}`) => Promise<boolean>
  refreshData: () => Promise<void>
}

const isProd = import.meta.env.MODE === 'production'


export function useToken(): UseTokenReturn {
  const { address } = useAccount()
  const tokenContract = useTokenContract()
  const { writeContract } = useWriteContract()
  const chainId = useChainId()

  const tokenIds: bigint[] = Array.from({ length: 7 }, (_, i) => BigInt(i))
  const accounts: HexAddress[] = Array(tokenIds.length).fill(address as HexAddress)

  // State declarations
  const [owner, setOwner] = useState<HexAddress>("0x")
  const [canMint, setCanMint] = useState<boolean>(false)
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0)
  const [balances, setBalances] = useState<TokenBalances>({})
  const [tokens, setTokens] = useState<TokenData[]>([])
  const [lastMintTime, setLastMintTime] = useState<number>(0)
  const [remainingMintTime, setRemainingMintTime] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [isApprovalLoading, setIsApprovalLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Contract availability check
  const { 
    exists,
    contractAddress, 
  } = useContractAvailability(
    isProd ?{
      [polygon.id]: tokenContract.address,
    } :
    {
      [anvil.id]: tokenContract.address,
      [polygon.id]: tokenContract.address,
    },
    tokenContract.abi,
    'owner'
  )

  // Contract read hooks
  const { data, refetch } = useReadContracts({
    contracts: [
      {
        ...tokenContract,
        functionName: 'owner',
      },
      {
        ...tokenContract,
        functionName: 'balanceOfBatch',
        args: [accounts, tokenIds],
      },
    ],
  })

  const { data: cooldownPeriod } = useReadContract({
    ...tokenContract,
    functionName: 'COOLDOWN',
  })

  const { data: cooldownData, refetch: refetchCooldown } = useReadContract({
    ...tokenContract,
    account: address,
    functionName: 'getRemainingCooldown',
  })

  const { data: lastMintTimeData, refetch: refetchLastMintTime } = useReadContract({
    ...tokenContract,
    account: address,
    functionName: 'getLastMintTime',
  })

  const { data: canMintData, refetch: refetchCanMint } = useReadContract({
    ...tokenContract,
    account: address,
    functionName: 'canMint',
  })

  const { data: approvalData, refetch: refetchApproval } = useReadContract({
    ...tokenContract,
    functionName: 'isApprovedForAll',
    args: address ? [address, tokenContract.address] : undefined,
    account: address,
  })

  // Helper functions
  const calculateCooldown = useCallback((lastMintTime: bigint, cooldownPeriod: bigint) => {
    const currentTime = BigInt(Math.floor(Date.now() / 1000))
    const cooldownRemainingSeconds = cooldownPeriod - (currentTime - lastMintTime)
    setCooldownRemaining(Number(cooldownRemainingSeconds > 0n ? cooldownRemainingSeconds : 0n))

    // Calculate mint time in milliseconds
    const mintTime = (lastMintTime + cooldownPeriod) * 1000n
    setRemainingMintTime(Number(mintTime))
  }, [])

  const resetState = useCallback(() => {
    setOwner("0x")
    setCanMint(false)
    setCooldownRemaining(0)
    setBalances({})
    setTokens([])
    setLastMintTime(0)
    setRemainingMintTime(null)
    setTimeLeft(0)
    setInitialized(false)
  }, [])

  // Central data refresh function
  const refreshAllData = useCallback(async () => {
    if (!exists || !address) return

    try {
      const refreshedData = await refetch()
      const refreshedCooldown = await refetchCooldown()
      const refreshedLastMintTime = await refetchLastMintTime()
      const refreshedCanMint = await refetchCanMint()

      // Update owner and mint status
      setOwner(refreshedData.data?.[0]?.result?.toString() as HexAddress || "" as HexAddress)
      setCanMint(refreshedCanMint.data as boolean)

      // Calculate cooldown times if we have the data
      const lastMintTime = refreshedLastMintTime.data as bigint
      if (lastMintTime && cooldownPeriod) {
        calculateCooldown(lastMintTime, cooldownPeriod as bigint)
      }

      setLastMintTime(Number(lastMintTime) * 1000)

      // Update balances
      const refreshedBalanceResults = refreshedData.data?.[1]?.result as bigint[] | undefined
      const refreshedBalances: TokenBalances = {}
      if (refreshedBalanceResults) {
        tokenIds.forEach((tokenId, index) => {
          refreshedBalances[tokenId.toString()] = refreshedBalanceResults[index] ?? BigInt(0)
        })
      }
      setBalances(refreshedBalances)

      // Update token data
      setTokens(
        Object.entries(refreshedBalances).map(([tokenId, balance]) => ({
          tokenId: BigInt(tokenId),
          balance,
        }))
      )

      setInitialized(true)
    } catch (error) {
      console.error('Error refreshing data:', error)
    }
  }, [exists, address, refetch, refetchCooldown, refetchLastMintTime, refetchCanMint, cooldownPeriod, calculateCooldown])

  // Effects
  useEffect(() => {
    resetState()
  }, [chainId, address])

  // Immediate cooldown calculation when we get contract data
  useEffect(() => {
    if (lastMintTimeData && cooldownPeriod) {
      calculateCooldown(lastMintTimeData as bigint, cooldownPeriod as bigint)
    }
  }, [lastMintTimeData, cooldownPeriod, calculateCooldown])

  // Initial data load and chain/account change refresh
  useEffect(() => {
    if (exists && address) {
      refreshAllData()
    }
  }, [exists, address, chainId])

  // Cooldown end refresh
  useEffect(() => {
    if (!remainingMintTime || !exists) return

    const now = Date.now()
    const timeUntilCooldownEnd = remainingMintTime - now

    if (timeUntilCooldownEnd <= 0) {
      refreshAllData()
      return
    }

    const timeout = setTimeout(() => {
      refreshAllData()
    }, timeUntilCooldownEnd)

    return () => clearTimeout(timeout)
  }, [remainingMintTime, exists])

  // Countdown timer effect
  useEffect(() => {
    if (remainingMintTime === null) return

    const updateCountdown = () => {
      const now = Date.now()
      const diff = remainingMintTime - now
      setTimeLeft(diff > 0 ? Math.floor(diff / 1000) : 0)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [remainingMintTime])

  // Early return for disconnected state
  if (!address) {
    return {
      exists: false,
      initialized: false,
      balances: {},
      tokens: [],
      countdown: 0,
      isApprovalLoading,
      freeMint: async () => { throw new Error('No wallet connected') },
      setApprovalForAll: async () => { throw new Error('No wallet connected') },
      isApprovedForAll: async () => false,
      refreshData: async () => {}
    }
  }

  // Early return for non-existent contract
  if (!exists) {
    return {
      exists: false,
      initialized: false,
      balances: {},
      tokens: [],
      countdown: 0,
      isApprovalLoading,
      freeMint: async () => { throw new Error('Contract not deployed on this network') },
      setApprovalForAll: async () => { throw new Error('Contract not deployed on this network') },
      isApprovedForAll: async () => false,
      refreshData: async () => {}
    }
  }

  return {
    exists: true,
    initialized,
    owner,
    canMint,
    cooldownRemaining,
    balances,
    lastMintTime,
    tokens,
    remainingMintTime,
    countdown: timeLeft,
    isApprovalLoading,
    
    freeMint: async (tokenID: bigint): Promise<any> => {
      return new Promise<any>((resolve, reject) => {
        writeContract(
          {
            ...tokenContract,
            functionName: 'freeMint',
            args: [tokenID],
          },
          {
            onSuccess: async (data: any) => {
              await refreshAllData()
              console.log('Free mint success:', data)
              resolve(data)
            },
            onError: (error: any) => {
              console.log('Error in freeMint:', error)
              reject(error)
            },
          }
        )
      })
    },

    setApprovalForAll: async (spenderAddress: `0x${string}`): Promise<`0x${string}`> => {
      if (!address) throw new Error('No address connected')
      setIsApprovalLoading(true)
      
      try {
        return await new Promise((resolve, reject) => {
          writeContract(
            {
              ...tokenContract,
              functionName: 'setApprovalForAll',
              args: [spenderAddress, true],
            },
            {
              onSuccess: async (data: `0x${string}`) => {
                await refreshAllData()
                resolve(data)
              },
              onError: (error: Error) => {
                reject(error)
              },
            }
          )
        })
      } finally {
        setIsApprovalLoading(false)
      }
    },

    isApprovedForAll: async (spenderAddress: `0x${string}`): Promise<boolean> => {
      if (!address) return false
      const result = await refetchApproval()
      return !!result.data
    },

    refreshData: refreshAllData
  }
}