import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
} from '@mekong-erp/ui';
import { getDevConfig, resetSeed, setDevConfig, type DevConfig } from '@mekong-erp/contract';

interface DemoToolsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Demo-only controls for the mocked backend: reset the seeded dataset, and
// tune the simulated latency / random-failure rate (PLAN.md §7).
export function DemoToolsDialog({ open, onOpenChange }: DemoToolsDialogProps) {
  const { t } = useTranslation();
  const [config, setConfig] = useState<DevConfig>(() => getDevConfig());
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  function update(patch: Partial<DevConfig>) {
    setConfig(setDevConfig({ ...config, ...patch }));
  }

  function handleReset() {
    setResetting(true);
    void resetSeed().then(() => {
      // A full reload drops every cached query and re-hydrates from the fresh seed.
      window.location.assign('/');
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setConfirmingReset(false);
      }}
    >
      <DialogContent>
        <DialogTitle>{t('demoTools.title')}</DialogTitle>
        <DialogDescription>{t('demoTools.description')}</DialogDescription>

        <section className="mt-4 flex flex-col gap-3">
          <h3 className="text-sm font-medium">{t('demoTools.network.title')}</h3>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={config.latencyEnabled}
              onChange={(event) => update({ latencyEnabled: event.target.checked })}
            />
            {t('demoTools.network.latencyEnabled')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              {t('demoTools.network.latencyMin')}
              <Input
                type="number"
                min={0}
                max={5000}
                value={config.latencyMinMs}
                disabled={!config.latencyEnabled}
                onChange={(event) => update({ latencyMinMs: Number(event.target.value) })}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {t('demoTools.network.latencyMax')}
              <Input
                type="number"
                min={0}
                max={5000}
                value={config.latencyMaxMs}
                disabled={!config.latencyEnabled}
                onChange={(event) => update({ latencyMaxMs: Number(event.target.value) })}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            {t('demoTools.network.failureRate')}
            <Input
              type="number"
              min={0}
              max={100}
              value={config.failureRatePct}
              onChange={(event) => update({ failureRatePct: Number(event.target.value) })}
            />
            <span className="text-xs text-muted-foreground">
              {t('demoTools.network.failureHint')}
            </span>
          </label>
        </section>

        <section className="mt-6 flex flex-col gap-2 border-t border-border pt-4">
          <h3 className="text-sm font-medium">{t('demoTools.reset.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('demoTools.reset.body')}</p>
          {confirmingReset ? (
            <div className="flex gap-2">
              <Button variant="destructive" onClick={handleReset} disabled={resetting}>
                {resetting ? t('demoTools.reset.working') : t('demoTools.reset.confirm')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirmingReset(false)}
                disabled={resetting}
              >
                {t('demoTools.reset.cancel')}
              </Button>
            </div>
          ) : (
            <div>
              <Button
                variant="outline"
                onClick={() => setConfirmingReset(true)}
                data-testid="reset-demo-data"
              >
                {t('demoTools.reset.action')}
              </Button>
            </div>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
