# Keyboard Shortcuts

## WorkBook Keyboard Shortcuts

### Application Controls

| Shortcut | Action |
|----------|--------|
| `Cmd+Q` (Mac) / `Alt+F4` (Win/Linux) | Quit application |
| `F12` | Toggle DevTools (development mode) |
| `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Win/Linux) | Toggle DevTools (development mode) |

### Task Management

| Shortcut | Action |
|----------|--------|
| `Tab` | Navigate between categories and input field |
| `Enter` | Submit task (when input field is focused) |
| `Space` | Toggle checkbox (when task is focused) |
| `Escape` | Clear input field |

### Navigation

| Shortcut | Action |
|----------|--------|
| `Cmd+1` or `Alt+1` | Switch to Past category (coming soon) |
| `Cmd+2` or `Alt+2` | Switch to Present category (coming soon) |
| `Cmd+3` or `Alt+3` | Switch to Future category (coming soon) |

## Development Tips

### Opening DevTools

In development mode, you can open DevTools using:
- **F12** key
- **Cmd+Option+I** (Mac)
- **Ctrl+Shift+I** (Windows/Linux)

DevTools won't open automatically anymore, keeping your workspace clean.

### Hot Reload

When running `npm run electron:dev`, changes to your source code will automatically refresh the app thanks to Vite's hot module replacement (HMR).

### Console Logging

To view console logs, open DevTools and check the Console tab. This is useful for debugging:

```typescript
console.log('Current tasks:', tasks);
console.error('Failed to create task:', error);
```

## Future Shortcuts (Planned)

These shortcuts are planned for future releases:

- `Cmd+N` / `Ctrl+N` - New task (quick add)
- `Cmd+F` / `Ctrl+F` - Search tasks
- `Cmd+D` / `Ctrl+D` - Toggle dark mode
- `Cmd+,` / `Ctrl+,` - Open settings
- `Cmd+Z` / `Ctrl+Z` - Undo last action
- `Cmd+Shift+Z` / `Ctrl+Y` - Redo last action

To implement these shortcuts, you can add a global keyboard listener in the Electron main process or use a library like `electron-localshortcut`.# Keyboard Shortcuts

## WorkBook Keyboard Shortcuts

### Application Controls

| Shortcut | Action |
|----------|--------|
| `Cmd+Q` (Mac) / `Alt+F4` (Win/Linux) | Quit application |
| `F12` | Toggle DevTools (development mode) |
| `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Win/Linux) | Toggle DevTools (development mode) |

### Task Management

| Shortcut | Action |
|----------|--------|
| `Tab` | Navigate between categories and input field |
| `Enter` | Submit task (when input field is focused) |
| `Space` | Toggle checkbox (when task is focused) |
| `Escape` | Clear input field |

### Navigation

| Shortcut | Action |
|----------|--------|
| `Cmd+1` or `Alt+1` | Switch to Past category (coming soon) |
| `Cmd+2` or `Alt+2` | Switch to Present category (coming soon) |
| `Cmd+3` or `Alt+3` | Switch to Future category (coming soon) |

## Development Tips

### Opening DevTools

In development mode, you can open DevTools using:
- **F12** key
- **Cmd+Option+I** (Mac)
- **Ctrl+Shift+I** (Windows/Linux)

DevTools won't open automatically anymore, keeping your workspace clean.

### Hot Reload

When running `npm run electron:dev`, changes to your source code will automatically refresh the app thanks to Vite's hot module replacement (HMR).

### Console Logging

To view console logs, open DevTools and check the Console tab. This is useful for debugging:

```typescript
console.log('Current tasks:', tasks);
console.error('Failed to create task:', error);
```

## Future Shortcuts (Planned)

These shortcuts are planned for future releases:

- `Cmd+N` / `Ctrl+N` - New task (quick add)
- `Cmd+F` / `Ctrl+F` - Search tasks
- `Cmd+D` / `Ctrl+D` - Toggle dark mode
- `Cmd+,` / `Ctrl+,` - Open settings
- `Cmd+Z` / `Ctrl+Z` - Undo last action
- `Cmd+Shift+Z` / `Ctrl+Y` - Redo last action

To implement these shortcuts, you can add a global keyboard listener in the Electron main process or use a library like `electron-localshortcut`.