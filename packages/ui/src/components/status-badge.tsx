import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const statusBadgeVariants = cva(
  'inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      tone: {
        neutral: 'border-border bg-muted text-muted-foreground',
        info: 'border-accent/30 bg-accent/10 text-accent',
        warning: 'border-warning/30 bg-warning/10 text-warning',
        success: 'border-success/30 bg-success/10 text-success',
        destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  },
);

export type StatusBadgeTone = NonNullable<VariantProps<typeof statusBadgeVariants>['tone']>;

export interface StatusBadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof statusBadgeVariants> {}

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, tone, ...props }, ref) => (
    <span ref={ref} className={cn(statusBadgeVariants({ tone }), className)} {...props} />
  ),
);
StatusBadge.displayName = 'StatusBadge';
