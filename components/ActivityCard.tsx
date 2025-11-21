import React from 'react';
import { Activity } from '../types';
import { UsersIcon, ClockIcon, LocationIcon } from './icons';
import ActivityImage from './ActivityImage';

interface ActivityCardProps {
  activity: Activity;
  onShowDetails: () => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, onShowDetails }) => {
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.location)}`;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
      <div className="h-32 w-full flex-shrink-0 overflow-hidden">
        <ActivityImage 
            activity={activity} 
            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-500"
            onClick={onShowDetails}
        />
      </div>
      
      <div className="p-3 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
            <span className="text-xs text-sky-500 font-semibold bg-sky-100 px-2 py-1 rounded-full whitespace-nowrap">{activity.category}</span>
            <div className="text-base font-bold text-green-600 flex items-center whitespace-nowrap mr-2">
                <span>{activity.price} ₪</span>
            </div>
        </div>
        <h3 
            className="text-base font-bold text-gray-800 flex-grow cursor-pointer hover:text-sky-600 transition-colors line-clamp-2"
            onClick={onShowDetails}
            title={activity.title}
        >
            {activity.title}
        </h3>
        
        <div className="mt-3 space-y-1.5 text-xs text-gray-600">
            <div className="flex items-center text-gray-600 hover:text-blue-600 transition-colors group">
                <LocationIcon className="w-3.5 h-3.5 ml-2 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
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
                <UsersIcon className="w-3.5 h-3.5 ml-2 text-gray-400 flex-shrink-0" />
                <span className="truncate">{activity.ageGroup}</span>
            </div>
             <div className="flex items-center">
                <ClockIcon className="w-3.5 h-3.5 ml-2 text-gray-400 flex-shrink-0" />
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