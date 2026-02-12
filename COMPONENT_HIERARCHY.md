# Component Hierarchy & Data Flow

## Component Tree

```
App (manages global state via useTasks hook)
│
├─ State: activeCategory, tasks[], loading, error
├─ Handlers: createTask, completeTask, moveToFuture, moveToPresent, deleteTask
│
└─ Layout
    │
    ├─ Props: activeCategory, onCategoryChange
    │
    ├─ Header
    │   └─ "WorkBook" logo
    │
    ├─ Navigation
    │   └─ Category buttons (Past, Present, Future)
    │
    └─ Main
        │
        └─ CategoryView
            │
            ├─ Props: category, tasks, handlers
            │
            ├─ Header
            │   ├─ Title (e.g., "Present")
            │   └─ Description (e.g., "Current focus")
            │
            ├─ TaskInput (if not Past category)
            │   └─ Props: onSubmit → createTask
            │
            └─ TaskList
                │
                └─ TaskItem (for each task)
                    │
                    ├─ Checkbox → onComplete
                    ├─ Title display
                    ├─ Move button → onMoveToFuture or onMoveToPresent
                    └─ Delete button → onDelete
```

## Data Flow Diagram

### Task Creation Flow

```
User types in TaskInput
       ↓
    Enter key
       ↓
TaskInput.handleSubmit(title)
       ↓
CategoryView.handleCreateTask(title)
       ↓
useTasks.createTask(title, category)
       ↓
TaskService.createTask(title, category)
       ↓
  Validation (trim, check empty)
       ↓
LocalTaskStorage.createTask(dto)
       ↓
  Generate ID, timestamps
       ↓
  Write to localStorage
       ↓
  Return new Task object
       ↓
useTasks.refreshTasks()
       ↓
LocalTaskStorage.getTasks()
       ↓
  Read from localStorage
       ↓
  Return all tasks
       ↓
  Update state: setTasks(allTasks)
       ↓
  React re-renders components
       ↓
  New task appears in list
```

### Task Completion Flow

```
User clicks checkbox in TaskItem
       ↓
TaskItem.handleCheckboxChange()
       ↓
CategoryView.onCompleteTask(taskId)
       ↓
useTasks.completeTask(taskId)
       ↓
TaskService.completeTask(taskId)
       ↓
  Create updates: { category: PAST, completedAt: now }
       ↓
LocalTaskStorage.updateTask(taskId, updates)
       ↓
  Find task in array
  Update task object
  Write to localStorage
       ↓
  Return updated Task object
       ↓
useTasks.refreshTasks()
       ↓
  [Same refresh flow as above]
       ↓
  Task moves to Past category
  (filtered out of Present view)
```

## State Management

### Application State

```typescript
// App.tsx
const [activeCategory, setActiveCategory] = useState(TaskCategory.PRESENT);

const {
  tasks,           // All tasks from storage
  loading,         // Initial load state
  error,           // Error message if any
  createTask,      // Async handler
  completeTask,    // Async handler
  moveToFuture,    // Async handler
  moveToPresent,   // Async handler
  deleteTask,      // Async handler
  refreshTasks,    // Manual refresh
} = useTasks();
```

### Derived State

```typescript
// App.tsx
const categoryTasks = useMemo(() => {
  return tasks.filter(task => task.category === activeCategory);
}, [tasks, activeCategory]);

// Only re-computes when tasks or activeCategory changes
```

### Component-Level State

```typescript
// TaskInput.tsx
const [value, setValue] = useState('');
const [isSubmitting, setIsSubmitting] = useState(false);

// Local state for form input and submission status
```

## Props Flow

### Top-Down Props

```
App
├─ activeCategory ────────────→ Layout
│                               ├─ Uses for navigation active state
│                               └─ Passes to children (CategoryView)
│
├─ onCategoryChange ──────────→ Layout
│                               └─ Calls when nav button clicked
│
└─ categoryTasks ─────────────→ CategoryView
    ├─ category (activeCategory)
    ├─ tasks (filtered tasks)
    ├─ onCreateTask ──────────→ TaskInput
    │                           └─ Calls on form submit
    │
    └─ Task handlers ─────────→ TaskItem (for each task)
        ├─ onComplete
        ├─ onMoveToFuture
        ├─ onMoveToPresent
        └─ onDelete
```

### Event Bubbling

```
TaskItem (user action)
    ↓ (calls handler prop)
CategoryView (receives event)
    ↓ (calls handler prop)
useTasks hook (executes async operation)
    ↓ (updates storage)
TaskService (business logic)
    ↓ (delegates to storage)
LocalTaskStorage (persists data)
    ↓ (writes to localStorage)
useTasks.refreshTasks() (triggered after operation)
    ↓ (reads from storage)
setTasks(newTasks) (updates state)
    ↓ (React re-renders)
Components re-render with new data
```

## Service Layer Architecture

```
┌─────────────────────────────────────────────────────┐
│                  React Components                   │
│         (UI rendering & user interactions)          │
└─────────────────────┬───────────────────────────────┘
                      │
                      │ useTasks() hook
                      ↓
┌─────────────────────────────────────────────────────┐
│                   Custom Hooks                      │
│         (State management & side effects)           │
└─────────────────────┬───────────────────────────────┘
                      │
                      │ taskService methods
                      ↓
┌─────────────────────────────────────────────────────┐
│                  TaskService                        │
│            (Business logic & validation)            │
└─────────────────────┬───────────────────────────────┘
                      │
                      │ taskStorage methods (ITaskStorage)
                      ↓
┌─────────────────────────────────────────────────────┐
│               LocalTaskStorage                      │
│          (Data access implementation)               │
└─────────────────────┬───────────────────────────────┘
                      │
                      │ localStorage API
                      ↓
┌─────────────────────────────────────────────────────┐
│                  localStorage                       │
│              (Browser storage API)                  │
└─────────────────────────────────────────────────────┘
```

## Type Safety Flow

```typescript
// Type definitions cascade through layers

interface Task {                    // Core domain model
  id: string;
  title: string;
  category: TaskCategory;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

type CreateTaskDTO = Omit<...>     // Service layer input

interface ITaskStorage {           // Storage contract
  getTasks(): Promise<Task[]>;
  createTask(dto: CreateTaskDTO): Promise<Task>;
  // ...
}

class TaskService {                // Service implementation
  async createTask(              // Typed parameters
    title: string, 
    category: TaskCategory
  ): Promise<Task> {             // Typed return
    // Implementation
  }
}

function useTasks() {              // Hook return type
  return {
    tasks: Task[],
    createTask: (title: string, category?: TaskCategory) => Promise<void>,
    // ...
  };
}

// Components receive typed props
interface TaskItemProps {
  task: Task;
  onComplete: (id: string) => void;
  // ...
}
```

## CSS Architecture

```
Global Styles (globals.css)
├─ CSS Variables (:root)
│  ├─ Colors
│  ├─ Spacing
│  ├─ Typography
│  └─ Transitions
│
├─ Reset Styles (*, html, body)
├─ Base Element Styles (button, input)
└─ Utility Classes (.sr-only)

Component Styles (Component.css)
├─ Block (.component)
├─ Elements (.component__element)
└─ Modifiers (.component__element--modifier)

Usage in Components
├─ Import component CSS
├─ Use CSS variables for consistency
└─ BEM naming for clarity
```

## File Dependencies

```
main.tsx (entry point)
    ↓ imports
App.tsx
    ↓ imports
├─ Layout.tsx
│   └─ Layout.css
├─ CategoryView.tsx
│   ├─ CategoryView.css
│   └─ imports
│       ├─ TaskItem.tsx
│       │   └─ TaskItem.css
│       └─ TaskInput.tsx
│           └─ TaskInput.css
├─ useTasks.ts
│   └─ imports
│       └─ taskService.ts
│           └─ imports
│               └─ taskStorage.ts
│                   └─ imports
│                       └─ types/index.ts
└─ styles/globals.css
```

## Async Operation Pattern

All async operations follow the same pattern:

```typescript
const operationName = useCallback(async (...args) => {
  try {
    setError(null);                    // Clear previous errors
    await service.operation(...args);   // Perform operation
    await refreshTasks();               // Refresh data
  } catch (err) {
    setError(err.message);             // Set error state
    throw err;                         // Re-throw for caller
  }
}, [refreshTasks]);
```

This provides:
- Consistent error handling
- Automatic UI updates
- Loading state management
- Error propagation

## Extension Points

The architecture provides clear extension points:

1. **Storage Layer**: Swap `LocalTaskStorage` for API
2. **Service Layer**: Add caching, sync, auth logic
3. **Hook Layer**: Add optimistic updates, background sync
4. **Component Layer**: Add new UI features, animations
5. **Type Layer**: Extend Task interface for new fields

All changes are isolated to specific layers without affecting others.
