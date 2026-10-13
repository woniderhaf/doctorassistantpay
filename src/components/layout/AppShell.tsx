import { NavLink } from 'react-router';
import type { ReactNode } from 'react';
import { CalendarIcon, ChartIcon, GearIcon, HistoryIcon } from '../ui/icons';

const TABS = [
  { to: '/calendar', label: 'Календарь', icon: CalendarIcon },
  { to: '/history', label: 'История', icon: HistoryIcon },
  { to: '/summary', label: 'Итоги', icon: ChartIcon },
  { to: '/settings', label: 'Настройки', icon: GearIcon }
] as const;

function tabClass(isActive: boolean): string {
  return `flex flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors ${
    isActive ? 'text-accent' : 'text-gray-400'
  }`;
}

export function AppShell({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl lg:gap-8 lg:px-8">
      {/* десктоп: сайдбар */}
      <nav className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-1 py-6 lg:flex" aria-label="Основная навигация">
        <h1 className="mb-4 px-3 text-xl font-bold">Учёт смен</h1>
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium ${
                isActive ? 'bg-accent/10 text-accent' : 'text-gray-500 hover:bg-gray-100'
              }`
            }
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* контент */}
      <main className="min-w-0 flex-1 pb-[calc(64px+env(safe-area-inset-bottom))] lg:py-6 lg:pb-6">{children}</main>

      {/* мобила: нижний таб-бар */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200/80 bg-white/90 backdrop-blur
                   pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Основная навигация"
      >
        <div className="mx-auto grid max-w-md grid-cols-4">
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => tabClass(isActive)} end={to === '/history'}>
              <Icon size={22} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
