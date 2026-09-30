import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Moon, Sun, Search, LogOut, UserRound, Wrench } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@mekong-erp/ui';
import { DEMO_USERS } from '@mekong-erp/contract';
import { useLogin, useLogout, useSession } from '../../features/auth/queries';
import { useUiStore } from '../../shared/store/ui-store';
import { DemoToolsDialog } from './demo-tools-dialog';

export function Topbar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data } = useSession();
  const login = useLogin();
  const logout = useLogout();
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const setCommandPaletteOpen = useUiStore((state) => state.setCommandPaletteOpen);
  const [demoToolsOpen, setDemoToolsOpen] = useState(false);

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => {
        void navigate({ to: '/login' });
      },
    });
  }

  const otherUsers = DEMO_USERS.filter((user) => user.id !== data?.user?.id);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4">
      <button
        type="button"
        onClick={() => setCommandPaletteOpen(true)}
        className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
      >
        <Search className="h-4 w-4" />
        <span>{t('commandPalette.trigger')}</span>
        <kbd className="ml-4 rounded border border-border px-1.5 text-xs">Ctrl K</kbd>
      </button>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')}
          aria-label={t('commandPalette.toggleLanguage')}
          data-testid="language-toggle"
        >
          {i18n.language === 'vi' ? 'EN' : 'VI'}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={t('commandPalette.toggleTheme')}
          data-testid="theme-toggle"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('auth.userMenu')}
              data-testid="user-menu-trigger"
            >
              <UserRound className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              {data?.user?.name}
              <div className="text-xs font-normal text-muted-foreground">
                {data?.user ? t(`roles.${data.user.role}`) : null}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t('auth.switchUser')}</DropdownMenuLabel>
            {otherUsers.map((user) => (
              <DropdownMenuItem key={user.id} onSelect={() => login.mutate(user.id)}>
                {user.name} — {t(`roles.${user.role}`)}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setDemoToolsOpen(true)} data-testid="demo-tools-item">
              <Wrench className="mr-2 h-4 w-4" />
              {t('demoTools.menuItem')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              {t('auth.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <DemoToolsDialog open={demoToolsOpen} onOpenChange={setDemoToolsOpen} />
    </header>
  );
}
