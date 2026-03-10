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

export function useTasks(): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Full refresh — only used on initial load and storage backend switches.
  // Never called after individual operations to avoid full UI re-renders.
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
      const newTask = await taskService.createTask(title, category);
      // Prepend the new task — no re-fetch needed
      setTasks((prev) => [newTask, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
      throw err;
    }
  }, []);

  const completeTask = useCallback(async (id: string) => {
    try {
      setError(null);
      const updatedTask = await taskService.completeTask(id);
      setTasks((prev) => prev.map((t) => (t.id === id ? updatedTask : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete task');
      throw err;
    }
  }, []);

  const moveToFuture = useCallback(async (id: string) => {
    try {
      setError(null);
      const updatedTask = await taskService.moveToFuture(id);
      setTasks((prev) => prev.map((t) => (t.id === id ? updatedTask : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move task');
      throw err;
    }
  }, []);

  const moveToPresent = useCallback(async (id: string) => {
    try {
      setError(null);
      const updatedTask = await taskService.moveToPresent(id);
      setTasks((prev) => prev.map((t) => (t.id === id ? updatedTask : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move task');
      throw err;
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    try {
      setError(null);
      await taskService.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
      throw err;
    }
  }, []);

  const updateTaskTitle = useCallback(async (id: string, title: string) => {
    try {
      setError(null);
      const updatedTask = await taskService.updateTaskTitle(id, title);
      setTasks((prev) => prev.map((t) => (t.id === id ? updatedTask : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
      throw err;
    }
  }, []);

  const reorderTasks = useCallback(async (category: TaskCategory, taskIds: string[]) => {
    try {
      setError(null);
      const updatedTasks = await taskService.reorderTasks(category, taskIds);
      setTasks((prev) => {
        const otherTasks = prev.filter((t) => t.category !== category);
        return [...otherTasks, ...updatedTasks];
      });
    } catch (err) {
      console.error('Reorder error in useTasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to reorder tasks');
      // Only refresh on error to restore correct state
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