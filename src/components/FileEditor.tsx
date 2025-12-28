import { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { getItem, updateFile, FileSystemItem } from '@/lib/fileSystem';

interface FileEditorProps {
  filePath: string | null;
  onSave?: () => void;
  onClose?: () => void;
}

export function FileEditor({ filePath, onSave, onClose }: FileEditorProps) {
  const [content, setContent] = useState('');
  const [file, setFile] = useState<FileSystemItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const loadFile = async () => {
      if (!filePath) {
        setFile(null);
        setContent('');
        return;
      }

      setLoading(true);
      const item = await getItem(filePath);
      if (item && item.type === 'file') {
        setFile(item);
        setContent(item.content);
        setHasChanges(false);
      }
      setLoading(false);
    };
    loadFile();
  }, [filePath]);

  const handleSave = async () => {
    if (file && hasChanges) {
      await updateFile(file.path, content);
      setHasChanges(false);
      onSave?.();
    }
  };

  const handleChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  if (!filePath) {
    return (
      <div className="editor-container flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-lg mb-2">No file selected</p>
          <p className="text-sm">Select a file from the tree to edit</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="editor-container flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="editor-container flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground">{file?.name}</span>
          {hasChanges && <span className="text-xs text-primary">• Unsaved</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Save (Ctrl+S)"
          >
            <Save className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-destructive transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 p-4 bg-transparent resize-none focus:outline-none text-foreground placeholder:text-muted-foreground scrollbar-thin"
        placeholder="Start typing..."
      />
    </div>
  );
}
