import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'destructive' | 'outline'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold',
        variant === 'default' && 'bg-indigo-100 text-indigo-700',
        variant === 'destructive' && 'bg-red-500 text-white',
        variant === 'outline' && 'border border-gray-300 text-gray-700',
        className
      )}
      {...props}
    />
  )
}
