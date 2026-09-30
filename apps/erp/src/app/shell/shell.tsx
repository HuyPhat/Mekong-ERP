import type { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { CommandPalette } from './command-palette';
import { RealtimeConnection } from '../../shared/realtime/realtime-connection';

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="flex flex-1 flex-col">
        <div className="print:hidden">
          <Topbar />
        </div>
        <main className="flex-1 p-6 print:p-0">{children}</main>
      </div>
      <CommandPalette />
      <RealtimeConnection />
    </div>
  );
}
