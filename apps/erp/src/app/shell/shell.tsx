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
      {/* min-w-0: a flex item never shrinks below its content, so without it a wide grid stretches the whole page (top bar included) instead of scrolling inside its own container. */}
      <div className="flex min-w-0 flex-1 flex-col">
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
