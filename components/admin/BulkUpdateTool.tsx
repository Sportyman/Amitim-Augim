
import React, { useState } from 'react';
import { Activity } from '../../types';
import { dbService } from '../../services/dbService';
import { CATEGORIES } from '../../constants';
import ActivityCard from '../ActivityCard';
import { parseAgeGroupToRange } from '../../utils/helpers';
import { 
    Filter, Search, CheckCircle, Zap, RefreshCw, Eye, List, 
    ChevronUp, ChevronDown, Image as ImageIcon, EyeOff 
} from 'lucide-react';

interface BulkUpdateToolProps {
    activities: Activity[];
    onUpdate: () => void;
}

const BulkUpdateTool: React.FC<BulkUpdateToolProps> = ({ activities, onUpdate }) => {
    const [searchField, setSearchField] = useState<'title' | 'category' | 'location' | 'age'>('title');
    const [ageOperator, setAgeOperator] = useState<'max_lt' | 'min_gt'>('max_lt'); // max_lt = kids (max age < X), min_gt = seniors (min age > X)
    const [searchValue, setSearchValue] = useState('');
    
    const [updateField, setUpdateField] = useState<'imageUrl' | 'category' | 'price' | 'isVisible'>('isVisible');
    const [updateValue, setUpdateValue] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [expandedId, setExpandedId] = useState<string | number | null>(null);

    const matchingActivities = activities.filter(a => {
        if (!searchValue) return false;

        // Age Logic
        if (searchField === 'age') {
            const threshold = parseInt(searchValue, 10);
            if (isNaN(threshold)) return false;

            // Determine Min/Max for this activity
            let min = a.minAge;
            let max = a.maxAge;

            // Fallback to parsing string if numeric fields are missing
            if (min === undefined || max === undefined) {
                const range = parseAgeGroupToRange(a.ageGroup);
                if (range) {
                    min = range[0];
                    max = range[1];
                } else {
                    return false; // Can't determine age
                }
            }

            if (ageOperator === 'max_lt') {
                // "Hide all under 18" -> We look for activities where the Max Age is <= 18
                // e.g. "6-9" (max 9) matches. "16-20" (max 20) does NOT match.
                return max !== undefined && max <= threshold;
            } else if (ageOperator === 'min_gt') {
                // "Hide all over 66" -> We look for activities where Min Age is >= 66
                return min !== undefined && min >= threshold;
            }
            return false;
        }

        // Standard Text Logic
        const val = String(a[searchField as keyof Activity] || '').toLowerCase();
        return val.includes(searchValue.toLowerCase());
    });

    // Logic to handle boolean visibility for preview
    const previewActivity: Activity | null = matchingActivities.length > 0 ? {
        ...matchingActivities[0],
        [updateField]: updateField === 'price' 
            ? Number(updateValue) 
            : updateField === 'isVisible' 
                ? (updateValue === 'true') 
                : updateValue
    } : null;

    const handleExecute = async () => {
        if (matchingActivities.length === 0) return;
        
        const actionName = updateField === 'isVisible' 
            ? (updateValue === 'false' ? 'הסתרת' : 'הצגת') 
            : 'עדכון';
            
        if (!window.confirm(`האם אתה בטוח שברצונך לבצע ${actionName} עבור ${matchingActivities.length} החוגים שנמצאו?`)) return;

        setIsProcessing(true);
        try {
            const ids = matchingActivities.map(a => String(a.id));
            let val: any = updateValue;
            if (updateField === 'price') val = Number(updateValue);
            if (updateField === 'isVisible') val = (updateValue === 'true');

            const updates = { [updateField]: val };
            await dbService.updateActivitiesBatch(ids, updates);
            alert('העדכון בוצע בהצלחה!');
            onUpdate();
        } catch (e) {
            console.error(e);
            alert('שגיאה בביצוע העדכון');
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleRowExpansion = (id: string | number) => {
        setExpandedId(prevId => prevId === id ? null : id);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Panel: Filter */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                        <div className="bg-sky-100 p-2 rounded-lg text-sky-600">
                            <Filter className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 text-lg">1. סינון ואיתור חוגים</h3>
                            <p className="text-xs text-gray-500">בחר אילו חוגים ברצונך לעדכן</p>
                        </div>
                    </div>

                    <div className="space-y-5 flex-1">
                        <div>
                            <label className="text-sm font-bold text-gray-700 mb-2 block">סנן לפי שדה:</label>
                            <select 
                                value={searchField} 
                                onChange={(e) => {
                                    setSearchField(e.target.value as any);
                                    setSearchValue(''); // Reset search on field change
                                }}
                                className="block w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-sky-500 outline-none bg-gray-50"
                            >
                                <option value="title">שם החוג (מכיל טקסט)</option>
                                <option value="category">קטגוריה נוכחית</option>
                                <option value="location">מיקום</option>
                                <option value="age">קהל יעד (גיל)</option>
                            </select>
                        </div>

                        {/* Dynamic Input based on Field */}
                        <div>
                            <label className="text-sm font-bold text-gray-700 mb-2 block">ערך לסינון:</label>
                            
                            {searchField === 'age' ? (
                                <div className="flex gap-2">
                                    <select
                                        value={ageOperator}
                                        onChange={(e) => setAgeOperator(e.target.value as any)}
                                        className="w-1/2 p-3 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:ring-2 focus:ring-sky-500 outline-none"
                                    >
                                        <option value="max_lt">קהל יעד צעיר מ- (מתאים לילדים/נוער)</option>
                                        <option value="min_gt">קהל יעד מבוגר מ- (מתאים למבוגרים/גיל זהב)</option>
                                    </select>
                                    <input 
                                        type="number" 
                                        value={searchValue}
                                        onChange={(e) => setSearchValue(e.target.value)}
                                        placeholder="גיל (לדוגמה: 18)"
                                        className="w-1/2 p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-sky-500 outline-none bg-gray-50"
                                    />
                                </div>
                            ) : (
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input 
                                        type="text" 
                                        value={searchValue}
                                        onChange={(e) => setSearchValue(e.target.value)}
                                        placeholder={searchField === 'title' ? "למשל: ג'ודו" : searchField === 'category' ? "למשל: ספורט" : "למשל: מתנ\"ס יבור"}
                                        className="block w-full p-3 pl-10 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-sky-500 outline-none bg-gray-50"
                                    />
                                </div>
                            )}
                            {searchField === 'age' && (
                                <p className="text-xs text-gray-400 mt-2">
                                    * מסנן לפי גיל מינימלי/מקסימלי של החוג
                                </p>
                            )}
                        </div>
                        
                        <div className={`mt-4 p-4 rounded-xl border border-dashed flex items-center justify-center gap-2 transition-colors ${matchingActivities.length > 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                            {matchingActivities.length > 0 ? (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="font-bold">נמצאו {matchingActivities.length} חוגים לעדכון</span>
                                </>
                            ) : (
                                <span>התחל להקליד כדי למצוא חוגים...</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Action */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
                     <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                            <Zap className="w-5 h-5" />
                        </div>
                         <div>
                            <h3 className="font-bold text-gray-800 text-lg">2. ביצוע העדכון</h3>
                            <p className="text-xs text-gray-500">קבע את השינוי וראה איך הוא נראה</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 h-full">
                        <div className="space-y-5">
                            <div>
                                <label className="text-sm font-bold text-gray-700 mb-2 block">שדה לעדכון:</label>
                                <select 
                                    value={updateField} 
                                    onChange={(e) => setUpdateField(e.target.value as any)}
                                    className="block w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50"
                                >
                                    <option value="isVisible">נראות (הצגה/הסתרה)</option>
                                    <option value="imageUrl">תמונה ראשית</option>
                                    <option value="category">קטגוריה</option>
                                    <option value="price">מחיר</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-bold text-gray-700 mb-2 block">ערך חדש:</label>
                                {updateField === 'category' ? (
                                    <select 
                                        value={updateValue}
                                        onChange={(e) => setUpdateValue(e.target.value)}
                                        className="block w-full p-3 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">בחר קטגוריה...</option>
                                        {CATEGORIES.map(c => (
                                            <option key={c.id} value={c.name}>{c.name}</option>
                                        ))}
                                    </select>
                                ) : updateField === 'isVisible' ? (
                                     <select 
                                        value={updateValue}
                                        onChange={(e) => setUpdateValue(e.target.value)}
                                        className="block w-full p-3 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">בחר סטטוס...</option>
                                        <option value="true">הצג באפליקציה (פעיל)</option>
                                        <option value="false">הסתר מהאפליקציה (לא פעיל)</option>
                                    </select>
                                ) : (
                                    <input 
                                        type={updateField === 'price' ? 'number' : 'text'} 
                                        value={updateValue}
                                        onChange={(e) => setUpdateValue(e.target.value)}
                                        placeholder={updateField === 'imageUrl' ? 'https://...' : 'הכנס ערך חדש'}
                                        className="block w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 text-left dir-ltr"
                                        dir={updateField === 'imageUrl' ? 'ltr' : 'rtl'}
                                    />
                                )}
                            </div>

                            <button 
                                onClick={handleExecute}
                                disabled={matchingActivities.length === 0 || !updateValue || isProcessing}
                                className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <span className="animate-pulse">מעדכן נתונים...</span>
                                ) : (
                                    <>
                                        <RefreshCw className="w-4 h-4" />
                                        <span>עדכן {matchingActivities.length} חוגים</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="flex flex-col">
                             <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-2 text-center">תצוגה מקדימה חיה</span>
                             <div className="transform scale-90 origin-top -mt-2 pointer-events-none opacity-80">
                                {previewActivity ? (
                                    <div className="relative">
                                         <ActivityCard activity={previewActivity} onShowDetails={() => {}} />
                                         {updateField === 'isVisible' && updateValue === 'false' && (
                                             <div className="absolute inset-0 bg-gray-800/60 flex items-center justify-center rounded-lg backdrop-blur-[1px]">
                                                 <div className="bg-white px-4 py-2 rounded-full flex items-center gap-2 font-bold text-gray-800 shadow-lg">
                                                     <EyeOff className="w-4 h-4 text-red-500"/>
                                                     יוסתר מהאפליקציה
                                                 </div>
                                             </div>
                                         )}
                                    </div>
                                ) : (
                                    <div className="h-64 w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                                        <Eye className="w-8 h-8 mb-2 opacity-50" />
                                        <span className="text-xs">הכרטיס יופיע כאן לאחר שיימצאו תוצאות</span>
                                    </div>
                                )}
                             </div>
                             {previewActivity && (
                                <div className="text-center text-[10px] text-gray-400 mt-2">
                                    * הדגמה על החוג הראשון ברשימה
                                </div>
                             )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Table */}
            {matchingActivities.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                    <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                        <h4 className="font-bold text-gray-800 flex items-center gap-2">
                            <List className="w-5 h-5 text-sky-600" />
                            רשימת החוגים שיעודכנו ({matchingActivities.length})
                        </h4>
                    </div>

                    <div className="overflow-x-auto">
                         <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase w-10"></th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">פעילות</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">קטגוריה</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">מיקום</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">גילאים</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">סטטוס</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {matchingActivities.map(activity => (
                                    <React.Fragment key={activity.id}>
                                        <tr 
                                            onClick={() => toggleRowExpansion(activity.id)} 
                                            className={`cursor-pointer transition-colors ${expandedId === activity.id ? 'bg-sky-50' : 'hover:bg-gray-50'} ${activity.isVisible === false ? 'bg-red-50/50' : ''}`}
                                        >
                                            <td className="px-6 py-4 text-gray-400">
                                                {expandedId === activity.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden mr-3 border border-gray-200">
                                                        {activity.imageUrl ? (
                                                            <img className="h-10 w-10 object-cover" src={activity.imageUrl} alt="" />
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full w-full text-gray-400"><ImageIcon className="w-5 h-5"/></div>
                                                        )}
                                                    </div>
                                                    <div className="mr-4">
                                                        <div className="text-sm font-medium text-gray-900">{activity.title}</div>
                                                        <div className="text-xs text-gray-500">{activity.ageGroup}</div>
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
                                                {activity.minAge && activity.maxAge ? `${activity.minAge}-${activity.maxAge}` : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-left text-xs">
                                                 {activity.isVisible === false ? (
                                                     <span className="text-red-500 font-bold flex items-center gap-1"><EyeOff className="w-3 h-3"/> מוסתר</span>
                                                 ) : (
                                                     <span className="text-green-600 flex items-center gap-1"><Eye className="w-3 h-3"/> גלוי</span>
                                                 )}
                                            </td>
                                        </tr>
                                        
                                        {expandedId === activity.id && (
                                            <tr className="bg-gray-50 animate-in fade-in duration-200">
                                                <td colSpan={6} className="px-6 py-6 border-t border-gray-100">
                                                    <div className="flex gap-8">
                                                        <div className="w-64 h-40 bg-white rounded-xl overflow-hidden flex-shrink-0 border border-gray-200 shadow-sm">
                                                             {activity.imageUrl ? (
                                                                <img src={activity.imageUrl} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="flex items-center justify-center h-full w-full text-gray-300"><ImageIcon className="w-12 h-12"/></div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 space-y-3">
                                                            <h4 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2">פרטים נוספים</h4>
                                                            <p className="text-sm text-gray-600 leading-relaxed">
                                                                {activity.description || "אין תיאור זמין."}
                                                            </p>
                                                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mt-4">
                                                                <div><span className="font-semibold">מדריך:</span> {activity.instructor || '-'}</div>
                                                                <div><span className="font-semibold">לו"ז:</span> {activity.schedule}</div>
                                                                <div><span className="font-semibold">מחיר:</span> ₪{activity.price}</div>
                                                                <div><span className="font-semibold">קישור:</span> <a href={activity.detailsUrl} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">פתח קישור</a></div>
                                                            </div>
                                                             <div className="flex flex-wrap gap-2 pt-2">
                                                                {activity.ai_tags?.map((tag, i) => (
                                                                    <span key={i} className="px-2 py-1 bg-white border border-gray-200 rounded-md text-xs text-gray-500">#{tag}</span>
                                                                ))}
                                                            </div>
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
            )}
        </div>
    );
};

export default BulkUpdateTool;
