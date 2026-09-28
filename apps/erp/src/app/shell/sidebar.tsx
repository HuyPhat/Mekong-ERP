import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@mekong-erp/ui';
import { useUiStore } from '../../shared/store/ui-store';
import { Can } from '../../shared/permissions/can';
import { NAV_ITEMS } from './nav-items';

export function Sidebar() {
  const { t } = useTranslation();
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-border bg-background transition-all',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        {!collapsed && <span className="font-semibold">{t('app.name')}</span>}
        <button
          type="button"
          onClick={toggleSidebar}
          className="rounded-md p-1.5 hover:bg-muted"
          aria-label="Toggle sidebar"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {NAV_ITEMS.map((item) => (
          <Can key={item.to} permission={item.permission}>
            <Link
              to={item.to}
              activeOptions={{ exact: item.to === '/' }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
              activeProps={{ className: 'bg-muted font-medium' }}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{t(item.labelKey)}</span>}
            </Link>
          </Can>
        ))}
      </nav>
    </aside>
  );
}
