
import React, { useState, useRef, useEffect } from 'react';
import { dbService } from '../../services/dbService';
import { 
    Trash2, Upload, AlertTriangle, FileSpreadsheet, ImageOff, 
    RefreshCw, ShieldCheck, HardDrive, History, RotateCcw, 
    BarChart3, CheckCircle, Clock
} from 'lucide-react';
import { Activity, AuditLog } from '../../types';

interface DatabaseManagementProps {
    onRefresh: () => void;
}

const DatabaseManagement: React.FC<DatabaseManagementProps> = ({ onRefresh }) => {
    const [activeTab, setActiveTab] = useState<'sync' | 'history' | 'usage'>('sync');
    
    // Sync State
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteImages, setDeleteImages] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragActive, setIsDragActive] = useState(false);
    const [archiveMissing, setArchiveMissing] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // History State
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);

    // Usage State
    const [stats, setStats] = useState<any>(null);
    const [cleaningLogs, setCleaningLogs] = useState(false);

    // --- Effects ---
    useEffect(() => {
        if (activeTab === 'history') loadLogs();
        if (activeTab === 'usage') loadStats();
    }, [activeTab]);

    const loadLogs = async () => {
        setIsLoadingLogs(true);
        const data = await dbService.getAuditLogs(50);
        setLogs(data);
        setIsLoadingLogs(false);
    };

    const loadStats = async () => {
        const s = await dbService.getCollectionStats();
        setStats(s);
    };

    // --- Actions ---

    const handleRestore = async (log: AuditLog) => {
        if (!confirm('האם לשחזר לגרסה זו?')) return;
        try {
            await dbService.restoreVersion(log);
            alert('שוחזר בהצלחה!');
            loadLogs(); // refresh logs
            onRefresh(); // refresh app
        } catch (e) {
            alert('שגיאה בשחזור');
        }
    };

    const handleCleanupLogs = async () => {
        if (!confirm('האם למחוק לוגים ישנים מחודש? פעולה זו תחסוך מקום אך תמנע שחזור היסטורי.')) return;
        setCleaningLogs(true);
        try {
            const count = await dbService.deleteOldLogs(30); // Keep 30 days
            alert(`נמחקו ${count} רשומות היסטוריה.`);
            loadStats();
        } catch (e) {
            alert('שגיאה בניקוי');
        } finally {
            setCleaningLogs(false);
        }
    };

    const handleDeleteAll = async () => {
        if (!window.confirm('אזהרה חמורה: פעולה זו תמחק את כל החוגים הקיימים במערכת!\n\nהאם אתה בטוח לחלוטין שברצונך להמשיך?')) {
            return;
        }
        
        if (!window.confirm('אישור אחרון: כל המידע יימחק ולא ניתן יהיה לשחזר אותו. להמשיך?')) {
            return;
        }

        setIsDeleting(true);
        try {
            await dbService.deleteAllActivities();
            if (deleteImages) {
                await dbService.clearImageCache();
                alert('כל הנתונים נמחקו, כולל זכרון התמונות.');
            } else {
                alert('כל החוגים נמחקו בהצלחה.\nזכרון התמונות נשמר.');
            }
            onRefresh();
            loadStats();
        } catch (error) {
            console.error(error);
            alert('אירעה שגיאה בעת המחיקה.');
        } finally {
            setIsDeleting(false);
        }
    };

    // --- CSV Parser (Existing Logic) ---
    const robustCSVParser = (text: string): string[][] => {
        const cleanText = text.trim().replace(/^\uFEFF/, '');
        const firstLine = cleanText.split('\n')[0];
        const commaCount = (firstLine.match(/,/g) || []).length;
        const tabCount = (firstLine.match(/\t/g) || []).length;
        const separator = tabCount > commaCount ? '\t' : ',';

        const rows: string[][] = [];
        let currentRow: string[] = [];
        let currentField = '';
        let inQuotes = false;
        
        for (let i = 0; i < cleanText.length; i++) {
            const char = cleanText[i];
            const nextChar = cleanText[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    currentField += '"';
                    i++; 
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === separator && !inQuotes) {
                currentRow.push(currentField);
                currentField = '';
            } else if ((char === '\n' || char === '\r') && !inQuotes) {
                if (char === '\r' && nextChar === '\n') i++;
                currentRow.push(currentField);
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
            } else {
                currentField += char;
            }
        }
        if (currentField || currentRow.length) {
            currentRow.push(currentField);
            rows.push(currentRow);
        }
        return rows;
    };

    const parseCSV = (csvText: string): Activity[] => {
        const rows = robustCSVParser(csvText);
        if (rows.length < 2) return [];
        const headers = rows[0].map(h => h.trim().toLowerCase().replace(/^"|"$/g, '').replace(/_/g, ''));
        
        const getColumnIndex = (keywords: string[]) => {
            let idx = headers.findIndex(h => keywords.some(k => h === k.replace(/_/g, '')));
            if (idx === -1) {
                idx = headers.findIndex(h => keywords.some(k => h.includes(k.replace(/_/g, ''))));
            }
            return idx;
        };

        const colMap = {
            id: getColumnIndex(['activity_id', 'id', 'code', 'מזהה', 'קוד']), 
            name: getColumnIndex(['name', 'title', 'activity_name', 'שם', 'שם_החוג', 'פעילות']), 
            centerName: getColumnIndex(['center_name', 'center', 'location_name', 'מרכז', 'מתנס', 'מיקום']),
            address: getColumnIndex(['center_address', 'address', 'street', 'כתובת', 'רחוב']),
            city: getColumnIndex(['city', 'city_name', 'עיר']),
            instructor: getColumnIndex(['instructor', 'teacher', 'guide', 'מדריך', 'מורה']),
            phone: getColumnIndex(['phone', 'mobile', 'contact', 'טלפון', 'נייד']),
            ageMin: getColumnIndex(['age_min', 'min_age', 'גיל_מינימום', 'מגיל']),
            ageMax: getColumnIndex(['age_max', 'max_age', 'גיל_מקסימום', 'עד_גיל']),
            mainAgeGroup: getColumnIndex(['age_group', 'audience', 'קהל_יעד', 'גילאים']),
            frequency: getColumnIndex(['frequency', 'times', 'תדירות', 'פעמים']),
            meetingsJson: getColumnIndex(['meetings_json', 'schedule_json']),
            daysList: getColumnIndex(['days', 'days_list', 'ימים']),
            price: getColumnIndex(['price', 'cost', 'amount', 'מחיר', 'עלות']),
            descRaw: getColumnIndex(['description', 'desc', 'summary', 'תיאור', 'פרטים']),
            categoriesApp: getColumnIndex(['category', 'categories', 'type', 'קטגוריה', 'תחום']),
            tags: getColumnIndex(['tags', 'keywords', 'תגיות']),
            regLink: getColumnIndex(['link', 'url', 'registration', 'קישור', 'הרשמה'])
        };

        const activities: Activity[] = [];

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length < 2 && !row[0]) continue;

            const getVal = (idx: number) => {
                if (idx === -1 || !row[idx]) return '';
                let val = row[idx].trim();
                if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
                val = val.replace(/""/g, '"');
                if (val === 'nan' || val === 'NULL' || val === 'None') return '';
                return val;
            };

            let activityId = getVal(colMap.id);
            const title = getVal(colMap.name);
            if (!title) continue;

            if (!activityId) {
                activityId = `gen_${title.replace(/\s+/g, '_')}_${i}`;
            }

            const center = getVal(colMap.centerName);
            const address = getVal(colMap.address);
            const city = getVal(colMap.city) || 'הרצליה';
            
            let fullLocation = center;
            if (address && address !== center) {
                // Only add city to full location if it's not already there
                if (!address.includes(city)) {
                    fullLocation += `, ${address}, ${city}`;
                } else {
                    fullLocation += `, ${address}`;
                }
            } else if (!center.includes(city)) {
                 fullLocation += `, ${city}`;
            }

            const priceVal = parseFloat(getVal(colMap.price).replace(/[^\d.]/g, ''));
            const price = (!isNaN(priceVal)) ? priceVal : 0;

            let description = getVal(colMap.descRaw);
            const minAge = parseFloat(getVal(colMap.ageMin));
            const maxAge = parseFloat(getVal(colMap.ageMax));
            const mainGroup = getVal(colMap.mainAgeGroup);
            
            let ageGroupDisplay = mainGroup;
            if (!ageGroupDisplay) {
                if (!isNaN(minAge)) {
                    ageGroupDisplay = !isNaN(maxAge) ? `גילאי ${minAge}-${maxAge}` : `מגיל ${minAge}`;
                } else {
                    ageGroupDisplay = 'לכל המשפחה';
                }
            }

            // Schedule Parsing
            let scheduleStr = '';
            const freqVal = getVal(colMap.frequency);
            const meetingsRaw = getVal(colMap.meetingsJson);
            const daysRaw = getVal(colMap.daysList);

            let jsonSuccess = false;
            if (meetingsRaw && meetingsRaw.length > 2) {
                try {
                    let jsonStr = meetingsRaw.replace(/'/g, '"').replace(/False/g, 'false').replace(/True/g, 'true');
                    const meetings = JSON.parse(jsonStr);
                    if (Array.isArray(meetings) && meetings.length > 0) {
                        const parts = meetings.map((m: any) => {
                            const day = m.day || '';
                            const start = m.start || '';
                            const end = m.end || '';
                            if (start && end) return `יום ${day}' ${start}-${end}`;
                            return `יום ${day}'`;
                        });
                        scheduleStr = parts.join('. ');
                        jsonSuccess = true;
                    }
                } catch (e) {}
            }

            if (!jsonSuccess) {
                let displayFreq = '';
                let displayDays = '';
                if (freqVal) {
                    const freqNum = parseFloat(freqVal);
                    if (!isNaN(freqNum)) {
                        const roundedFreq = Math.round(freqNum);
                        switch (roundedFreq) {
                            case 1: displayFreq = 'פעם בשבוע'; break;
                            case 2: displayFreq = 'פעמיים בשבוע'; break;
                            case 3: displayFreq = '3 פעמים בשבוע'; break;
                            default: displayFreq = `${roundedFreq} פעמים בשבוע`;
                        }
                    } else {
                        displayFreq = freqVal;
                    }
                }
                if (daysRaw && daysRaw.length > 2) {
                    const cleanBrackets = daysRaw.replace(/[\[\]]/g, '');
                    const parts = cleanBrackets.split(',');
                    const cleanParts = parts.map(p => {
                        let s = p.trim();
                        if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
                            s = s.slice(1, -1);
                        }
                        s = s.replace(/\\/g, '');
                        return s.trim();
                    }).filter(s => s.length > 0);
                    
                    if (!displayFreq && cleanParts.length > 0) {
                         if (cleanParts.length === 1) displayFreq = 'פעם בשבוע';
                         else if (cleanParts.length === 2) displayFreq = 'פעמיים בשבוע';
                    }
                    displayDays = cleanParts.join(', ');
                }
                if (displayFreq && displayDays) {
                    scheduleStr = `${displayFreq}. ימים: ${displayDays}`;
                } else if (displayFreq) scheduleStr = displayFreq;
                else if (displayDays) scheduleStr = `ימים: ${displayDays}`;
            }
            
            if (!scheduleStr) scheduleStr = 'לפרטים נוספים';

            const parseListStr = (str: string): string[] => {
                if (!str || str.length < 3) return [];
                try {
                    const matches = str.match(/'([^']*)'/g);
                    if (matches) {
                        return matches.map(m => m.replace(/'/g, '').trim());
                    }
                    return JSON.parse(str.replace(/'/g, '"'));
                } catch (e) {
                    return [str.replace(/[\[\]']/g, '')];
                }
            };

            const categories = parseListStr(getVal(colMap.categoriesApp));
            let appCategory = 'ספורט';
            if (categories.length > 0) appCategory = categories[0];
            else if (title.includes('גודו') || title.includes('כדור')) appCategory = 'ספורט';
            else if (title.includes('ציור') || title.includes('אומנות')) appCategory = 'אומנות';

            const tags = parseListStr(getVal(colMap.tags));
            const finalLink = getVal(colMap.regLink) || '#';
            const instructor = getVal(colMap.instructor);
            const phone = getVal(colMap.phone);

            const activity: Activity = {
                id: activityId,
                title: title,
                category: appCategory,
                description: description,
                imageUrl: '', 
                location: fullLocation,
                city: city,
                price: price,
                ageGroup: ageGroupDisplay,
                schedule: scheduleStr,
                instructor: instructor || null,
                phone: phone || null,
                detailsUrl: finalLink,
                minAge: !isNaN(minAge) ? minAge : undefined,
                maxAge: !isNaN(maxAge) ? maxAge : undefined,
                tags: tags,
                ai_tags: tags,
                isVisible: true,
                createdAt: new Date()
            };
            activities.push(activity);
        }
        return activities;
    };

    const processFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                const dataToImport = parseCSV(content);
                if (dataToImport.length === 0) {
                    alert('לא נמצאו נתונים תקינים.');
                    return;
                }
                if (window.confirm(`נמצאו ${dataToImport.length} חוגים. האם לעדכן?`)) {
                    setIsUploading(true);
                    let staleIds: string[] = [];
                    if (archiveMissing) {
                        const existing = await dbService.getAllActivities();
                        const newIds = new Set(dataToImport.map(a => String(a.id)));
                        staleIds = existing.filter(a => !newIds.has(String(a.id))).map(a => String(a.id));
                    }
                    await dbService.importActivities(dataToImport);
                    
                    let statusMsg = `עודכנו ${dataToImport.length} חוגים.`;
                    if (staleIds.length > 0) {
                        await dbService.updateActivitiesBatch(staleIds, { isVisible: false });
                        statusMsg += `\n${staleIds.length} חוגים ישנים הועברו ל"לא פעיל".`;
                    }
                    alert(statusMsg);
                    onRefresh();
                }
            } catch (error) {
                alert('שגיאה בקריאת הקובץ.');
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) processFile(file);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            
            {/* Tabs Navigation */}
            <div className="flex border-b border-gray-200">
                <button onClick={() => setActiveTab('sync')} className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'sync' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    <div className="flex items-center gap-2"><RefreshCw className="w-4 h-4"/> סנכרון וייבוא</div>
                </button>
                <button onClick={() => setActiveTab('history')} className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'history' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    <div className="flex items-center gap-2"><History className="w-4 h-4"/> היסטוריה ושחזור</div>
                </button>
                <button onClick={() => setActiveTab('usage')} className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'usage' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    <div className="flex items-center gap-2"><BarChart3 className="w-4 h-4"/> שימוש ומכסות</div>
                </button>
            </div>

            {/* TAB 1: SYNC & IMPORT */}
            {activeTab === 'sync' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 text-lg mb-2">עדכון חכם (CSV)</h3>
                        <p className="text-sm text-gray-500 mb-6">ייבוא קובץ חדש יעדכן רשומות קיימות ויוסיף חדשות. תמונות ישמרו.</p>

                        <div 
                            className={`flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl transition-all cursor-pointer mb-4
                                ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-blue-100 bg-gray-50 hover:bg-blue-50/30'}`}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="w-10 h-10 text-blue-400 mb-3" />
                            <p className="text-gray-900 font-bold">לחץ להעלאת קובץ CSV</p>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.txt" onChange={handleFileUpload} />
                        </div>

                        <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors select-none">
                            <input type="checkbox" checked={archiveMissing} onChange={(e) => setArchiveMissing(e.target.checked)} className="w-5 h-5 text-blue-600 rounded" />
                            <div className="text-gray-700">
                                <span className="font-bold block text-sm">ארכיון אוטומטי</span>
                                <span className="text-xs text-gray-500">חוגים שלא מופיעים בקובץ יהפכו ל"לא פעילים" (במקום להימחק).</span>
                            </div>
                        </label>
                        
                        {isUploading && <div className="mt-4 text-blue-600 text-center font-bold animate-pulse">מעבד נתונים...</div>}
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-100">
                        <div className="flex items-center gap-2 text-red-600 mb-4">
                            <AlertTriangle className="w-5 h-5" />
                            <h3 className="font-bold">אזור סכנה</h3>
                        </div>
                        <div className="flex flex-col gap-3">
                            <label className="flex items-center gap-2 text-gray-600 text-sm">
                                <input type="checkbox" checked={deleteImages} onChange={(e) => setDeleteImages(e.target.checked)} className="rounded text-red-600" />
                                מחק גם את זכרון התמונות (לא מומלץ)
                            </label>
                            <button onClick={handleDeleteAll} disabled={isDeleting} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 w-fit flex items-center gap-2">
                                {isDeleting ? 'מוחק...' : <><Trash2 className="w-4 h-4"/> איפוס מלא של המערכת</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: HISTORY */}
            {activeTab === 'history' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">יומן שינויים ופעולות</h3>
                        <button onClick={loadLogs} className="text-blue-600 hover:bg-blue-50 p-2 rounded-full"><RefreshCw className="w-4 h-4"/></button>
                    </div>
                    
                    {isLoadingLogs ? (
                        <div className="p-8 text-center text-gray-500">טוען היסטוריה...</div>
                    ) : logs.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">אין נתונים בהיסטוריה.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-right">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3">זמן</th>
                                        <th className="px-4 py-3">משתמש</th>
                                        <th className="px-4 py-3">פעולה</th>
                                        <th className="px-4 py-3">תיאור</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {logs.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 whitespace-nowrap text-gray-500" dir="ltr">
                                                {new Date(log.timestamp.seconds * 1000).toLocaleString('he-IL')}
                                            </td>
                                            <td className="px-4 py-3">{log.userEmail.split('@')[0]}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                    log.action === 'create' ? 'bg-green-100 text-green-700' :
                                                    log.action === 'delete' ? 'bg-red-100 text-red-700' :
                                                    log.action === 'restore' ? 'bg-purple-100 text-purple-700' :
                                                    'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {log.action === 'create' ? 'יצירה' : 
                                                     log.action === 'update' ? 'עדכון' : 
                                                     log.action === 'delete' ? 'מחיקה' : 
                                                     log.action === 'restore' ? 'שחזור' : 'ייבוא'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{log.description}</td>
                                            <td className="px-4 py-3 text-left">
                                                {(log.action === 'update' || log.action === 'delete' || log.action === 'create') && (
                                                    <button onClick={() => handleRestore(log)} className="text-blue-600 hover:underline text-xs font-bold flex items-center gap-1">
                                                        <RotateCcw className="w-3 h-3"/> שחזר
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: USAGE */}
            {activeTab === 'usage' && (
                <div className="space-y-6">
                    {/* Quota Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><FileSpreadsheet className="w-5 h-5"/></div>
                                <span className="text-gray-500 text-sm font-bold">מספר חוגים</span>
                            </div>
                            <div className="text-3xl font-bold text-gray-800">{stats?.activities || 0}</div>
                            <div className="text-xs text-gray-400 mt-1">מסמכים באוסף הראשי</div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><History className="w-5 h-5"/></div>
                                <span className="text-gray-500 text-sm font-bold">רשומות היסטוריה</span>
                            </div>
                            <div className="text-3xl font-bold text-gray-800">{stats?.logs || 0}</div>
                            <div className="text-xs text-gray-400 mt-1">פעולות מתועדות לשחזור</div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><HardDrive className="w-5 h-5"/></div>
                                <span className="text-gray-500 text-sm font-bold">נפח מוערך</span>
                            </div>
                            <div className="text-3xl font-bold text-gray-800">{stats?.estimatedSizeMB || 0} <span className="text-sm font-normal text-gray-500">MB</span></div>
                            
                            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
                                <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${Math.min(((stats?.estimatedSizeMB || 0) / 1000) * 100, 100)}%` }}></div>
                            </div>
                            <div className="text-xs text-gray-400 mt-1">מתוך 1GB (מסלול חינם)</div>
                        </div>
                    </div>

                    {/* Maintenance */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-green-600"/>
                            תחזוקה וניקוי
                        </h4>
                        <p className="text-sm text-gray-600 mb-4">
                            כדי לשמור על ביצועים גבוהים ועל המסגרת החינמית, מומלץ לנקות היסטוריה ישנה מדי פעם.
                        </p>
                        <button 
                            onClick={handleCleanupLogs} 
                            disabled={cleaningLogs || !stats?.logs}
                            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                        >
                            <Clock className="w-4 h-4"/>
                            נקה היסטוריה (שמור רק 30 יום אחרונים)
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatabaseManagement;