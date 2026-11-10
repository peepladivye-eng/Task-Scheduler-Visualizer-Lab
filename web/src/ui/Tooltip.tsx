import React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { dur, ease } from '../design/motion'
import { cn } from '../lib/cn'

export const TooltipProvider = TooltipPrimitive.Provider

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  return (
    <TooltipPrimitive.Root delayDuration={400}>
      <TooltipPrimitive.Trigger asChild>
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={4}
          className={cn(
            'bg-ink text-paper text-xs rounded-md px-2 py-1',
            'animate-in fade-in-0 slide-in-from-bottom-1',
            'z-50 max-w-xs'
          )}
          style={{
            animationDuration: `${dur.fast}s`,
            animationTimingFunction: `cubic-bezier(${ease.out.join(',')})`,
          }}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-ink" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
