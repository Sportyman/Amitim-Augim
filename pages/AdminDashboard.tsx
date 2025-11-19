import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../services/dbService';
import { Activity } from '../types';
import AdminActivityForm from '../components/AdminActivityForm';
import { Plus, Edit, Trash2, LogOut, Database } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user || !isAdmin) {
      navigate('/login');
      return;
    }
    fetchActivities();
  }, [user, isAdmin, navigate]);

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
        const data = await dbService.getAllActivities();
        setActivities(data);
    } catch (error) {
        console.error("Failed to fetch activities", error);
    } finally {
        setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleAdd = () => {
    setEditingActivity(null);
    setIsFormOpen(true);
  };

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string | number) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק פעילות זו?')) {
      try {
        await dbService.deleteActivity(String(id));
        setActivities(prev => prev.filter(a => a.id !== id));
      } catch (error) {
        alert('שגיאה במחיקת הפעילות');
      }
    }
  };

  const handleFormSubmit = async (data: Omit<Activity, 'id'>) => {
    try {
        if (editingActivity) {
            await dbService.updateActivity(String(editingActivity.id), data);
        } else {
            await dbService.addActivity(data);
        }
        setIsFormOpen(false);
        fetchActivities();
    } catch (error) {
        console.error("Save error", error);
        throw error;
    }
  };

  const handleImportData = async () => {
    if (window.confirm('פעולה זו תטען נתונים מקובץ ה-JSON המקורי למסד הנתונים. האם להמשיך?')) {
        try {
            const response = await fetch('activities.json'); // Changed to relative path
            const data = await response.json();
            await dbService.importActivities(data);
            alert('הנתונים יובאו בהצלחה! רענן את העמוד.');
            fetchActivities();
        } catch (error) {
            console.error("Import error", error);
            alert('שגיאה בייבוא הנתונים');
        }
    }
  };

  const filteredActivities = activities.filter(a => 
    a.title.includes(searchTerm) || 
    a.location.includes(searchTerm)
  );

  if (isLoading) return <div className="p-10 text-center">טוען נתונים...</div>;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800">מערכת ניהול חוגים - עמיתים</h1>
            <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">מחובר כ: {user?.email}</span>
                <button onClick={handleLogout} className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-3 py-1 rounded-md transition-colors">
                    <LogOut className="w-4 h-4" />
                    יציאה
                </button>
            </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div className="w-full md:w-1/3 relative">
                <input 
                    type="text" 
                    placeholder="חיפוש פעילות..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
            </div>
            <div className="flex gap-3">
                 {activities.length === 0 && (
                    <button onClick={handleImportData} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                        <Database className="w-4 h-4" />
                        טען נתונים ראשוניים
                    </button>
                 )}
                <button onClick={handleAdd} className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors shadow-sm">
                    <Plus className="w-4 h-4" />
                    הוסף פעילות
                </button>
            </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">שם פעילות</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">קטגוריה</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">מיקום</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">מחיר</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">פעולות</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {filteredActivities.map(activity => (
                        <tr key={activity.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="font-medium text-gray-900">{activity.title}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex px-2 text-xs font-semibold leading-5 text-green-800 bg-green-100 rounded-full">
                                    {activity.category}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {activity.location}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                ₪{activity.price}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                                <button onClick={() => handleEdit(activity)} className="text-blue-600 hover:text-blue-900 ml-4">
                                    <Edit className="w-5 h-5" />
                                </button>
                                <button onClick={() => handleDelete(activity.id)} className="text-red-600 hover:text-red-900">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </main>

      {isFormOpen && (
        <AdminActivityForm 
            initialData={editingActivity} 
            onSubmit={handleFormSubmit} 
            onCancel={() => setIsFormOpen(false)} 
        />
      )}
    </div>
  );
};

export default AdminDashboard;