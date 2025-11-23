
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

    // --- Robust CSV Parser ---
    // Handles quotes, newlines within quotes, and commas correctly.
    const robustCSVParser = (text: string): string[][] => {
        const rows: string[][] = [];
        let currentRow: string[] = [];
        let currentField = '';
        let inQuotes = false;
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote "" -> "
                    currentField += '"';
                    i++; 
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // Field separator
                currentRow.push(currentField);
                currentField = '';
            } else if ((char === '\n' || char === '\r') && !inQuotes) {
                // Row separator
                if (char === '\r' && nextChar === '\n') i++; // Skip \n of \r\n
                currentRow.push(currentField);
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
            } else {
                // Regular character
                currentField += char;
            }
        }
        
        // Add last field/row if exists
        if (currentField || currentRow.length) {
            currentRow.push(currentField);
            rows.push(currentRow);
        }
        
        return rows;
    };

    const parseCSV = (csvText: string): Activity[] => {
        const rows = robustCSVParser(csvText);
        if (rows.length < 2) return [];

        // Parse headers (first row)
        const headers = rows[0].map(h => h.trim().toLowerCase());
        
        // Helper to map headers to indices
        const getColumnIndex = (keywords: string[]) => {
            return headers.findIndex(h => keywords.some(k => h === k || h.includes(k)));
        };

        // Map based on user's NEW file structure
        const colMap = {
            id: getColumnIndex(['activity_id', 'id']),
            title: getColumnIndex(['activity_name', 'title']),
            groupName: getColumnIndex(['group_raw', 'קבוצה']),
            
            // Description & Notes
            description: getColumnIndex(['description_raw', 'תיאור']),
            notes: getColumnIndex(['notes_raw']),
            
            // Location
            locationName: getColumnIndex(['center_name', 'מיקום', 'מרכז']),
            address: getColumnIndex(['center_address_he', 'center_address', 'כתובת']),
            
            // Price
            price: getColumnIndex(['price_numeric', 'price', 'מחיר']),
            
            // Age fields
            ageFrom: getColumnIndex(['age_from']),
            ageTo: getColumnIndex(['age_to']),
            ageList: getColumnIndex(['age_list']),
            
            // Schedule fields
            dayHe: getColumnIndex(['day_he']), // Specific day for this row
            daysAll: getColumnIndex(['meeting_days_all_he']), // Summary of days
            startTime: getColumnIndex(['start_time']),
            endTime: getColumnIndex(['end_time']),
            frequency: getColumnIndex(['frequency_raw']),
            
            // Contact / Link
            instructor: getColumnIndex(['instructor_name', 'מדריך']),
            phone: getColumnIndex(['phone', 'instructor_phone', 'טלפון']),
            source: getColumnIndex(['source', 'registration_link', 'קישור'])
        };

        // Temporary Map to merge rows with same ID
        const activityMap = new Map<string, any>();

        // Iterate rows (skip header)
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            
            const getVal = (idx: number) => {
                if (idx === -1 || !row[idx]) return '';
                return row[idx].trim();
            };

            const rawId = getVal(colMap.id);
            // Fallback ID if missing in CSV
            const activityId = rawId || `generated_${i}`; 
            
            const title = getVal(colMap.title);
            if (!title && !activityMap.has(activityId)) continue; 

            // Existing object or new one
            const existing = activityMap.get(activityId) || {
                id: activityId,
                title: title,
                category: 'ספורט', // Default, refined later
                price: 0,
                imageUrl: '',
                createdAt: new Date(),
                // Accumulators
                scheduleParts: [], 
                rawLocations: [],
                rawInstructors: [],
                rawDescriptions: [],
                rawPhones: []
            };

            // --- Merge Logic: Prefer non-empty new values ---
            if (title) existing.title = title;
            
            const groupName = getVal(colMap.groupName);
            if (groupName) existing.groupName = groupName;

            const priceVal = parseFloat(getVal(colMap.price));
            if (!isNaN(priceVal) && priceVal > 0) existing.price = priceVal;

            // Location Construction
            const locName = getVal(colMap.locationName);
            const locAddr = getVal(colMap.address);
            let fullLoc = locName;
            if (locAddr && !fullLoc.includes(locAddr)) fullLoc += `, ${locAddr}`;
            if (fullLoc) existing.location = fullLoc; // Last non-empty location wins

            // Instructor
            const inst = getVal(colMap.instructor);
            if (inst && !existing.rawInstructors.includes(inst)) existing.rawInstructors.push(inst);

            // Phone
            const phone = getVal(colMap.phone);
            if (phone && !existing.rawPhones.includes(phone)) existing.rawPhones.push(phone);
            
            // Description
            const desc = getVal(colMap.description);
            const notes = getVal(colMap.notes);
            let fullDesc = desc;
            if (notes && notes !== desc) fullDesc += `\n${notes}`;
            if (fullDesc) existing.rawDescriptions.push(fullDesc);

            // Link
            const link = getVal(colMap.source);
            if (link) existing.detailsUrl = link;

            // Age Logic
            const ageFrom = parseFloat(getVal(colMap.ageFrom));
            const ageTo = parseFloat(getVal(colMap.ageTo));
            // Update min/max if this row has stricter bounds or simply valid bounds
            if (!isNaN(ageFrom)) {
                if (existing.minAge === undefined || ageFrom < existing.minAge) existing.minAge = ageFrom;
            }
            if (!isNaN(ageTo)) {
                if (existing.maxAge === undefined || ageTo > existing.maxAge) existing.maxAge = ageTo;
            }

            // Schedule Logic
            const dayHe = getVal(colMap.dayHe);
            const daysAll = getVal(colMap.daysAll);
            const startT = getVal(colMap.startTime);
            const endT = getVal(colMap.endTime);
            const freq = getVal(colMap.frequency);

            let rowSchedule = '';
            
            // Strategy: Use specific day + time if available, otherwise generic days
            const effectiveDay = dayHe || daysAll;
            if (effectiveDay) rowSchedule += effectiveDay;
            
            if (startT) {
                rowSchedule += (rowSchedule ? ' ' : '') + startT;
                if (endT) rowSchedule += `-${endT}`;
            } else if (freq && !rowSchedule.includes(freq)) {
                rowSchedule += ` (${freq})`;
            }

            if (rowSchedule) existing.scheduleParts.push(rowSchedule);

            activityMap.set(activityId, existing);
        }

        // Final pass to clean up merged objects
        const activities: Activity[] = Array.from(activityMap.values()).map((a: any) => {
            // Unique instructors
            const uniqueInst = [...new Set(a.rawInstructors)].filter(Boolean).join(', ');
            
            // Unique phones
            const uniquePhones = [...new Set(a.rawPhones)].filter(Boolean).join(', ');
            
            // Unique schedule parts
            const uniqueSched = [...new Set(a.scheduleParts)].filter(Boolean).join(' | ');
            
            // Longest description
            let bestDesc = a.rawDescriptions.sort((a: string, b: string) => b.length - a.length)[0] || '';
            
            // Append phone if missing
            if (uniquePhones && !bestDesc.includes(uniquePhones)) {
                bestDesc += `\nטלפון: ${uniquePhones}`;
            }

             // Age Group Construction
             let ageGroup = a.groupName || 'רב גילאי';
             if (a.minAge !== undefined) {
                 if (a.minAge >= 60) ageGroup = 'גיל שלישי 60+';
                 else if (a.minAge >= 18) ageGroup = `מבוגרים (${a.minAge}+)`;
                 else if (a.maxAge && a.maxAge <= 6) ageGroup = `גיל רך (${a.minAge}-${a.maxAge})`;
                 else if (a.maxAge) ageGroup = `ילדים ונוער (${a.minAge}-${a.maxAge})`;
                 else ageGroup = `${a.minAge}+`;
             }

            // Determine Category based on keywords
            let category = 'ספורט'; // Default
            const txt = (a.title + ' ' + a.groupName).toLowerCase();
            if (txt.includes('יצירה') || txt.includes('אומנות') || txt.includes('ציור') || txt.includes('קרמיקה') || txt.includes('פיסול') || txt.includes('תכשיט')) category = 'אומנות';
            else if (txt.includes('מוזיקה') || txt.includes('גיטרה') || txt.includes('פסנתר') || txt.includes('תווים') || txt.includes('שירה') || txt.includes('זמר')) category = 'מוזיקה';
            else if (txt.includes('מחשבים') || txt.includes('טכנולוגיה') || txt.includes('סייבר') || txt.includes('רובוטיקה') || txt.includes('הייטק')) category = 'טכנולוגיה';
            else if (txt.includes('גמלאים') || txt.includes('גיל הזהב') || txt.includes('מועדון') || txt.includes('הרצאה')) category = 'קהילה';
            else if (txt.includes('אנגלית') || txt.includes('שפות') || txt.includes('לימוד') || txt.includes('העשרה') || txt.includes('מדע')) category = 'העשרה ולימוד';
            else if (txt.includes('ריקוד') || txt.includes('מחול') || txt.includes('בלט') || txt.includes('זומבה') || txt.includes('היפ')) category = 'ריקוד ומחול';
            else if (txt.includes('בישול') || txt.includes('אפייה') || txt.includes('קונדיטוריה')) category = 'בישול';
            else if (txt.includes('צהרון') || txt.includes('קייטנ')) category = 'צהרון';
            
            // Construct Activity Object
            return {
                id: a.id,
                title: a.title,
                groupName: a.groupName,
                category: category,
                description: bestDesc,
                imageUrl: a.imageUrl || '',
                location: a.location || 'הרצליה',
                price: a.price,
                ageGroup: ageGroup,
                schedule: uniqueSched || 'לפרטים נוספים',
                instructor: uniqueInst || null,
                detailsUrl: a.detailsUrl || '#',
                // Use undefined if NaN so the sanitizer removes it
                minAge: a.minAge !== undefined ? a.minAge : undefined,
                maxAge: a.maxAge !== undefined ? a.maxAge : undefined,
                createdAt: a.createdAt
            };
        });

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
                    dataToImport = parseCSV(content);
                }
                
                if (dataToImport.length === 0) {
                    alert('לא נמצאו נתונים תקינים בקובץ. וודא שהכותרות תואמות לפורמט הרצוי.');
                    return;
                }

                const confirmMsg = `נמצאו ${dataToImport.length} חוגים (ייחודיים) בקובץ.\n\nשימו לב: המערכת איחדה שורות כפולות לפי מזהה החוג.\n\nהאם לייבא?`;

                if (window.confirm(confirmMsg)) {
                    setIsUploading(true);
                    await dbService.importActivities(dataToImport);
                    alert('הייבוא הסתיים בהצלחה!');
                    onRefresh();
                }
            } catch (error) {
                console.error(error);
                alert('שגיאה בקריאת הקובץ או בייבוא למסד הנתונים. וודא שהפורמט תקין.');
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
                        תומך בפורמט CSV (אקסל) ו-JSON. רשומות קיימות יעודכנו.
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
