import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Card, CardContent, CardHeader } from './card';

export interface KpiTileTrend {
  direction: 'up' | 'down' | 'flat';
  label: string;
}

export interface KpiTileProps {
  label: string;
  value: string;
  trend?: KpiTileTrend | undefined;
  icon?: ReactNode | undefined;
}

const TREND_TONE: Record<KpiTileTrend['direction'], string> = {
  up: 'text-success',
  down: 'text-destructive',
  flat: 'text-muted-foreground',
};

/** A single dashboard stat tile. Values/labels arrive pre-formatted — packages/ui has no Intl/i18n of its own. */
export function KpiTile({ label, value, trend, icon }: KpiTileProps) {
  return (
    <Card className="min-w-0">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-0">
        {/* A caption, not a heading: six of them under the page h1 would be noise for heading navigation. */}
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="break-words text-2xl font-semibold tabular-nums">{value}</div>
        {trend && <p className={cn('mt-1 text-xs', TREND_TONE[trend.direction])}>{trend.label}</p>}
      </CardContent>
    </Card>
  );
}
