import React from 'react';
import { Activity } from '../types';
import { UsersIcon, ClockIcon, LocationIcon } from './icons';

interface ActivityListItemProps {
  activity: Activity;
}
export const ActivityListItem: React.FC<ActivityListItemProps> = ({ activity }) => {
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
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 flex flex-col sm:flex-row hover:shadow-lg">
      <img 
        className="w-full h-40 sm:w-48 sm:h-auto object-cover" 
        src={unsplashUrl} 
        onError={handleImageError}
        alt={activity.title} 
      />
      <div className="p-4 flex flex-col flex-grow justify-between">
        <div>
            <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-gray-800">{activity.title}</h3>
                <div className="text-lg font-bold text-green-600 flex items-center flex-shrink-0 ml-4">
                    <span>{activity.price} ₪</span>
                </div>
            </div>
            <span className="text-xs text-orange-500 font-semibold bg-orange-100 px-2 py-1 rounded-full">{activity.category}</span>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                    <LocationIcon className="w-4 h-4 ml-2 text-gray-400" />
                    <span>{activity.location}</span>
                </div>
                <div className="flex items-center">
                    <UsersIcon className="w-4 h-4 ml-2 text-gray-400" />
                    <span>{activity.ageGroup}</span>
                </div>
                <div className="flex items-center col-span-1 md:col-span-2">
                    <ClockIcon className="w-4 h-4 ml-2 text-gray-400" />
                    <span>{activity.schedule}</span>
                </div>
            </div>
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-100 text-left">
             <a 
                href={activity.detailsUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block bg-orange-500 text-white px-5 py-2 rounded-full hover:bg-orange-600 transition-colors duration-300 font-semibold text-sm"
            >
              לפרטים נוספים
            </a>
        </div>
      </div>
    </div>
  );
};