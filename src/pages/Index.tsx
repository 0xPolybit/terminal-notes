import { useState, useEffect } from 'react';
import { TerminalSquare, FolderTree as FolderIcon } from 'lucide-react';
import { Terminal } from '@/components/Terminal';
import { FolderTree } from '@/components/FolderTree';
import { FileEditor } from '@/components/FileEditor';
import { initDB } from '@/lib/fileSystem';

const Index = () => {
  const [viewMode, setViewMode] = useState<'terminal' | 'folder'>('terminal');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDB().then(() => setDbReady(true));
  }, []);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleFileSelect = (path: string) => {
    setSelectedFile(path);
    if (viewMode === 'terminal') {
      setViewMode('folder');
    }
  };

  if (!dbReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary glow-text animate-pulse">Initializing...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30 glow-border">
            <TerminalSquare className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground glow-text">TermNotes</h1>
            <p className="text-xs text-muted-foreground">Terminal-style note taking</p>
          </div>
        </div>

        <button
          onClick={() => setViewMode(viewMode === 'terminal' ? 'folder' : 'terminal')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border hover:bg-secondary hover:border-primary/50 transition-all text-sm"
        >
          {viewMode === 'terminal' ? (
            <>
              <FolderIcon className="w-4 h-4 text-primary" />
              <span>Switch to Folder View</span>
            </>
          ) : (
            <>
              <TerminalSquare className="w-4 h-4 text-primary" />
              <span>Switch to Terminal</span>
            </>
          )}
        </button>
      </header>

      <section className="h-[calc(100vh-140px)]">
        {viewMode === 'terminal' ? (
          <Terminal onFileSelect={handleFileSelect} onRefresh={handleRefresh} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
            <div className="terminal-window md:col-span-1">
              <div className="terminal-header">
                <div className="terminal-dot bg-destructive" />
                <div className="terminal-dot bg-yellow-500" />
                <div className="terminal-dot bg-green-500" />
                <span className="ml-4 text-sm text-muted-foreground">Explorer</span>
              </div>
              <FolderTree
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
                refreshKey={refreshKey}
              />
            </div>
            <div className="md:col-span-2 h-full">
              <FileEditor
                filePath={selectedFile}
                onSave={handleRefresh}
                onClose={() => setSelectedFile(null)}
              />
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default Index;
