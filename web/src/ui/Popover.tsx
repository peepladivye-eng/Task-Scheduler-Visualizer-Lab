import React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from '../lib/cn'

export const PopoverRoot = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverAnchor = PopoverPrimitive.Anchor
export const PopoverClose = PopoverPrimitive.Close

export interface PopoverContentProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> {}

export const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  PopoverContentProps
>(({ className, align = 'center', sideOffset = 8, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'bg-sheet border border-line rounded-[10px] shadow-sheet p-4',
        'animate-in fade-in-0 zoom-in-95',
        'z-50',
        className
      )}
      {...props}
    >
      {props.children}
      <PopoverPrimitive.Arrow className="fill-line" />
    </PopoverPrimitive.Content>
  </PopoverPrimitive.Portal>
))

PopoverContent.displayName = 'PopoverContent'
