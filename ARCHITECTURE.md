# WorkBook Architecture

This document describes the technical architecture and design decisions behind WorkBook.

## Table of Contents

1. [Overview](#overview)
2. [Data Flow](#data-flow)
3. [Layer Architecture](#layer-architecture)
4. [Component Structure](#component-structure)
5. [State Management](#state-management)
6. [Storage Strategy](#storage-strategy)
7. [Future Extensibility](#future-extensibility)
8. [Testing Strategy](#testing-strategy)

## Overview

WorkBook follows a layered architecture pattern, separating concerns into distinct layers:

```
┌─────────────────────────────────────┐
│         Presentation Layer          │
│         (React Components)          │
├─────────────────────────────────────┤
│          Business Logic             │
│         (Services & Hooks)          │
├─────────────────────────────────────┤
│         Data Access Layer           │
│        (Storage Interface)          │
├─────────────────────────────────────┤
│          Data Storage               │
│    (localStorage / Future API)      │
└─────────────────────────────────────┘
```

## Data Flow

### Task Creation Flow

```
User Input (TaskInput)
    ↓
useTasks.createTask()
    ↓
TaskService.createTask()
    ↓
ITaskStorage.createTask()
    ↓
LocalTaskStorage (writes to localStorage)
    ↓
useTasks.refreshTasks()
    ↓
Component Re-render
```

### Task Update Flow

```
User Action (TaskItem button click)
    ↓
useTasks.completeTask() / moveToFuture() / etc.
    ↓
TaskService.[operation]()
    ↓
ITaskStorage.updateTask()
    ↓
LocalTaskStorage (updates localStorage)
    ↓
useTasks.refreshTasks()
    ↓
Component Re-render
```

## Layer Architecture

### Presentation Layer

**Components**: Pure UI components with minimal business logic

```typescript
// Components receive props and callbacks
<TaskItem 
  task={task}
  onComplete={handleComplete}
  onDelete={handleDelete}
/>
```

**Responsibilities**:
- Render UI based on props
- Handle user interactions
- Delegate business logic to hooks/services

**Files**:
- `src/components/Task/TaskItem.tsx`
- `src/components/Task/TaskInput.tsx`
- `src/components/CategoryView/CategoryView.tsx`
- `src/components/Layout/Layout.tsx`

### Business Logic Layer

**Services**: Encapsulate business rules and data transformations

```typescript
class TaskService {
  async completeTask(id: string): Promise<Task> {
    // Business logic: moving to past, setting completion time
    const updates = {
      category: TaskCategory.PAST,
      completedAt: Date.now(),
      updatedAt: Date.now(),
    };
    return taskStorage.updateTask(id, updates);
  }
}
```

**Hooks**: Manage component state and side effects

```typescript
function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  
  const completeTask = useCallback(async (id: string) => {
    await taskService.completeTask(id);
    await refreshTasks();
  }, [refreshTasks]);
  
  return { tasks, completeTask, ... };
}
```

**Files**:
- `src/services/taskService.ts`
- `src/hooks/useTasks.ts`

### Data Access Layer

**Storage Interface**: Abstract contract for data operations

```typescript
interface ITaskStorage {
  getTasks(): Promise<Task[]>;
  createTask(task: CreateTaskDTO): Promise<Task>;
  updateTask(id: string, updates: UpdateTaskDTO): Promise<Task>;
  deleteTask(id: string): Promise<void>;
}
```

**Implementation**: Current localStorage, future API

```typescript
class LocalTaskStorage implements ITaskStorage {
  async getTasks(): Promise<Task[]> {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }
}
```

**Files**:
- `src/types/index.ts` (interface definition)
- `src/services/taskStorage.ts` (implementation)

## Component Structure

### Component Hierarchy

```
App
├── Layout
│   ├── Header
│   ├── Navigation
│   └── Main
│       └── CategoryView
│           ├── TaskInput
│           └── TaskItem (multiple)
```

### Component Responsibilities

**App**
- Root component
- Manages active category state
- Initializes useTasks hook
- Handles loading and error states

**Layout**
- App shell and navigation
- Category switching
- Consistent header/navigation

**CategoryView**
- Displays tasks for a specific category
- Handles task creation for that category
- Renders empty states

**TaskItem**
- Displays individual task
- Task-level actions (complete, move, delete)
- Visual feedback for interactions

**TaskInput**
- Task creation interface
- Form validation
- Submit handling

## State Management

### Local Component State

Simple, ephemeral state managed with `useState`:

```typescript
const [value, setValue] = useState('');
const [isSubmitting, setIsSubmitting] = useState(false);
```

### Shared Application State

Managed through custom hooks:

```typescript
const { tasks, loading, error, createTask, ... } = useTasks();
```

**Benefits**:
- Single source of truth
- Centralized data fetching
- Easy to test
- No global state library needed

### State Derivation

Computed state using `useMemo`:

```typescript
const categoryTasks = useMemo(() => {
  return tasks.filter(task => task.category === activeCategory);
}, [tasks, activeCategory]);
```

## Storage Strategy

### Current: localStorage

**Pros**:
- No network latency
- Works offline
- Simple implementation
- No authentication needed

**Cons**:
- Single-device only
- Limited storage (5-10MB)
- Browser-specific

### Implementation Details

```typescript
private readStorage(): Task[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

private writeStorage(tasks: Task[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}
```

### Future: API-Based Storage

Replace `LocalTaskStorage` with:

```typescript
class APITaskStorage implements ITaskStorage {
  private baseURL = 'https://api.workbook.app';
  
  async getTasks(): Promise<Task[]> {
    const response = await fetch(`${this.baseURL}/tasks`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return response.json();
  }
  
  async createTask(dto: CreateTaskDTO): Promise<Task> {
    const response = await fetch(`${this.baseURL}/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dto)
    });
    return response.json();
  }
  
  // ... other methods
}
```

## Future Extensibility

### Adding Authentication

1. Create auth context:

```typescript
// src/contexts/AuthContext.tsx
export const AuthProvider: React.FC = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    const { user, token } = await response.json();
    setUser(user);
    setToken(token);
  };
  
  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

2. Update storage to use auth token:

```typescript
class APITaskStorage implements ITaskStorage {
  constructor(private authToken: string) {}
  
  async getTasks(): Promise<Task[]> {
    const response = await fetch('/api/tasks', {
      headers: { 'Authorization': `Bearer ${this.authToken}` }
    });
    return response.json();
  }
}
```

### Adding Sync

```typescript
// src/services/syncService.ts
export class SyncService {
  private lastSyncTimestamp = 0;
  
  async sync(): Promise<void> {
    // Get local tasks
    const localTasks = await localTaskStorage.getTasks();
    
    // Get remote tasks updated since last sync
    const remoteTasks = await apiTaskStorage.getTasksSince(this.lastSyncTimestamp);
    
    // Merge with conflict resolution
    const merged = this.mergeWithConflictResolution(localTasks, remoteTasks);
    
    // Push local changes to server
    await this.pushLocalChanges(merged.toSync);
    
    // Update local storage
    await localTaskStorage.bulkUpdate(merged.final);
    
    this.lastSyncTimestamp = Date.now();
  }
  
  private mergeWithConflictResolution(
    local: Task[],
    remote: Task[]
  ): { final: Task[], toSync: Task[] } {
    // Last-write-wins strategy based on updatedAt timestamp
    // Can be extended with more sophisticated conflict resolution
  }
}
```

### Adding Notifications

```typescript
// src/services/notificationService.ts
export class NotificationService {
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  notify(title: string, options?: NotificationOptions): void {
    if (Notification.permission === 'granted') {
      new Notification(title, options);
    }
  }
  
  notifyTaskDue(task: Task): void {
    this.notify('Task Due', {
      body: task.title,
      icon: '/icon.png',
      tag: task.id
    });
  }
}

// Integrate into TaskService
class TaskService {
  constructor(
    private storage: ITaskStorage,
    private notifications?: NotificationService
  ) {}
  
  async completeTask(id: string): Promise<Task> {
    const task = await this.storage.updateTask(id, {
      category: TaskCategory.PAST,
      completedAt: Date.now()
    });
    
    this.notifications?.notify('Task Completed', {
      body: task.title
    });
    
    return task;
  }
}
```

### Adding Analytics

```typescript
// src/services/analyticsService.ts
export class AnalyticsService {
  track(event: string, properties?: Record<string, any>): void {
    // Send to analytics platform (e.g., Mixpanel, Amplitude)
    console.log('Track:', event, properties);
  }
}

// Integrate into hooks
export function useTasks() {
  const analytics = useAnalytics();
  
  const createTask = useCallback(async (title: string) => {
    await taskService.createTask(title);
    analytics.track('task_created', { category: TaskCategory.PRESENT });
    await refreshTasks();
  }, [analytics, refreshTasks]);
}
```

## Testing Strategy

### Unit Tests

**Services**:
```typescript
describe('TaskService', () => {
  it('should create task with trimmed title', async () => {
    const service = new TaskService();
    const task = await service.createTask('  Test Task  ');
    expect(task.title).toBe('Test Task');
  });
  
  it('should throw error for empty title', async () => {
    const service = new TaskService();
    await expect(service.createTask('   ')).rejects.toThrow();
  });
});
```

**Storage**:
```typescript
describe('LocalTaskStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  
  it('should persist tasks to localStorage', async () => {
    const storage = new LocalTaskStorage();
    await storage.createTask({ title: 'Test', category: TaskCategory.PRESENT });
    
    const tasks = await storage.getTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Test');
  });
});
```

### Integration Tests

**Hooks**:
```typescript
describe('useTasks', () => {
  it('should create and fetch tasks', async () => {
    const { result } = renderHook(() => useTasks());
    
    await act(async () => {
      await result.current.createTask('New Task');
    });
    
    expect(result.current.tasks).toHaveLength(1);
  });
});
```

### Component Tests

```typescript
describe('TaskItem', () => {
  it('should call onComplete when checkbox clicked', () => {
    const onComplete = jest.fn();
    const task = createMockTask();
    
    render(<TaskItem task={task} onComplete={onComplete} />);
    
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onComplete).toHaveBeenCalledWith(task.id);
  });
});
```

### E2E Tests (Future)

Using Playwright or Cypress:

```typescript
test('complete task flow', async ({ page }) => {
  await page.goto('http://localhost:5173');
  
  // Create task
  await page.fill('input[placeholder*="Add"]', 'Test Task');
  await page.click('button[aria-label="Add task"]');
  
  // Verify task appears
  await expect(page.locator('text=Test Task')).toBeVisible();
  
  // Complete task
  await page.click('input[type="checkbox"]');
  
  // Switch to Past view
  await page.click('text=Past');
  
  // Verify task in Past
  await expect(page.locator('text=Test Task')).toBeVisible();
});
```

## Performance Considerations

### Current Optimizations

1. **Memoization**: Derived state uses `useMemo`
2. **Callback Stability**: Event handlers use `useCallback`
3. **Minimal Re-renders**: Components only re-render when props change

### Future Optimizations

1. **Virtualization**: For large task lists (react-window)
2. **Debouncing**: For search/filter inputs
3. **Code Splitting**: Lazy load category views
4. **Service Workers**: For offline support and caching

## Security Considerations

### Current

- Input sanitization (title trimming)
- No XSS vulnerabilities (React auto-escapes)

### Future (with API)

- HTTPS only
- JWT token authentication
- CSRF protection
- Rate limiting
- Input validation on server
- SQL injection prevention
- Encrypted data at rest

## Accessibility

- Semantic HTML
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus indicators
- Screen reader friendly

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES2020+ features
- No polyfills required

---

This architecture balances simplicity today with extensibility tomorrow, ensuring WorkBook can grow from a local-only app to a full-featured, multi-device task management platform.
