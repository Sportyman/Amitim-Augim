import React, { useState, useEffect } from 'react';
import { Activity } from '../types';

interface ActivityImageProps {
  activity: Activity;
  className?: string;
  onClick?: () => void;
}

const ActivityImage: React.FC<ActivityImageProps> = ({ activity, className, onClick }) => {
  const [currentSrc, setCurrentSrc] = useState<string>('');

  const getKeywords = () => {
    const titleKeywords = activity.title.split('-')[0].trim();
    return `${titleKeywords},${activity.category}`;
  };

  // Deterministic fallback using ID
  const seedId = typeof activity.id === 'string' ? activity.id.charCodeAt(0) : activity.id;
  const deterministicFallback = `https://picsum.photos/seed/${seedId}/400/300`;

  useEffect(() => {
      // 1. User provided URL
      if (activity.imageUrl && activity.imageUrl.length > 10) {
          setCurrentSrc(activity.imageUrl);
      } else {
          // 2. Unsplash (Smart fallback based on text)
          // Note: Unsplash source API redirects, so we use it as a src. 
          // If it fails (e.g. rate limit), onError will catch it.
          const unsplashUrl = `https://source.unsplash.com/400x300/?${encodeURIComponent(getKeywords())}`;
          setCurrentSrc(unsplashUrl);
      }
  }, [activity]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
      // If the current source failed, and it wasn't already the deterministic fallback, switch to it.
      if (currentSrc !== deterministicFallback) {
          setCurrentSrc(deterministicFallback);
      }
  };

  return (
    <img 
      src={currentSrc} 
      alt={activity.title} 
      className={`bg-gray-100 ${className || ''}`}
      onError={handleError}
      onClick={onClick}
      loading="lazy"
    />
  );
};

export default ActivityImage;