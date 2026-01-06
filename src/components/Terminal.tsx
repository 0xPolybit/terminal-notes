import { useRef, useEffect, KeyboardEvent } from 'react';
import {
  listDirectory,
  createFolder,
  createFile,
  deleteItem,
  getItem,
  updateFile,
  resolvePath,
  getAllItems,
  moveItem,
  copyItem,
  FileSystemItem,
} from '@/lib/fileSystem';

interface OutputLine {
  type: 'command' | 'output' | 'error' | 'success' | 'info' | 'muted';
  content: string;
  path?: string;
}

interface TerminalState {
  currentPath: string;
  inputValue: string;
  history: OutputLine[];
  commandHistory: string[];
  historyIndex: number;
  editingFile: string | null;
  editContent: string;
}

interface TerminalProps {
  onRefresh?: () => void;
  terminalState: TerminalState;
  setTerminalState: React.Dispatch<React.SetStateAction<TerminalState>>;
  headerActions?: React.ReactNode;
}

export const initialTerminalState: TerminalState = {
  currentPath: '/',
  inputValue: '',
  history: [
    { type: 'info', content: 'Welcome to terminalnotes v1.1' },
    { type: 'output', content: 'Type "help" for available commands.' },
    { type: 'output', content: '' },
  ],
  commandHistory: [],
  historyIndex: -1,
  editingFile: null,
  editContent: '',
};

const formatPath = (path: string) => {
  if (path === '/') return '';
  return path.startsWith('/') ? path.slice(1) : path;
};

const renderContent = (content: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline underline-offset-2 transition-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export function Terminal({ onRefresh, terminalState, setTerminalState, headerActions }: TerminalProps) {
  const { currentPath, inputValue, history, commandHistory, historyIndex, editingFile, editContent } = terminalState;
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [history]);

  const focusInput = () => {
    if (editingFile) {
      textareaRef.current?.focus();
    } else {
      inputRef.current?.focus();
    }
  };

  const updateState = (updates: Partial<TerminalState>) => {
    setTerminalState((prev) => ({ ...prev, ...updates }));
  };

  const addOutput = (lines: OutputLine[]) => {
    setTerminalState((prev) => ({ ...prev, history: [...prev.history, ...lines] }));
  };

  const processCommand = async (command: string) => {
    const trimmed = command.trim();
    if (!trimmed) return;

    setTerminalState((prev) => ({
      ...prev,
      commandHistory: [...prev.commandHistory, trimmed],
      historyIndex: -1,
      history: [...prev.history, { type: 'command', content: trimmed, path: currentPath }],
    }));

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    try {
      switch (cmd) {
        case 'help':
          addOutput([
            { type: 'info', content: 'Available commands:' },
            { type: 'output', content: '  pwd           - Print working directory' },
            { type: 'output', content: '  ls            - List directory contents' },
            { type: 'output', content: '  cd <path>     - Change directory' },
            { type: 'output', content: '  mkdir <name>  - Create a new folder' },
            { type: 'output', content: '  touch <name>  - Create a new file' },
            { type: 'output', content: '  cat <file>    - Display file contents' },
            { type: 'output', content: '  edit <file>   - Edit (Ctrl+C=save, Esc=cancel)' },
            { type: 'output', content: '  grep <query>  - Search in all files' },
            { type: 'output', content: '  cp <src> <dst>- Copy file or folder' },
            { type: 'output', content: '  mv <src> <dst>- Move/Rename file or folder' },
            { type: 'output', content: '  rm <path>     - Remove file or folder' },
            { type: 'output', content: '  tree          - Show directory structure' },
            { type: 'output', content: '  wc <file>     - Word/Char count' },
            { type: 'output', content: '  export [file] - Download note(s)' },
            { type: 'output', content: '  date          - Show time' },
            { type: 'output', content: '  credits       - Show developer information' },
            { type: 'output', content: '  clear         - Clear terminal' },
            { type: 'output', content: '' },
          ]);
          break;

        case 'credits':
          addOutput([
            { type: 'info', content: 'Developer Details:' },
            { type: 'output', content: '  Name:     Swastik Biswas' },
            { type: 'output', content: '  Degree:   B.Tech CSE, KIIT Bhubaneshwar' },
            { type: 'output', content: '  Age:      19 (Born: 1st Oct 2006)' },
            { type: 'output', content: '  GitHub:   https://github.com/0xPolybit' },
            { type: 'output', content: '  LinkedIn: https://www.linkedin.com/in/polybit/' },
            { type: 'output', content: '' },
          ]);
          break;

        case 'pwd':
          addOutput([{ type: 'output', content: currentPath }, { type: 'output', content: '' }]);
          break;

        case 'ls': {
          const items = await listDirectory(currentPath);
          if (items.length === 0) {
            addOutput([{ type: 'muted', content: '(empty)' }, { type: 'output', content: '' }]);
          } else {
            const lines = items.map((item) => ({
              type: 'output' as const,
              content: item.type === 'folder' ? `📁 ${item.name}/` : `📄 ${item.name}`,
            }));
            addOutput([...lines, { type: 'output', content: '' }]);
          }
          break;
        }

        case 'cd': {
          if (args.length === 0) {
            updateState({ currentPath: '/' });
            addOutput([{ type: 'output', content: '' }]);
          } else {
            const targetPath = resolvePath(currentPath, args[0]);
            const item = await getItem(targetPath);
            if (!item) {
              addOutput([{ type: 'error', content: `cd: no such directory: ${args[0]}` }]);
            } else if (item.type !== 'folder') {
              addOutput([{ type: 'error', content: `cd: not a directory: ${args[0]}` }]);
            } else {
              updateState({ currentPath: targetPath });
              addOutput([{ type: 'output', content: '' }]);
            }
          }
          break;
        }

        case 'mkdir': {
          if (args.length === 0) {
            addOutput([{ type: 'error', content: 'mkdir: missing operand' }]);
          } else {
            await createFolder(currentPath, args[0]);
            addOutput([{ type: 'success', content: `Created folder: ${args[0]}` }]);
            onRefresh?.();
          }
          break;
        }

        case 'touch': {
          if (args.length === 0) {
            addOutput([{ type: 'error', content: 'touch: missing operand' }]);
          } else {
            await createFile(currentPath, args[0]);
            addOutput([{ type: 'success', content: `Created file: ${args[0]}` }]);
            onRefresh?.();
          }
          break;
        }

        case 'cat': {
          if (args.length === 0) {
            addOutput([{ type: 'error', content: 'cat: missing operand' }]);
          } else {
            const filePath = resolvePath(currentPath, args[0]);
            const item = await getItem(filePath);
            if (!item) {
              addOutput([{ type: 'error', content: `cat: no such file: ${args[0]}` }]);
            } else if (item.type !== 'file') {
              addOutput([{ type: 'error', content: `cat: is a directory: ${args[0]}` }]);
            } else {
              addOutput([
                { type: 'output', content: item.content || '(empty file)' },
                { type: 'output', content: '' },
              ]);
            }
          }
          break;
        }

        case 'edit': {
          if (args.length === 0) {
            addOutput([{ type: 'error', content: 'edit: missing operand' }]);
          } else {
            const filePath = resolvePath(currentPath, args[0]);
            const item = await getItem(filePath);
            if (!item) {
              addOutput([{ type: 'error', content: `edit: no such file: ${args[0]}` }]);
            } else if (item.type !== 'file') {
              addOutput([{ type: 'error', content: `edit: is a directory: ${args[0]}` }]);
            } else {
              updateState({ editingFile: filePath, editContent: item.content });
              addOutput([{ type: 'info', content: `Editing ${args[0]}... (Ctrl+C=save, Esc=cancel)` }]);
            }
          }
          break;
        }

        case 'rm': {
          if (args.length === 0) {
            addOutput([{ type: 'error', content: 'rm: missing operand' }]);
          } else {
            const targetPath = resolvePath(currentPath, args[0]);
            await deleteItem(targetPath);
            addOutput([{ type: 'success', content: `Removed: ${args[0]}` }]);
            onRefresh?.();
          }
          break;
        }

        case 'grep': {
          if (args.length === 0) {
            addOutput([{ type: 'error', content: 'grep: missing search query' }]);
          } else {
            const query = args.join(' ');
            const allFiles = await getAllItems();
            const matches = allFiles.filter(
              (f) => f.type === 'file' && f.content.toLowerCase().includes(query.toLowerCase())
            );

            if (matches.length === 0) {
              addOutput([{ type: 'output', content: 'No matches found.' }]);
            } else {
              const lines = matches.map((f) => ({
                type: 'output' as const,
                content: `${f.path}: ...found "${query}"...`,
              }));
              addOutput(lines);
            }
          }
          break;
        }

        case 'mv': {
          if (args.length < 2) {
            addOutput([{ type: 'error', content: 'mv: missing source or destination' }]);
          } else {
            const src = resolvePath(currentPath, args[0]);
            const dst = resolvePath(currentPath, args[1]);
            try {
              await moveItem(src, dst);
              addOutput([{ type: 'success', content: `Moved ${args[0]} to ${args[1]}` }]);
              onRefresh?.();
            } catch (e) {
               addOutput([{ type: 'error', content: `mv: ${e instanceof Error ? e.message : 'failed'}` }]);
            }
          }
          break;
        }

        case 'cp': {
          if (args.length < 2) {
            addOutput([{ type: 'error', content: 'cp: missing source or destination' }]);
          } else {
            const src = resolvePath(currentPath, args[0]);
            const dst = resolvePath(currentPath, args[1]);
             try {
              await copyItem(src, dst);
              addOutput([{ type: 'success', content: `Copied ${args[0]} to ${args[1]}` }]);
              onRefresh?.();
             } catch (e) {
               addOutput([{ type: 'error', content: `cp: ${e instanceof Error ? e.message : 'failed'}` }]);
             }
          }
          break;
        }

        case 'tree': {
          const allItems = await getAllItems();
          // Simple tree visualization
          const rootItems = allItems.filter(i => i.parentPath === currentPath);
          // Actually, 'tree' usually shows full recursive tree from current directory.
          // Let's iterate.
          
          const buildTree = (path: string, prefix: string = '') => {
             const items = allItems
                .filter(i => i.parentPath === path)
                .sort((a, b) => (a.type === 'folder' ? -1 : 1));
             
             const lines: OutputLine[] = [];
             items.forEach((item, index) => {
                const isLast = index === items.length - 1;
                const marker = isLast ? '└── ' : '├── ';
                const newPrefix = prefix + (isLast ? '    ' : '│   ');
                
                lines.push({ type: 'output', content: `${prefix}${marker}${item.name}${item.type === 'folder' ? '/' : ''}` });
                
                if (item.type === 'folder') {
                   lines.push(...buildTree(item.path, newPrefix));
                }
             });
             return lines;
          };

          const treeLines = buildTree(currentPath);
          if (treeLines.length === 0) {
              addOutput([{ type: 'muted', content: '(empty directory)' }]);
          } else {
              addOutput([{ type: 'output', content: '.' }, ...treeLines]);
          }
          break;
        }

        case 'wc': {
          if (args.length === 0) {
             addOutput([{ type: 'error', content: 'wc: missing filename' }]);
          } else {
             const filePath = resolvePath(currentPath, args[0]);
             const item = await getItem(filePath);
             if (!item || item.type !== 'file') {
                 addOutput([{ type: 'error', content: `wc: invalid file: ${args[0]}` }]);
             } else {
                 const lines = item.content.split('\n').length;
                 const words = item.content.trim() === '' ? 0 : item.content.trim().split(/\s+/).length;
                 const chars = item.content.length;
                 addOutput([{ type: 'output', content: `  ${lines}  ${words}  ${chars} ${item.name}` }]);
             }
          }
          break;
        }

        case 'export': {
           if (args.length > 0) {
               // Export single file
               const filePath = resolvePath(currentPath, args[0]);
               const item = await getItem(filePath);
               if (!item || item.type !== 'file') {
                   addOutput([{ type: 'error', content: `export: file not found: ${args[0]}` }]);
               } else {
                   const blob = new Blob([item.content], { type: 'text/markdown' });
                   const url = URL.createObjectURL(blob);
                   const a = document.createElement('a');
                   a.href = url;
                   a.download = item.name.endsWith('.md') ? item.name : `${item.name}.md`;
                   a.click();
                   URL.revokeObjectURL(url);
                   addOutput([{ type: 'success', content: `Exported ${item.name}` }]);
               }
           } else {
               // Export all as JSON backup
               const allItems = await getAllItems();
               const blob = new Blob([JSON.stringify(allItems, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `terminal-notes-backup-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
                addOutput([{ type: 'success', content: 'Exported workspace backup' }]);
           }
           break;
        }
        
        case 'date': {
            addOutput([{ type: 'output', content: new Date().toString() }]);
            break;
        }

        case 'clear':
          updateState({ history: [] });
          break;

        default:
          addOutput([{ type: 'error', content: `Command not found: ${cmd}. Type "help" for available commands.` }]);
      }
    } catch (error: unknown) {
      addOutput([{ type: 'error', content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }]);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      processCommand(inputValue);
      updateState({ inputValue: '' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        updateState({
          historyIndex: newIndex,
          inputValue: commandHistory[commandHistory.length - 1 - newIndex] || '',
        });
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        updateState({
          historyIndex: newIndex,
          inputValue: commandHistory[commandHistory.length - 1 - newIndex] || '',
        });
      } else {
        updateState({ historyIndex: -1, inputValue: '' });
      }
    }
  };

  const handleEditKeyDown = async (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      updateState({ editingFile: null, editContent: '' });
      addOutput([{ type: 'info', content: 'Edit cancelled.' }]);
    } else if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      if (editingFile) {
        await updateFile(editingFile, editContent);
        addOutput([{ type: 'success', content: `Saved: ${editingFile}` }]);
        updateState({ editingFile: null, editContent: '' });
        onRefresh?.();
      }
    }
  };

  return (
    <div className="terminal-window h-full flex flex-col" onClick={focusInput}>
      <div className="terminal-header justify-between">
        <div className="flex items-center gap-2">
          <div className="terminal-dot bg-destructive" />
          <div className="terminal-dot bg-yellow-500" />
          <div className="terminal-dot bg-green-500" />
          <span className="ml-4 text-sm text-muted-foreground">terminalnotes — {currentPath}</span>
        </div>
        {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
      </div>
      
      <div ref={bodyRef} className="terminal-body flex-1 scrollbar-thin">
        {history.map((line, i) => (
          <div key={i} className="terminal-line">
            {line.type === 'command' && (
              <>
                <span className="terminal-prompt">{formatPath(line.path || currentPath)} $</span>
                <span className="text-foreground">{line.content}</span>
              </>
            )}
            {line.type === 'output' && <span className="terminal-output">{renderContent(line.content)}</span>}
            {line.type === 'muted' && <span className="text-terminal-text whitespace-pre-wrap">{renderContent(line.content)}</span>}
            {line.type === 'error' && <span className="terminal-error">{renderContent(line.content)}</span>}
            {line.type === 'success' && <span className="terminal-success">{renderContent(line.content)}</span>}
            {line.type === 'info' && <span className="text-primary glow-text">{renderContent(line.content)}</span>}
          </div>
        ))}

        {editingFile ? (
          <div className="mt-2">
            <div className="text-xs text-muted-foreground mb-2">
              Editing: {editingFile} | Ctrl+C = save | Esc = cancel
            </div>
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => updateState({ editContent: e.target.value })}
              onKeyDown={handleEditKeyDown}
              className="w-full h-48 bg-muted/30 border border-border rounded p-2 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
              placeholder="Type your content here..."
            />
          </div>
        ) : (
          <div className="terminal-line">
            <span className="terminal-prompt">{formatPath(currentPath)} $</span>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => updateState({ inputValue: e.target.value })}
              onKeyDown={handleKeyDown}
              className="terminal-input"
              autoFocus
            />
          </div>
        )}
      </div>
    </div>
  );
}
