import React, { useState, FormEvent, useRef, useEffect } from 'react';
import './TaskInput.css';

interface TaskInputProps {
  onSubmit: (title: string) => Promise<void>;
  placeholder?: string;
}

export const TaskInput: React.FC<TaskInputProps> = ({
  onSubmit,
  placeholder = 'Add a new task...',
}) => {
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    const trimmedValue = value.trim();
    if (!trimmedValue || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onSubmit(trimmedValue);
      setValue('');
      // Refocus the input after successful submission
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="task-input" onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        type="text"
        className="task-input__field"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={isSubmitting}
        autoFocus
      />
      <button
        type="submit"
        className="task-input__button"
        disabled={!value.trim() || isSubmitting}
        aria-label="Add task"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 5V15M5 10H15"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </form>
  );
};