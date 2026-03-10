import React, { useState, useRef, useEffect } from 'react';
import './InlineTaskInput.css';

interface InlineTaskInputProps {
  onSubmit: (title: string) => Promise<void>;
  placeholder?: string;
}

export const InlineTaskInput: React.FC<InlineTaskInputProps> = ({
  onSubmit,
  placeholder = 'Type here to add a task...',
}) => {
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    const trimmedValue = value.trim();
    if (!trimmedValue || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onSubmit(trimmedValue);
      setValue('');
      // Keep focus on input for continuous task entry
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleBlur = () => {
    // Submit on blur if there's content
    if (value.trim()) {
      handleSubmit();
    }
  };

  return (
    <div className="inline-task-input">
      <div className="inline-task-input__checkbox">
        <div className="inline-task-input__checkbox-placeholder" />
      </div>

      <div className="inline-task-input__content">
        <input
          ref={inputRef}
          type="text"
          className="inline-task-input__field"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={isSubmitting}
          autoFocus
        />
      </div>
    </div>
  );
};