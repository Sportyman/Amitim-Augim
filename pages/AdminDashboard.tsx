
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../services/dbService';
import { Activity } from '../types';
import AdminActivityForm from '../components/AdminActivityForm';
import { 
    Plus, Edit, Trash2, LogOut, Database, Download,
    Search, LayoutGrid, List, Users, Sparkles,
    Menu, X, Image as ImageIcon, ChevronDown, ChevronUp,
    Home, ArrowRight, Save, Eye, EyeOff, Tags, Settings
} from 'lucide-react';
import { CATEGORIES } from '../constants';
import { canEdit, canDelete, canCreate, canManageUsers, getRoleLabel } from '../utils/permissions';
import BulkUpdateTool from '../components/admin/BulkUpdateTool';
import UserManagement from '../components/admin/UserManagement';
import AIEnrichmentTool from '../components/admin/AIEnrichmentTool';
import DatabaseManagement from '../components/admin/DatabaseManagement';
import CategoryManagement from '../components/admin/CategoryManagement';
import SettingsPanel from '../components/admin/SettingsPanel';
import { formatSchedule, formatStringList } from '../utils/helpers';

// --- Auto Logout Hook ---
const TIMEOUT_MS = 15 * 60 * 1000; // 15 Minutes

const useAutoLogout = (logout: () => void) => {
    const [lastActivity, setLastActivity] = useState(Date.now());

    const handleActivity = useCallback(() => {
        setLastActivity(Date.now());
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keypress', handleActivity);
        window.addEventListener('click', handleActivity);
        window.addEventListener('touchstart', handleActivity);

        const intervalId = setInterval(() => {
            if (Date.now() - lastActivity > TIMEOUT_MS) {
                console.warn("Session timed out due to inactivity.");
                logout();
            }
        }, 10000);

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keypress', handleActivity);
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
            clearInterval(intervalId);
        };
    }, [lastActivity, logout, handleActivity]);
};

const AdminDashboard: React.FC = () => {
  const { user, isAdmin, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'bulk' | 'users' | 'ai' | 'db' | 'categories' | 'settings'>('list');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedActivityId, setExpandedActivityId] = useState<string | number | null>(null);
  
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  
  // Activate Auto Logout
  useAutoLogout(async () => {
      await logout();
      navigate('/login');
  });

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
    if (!canCreate(userRole)) {
        alert('אין לך הרשאה ליצור חוגים חדשים.');
        return;
    }
    setEditingActivity(null);
    setIsFormOpen(true);
    setIsMobileMenuOpen(false);
  };

  const handleEdit = (activity: Activity) => {
    if (!canEdit(userRole)) {
        alert('אין לך הרשאה לערוך חוגים.');
        return;
    }
    setEditingActivity(activity);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string | number) => {
    if (!canDelete(userRole)) {
        alert('אין לך הרשאה למחוק חוגים.');
        return;
    }
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
  
  const handleExportData = () => {
      if (!activities.length) return;
      const dataStr = JSON.stringify(activities, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activities_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
  };

  const toggleRowExpansion = (id: string | number) => {
      setExpandedActivityId(prevId => prevId === id ? null : id);
  };

  // Filtering & Stats
  const filteredActivities = activities.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          a.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || a.category === filterCategory;
    const matchesLocation = filterLocation === 'all' || a.location.includes(filterLocation);
    
    return matchesSearch && matchesCategory && matchesLocation;
  });

  const availableLocations = [...new Set(activities.map(a => a.location.split(',')[0].trim()))].sort();

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
        <p className="text-gray-500 font-medium">טוען מערכת ניהול...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 font-sans flex flex-col md:flex-row" dir="rtl">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="bg-sky-100 p-1.5 rounded-lg">
                <Database className="w-5 h-5 text-sky-600" />
            </div>
            <span className="font-bold text-gray-800">ניהול חוגים</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600">
              {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
      </div>

      {/* Sidebar (Desktop & Mobile) */}
      <aside className={`
          fixed inset-y-0 right-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0 md:shadow-none md:border-l border-gray-200
          ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
          <div className="p-6 border-b border-gray-100 hidden md:flex items-center gap-3">
              <div className="bg-sky-100 p-2 rounded-lg">
                  <Database className="w-6 h-6 text-sky-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-800">מערכת ניהול</h1>
          </div>

          <div className="p-4 space-y-1">
              <button 
                onClick={() => { setCurrentView('list'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${currentView === 'list' ? 'bg-sky-50 text-sky-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                  <List className="w-5 h-5" />
                  רשימת חוגים
              </button>
              
              {/* Only admins and super admins can do bulk updates */}
              {canCreate(userRole) && (
                <>
                    <button 
                        onClick={() => { setCurrentView('bulk'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${currentView === 'bulk' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <LayoutGrid className="w-5 h-5" />
                        ניהול קבוצתי
                    </button>

                    <button 
                        onClick={() => { setCurrentView('categories'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${currentView === 'categories' ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Tags className="w-5 h-5" />
                        ניהול קטגוריות
                    </button>
                </>
              )}

              {/* AI Enrichment Tool */}
              {canCreate(userRole) && (
                <button 
                    onClick={() => { setCurrentView('ai'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${currentView === 'ai' ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    <Sparkles className="w-5 h-5" />
                    אופטימיזציה (AI)
                </button>
              )}

              {/* Database Management (Import/Reset) */}
              {canCreate(userRole) && (
                <button 
                    onClick={() => { setCurrentView('db'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${currentView === 'db' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    <Save className="w-5 h-5" />
                    ניהול מסד נתונים
                </button>
              )}

              {/* Only Super Admin can manage users */}
              {canManageUsers(userRole) && (
                  <button 
                    onClick={() => { setCurrentView('users'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${currentView === 'users' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    <Users className="w-5 h-5" />
                    ניהול צוות
                </button>
              )}

              {canCreate(userRole) && (
                  <button 
                    onClick={() => { setCurrentView('settings'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${currentView === 'settings' ? 'bg-gray-200 text-gray-800' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    <Settings className="w-5 h-5" />
                    הגדרות
                </button>
              )}
          </div>

          <div className="absolute bottom-0 w-full p-4 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3 mb-4 px-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${userRole === 'super_admin' ? 'bg-purple-600' : 'bg-sky-500'}`}>
                      {user?.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{getRoleLabel(userRole)}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
              </div>
              <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-red-600 bg-white border border-red-100 hover:bg-red-50 px-4 py-2 rounded-xl transition-colors text-sm font-medium">
                  <LogOut className="w-4 h-4" />
                  יציאה בטוחה
              </button>
          </div>
      </aside>

      {/* Overlay for Mobile Sidebar */}
      {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-screen">
        <div className="p-4 sm:p-8 max-w-7xl mx-auto">
            
             {/* Navigation Buttons */}
            <div className="flex justify-end gap-3 mb-6">
                <button 
                    onClick={() => navigate(-1)} 
                    className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2 rounded-full shadow-sm hover:bg-gray-50 transition-all text-sm font-medium border border-gray-200"
                >
                    <ArrowRight className="w-4 h-4" />
                    חזרה לעמוד קודם
                </button>
                <button 
                    onClick={() => navigate('/')} 
                    className="flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-full shadow-sm hover:bg-sky-700 transition-all text-sm font-medium"
                >
                    <Home className="w-4 h-4" />
                    חזרה לאפליקציה
                </button>
            </div>

            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                        {currentView === 'list' ? 'רשימת החוגים' : 
                         currentView === 'bulk' ? 'עריכה וניהול קבוצתי' : 
                         currentView === 'ai' ? 'אופטימיזציה ושיפור נתונים' :
                         currentView === 'db' ? 'ניהול מסד נתונים' :
                         currentView === 'categories' ? 'ניהול קטגוריות' :
                         currentView === 'settings' ? 'הגדרות מערכת' :
                         'ניהול צוות'}
                    </h2>
                    {currentView === 'list' && (
                        <p className="text-gray-500 text-sm mt-1">
                            מציג {filteredActivities.length} מתוך {activities.length} חוגים פעילים
                        </p>
                    )}
                </div>
                {currentView === 'list' && canCreate(userRole) && (
                    <div className="flex gap-2">
                        {/* Backup Button */}
                        <button 
                            onClick={handleExportData}
                            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-full hover:bg-gray-50 transition-all text-sm font-bold"
                            title="הורד גיבוי נתונים"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">גיבוי</span>
                        </button>

                        <button 
                            onClick={handleAdd} 
                            className="flex items-center gap-2 bg-sky-500 text-white px-5 py-2.5 rounded-full hover:bg-sky-600 transition-all shadow-md hover:shadow-lg text-sm font-bold"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="hidden sm:inline">חוג חדש</span>
                            <span className="sm:hidden">הוסף</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Main Views */}
            {currentView === 'users' ? (
                <UserManagement />
            ) : currentView === 'bulk' ? (
                <BulkUpdateTool activities={activities} onUpdate={fetchActivities} />
            ) : currentView === 'ai' ? (
                <AIEnrichmentTool activities={activities} onRefresh={fetchActivities} />
            ) : currentView === 'db' ? (
                <DatabaseManagement onRefresh={fetchActivities} />
            ) : currentView === 'categories' ? (
                <CategoryManagement />
            ) : currentView === 'settings' ? (
                <SettingsPanel />
            ) : (
                <>
                    {/* Filters Toolbar */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col lg:flex-row gap-4">
                         <div className="relative flex-grow">
                            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                                type="text" 
                                placeholder="חיפוש חופשי (שם, מיקום)..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none transition-all text-sm"
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
                            <select 
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="pr-8 pl-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none cursor-pointer min-w-[140px]"
                            >
                                <option value="all">כל הקטגוריות</option>
                                {CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                             <select 
                                value={filterLocation}
                                onChange={(e) => setFilterLocation(e.target.value)}
                                className="pr-8 pl-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none cursor-pointer min-w-[140px]"
                            >
                                <option value="all">כל המיקומים</option>
                                {availableLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Empty State / Migration */}
                    {activities.length === 0 && !isLoading && canCreate(userRole) && (
                        <div className="bg-white rounded-2xl shadow-sm border border-sky-100 p-8 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sky-50 mb-4">
                                <Database className="w-8 h-8 text-sky-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">אין נתונים במערכת</h3>
                            <p className="text-gray-500 mb-6">המאגר ריק כרגע. עבור ל"ניהול מסד נתונים" כדי לייבא קובץ.</p>
                            <button onClick={() => setCurrentView('db')} className="px-5 py-2 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 transition-colors">
                                עבור לייבוא נתונים
                            </button>
                        </div>
                    )}

                    {/* Content: Mobile Cards & Desktop Table */}
                    <div className="space-y-4">
                        {/* Mobile Cards View (Simplified) */}
                        <div className="grid grid-cols-1 gap-4 md:hidden">
                            {filteredActivities.map(activity => (
                                <div key={activity.id} className={`bg-white p-4 rounded-xl shadow-sm border ${activity.isVisible === false ? 'border-red-100 bg-red-50' : 'border-gray-100'} flex flex-col gap-4`}>
                                    <div className="flex gap-4" onClick={() => toggleRowExpansion(activity.id)}>
                                        <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                                            {activity.imageUrl ? (
                                                <img src={activity.imageUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                    <ImageIcon className="w-8 h-8" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-bold text-gray-900 truncate">{activity.title}</h3>
                                                <span className="bg-sky-100 text-sky-800 text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                                                    {activity.category}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1 truncate">{activity.location}</p>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="font-bold text-green-600">{activity.price} ₪</span>
                                                {activity.isVisible === false && <span className="text-xs font-bold text-red-500 flex items-center gap-1"><EyeOff className="w-3 h-3"/> מוסתר</span>}
                                                 {expandedActivityId === activity.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {expandedActivityId === activity.id && (
                                        <div className="pt-4 border-t border-gray-100 mt-2">
                                            <p className="text-sm text-gray-600 mb-3">{activity.description}</p>
                                            <div className="flex gap-2 justify-end">
                                                {canEdit(userRole) && (
                                                    <button onClick={() => handleEdit(activity)} className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium">
                                                        <Edit className="w-4 h-4" /> ערוך
                                                    </button>
                                                )}
                                                {canDelete(userRole) && (
                                                    <button onClick={() => handleDelete(activity.id)} className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium">
                                                        <Trash2 className="w-4 h-4" /> מחק
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table View (Expandable) */}
                        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase w-10"></th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">פעילות</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">קטגוריה</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">מיקום</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">מחיר</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">סטטוס</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredActivities.map(activity => (
                                        <React.Fragment key={activity.id}>
                                            <tr 
                                                onClick={() => toggleRowExpansion(activity.id)} 
                                                className={`cursor-pointer transition-colors ${expandedActivityId === activity.id ? 'bg-sky-50' : 'hover:bg-gray-50'} ${activity.isVisible === false ? 'bg-red-50/30' : ''}`}
                                            >
                                                <td className="px-6 py-4 text-gray-400">
                                                    {expandedActivityId === activity.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden mr-3">
                                                            {activity.imageUrl ? (
                                                                <img className="h-10 w-10 object-cover" src={activity.imageUrl} alt="" />
                                                            ) : (
                                                                <div className="flex items-center justify-center h-full w-full text-gray-400"><ImageIcon className="w-5 h-5"/></div>
                                                            )}
                                                        </div>
                                                        <div className="mr-4">
                                                            <div className="text-sm font-medium text-gray-900">{activity.title}</div>
                                                            <div className="text-xs text-gray-500">{formatStringList(activity.ageGroup)}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex px-2.5 py-0.5 text-xs font-medium text-sky-800 bg-sky-100 rounded-full">
                                                        {activity.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {activity.location}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">
                                                    ₪{activity.price}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-left">
                                                    {activity.isVisible === false ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold text-red-600 bg-red-100">
                                                            <EyeOff className="w-3 h-3" /> מוסתר
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold text-green-600 bg-green-50">
                                                            <Eye className="w-3 h-3" /> פעיל
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                            {/* Expanded Details Row */}
                                            {expandedActivityId === activity.id && (
                                                <tr className="bg-gray-50 animate-in fade-in duration-200">
                                                    <td colSpan={6} className="px-6 py-4">
                                                        <div className="flex gap-6">
                                                            {/* Large Image */}
                                                            <div className="w-48 h-32 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                                                                 {activity.imageUrl ? (
                                                                    <img src={activity.imageUrl} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="flex items-center justify-center h-full w-full text-gray-400"><ImageIcon className="w-8 h-8"/></div>
                                                                )}
                                                            </div>
                                                            
                                                            {/* Text Details */}
                                                            <div className="flex-1">
                                                                <h4 className="text-sm font-bold text-gray-700 mb-2">תיאור מלא:</h4>
                                                                <p className="text-sm text-gray-600 mb-4 leading-relaxed max-w-2xl">
                                                                    {activity.description || "אין תיאור זמין."}
                                                                </p>
                                                                
                                                                <div className="flex flex-wrap gap-2 mb-4">
                                                                     {activity.ai_tags?.map((tag, i) => (
                                                                         <span key={i} className="px-2 py-1 bg-white border border-gray-200 rounded-md text-xs text-gray-500">#{tag}</span>
                                                                     ))}
                                                                </div>

                                                                <div className="flex gap-3">
                                                                    {canEdit(userRole) && (
                                                                        <button onClick={() => handleEdit(activity)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">
                                                                            <Edit className="w-4 h-4" /> ערוך פרטים
                                                                        </button>
                                                                    )}
                                                                    {canDelete(userRole) && (
                                                                        <button onClick={() => handleDelete(activity.id)} className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors">
                                                                            <span><Trash2 className="w-4 h-4" /></span> מחק
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            
                                                            {/* Extra Info Column */}
                                                            <div className="w-48 text-sm text-gray-600 border-r border-gray-200 pr-6 space-y-2">
                                                                <div><span className="font-semibold">מדריך:</span> {activity.instructor || '-'}</div>
                                                                <div><span className="font-semibold">לו"ז:</span> {formatSchedule(activity.schedule)}</div>
                                                                <div><span className="font-semibold">מזהה:</span> {activity.id}</div>
                                                                {activity.minAge && <div><span className="font-semibold">גילאים:</span> {activity.minAge}-{activity.maxAge}</div>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
            
        </div>
      </main>

      {/* Activity Form Modal */}
      {isFormOpen && (
        <AdminActivityForm 
            initialData={editingActivity} 
            allActivities={activities}
            onSubmit={handleFormSubmit} 
            onCancel={() => setIsFormOpen(false)} 
            onRefresh={fetchActivities}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
