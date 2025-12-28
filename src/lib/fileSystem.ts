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
