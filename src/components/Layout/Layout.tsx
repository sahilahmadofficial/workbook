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

export const Layout: React.FC<LayoutProps> = ({
  activeCategory,
  onCategoryChange,
  children,
  userEmail,
  onSignOut,
}) => {
  return (
    <div className="layout">
      <header className="layout__header">
        <h1 className="layout__logo">WorkBook</h1>
        {userEmail && onSignOut && (
          <UserProfile userEmail={userEmail} onSignOut={onSignOut} />
        )}
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