import { 
  useAccount, 
  useReadContracts,
  useReadContract,
  useWriteContract,
  useWatchBlocks,
  useChainId,
} from 'wagmi'
import type { ReadContractsErrorType } from '@wagmi/core'
import type { MulticallResponse, Block } from "viem"
import {
  QueryObserverResult,
} from "@tanstack/react-query"
import { useTokenContract } from './use-token-contract'
import { useBlockCallback, useContractAvailability } from './use-block-provider'
import { sepolia, mainnet, anvil } from 'wagmi/chains'
import { useState, useEffect } from 'react'

type HexAddress = `0x${string}`

interface TokenBalances {
  [tokenId: string]: bigint // Maps tokenId to balance as string
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
}

export function useToken(): UseTokenReturn {
  const { address } = useAccount()
  const tokenContract = useTokenContract()
  const { writeContract } = useWriteContract()
  const chainId = useChainId()

  const tokenIds: bigint[] = Array.from({ length: 7 }, (_, i) => BigInt(i))
  const accounts: HexAddress[] = Array(tokenIds.length).fill(address as HexAddress)

  // Declare all state hooks first
  const [ owner, setOwner ] = useState<HexAddress>("0x")
  const [ canMint, setCanMint ] = useState<boolean>(false)
  const [ cooldownRemaining, setCooldownRemaining ] = useState<number>(0)
  const [ balances, setBalances ] = useState<TokenBalances>({})
  const [ tokens, setTokens ] = useState<TokenData[]>([])
  const [ lastMintTime, setLastMintTime ] = useState<number>(0)
  const [ block, setBlock ] = useState<Block | null>(null)
  const [remainingMintTime, setRemainingMintTime] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)

  // Contract availability check
  const { 
    isAvailable,
    isValid,
    exists,
    contractAddress, 
  } = useContractAvailability(
    {
      [anvil.id]: tokenContract.address,
      [mainnet.id]: tokenContract.address,
      [sepolia.id]: tokenContract.address,
    },
    tokenContract.abi,
    'owner'
  )

  // Declare all contract read hooks
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

  // Network change effect
  useEffect(() => {
    setOwner("0x")
    setCanMint(false)
    setCooldownRemaining(0)
    setBalances({})
    setTokens([])
    setLastMintTime(0)
    setBlock(null)
    setRemainingMintTime(null)
  }, [chainId])

  // Countdown effect
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

  // Block watching
  useWatchBlocks({
    enabled: exists,
    pollingInterval: 1000,
    onBlock: async (data) => { 
      if (!exists) return
      if (block === null || data.timestamp != block?.timestamp) {
        setBlock(data)

        const refreshedData = await refetch()
        const refreshedCooldown = await refetchCooldown()
        const refreshedLastMintTime = await refetchLastMintTime()
        const refreshedCanMint = await refetchCanMint()

        setOwner(refreshedData.data?.[0]?.result?.toString() as HexAddress || "" as HexAddress)
        setCanMint(refreshedCanMint.data as boolean)

        const cooldownRemaining = refreshedCooldown.data as bigint
        const lastMintTime = refreshedLastMintTime.data as bigint
        const currentTime = BigInt(data.timestamp)

        const cooldownRemainingSeconds = cooldownRemaining - (currentTime - lastMintTime)
        setCooldownRemaining(Number(cooldownRemainingSeconds > 0n ? cooldownRemainingSeconds : 0n))

        // Calculate remainingMintTime in milliseconds
        const mintTime = (lastMintTime + cooldownRemaining) * 1000n
        setRemainingMintTime(Number(mintTime))

        const refreshedBalanceResults = refreshedData.data?.[1]?.result as bigint[] | undefined
        const refreshedBalances: TokenBalances = {}
        if (refreshedBalanceResults) {
          tokenIds.forEach((tokenId, index) => {
            refreshedBalances[tokenId.toString()] = refreshedBalanceResults[index] ?? BigInt(0)
          })
        }
        setBalances(refreshedBalances)

        setLastMintTime(Number(lastMintTime) * 1000)

        setTokens(
          Object.entries(refreshedBalances).map(([tokenId, balance]) => ({
            tokenId: BigInt(tokenId),
            balance,
          }))
        )
      }
    },
  })

  // Early returns after all hook declarations
  if (!address) {
    return {
      exists: false,
      initialized: false,
      owner: undefined,
      canMint: false,
      cooldownRemaining: 0,
      balances: {},
      lastMintTime: 0,
      tokens: [],
      countdown: 0,
      remainingMintTime: null,
      freeMint: async () => { throw new Error('No wallet connected') }
    }
  }

  if (!exists) {
    return {
      exists: false,
      initialized: false,
      owner: undefined,
      canMint: false,
      cooldownRemaining: 0,
      balances: {},
      lastMintTime: 0,
      tokens: [],
      countdown: 0,
      remainingMintTime: null,
      freeMint: async () => { 
        if (!isAvailable) {
          throw new Error('Contract not deployed on this network') 
        }
        throw new Error('Contract exists but cannot be called')
      }
    }
  }

  return {
    exists: true,
    initialized: block !== null,
    owner,
    canMint,
    cooldownRemaining,
    balances,
    lastMintTime,
    tokens,
    remainingMintTime,
    countdown: timeLeft,
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
              resolve(data)
            },
            onError: (error: any, variables: unknown, context: unknown) => {
              reject(error)
            },
          }
        )
      })
    },
  }
}