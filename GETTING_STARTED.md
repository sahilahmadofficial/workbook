# WorkBook - Project Overview

## What You Have

A complete, production-ready React + Electron task management application with professional architecture designed for long-term maintainability and extensibility.

## Project Highlights

### Architecture
- **Clean Separation of Concerns**: UI, business logic, and data layers are completely separated
- **Interface-Based Storage**: Easy to swap localStorage with any backend API
- **Service Layer**: All business logic centralized and testable
- **Custom Hooks**: Clean state management without external libraries
- **Full TypeScript**: Type-safe throughout the entire codebase

### Design
- **Minimal & Professional**: Classical color palette, clean typography
- **Distraction-Free**: Focus on productivity, not visual excess
- **Responsive Interactions**: Smooth transitions, subtle feedback
- **Accessible**: Semantic HTML, ARIA labels, keyboard navigation

### Features Implemented
- ✅ Three-category task system (Past, Present, Future)
- ✅ Task creation with auto-focus
- ✅ Complete tasks (moves to Past)
- ✅ Move tasks between Future and Present
- ✅ Delete tasks
- ✅ Local persistence (localStorage)
- ✅ Mobile-sized Electron window (frameless)
- ✅ Loading and error states

## Getting Started

### Installation

```bash
cd workbook
npm install
```

### Development

**Web Mode** (faster for UI development):
```bash
npm run dev
# Opens at http://localhost:5173
```

**Electron Mode** (test desktop app):
```bash
npm run electron:dev
# Opens frameless window
```

### Building

**Web Build**:
```bash
npm run build
# Output: dist/
```

**Electron Build**:
```bash
npm run electron:build
# Output: dist-electron/
```

## Project Structure

```
workbook/
├── src/
│   ├── components/
│   │   ├── Layout/          # App shell, navigation
│   │   ├── CategoryView/    # Task list by category
│   │   └── Task/            # TaskItem, TaskInput
│   ├── services/
│   │   ├── taskStorage.ts   # Storage abstraction (localStorage)
│   │   └── taskService.ts   # Business logic
│   ├── hooks/
│   │   └── useTasks.ts      # Task state management
│   ├── types/
│   │   └── index.ts         # All TypeScript types
│   ├── styles/
│   │   └── globals.css      # Design system
│   ├── App.tsx              # Root component
│   └── main.tsx             # Entry point
├── electron/
│   └── main.js              # Electron main process
├── README.md                # User documentation
├── ARCHITECTURE.md          # Technical deep-dive
├── DEVELOPMENT.md           # Developer guide
└── EXTENSIONS.md            # Feature examples
```

## Key Files to Understand

### 1. Type Definitions (`src/types/index.ts`)
- Defines all data structures
- Includes storage interface for future backend

### 2. Task Storage (`src/services/taskStorage.ts`)
- Implements `ITaskStorage` interface
- Currently uses localStorage
- **Easy to replace** with API calls

### 3. Task Service (`src/services/taskService.ts`)
- All business logic lives here
- Validates input, manages state transitions
- Calls storage layer

### 4. useTasks Hook (`src/hooks/useTasks.ts`)
- Custom hook for React components
- Manages async operations
- Handles loading and error states

### 5. Components
- **Layout**: App shell with navigation
- **CategoryView**: Displays tasks for a category
- **TaskItem**: Individual task with actions
- **TaskInput**: Task creation form

## Design System

### Colors
```css
Background:    #fafaf9  /* Warm off-white */
Surface:       #ffffff  /* Pure white */
Border:        #e7e5e4  /* Subtle gray */
Text:          #1c1917  /* Near black */
Accent:        #0f172a  /* Navy blue */
Success:       #15803d  /* Green */
Danger:        #dc2626  /* Red */
Future:        #1e40af  /* Blue */
```

### Spacing
```css
--space-xs:  0.25rem  /* 4px */
--space-sm:  0.5rem   /* 8px */
--space-md:  1rem     /* 16px */
--space-lg:  1.5rem   /* 24px */
--space-xl:  2rem     /* 32px */
```

### Typography
- System fonts for native feel
- 15px base size
- 1.5 line-height
- -0.02em to -0.01em letter-spacing on headings

## Extending the App

The architecture is designed to support these extensions **without refactoring**:

### 1. Backend API Integration
Replace `LocalTaskStorage` with `APITaskStorage`:
```typescript
class APITaskStorage implements ITaskStorage {
  async getTasks() {
    const response = await fetch('/api/tasks');
    return response.json();
  }
  // ... other methods
}
```

### 2. Authentication
Add auth context and token management:
```typescript
export const AuthProvider: React.FC = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  // ... auth logic
};
```

### 3. Cross-Device Sync
Implement sync service with conflict resolution:
```typescript
class SyncService {
  async sync() {
    // Compare local vs remote
    // Merge with last-write-wins
    // Push changes
  }
}
```

### 4. Task Tags
Add `tags: string[]` to Task type, update UI:
```typescript
interface Task {
  tags: string[];  // Add this
  // ... rest of fields
}
```

### 5. Due Dates & Reminders
Add `dueDate: number` and notification service:
```typescript
class NotificationService {
  notify(title: string, body: string) {
    new Notification(title, { body });
  }
}
```

See `EXTENSIONS.md` for complete code examples.

## Testing Strategy

### Manual Testing (Current)
- Create, complete, move, delete tasks
- Test across all categories
- Verify persistence across page reload

### Unit Tests (Future)
```bash
npm install -D vitest @testing-library/react
```

```typescript
describe('TaskService', () => {
  it('should create task', async () => {
    const service = new TaskService();
    const task = await service.createTask('Test');
    expect(task.title).toBe('Test');
  });
});
```

## File Organization

### Component Structure
```
Component/
├── Component.tsx       # React component
├── Component.css       # Scoped styles
└── index.ts           # Re-export (optional)
```

### CSS Naming (BEM)
```css
.component {}
.component__element {}
.component__element--modifier {}
```

### TypeScript Conventions
- Interfaces for public APIs
- Explicit return types
- Avoid `any`
- Use enums for constants

## Electron Configuration

### Window Settings (`electron/main.js`)
```javascript
width: 400,        // Compact width
height: 700,       // Phone-like height
frame: false,      // No title bar
resizable: false,  // Fixed size
```

### Development Mode
- Loads from Vite dev server
- DevTools open automatically
- Hot reload enabled

### Production Mode
- Loads from built files
- No DevTools
- Optimized bundle

## Common Tasks

### Change Color Theme
Edit `src/styles/globals.css`:
```css
:root {
  --color-accent: #your-color;
}
```

### Add New Component
```bash
mkdir src/components/NewComponent
touch src/components/NewComponent/NewComponent.tsx
touch src/components/NewComponent/NewComponent.css
```

### Add New Service
```bash
touch src/services/newService.ts
```

### Change Window Size
Edit `electron/main.js`:
```javascript
width: 500,
height: 800,
```

## Documentation

- **README.md**: User-facing documentation
- **ARCHITECTURE.md**: Technical architecture deep-dive
- **DEVELOPMENT.md**: Developer setup and guidelines
- **EXTENSIONS.md**: Code examples for new features

## Next Steps

1. **Run the app**: `npm install && npm run dev`
2. **Explore the code**: Start with `src/App.tsx`
3. **Read the docs**: Check ARCHITECTURE.md for design decisions
4. **Make it yours**: Customize colors, add features
5. **Deploy**: Build with `npm run electron:build`

## Future Roadmap Ideas

- [ ] Backend API integration
- [ ] User authentication
- [ ] Cross-device sync
- [ ] Task tags and labels
- [ ] Due dates and reminders
- [ ] Task search and filtering
- [ ] Analytics and insights
- [ ] Keyboard shortcuts
- [ ] Dark mode
- [ ] Mobile apps (React Native)
- [ ] Web app (PWA)
- [ ] Collaboration features
- [ ] Task templates
- [ ] Recurring tasks
- [ ] File attachments

## Philosophy

This project balances:
- **Simplicity today** with extensibility tomorrow
- **Minimal dependencies** with modern tools
- **Clean code** with pragmatic decisions
- **Professional quality** with lightweight feel

Built to last, designed to grow.

---

**Questions?** Check the documentation or explore the well-commented code.

**Happy building! 🚀**
