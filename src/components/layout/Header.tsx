import React, { useState } from 'react';
import { Grid3X3, Search, Sun, Moon, Menu, X } from 'lucide-react';
import { Theme } from '../../hooks/useTheme';

interface HeaderProps {
  activeRoute: string;
  activeCategory?: string;
  onNavigate: (tab: string, arg?: string) => void;
  onOpenSearch: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

const NAV_ITEMS = [
  { id: 'tools', label: 'Directory', tab: 'tools', arg: undefined },
  { id: 'editor', label: 'Editor', tab: 'editor', arg: undefined },
  { id: 'converters', label: 'Converters', tab: 'category', arg: 'converters' },
  { id: 'cleaning', label: 'Cleaning', tab: 'category', arg: 'cleaning' },
  { id: 'templates', label: 'Templates', tab: 'templates', arg: undefined },
];

export const Header: React.FC<HeaderProps> = ({
  activeRoute,
  activeCategory,
  onNavigate,
  onOpenSearch,
  theme,
  onToggleTheme,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isNavItemActive = (item: (typeof NAV_ITEMS)[number]) => {
    if (item.id === 'tools') return activeRoute === 'tools' && (!activeCategory || activeCategory === 'all');
    if (item.id === 'converters') return activeRoute === 'tools' && activeCategory === 'converters';
    if (item.id === 'cleaning') return activeRoute === 'tools' && activeCategory === 'cleaning';
    return activeRoute === item.id;
  };

  const handleNavClick = (tab: string, arg?: string) => {
    onNavigate(tab, arg);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0e131a]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Clean single-line brand wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2.5 text-slate-900 dark:text-white hover:opacity-85 transition-opacity whitespace-nowrap shrink-0"
          aria-label="Excel Toolkit Home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Grid3X3 className="h-4 w-4 stroke-[2.2]" />
          </span>
          <span className="font-display text-base font-bold tracking-tight">Excel Toolkit</span>
        </button>

        {/* Zone 2: 5 concise single-line text nav links */}
        <nav aria-label="Primary Navigation" className="hidden md:flex items-center gap-7">
          {NAV_ITEMS.map((item) => {
            const active = isNavItemActive(item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.tab, item.arg)}
                className={`relative py-5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-600 dark:bg-emerald-400" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Search, Theme, Primary Action / Mobile Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            aria-label="Search tools (Command+K)"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden lg:inline-block font-mono text-[11px] text-slate-400 dark:text-slate-500">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('editor')}
            className="hidden sm:inline-flex h-9 items-center rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 px-4 text-xs font-semibold text-white dark:text-slate-950 transition-colors whitespace-nowrap shrink-0"
          >
            Open Editor
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex md:hidden h-10 w-10 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0e131a] px-4 py-3 space-y-1"
        >
          {NAV_ITEMS.map((item) => {
            const active = isNavItemActive(item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.tab, item.arg)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => handleNavClick('security')}
              className="flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Security Inspector
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('format-support')}
              className="flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Format Support
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('privacy')}
              className="flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Privacy Architecture
            </button>
          </div>
        </nav>
      )}
    </header>
  );
};
