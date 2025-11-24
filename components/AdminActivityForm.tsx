
import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Category } from '../types';
import ActivityCard from './ActivityCard';
import { Images, Check, X, AlertCircle, Sparkles, Plus, MapPin, List } from 'lucide-react';
import { dbService } from '../services/dbService';
import { generateMarketingDescription } from '../services/geminiService';
import { calculateDetailedAge } from '../utils/helpers';

interface AdminActivityFormProps {
  initialData?: Activity | null;
  allActivities?: Activity[]; // Pass full list for bulk ops
  onSubmit: (data: Omit<Activity, 'id'>) => Promise<void>;
  onCancel: () => void;
  onRefresh?: () => void;
}

// --- Bulk Image Update Modal ---
const BulkImageModal: React.FC<{
    currentActivity: Omit<Activity, 'id'>;
    allActivities: Activity[];
    newImageUrl: string;
    onClose: () => void;
    onConfirm: (ids: string[]) => void;
}> = ({ currentActivity, allActivities, newImageUrl, onClose, onConfirm }) => {
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
                // Normalize strings for comparison
                const t1 = currentActivity.title.toLowerCase().trim();
                const t2 = a.title.toLowerCase().trim();
                // Check if one contains the other or they share a significant common word
                if (!t2.includes(t1) && !t1.includes(t2)) matches = false;
            }

            if (filters.matchCategory && a.category !== currentActivity.category) matches = false;
            
            // Location match: simplistic check (e.g., "Matnas Yavor" vs "Matnas Yavor, Hertzliya")
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


const AdminActivityForm: React.FC<AdminActivityFormProps> = ({ initialData, allActivities = [], onSubmit, onCancel, onRefresh }) => {
  const [formData, setFormData] = useState<Omit<Activity, 'id'>>({
    title: '',
    category: 'ספורט',
    description: '',
    imageUrl: '',
    location: '',
    price: 0,
    ageGroup: '',
    schedule: '',
    instructor: '',
    detailsUrl: '#',
    ai_summary: '',
    ai_tags: []
  });
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [existingLocations, setExistingLocations] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);

  useEffect(() => {
    const loadData = async () => {
        // Extract unique locations from all activities
        const locs = [...new Set(allActivities.map(a => a.location.split(',')[0].trim()))].sort();
        setExistingLocations(locs);

        // Fetch categories for the dropdown
        const cats = await dbService.getCategories();
        setAvailableCategories(cats);
    };
    loadData();

    if (initialData) {
      const { id, ...rest } = initialData;
      setFormData(rest);
    }
  }, [initialData, allActivities]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? Number(value) : value
    }));
  };

  const handleGenerateDescription = async () => {
      if (!formData.title || !formData.ageGroup) {
          alert('נא למלא שם חוג וקהל יעד לפני יצירת תיאור');
          return;
      }
      setAiLoading(true);
      try {
          const desc = await generateMarketingDescription(formData.title, formData.location, formData.ageGroup);
          if (desc) {
              setFormData(prev => ({ ...prev, description: desc }));
          }
      } catch (e) {
          alert('שגיאה ביצירת תיאור');
      } finally {
          setAiLoading(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
        // 1. Auto-calculate DB fields
        const ageData = calculateDetailedAge(formData.ageGroup);
        
        // 2. Handle New Category (Ad-hoc creation)
        // Check if the typed category exists in the list
        const categoryExists = availableCategories.some(c => c.name === formData.category);
        if (!categoryExists && formData.category.trim().length > 2) {
            const newCat = {
                id: `cat_${Date.now()}`,
                name: formData.category,
                iconId: 'sport', // Default icon
                isVisible: true,
                order: 99
            };
            await dbService.saveCategory(newCat);
        }

        const finalData = {
            ...formData,
            ...ageData
        };

        await onSubmit(finalData);
    } catch (error) {
      alert('שגיאה בשמירת הנתונים');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkConfirm = async (ids: string[]) => {
      if (!ids.length) return;
      setShowBulkModal(false);
      
      if (confirm(`פעולה זו תעדכן את התמונה עבור ${ids.length} חוגים. להמשיך?`)) {
          setLoading(true);
          try {
              await dbService.updateActivitiesBatch(ids, { imageUrl: formData.imageUrl });
              alert('התמונות עודכנו בהצלחה!');
              if (onRefresh) onRefresh();
          } catch (e) {
              console.error(e);
              alert('שגיאה בעדכון קבוצתי');
          } finally {
              setLoading(false);
          }
      }
  };

  // Create a mock activity object for preview
  const previewActivity: Activity = {
      id: 'preview', // Mock ID
      ...formData
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h2 className="text-xl font-bold text-gray-800">
                {initialData ? 'עריכת פרטי חוג' : 'הוספת חוג חדש למערכת'}
            </h2>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-6 w-6" />
            </button>
        </div>
        
        <div className="flex flex-col lg:flex-row overflow-hidden flex-1">
            
            {/* Left Column: Form */}
            <div className="flex-1 overflow-y-auto p-8 border-l border-gray-100">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Title */}
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">שם הפעילות</label>
                            <input required type="text" name="title" value={formData.title} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition-all" placeholder="לדוגמה: ג'ודו לילדים" />
                        </div>
                        
                        {/* Category - Datalist for New Entries */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                                <List className="w-4 h-4 text-sky-500"/> קטגוריה
                            </label>
                            <input 
                                list="categories-list" 
                                name="category" 
                                value={formData.category} 
                                onChange={handleChange} 
                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
                                placeholder="בחר או הקלד חדשה..."
                            />
                            <datalist id="categories-list">
                                {availableCategories.map(c => (
                                    <option key={c.id} value={c.name} />
                                ))}
                            </datalist>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">מחיר (₪)</label>
                            <input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none" />
                        </div>
                        
                        {/* Age Group - Calculates DB fields on save */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">קהל יעד (גיל)</label>
                            <input 
                                required 
                                type="text" 
                                name="ageGroup" 
                                value={formData.ageGroup} 
                                onChange={handleChange} 
                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none" 
                                placeholder="למשל: 18-23, גילאי 6-9..."
                            />
                            <p className="text-xs text-gray-400 mt-1">המערכת תחשב אוטומטית את הנתונים למסד הנתונים.</p>
                        </div>
                        
                        {/* Location - Datalist */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-sky-500"/> מיקום
                            </label>
                            <input 
                                required 
                                list="locations-list"
                                type="text" 
                                name="location" 
                                value={formData.location} 
                                onChange={handleChange} 
                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none" 
                                placeholder="בחר מרכז או הקלד..." 
                            />
                            <datalist id="locations-list">
                                {existingLocations.map((loc, i) => (
                                    <option key={i} value={loc} />
                                ))}
                            </datalist>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">לו"ז (ימים ושעות)</label>
                            <input required type="text" name="schedule" value={formData.schedule} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none" placeholder="ימי ב' ו-ה', 17:00-18:00" />
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">קישור לתמונה</label>
                            <div className="flex gap-2">
                                <input type="text" name="imageUrl" value={formData.imageUrl} onChange={handleChange} className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none text-left dir-ltr" placeholder="https://..." dir="ltr" />
                                {formData.imageUrl && (
                                    <button 
                                        type="button"
                                        onClick={() => setShowBulkModal(true)}
                                        className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 rounded-lg border border-indigo-200 transition-colors flex items-center gap-2 whitespace-nowrap text-sm font-semibold"
                                        title="החל תמונה זו על חוגים דומים"
                                    >
                                        <Images className="w-4 h-4" />
                                        החל על נוספים
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-bold text-gray-700">תיאור מלא</label>
                                <button 
                                    type="button"
                                    onClick={handleGenerateDescription}
                                    disabled={aiLoading}
                                    className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 disabled:opacity-50"
                                >
                                    <Sparkles className="w-3 h-3" />
                                    {aiLoading ? 'מייצר...' : 'נסח תיאור אוטומטי (AI)'}
                                </button>
                            </div>
                            <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none resize-none" placeholder="תיאור מפורט של החוג..." />
                        </div>
                        
                         <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">שם המדריך/ה (אופציונלי)</label>
                            <input type="text" name="instructor" value={formData.instructor || ''} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none" />
                        </div>
                    </div>
                </form>
            </div>

            {/* Right Column: Preview */}
            <div className="lg:w-[400px] bg-gray-50 p-8 border-r border-gray-100 flex flex-col items-center overflow-y-auto">
                <div className="sticky top-0 w-full">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 text-center">
                        תצוגה מקדימה
                    </h3>
                    <div className="pointer-events-none transform scale-95 origin-top">
                        <ActivityCard 
                            activity={previewActivity} 
                            onShowDetails={() => {}} // Dummy function for preview
                        />
                    </div>
                    <div className="mt-6 text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <p className="text-sm text-blue-800">
                            כך יראה הכרטיס באפליקציה. <br/>
                            המידע מעודכן בזמן אמת כפי שמוזן בטופס.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
            <button type="button" onClick={onCancel} className="px-6 py-2.5 text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-lg font-medium transition-all">
                ביטול
            </button>
            <button 
                onClick={handleSubmit} 
                disabled={loading} 
                className="px-8 py-2.5 text-white bg-sky-600 hover:bg-sky-700 rounded-lg font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
                {loading && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>}
                {initialData ? 'שמור שינויים' : 'צור חוג חדש'}
            </button>
        </div>
      </div>

      {/* Bulk Modal Overlay */}
      {showBulkModal && (
          <BulkImageModal 
              currentActivity={formData}
              allActivities={allActivities}
              newImageUrl={formData.imageUrl}
              onClose={() => setShowBulkModal(false)}
              onConfirm={handleBulkConfirm}
          />
      )}
    </div>
  );
};

export default AdminActivityForm;
