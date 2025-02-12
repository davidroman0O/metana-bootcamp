import { useAccount, useSwitchChain, useChainId } from 'wagmi'
import { useBlockProvider } from '@/hooks/use-block-provider'
import { useMemo, useState } from 'react'

export function NetworkSwitcher() {
  const { chains, switchChain, isPending } = useSwitchChain()
  const { chain } = useAccount()
  const block = useBlockProvider()
  const chainId = useChainId()
  
  const defaultValue = useMemo(() => chain?.id.toString(), [chain?.id])
  const [pendingChainId, setPendingChainId] = useState<number>()

  const isInitializing = !block // Show loading while getting first block
  
  if (!chain) return null

  return (
    <Select
      onValueChange={(val) => {
        setPendingChainId(+val)
        switchChain({
          chainId: Number(val),
        })
      }}
      defaultValue={defaultValue}
      value={defaultValue}
    >
      <SelectTrigger className="max-w-auto lt-sm:hidden">
        <SelectValue>
          <span className="flex-center">
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
          {chains.map(x =>
            x.id === chain?.id
              ? null
              : (
                  <SelectItem value={`${x.id}`} key={x.id} className="">
                    <span className="flex-center">
                      {(isPending && x.id === pendingChainId) && (
                        <span className="i-line-md:loading-twotone-loop mr-1 h-4 w-4 inline-flex text-primary" />
                      )}
                      {' '}
                      {x.name}
                    </span>
                  </SelectItem>
                ),
          )}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}