import React, { useState } from 'react';
import './AdBanner.css';

interface AdBannerProps {
  isDummy?: boolean;
}

export const AdBanner: React.FC<AdBannerProps> = ({ isDummy = true }) => {
  const [isClosed, setIsClosed] = useState(false);

  if (isClosed) {
    return null;
  }

  // Premium upsell banner
  return (
    <div className="ad-banner ad-banner--premium">
      <div className="ad-banner__content">
        <div className="ad-banner__icon">✨</div>
        <div className="ad-banner__text">
          <span className="ad-banner__title">WorkBook Premium</span>
          <span className="ad-banner__subtitle">
            Unlimited tasks • Cloud sync • Priority support
          </span>
        </div>
        <button className="ad-banner__cta ad-banner__cta--premium">
          Upgrade
        </button>
        <button
          className="ad-banner__close"
          onClick={() => setIsClosed(true)}
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
};