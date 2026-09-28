import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Sun, Languages } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@mekong-erp/ui';
import { useUiStore } from '../../shared/store/ui-store';
import { Can } from '../../shared/permissions/can';
import { NAV_ITEMS } from './nav-items';

export function CommandPalette() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const open = useUiStore((state) => state.commandPaletteOpen);
  const setOpen = useUiStore((state) => state.setCommandPaletteOpen);
  const toggleTheme = useUiStore((state) => state.toggleTheme);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setOpen(!open);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, setOpen]);

  function runAndClose(action: () => void) {
    action();
    setOpen(false);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t('commandPalette.placeholder')} />
      <CommandList>
        <CommandEmpty>{t('commandPalette.empty')}</CommandEmpty>
        <CommandGroup heading={t('commandPalette.groupNav')}>
          {NAV_ITEMS.map((item) => (
            <Can key={item.to} permission={item.permission}>
              <CommandItem onSelect={() => runAndClose(() => void navigate({ to: item.to }))}>
                <item.icon className="h-4 w-4" />
                {t(item.labelKey)}
              </CommandItem>
            </Can>
          ))}
        </CommandGroup>
        <CommandGroup heading={t('commandPalette.groupSettings')}>
          <CommandItem onSelect={() => runAndClose(toggleTheme)}>
            <Sun className="h-4 w-4" />
            {t('commandPalette.toggleTheme')}
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runAndClose(() => void i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi'))
            }
          >
            <Languages className="h-4 w-4" />
            {t('commandPalette.toggleLanguage')}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
