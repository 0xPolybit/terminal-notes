import { useRef, useEffect, KeyboardEvent } from 'react';
import {
  listDirectory,
  createFolder,
  createFile,
  deleteItem,
  getItem,
  updateFile,
  resolvePath,
} from '@/lib/fileSystem';

interface OutputLine {
  type: 'command' | 'output' | 'error' | 'success' | 'info';
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
}

export const initialTerminalState: TerminalState = {
  currentPath: '/',
  inputValue: '',
  history: [
    { type: 'info', content: 'Welcome to TermNotes v1.0' },
    { type: 'info', content: 'Type "help" for available commands.' },
    { type: 'info', content: 'Use "edit <file>" then Ctrl+C to append or Ctrl+Z to overwrite.' },
    { type: 'output', content: '' },
  ],
  commandHistory: [],
  historyIndex: -1,
  editingFile: null,
  editContent: '',
};

export function Terminal({ onRefresh, terminalState, setTerminalState }: TerminalProps) {
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
            { type: 'output', content: '  edit <file>   - Edit (Ctrl+C=append, Ctrl+Z=overwrite)' },
            { type: 'output', content: '  rm <path>     - Remove file or folder' },
            { type: 'output', content: '  clear         - Clear terminal' },
            { type: 'output', content: '' },
          ]);
          break;

        case 'pwd':
          addOutput([{ type: 'output', content: currentPath }, { type: 'output', content: '' }]);
          break;

        case 'ls': {
          const items = await listDirectory(currentPath);
          if (items.length === 0) {
            addOutput([{ type: 'output', content: '(empty)' }, { type: 'output', content: '' }]);
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
              addOutput([{ type: 'info', content: `Editing ${args[0]}... (Ctrl+C=append, Ctrl+Z=overwrite, Esc=cancel)` }]);
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
        const item = await getItem(editingFile);
        const newContent = (item?.content || '') + editContent;
        await updateFile(editingFile, newContent);
        addOutput([{ type: 'success', content: `Appended to: ${editingFile}` }]);
        updateState({ editingFile: null, editContent: '' });
        onRefresh?.();
      }
    } else if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      if (editingFile) {
        await updateFile(editingFile, editContent);
        addOutput([{ type: 'success', content: `Overwritten: ${editingFile}` }]);
        updateState({ editingFile: null, editContent: '' });
        onRefresh?.();
      }
    }
  };

  return (
    <div className="terminal-window h-full flex flex-col" onClick={focusInput}>
      <div className="terminal-header">
        <div className="terminal-dot bg-destructive" />
        <div className="terminal-dot bg-yellow-500" />
        <div className="terminal-dot bg-green-500" />
        <span className="ml-4 text-sm text-muted-foreground">TermNotes — {currentPath}</span>
      </div>
      
      <div ref={bodyRef} className="terminal-body flex-1 scrollbar-thin">
        {history.map((line, i) => (
          <div key={i} className="terminal-line">
            {line.type === 'command' && (
              <>
                <span className="terminal-prompt">{line.path || currentPath} $</span>
                <span className="text-foreground">{line.content}</span>
              </>
            )}
            {line.type === 'output' && <span className="terminal-output">{line.content}</span>}
            {line.type === 'error' && <span className="terminal-error">{line.content}</span>}
            {line.type === 'success' && <span className="terminal-success">{line.content}</span>}
            {line.type === 'info' && <span className="text-primary glow-text">{line.content}</span>}
          </div>
        ))}

        {editingFile ? (
          <div className="mt-2">
            <div className="text-xs text-muted-foreground mb-2">
              Editing: {editingFile} | Ctrl+C = append | Ctrl+Z = overwrite | Esc = cancel
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
            <span className="terminal-prompt">{currentPath} $</span>
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
