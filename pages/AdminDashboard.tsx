import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../services/dbService';
import { Activity } from '../types';
import AdminActivityForm from '../components/AdminActivityForm';
import { 
    Plus, Edit, Trash2, LogOut, Database, Upload, 
    Search, Filter, FileJson, AlertTriangle, CheckCircle,
    BarChart3, Layers, MapPin
} from 'lucide-react';
import { CATEGORIES } from '../constants';

const AdminDashboard: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  
  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (window.confirm('האם אתה בטוח שברצונך למחוק פעילות זו? פעולה זו אינה הפיכה.')) {
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

  const handleInitialMigration = async () => {
    if (window.confirm('פעולה זו תטען את נתוני הבסיס (כ-200 חוגים) למסד הנתונים. האם להמשיך?')) {
        setIsLoading(true);
        try {
            const response = await fetch('activities.json');
            const data = await response.json();
            await dbService.importActivities(data);
            alert('הנתונים יובאו בהצלחה!');
            await fetchActivities();
        } catch (error) {
            console.error("Migration error", error);
            alert('שגיאה בייבוא הנתונים');
            setIsLoading(false);
        }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const json = JSON.parse(e.target?.result as string);
            if (!Array.isArray(json)) throw new Error("Invalid JSON format. Expected an array.");
            
            if (window.confirm(`נמצאו ${json.length} פעילויות בקובץ. האם לייבא אותן למערכת?`)) {
                setIsLoading(true);
                await dbService.importActivities(json);
                await fetchActivities();
                alert("הקובץ יובא בהצלחה!");
            }
        } catch (error) {
            console.error("File upload error", error);
            alert("שגיאה בקריאת הקובץ. וודא שזהו קובץ JSON תקין.");
            setIsLoading(false);
        }
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleDeleteAll = async () => {
      if (prompt('פעולה זו תמחק את *כל* החוגים מהמערכת. כדי לאשר, הקלד "מחק הכל"') === "מחק הכל") {
          setIsLoading(true);
          await dbService.deleteAllActivities();
          await fetchActivities();
      }
  }

  // Calculate Stats
  const totalActivities = activities.length;
  const uniqueLocationsCount = new Set(activities.map(a => a.location.split(',')[0].trim())).size;
  const avgPrice = activities.length > 0 
    ? Math.round(activities.reduce((acc, curr) => acc + curr.price, 0) / activities.length) 
    : 0;

  // Filtering Logic
  const filteredActivities = activities.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          a.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || a.category === filterCategory;
    const matchesLocation = filterLocation === 'all' || a.location.includes(filterLocation);
    
    return matchesSearch && matchesCategory && matchesLocation;
  });

  // Get Unique Locations for Filter
  const availableLocations = [...new Set(activities.map(a => a.location.split(',')[0].trim()))].sort();

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <svg className="animate-spin h-10 w-10 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-gray-500 font-medium">טוען נתונים ומתחבר למסד הנתונים...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 font-sans" dir="rtl">
      
      {/* Navbar */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                    <Database className="w-6 h-6 text-orange-600" />
                </div>
                <h1 className="text-xl font-bold text-gray-800">ניהול חוגים</h1>
            </div>
            <div className="flex items-center gap-4">
                <div className="hidden md:flex flex-col items-end text-sm">
                    <span className="font-medium text-gray-900">מנהל מערכת</span>
                    <span className="text-gray-500">{user?.email}</span>
                </div>
                <div className="h-8 w-px bg-gray-200 mx-2"></div>
                <button onClick={handleLogout} className="flex items-center gap-2 text-gray-600 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-all duration-200">
                    <LogOut className="w-5 h-5" />
                    <span className="hidden sm:inline">יציאה</span>
                </button>
            </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-8">
        
        {/* Empty State / Migration Call to Action */}
        {activities.length === 0 && !isLoading && (
            <div className="bg-white rounded-2xl shadow-lg border border-orange-100 p-8 mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 mb-4">
                    <AlertTriangle className="w-8 h-8 text-orange-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">מסד הנתונים ריק</h2>
                <p className="text-gray-600 mb-8 max-w-xl mx-auto">
                    נראה שאין חוגים במערכת כרגע. ניתן לייבא את נתוני הבסיס (כ-200 חוגים) באופן אוטומטי, או להוסיף חוגים ידנית.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <button 
                        onClick={handleInitialMigration}
                        className="flex items-center justify-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-xl hover:bg-orange-600 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1 font-bold"
                    >
                        <Database className="w-5 h-5" />
                        ייבא נתונים ראשוניים
                    </button>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-xl hover:bg-gray-50 shadow-sm transition-all font-medium"
                    >
                        <Upload className="w-5 h-5" />
                        העלה קובץ JSON
                    </button>
                </div>
            </div>
        )}

        {/* Dashboard Stats */}
        {activities.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-sm font-medium">סה"כ חוגים</p>
                        <h3 className="text-3xl font-bold text-gray-800 mt-1">{totalActivities}</h3>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                        <Layers className="w-6 h-6 text-blue-600" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-sm font-medium">מרכזים פעילים</p>
                        <h3 className="text-3xl font-bold text-gray-800 mt-1">{uniqueLocationsCount}</h3>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                        <MapPin className="w-6 h-6 text-purple-600" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-sm font-medium">מחיר ממוצע</p>
                        <h3 className="text-3xl font-bold text-gray-800 mt-1">₪{avgPrice}</h3>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                        <BarChart3 className="w-6 h-6 text-green-600" />
                    </div>
                </div>
            </div>
        )}

        {/* Actions Toolbar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            
            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto flex-grow">
                <div className="relative flex-grow md:max-w-xs">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="חיפוש חופשי..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                    />
                </div>
                
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
                    <div className="relative min-w-[140px]">
                        <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <select 
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="w-full pr-10 pl-4 py-2 bg-gray-50 border border-gray-200 rounded-lg appearance-none focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                        >
                            <option value="all">כל הקטגוריות</option>
                            {CATEGORIES.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="relative min-w-[140px]">
                        <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <select 
                            value={filterLocation}
                            onChange={(e) => setFilterLocation(e.target.value)}
                            className="w-full pr-10 pl-4 py-2 bg-gray-50 border border-gray-200 rounded-lg appearance-none focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                        >
                            <option value="all">כל המיקומים</option>
                            {availableLocations.map(loc => (
                                <option key={loc} value={loc}>{loc}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 w-full lg:w-auto justify-end border-t lg:border-0 pt-4 lg:pt-0 mt-2 lg:mt-0">
                 <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    accept=".json" 
                    onChange={handleFileUpload}
                />
                 <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 bg-white text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium whitespace-nowrap"
                    title="ייבוא קובץ חיצוני"
                >
                    <FileJson className="w-4 h-4" />
                    <span className="hidden sm:inline">ייבוא</span>
                </button>
                <button 
                    onClick={handleDeleteAll}
                    className="flex items-center gap-2 bg-white text-red-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium whitespace-nowrap"
                    title="מחיקת כל הנתונים"
                >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">ניקוי מסד</span>
                </button>
                <button 
                    onClick={handleAdd} 
                    className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors shadow-sm text-sm font-bold whitespace-nowrap"
                >
                    <Plus className="w-4 h-4" />
                    הוסף חדש
                </button>
            </div>
        </div>

        {/* Activities Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">שם פעילות</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">קטגוריה</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">מיקום</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">גיל</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">מחיר</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">פעולות</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredActivities.length === 0 ? (
                             <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    לא נמצאו פעילויות התואמות את הסינון.
                                </td>
                            </tr>
                        ) : (
                            filteredActivities.map(activity => (
                                <tr key={activity.id} className="hover:bg-orange-50/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="font-medium text-gray-900">{activity.title}</div>
                                            {activity.ai_summary && <CheckCircle className="w-3 h-3 text-green-500 mr-2" title="קיים סיכום AI" />}
                                        </div>
                                        <div className="text-xs text-gray-400 md:hidden mt-1">{activity.category} | {activity.price}₪</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                                        <span className="inline-flex px-2.5 py-0.5 text-xs font-medium text-orange-800 bg-orange-100 rounded-full">
                                            {activity.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
                                        {activity.location}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
                                        {activity.ageGroup}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700 hidden md:table-cell">
                                        ₪{activity.price}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleEdit(activity)} 
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                title="ערוך"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(activity.id)} 
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                title="מחק"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-sm text-gray-500 flex justify-between">
                <span>מציג {filteredActivities.length} מתוך {totalActivities} תוצאות</span>
            </div>
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