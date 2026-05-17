import React, { useState, useMemo } from 'react';
import { Task, TaskCategory, Priority } from '../../types';
import { TaskItem } from '../Task/TaskItem';
import { InlineTaskInput } from '../Task/InlineTaskInput';
import './CategoryView.css';

interface CategoryViewProps {
  category: TaskCategory;
  tasks: Task[];
  onCreateTask: (title: string, category: TaskCategory) => Promise<void>;
  onCompleteTask: (id: string) => void;
  onMoveToFuture: (id: string) => void;
  onMoveToPresent: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTaskTitle: (id: string, title: string) => void;
  onUpdatePriority?: (id: string, priority: Priority) => void;
  onReorderTasks: (category: TaskCategory, taskIds: string[]) => void;
}

const categoryLabels: Record<TaskCategory, string> = {
  [TaskCategory.PAST]: 'Past',
  [TaskCategory.PRESENT]: 'Present',
  [TaskCategory.FUTURE]: 'Future',
};

const categoryDescriptions: Record<TaskCategory, string> = {
  [TaskCategory.PAST]: 'Completed tasks',
  [TaskCategory.PRESENT]: 'Current focus',
  [TaskCategory.FUTURE]: 'Upcoming tasks',
};

export const CategoryView: React.FC<CategoryViewProps> = ({
  category,
  tasks,
  onCreateTask,
  onCompleteTask,
  onMoveToFuture,
  onMoveToPresent,
  onDeleteTask,
  onUpdateTaskTitle,
  onUpdatePriority,
  onReorderTasks,
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  const handleCreateTask = async (title: string) => {
    await onCreateTask(title, category);
  };

  // Helper function to convert priority to sort order
  const getPriorityValue = (priority?: Priority): number => {
    switch (priority) {
      case 'urgent': return 0;
      case 'important': return 1;
      default: return 2;
    }
  };

  // Sort tasks based on category
  const sortedTasks = useMemo(() => {
    if (category === TaskCategory.PRESENT) {
      // For Present tab: sort by priority (urgent > important > normal), then by order or creation time
      return [...tasks].sort((a, b) => {
        const priorityDiff = getPriorityValue(a.priority) - getPriorityValue(b.priority);
        if (priorityDiff !== 0) return priorityDiff;
        // Same priority: use order if available, otherwise creation time (newer first? Keep existing logic: order asc, then newer first)
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        return b.createdAt - a.createdAt;
      });
    } else {
      // For Past and Future tabs: keep original sorting (order then creation time)
      return [...tasks].sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        return b.createdAt - a.createdAt;
      });
    }
  }, [tasks, category]);

  const showInput = category !== TaskCategory.PAST;
  const isDraggable = category === TaskCategory.PRESENT || category === TaskCategory.FUTURE;

  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  const handleDragOver = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    if (draggedTaskId && draggedTaskId !== taskId) {
      setDragOverTaskId(taskId);
    }
  };

  const handleDrop = (e: React.DragEvent, dropTaskId: string) => {
    e.preventDefault();
    
    if (!draggedTaskId || draggedTaskId === dropTaskId) {
      setDragOverTaskId(null);
      return;
    }

    const draggedIndex = sortedTasks.findIndex(t => t.id === draggedTaskId);
    const dropIndex = sortedTasks.findIndex(t => t.id === dropTaskId);

    if (draggedIndex === -1 || dropIndex === -1) {
      setDragOverTaskId(null);
      return;
    }

    // Create new array with reordered tasks
    const newTasks = [...sortedTasks];
    const [draggedTask] = newTasks.splice(draggedIndex, 1);
    newTasks.splice(dropIndex, 0, draggedTask);

    // Extract IDs in new order
    const newTaskIds = newTasks.map(t => t.id);
    
    onReorderTasks(category, newTaskIds);
    setDragOverTaskId(null);
  };

  return (
    <div className="category-view">
      <div className="category-view__header">
        <h2 className="category-view__title">{categoryLabels[category]}</h2>
        <p className="category-view__description">{categoryDescriptions[category]}</p>
      </div>

      <div className="category-view__list">
        {showInput && (
          <InlineTaskInput
            onSubmit={handleCreateTask}
            placeholder="Type here to add a task..."
          />
        )}
        
        {sortedTasks.length === 0 && !showInput ? (
          <div className="category-view__empty">
            <svg
              className="category-view__empty-icon"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 11L12 14L22 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="category-view__empty-text">
              {category === TaskCategory.PAST
                ? 'No completed tasks yet'
                : category === TaskCategory.PRESENT
                ? 'No tasks in focus'
                : 'No upcoming tasks'}
            </p>
          </div>
        ) : (
          sortedTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onComplete={onCompleteTask}
              onMoveToFuture={onMoveToFuture}
              onMoveToPresent={onMoveToPresent}
              onDelete={onDeleteTask}
              onUpdateTitle={onUpdateTaskTitle}
              onUpdatePriority={onUpdatePriority}
              draggable={isDraggable}
              onDragStart={() => handleDragStart(task.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, task.id)}
              onDrop={(e) => handleDrop(e, task.id)}
              isDragging={draggedTaskId === task.id}
              isDragOver={dragOverTaskId === task.id}
            />
          ))
        )}
      </div>
    </div>
  );
};