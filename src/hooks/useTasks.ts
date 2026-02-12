import { useState, useEffect, useCallback } from 'react';
import { Task, TaskCategory } from '../types';
import { taskService } from '../services/taskService';

interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  createTask: (title: string, category?: TaskCategory) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  moveToFuture: (id: string) => Promise<void>;
  moveToPresent: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  updateTaskTitle: (id: string, title: string) => Promise<void>;
  reorderTasks: (category: TaskCategory, taskIds: string[]) => Promise<void>;
  refreshTasks: () => Promise<void>;
}

/**
 * Custom hook for task management
 * Centralizes all task-related state and operations
 */
export function useTasks(): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const allTasks = await taskService.getAllTasks();
      setTasks(allTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
      console.error('Failed to refresh tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  const createTask = useCallback(async (title: string, category?: TaskCategory) => {
    try {
      setError(null);
      await taskService.createTask(title, category);
      await refreshTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
      throw err;
    }
  }, [refreshTasks]);

  const completeTask = useCallback(async (id: string) => {
    try {
      setError(null);
      await taskService.completeTask(id);
      await refreshTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete task');
      throw err;
    }
  }, [refreshTasks]);

  const moveToFuture = useCallback(async (id: string) => {
    try {
      setError(null);
      await taskService.moveToFuture(id);
      await refreshTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move task');
      throw err;
    }
  }, [refreshTasks]);

  const moveToPresent = useCallback(async (id: string) => {
    try {
      setError(null);
      await taskService.moveToPresent(id);
      await refreshTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move task');
      throw err;
    }
  }, [refreshTasks]);

  const deleteTask = useCallback(async (id: string) => {
    try {
      setError(null);
      await taskService.deleteTask(id);
      await refreshTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
      throw err;
    }
  }, [refreshTasks]);

  const updateTaskTitle = useCallback(async (id: string, title: string) => {
    try {
      setError(null);
      await taskService.updateTaskTitle(id, title);
      await refreshTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
      throw err;
    }
  }, [refreshTasks]);

  const reorderTasks = useCallback(async (category: TaskCategory, taskIds: string[]) => {
    try {
      setError(null);
      const updatedTasks = await taskService.reorderTasks(category, taskIds);
      
      // Update tasks state optimistically with the returned tasks
      setTasks((prevTasks) => {
        // Remove old category tasks and add updated ones
        const otherTasks = prevTasks.filter(t => t.category !== category);
        return [...otherTasks, ...updatedTasks];
      });
    } catch (err) {
      console.error('Reorder error in useTasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to reorder tasks');
      // Refresh on error to restore correct state
      try {
        await refreshTasks();
      } catch (refreshErr) {
        console.error('Failed to refresh after reorder error:', refreshErr);
      }
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
    updateTaskTitle,
    reorderTasks,
    refreshTasks,
  };
}