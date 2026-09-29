import { cn } from '../lib/cn';
import type { StatusBadgeTone } from './status-badge';

export interface TimelineEntry {
  id: string;
  title: string;
  /** Already locale-formatted by the caller — this package has no i18n of its own. */
  timestampLabel: string;
  description?: string;
  tone?: StatusBadgeTone;
}

export interface TimelineProps {
  items: TimelineEntry[];
  className?: string;
}

const dotToneClass: Record<StatusBadgeTone, string> = {
  neutral: 'bg-muted-foreground',
  info: 'bg-accent',
  warning: 'bg-warning',
  success: 'bg-success',
  destructive: 'bg-destructive',
};

export function Timeline({ items, className }: TimelineProps) {
  return (
    <ol className={cn('flex flex-col', className)}>
      {items.map((item, index) => (
        <li key={item.id} className="relative flex gap-3 pb-6 last:pb-0">
          {index < items.length - 1 && (
            <span aria-hidden="true" className="absolute left-[5px] top-3 h-full w-px bg-border" />
          )}
          <span
            aria-hidden="true"
            className={cn(
              'relative z-10 mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-background',
              dotToneClass[item.tone ?? 'neutral'],
            )}
          />
          <div className="flex flex-1 flex-col gap-0.5">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-sm font-medium text-foreground">{item.title}</span>
              <span className="text-xs text-muted-foreground">{item.timestampLabel}</span>
            </div>
            {item.description !== undefined && (
              <p className="text-sm text-muted-foreground">{item.description}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
