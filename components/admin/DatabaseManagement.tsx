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
    const robustCSVParser = (text: string): string[][] => {
        // Remove BOM and other invisible characters from the start
        const cleanText = text.trim().replace(/^\uFEFF/, '');
        
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
            } else if ((char === ',' || char === '\t') && !inQuotes) {
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

        // Parse headers
        const headers = rows[0].map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
        
        const getColumnIndex = (keywords: string[]) => {
            return headers.findIndex(h => keywords.some(k => h === k || h.includes(k)));
        };

        // Updated Map based strictly on the User's "Clean" columns request
        // Ignored RAW columns: group_raw, notes_raw, description_raw, original_text
        const colMap = {
            id: getColumnIndex(['activity_id', 'מזהה']),
            name: getColumnIndex(['name', 'שם', 'activity_name']), // Clean Name
            
            // Clean Location
            centerName: getColumnIndex(['center_name']),
            centerAddress: getColumnIndex(['center_address_he']),
            
            // Clean Price
            price: getColumnIndex(['price_numeric']),
            
            // Clean Age
            ageMin: getColumnIndex(['age_min']),
            ageMax: getColumnIndex(['age_max']),
            ageList: getColumnIndex(['age_list']),
            
            // Clean Schedule
            meetingDays: getColumnIndex(['meeting_days_all_he']),
            meetingCount: getColumnIndex(['meetings_count']),
            frequency: getColumnIndex(['frequency_clean']),
            
            // Clean Contact/Details
            phone: getColumnIndex(['phone']),
            descriptionAI: getColumnIndex(['description_ai_enhanced'])
        };

        const activities: Activity[] = [];

        // Iterate rows (skip header). No merging logic required as per instructions.
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length < 2 && !row[0]) continue;

            const getVal = (idx: number) => {
                if (idx === -1 || !row[idx]) return '';
                return row[idx].trim().replace(/^"|"$/g, '').replace(/""/g, '"');
            };

            const rawId = getVal(colMap.id);
            const activityId = rawId || `gen_${i}_${Date.now()}`; 
            
            const title = getVal(colMap.name);
            if (!title) continue; // Skip invalid rows

            // --- Price ---
            const priceStr = getVal(colMap.price).replace(/[^\d.]/g, '');
            const priceVal = parseFloat(priceStr);
            const price = (!isNaN(priceVal) && priceVal > 0) ? priceVal : 0;

            // --- Location ---
            const center = getVal(colMap.centerName);
            const addr = getVal(colMap.centerAddress);
            let fullLocation = center;
            if (addr && !fullLocation.includes(addr)) fullLocation += `, ${addr}`;
            if (!fullLocation) fullLocation = 'הרצליה';

            // --- Description & Instructor ---
            // Using the AI Enhanced description as the main description source
            let description = getVal(colMap.descriptionAI);
            const phone = getVal(colMap.phone);
            
            // Append phone if not present
            if (phone && !description.includes(phone)) {
                description += `\nטלפון לבירורים: ${phone}`;
            }

            // --- Ages ---
            const minAge = parseFloat(getVal(colMap.ageMin));
            const maxAge = parseFloat(getVal(colMap.ageMax));
            
            let ageGroup = '';
            if (!isNaN(minAge)) {
                if (minAge >= 60) ageGroup = 'גיל שלישי 60+';
                else if (minAge >= 18) ageGroup = !isNaN(maxAge) ? `מבוגרים (${minAge}-${maxAge})` : `מבוגרים (${minAge}+)`;
                else if (!isNaN(maxAge) && maxAge <= 6) ageGroup = `גיל רך (${minAge}-${maxAge})`;
                else if (!isNaN(maxAge)) ageGroup = `ילדים ונוער (${minAge}-${maxAge})`;
                else ageGroup = `${minAge}+`;
            } else {
                ageGroup = 'רב גילאי';
            }

            // --- Schedule ---
            // Using meeting_days_all_he + frequency_clean
            const days = getVal(colMap.meetingDays);
            const freq = getVal(colMap.frequency);
            
            let schedule = '';
            if (freq) schedule += freq;
            if (days) {
                if (schedule) schedule += ' | ';
                schedule += days;
            }
            if (!schedule) schedule = 'לפרטים נוספים';

            // --- Category Inference (Basic) ---
            let category = 'ספורט'; 
            const txt = (title + ' ' + description + ' ' + center).toLowerCase();
            
            if (txt.includes('יצירה') || txt.includes('אומנות') || txt.includes('ציור') || txt.includes('קרמיקה') || txt.includes('פיסול') || txt.includes('תכשיט')) category = 'אומנות';
            else if (txt.includes('מוזיקה') || txt.includes('גיטרה') || txt.includes('פסנתר') || txt.includes('שירה') || txt.includes('זמר')) category = 'מוזיקה';
            else if (txt.includes('מחשבים') || txt.includes('טכנולוגיה') || txt.includes('סייבר') || txt.includes('רובוטיקה') || txt.includes('הייטק') || txt.includes('גיימינג')) category = 'טכנולוגיה';
            else if (txt.includes('גמלאים') || txt.includes('גיל הזהב') || txt.includes('מועדון') || txt.includes('הרצאה') || txt.includes('ברידג')) category = 'קהילה';
            else if (txt.includes('אנגלית') || txt.includes('שפות') || txt.includes('לימוד') || txt.includes('העשרה') || txt.includes('מדע')) category = 'העשרה ולימוד';
            else if (txt.includes('ריקוד') || txt.includes('מחול') || txt.includes('בלט') || txt.includes('זומבה') || txt.includes('היפ')) category = 'ריקוד ומחול';
            else if (txt.includes('בישול') || txt.includes('אפייה')) category = 'בישול';
            else if (txt.includes('צהרון') || txt.includes('קייטנ') || txt.includes('מעון')) category = 'צהרון';
            
            if (!isNaN(minAge) && minAge >= 60) category = 'גיל הזהב';

            const activity: Activity = {
                id: activityId,
                title: title,
                // We use the title as group name if no specific group logic is provided, 
                // or we could leave it empty. For now, mapping title to it if needed or leaving undefined.
                groupName: '', 
                category: category,
                description: description,
                imageUrl: '', // No image column in provided list
                location: fullLocation,
                price: price,
                ageGroup: ageGroup,
                schedule: schedule,
                instructor: null, // User explicitly didn't list instructor column in Clean list
                detailsUrl: '#',
                minAge: !isNaN(minAge) ? minAge : undefined,
                maxAge: !isNaN(maxAge) ? maxAge : undefined,
                createdAt: new Date()
            };

            activities.push(activity);
        }

        return activities;
    };

    const processFile = (file: File) => {
        const isCSV = file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.txt') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel';
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

                const confirmMsg = `נמצאו ${dataToImport.length} חוגים (ללא מיזוג כפילויות) בקובץ.\n\nהאם לייבא אותם למערכת?`;

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
                        תומך בפורמט CSV מעובד (עמודות נקיות בלבד).
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