import React, { useState, useEffect } from 'react';
import { Activity } from '../types';
import { CATEGORIES } from '../constants';
import ActivityCard from './ActivityCard';

interface AdminActivityFormProps {
  initialData?: Activity | null;
  onSubmit: (data: Omit<Activity, 'id'>) => Promise<void>;
  onCancel: () => void;
}

const AdminActivityForm: React.FC<AdminActivityFormProps> = ({ initialData, onSubmit, onCancel }) => {
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

  useEffect(() => {
    if (initialData) {
      const { id, ...rest } = initialData;
      setFormData(rest);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      alert('שגיאה בשמירת הנתונים');
    } finally {
      setLoading(false);
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        
        <div className="flex flex-col lg:flex-row overflow-hidden flex-1">
            
            {/* Left Column: Form */}
            <div className="flex-1 overflow-y-auto p-8 border-l border-gray-100">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">שם הפעילות</label>
                            <input required type="text" name="title" value={formData.title} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all" placeholder="לדוגמה: ג'ודו לילדים" />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">קטגוריה</label>
                            <select name="category" value={formData.category} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none bg-white">
                                {CATEGORIES.map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">מחיר (₪)</label>
                            <input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none" />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">קהל יעד (גיל)</label>
                            <input required type="text" name="ageGroup" value={formData.ageGroup} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none" placeholder="לדוגמה: גילאי 6-9"/>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">מיקום</label>
                            <input required type="text" name="location" value={formData.location} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none" placeholder="מרכז קהילתי..." />
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">לו"ז (ימים ושעות)</label>
                            <input required type="text" name="schedule" value={formData.schedule} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none" placeholder="ימי ב' ו-ה', 17:00-18:00" />
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">קישור לתמונה</label>
                            <input type="text" name="imageUrl" value={formData.imageUrl} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-left dir-ltr" placeholder="https://..." dir="ltr" />
                            <p className="text-xs text-gray-400 mt-1">מומלץ להשתמש בקישור ישיר לתמונה איכותית.</p>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">תיאור מלא</label>
                            <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none resize-none" placeholder="תיאור מפורט של החוג..." />
                        </div>
                        
                         <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">שם המדריך/ה (אופציונלי)</label>
                            <input type="text" name="instructor" value={formData.instructor || ''} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none" />
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
                            וודא שהתמונה והטקסטים נראים תקינים.
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
                className="px-8 py-2.5 text-white bg-orange-600 hover:bg-orange-700 rounded-lg font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
                {loading && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>}
                {initialData ? 'שמור שינויים' : 'צור חוג חדש'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default AdminActivityForm;