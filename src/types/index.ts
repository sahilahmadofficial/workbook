/**
 * Task Categories
 */
export enum TaskCategory {
  PAST = 'past',
  PRESENT = 'present',
  FUTURE = 'future',
}

/**
 * Core Task interface
 */
export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  order?: number;
}

/**
 * Task creation payload (omits auto-generated fields)
 */
export type CreateTaskDTO = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Task update payload
 */
export type UpdateTaskDTO = Partial<Omit<Task, 'id' | 'createdAt'>>;

/**
 * Storage interface - abstraction for future backend integration
 */
export interface ITaskStorage {
  getTasks(): Promise<Task[]>;
  getTasksByCategory(category: TaskCategory): Promise<Task[]>;
  createTask(task: CreateTaskDTO): Promise<Task>;
  updateTask(id: string, updates: UpdateTaskDTO): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  reorderTasks(category: TaskCategory, taskIds: string[]): Promise<Task[]>;
}

/**
 * Application state
 */
export interface AppState {
  tasks: Task[];
  activeCategory: TaskCategory;
  loading: boolean;
  error: string | null;
}
