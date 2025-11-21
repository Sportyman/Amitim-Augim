
import React, { useState, useEffect } from 'react';
import { AdminUser, UserRole } from '../../types';
import { dbService } from '../../services/dbService';
import { Users, Trash2 } from 'lucide-react';

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
                                        <span><Trash2 className="w-4 h-4" /></span>
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

export default UserManagement;
