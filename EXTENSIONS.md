# Extension Examples

This document provides concrete examples of how to extend WorkBook with common features.

## Example 1: Adding Task Tags

### Step 1: Update Type Definitions

```typescript
// src/types/index.ts

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  tags: string[];  // Add this
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export type CreateTaskDTO = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;
```

### Step 2: Update Storage Migration

```typescript
// src/services/taskStorage.ts

private readStorage(): Task[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const tasks = data ? JSON.parse(data) : [];
    
    // Migrate old tasks without tags
    return tasks.map(task => ({
      ...task,
      tags: task.tags || []
    }));
  } catch (error) {
    console.error('Failed to read from localStorage:', error);
    return [];
  }
}
```

### Step 3: Update Service Methods

```typescript
// src/services/taskService.ts

async createTask(
  title: string, 
  category: TaskCategory = TaskCategory.PRESENT,
  tags: string[] = []
): Promise<Task> {
  if (!title.trim()) {
    throw new Error('Task title cannot be empty');
  }

  const dto: CreateTaskDTO = {
    title: title.trim(),
    category,
    tags,
  };

  return taskStorage.createTask(dto);
}

async addTag(id: string, tag: string): Promise<Task> {
  const tasks = await taskStorage.getTasks();
  const task = tasks.find(t => t.id === id);
  
  if (!task) {
    throw new Error('Task not found');
  }

  const updatedTags = [...new Set([...task.tags, tag])];
  return taskStorage.updateTask(id, { tags: updatedTags });
}

async removeTag(id: string, tag: string): Promise<Task> {
  const tasks = await taskStorage.getTasks();
  const task = tasks.find(t => t.id === id);
  
  if (!task) {
    throw new Error('Task not found');
  }

  const updatedTags = task.tags.filter(t => t !== tag);
  return taskStorage.updateTask(id, { tags: updatedTags });
}
```

### Step 4: Update Hook

```typescript
// src/hooks/useTasks.ts

export function useTasks(): UseTasksReturn {
  // ... existing code ...

  const addTag = useCallback(async (id: string, tag: string) => {
    try {
      setError(null);
      await taskService.addTag(id, tag);
      await refreshTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tag');
      throw err;
    }
  }, [refreshTasks]);

  const removeTag = useCallback(async (id: string, tag: string) => {
    try {
      setError(null);
      await taskService.removeTag(id, tag);
      await refreshTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove tag');
      throw err;
    }
  }, [refreshTasks]);

  return {
    tasks,
    loading,
    error,
    createTask,
    completeTask,
    moveToFuture,
    moveToPresent,
    deleteTask,
    addTag,
    removeTag,
    refreshTasks,
  };
}
```

### Step 5: Create Tag Component

```typescript
// src/components/Task/TaskTags.tsx

import React, { useState } from 'react';
import './TaskTags.css';

interface TaskTagsProps {
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}

export const TaskTags: React.FC<TaskTagsProps> = ({
  tags,
  onAddTag,
  onRemoveTag,
}) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onAddTag(input.trim());
      setInput('');
    }
  };

  return (
    <div className="task-tags">
      <div className="task-tags__list">
        {tags.map(tag => (
          <span key={tag} className="task-tags__tag">
            {tag}
            <button
              className="task-tags__remove"
              onClick={() => onRemoveTag(tag)}
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      
      <form className="task-tags__form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="task-tags__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add tag..."
        />
      </form>
    </div>
  );
};
```

### Step 6: Update TaskItem Component

```typescript
// src/components/Task/TaskItem.tsx

import { TaskTags } from './TaskTags';

interface TaskItemProps {
  task: Task;
  onComplete: (id: string) => void;
  onMoveToFuture: (id: string) => void;
  onMoveToPresent: (id: string) => void;
  onDelete: (id: string) => void;
  onAddTag: (id: string, tag: string) => void;
  onRemoveTag: (id: string, tag: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  // ... other props
  onAddTag,
  onRemoveTag,
}) => {
  return (
    <div className="task-item">
      {/* ... existing content ... */}
      
      <TaskTags
        tags={task.tags}
        onAddTag={(tag) => onAddTag(task.id, tag)}
        onRemoveTag={(tag) => onRemoveTag(task.id, tag)}
      />
    </div>
  );
};
```

## Example 2: Adding Due Dates

### Step 1: Update Types

```typescript
// src/types/index.ts

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  dueDate?: number;  // Unix timestamp
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}
```

### Step 2: Add Service Methods

```typescript
// src/services/taskService.ts

async setDueDate(id: string, dueDate: number): Promise<Task> {
  return taskStorage.updateTask(id, { 
    dueDate,
    updatedAt: Date.now() 
  });
}

async clearDueDate(id: string): Promise<Task> {
  return taskStorage.updateTask(id, { 
    dueDate: undefined,
    updatedAt: Date.now() 
  });
}

async getOverdueTasks(): Promise<Task[]> {
  const tasks = await taskStorage.getTasks();
  const now = Date.now();
  
  return tasks.filter(task => 
    task.dueDate && 
    task.dueDate < now && 
    task.category !== TaskCategory.PAST
  );
}
```

### Step 3: Create DatePicker Component

```typescript
// src/components/Task/TaskDatePicker.tsx

import React from 'react';
import './TaskDatePicker.css';

interface TaskDatePickerProps {
  dueDate?: number;
  onSetDate: (date: number) => void;
  onClearDate: () => void;
}

export const TaskDatePicker: React.FC<TaskDatePickerProps> = ({
  dueDate,
  onSetDate,
  onClearDate,
}) => {
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timestamp = new Date(e.target.value).getTime();
    onSetDate(timestamp);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toISOString().split('T')[0];
  };

  return (
    <div className="task-date-picker">
      <input
        type="date"
        className="task-date-picker__input"
        value={dueDate ? formatDate(dueDate) : ''}
        onChange={handleDateChange}
      />
      {dueDate && (
        <button
          className="task-date-picker__clear"
          onClick={onClearDate}
        >
          Clear
        </button>
      )}
    </div>
  );
};
```

## Example 3: Adding Search/Filter

### Step 1: Create Filter Hook

```typescript
// src/hooks/useTaskFilter.ts

import { useMemo, useState } from 'react';
import { Task } from '../types';

export function useTaskFilter(tasks: Task[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Search by title
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(task =>
        task.title.toLowerCase().includes(query)
      );
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      result = result.filter(task =>
        selectedTags.some(tag => task.tags?.includes(tag))
      );
    }

    return result;
  }, [tasks, searchQuery, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
  };

  return {
    filteredTasks,
    searchQuery,
    setSearchQuery,
    selectedTags,
    toggleTag,
    clearFilters,
  };
}
```

### Step 2: Create Search Component

```typescript
// src/components/Search/SearchBar.tsx

import React from 'react';
import './SearchBar.css';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search tasks...',
}) => {
  return (
    <div className="search-bar">
      <input
        type="text"
        className="search-bar__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button
          className="search-bar__clear"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </div>
  );
};
```

### Step 3: Integrate into CategoryView

```typescript
// src/components/CategoryView/CategoryView.tsx

import { useTaskFilter } from '../../hooks/useTaskFilter';
import { SearchBar } from '../Search/SearchBar';

export const CategoryView: React.FC<CategoryViewProps> = ({
  category,
  tasks,
  // ... other props
}) => {
  const {
    filteredTasks,
    searchQuery,
    setSearchQuery,
  } = useTaskFilter(tasks);

  return (
    <div className="category-view">
      <div className="category-view__header">
        {/* ... title and description ... */}
        
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      {/* Render filteredTasks instead of tasks */}
      <div className="category-view__list">
        {filteredTasks.map((task) => (
          <TaskItem key={task.id} task={task} {...handlers} />
        ))}
      </div>
    </div>
  );
};
```

## Example 4: Adding API Backend

### Step 1: Create API Storage Implementation

```typescript
// src/services/apiTaskStorage.ts

import { Task, CreateTaskDTO, UpdateTaskDTO, TaskCategory, ITaskStorage } from '../types';

export class APITaskStorage implements ITaskStorage {
  private baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  private authToken: string | null = null;

  setAuthToken(token: string) {
    this.authToken = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getTasks(): Promise<Task[]> {
    return this.request('/tasks');
  }

  async getTasksByCategory(category: TaskCategory): Promise<Task[]> {
    return this.request(`/tasks?category=${category}`);
  }

  async createTask(dto: CreateTaskDTO): Promise<Task> {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async updateTask(id: string, updates: UpdateTaskDTO): Promise<Task> {
    return this.request(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteTask(id: string): Promise<void> {
    await this.request(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }
}
```

### Step 2: Create Storage Factory

```typescript
// src/services/taskStorage.ts

import { LocalTaskStorage } from './localTaskStorage';
import { APITaskStorage } from './apiTaskStorage';

const USE_API = import.meta.env.VITE_USE_API === 'true';

export const taskStorage = USE_API 
  ? new APITaskStorage()
  : new LocalTaskStorage();
```

### Step 3: Add Sync Service

```typescript
// src/services/syncService.ts

export class SyncService {
  constructor(
    private localStorage: LocalTaskStorage,
    private apiStorage: APITaskStorage
  ) {}

  async syncToCloud(): Promise<void> {
    const localTasks = await this.localStorage.getTasks();
    const remoteTasks = await this.apiStorage.getTasks();

    // Simple sync: upload local tasks not in remote
    const localIds = new Set(localTasks.map(t => t.id));
    const remoteIds = new Set(remoteTasks.map(t => t.id));

    // Upload new local tasks
    for (const task of localTasks) {
      if (!remoteIds.has(task.id)) {
        await this.apiStorage.createTask(task);
      }
    }

    // Download new remote tasks
    for (const task of remoteTasks) {
      if (!localIds.has(task.id)) {
        await this.localStorage.createTask(task);
      }
    }
  }
}
```

## Example 5: Adding Notifications

### Step 1: Create Notification Service

```typescript
// src/services/notificationService.ts

export class NotificationService {
  private hasPermission = false;

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.hasPermission = true;
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
      return this.hasPermission;
    }

    return false;
  }

  notify(title: string, options?: NotificationOptions): void {
    if (!this.hasPermission) return;

    new Notification(title, {
      icon: '/icon.png',
      badge: '/badge.png',
      ...options,
    });
  }

  notifyTaskCompleted(taskTitle: string): void {
    this.notify('Task Completed', {
      body: taskTitle,
      tag: 'task-completed',
    });
  }

  notifyTaskDue(taskTitle: string): void {
    this.notify('Task Due', {
      body: taskTitle,
      tag: 'task-due',
      requireInteraction: true,
    });
  }
}

export const notificationService = new NotificationService();
```

### Step 2: Integrate into App

```typescript
// src/App.tsx

import { notificationService } from './services/notificationService';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    notificationService.requestPermission();
  }, []);

  // ... rest of app
}
```

### Step 3: Trigger Notifications

```typescript
// src/hooks/useTasks.ts

import { notificationService } from '../services/notificationService';

export function useTasks() {
  const completeTask = useCallback(async (id: string) => {
    const tasks = await taskService.getAllTasks();
    const task = tasks.find(t => t.id === id);
    
    await taskService.completeTask(id);
    await refreshTasks();
    
    if (task) {
      notificationService.notifyTaskCompleted(task.title);
    }
  }, [refreshTasks]);

  return { completeTask, /* ... */ };
}
```

These examples demonstrate how WorkBook's architecture supports clean, incremental feature additions without major refactoring.
