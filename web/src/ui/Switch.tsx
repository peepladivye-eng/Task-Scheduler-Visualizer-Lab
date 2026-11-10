import React from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { cn } from '../lib/cn'

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  label?: string
}

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({ className, label, id, ...props }, ref) => {
  const switchId = id || React.useId()

  return (
    <div className="flex items-center gap-3">
      <SwitchPrimitive.Root
        id={switchId}
        ref={ref}
        className={cn(
          'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full',
          'border-2 border-transparent transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'bg-chip data-[state=checked]:bg-accent',
          className
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            'pointer-events-none block h-5 w-5 rounded-full bg-sheet shadow-lg ring-0',
            'transition-transform duration-150 ease-out',
            'data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0'
          )}
        />
      </SwitchPrimitive.Root>
      {label && (
        <label
          htmlFor={switchId}
          className="text-sm font-medium text-ink cursor-pointer select-none"
        >
          {label}
        </label>
      )}
    </div>
  )
})

Switch.displayName = 'Switch'
