import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../services/dbService';
import { Activity, AdminUser, UserRole } from '../types';
import AdminActivityForm from '../components/AdminActivityForm';
import { 
    Plus, Edit, Trash2, LogOut, Database, Upload, Download,
    Search, Filter, FileJson, AlertTriangle, CheckCircle,
    BarChart3, Layers, MapPin, Menu, X, Image as ImageIcon, 
    Save, RefreshCw, Clock, LayoutGrid, List, Users, Shield
} from 'lucide-react';
import { CATEGORIES } from '../constants';

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

// --- Helper: Permissions ---
const canEdit = (role: UserRole | null) => ['super_admin', 'admin', 'editor'].includes(role || '');
const canDelete = (role: UserRole | null) => ['super_admin', 'admin'].includes(role || '');
const canCreate = (role: UserRole | null) => ['super_admin', 'admin'].includes(role || '');
const canManageUsers = (role: UserRole | null) => role === 'super_admin';

// --- Sub-Component: Bulk Update Tool ---
const BulkUpdateTool: React.FC<{ 
    activities: Activity[], 
    onUpdate: () => void 
}> = ({ activities, onUpdate }) => {
    const [searchField, setSearchField] = useState<'title' | 'category' | 'location'>('title');
    const [searchValue, setSearchValue] = useState('');
    const [updateField, setUpdateField] = useState<'imageUrl' | 'category' | 'price'>('imageUrl');
    const [updateValue, setUpdateValue] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const matchingActivities = activities.filter(a => {
        if (!searchValue) return false;
        const val = String(a[searchField] || '').toLowerCase();
        return val.includes(searchValue.toLowerCase());
    });

    const handleExecute = async () => {
        if (matchingActivities.length === 0) return;
        if (!window.confirm(`האם אתה בטוח שברצונך לעדכן את ${matchingActivities.length} החוגים שנמצאו?`)) return;

        setIsProcessing(true);
        try {
            const ids = matchingActivities.map(a => String(a.id));
            const updates = { [updateField]: updateField === 'price' ? Number(updateValue) : updateValue };
            await dbService.updateActivitiesBatch(ids, updates);
            alert('העדכון בוצע בהצלחה!');
            onUpdate();
            setSearchValue('');
            setUpdateValue('');
        } catch (e) {
            console.error(e);
            alert('שגיאה בביצוע העדכון');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 mb-8">
            <div className="flex items-center gap-2 mb-4 text-indigo-700">
                <RefreshCw className="w-5 h-5" />
                <h3 className="text-lg font-bold">ניהול קבוצתי (Bulk Update)</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
                כלי זה מאפשר לעדכן תמונות, קטגוריות או מחירים לקבוצה של חוגים בבת אחת.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Filter Section */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h4 className="text-sm font-bold text-gray-700 mb-3">1. בחר חוגים לעדכון</h4>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-500">חפש לפי שדה:</label>
                            <select 
                                value={searchField} 
                                onChange={(e) => setSearchField(e.target.value as any)}
                                className="block w-full mt-1 p-2 rounded-lg border border-gray-300 text-sm"
                            >
                                <option value="title">שם החוג (מכיל טקסט)</option>
                                <option value="category">קטגוריה נוכחית</option>
                                <option value="location">מיקום</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">ערך לחיפוש:</label>
                            <input 
                                type="text" 
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                placeholder="למשל: ג'ודו"
                                className="block w-full mt-1 p-2 rounded-lg border border-gray-300 text-sm"
                            />
                        </div>
                        <div className="text-sm text-indigo-600 font-medium mt-2">
                            נמצאו: {matchingActivities.length} חוגים
                        </div>
                    </div>
                </div>

                {/* Action Section */}
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
                    <h4 className="text-sm font-bold text-indigo-900 mb-3">2. החל שינוי</h4>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-indigo-800">שדה לעדכון:</label>
                            <select 
                                value={updateField} 
                                onChange={(e) => setUpdateField(e.target.value as any)}
                                className="block w-full mt-1 p-2 rounded-lg border border-indigo-300 text-sm"
                            >
                                <option value="imageUrl">קישור לתמונה (URL)</option>
                                <option value="category">שנה קטגוריה ל...</option>
                                <option value="price">שנה מחיר ל...</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-indigo-800">ערך חדש:</label>
                            {updateField === 'category' ? (
                                <select 
                                    value={updateValue}
                                    onChange={(e) => setUpdateValue(e.target.value)}
                                    className="block w-full mt-1 p-2 rounded-lg border border-indigo-300 text-sm"
                                >
                                    <option value="">בחר קטגוריה...</option>
                                    {CATEGORIES.map(c => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <input 
                                    type={updateField === 'price' ? 'number' : 'text'} 
                                    value={updateValue}
                                    onChange={(e) => setUpdateValue(e.target.value)}
                                    placeholder={updateField === 'imageUrl' ? 'https://...' : 'ערך חדש'}
                                    className="block w-full mt-1 p-2 rounded-lg border border-indigo-300 text-sm"
                                />
                            )}
                        </div>
                        <button 
                            onClick={handleExecute}
                            disabled={matchingActivities.length === 0 || !updateValue || isProcessing}
                            className="w-full mt-4 bg-indigo-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isProcessing ? 'מעדכן...' : 'בצע עדכון גורף'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Sub-Component: User Management ---
const UserManagement: React.FC = () => {
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [newEmail, setNewEmail] = useState('');
    const [newRole, setNewRole] = useState<UserRole>('editor');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        const data = await dbService.getAllAdmins();
        setAdmins(data);
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail) return;
        setLoading(true);
        try {
            await dbService.addAdminUser(newEmail, newRole);
            setNewEmail('');
            await fetchAdmins();
            alert('המשתמש נוסף בהצלחה!');
        } catch (error) {
            alert('שגיאה בהוספת משתמש');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveUser = async (email: string) => {
        if (window.confirm(`האם למחוק את הגישה למשתמש ${email}?`)) {
            try {
                await dbService.removeAdminUser(email);
                setAdmins(prev => prev.filter(a => a.email !== email));
            } catch (error) {
                alert('שגיאה במחיקה');
            }
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                <div className="bg-blue-100 p-2 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-800">ניהול צוות והרשאות</h3>
                    <p className="text-sm text-gray-500">הוסף בעלי תפקידים לניהול האפליקציה</p>
                </div>
            </div>

            {/* Add User Form */}
            <form onSubmit={handleAddUser} className="bg-gray-50 p-5 rounded-xl mb-8 border border-gray-200">
                <h4 className="font-bold text-gray-700 mb-3 text-sm">הוספת מנהל חדש</h4>
                <div className="flex flex-col md:flex-row gap-3">
                    <input 
                        type="email" 
                        placeholder="כתובת מייל (Gmail)"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        required
                        className="flex-1 p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <select 
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as UserRole)}
                        className="p-2.5 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none min-w-[150px]"
                    >
                        <option value="admin">מנהל (Admin)</option>
                        <option value="editor">עורך (Editor)</option>
                    </select>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'מוסיף...' : 'הוסף לצוות'}
                    </button>
                </div>
                <div className="mt-3 text-xs text-gray-500 flex flex-col gap-1">
                   <span className="font-semibold">מקרא הרשאות:</span>
                   <span>• <b>Admin:</b> שליטה מלאה בתוכן (יצירה, עריכה, מחיקה). ללא גישה לניהול משתמשים.</span>
                   <span>• <b>Editor:</b> עריכת תוכן קיים בלבד. ללא יכולת מחיקה או יצירה.</span>
                </div>
            </form>

            {/* Users List */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                        <tr>
                            <th className="px-4 py-3">משתמש</th>
                            <th className="px-4 py-3">תפקיד</th>
                            <th className="px-4 py-3">תאריך הוספה</th>
                            <th className="px-4 py-3">פעולות</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {admins.map((admin) => (
                            <tr key={admin.email} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">{admin.email}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                        admin.role === 'admin' ? 'bg-green-100 text-green-800' : 
                                        admin.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                                        'bg-blue-100 text-blue-800'
                                    }`}>
                                        {admin.role === 'super_admin' ? 'מנהל על' : admin.role === 'admin' ? 'מנהל' : 'עורך'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-gray-500">
                                    {admin.addedAt?.seconds ? new Date(admin.addedAt.seconds * 1000).toLocaleDateString('he-IL') : '-'}
                                </td>
                                <td className="px-4 py-3">
                                    <button 
                                        onClick={() => handleRemoveUser(admin.email)}
                                        className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded transition-colors"
                                        title="הסר משתמש"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {admins.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center py-8 text-gray-500">
                                    אין מנהלים נוספים כרגע.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Main Component ---

const AdminDashboard: React.FC = () => {
  const { user, isAdmin, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'bulk' | 'users'>('list');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleInitialMigration = async () => {
    if (!canCreate(userRole)) return;
    
    if (activities.length > 0) {
        const proceed = window.confirm(
            'שים לב: כבר קיימים נתונים במערכת. ייבוא מחדש עלול ליצור כפילויות. האם אתה בטוח שברצונך להמשיך?'
        );
        if (!proceed) return;
    }

    if (window.confirm('פעולה זו תטען את נתוני הבסיס למסד הנתונים. האם להמשיך?')) {
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
    if (!canCreate(userRole)) return;
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const json = JSON.parse(e.target?.result as string);
            if (!Array.isArray(json)) throw new Error("Invalid JSON format.");
            
            if (window.confirm(`נמצאו ${json.length} פעילויות. האם לייבא?`)) {
                setIsLoading(true);
                await dbService.importActivities(json);
                await fetchActivities();
                alert("יובא בהצלחה!");
            }
        } catch (error) {
            alert("שגיאה בקובץ.");
            setIsLoading(false);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
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

  const handleDeleteAll = async () => {
      if (userRole !== 'super_admin') return;
      if (prompt('כדי למחוק הכל הקלד "מחק הכל"') === "מחק הכל") {
          setIsLoading(true);
          await dbService.deleteAllActivities();
          await fetchActivities();
      }
  }

  // Filtering & Stats
  const filteredActivities = activities.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          a.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || a.category === filterCategory;
    const matchesLocation = filterLocation === 'all' || a.location.includes(filterLocation);
    
    return matchesSearch && matchesCategory && matchesLocation;
  });

  const availableLocations = [...new Set(activities.map(a => a.location.split(',')[0].trim()))].sort();
  const uniqueLocationsCount = new Set(activities.map(a => a.location.split(',')[0].trim())).size;

  const getRoleLabel = (role: UserRole | null) => {
      switch(role) {
          case 'super_admin': return 'מנהל על';
          case 'admin': return 'מנהל';
          case 'editor': return 'עורך';
          default: return 'אורח';
      }
  };

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        <p className="text-gray-500 font-medium">טוען מערכת ניהול...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 font-sans flex flex-col md:flex-row" dir="rtl">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="bg-orange-100 p-1.5 rounded-lg">
                <Database className="w-5 h-5 text-orange-600" />
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
              <div className="bg-orange-100 p-2 rounded-lg">
                  <Database className="w-6 h-6 text-orange-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-800">מערכת ניהול</h1>
          </div>

          <div className="p-4 space-y-1">
              <button 
                onClick={() => { setCurrentView('list'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${currentView === 'list' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                  <List className="w-5 h-5" />
                  רשימת חוגים
              </button>
              
              {/* Only admins and super admins can do bulk updates */}
              {canCreate(userRole) && (
                <button 
                    onClick={() => { setCurrentView('bulk'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${currentView === 'bulk' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    <LayoutGrid className="w-5 h-5" />
                    ניהול קבוצתי
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
          </div>

          <div className="absolute bottom-0 w-full p-4 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3 mb-4 px-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${userRole === 'super_admin' ? 'bg-purple-600' : 'bg-orange-500'}`}>
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
            
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                        {currentView === 'list' ? 'רשימת החוגים' : currentView === 'bulk' ? 'עריכה וניהול קבוצתי' : 'ניהול צוות'}
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
                            className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-full hover:bg-orange-600 transition-all shadow-md hover:shadow-lg text-sm font-bold"
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
                                className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-sm"
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
                            <select 
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="pr-8 pl-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer min-w-[140px]"
                            >
                                <option value="all">כל הקטגוריות</option>
                                {CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                             <select 
                                value={filterLocation}
                                onChange={(e) => setFilterLocation(e.target.value)}
                                className="pr-8 pl-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer min-w-[140px]"
                            >
                                <option value="all">כל המיקומים</option>
                                {availableLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Empty State / Migration */}
                    {activities.length === 0 && !isLoading && canCreate(userRole) && (
                        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-8 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-50 mb-4">
                                <Database className="w-8 h-8 text-orange-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">אין נתונים במערכת</h3>
                            <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
                                <button onClick={handleInitialMigration} className="px-5 py-2 bg-orange-100 text-orange-700 rounded-lg font-medium hover:bg-orange-200 transition-colors">
                                    טען נתוני דמו
                                </button>
                                <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileUpload}/>
                                <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                                    ייבא JSON
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Content: Mobile Cards & Desktop Table */}
                    <div className="space-y-4">
                        {/* Mobile Cards View */}
                        <div className="grid grid-cols-1 gap-4 md:hidden">
                            {filteredActivities.map(activity => (
                                <div key={activity.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4">
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
                                            <span className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                                                {activity.category}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1 truncate">{activity.location}</p>
                                        <div className="flex items-center justify-between mt-3">
                                            <span className="font-bold text-green-600">{activity.price} ₪</span>
                                            <div className="flex gap-2">
                                                {canEdit(userRole) && (
                                                    <button onClick={() => handleEdit(activity)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {canDelete(userRole) && (
                                                    <button onClick={() => handleDelete(activity.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">פעילות</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">קטגוריה</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">מיקום</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">מחיר</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">פעולות</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredActivities.map(activity => (
                                        <tr key={activity.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden mr-3">
                                                        {activity.imageUrl && <img className="h-10 w-10 object-cover" src={activity.imageUrl} alt="" />}
                                                    </div>
                                                    <div className="mr-4">
                                                        <div className="text-sm font-medium text-gray-900">{activity.title}</div>
                                                        <div className="text-xs text-gray-500">{activity.ageGroup}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex px-2.5 py-0.5 text-xs font-medium text-orange-800 bg-orange-100 rounded-full">
                                                    {activity.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {activity.location}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">
                                                ₪{activity.price}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                                                <div className="flex items-center justify-end gap-2">
                                                    {canEdit(userRole) && (
                                                        <button onClick={() => handleEdit(activity)} className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded">
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {canDelete(userRole) && (
                                                        <button onClick={() => handleDelete(activity.id)} className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
            
            {/* Footer Stats (Desktop) */}
            {currentView !== 'users' && (
                <div className="mt-8 hidden md:grid grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className="bg-blue-50 p-3 rounded-full text-blue-600"><Layers className="w-5 h-5"/></div>
                        <div>
                            <p className="text-xs text-gray-500">סה"כ חוגים</p>
                            <p className="text-lg font-bold text-gray-800">{activities.length}</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className="bg-purple-50 p-3 rounded-full text-purple-600"><MapPin className="w-5 h-5"/></div>
                        <div>
                            <p className="text-xs text-gray-500">מרכזים פעילים</p>
                            <p className="text-lg font-bold text-gray-800">{uniqueLocationsCount}</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className="bg-green-50 p-3 rounded-full text-green-600"><BarChart3 className="w-5 h-5"/></div>
                        <div>
                            <p className="text-xs text-gray-500">מחיר ממוצע</p>
                            <p className="text-lg font-bold text-gray-800">
                                ₪{activities.length > 0 ? Math.round(activities.reduce((acc, curr) => acc + curr.price, 0) / activities.length) : 0}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Danger Zone Footer */}
            {activities.length > 0 && userRole === 'super_admin' && currentView !== 'users' && (
                <div className="mt-12 pt-8 border-t border-gray-200">
                    <button onClick={handleDeleteAll} className="text-xs text-red-400 hover:text-red-600 underline">
                        מחיקת כל הנתונים (למפתחים בלבד)
                    </button>
                </div>
            )}

        </div>
      </main>

      {/* Activity Form Modal */}
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