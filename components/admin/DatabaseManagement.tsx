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
        // Remove BOM
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
            return headers.findIndex(h => keywords.some(k => h === k));
        };

        // --- NEW SCHEMA MAPPING based on user instructions ---
        const colMap = {
            id: getColumnIndex(['id']), 
            name: getColumnIndex(['activity_name']), 
            
            // Location
            centerName: getColumnIndex(['center_name']),
            address: getColumnIndex(['address']),
            
            // Contact
            instructor: getColumnIndex(['instructor_name']),
            phone: getColumnIndex(['phone']),
            
            // Ages
            ageText: getColumnIndex(['ages']),
            ageGroup: getColumnIndex(['age_group']), 
            
            // Schedule
            daysList: getColumnIndex(['days_list']),
            meetingsJson: getColumnIndex(['meetings_json']), 
            frequency: getColumnIndex(['frequency_clean']),
            
            // Price
            price: getColumnIndex(['price']),
            
            // Categorization
            appCategories: getColumnIndex(['app_categories']),
            tags: getColumnIndex(['tags'])
        };

        const activities: Activity[] = [];

        // Iterate rows (skip header)
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length < 2 && !row[0]) continue;

            const getVal = (idx: number) => {
                if (idx === -1 || !row[idx]) return '';
                let val = row[idx].trim();
                if (val.startsWith('"') && val.endsWith('"')) {
                    val = val.substring(1, val.length - 1);
                }
                return val.replace(/""/g, '"');
            };

            // 1. ID & Title
            const activityId = getVal(colMap.id) || `gen_${i}_${Date.now()}`;
            const title = getVal(colMap.name);
            if (!title) continue;

            // 2. Location
            const center = getVal(colMap.centerName);
            const address = getVal(colMap.address);
            let fullLocation = center;
            if (address && address !== center) fullLocation += `, ${address}`;
            if (!fullLocation) fullLocation = 'הרצליה';

            // 3. Price
            const priceVal = parseFloat(getVal(colMap.price));
            const price = (!isNaN(priceVal)) ? priceVal : 0;

            // 4. Schedule (Parsing JSON)
            let scheduleStr = '';
            const freq = getVal(colMap.frequency);
            const meetingsRaw = getVal(colMap.meetingsJson);
            
            try {
                if (meetingsRaw) {
                    // Fix potential single quotes to double quotes for JSON parsing if needed
                    let cleanJson = meetingsRaw.replace(/'/g, '"');
                    if (cleanJson.startsWith('"') && cleanJson.endsWith('"')) {
                         cleanJson = cleanJson.substring(1, cleanJson.length -1).replace(/""/g, '"');
                    }
                    
                    // Try parsing
                    let meetings;
                    try {
                        meetings = JSON.parse(meetingsRaw.replace(/""/g, '"'));
                    } catch {
                         // fallback for single quotes
                         meetings = JSON.parse(meetingsRaw.replace(/'/g, '"'));
                    }

                    if (Array.isArray(meetings)) {
                        const parts = meetings.map((m: any) => {
                            const day = m.day || '';
                            const start = m.start || '';
                            const end = m.end || '';
                            if (start && end) return `יום ${day}' ${start}-${end}`;
                            return `יום ${day}'`;
                        });
                        scheduleStr = parts.join(' | ');
                    }
                }
            } catch (e) {
                console.warn("Failed to parse meetings JSON for", title, meetingsRaw);
            }

            if (!scheduleStr) {
                scheduleStr = freq || 'לפרטים נוספים';
            } else if (freq && !scheduleStr.includes(freq)) {
                 scheduleStr = `${freq} | ${scheduleStr}`;
            }

            // 5. Age Group
            const groupType = getVal(colMap.ageGroup); 
            const specificAges = getVal(colMap.ageText); 
            let displayAge = groupType;
            if (specificAges) displayAge += ` (${specificAges})`;
            
            let minAge = 0, maxAge = 120;
            const rangeMatch = specificAges.match(/(\d+)-(\d+)/);
            if (rangeMatch) {
                minAge = parseInt(rangeMatch[1]);
                maxAge = parseInt(rangeMatch[2]);
            } else if (groupType.includes('גיל הזהב')) {
                minAge = 60;
            }

            // 6. Categories & Tags
            const catRaw = getVal(colMap.appCategories); 
            let appCategory = 'ספורט'; 
            let aiTags: string[] = [];
            
            try {
                 // Handle python list string representation
                 const cats = JSON.parse(catRaw.replace(/'/g, '"')); 
                 if (Array.isArray(cats) && cats.length > 0) {
                     appCategory = cats[0]; 
                 }
            } catch (e) {
                if (catRaw.includes('אומנות')) appCategory = 'אומנות';
                else if (catRaw.includes('מוזיקה')) appCategory = 'מוזיקה';
                else if (catRaw.includes('גיל הזהב')) appCategory = 'גיל הזהב';
            }

            const tagsRaw = getVal(colMap.tags);
            try {
                const parsedTags = JSON.parse(tagsRaw.replace(/'/g, '"'));
                if (Array.isArray(parsedTags)) aiTags = parsedTags;
            } catch (e) {
                if (tagsRaw) aiTags = tagsRaw.split(',').map(t => t.trim());
            }

            // 7. Instructor & Phone
            const instructor = getVal(colMap.instructor);
            const phone = getVal(colMap.phone);

            const activity: Activity = {
                id: activityId,
                title: title,
                groupName: groupType !== 'רב גילאי' ? groupType : '', 
                category: appCategory,
                description: '', 
                imageUrl: '', 
                location: fullLocation,
                price: price,
                ageGroup: displayAge || 'לכל המשפחה',
                schedule: scheduleStr,
                instructor: instructor || null,
                phone: phone || null,
                detailsUrl: '#',
                minAge: minAge,
                maxAge: maxAge,
                ai_tags: aiTags, 
                createdAt: new Date()
            };

            activities.push(activity);
        }

        return activities;
    };

    const processFile = (file: File) => {
        const isCSV = file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.txt') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel';

        if (!isCSV) {
            alert('אנא בחר קובץ CSV בלבד.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                const dataToImport = parseCSV(content);
                
                if (dataToImport.length === 0) {
                    alert('לא נמצאו נתונים תקינים בקובץ. וודא שהכותרות תואמות לפורמט החדש.');
                    return;
                }

                const confirmMsg = `נמצאו ${dataToImport.length} חוגים בקובץ.\n\nהאם לייבא אותם למערכת?`;

                if (window.confirm(confirmMsg)) {
                    setIsUploading(true);
                    await dbService.importActivities(dataToImport);
                    alert('הייבוא הסתיים בהצלחה!');
                    onRefresh();
                }
            } catch (error) {
                console.error(error);
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
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-4 border-b border-gray-50 pb-4">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        <Upload className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg">ייבוא נתונים (פורמט חדש)</h3>
                        <p className="text-sm text-gray-500">טען את קובץ ה-CSV המלא והמעובד</p>
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
                        {isDragActive ? 'שחרר את הקובץ כאן...' : 'גרור לכאן קובץ CSV'}
                    </p>
                    <p className="text-gray-500 text-sm mt-2 pointer-events-none">
                        תומך בעמודות: id, activity_name, meetings_json, phone, etc.
                    </p>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".csv,.txt" 
                        onChange={handleFileUpload} 
                    />
                </div>
                
                {isUploading && (
                    <div className="mt-6 flex flex-col items-center justify-center gap-2 text-blue-600 animate-in fade-in">
                        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                        <span className="font-medium">מעבד נתונים...</span>
                    </div>
                )}
            </div>

            <div className="bg-red-50 p-6 rounded-2xl shadow-sm border border-red-100">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-red-100">
                    <div className="bg-red-100 p-2 rounded-lg text-red-600">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-red-800 text-lg">איפוס מסד נתונים</h3>
                        <p className="text-sm text-red-600/80">חובה לבצע לפני טעינת קובץ במבנה חדש!</p>
                    </div>
                </div>

                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-red-100">
                    <div>
                        <h4 className="font-bold text-gray-800">מחיקת כל החוגים</h4>
                        <p className="text-sm text-gray-500">מוחק את כל הרשומות הקיימות.</p>
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