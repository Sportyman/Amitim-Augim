
import React, { useEffect, useState } from 'react';
import { dbService } from '../../services/dbService';
import { AppSettings } from '../../types';
import { Settings, Palette, CheckCircle, ToggleLeft, ToggleRight } from 'lucide-react';

const SettingsPanel: React.FC = () => {
    const [settings, setSettings] = useState<AppSettings>({ enableColorfulCategories: false });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        const data = await dbService.getAppSettings();
        setSettings(data);
        setLoading(false);
    };

    const toggleSetting = async (key: keyof AppSettings) => {
        setSaving(true);
        const newValue = !settings[key];
        const newSettings = { ...settings, [key]: newValue };
        setSettings(newSettings); // Optimistic update
        
        try {
            await dbService.updateAppSettings({ [key]: newValue });
        } catch (error) {
            console.error("Failed to save setting");
            setSettings(settings); // Revert
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">טוען הגדרות...</div>;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                <div className="bg-gray-100 p-2 rounded-lg text-gray-600">
                    <Settings className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-800">הגדרות מערכת</h3>
                    <p className="text-sm text-gray-500">שליטה על נראות והתנהגות האפליקציה</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Category Design Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className="flex gap-4">
                        <div className={`p-3 rounded-full ${settings.enableColorfulCategories ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                            <Palette className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800">עיצוב קטגוריות צבעוני</h4>
                            <p className="text-sm text-gray-500 max-w-md">
                                החלף את מסגרת הקטגוריות הרגילה בעיצוב Gradient (מעבר צבעים) צעיר ודינמי.
                            </p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => toggleSetting('enableColorfulCategories')}
                        disabled={saving}
                        className={`transform transition-all duration-300 ${settings.enableColorfulCategories ? 'text-green-500 scale-110' : 'text-gray-300'}`}
                    >
                        {settings.enableColorfulCategories ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
                    </button>
                </div>
            </div>
            
            <div className="mt-8 p-4 bg-blue-50 rounded-xl flex items-center gap-3 text-blue-800 text-sm">
                <CheckCircle className="w-5 h-5" />
                <span>השינויים נשמרים אוטומטית ומשפיעים מיד על כל המשתמשים באפליקציה.</span>
            </div>
        </div>
    );
};

export default SettingsPanel;
