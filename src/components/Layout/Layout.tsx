import React from 'react';
import { TaskCategory } from '../../types';
import { UserProfile } from '../Auth/UserProfile';
import { AdBanner } from '../AdBanner/AdBanner';
import './Layout.css';

interface LayoutProps {
  activeCategory: TaskCategory;
  onCategoryChange: (category: TaskCategory) => void;
  children: React.ReactNode;
  userEmail?: string;
  onSignOut?: () => void;
}

const categories = [
  { value: TaskCategory.PAST, label: 'Past' },
  { value: TaskCategory.PRESENT, label: 'Present' },
  { value: TaskCategory.FUTURE, label: 'Future' },
];

declare global {
  interface Window {
    electronAPI?: {
      closePanel: () => void;
    };
  }
}

export const Layout: React.FC<LayoutProps> = ({
  activeCategory,
  onCategoryChange,
  children,
  userEmail,
  onSignOut,
}) => {
  const handleClosePanel = () => {
    if (window.electronAPI && window.electronAPI.closePanel) {
      window.electronAPI.closePanel();
    }
  };

  return (
    <div className="layout">
      <header className="layout__header">
        <h1 className="layout__logo">WorkBook</h1>
        <div className="layout__header-actions">
          {userEmail && onSignOut && (
            <UserProfile userEmail={userEmail} onSignOut={onSignOut} />
          )}
          <button 
            className="layout__close-button" 
            onClick={handleClosePanel}
            title="Close panel"
            aria-label="Close panel"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </header>

      <nav className="layout__nav">
        {categories.map(({ value, label }) => (
          <button
            key={value}
            className={`layout__nav-button ${
              activeCategory === value ? 'layout__nav-button--active' : ''
            }`}
            onClick={() => onCategoryChange(value)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="layout__main">{children}</main>
      
      <AdBanner isDummy={true} />
    </div>
  );
};