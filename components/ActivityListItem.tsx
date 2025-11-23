
import React from 'react';
import { Activity } from '../types';
import { ClockIcon, LocationIcon, UsersIcon } from './icons';
import ActivityImage from './ActivityImage';

interface ActivityListItemProps {
  activity: Activity;
  onShowDetails: () => void;
}

const ActivityListItem: React.FC<ActivityListItemProps> = ({ activity, onShowDetails }) => {
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.location)}`;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 flex flex-col sm:flex-row hover:shadow-lg">
      <div className="w-full h-40 sm:w-48 sm:h-auto flex-shrink-0">
        <ActivityImage 
            activity={activity}
            className="w-full h-full object-cover cursor-pointer"
            onClick={onShowDetails}
        />
      </div>
      
      <div className="p-4 flex flex-col flex-grow justify-between">
        <div>
            <div className="flex justify-between items-start">
                <div>
                    <h3 
                        className="text-lg font-bold text-gray-900 cursor-pointer hover:text-sky-600 transition-colors"
                        onClick={onShowDetails}
                    >
                        {activity.title}
                    </h3>
                    
                    {/* NEW: Group Name */}
                    {activity.groupName && (
                        <p className="text-sky-600 font-medium mt-0.5">
                            {activity.groupName}
                        </p>
                    )}
                </div>
                <div className="text-lg font-bold text-green-600 flex items-center flex-shrink-0 ml-4">
                    <span>{activity.price} ₪</span>
                </div>
            </div>
            
            <div className="mt-2">
                <span className="text-xs text-sky-500 font-semibold bg-sky-100 px-2 py-1 rounded-full inline-block">{activity.category}</span>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600">
                <div className="flex items-center hover:text-blue-600 transition-colors group">
                    <LocationIcon className="w-4 h-4 ml-2 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                    <a 
                        href={mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline truncate"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {activity.location}
                    </a>
                </div>
                
                <div className="flex items-center text-gray-500">
                    <UsersIcon className="w-4 h-4 ml-2 text-gray-400 flex-shrink-0" />
                    <span>{activity.ageGroup}</span>
                </div>

                <div className="flex items-start col-span-1 md:col-span-2">
                    <ClockIcon className="w-4 h-4 ml-2 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span>{activity.schedule}</span>
                </div>
            </div>
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-100 text-left">
             <button 
                onClick={onShowDetails}
                className="inline-block bg-sky-500 text-white px-5 py-2 rounded-full hover:bg-sky-600 transition-colors duration-300 font-semibold text-sm"
            >
              לפרטים נוספים
            </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityListItem;
