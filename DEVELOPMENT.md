# Development Guide

This guide will help you get started with WorkBook development.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (web mode)
npm run dev

# Start Electron app in development
npm run electron:dev
```

## Development Scripts

- `npm run dev` - Start Vite dev server on http://localhost:5173
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build
- `npm run electron:dev` - Run Electron app with hot reload
- `npm run electron:build` - Build Electron app for distribution

## Project Structure

```
src/
├── components/           # React components
│   ├── Layout/          # App shell (header, nav)
│   ├── CategoryView/    # Task list views
│   └── Task/            # Task components
│       ├── TaskItem.tsx     # Individual task display
│       └── TaskInput.tsx    # Task creation form
├── services/            # Business logic
│   ├── taskService.ts   # Task operations
│   └── taskStorage.ts   # Storage implementation
├── hooks/               # Custom React hooks
│   └── useTasks.ts      # Task management hook
├── types/               # TypeScript types
│   └── index.ts         # All type definitions
├── styles/              # Global styles
│   └── globals.css      # CSS variables and reset
├── App.tsx              # Root component
└── main.tsx             # Application entry point
```

## Making Changes

### Adding a New Component

1. Create component directory in `src/components/`
2. Create `.tsx` and `.css` files
3. Export from index file (optional)
4. Import in parent component

Example:
```typescript
// src/components/TaskFilter/TaskFilter.tsx
import React from 'react';
import './TaskFilter.css';

interface TaskFilterProps {
  onFilterChange: (filter: string) => void;
}

export const TaskFilter: React.FC<TaskFilterProps> = ({ onFilterChange }) => {
  return (
    <div className="task-filter">
      {/* Component content */}
    </div>
  );
};
```

### Adding a New Service

1. Create service file in `src/services/`
2. Define class with methods
3. Export singleton instance

Example:
```typescript
// src/services/tagService.ts
export class TagService {
  async getTags(): Promise<string[]> {
    // Implementation
  }
}

export const tagService = new TagService();
```

### Adding a New Hook

1. Create hook file in `src/hooks/`
2. Export custom hook function

Example:
```typescript
// src/hooks/useFilter.ts
import { useState, useCallback } from 'react';

export function useFilter(initialFilter: string = '') {
  const [filter, setFilter] = useState(initialFilter);
  
  const updateFilter = useCallback((newFilter: string) => {
    setFilter(newFilter);
  }, []);
  
  return { filter, updateFilter };
}
```

### Styling Guidelines

1. Use CSS custom properties from `globals.css`
2. Follow BEM naming convention: `component__element--modifier`
3. Keep styles scoped to component
4. Use semantic spacing variables: `var(--space-sm)`, etc.

Example:
```css
.task-item {
  padding: var(--space-md);
  background: var(--color-surface);
}

.task-item__title {
  color: var(--color-text-primary);
}

.task-item--completed {
  opacity: 0.6;
}
```

## Common Tasks

### Changing the Color Scheme

Edit `src/styles/globals.css`:

```css
:root {
  --color-accent: #0f172a;  /* Change primary accent */
  --color-bg: #fafaf9;      /* Change background */
  /* ... other colors */
}
```

### Adding a Task Property

1. Update type definition in `src/types/index.ts`:

```typescript
export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  tags?: string[];  // New property
  createdAt: number;
  updatedAt: number;
}
```

2. Update storage methods if needed
3. Update UI to display/edit new property

### Changing Window Size

Edit `electron/main.js`:

```javascript
mainWindow = new BrowserWindow({
  width: 500,    // Change width
  height: 800,   // Change height
  // ...
});
```

## Debugging

### Web Browser

1. Run `npm run dev`
2. Open http://localhost:5173
3. Use browser DevTools (F12)

### Electron

1. Run `npm run electron:dev`
2. DevTools open automatically
3. Main process logs in terminal
4. Renderer process logs in DevTools

### Common Issues

**Port already in use**:
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

**localStorage not persisting**:
- Check browser privacy settings
- Verify STORAGE_KEY constant
- Check for errors in console

**Electron window not showing**:
- Check main.js for errors
- Verify build output in dist/
- Try `npm run build` first

## Testing

### Manual Testing Checklist

- [ ] Create task in Present
- [ ] Complete task (moves to Past)
- [ ] Create task in Future
- [ ] Move task from Future to Present
- [ ] Delete task from each category
- [ ] Refresh page (tasks persist)
- [ ] Switch between categories
- [ ] Test with empty states
- [ ] Test with many tasks (20+)

### Adding Unit Tests (Future)

Install testing dependencies:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

Create test file:
```typescript
// src/services/taskService.test.ts
import { describe, it, expect } from 'vitest';
import { TaskService } from './taskService';

describe('TaskService', () => {
  it('should create task', async () => {
    const service = new TaskService();
    const task = await service.createTask('Test');
    expect(task.title).toBe('Test');
  });
});
```

## Code Style

### TypeScript

- Use explicit types for public APIs
- Prefer interfaces over types for objects
- Use enums for finite sets of values
- Avoid `any` type

### React

- Use functional components
- Use hooks for state and effects
- Destructure props in component signature
- Use explicit children type when needed

### Naming

- Components: PascalCase (`TaskItem`)
- Functions: camelCase (`createTask`)
- Files: Match export name (`TaskItem.tsx`)
- CSS classes: kebab-case with BEM (`task-item__title`)
- Constants: UPPER_SNAKE_CASE (`STORAGE_KEY`)

## Performance Tips

- Use `React.memo()` for expensive components
- Use `useCallback()` for stable function references
- Use `useMemo()` for expensive computations
- Avoid inline object/array creation in render
- Use `key` prop correctly in lists

## Building for Production

### Web Build

```bash
npm run build
# Output in dist/
```

### Electron Build

```bash
npm run electron:build
# Output in dist-electron/
```

Builds for current platform by default. To build for specific platforms, edit `package.json` build config.

## Environment Variables

Create `.env.local` for local overrides:

```bash
VITE_API_URL=http://localhost:3000
VITE_ENABLE_ANALYTICS=false
```

Access in code:
```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/task-tags

# Make changes and commit
git add .
git commit -m "Add task tags feature"

# Push and create PR
git push origin feature/task-tags
```

## Resources

- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Electron Docs](https://www.electronjs.org/docs)

## Getting Help

- Check ARCHITECTURE.md for design decisions
- Review existing code for patterns
- Search issues on GitHub
- Ask questions in discussions

Happy coding! 🚀
