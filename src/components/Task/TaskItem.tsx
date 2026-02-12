import React, { useState, useRef, useEffect } from 'react';
import { Task, TaskCategory } from '../../types';
import './TaskItem.css';

interface TaskItemProps {
  task: Task;
  onComplete: (id: string) => void;
  onMoveToFuture: (id: string) => void;
  onMoveToPresent: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onComplete,
  onMoveToFuture,
  onMoveToPresent,
  onDelete,
  onUpdateTitle,
  draggable = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragging = false,
  isDragOver = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleCheckboxChange = () => {
    if (isPast) {
      // If task is in Past, move it back to Present
      onMoveToPresent(task.id);
    } else {
      // If task is in Present or Future, complete it
      onComplete(task.id);
    }
  };

  const handleTitleClick = () => {
    setIsEditing(true);
  };

  const handleEditSubmit = () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue && trimmedValue !== task.title) {
      onUpdateTitle(task.id, trimmedValue);
    } else if (!trimmedValue) {
      // If empty, restore original title
      setEditValue(task.title);
    }
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      setEditValue(task.title);
      setIsEditing(false);
    }
  };

  const handleEditBlur = () => {
    handleEditSubmit();
  };

  const handleMoveToFuture = () => {
    onMoveToFuture(task.id);
  };

  const handleMoveToPresent = () => {
    onMoveToPresent(task.id);
  };

  const handleDelete = () => {
    onDelete(task.id);
  };

  const isPast = task.category === TaskCategory.PAST;
  const isFuture = task.category === TaskCategory.FUTURE;

  return (
    <div
      className={`task-item ${isPast ? 'task-item--completed' : ''} ${isDragging ? 'task-item--dragging' : ''} ${isDragOver ? 'task-item--drag-over' : ''}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="task-item__checkbox-wrapper">
        <input
          type="checkbox"
          id={`task-${task.id}`}
          className="task-item__checkbox"
          checked={isPast}
          onChange={handleCheckboxChange}
          aria-label={isPast ? "Mark task as incomplete" : "Mark task as complete"}
        />
        <label htmlFor={`task-${task.id}`} className="task-item__checkbox-label" />
      </div>

      <div className="task-item__content" onClick={!isEditing ? handleTitleClick : undefined}>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="task-item__title-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={handleEditBlur}
          />
        ) : (
          <span className="task-item__title">{task.title}</span>
        )}
      </div>

      <div className="task-item__actions">
        {!isPast && (
          <>
            {isFuture ? (
              <button
                className="task-item__button task-item__button--present"
                onClick={handleMoveToPresent}
                aria-label="Move to present"
                title="Move to Present"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 4.5V8L10.5 9.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ) : (
              <button
                className="task-item__button task-item__button--future"
                onClick={handleMoveToFuture}
                aria-label="Move to future"
                title="Move to Future"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M13 5.5V3.5C13 3.23478 12.8946 2.98043 12.7071 2.79289C12.5196 2.60536 12.2652 2.5 12 2.5H4C3.73478 2.5 3.48043 2.60536 3.29289 2.79289C3.10536 2.98043 3 3.23478 3 3.5V12.5C3 12.7652 3.10536 13.0196 3.29289 13.2071C3.48043 13.3946 3.73478 13.5 4 13.5H7"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6 6H10M6 8.5H8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10.5 13.5V10.5M10.5 10.5L9 12M10.5 10.5L12 12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </>
        )}
        
        <button
          className="task-item__button task-item__button--delete"
          onClick={handleDelete}
          aria-label="Delete task"
          title="Delete"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 4L4 12M4 4L12 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
