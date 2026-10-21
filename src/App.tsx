import React, { useState } from 'react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { CommandPalette } from './components/navigation/CommandPalette';
import { HomePage } from './pages/HomePage';
import { ToolsPage } from './pages/ToolsPage';
import { ToolPage } from './pages/ToolPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { FormatSupportPage } from './pages/FormatSupportPage';
import { SpreadsheetEditor } from './components/spreadsheet/SpreadsheetEditor';
import { SecurityWorkspace } from './components/tools/SecurityWorkspace';
import { TemplatesWorkspace } from './components/tools/TemplatesWorkspace';
import { getToolBySlug } from './registry/toolRegistry';
import { ToolDefinition } from './registry/types';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [activeTool, setActiveTool] = useState<ToolDefinition | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const handleNavigate = (tab: string, arg?: string) => {
    if (tab === 'category' && arg) {
      if (arg === 'templates') {
        setActiveTab('templates');
        setActiveTool(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      setCategoryFilter(arg);
      setActiveTab('tools');
      setActiveTool(null);
    } else if (tab === 'editor') {
      setActiveTab('editor');
      setActiveTool(null);
    } else if (tab === 'security') {
      setActiveTab('security');
      setActiveTool(null);
    } else if (tab === 'tools') {
      setCategoryFilter(undefined);
      setActiveTab('tools');
      setActiveTool(null);
    } else {
      setActiveTab(tab);
      setActiveTool(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectTool = (tool: ToolDefinition) => {
    setActiveTool(tool);
    setActiveTab('tool');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <Header
        activeTab={activeTab}
        onNavigate={handleNavigate}
        onOpenSearch={() => setIsCommandPaletteOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'home' && (
          <HomePage onNavigate={handleNavigate} onSelectTool={handleSelectTool} />
        )}

        {activeTab === 'tools' && (
          <ToolsPage initialCategory={categoryFilter} onSelectTool={handleSelectTool} />
        )}

        {activeTab === 'tool' && activeTool && (
          <ToolPage tool={activeTool} onBack={() => handleNavigate('tools')} />
        )}

        {activeTab === 'editor' && (
          <div className="space-y-4 py-4">
            <SpreadsheetEditor />
          </div>
        )}

        {activeTab === 'security' && (
          <div className="py-6">
            <SecurityWorkspace />
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="py-6">
            <TemplatesWorkspace />
          </div>
        )}

        {activeTab === 'privacy' && <PrivacyPage />}

        {activeTab === 'format-support' && <FormatSupportPage />}

        {activeTab === 'about' && <PrivacyPage />}
      </main>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectTool={handleSelectTool}
      />
    </div>
  );
}

export default App;
