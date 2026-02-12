import React, { useState, useMemo, useEffect } from 'react';
import { TaskCategory } from './types';
import { useTasks } from './hooks/useTasks';
import { useToast } from './hooks/useToast';
import { useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout/Layout';
import { CategoryView } from './components/CategoryView/CategoryView';
import { ToastContainer } from './components/Toast/ToastContainer';
import { AuthScreen } from './components/Auth/AuthScreen';
import { ToastType } from './components/Toast/Toast';
import { taskStorage, LocalTaskStorage } from './services/taskStorage';
import { FirestoreTaskStorage } from './services/firestoreTaskStorage';
import './styles/globals.css';

function App() {
  const [activeCategory, setActiveCategory] = useState<TaskCategory>(TaskCategory.PRESENT);
  const { toasts, showToast, dismissToast } = useToast();
  const { user, loading: authLoading, error: authError, signIn, signUp, signInWithGoogle, signOut } = useAuth();
  
  const {
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
  } = useTasks();

  // Switch storage based on authentication
  useEffect(() => {
    const switchStorage = async () => {
      if (user) {
        // Use Firestore when authenticated
        try {
          console.log('Switching to Firestore storage for user:', user.uid);
          const firestoreStorage = new FirestoreTaskStorage(user.uid);
          (taskStorage as any).storage = firestoreStorage;
          
          // Refresh tasks after switching to Firestore
          await refreshTasks();
        } catch (error) {
          console.error('Failed to initialize Firestore storage:', error);
          showToast('Failed to connect to cloud storage', ToastType.ERROR);
        }
      } else {
        // Use localStorage when not authenticated
        console.log('Using LocalStorage');
        const localStorage = new LocalTaskStorage();
        (taskStorage as any).storage = localStorage;
        
        // Refresh tasks after switching to LocalStorage
        await refreshTasks();
      }
    };

    switchStorage();
  }, [user, refreshTasks, showToast]);

  const categoryTasks = useMemo(() => {
    return tasks.filter(task => task.category === activeCategory);
  }, [tasks, activeCategory]);

  const handleCreateTask = async (title: string, category: TaskCategory) => {
    try {
      await createTask(title, category);
      showToast('Task created successfully', ToastType.SUCCESS);
    } catch (error) {
      showToast('Failed to create task', ToastType.ERROR);
      throw error;
    }
  };

  const handleCompleteTask = async (id: string) => {
    try {
      await completeTask(id);
      showToast('Task completed', ToastType.SUCCESS);
    } catch (error) {
      showToast('Failed to complete task', ToastType.ERROR);
    }
  };

  const handleMoveToFuture = async (id: string) => {
    try {
      await moveToFuture(id);
      showToast('Task moved to Future', ToastType.INFO);
    } catch (error) {
      showToast('Failed to move task', ToastType.ERROR);
    }
  };

  const handleMoveToPresent = async (id: string) => {
    try {
      const task = tasks.find(t => t.id === id);
      const isFromPast = task?.category === TaskCategory.PAST;
      
      await moveToPresent(id);
      
      if (isFromPast) {
        showToast('Task marked as incomplete', ToastType.INFO);
      } else {
        showToast('Task moved to Present', ToastType.INFO);
      }
    } catch (error) {
      showToast('Failed to move task', ToastType.ERROR);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(id);
      showToast('Task deleted', ToastType.INFO);
    } catch (error) {
      showToast('Failed to delete task', ToastType.ERROR);
    }
  };

  const handleUpdateTaskTitle = async (id: string, title: string) => {
    try {
      await updateTaskTitle(id, title);
      showToast('Task updated', ToastType.SUCCESS);
    } catch (error) {
      showToast('Failed to update task', ToastType.ERROR);
    }
  };

  const handleReorderTasks = async (category: TaskCategory, taskIds: string[]) => {
    try {
      console.log('Starting reorder...', { category, taskIds });
      await reorderTasks(category, taskIds);
      console.log('Reorder completed successfully');
    } catch (error) {
      console.error('Reorder error in handler:', error);
      showToast('Failed to reorder tasks', ToastType.ERROR);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      showToast('Signed out successfully', ToastType.INFO);
    } catch (error) {
      showToast('Failed to sign out', ToastType.ERROR);
    }
  };

  // Show auth screen if not authenticated
  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: 'var(--color-text-secondary)',
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthScreen
          onSignIn={signIn}
          onSignUp={signUp}
          onSignInWithGoogle={signInWithGoogle}
          error={authError}
          loading={authLoading}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: 'var(--color-text-secondary)',
      }}>
        Loading tasks...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: 'var(--color-danger)',
        padding: '2rem',
        textAlign: 'center',
        gap: '1rem',
      }}>
        <div>
          <p style={{ fontSize: '18px', fontWeight: 600 }}>Error loading tasks</p>
          <p style={{ fontSize: '14px', marginTop: '0.5rem' }}>{error}</p>
        </div>
        <button
          onClick={() => refreshTasks()}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'var(--color-accent)',
            color: 'white',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <Layout 
      activeCategory={activeCategory} 
      onCategoryChange={setActiveCategory}
      userEmail={user.email || undefined}
      onSignOut={handleSignOut}
    >
      <CategoryView
        category={activeCategory}
        tasks={categoryTasks}
        onCreateTask={handleCreateTask}
        onCompleteTask={handleCompleteTask}
        onMoveToFuture={handleMoveToFuture}
        onMoveToPresent={handleMoveToPresent}
        onDeleteTask={handleDeleteTask}
        onUpdateTaskTitle={handleUpdateTaskTitle}
        onReorderTasks={handleReorderTasks}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </Layout>
  );
}

export default App;