import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TaskCategory, Priority } from './types';
import { useTasks } from './hooks/useTasks';
import { useToast } from './hooks/useToast';
import { useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout/Layout';
import { CategoryView } from './components/CategoryView/CategoryView';
import { ToastContainer } from './components/Toast/ToastContainer';
import { AuthScreen } from './components/Auth/AuthScreen';
import { Loader } from './components/Loader/Loader';
import { ToastType } from './components/Toast/Toast';
import { taskStorage, LocalTaskStorage } from './services/taskStorage';
import { FirestoreTaskStorage } from './services/firestoreTaskStorage';
import './styles/globals.css';

function App() {
  const [activeCategory, setActiveCategory] = useState<TaskCategory>(TaskCategory.PRESENT);
  const { toasts, showToast, dismissToast, clearToasts } = useToast();
  const { user, loading: authLoading, error: authError, signIn, signUp, signInWithGoogle, signOut, pendingVerification, resendVerification } = useAuth();
  const prevUserRef = useRef(user);
  const authInitializedRef = useRef(false);

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
    updateTaskPriority,
    reorderTasks,
    refreshTasks,
  } = useTasks();

  useEffect(() => {
    if (!authLoading) {
      if (!authInitializedRef.current) {
        authInitializedRef.current = true;
        prevUserRef.current = user;
        return;
      }

      if (!prevUserRef.current && user) {
        clearToasts();
        showToast('Signed in successfully', ToastType.SUCCESS);
      }
      prevUserRef.current = user;
    }
  }, [user, authLoading, clearToasts, showToast]);

  useEffect(() => {
    const switchStorage = async () => {
      if (user) {
        try {
          console.log('Switching to Firestore storage for user:', user.uid);
          const firestoreStorage = new FirestoreTaskStorage(user.uid);
          (taskStorage as any).storage = firestoreStorage;
          await refreshTasks();
        } catch (error) {
          console.error('Failed to initialize Firestore storage:', error);
          showToast('Failed to connect to cloud storage', ToastType.ERROR);
        }
      } else {
        console.log('Using LocalStorage');
        const localStorage = new LocalTaskStorage();
        (taskStorage as any).storage = localStorage;
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

  const handleUpdatePriority = async (id: string, priority: Priority) => {
    try {
      await updateTaskPriority(id, priority);
      showToast(`Priority set to ${priority}`, ToastType.SUCCESS);
    } catch (error) {
      showToast('Failed to update priority', ToastType.ERROR);
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

  if (authLoading) {
    return <Loader fullScreen size="large" text="Loading..." />;
  }

  if (!user) {
    return (
      <>
        <AuthScreen
          onSignIn={signIn}
          onSignUp={signUp}
          onSignInWithGoogle={signInWithGoogle}
          onResendVerification={resendVerification}
          error={authError}
          loading={authLoading}
          pendingVerification={pendingVerification}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} onDismissAll={clearToasts} />
      </>
    );
  }

  if (loading) {
    return <Loader fullScreen size="large" text="Loading tasks..." />;
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
      userPhotoURL={user.photoURL}
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
        onUpdatePriority={handleUpdatePriority}
        onReorderTasks={handleReorderTasks}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} onDismissAll={clearToasts} />
    </Layout>
  );
}

export default App;