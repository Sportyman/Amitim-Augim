import React from 'react';
import { Activity } from '../types';
import { UsersIcon, ClockIcon } from './icons';

interface ActivityCardProps {
  activity: Activity;
  onShowDetails: () => void;
}

const LocationIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
    </svg>
);

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, onShowDetails }) => {
  const getKeywords = () => {
    let titleKeywords = activity.title.split('-')[0].trim();
    return `${titleKeywords},${activity.category}`;
  };

  // Prefer user-provided imageUrl, fallback to unsplash, then seed fallback
  // Note: activity.imageUrl from DB form could be empty
  const imageUrl = activity.imageUrl && activity.imageUrl.length > 10 ? activity.imageUrl : `https://source.unsplash.com/400x300/?${encodeURIComponent(getKeywords())}`;
  
  // Use ID for seed, if string make it a number-like or hash
  const seedId = typeof activity.id === 'string' ? activity.id.charCodeAt(0) : activity.id;
  const fallbackUrl = `https://picsum.photos/seed/${seedId}/400/300`;

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (e.currentTarget.src !== fallbackUrl) {
        e.currentTarget.src = fallbackUrl;
    }
  };
  
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.location)}`;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 transition-all duration-300 flex flex-col">
      <img 
        className="w-full h-32 object-cover cursor-pointer" 
        src={imageUrl} 
        onError={handleImageError}
        alt={activity.title} 
        onClick={onShowDetails}
      />
      <div className="p-3 flex flex-col flex-grow">
        <div className="flex justify-between items-start">
            <span className="text-xs text-sky-500 font-semibold bg-sky-100 px-2 py-1 rounded-full">{activity.category}</span>
            <div className="text-base font-bold text-green-600 flex items-center">
                <span>{activity.price} ₪</span>
            </div>
        </div>
        <h3 
            className="mt-1 text-base font-bold text-gray-800 flex-grow cursor-pointer hover:text-sky-600 transition-colors"
            onClick={onShowDetails}
        >
            {activity.title}
        </h3>
        
        <div className="mt-2 space-y-1 text-xs text-gray-600">
            <div className="flex items-center text-gray-600 hover:text-blue-600 transition-colors group">
                <LocationIcon className="w-4 h-4 ml-2 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                <a 
                    href={mapUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="truncate hover:underline"
                    onClick={(e) => e.stopPropagation()}
                >
                    {activity.location}
                </a>
            </div>
            <div className="flex items-center">
                <UsersIcon className="w-4 h-4 ml-2 text-gray-400 flex-shrink-0" />
                <span className="truncate">{activity.ageGroup}</span>
            </div>
             <div className="flex items-center">
                <ClockIcon className="w-4 h-4 ml-2 text-gray-400 flex-shrink-0" />
                <span className="truncate">{activity.schedule}</span>
            </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-100">
             <button 
                onClick={onShowDetails}
                className="w-full text-center bg-sky-500 text-white px-3 py-2 rounded-full hover:bg-sky-600 transition-colors duration-300 block font-semibold text-sm"
            >
              לפרטים נוספים
            </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityCard;