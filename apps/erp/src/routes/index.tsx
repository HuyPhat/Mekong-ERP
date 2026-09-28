import { createFileRoute } from '@tanstack/react-router';
import { CONTRACT_VERSION } from '@mekong-erp/contract';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-950 text-slate-100">
      <h1 className="text-3xl font-bold tracking-tight">Mekong ERP</h1>
      <p className="text-slate-400">Phase 0 scaffold — contract v{CONTRACT_VERSION}</p>
    </main>
  );
}
