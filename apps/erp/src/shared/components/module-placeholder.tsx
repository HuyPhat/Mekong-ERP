import { useTranslation } from 'react-i18next';

export function ModulePlaceholder({ titleKey, phase }: { titleKey: string; phase: number }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-xl font-semibold">{t(titleKey)}</h1>
      <p className="text-muted-foreground">{t('placeholder.comingInPhase', { phase })}</p>
    </div>
  );
}
