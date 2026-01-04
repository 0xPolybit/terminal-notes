import { useState, useEffect } from 'react';
import { TerminalSquare, FolderTree as FolderIcon, Github, Linkedin } from 'lucide-react';
import { Terminal, initialTerminalState } from '@/components/Terminal';
import { FolderTree } from '@/components/FolderTree';
import { FileEditor } from '@/components/FileEditor';
import { initDB } from '@/lib/fileSystem';

const Index = () => {
  const [viewMode, setViewMode] = useState<'terminal' | 'folder'>('terminal');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dbReady, setDbReady] = useState(false);
  const [terminalState, setTerminalState] = useState(initialTerminalState);

  useEffect(() => {
    initDB().then(() => setDbReady(true));
  }, []);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleFileSelect = (path: string) => {
    setSelectedFile(path);
  };

  if (!dbReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary glow-text animate-pulse">Initializing...</div>
      </div>
    );
  }

  const headerActions = (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <a
          href="https://github.com/0xPolybit/terminal-notes"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Github className="w-5 h-5" />
        </a>
        <a
          href="https://www.linkedin.com/in/polybit/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Linkedin className="w-5 h-5" />
        </a>
      </div>
      <button
        onClick={() => setViewMode(viewMode === 'terminal' ? 'folder' : 'terminal')}
        className="flex items-center gap-2 px-3 py-1 rounded-lg bg-secondary/50 border border-border hover:bg-secondary hover:border-primary/50 transition-all text-xs"
      >
        {viewMode === 'terminal' ? (
          <>
            <FolderIcon className="w-3 h-3 text-primary" />
            <span>Folder View</span>
          </>
        ) : (
          <>
            <TerminalSquare className="w-3 h-3 text-primary" />
            <span>Terminal</span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <main className="h-screen bg-background p-4 md:p-8 flex flex-col">
      <section className="flex-1 min-h-0">
        {viewMode === 'terminal' ? (
          <Terminal 
            onRefresh={handleRefresh} 
            terminalState={terminalState} 
            setTerminalState={setTerminalState} 
            headerActions={headerActions}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
            <div className="terminal-window md:col-span-1 flex flex-col">
              <div className="terminal-header justify-between">
                <div className="flex items-center gap-2">
                  <div className="terminal-dot bg-destructive" />
                  <div className="terminal-dot bg-yellow-500" />
                  <div className="terminal-dot bg-green-500" />
                  <span className="ml-4 text-sm text-muted-foreground">Explorer</span>
                </div>
                {headerActions}
              </div>
              <div className="flex-1 overflow-hidden">
                <FolderTree
                  onFileSelect={handleFileSelect}
                  selectedFile={selectedFile}
                  refreshKey={refreshKey}
                />
              </div>
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
