import {
  Task,
  CreateTaskDTO,
  UpdateTaskDTO,
  TaskCategory,
  ITaskStorage,
  Priority,
} from '../types';

const STORAGE_KEY = 'workbook_tasks';
const STORAGE_VERSION_KEY = 'workbook_version';
const CURRENT_VERSION = '1.0';

/**
 * LocalStorage implementation of task storage
 * Designed to be easily swapped with API-based storage
 */
export class LocalTaskStorage implements ITaskStorage {
  constructor() {
    this.initializeStorage();
  }

  private initializeStorage(): void {
    try {
      const version = localStorage.getItem(STORAGE_VERSION_KEY);
      if (!version || version !== CURRENT_VERSION) {
        console.log('Initializing storage with version:', CURRENT_VERSION);
        localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_VERSION);
      }
      
      // Verify storage is accessible
      const testKey = 'workbook_test';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
    } catch (error) {
      console.error('LocalStorage not accessible:', error);
    }
  }

  private async delay(ms: number = 0): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private readStorage(): Task[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        return [];
      }
      
      const tasks = JSON.parse(data);
      
      // Validate tasks array
      if (!Array.isArray(tasks)) {
        console.error('Invalid tasks data in storage, resetting...');
        return [];
      }
      
      // Filter out any invalid tasks and ensure priority defaults
      const validTasks = tasks.filter(task => 
        task && 
        typeof task.id === 'string' && 
        typeof task.title === 'string' &&
        typeof task.category === 'string' &&
        Object.values(TaskCategory).includes(task.category)
      ).map(task => ({
        ...task,
        priority: task.priority || 'normal',  // default for old tasks
      }));
      
      if (validTasks.length !== tasks.length) {
        console.warn(`Filtered out ${tasks.length - validTasks.length} invalid tasks`);
        this.writeStorage(validTasks);
      }
      
      return validTasks;
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return [];
    }
  }

  private writeStorage(tasks: Task[]): void {
    try {
      const data = JSON.stringify(tasks);
      localStorage.setItem(STORAGE_KEY, data);
      
      // Verify write was successful
      const verification = localStorage.getItem(STORAGE_KEY);
      if (verification !== data) {
        throw new Error('Storage verification failed');
      }
    } catch (error) {
      console.error('Failed to write to localStorage:', error);
      throw new Error('Failed to save tasks');
    }
  }

  async getTasks(): Promise<Task[]> {
    await this.delay(50);
    return this.readStorage();
  }

  async getTasksByCategory(category: TaskCategory): Promise<Task[]> {
    await this.delay(50);
    const tasks = this.readStorage();
    return tasks.filter(task => task.category === category);
  }

  async createTask(dto: CreateTaskDTO): Promise<Task> {
    await this.delay(50);
    
    const task: Task = {
      ...dto,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      priority: dto.priority ?? 'normal',  // default priority
    };

    const tasks = this.readStorage();
    tasks.push(task);
    this.writeStorage(tasks);

    return task;
  }

  async updateTask(id: string, updates: UpdateTaskDTO): Promise<Task> {
    await this.delay(50);
    
    const tasks = this.readStorage();
    const index = tasks.findIndex(task => task.id === id);

    if (index === -1) {
      throw new Error(`Task with id ${id} not found`);
    }

    const updatedTask: Task = {
      ...tasks[index],
      ...updates,
      updatedAt: Date.now(),
    };

    tasks[index] = updatedTask;
    this.writeStorage(tasks);

    return updatedTask;
  }

  async deleteTask(id: string): Promise<void> {
    await this.delay(50);
    
    const tasks = this.readStorage();
    const filtered = tasks.filter(task => task.id !== id);

    if (filtered.length === tasks.length) {
      throw new Error(`Task with id ${id} not found`);
    }

    this.writeStorage(filtered);
  }

  async reorderTasks(category: TaskCategory, taskIds: string[]): Promise<Task[]> {
    await this.delay(50);
    
    const tasks = this.readStorage();
    const categoryTasks = tasks.filter(task => task.category === category);
    const otherTasks = tasks.filter(task => task.category !== category);
    
    // Create a map of task IDs to tasks for quick lookup
    const taskMap = new Map(categoryTasks.map(task => [task.id, task]));
    
    // Reorder tasks based on taskIds array
    const reorderedCategoryTasks = taskIds
      .map(id => taskMap.get(id))
      .filter((task): task is Task => task !== undefined);
    
    // Update the order field for each task (preserve other fields including priority)
    const updatedCategoryTasks = reorderedCategoryTasks.map((task, index) => ({
      ...task,
      order: index,
      updatedAt: Date.now(),
    }));
    
    // Combine and save
    const allTasks = [...otherTasks, ...updatedCategoryTasks];
    this.writeStorage(allTasks);
    
    return updatedCategoryTasks;
  }
}

/**
 * Task Storage Proxy
 * Allows switching between LocalStorage and Firestore dynamically
 */
class TaskStorageProxy implements ITaskStorage {
  public storage: ITaskStorage;

  constructor() {
    this.storage = new LocalTaskStorage();
  }

  async getTasks(): Promise<Task[]> {
    return this.storage.getTasks();
  }

  async getTasksByCategory(category: TaskCategory): Promise<Task[]> {
    return this.storage.getTasksByCategory(category);
  }

  async createTask(dto: CreateTaskDTO): Promise<Task> {
    return this.storage.createTask(dto);
  }

  async updateTask(id: string, updates: UpdateTaskDTO): Promise<Task> {
    return this.storage.updateTask(id, updates);
  }

  async deleteTask(id: string): Promise<void> {
    return this.storage.deleteTask(id);
  }

  async reorderTasks(category: TaskCategory, taskIds: string[]): Promise<Task[]> {
    return this.storage.reorderTasks(category, taskIds);
  }
}

/**
 * Singleton instance - can be switched between localStorage and Firestore
 */
export const taskStorage = new TaskStorageProxy();