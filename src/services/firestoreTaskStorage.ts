import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  Task,
  CreateTaskDTO,
  UpdateTaskDTO,
  TaskCategory,
  ITaskStorage,
  Priority,
} from '../types';

/**
 * Firestore implementation of task storage
 * Syncs tasks across devices in real-time
 */
export class FirestoreTaskStorage implements ITaskStorage {
  private userId: string;
  private collectionName = 'tasks';

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Get the user's tasks collection reference
   */
  private getUserTasksCollection() {
    return collection(db, 'users', this.userId, this.collectionName);
  }

  /**
   * Convert Firestore timestamp to number
   */
  private convertTimestamp(timestamp: any): number {
    if (timestamp instanceof Timestamp) {
      return timestamp.toMillis();
    }
    return timestamp;
  }

  /**
   * Convert Firestore document to Task
   */
  private docToTask(docId: string, data: any): Task {
    return {
      id: docId,
      title: data.title,
      category: data.category,
      createdAt: this.convertTimestamp(data.createdAt),
      updatedAt: this.convertTimestamp(data.updatedAt),
      completedAt: data.completedAt ? this.convertTimestamp(data.completedAt) : undefined,
      order: data.order,
      priority: data.priority || 'normal',  // default to 'normal' if not set
    };
  }

  async getTasks(): Promise<Task[]> {
    try {
      const tasksCollection = this.getUserTasksCollection();
      const q = query(tasksCollection, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const tasks: Task[] = [];
      querySnapshot.forEach((doc) => {
        tasks.push(this.docToTask(doc.id, doc.data()));
      });

      return tasks;
    } catch (error) {
      console.error('Error fetching tasks from Firestore:', error);
      throw new Error('Failed to fetch tasks');
    }
  }

  async getTasksByCategory(category: TaskCategory): Promise<Task[]> {
    try {
      const tasksCollection = this.getUserTasksCollection();
      const q = query(
        tasksCollection,
        where('category', '==', category),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);

      const tasks: Task[] = [];
      querySnapshot.forEach((doc) => {
        tasks.push(this.docToTask(doc.id, doc.data()));
      });

      return tasks;
    } catch (error) {
      console.error('Error fetching tasks by category:', error);
      throw new Error('Failed to fetch tasks');
    }
  }

  async createTask(dto: CreateTaskDTO): Promise<Task> {
    try {
      const tasksCollection = this.getUserTasksCollection();
      const now = Timestamp.now();

      const taskData = {
        title: dto.title,
        category: dto.category,
        createdAt: now,
        updatedAt: now,
        completedAt: dto.completedAt ? Timestamp.fromMillis(dto.completedAt) : null,
        order: dto.order ?? null,
        priority: dto.priority ?? 'normal',
      };

      const docRef = await addDoc(tasksCollection, taskData);

      return {
        id: docRef.id,
        title: dto.title,
        category: dto.category,
        createdAt: now.toMillis(),
        updatedAt: now.toMillis(),
        completedAt: dto.completedAt,
        order: dto.order,
        priority: dto.priority ?? 'normal',
      };
    } catch (error) {
      console.error('Error creating task in Firestore:', error);
      throw new Error('Failed to create task');
    }
  }

  async updateTask(id: string, updates: UpdateTaskDTO): Promise<Task> {
    try {
      const taskRef = doc(db, 'users', this.userId, this.collectionName, id);
      
      // Get current task data
      const taskSnap = await getDoc(taskRef);
      if (!taskSnap.exists()) {
        throw new Error(`Task with id ${id} not found`);
      }

      // Prepare update data
      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      // Convert completedAt to Timestamp if present
      if (updates.completedAt !== undefined) {
        updateData.completedAt = updates.completedAt 
          ? Timestamp.fromMillis(updates.completedAt)
          : null;
      }

      // Ensure priority is included if provided
      if (updates.priority !== undefined) {
        updateData.priority = updates.priority;
      }

      await updateDoc(taskRef, updateData);

      // Return updated task
      const updatedSnap = await getDoc(taskRef);
      return this.docToTask(id, updatedSnap.data());
    } catch (error) {
      console.error('Error updating task in Firestore:', error);
      throw new Error('Failed to update task');
    }
  }

  async deleteTask(id: string): Promise<void> {
    try {
      const taskRef = doc(db, 'users', this.userId, this.collectionName, id);
      await deleteDoc(taskRef);
    } catch (error) {
      console.error('Error deleting task from Firestore:', error);
      throw new Error('Failed to delete task');
    }
  }

  async reorderTasks(category: TaskCategory, taskIds: string[]): Promise<Task[]> {
    try {
      const batch = writeBatch(db);
      const now = Timestamp.now();

      // Update each task with its new order
      taskIds.forEach((taskId, index) => {
        const taskRef = doc(db, 'users', this.userId, this.collectionName, taskId);
        batch.update(taskRef, {
          order: index,
          updatedAt: now,
        });
      });

      // Wait for batch to complete
      await batch.commit();

      // Add a small delay to ensure Firestore is consistent
      await new Promise(resolve => setTimeout(resolve, 100));

      // Fetch and return updated tasks
      return await this.getTasksByCategory(category);
    } catch (error) {
      console.error('Error reordering tasks in Firestore:', error);
      throw new Error('Failed to reorder tasks');
    }
  }
}