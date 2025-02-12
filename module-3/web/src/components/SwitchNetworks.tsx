import { useAccount, useSwitchChain, useChainId } from 'wagmi'
import { useBlockProvider } from '@/hooks/use-block-provider'
import { useMemo, useState, useCallback } from 'react'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function NetworkSwitcher() {
  const { chains, switchChain, isPending } = useSwitchChain()
  const { chain } = useAccount()
  const block = useBlockProvider()
  const chainId = useChainId()
  
  // Memoize the chain value to prevent unnecessary re-renders
  const defaultValue = useMemo(() => chain?.id.toString(), [chain?.id])
  const [pendingChainId, setPendingChainId] = useState<number>()

  // Memoize the change handler
  const handleValueChange = useCallback((val: string) => {
    setPendingChainId(+val)
    switchChain({
      chainId: Number(val),
    })
  }, [switchChain])

  // Memoize the chain options to prevent re-renders
  const chainOptions = useMemo(() => 
    chains.filter(x => x.id !== chain?.id),
    [chains, chain?.id]
  )

  // Only show loading while getting first block
  const isInitializing = !block 

  if (!chain) return null

  return (
    <Select
      onValueChange={handleValueChange}
      defaultValue={defaultValue}
      value={defaultValue}
    >
      <SelectTrigger className="max-w-auto lt-sm:hidden">
        <SelectValue>
          <span className="flex items-center">
            {(isPending || isInitializing) && (
              <span className="i-line-md:loading-twotone-loop mr-1 h-4 w-4 inline-flex text-primary" />
            )}
            {' '}
            {chain.name}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {chainOptions.map(x => (
            <SelectItem value={`${x.id}`} key={x.id}>
              <span className="flex items-center">
                {(isPending && x.id === pendingChainId) && (
                  <span className="i-line-md:loading-twotone-loop mr-1 h-4 w-4 inline-flex text-primary" />
                )}
                {' '}
                {x.name}
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}