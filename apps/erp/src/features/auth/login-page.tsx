import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { DEMO_USERS } from '@mekong-erp/contract';
import { useLogin } from './queries';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useLogin();

  function handleSelect(userId: string) {
    login.mutate(userId, {
      onSuccess: () => {
        void navigate({ to: '/' });
      },
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 text-foreground">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{t('app.name')}</h1>
        <p className="mt-1 text-muted-foreground">{t('auth.loginTitle')}</p>
        <p className="text-sm text-muted-foreground">{t('auth.loginSubtitle')}</p>
      </div>
      <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        {DEMO_USERS.map((user) => (
          <button
            key={user.id}
            type="button"
            onClick={() => handleSelect(user.id)}
            disabled={login.isPending}
            className="flex flex-col items-start gap-1 rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted disabled:opacity-50"
          >
            <span className="font-medium">{user.name}</span>
            <span className="text-sm text-muted-foreground">{t(`roles.${user.role}`)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
