import React from 'react';
import './Loader.css';

export type LoaderSize = 'small' | 'medium' | 'large';
export type LoaderVariant = 'spinner' | 'dots' | 'pulse';

interface LoaderProps {
  size?: LoaderSize;
  variant?: LoaderVariant;
  text?: string;
  fullScreen?: boolean;
}

export const Loader: React.FC<LoaderProps> = ({
  size = 'medium',
  variant = 'spinner',
  text,
  fullScreen = false,
}) => {
  const content = (
    <div className={`loader ${fullScreen ? 'loader--fullscreen' : ''}`}>
      <div className={`loader__container loader__container--${size}`}>
        {variant === 'spinner' && (
          <div className="loader__spinner">
            <svg className="loader__spinner-svg" viewBox="0 0 50 50">
              <circle
                className="loader__spinner-circle"
                cx="25"
                cy="25"
                r="20"
                fill="none"
                strokeWidth="4"
              />
            </svg>
          </div>
        )}
        
        {variant === 'dots' && (
          <div className="loader__dots">
            <div className="loader__dot"></div>
            <div className="loader__dot"></div>
            <div className="loader__dot"></div>
          </div>
        )}
        
        {variant === 'pulse' && (
          <div className="loader__pulse">
            <div className="loader__pulse-ring"></div>
            <div className="loader__pulse-ring"></div>
          </div>
        )}
        
        {text && <p className="loader__text">{text}</p>}
      </div>
    </div>
  );

  return content;
};