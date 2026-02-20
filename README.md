# terminalnotes

A terminal-style note-taking application that runs entirely in the browser. Create, organize, and manage notes using familiar Unix-like commands through a simulated terminal interface -- or switch to a graphical folder/editor view when you prefer a GUI. All data is persisted locally in IndexedDB; no server, no account, no telemetry.

---

## Table of Contents

- [Features](#features)
- [Terminal Commands](#terminal-commands)
- [Technical Architecture](#technical-architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

---

## Features

### Terminal Interface
- Full command-line experience rendered in-browser with a monospaced (Space Mono) font, blinking cursor, and colored prompt.
- Command history navigation with Arrow Up / Arrow Down.
- Inline URL detection and rendering as clickable links.

### Virtual File System
- Hierarchical file and folder system backed by IndexedDB (via the `idb` library).
- Supports creating, reading, editing, moving, copying, and deleting files and folders.
- Path resolution handles relative paths (`.`, `..`) the same way a real shell does.
- Recursive operations: deleting or copying a folder applies to its entire subtree.

### Dual View Modes
- **Terminal mode** -- interact with your notes purely through CLI commands.
- **Folder mode** -- a graphical file explorer sidebar with a text editor pane. Click files to open them; save with `Ctrl+S`.
- Toggle between the two modes with a single button in the header.

### In-Terminal Editor
- The `edit` command opens an inline textarea inside the terminal.
- `Ctrl+C` saves the buffer; `Esc` discards changes.

### GUI Editor
- Full-height textarea with unsaved-change indicator.
- Keyboard shortcut `Ctrl+S` to save.

### Export & Backup
- `export <file>` downloads a single note as a `.md` file.
- `export` (no arguments) downloads the entire workspace as a timestamped JSON backup.

### Grep / Search
- `grep <query>` performs a case-insensitive full-text search across every file in the workspace and reports matching paths.

### Word Count
- `wc <file>` prints line, word, and character counts -- matching the output style of the Unix `wc` utility.

### Tree View
- `tree` prints a recursive directory tree from the current working directory using standard box-drawing characters.

### Dark Terminal Aesthetic
- Custom CSS variables define a dark palette with an orange (`hsl(17 100% 56%)`) accent color and glow effects on borders and text.
- Thin custom scrollbars styled to match the theme.

---

## Terminal Commands

| Command | Description |
|---|---|
| `help` | List all available commands |
| `pwd` | Print working directory |
| `ls` | List directory contents |
| `cd <path>` | Change directory (supports `.`, `..`, absolute paths) |
| `mkdir <name>` | Create a new folder |
| `touch <name>` | Create a new empty file |
| `cat <file>` | Print file contents |
| `edit <file>` | Open inline editor (`Ctrl+C` = save, `Esc` = cancel) |
| `grep <query>` | Search all files for a string |
| `cp <src> <dst>` | Copy a file or folder |
| `mv <src> <dst>` | Move or rename a file or folder |
| `rm <path>` | Remove a file or folder (recursive for folders) |
| `tree` | Display directory tree from current path |
| `wc <file>` | Line, word, and character count |
| `export [file]` | Download a single file as `.md`, or entire workspace as JSON |
| `date` | Print the current date and time |
| `credits` | Show developer information |
| `clear` | Clear the terminal output |

---

## Technical Architecture

### Overview

The application is a single-page React app built with Vite. There is no backend -- all persistence is handled client-side in IndexedDB. Routing is provided by React Router (with a catch-all 404 page), though the app currently exposes a single route (`/`).

### Data Layer -- `src/lib/fileSystem.ts`

A complete virtual file system implementation on top of IndexedDB using the `idb` wrapper library:

- **Object store**: A single `files` store keyed by `path`, with a secondary index on `parentPath` for efficient directory listing.
- **Schema**: Each item stores `path`, `name`, `type` (`file` | `folder`), `content`, `parentPath`, `createdAt`, and `updatedAt`.
- **Path resolution**: `resolvePath()` handles relative navigation (`..`, `.`) and absolute paths, normalizing the result.
- **Recursive operations**: `deleteItem` and `copyItem` traverse the subtree by querying all items whose path starts with the source prefix.
- **Move semantics**: `moveItem` re-keys every descendant in the store (write new key, delete old key) to preserve IndexedDB's key-path constraint.

### Terminal Component -- `src/components/Terminal.tsx`

The core of the application. Maintains its own state (current path, output history, command history, editor state) lifted to the parent `Index` page so it survives view-mode toggles. Parses user input into a command + arguments array and dispatches to the file system API. Output is rendered as typed lines (command, output, error, success, info, muted) with distinct styling.

### Folder View -- `src/components/FolderTree.tsx` + `src/components/FileEditor.tsx`

An alternative GUI mode:

- `FolderTree` fetches all items on mount (and on a `refreshKey` change) and renders a recursive tree with expand/collapse toggles.
- `FileEditor` loads a file by path, presents a `<textarea>`, tracks unsaved changes, and writes back to IndexedDB on save.

### Styling

- **Tailwind CSS** with CSS variables for theming (defined in `src/index.css`).
- **shadcn/ui** component primitives are available (Radix UI based). The app currently uses its own custom terminal/editor components but has the full shadcn/ui library installed.
- **Custom utility classes** (`terminal-window`, `terminal-header`, `glow-text`, `folder-tree-item`, etc.) encapsulate the terminal look-and-feel.
- **Space Mono** loaded from Google Fonts for the monospace aesthetic.

### State Management

- Local React `useState` / `useEffect` hooks. No global store.
- `@tanstack/react-query` is installed and configured but not actively used for data fetching (data comes from IndexedDB, not a server).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Build tool | [Vite](https://vitejs.dev/) 7 with SWC-based React plugin |
| Language | TypeScript 5.8 (strict null checks disabled) |
| UI framework | React 18 |
| Routing | React Router DOM 6 |
| Component library | [shadcn/ui](https://ui.shadcn.com/) (Radix UI + Tailwind) |
| Styling | Tailwind CSS 3.4 with `tailwindcss-animate` |
| Persistence | IndexedDB via [`idb`](https://github.com/jakearchibald/idb) 8 |
| Icons | [Lucide React](https://lucide.dev/) |
| Font | [Space Mono](https://fonts.google.com/specimen/Space+Mono) |

---

## Getting Started

### Prerequisites

- **Node.js** >= 18 (LTS recommended)
- **npm**, **yarn**, or **bun** as a package manager

### Installation

```sh
# Clone the repository
git clone https://github.com/0xPolybit/terminal-notes.git
cd terminal-notes

# Install dependencies
npm install
# or: bun install

# Start the development server (default: http://localhost:8080)
npm run dev
```

### Build for Production

```sh
npm run build     # optimized production build
npm run preview   # preview the production build locally
```

### Lint

```sh
npm run lint
```

---

## Project Structure

```
terminal-notes/
├── index.html                 # HTML entry point
├── vite.config.ts             # Vite configuration (port 8080, @ alias)
├── tailwind.config.ts         # Tailwind theme with custom terminal colors
├── tsconfig.json              # TypeScript project references
├── package.json
├── public/
│   └── robots.txt
└── src/
    ├── main.tsx               # React root mount
    ├── App.tsx                # Router + providers (QueryClient, Tooltip, Toasters)
    ├── index.css              # Tailwind directives + CSS variables + custom utilities
    ├── components/
    │   ├── Terminal.tsx        # Terminal emulator component (commands, history, inline editor)
    │   ├── FolderTree.tsx      # Recursive folder tree (GUI mode)
    │   ├── FileEditor.tsx      # Textarea-based file editor (GUI mode)
    │   ├── NavLink.tsx         # Wrapper around React Router NavLink
    │   └── ui/                # shadcn/ui primitives (button, dialog, toast, etc.)
    ├── hooks/
    │   ├── use-mobile.tsx
    │   └── use-toast.ts
    ├── lib/
    │   ├── fileSystem.ts      # IndexedDB-backed virtual file system
    │   └── utils.ts           # cn() utility (clsx + tailwind-merge)
    └── pages/
        ├── Index.tsx          # Main page (terminal or folder view)
        └── NotFound.tsx       # 404 page
```

---

## Contributing

Contributions are welcome. To get started:

1. **Fork** the repository and create a new branch from `main`.
2. **Install dependencies** and verify the dev server starts without errors.
3. **Make your changes.** Keep commits focused and descriptive.
4. **Test manually** -- there is no automated test suite yet. Verify that terminal commands work correctly and the folder view behaves as expected.
5. **Open a pull request** against `main` with a clear description of what changed and why.

### Ideas for Contributions

- Automated tests (unit tests for `fileSystem.ts`, integration tests for terminal commands).
- Import command to restore a JSON backup.
- Markdown preview for `.md` files.
- Tab-completion for file/folder names in the terminal.
- Theming options (light mode, custom accent colors).
- Drag-and-drop in the folder tree.
- Mobile-responsive layout improvements.

---

## License

This project does not currently include a license file. All rights are reserved by the author until a license is explicitly added. If you intend to use or redistribute this code, please contact the author.

---

## Author

**Swastik Biswas**
- GitHub: [0xPolybit](https://github.com/0xPolybit)
- LinkedIn: [polybit](https://www.linkedin.com/in/polybit/)
