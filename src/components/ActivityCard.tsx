import React from 'react';
import { Activity } from '../types';
import { UsersIcon, ClockIcon, LocationIcon } from './icons';

interface ActivityCardProps {
  activity: Activity;
}
export const ActivityCard: React.FC<ActivityCardProps> = ({ activity }) => {
  const getKeywords = () => {
    let titleKeywords = activity.title.split('-')[0].trim();
    return `${titleKeywords},${activity.category}`;
  };

  const unsplashUrl = `https://source.unsplash.com/400x300/?${encodeURIComponent(getKeywords())}`;
  const fallbackUrl = `https://picsum.photos/seed/${activity.id}/400/300`;

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (e.currentTarget.src !== fallbackUrl) {
        e.currentTarget.src = fallbackUrl;
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 transition-all duration-300 flex flex-col">
      <img 
        className="w-full h-32 object-cover" 
        src={unsplashUrl} 
        onError={handleImageError}
        alt={activity.title} 
      />
      <div className="p-3 flex flex-col flex-grow">
        <div className="flex justify-between items-start">
            <span className="text-xs text-orange-500 font-semibold bg-orange-100 px-2 py-1 rounded-full">{activity.category}</span>
            <div className="text-base font-bold text-green-600 flex items-center">
                <span>{activity.price} ₪</span>
            </div>
        </div>
        <h3 className="mt-1 text-base font-bold text-gray-800 flex-grow">{activity.title}</h3>
        
        <div className="mt-2 space-y-1 text-xs text-gray-600">
            <div className="flex items-center">
                <LocationIcon className="w-4 h-4 ml-2 text-gray-400 flex-shrink-0" />
                <span className="truncate">{activity.location}</span>
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
             <a 
                href={activity.detailsUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full text-center bg-orange-500 text-white px-3 py-2 rounded-full hover:bg-orange-600 transition-colors duration-300 block font-semibold text-sm"
            >
              לפרטים נוספים
            </a>
        </div>
      </div>
    </div>
  );
};