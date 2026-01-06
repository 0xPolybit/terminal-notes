import { openDB, IDBPDatabase } from 'idb';

export interface FileSystemItem {
  path: string;
  name: string;
  type: 'file' | 'folder';
  content: string;
  parentPath: string;
  createdAt: number;
  updatedAt: number;
}

let db: IDBPDatabase | null = null;

export async function initDB(): Promise<IDBPDatabase> {
  if (db) return db;
  
  db = await openDB('terminal-notes-fs', 1, {
    upgrade(database) {
      const store = database.createObjectStore('files', { keyPath: 'path' });
      store.createIndex('parentPath', 'parentPath');
    },
  });
  
  // Create root folder if it doesn't exist
  const root = await db.get('files', '/');
  if (!root) {
    await db.put('files', {
      path: '/',
      name: '/',
      type: 'folder',
      content: '',
      parentPath: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
  
  return db;
}

export async function getItem(path: string): Promise<FileSystemItem | undefined> {
  const database = await initDB();
  return database.get('files', path);
}

export async function listDirectory(path: string): Promise<FileSystemItem[]> {
  const database = await initDB();
  const tx = database.transaction('files', 'readonly');
  const store = tx.objectStore('files');
  const index = store.index('parentPath');
  const items: FileSystemItem[] = await index.getAll(path);
  await tx.done;
  return items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function createFolder(path: string, name: string): Promise<FileSystemItem> {
  const database = await initDB();
  const fullPath = path === '/' ? `/${name}` : `${path}/${name}`;
  
  const existing = await database.get('files', fullPath);
  if (existing) {
    throw new Error(`Folder already exists: ${name}`);
  }
  
  const item: FileSystemItem = {
    path: fullPath,
    name,
    type: 'folder',
    content: '',
    parentPath: path,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  await database.put('files', item);
  return item;
}

export async function createFile(path: string, name: string, content = ''): Promise<FileSystemItem> {
  const database = await initDB();
  const fullPath = path === '/' ? `/${name}` : `${path}/${name}`;
  
  const existing = await database.get('files', fullPath);
  if (existing) {
    throw new Error(`File already exists: ${name}`);
  }
  
  const item: FileSystemItem = {
    path: fullPath,
    name,
    type: 'file',
    content,
    parentPath: path,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  await database.put('files', item);
  return item;
}

export async function updateFile(path: string, content: string): Promise<FileSystemItem> {
  const database = await initDB();
  const item = await database.get('files', path) as FileSystemItem | undefined;
  
  if (!item) {
    throw new Error(`File not found: ${path}`);
  }
  
  if (item.type !== 'file') {
    throw new Error(`Cannot edit a folder: ${path}`);
  }
  
  const updated: FileSystemItem = {
    ...item,
    content,
    updatedAt: Date.now(),
  };
  
  await database.put('files', updated);
  return updated;
}

export async function deleteItem(path: string): Promise<void> {
  const database = await initDB();
  const item = await database.get('files', path) as FileSystemItem | undefined;
  
  if (!item) {
    throw new Error(`Not found: ${path}`);
  }
  
  if (path === '/') {
    throw new Error('Cannot delete root folder');
  }
  
  // If folder, delete all children recursively
  if (item.type === 'folder') {
    const children = await listDirectory(path);
    for (const child of children) {
      await deleteItem(child.path);
    }
  }
  
  await database.delete('files', path);
}

export async function getAllItems(): Promise<FileSystemItem[]> {
  const database = await initDB();
  return database.getAll('files');
}

export async function moveItem(sourcePath: string, destPath: string): Promise<void> {
  const database = await initDB();
  const source = await database.get('files', sourcePath) as FileSystemItem | undefined;
  
  if (!source) throw new Error(`Source not found: ${sourcePath}`);
  if (sourcePath === '/') throw new Error('Cannot move root directory');

  // Handle destination
  let finalDestPath = destPath;
  const destItem = await database.get('files', destPath) as FileSystemItem | undefined;

  // If destination is a folder, move into it
  if (destItem?.type === 'folder') {
    finalDestPath = destPath === '/' ? `/${source.name}` : `${destPath}/${source.name}`;
  }
  // If destination exists and is a file, fail (or we could overwrite)
  else if (destItem) {
    throw new Error(`Destination already exists: ${destPath}`);
  }

  // Circular check
  if (source.type === 'folder' && (finalDestPath === sourcePath || finalDestPath.startsWith(sourcePath + '/'))) {
    throw new Error('Cannot move directory into itself');
  }

  // Calculate changes
  const parentPath = finalDestPath.substring(0, finalDestPath.lastIndexOf('/')) || '/';
  const name = finalDestPath.split('/').pop() || source.name;

  // Move the item itself
  await database.put('files', {
    ...source,
    path: finalDestPath,
    parentPath,
    name,
    updatedAt: Date.now(),
  });

  // If it's a folder, move all children
  if (source.type === 'folder') {
    const allItems = await database.getAll('files') as FileSystemItem[];
    const children = allItems.filter(item => item.path.startsWith(sourcePath + '/'));
    
    for (const child of children) {
      const suffix = child.path.substring(sourcePath.length);
      const newChildPath = finalDestPath + suffix;
      const newChildParent = newChildPath.substring(0, newChildPath.lastIndexOf('/')) || '/';
      
      await database.put('files', {
        ...child,
        path: newChildPath,
        parentPath: newChildParent,
        updatedAt: Date.now(),
      });
      await database.delete('files', child.path);
    }
  }

  // Remove old item
  await database.delete('files', sourcePath);
}

export async function copyItem(sourcePath: string, destPath: string): Promise<void> {
  const database = await initDB();
  const source = await database.get('files', sourcePath) as FileSystemItem | undefined;
  
  if (!source) throw new Error(`Source not found: ${sourcePath}`);
  if (sourcePath === '/') throw new Error('Cannot copy root directory');

  // Handle destination
  let finalDestPath = destPath;
  const destItem = await database.get('files', destPath) as FileSystemItem | undefined;

  if (destItem?.type === 'folder') {
    finalDestPath = destPath === '/' ? `/${source.name}` : `${destPath}/${source.name}`;
  } else if (destItem) {
    throw new Error(`Destination already exists: ${destPath}`);
  }

  if (source.type === 'folder' && (finalDestPath === sourcePath || finalDestPath.startsWith(sourcePath + '/'))) {
    throw new Error('Cannot copy directory into itself');
  }

  // Copy the item
  const parentPath = finalDestPath.substring(0, finalDestPath.lastIndexOf('/')) || '/';
  const name = finalDestPath.split('/').pop() || source.name;

  await database.put('files', {
    ...source,
    path: finalDestPath,
    parentPath,
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // If folder, copy children
  if (source.type === 'folder') {
    const allItems = await database.getAll('files') as FileSystemItem[];
    const children = allItems.filter(item => item.path.startsWith(sourcePath + '/'));
    
    for (const child of children) {
      const suffix = child.path.substring(sourcePath.length);
      const newChildPath = finalDestPath + suffix;
      const newChildParent = newChildPath.substring(0, newChildPath.lastIndexOf('/')) || '/';
      
      await database.put('files', {
        ...child,
        path: newChildPath,
        parentPath: newChildParent,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }
}

export function resolvePath(currentPath: string, targetPath: string): string {
  if (targetPath.startsWith('/')) {
    return normalizePath(targetPath);
  }
  
  const parts = currentPath === '/' ? [] : currentPath.split('/').filter(Boolean);
  const targetParts = targetPath.split('/').filter(Boolean);
  
  for (const part of targetParts) {
    if (part === '..') {
      parts.pop();
    } else if (part !== '.') {
      parts.push(part);
    }
  }
  
  return '/' + parts.join('/') || '/';
}

function normalizePath(path: string): string {
  const parts = path.split('/').filter(Boolean);
  const result: string[] = [];
  
  for (const part of parts) {
    if (part === '..') {
      result.pop();
    } else if (part !== '.') {
      result.push(part);
    }
  }
  
  return '/' + result.join('/') || '/';
}
