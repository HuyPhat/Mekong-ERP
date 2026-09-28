import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@mekong-erp/ui';

export const Route = createFileRoute('/_app/403')({
  component: ForbiddenPage,
});

function ForbiddenPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <ShieldAlert className="h-10 w-10 text-muted-foreground" />
      <h1 className="text-xl font-semibold">{t('errors.forbiddenTitle')}</h1>
      <p className="text-muted-foreground">{t('errors.forbiddenBody')}</p>
      <Button asChild>
        <Link to="/">{t('errors.backHome')}</Link>
      </Button>
    </div>
  );
}
