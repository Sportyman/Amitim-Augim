import React, { useState, useEffect } from 'react';
import { Activity } from '../types';
import { CATEGORIES } from '../constants';

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
                {initialData ? 'עריכת פעילות' : 'הוספת פעילות חדשה'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">שם הפעילות</label>
                        <input required type="text" name="title" value={formData.title} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-orange-500 focus:ring-orange-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">קטגוריה</label>
                        <select name="category" value={formData.category} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-orange-500 focus:ring-orange-500">
                            {CATEGORIES.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">מחיר (₪)</label>
                        <input type="number" name="price" value={formData.price} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">קהל יעד (גיל)</label>
                        <input required type="text" name="ageGroup" value={formData.ageGroup} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">מיקום</label>
                        <input required type="text" name="location" value={formData.location} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">לו"ז (ימים ושעות)</label>
                        <input required type="text" name="schedule" value={formData.schedule} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">קישור לתמונה</label>
                        <input type="text" name="imageUrl" value={formData.imageUrl} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" placeholder="https://..." />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">תיאור קצר</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
                    </div>
                     <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">סיכום AI (אופציונלי)</label>
                        <textarea name="ai_summary" value={formData.ai_summary} onChange={handleChange} rows={3} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50" />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 border-t pt-4">
                    <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
                        ביטול
                    </button>
                    <button type="submit" disabled={loading} className="px-4 py-2 text-white bg-orange-500 hover:bg-orange-600 rounded-md transition-colors disabled:bg-gray-400">
                        {loading ? 'שומר...' : 'שמור וסגור'}
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default AdminActivityForm;
