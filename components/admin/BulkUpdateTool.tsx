
import React, { useState, useMemo } from 'react';
import { Activity } from '../../types';
import { dbService } from '../../services/dbService';
import { CATEGORIES } from '../../constants';
import ActivityCard from '../ActivityCard';
import { 
    Filter, Search, CheckCircle, Zap, RefreshCw, Eye, List, 
    ChevronUp, ChevronDown, Image as ImageIcon, EyeOff, X, Check
} from 'lucide-react';

interface BulkUpdateToolProps {
    activities: Activity[];
    onUpdate: () => void;
}

type FilterType = 'title' | 'category' | 'location' | 'age';

const BulkUpdateTool: React.FC<BulkUpdateToolProps> = ({ activities, onUpdate }) => {
    // Filter State
    const [filterType, setFilterType] = useState<FilterType>('title');
    const [selectedValues, setSelectedValues] = useState<string[]>([]);
    const [searchText, setSearchText] = useState('');
    
    // Action State
    const [updateField, setUpdateField] = useState<'imageUrl' | 'category' | 'price' | 'isVisible'>('isVisible');
    const [updateValue, setUpdateValue] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [expandedId, setExpandedId] = useState<string | number | null>(null);

    // --- Derived Data for Selection Grid ---
    const availableOptions = useMemo(() => {
        let options: string[] = [];
        
        if (filterType === 'title') {
            // Extract clean group names (e.g., "Judo - Center" -> "Judo")
            options = activities.map(a => a.title.split('-')[0].trim());
        } else if (filterType === 'category') {
            options = activities.map(a => a.category);
        } else if (filterType === 'location') {
            options = activities.map(a => a.location.split(',')[0].trim());
        } else if (filterType === 'age') {
            options = activities.map(a => a.ageGroup);
        }

        // Unique and sorted
        return [...new Set(options)].filter(Boolean).sort();
    }, [activities, filterType]);

    const filteredOptions = useMemo(() => {
        if (!searchText) return availableOptions;
        return availableOptions.filter(opt => opt.toLowerCase().includes(searchText.toLowerCase()));
    }, [availableOptions, searchText]);

    // --- Filtering Logic ---
    const matchingActivities = useMemo(() => {
        // If nothing selected and no search text (and we haven't selected anything yet), show nothing to avoid accidents
        if (selectedValues.length === 0 && !searchText) return [];

        return activities.filter(a => {
            let val = '';
            
            if (filterType === 'title') val = a.title.split('-')[0].trim();
            else if (filterType === 'category') val = a.category;
            else if (filterType === 'location') val = a.location.split(',')[0].trim();
            else if (filterType === 'age') val = a.ageGroup;

            // Match if value is in selected list OR (if list empty) matches search text
            const matchesSelection = selectedValues.length > 0 
                ? selectedValues.includes(val)
                : true;

            const matchesSearch = searchText 
                ? val.toLowerCase().includes(searchText.toLowerCase())
                : true;

            // If we have selections, we ignore the search text for the *final filtering* 
            // (search is just used to find options to select). 
            // BUT, if no selections, we treat search text as a free-text filter.
            if (selectedValues.length > 0) {
                return matchesSelection;
            } else {
                return matchesSearch;
            }
        });
    }, [activities, filterType, selectedValues, searchText]);

    // --- Handlers ---
    const toggleSelection = (value: string) => {
        setSelectedValues(prev => 
            prev.includes(value) 
                ? prev.filter(v => v !== value) 
                : [...prev, value]
        );
    };

    const handleFilterTypeChange = (type: FilterType) => {
        setFilterType(type);
        setSelectedValues([]); // Reset selections on type change
        setSearchText('');
    };

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
            // Clear selection after update
            setSelectedValues([]);
            setSearchText('');
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

    const renderFilterTab = (type: FilterType, label: string) => (
        <button
            onClick={() => handleFilterTypeChange(type)}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                filterType === type 
                    ? 'bg-sky-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Panel: Advanced Multi-Select Filter */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4 shrink-0">
                        <div className="bg-sky-100 p-2 rounded-lg text-sky-600">
                            <Filter className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 text-lg">1. איתור ובחירת חוגים</h3>
                            <p className="text-xs text-gray-500">סמן את הקבוצות שברצונך לערוך</p>
                        </div>
                    </div>

                    <div className="space-y-4 flex-col flex h-full overflow-hidden">
                        
                        {/* Filter Tabs */}
                        <div className="flex gap-2 shrink-0">
                            {renderFilterTab('title', 'שם החוג')}
                            {renderFilterTab('category', 'קטגוריה')}
                            {renderFilterTab('age', 'גילאים')}
                            {renderFilterTab('location', 'מיקום')}
                        </div>

                        {/* Search Input */}
                        <div className="relative shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                placeholder={`חיפוש ${filterType === 'title' ? 'חוג' : filterType === 'category' ? 'קטגוריה' : 'ערך'}...`}
                                className="block w-full p-2.5 pl-10 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-sky-500 outline-none bg-gray-50"
                            />
                        </div>

                        {/* Selected Tags Area */}
                        {selectedValues.length > 0 && (
                            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto shrink-0 p-2 bg-sky-50 rounded-xl border border-sky-100">
                                {selectedValues.map(val => (
                                    <button 
                                        key={val} 
                                        onClick={() => toggleSelection(val)}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-white text-sky-700 text-xs font-bold rounded-full border border-sky-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                                    >
                                        {val}
                                        <X className="w-3 h-3" />
                                    </button>
                                ))}
                                <button 
                                    onClick={() => setSelectedValues([])}
                                    className="text-xs text-sky-600 underline px-2"
                                >
                                    נקה הכל
                                </button>
                            </div>
                        )}

                        {/* Options Grid (Scrollable) */}
                        <div className="flex-1 overflow-y-auto border border-gray-100 rounded-xl p-2 bg-gray-50">
                            {filteredOptions.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {filteredOptions.map(opt => {
                                        const isSelected = selectedValues.includes(opt);
                                        return (
                                            <button
                                                key={opt}
                                                onClick={() => toggleSelection(opt)}
                                                className={`text-right px-3 py-2 rounded-lg text-xs font-medium transition-all border flex justify-between items-center ${
                                                    isSelected 
                                                        ? 'bg-sky-500 text-white border-sky-600 shadow-sm' 
                                                        : 'bg-white text-gray-600 border-gray-200 hover:border-sky-300 hover:bg-sky-50'
                                                }`}
                                            >
                                                <span className="truncate ml-2" title={opt}>{opt}</span>
                                                {isSelected && <Check className="w-3 h-3 shrink-0" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                                    לא נמצאו תוצאות לחיפוש זה
                                </div>
                            )}
                        </div>
                        
                        {/* Counter Footer */}
                        <div className={`shrink-0 p-3 rounded-xl border border-dashed flex items-center justify-center gap-2 transition-colors ${matchingActivities.length > 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                            {matchingActivities.length > 0 ? (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="font-bold">נבחרו {matchingActivities.length} חוגים לעדכון</span>
                                </>
                            ) : (
                                <span>אנא בחר אפשרויות מהרשימה...</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Action & Preview */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
                     <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4 shrink-0">
                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                            <Zap className="w-5 h-5" />
                        </div>
                         <div>
                            <h3 className="font-bold text-gray-800 text-lg">2. החלת שינויים</h3>
                            <p className="text-xs text-gray-500">הגדרת הפעולה לביצוע על החוגים שנבחרו</p>
                        </div>
                    </div>

                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="space-y-5 shrink-0">
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

                        <div className="flex-1 flex flex-col overflow-hidden mt-6">
                             <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-2 text-center">תצוגה מקדימה חיה</span>
                             <div className="flex-1 overflow-y-auto p-2 border border-gray-100 rounded-xl bg-gray-50">
                                <div className="transform scale-90 origin-top">
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
                                        <div className="h-48 w-full flex flex-col items-center justify-center text-gray-300 text-center">
                                            <Eye className="w-8 h-8 mb-2 opacity-50" />
                                            <span className="text-xs">בחר חוגים כדי לראות תצוגה מקדימה</span>
                                        </div>
                                    )}
                                </div>
                             </div>
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
