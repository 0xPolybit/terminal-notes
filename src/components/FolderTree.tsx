import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FileText } from 'lucide-react';
import { listDirectory, FileSystemItem, getAllItems } from '@/lib/fileSystem';
import { cn } from '@/lib/utils';

interface FolderTreeProps {
  onFileSelect: (path: string) => void;
  selectedFile: string | null;
  refreshKey: number;
}

interface TreeNodeProps {
  item: FileSystemItem;
  level: number;
  onFileSelect: (path: string) => void;
  selectedFile: string | null;
  allItems: FileSystemItem[];
}

function TreeNode({ item, level, onFileSelect, selectedFile, allItems }: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(level === 0);
  
  const children = allItems.filter((i) => i.parentPath === item.path);
  const hasChildren = children.length > 0;

  const handleClick = () => {
    if (item.type === 'folder') {
      setIsOpen(!isOpen);
    } else {
      onFileSelect(item.path);
    }
  };

  return (
    <div>
      <div
        className={cn(
          'folder-tree-item',
          selectedFile === item.path && 'active',
          item.type === 'file' && 'pl-6'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {item.type === 'folder' && (
          <span className="text-muted-foreground">
            {hasChildren ? (
              isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4 opacity-0" />
            )}
          </span>
        )}
        {item.type === 'folder' ? (
          <Folder className="w-4 h-4 text-primary" />
        ) : (
          <FileText className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="truncate text-sm">{item.name}</span>
      </div>
      
      {item.type === 'folder' && isOpen && (
        <div>
          {children.map((child) => (
            <TreeNode
              key={child.path}
              item={child}
              level={level + 1}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
              allItems={allItems}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({ onFileSelect, selectedFile, refreshKey }: FolderTreeProps) {
  const [items, setItems] = useState<FileSystemItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadItems = async () => {
      setLoading(true);
      const allItems = await getAllItems();
      setItems(allItems);
      setLoading(false);
    };
    loadItems();
  }, [refreshKey]);

  const rootItem = items.find((i) => i.path === '/');

  if (loading) {
    return (
      <div className="p-4 text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto scrollbar-thin">
      <div className="p-2">
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider px-2 mb-2">
          File Explorer
        </h3>
        {rootItem && (
          <TreeNode
            item={rootItem}
            level={0}
            onFileSelect={onFileSelect}
            selectedFile={selectedFile}
            allItems={items}
          />
        )}
      </div>
    </div>
  );
}
