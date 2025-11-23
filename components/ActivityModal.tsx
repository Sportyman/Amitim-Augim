
import React, { useEffect } from 'react';
import { Activity } from '../types';
import { CENTER_ADDRESSES } from '../constants';
import ActivityImage from './ActivityImage';
import { formatSchedule, formatStringList } from '../utils/helpers';
import { 
    CloseIcon, PhoneIcon, WhatsAppIcon, LocationIcon, 
    ClockIcon, UsersIcon, UserIcon, NavigationIcon 
} from './icons';

interface ActivityModalProps {
  activity: Activity;
  onClose: () => void;
}

const ActivityModal: React.FC<ActivityModalProps> = ({ activity, onClose }) => {
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Use the clean phone field if available, otherwise fallback to description extraction
  let phoneNumber = activity.phone;
  if (!phoneNumber) {
      const phoneMatch = activity.description.match(/05\d-?\d{7}|0\d-?\d{7}/);
      phoneNumber = phoneMatch ? phoneMatch[0] : null;
  }

  // WhatsApp Logic
  let whatsappUrl = null;
  if (phoneNumber) {
      const rawPhone = phoneNumber.replace(/\D/g, '');
      if (rawPhone.startsWith('05')) {
          const internationalPhone = '972' + rawPhone.substring(1);
          whatsappUrl = `https://wa.me/${internationalPhone}`;
      }
  }

  // Resolve exact address
  const navigationQuery = activity.location; 
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(navigationQuery)}&navigate=yes`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(navigationQuery)}`;

  // Merge tags from both sources if present
  const displayTags = [
      ...(activity.tags || []), 
      ...(activity.ai_tags || [])
  ].filter((value, index, self) => self.indexOf(value) === index); // Unique

  const displaySchedule = formatSchedule(activity.schedule);
  const displayAgeGroup = formatStringList(activity.ageGroup);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 z-[100]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-60 transition-opacity backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in duration-200" dir="rtl">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/80 hover:bg-white rounded-full text-gray-600 hover:text-gray-900 transition-colors shadow-sm"
        >
          <CloseIcon className="w-6 h-6" />
        </button>

        {/* Image Header */}
        <div className="relative h-48 sm:h-64 w-full shrink-0">
            <ActivityImage 
                activity={activity}
                className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent w-full p-6 pt-20">
                <span className="inline-block px-3 py-1 bg-sky-500 text-white text-xs font-bold rounded-full mb-2 shadow-sm">
                    {activity.category}
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-white shadow-black drop-shadow-md">{activity.title}</h2>
                
                {activity.groupName && (
                    <p className="text-white/90 font-medium mt-1 text-lg shadow-black drop-shadow-sm">
                        {activity.groupName}
                    </p>
                )}
            </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
            
            {/* Key Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm">
                <div className="flex items-start text-gray-700 col-span-1 sm:col-span-2" title="מיקום">
                   <LocationIcon className="w-5 h-5 ml-3 text-sky-500 flex-shrink-0 mt-0.5" />
                   <div>
                       <span className="font-bold block text-base">{activity.location}</span>
                       
                       <div className="flex gap-3 mt-2">
                            <a href={wazeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:text-blue-800 text-xs font-bold bg-blue-50 px-2 py-1 rounded-md transition-colors" title="ניווט עם Waze">
                                <NavigationIcon className="w-3 h-3 ml-1" />
                                Waze
                            </a>
                             <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-green-600 hover:text-green-800 text-xs font-bold bg-green-50 px-2 py-1 rounded-md transition-colors" title="פתח במפות גוגל">
                                <LocationIcon className="w-3 h-3 ml-1" />
                                מפות
                            </a>
                       </div>
                   </div>
                </div>
                
                {activity.instructor && (
                    <div className="flex items-center text-gray-700 col-span-1 sm:col-span-2 bg-white p-2 rounded-lg border border-gray-100 shadow-sm" title="מדריך/ה">
                       <UserIcon className="w-5 h-5 ml-3 text-sky-500" />
                       <span className="font-bold text-gray-900 ml-2">מדריך/ה: </span>
                       <span className="text-gray-800">{activity.instructor}</span>
                    </div>
                )}

                <div className="flex items-center text-gray-700" title="קהל יעד">
                   <UsersIcon className="w-5 h-5 ml-3 text-sky-500" />
                   <div>
                        <span className="block font-medium">{displayAgeGroup}</span>
                   </div>
                </div>
                <div className="flex items-start text-gray-700" title="זמנים">
                   <ClockIcon className="w-5 h-5 ml-3 text-sky-500 flex-shrink-0 mt-0.5" />
                   <span className="font-medium leading-snug">{displaySchedule}</span>
                </div>
                <div className="flex items-center text-gray-700" title="מחיר">
                   <span className="w-5 h-5 ml-3 text-center text-sky-500 font-bold">₪</span>
                   <span className="font-bold text-lg text-green-600">{activity.price} ₪</span>
                </div>
            </div>

            {/* Description / AI Summary */}
            {activity.description && (
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">פרטים נוספים</h3>
                    <p className="text-gray-600 leading-relaxed text-lg whitespace-pre-line">
                        {activity.description}
                    </p>
                </div>
            )}
            
            {/* Search Tags */}
            {displayTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {displayTags.map((tag, idx) => (
                  <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100">
                {phoneNumber && (
                    <a 
                        href={`tel:${phoneNumber}`}
                        className="flex-1 bg-sky-500 text-white text-center py-3 rounded-xl hover:bg-sky-600 transition-colors font-bold flex items-center justify-center gap-2"
                    >
                        <PhoneIcon className="w-5 h-5" />
                        חייג: {phoneNumber}
                    </a>
                )}
                
                {whatsappUrl && (
                    <a 
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-green-500 text-white text-center py-3 rounded-xl hover:bg-green-600 transition-colors font-bold flex items-center justify-center gap-2"
                    >
                        <WhatsAppIcon className="w-5 h-5" />
                        וואטסאפ
                    </a>
                )}

                <button 
                    onClick={onClose}
                    className="flex-1 bg-gray-100 text-gray-700 text-center py-3 rounded-xl hover:bg-gray-200 transition-colors font-semibold"
                >
                    סגור
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityModal;
