import type { ReactNode } from 'react'

export function Header({ action }: { action?: ReactNode }) {
  return (
    <div className="sticky top-0 z-10 box-border h-16 border-b-1 border-border border-solid bg-white">
      <div className="m-auto h-full max-w-6xl flex items-center justify-between lt-sm:px-4 sm:px-8">
        <div className="flex cursor-pointer items-center font-bold">
          <span className="text-xl">Forge</span>
        </div>
        <div className="flex items-center gap-2">
          {action}
        </div>
      </div>
    </div>
  )
}
