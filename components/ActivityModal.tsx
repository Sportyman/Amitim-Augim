import React, { useEffect } from 'react';
import { Activity } from '../types';
import { CENTER_ADDRESSES } from '../constants';

// Icons
const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const PhoneIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
    </svg>
);

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
    </svg>
);

const MapPinIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const UsersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const NavigationIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
);

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

  // Extract phone number if exists in description
  const phoneMatch = activity.description.match(/05\d-?\d{7}|0\d-?\d{7}/);
  const phoneNumber = phoneMatch ? phoneMatch[0] : null;

  // WhatsApp Logic
  let whatsappUrl = null;
  if (phoneNumber) {
      // Remove dashes and non-digits
      const rawPhone = phoneNumber.replace(/\D/g, '');
      // Check if it starts with 05 (mobile)
      if (rawPhone.startsWith('05')) {
          // Remove leading 0 and add 972
          const internationalPhone = '972' + rawPhone.substring(1);
          whatsappUrl = `https://wa.me/${internationalPhone}`;
      }
  }

  const getKeywords = () => {
    let titleKeywords = activity.title.split('-')[0].trim();
    return `${titleKeywords},${activity.category}`;
  };
  const unsplashUrl = `https://source.unsplash.com/600x400/?${encodeURIComponent(getKeywords())}`;
  const fallbackUrl = `https://picsum.photos/seed/${typeof activity.id === 'string' ? activity.id.charCodeAt(0) : activity.id}/600/400`;

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (e.currentTarget.src !== fallbackUrl) {
        e.currentTarget.src = fallbackUrl;
    }
  };

  // Resolve exact address
  const centerName = activity.location.split(',')[0].trim();
  const specificAddress = CENTER_ADDRESSES[centerName];
  const navigationQuery = specificAddress ? `${specificAddress}` : activity.location;
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(navigationQuery)}&navigate=yes`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(navigationQuery)}`;

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
            <img 
                src={activity.imageUrl && activity.imageUrl.length > 10 ? activity.imageUrl : unsplashUrl} 
                onError={handleImageError}
                alt={activity.title} 
                className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent w-full p-6 pt-20">
                <span className="inline-block px-3 py-1 bg-sky-500 text-white text-xs font-bold rounded-full mb-2 shadow-sm">
                    {activity.category}
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-white shadow-black drop-shadow-md">{activity.title}</h2>
            </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
            
            {/* Key Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm">
                <div className="flex items-start text-gray-700 col-span-1 sm:col-span-2">
                   <MapPinIcon className="w-5 h-5 ml-3 text-sky-500 flex-shrink-0 mt-0.5" />
                   <div>
                       <span className="font-bold block">{activity.location}</span>
                       {specificAddress && <span className="text-gray-500 text-xs block mt-1">{specificAddress}</span>}
                       
                       <div className="flex gap-3 mt-2">
                            <a href={wazeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:text-blue-800 text-xs font-bold bg-blue-50 px-2 py-1 rounded-md transition-colors">
                                <NavigationIcon className="w-3 h-3 ml-1" />
                                Waze
                            </a>
                             <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-green-600 hover:text-green-800 text-xs font-bold bg-green-50 px-2 py-1 rounded-md transition-colors">
                                <MapPinIcon className="w-3 h-3 ml-1" />
                                מפות
                            </a>
                       </div>
                   </div>
                </div>
                
                {activity.instructor && (
                    <div className="flex items-center text-gray-700 col-span-1 sm:col-span-2">
                       <UserIcon className="w-5 h-5 ml-3 text-sky-500" />
                       <span className="font-medium">מדריך/ה: {activity.instructor}</span>
                    </div>
                )}

                <div className="flex items-center text-gray-700">
                   <UsersIcon className="w-5 h-5 ml-3 text-sky-500" />
                   <span className="font-medium">{activity.ageGroup}</span>
                </div>
                <div className="flex items-center text-gray-700">
                   <ClockIcon className="w-5 h-5 ml-3 text-sky-500" />
                   <span className="font-medium">{activity.schedule}</span>
                </div>
                <div className="flex items-center text-gray-700">
                   <span className="w-5 h-5 ml-3 text-center text-sky-500 font-bold">₪</span>
                   <span className="font-bold text-lg text-green-600">{activity.price} ₪</span>
                </div>
            </div>

            {/* Description / AI Summary */}
            <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">אודות הפעילות</h3>
                <p className="text-gray-600 leading-relaxed text-lg">
                    {activity.ai_summary || activity.description || "לפעילות זו אין תיאור נוסף כרגע."}
                </p>
            </div>
            
            {/* AI Tags */}
            {activity.ai_tags && activity.ai_tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {activity.ai_tags.map((tag, idx) => (
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