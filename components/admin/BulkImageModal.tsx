
import React, { useState, useMemo } from 'react';
import { Activity } from '../../types';
import { Images, X, Check, AlertCircle } from 'lucide-react';

interface BulkImageModalProps {
    currentActivity: Omit<Activity, 'id'>;
    allActivities: Activity[];
    newImageUrl: string;
    onClose: () => void;
    onConfirm: (ids: string[]) => void;
}

const BulkImageModal: React.FC<BulkImageModalProps> = ({ currentActivity, allActivities, newImageUrl, onClose, onConfirm }) => {
    const [filters, setFilters] = useState({
        matchTitle: true,
        matchCategory: false,
        matchLocation: false,
        matchAge: false
    });

    const matchingActivities = useMemo(() => {
        if (!newImageUrl) return [];
        
        return allActivities.filter(a => {
            let matches = true;
            
            // Basic logic: partial title match
            if (filters.matchTitle) {
                const t1 = currentActivity.title.toLowerCase().trim();
                const t2 = a.title.toLowerCase().trim();
                if (!t2.includes(t1) && !t1.includes(t2)) matches = false;
            }

            if (filters.matchCategory && a.category !== currentActivity.category) matches = false;
            
            if (filters.matchLocation) {
                 const loc1 = currentActivity.location.split(',')[0].trim();
                 const loc2 = a.location.split(',')[0].trim();
                 if (loc1 !== loc2) matches = false;
            }

            if (filters.matchAge && a.ageGroup !== currentActivity.ageGroup) matches = false;

            return matches;
        });
    }, [allActivities, currentActivity, filters, newImageUrl]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" dir="rtl">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
                    <div className="flex items-center gap-2">
                        <Images className="w-5 h-5" />
                        <h3 className="font-bold">החלת תמונה על חוגים נוספים</h3>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6">
                    <p className="text-gray-600 text-sm mb-4">
                        בחר את המאפיינים המשותפים כדי לעדכן את התמונה החדשה גם בחוגים אחרים:
                    </p>
                    
                    <div className="space-y-3 mb-6">
                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input 
                                type="checkbox" 
                                checked={filters.matchTitle} 
                                onChange={e => setFilters(p => ({...p, matchTitle: e.target.checked}))}
                                className="w-4 h-4 text-indigo-600 rounded"
                            />
                            <span className="text-sm text-gray-700">בעלי שם דומה ל-<strong>"{currentActivity.title}"</strong></span>
                        </label>
                        
                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input 
                                type="checkbox" 
                                checked={filters.matchCategory} 
                                onChange={e => setFilters(p => ({...p, matchCategory: e.target.checked}))}
                                className="w-4 h-4 text-indigo-600 rounded"
                            />
                            <span className="text-sm text-gray-700">באותה קטגוריה: <strong>{currentActivity.category}</strong></span>
                        </label>

                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input 
                                type="checkbox" 
                                checked={filters.matchLocation} 
                                onChange={e => setFilters(p => ({...p, matchLocation: e.target.checked}))}
                                className="w-4 h-4 text-indigo-600 rounded"
                            />
                            <span className="text-sm text-gray-700">באותו מיקום: <strong>{currentActivity.location.split(',')[0]}</strong></span>
                        </label>

                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input 
                                type="checkbox" 
                                checked={filters.matchAge} 
                                onChange={e => setFilters(p => ({...p, matchAge: e.target.checked}))}
                                className="w-4 h-4 text-indigo-600 rounded"
                            />
                            <span className="text-sm text-gray-700">לאותו גיל: <strong>{currentActivity.ageGroup}</strong></span>
                        </label>
                    </div>

                    <div className="bg-indigo-50 p-3 rounded-lg flex items-center gap-2 text-indigo-800 text-sm font-medium mb-6">
                        <AlertCircle className="w-4 h-4" />
                        נמצאו {matchingActivities.length} חוגים שיתעדכנו.
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={() => onConfirm(matchingActivities.map(a => String(a.id)))}
                            disabled={matchingActivities.length === 0}
                            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            <Check className="w-4 h-4" />
                            עדכן לכולם
                        </button>
                        <button onClick={onClose} className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">
                            ביטול
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkImageModal;
