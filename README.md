# WorkBook

A minimal, professional task management application built with React and Electron. Focused on clarity, longevity, and future extensibility.

## Features

- **Three-Category System**: Organize tasks into Past, Present, and Future
- **Clean Architecture**: Modular, maintainable code structure
- **Local Persistence**: All data stored locally with localStorage
- **Future-Ready**: Architected for easy backend integration
- **Minimal Design**: Professional, distraction-free interface
- **Electron Desktop App**: Compact, frameless window optimized for productivity

## Architecture

### Project Structure

```
workbook/
├── electron/               # Electron main process
│   └── main.js
├── src/
│   ├── components/        # React components
│   │   ├── Layout/        # App shell and navigation
│   │   ├── CategoryView/  # Category-specific views
│   │   └── Task/          # Task-related components
│   ├── services/          # Business logic layer
│   │   ├── taskStorage.ts # Storage abstraction
│   │   └── taskService.ts # Task operations
│   ├── hooks/             # Custom React hooks
│   │   └── useTasks.ts
│   ├── types/             # TypeScript definitions
│   │   └── index.ts
│   ├── styles/            # Global styles
│   │   └── globals.css
│   ├── App.tsx            # Main application
│   └── main.tsx           # Entry point
├── package.json
├── vite.config.js
└── tsconfig.json
```

### Design Principles

1. **Separation of Concerns**
   - Components handle UI only
   - Services manage business logic
   - Storage layer is abstracted for future API integration

2. **Future-Proof Architecture**
   - Storage interface (`ITaskStorage`) allows swapping localStorage with API
   - Service layer (`TaskService`) can add authentication, caching, sync logic
   - Component structure supports notifications, analytics, collaboration

3. **Type Safety**
   - Full TypeScript coverage
   - Clear interfaces for all data structures
   - Type-safe API contracts

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Run in development mode (web only)
npm run dev

# Run Electron app in development
npm run electron:dev
```

### Building

```bash
# Build for production
npm run build

# Build Electron app
npm run electron:build
```

## Usage

### Task Management

- **Add Task**: Type in the input field and press Enter or click the + button
- **Complete Task**: Click the checkbox to move the task to Past
- **Move to Future**: Click the up arrow to defer a task
- **Move to Present**: Click the down arrow to bring a future task back
- **Delete Task**: Click the × button to permanently remove a task

### Navigation

- Switch between Past, Present, and Future views using the navigation buttons
- The app always opens to the Present view

## Future Extensions

The architecture supports adding:

### Backend Integration

Replace `LocalTaskStorage` with an API-based storage:

```typescript
class APITaskStorage implements ITaskStorage {
  async getTasks(): Promise<Task[]> {
    const response = await fetch('/api/tasks');
    return response.json();
  }
  // ... implement other methods
}

export const taskStorage = new APITaskStorage();
```

### Authentication

Add auth context and protect API calls:

```typescript
// src/contexts/AuthContext.tsx
export const AuthProvider: React.FC = ({ children }) => {
  // Auth logic here
};

// Update TaskService to include auth tokens
```

### Sync & Conflict Resolution

```typescript
class SyncService {
  async syncTasks(): Promise<void> {
    // Compare local and remote timestamps
    // Resolve conflicts with last-write-wins or merge strategies
  }
}
```

### Notifications

```typescript
// src/services/notificationService.ts
export class NotificationService {
  notify(message: string) {
    if (Notification.permission === 'granted') {
      new Notification('WorkBook', { body: message });
    }
  }
}
```

### Analytics

```typescript
// src/services/analyticsService.ts
export class AnalyticsService {
  trackEvent(event: string, properties?: object) {
    // Send to analytics platform
  }
}
```

## Technology Stack

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool
- **Electron**: Desktop packaging
- **CSS**: Styling (no dependencies)

## Design Philosophy

- **Minimal**: No unnecessary features or UI elements
- **Professional**: Clean typography, subtle interactions
- **Focused**: Optimized for productivity, not visual excess
- **Extensible**: Easy to add features without refactoring

## Color Palette

```css
Background:    #fafaf9
Surface:       #ffffff
Border:        #e7e5e4
Text Primary:  #1c1917
Text Secondary: #57534e
Accent:        #0f172a
Success:       #15803d
Danger:        #dc2626
Future:        #1e40af
```

## License

MIT