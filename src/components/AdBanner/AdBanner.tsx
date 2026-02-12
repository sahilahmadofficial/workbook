import React from 'react';
import './AdBanner.css';

interface AdBannerProps {
  isDummy?: boolean;
}

export const AdBanner: React.FC<AdBannerProps> = ({ isDummy = true }) => {
  if (isDummy) {
    return (
      <div className="ad-banner ad-banner--dummy">
        <div className="ad-banner__content">
          <div className="ad-banner__icon">📢</div>
          <div className="ad-banner__text">
            <span className="ad-banner__title">Advertisement Space</span>
            <span className="ad-banner__subtitle">Your ad could be here</span>
          </div>
          <button className="ad-banner__cta">Learn More</button>
        </div>
      </div>
    );
  }

  // Real ad implementation would go here
  return (
    <div className="ad-banner">
      {/* AdSense or other ad network code */}
    </div>
  );
};
