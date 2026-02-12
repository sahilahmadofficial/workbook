import { Task, TaskCategory, CreateTaskDTO, UpdateTaskDTO } from '../types';
import { taskStorage } from './taskStorage';

/**
 * Task service - business logic layer
 * This abstraction allows for easy testing and future API integration
 */
export class TaskService {
  async getAllTasks(): Promise<Task[]> {
    return taskStorage.getTasks();
  }

  async getTasksByCategory(category: TaskCategory): Promise<Task[]> {
    return taskStorage.getTasksByCategory(category);
  }

  async createTask(title: string, category: TaskCategory = TaskCategory.PRESENT): Promise<Task> {
    if (!title.trim()) {
      throw new Error('Task title cannot be empty');
    }

    const dto: CreateTaskDTO = {
      title: title.trim(),
      category,
    };

    return taskStorage.createTask(dto);
  }

  async completeTask(id: string): Promise<Task> {
    const updates: UpdateTaskDTO = {
      category: TaskCategory.PAST,
      completedAt: Date.now(),
      updatedAt: Date.now(),
    };

    return taskStorage.updateTask(id, updates);
  }

  async moveToFuture(id: string): Promise<Task> {
    const updates: UpdateTaskDTO = {
      category: TaskCategory.FUTURE,
      updatedAt: Date.now(),
    };

    return taskStorage.updateTask(id, updates);
  }

  async moveToPresent(id: string): Promise<Task> {
    const updates: UpdateTaskDTO = {
      category: TaskCategory.PRESENT,
      updatedAt: Date.now(),
    };

    return taskStorage.updateTask(id, updates);
  }

  async deleteTask(id: string): Promise<void> {
    return taskStorage.deleteTask(id);
  }

  async updateTaskTitle(id: string, title: string): Promise<Task> {
    if (!title.trim()) {
      throw new Error('Task title cannot be empty');
    }

    const updates: UpdateTaskDTO = {
      title: title.trim(),
      updatedAt: Date.now(),
    };

    return taskStorage.updateTask(id, updates);
  }

  async reorderTasks(category: TaskCategory, taskIds: string[]): Promise<Task[]> {
    return taskStorage.reorderTasks(category, taskIds);
  }
}

/**
 * Singleton service instance
 */
export const taskService = new TaskService();