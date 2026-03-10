import React, { useState, useRef, useEffect } from 'react';
import './UserProfile.css';

interface UserProfileProps {
  userEmail: string;
  userPhotoURL?: string | null;
  onSignOut: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ userEmail, userPhotoURL, onSignOut }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get initials from email
  const getInitials = (email: string): string => {
    const username = email.split('@')[0];
    return username.slice(0, 2).toUpperCase();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="user-profile" ref={dropdownRef}>
      <button
        className="user-profile__trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User menu"
      >
        <div className="user-profile__avatar">
          {userPhotoURL && !imgError ? (
            <img
              src={userPhotoURL}
              alt={userEmail}
              className="user-profile__avatar-img"
              onError={() => setImgError(true)}
              referrerPolicy="no-referrer"
            />
          ) : (
            getInitials(userEmail)
          )}
        </div>
      </button>

      {isOpen && (
        <div className="user-profile__dropdown">
          <div className="user-profile__info">
            <div className="user-profile__email">{userEmail}</div>
          </div>
          
          <div className="user-profile__divider" />
          
          <button
            className="user-profile__menu-item"
            onClick={() => {
              onSignOut();
              setIsOpen(false);
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V3.33333C2 2.97971 2.14048 2.64057 2.39052 2.39052C2.64057 2.14048 2.97971 2 3.33333 2H6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10.6667 11.3333L14 8L10.6667 4.66667"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14 8H6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};