import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:opacity-50 disabled:pointer-events-none rounded-lg',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-on-accent hover:-translate-y-0.5 active:scale-[0.97]',
        subtle: 'bg-chip text-ink border border-line hover:-translate-y-0.5 active:scale-[0.97]',
        ghost: 'text-ink hover:bg-chip active:scale-[0.97]',
      },
      size: {
        md: 'h-11 min-w-[2.75rem] px-4 text-sm',
        sm: 'h-9 px-3 text-sm',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'
