import React, { useState, useRef } from 'react';
import { dbService } from '../../services/dbService';
import { Trash2, Upload, AlertTriangle, FileText, Database, FileSpreadsheet } from 'lucide-react';
import { Activity } from '../../types';

interface DatabaseManagementProps {
    onRefresh: () => void;
}

const DatabaseManagement: React.FC<DatabaseManagementProps> = ({ onRefresh }) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragActive, setIsDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            alert('כל הנתונים נמחקו בהצלחה. המערכת ריקה כעת.');
            onRefresh();
        } catch (error) {
            console.error(error);
            alert('אירעה שגיאה בעת המחיקה.');
        } finally {
            setIsDeleting(false);
        }
    };

    // --- CSV/TSV Parsing Logic ---
    const parseCSV = (csvText: string): Activity[] => {
        const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) return [];

        // Detect delimiter (Tab for Excel copy-paste or Comma for standard CSV)
        const firstLine = lines[0];
        const delimiter = firstLine.includes('\t') ? '\t' : ',';
        
        // Parse headers
        const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
        
        const activities: Activity[] = [];

        // Helper to map headers to indices
        const getColumnIndex = (keywords: string[]) => {
            return headers.findIndex(h => keywords.some(k => h === k || h.includes(k)));
        };

        // Map logic based on user's file structure + Hebrew fallbacks
        const colMap = {
            title: getColumnIndex(['activity_name', 'שם החוג', 'פעילות', 'שם חוג']),
            groupName: getColumnIndex(['group_raw', 'קבוצה', 'שם הקבוצה']),
            category: getColumnIndex(['category', 'קטגוריה', 'תחום']), // Will fallback to default if not found
            description: getColumnIndex(['description_raw', 'תיאור', 'פרטים']),
            location: getColumnIndex(['center_name', 'מיקום', 'מרכז']),
            price: getColumnIndex(['price_numeric', 'price_raw', 'מחיר']),
            // Age construction fields
            ageFrom: getColumnIndex(['age_from']),
            ageTo: getColumnIndex(['age_to']),
            ageRaw: getColumnIndex(['age_list', 'גיל', 'קהל יעד']),
            // Schedule construction fields
            dayHe: getColumnIndex(['day_he', 'יום']),
            startTime: getColumnIndex(['start_time', 'שעת התחלה']),
            endTime: getColumnIndex(['end_time', 'שעת סיום']),
            scheduleRaw: getColumnIndex(['schedule', 'לו"ז']),
            
            instructor: getColumnIndex(['instructor_name', 'מדריך', 'מורה']),
            phone: getColumnIndex(['instructor_phone', 'טלפון']),
            detailsUrl: getColumnIndex(['registration_link', 'קישור'])
        };

        // Iterate rows (skip header)
        for (let i = 1; i < lines.length; i++) {
            // Handle splitting respecting quotes for Comma delimiter, simple split for Tab
            let row: string[];
            if (delimiter === '\t') {
                row = lines[i].split('\t');
            } else {
                // Regex for CSV splitting that ignores commas inside quotes
                row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
            }
            
            const getVal = (idx: number) => {
                if (idx === -1 || !row[idx]) return '';
                return row[idx].replace(/^"|"$/g, '').trim().replace(/""/g, '"');
            };

            const title = getVal(colMap.title);
            if (!title) continue; 

            // --- Data Construction Logic ---

            // 1. Schedule Construction
            let schedule = getVal(colMap.scheduleRaw);
            if (!schedule) {
                const day = getVal(colMap.dayHe);
                const start = getVal(colMap.startTime);
                const end = getVal(colMap.endTime);
                if (day) {
                    schedule = `יום ${day}`;
                    if (start) schedule += ` ${start}`;
                    if (end) schedule += `-${end}`;
                }
            }

            // 2. Age Group Construction
            let ageGroup = getVal(colMap.ageRaw);
            const minAge = parseFloat(getVal(colMap.ageFrom));
            const maxAge = parseFloat(getVal(colMap.ageTo));
            
            // Construct display string for age if missing
            if ((!ageGroup || ageGroup === '0,1,2,3,4,5,6') && !isNaN(minAge)) {
                if (minAge >= 60) ageGroup = 'גיל שלישי';
                else if (minAge >= 18) ageGroup = 'מבוגרים';
                else if (maxAge <= 6) ageGroup = 'גיל רך';
                else ageGroup = `גילאי ${minAge}-${maxAge}`;
            } else if (!ageGroup) {
                ageGroup = 'רב גילאי';
            }

            // 3. Description cleanup
            let description = getVal(colMap.description);
            const phone = getVal(colMap.phone);
            if (phone && !description.includes(phone)) {
                description += ` ${phone}`;
            }

            // Construct Activity Object
            const activity: any = {
                id: i, 
                title: title,
                groupName: getVal(colMap.groupName),
                category: 'ספורט', // Default fallback, hard to detect from raw data without AI
                description: description,
                imageUrl: '', 
                location: getVal(colMap.location) || 'הרצליה',
                price: parseInt(getVal(colMap.price).replace(/\D/g, '') || '0'),
                ageGroup: ageGroup,
                schedule: schedule,
                instructor: getVal(colMap.instructor) || null,
                detailsUrl: getVal(colMap.detailsUrl) || '#',
                
                // Metadata for search
                minAge: !isNaN(minAge) ? minAge : undefined,
                maxAge: !isNaN(maxAge) ? maxAge : undefined,
                
                createdAt: new Date()
            };

            activities.push(activity);
        }

        return activities;
    };

    const processFile = (file: File) => {
        const isCSV = file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel';
        const isJSON = file.name.toLowerCase().endsWith('.json');

        if (!isCSV && !isJSON) {
            alert('אנא בחר קובץ מסוג CSV או JSON בלבד.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                let dataToImport: Activity[] = [];

                if (isJSON) {
                    const json = JSON.parse(content);
                    if (!Array.isArray(json)) throw new Error("קובץ ה-JSON חייב להכיל מערך של חוגים.");
                    dataToImport = json;
                } else {
                    // Assume CSV/TSV
                    dataToImport = parseCSV(content);
                }
                
                if (dataToImport.length === 0) {
                    alert('לא נמצאו נתונים תקינים בקובץ. וודא שהכותרות תואמות לפורמט הרצוי.');
                    return;
                }

                if (window.confirm(`נמצאו ${dataToImport.length} חוגים בקובץ. האם לייבא אותם למערכת?`)) {
                    setIsUploading(true);
                    await dbService.importActivities(dataToImport);
                    alert('הייבוא הסתיים בהצלחה!');
                    onRefresh();
                }
            } catch (error) {
                console.error(error);
                alert('שגיאה בקריאת הקובץ. וודא שהפורמט תקין.');
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

    // --- Drag and Drop Handlers ---
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setIsDragActive(true);
        } else if (e.type === "dragleave") {
            setIsDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            
            {/* Import Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-4 border-b border-gray-50 pb-4">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        <Upload className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg">ייבוא נתונים חדשים</h3>
                        <p className="text-sm text-gray-500">גרירת קובץ Excel (CSV) או JSON</p>
                    </div>
                </div>

                <div 
                    className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl transition-all cursor-pointer
                        ${isDragActive 
                            ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
                            : 'border-blue-100 bg-blue-50/30 hover:bg-blue-50/50'
                        }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="flex gap-4 mb-3 pointer-events-none">
                        <FileSpreadsheet className={`w-12 h-12 transition-colors ${isDragActive ? 'text-blue-600' : 'text-green-500'}`} />
                        <FileText className={`w-12 h-12 transition-colors ${isDragActive ? 'text-blue-600' : 'text-orange-400'}`} />
                    </div>
                    <p className="text-blue-900 font-bold text-lg pointer-events-none">
                        {isDragActive ? 'שחרר את הקובץ כאן...' : 'גרור לכאן קובץ או לחץ לבחירה'}
                    </p>
                    <p className="text-gray-500 text-sm mt-2 pointer-events-none">
                        תומך בפורמט CSV (אקסל) ו-JSON
                    </p>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".json,.csv,.txt" 
                        onChange={handleFileUpload} 
                    />
                </div>
                
                {isUploading && (
                    <div className="mt-6 flex flex-col items-center justify-center gap-2 text-blue-600 animate-in fade-in">
                        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                        <span className="font-medium">מעבד נתונים, אנא המתן...</span>
                    </div>
                )}
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 p-6 rounded-2xl shadow-sm border border-red-100">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-red-100">
                    <div className="bg-red-100 p-2 rounded-lg text-red-600">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-red-800 text-lg">אזור סכנה (ניקוי נתונים)</h3>
                        <p className="text-sm text-red-600/80">פעולות אלו הן בלתי הפיכות</p>
                    </div>
                </div>

                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-red-100">
                    <div>
                        <h4 className="font-bold text-gray-800">מחיקת כל החוגים</h4>
                        <p className="text-sm text-gray-500">מוחק את כל הרשומות ממסד הנתונים הנוכחי.</p>
                    </div>
                    <button 
                        onClick={handleDeleteAll}
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDeleting ? (
                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        ) : (
                            <Trash2 className="w-4 h-4" />
                        )}
                        מחק הכל
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DatabaseManagement;