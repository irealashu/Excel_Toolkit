import React, { useCallback, useEffect, useState } from 'react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { CommandPalette } from './components/navigation/CommandPalette';
import { HomePage } from './pages/HomePage';
import { ToolsPage } from './pages/ToolsPage';
import { ToolPage } from './pages/ToolPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { FormatSupportPage } from './pages/FormatSupportPage';
import { SpreadsheetEditor } from './components/spreadsheet/SpreadsheetEditor';
import { TemplatesWorkspace } from './components/tools/TemplatesWorkspace';
import { SecurityWorkspace } from './components/tools/SecurityWorkspace';
import { getToolBySlug } from './registry/toolRegistry';
import { ToolDefinition } from './registry/types';
import { useTheme } from './hooks/useTheme';

type AppRoute =
  | { view: 'home' }
  | { view: 'tools'; category: string }
  | { view: 'editor' }
  | { view: 'templates' }
  | { view: 'security' }
  | { view: 'privacy' }
  | { view: 'format-support' }
  | { view: 'tool'; slug: string };

function parseHashToRoute(hash: string): AppRoute {
  const cleaned = hash.replace(/^#\/?/, '').trim();
  if (!cleaned || cleaned === 'home') return { view: 'home' };
  if (cleaned === 'editor') return { view: 'editor' };
  if (cleaned === 'templates') return { view: 'templates' };
  if (cleaned === 'security') return { view: 'security' };
  if (cleaned === 'privacy') return { view: 'privacy' };
  if (cleaned === 'formats' || cleaned === 'format-support') return { view: 'format-support' };
  if (cleaned === 'tools') return { view: 'tools', category: 'all' };
  if (cleaned.startsWith('category/')) {
    return { view: 'tools', category: cleaned.slice('category/'.length) || 'all' };
  }
  if (cleaned.startsWith('tool/')) {
    const slug = cleaned.slice('tool/'.length);
    if (getToolBySlug(slug)) return { view: 'tool', slug };
  }
  return { view: 'home' };
}

function routeToHash(route: AppRoute): string {
  switch (route.view) {
    case 'home':
      return '#/';
    case 'editor':
      return '#/editor';
    case 'templates':
      return '#/templates';
    case 'security':
      return '#/security';
    case 'privacy':
      return '#/privacy';
    case 'format-support':
      return '#/formats';
    case 'tools':
      return route.category && route.category !== 'all' ? `#/category/${route.category}` : '#/tools';
    case 'tool':
      return `#/tool/${route.slug}`;
  }
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [route, setRoute] = useState<AppRoute>(() => parseHashToRoute(window.location.hash));
  const [searchOpen, setSearchOpen] = useState(false);

  // Sync browser Back/Forward hash navigation
  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHashToRoute(window.location.hash));
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Global Cmd+K / Ctrl+K toggle for CommandPalette
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const pushRoute = useCallback((next: AppRoute) => {
    setRoute(next);
    const nextHash = routeToHash(next);
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const handleNavigate = useCallback(
    (tab: string, arg?: string) => {
      switch (tab) {
        case 'home':
          pushRoute({ view: 'home' });
          break;
        case 'tools':
          pushRoute({ view: 'tools', category: 'all' });
          break;
        case 'category':
          pushRoute({ view: 'tools', category: arg || 'all' });
          break;
        case 'editor':
          pushRoute({ view: 'editor' });
          break;
        case 'templates':
          pushRoute({ view: 'templates' });
          break;
        case 'security':
          pushRoute({ view: 'security' });
          break;
        case 'privacy':
          pushRoute({ view: 'privacy' });
          break;
        case 'format-support':
          pushRoute({ view: 'format-support' });
          break;
        default:
          pushRoute({ view: 'home' });
      }
    },
    [pushRoute]
  );

  const handleSelectTool = useCallback(
    (tool: ToolDefinition) => {
      if (tool.id === 'spreadsheet-editor') {
        pushRoute({ view: 'editor' });
      } else if (tool.id === 'spreadsheet-templates') {
        pushRoute({ view: 'templates' });
      } else if (tool.id === 'security-inspector') {
        pushRoute({ view: 'security' });
      } else {
        pushRoute({ view: 'tool', slug: tool.slug });
      }
    },
    [pushRoute]
  );

  const activeTool = route.view === 'tool' ? getToolBySlug(route.slug) : undefined;
  const activeCategory = route.view === 'tools' ? route.category : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-[#0b0f14] text-slate-900 dark:text-slate-100 transition-colors">
      <Header
        activeRoute={route.view}
        activeCategory={activeCategory}
        onNavigate={handleNavigate}
        onOpenSearch={() => setSearchOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {route.view === 'home' && (
          <HomePage onNavigate={handleNavigate} onSelectTool={handleSelectTool} />
        )}

        {route.view === 'tools' && (
          <ToolsPage
            initialCategory={route.category}
            onSelectTool={handleSelectTool}
            onCategoryChange={(cat) => pushRoute({ view: 'tools', category: cat })}
          />
        )}

        {route.view === 'editor' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Browser Spreadsheet Editor
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Recursive formula engine, multi-sheet workbooks, undo/redo history, formatting toolbar, and clean .xlsx export.
              </p>
            </div>
            <SpreadsheetEditor />
          </div>
        )}

        {route.view === 'templates' && (
          <div className="space-y-6">
            <div className="space-y-1 border-b border-slate-200 dark:border-slate-800 pb-5">
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Spreadsheet Template Vault
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Ready-to-download starter models for Finance, Operations, Project Scheduling, HR, and Sales.
              </p>
            </div>
            <TemplatesWorkspace />
          </div>
        )}

        {route.view === 'security' && (
          <div className="space-y-6">
            <div className="space-y-1 border-b border-slate-200 dark:border-slate-800 pb-5">
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Workbook Security &amp; Macro Inspector
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Safely audit OpenXML packages, hidden worksheets, author metadata, and compiled VBA binaries locally.
              </p>
            </div>
            <SecurityWorkspace />
          </div>
        )}

        {route.view === 'privacy' && <PrivacyPage />}

        {route.view === 'format-support' && <FormatSupportPage />}

        {route.view === 'tool' && activeTool && (
          <ToolPage tool={activeTool} onNavigate={handleNavigate} onSelectTool={handleSelectTool} />
        )}
      </main>

      <Footer onNavigate={handleNavigate} />

      <CommandPalette
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectTool={handleSelectTool}
      />
    </div>
  );
}
