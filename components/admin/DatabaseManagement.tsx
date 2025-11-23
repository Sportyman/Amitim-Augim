
import React, { useState, useRef } from 'react';
import { dbService } from '../../services/dbService';
import { Trash2, Upload, AlertTriangle, FileText, FileSpreadsheet, ImageOff } from 'lucide-react';
import { Activity } from '../../types';

interface DatabaseManagementProps {
    onRefresh: () => void;
}

const DatabaseManagement: React.FC<DatabaseManagementProps> = ({ onRefresh }) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteImages, setDeleteImages] = useState(false);
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
            // 1. Delete Activities
            await dbService.deleteAllActivities();
            
            // 2. Optionally delete image cache
            if (deleteImages) {
                await dbService.clearImageCache();
                alert('כל הנתונים נמחקו, כולל זכרון התמונות.');
            } else {
                alert('כל החוגים נמחקו בהצלחה.\nזכרון התמונות נשמר וישויך אוטומטית בייבוא הבא (לפי מזהה חוג).');
            }
            
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
        // Remove BOM
        const cleanText = text.trim().replace(/^\uFEFF/, '');
        
        // Detect separator: grab first line and count tabs vs commas
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

        // Parse headers
        const headers = rows[0].map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
        
        const getColumnIndex = (keywords: string[]) => {
            // Exact match first, then loose match
            let idx = headers.findIndex(h => keywords.includes(h));
            if (idx === -1) {
                idx = headers.findIndex(h => keywords.some(k => h.includes(k)));
            }
            return idx;
        };

        // --- SCHEMA MAPPING based on 'herzliya_master_final_CLASSIFIED.csv' ---
        const colMap = {
            id: getColumnIndex(['activity_id']), 
            name: getColumnIndex(['name']), 
            
            // Location
            centerName: getColumnIndex(['center_name']),
            address: getColumnIndex(['center_address_he']),
            
            // Contact
            instructor: getColumnIndex(['instructor_name']),
            phone: getColumnIndex(['phone_clean']),
            
            // Ages
            ageMin: getColumnIndex(['age_min']),
            ageMax: getColumnIndex(['age_max']),
            ageList: getColumnIndex(['age_list']),
            ageGroupList: getColumnIndex(['age_group_list']),
            mainAgeGroup: getColumnIndex(['main_age_group']),
            
            // Schedule
            frequency: getColumnIndex(['frequency_clean']),
            meetingsJson: getColumnIndex(['meetings_json']),
            daysList: getColumnIndex(['days_list']),
            
            // Price
            price: getColumnIndex(['price_numeric']),
            
            // Content
            descRaw: getColumnIndex(['description_raw']),
            descAuto: getColumnIndex(['description_auto']),
            groupRaw: getColumnIndex(['group_raw']),
            
            // Categorization & Meta
            categoriesApp: getColumnIndex(['categories_app']),
            tags: getColumnIndex(['tags']),
            source: getColumnIndex(['source']),
            regLink: getColumnIndex(['reglink'])
        };

        const activities: Activity[] = [];

        // Iterate rows (skip header)
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length < 2 && !row[0]) continue;

            const getVal = (idx: number) => {
                if (idx === -1 || !row[idx]) return '';
                let val = row[idx].trim();
                // Clean outer quotes if strictly wrapped
                if (val.startsWith('"') && val.endsWith('"')) {
                    val = val.substring(1, val.length - 1);
                }
                return val.replace(/""/g, '"');
            };

            // 1. Basic Info
            const activityId = getVal(colMap.id) || `gen_${i}_${Date.now()}`;
            const title = getVal(colMap.name);
            if (!title) continue; // Skip invalid rows

            // 2. Location
            const center = getVal(colMap.centerName);
            const address = getVal(colMap.address);
            let fullLocation = center;
            if (address && address !== center) fullLocation += `, ${address}`;
            if (!fullLocation) fullLocation = 'הרצליה';

            // 3. Price
            const priceVal = parseFloat(getVal(colMap.price));
            const price = (!isNaN(priceVal)) ? priceVal : 0;

            // 4. Description (Raw preferred, fallback to Auto)
            let description = getVal(colMap.descRaw);
            if (!description || description === 'nan' || description.length < 5) {
                description = getVal(colMap.descAuto);
            }
            if (description === 'nan') description = '';

            // 5. Age Logic
            const minAge = parseFloat(getVal(colMap.ageMin));
            const maxAge = parseFloat(getVal(colMap.ageMax));
            const mainGroup = getVal(colMap.mainAgeGroup);
            
            // Display text for age
            let ageGroupDisplay = mainGroup;
            if (!ageGroupDisplay || ageGroupDisplay === 'nan') {
                if (!isNaN(minAge)) {
                    ageGroupDisplay = !isNaN(maxAge) ? `גילאי ${minAge}-${maxAge}` : `מגיל ${minAge}`;
                } else {
                    ageGroupDisplay = 'לכל המשפחה';
                }
            }

            // 6. Schedule Construction (JSON Authority)
            let scheduleStr = '';
            const freq = getVal(colMap.frequency);
            const meetingsRaw = getVal(colMap.meetingsJson);

            if (meetingsRaw && meetingsRaw !== '[]' && meetingsRaw !== 'nan') {
                try {
                    // Normalize quotes for JSON parsing (Python style ['a'] to ["a"])
                    let jsonStr = meetingsRaw.replace(/'/g, '"').replace(/False/g, 'false').replace(/True/g, 'true');
                    const meetings = JSON.parse(jsonStr);

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
                } catch (e) {
                    console.warn("Failed parsing meetings JSON", title, meetingsRaw);
                }
            }

            // Fallback schedule if JSON failed or empty
            if (!scheduleStr) {
                 const days = getVal(colMap.daysList);
                 if (days && days !== 'nan') {
                     // Clean Python list format ["ה'", "ב'"] -> ה', ב'
                     const cleanDays = days.replace(/[\[\]"']/g, '').trim();
                     if (cleanDays) {
                         // Format nicer: add "יום" prefix if it's just letters
                         const dayParts = cleanDays.split(',').map(d => {
                             const trimmed = d.trim();
                             return trimmed.length <= 3 ? `יום ${trimmed}` : trimmed;
                         });
                         scheduleStr = dayParts.join(', ');
                     }
                 }
            }

            // Prepend Frequency with cleanup (1.0 -> פעם בשבוע)
            if (freq && freq !== 'nan') {
                let displayFreq = freq;
                if (freq === '1.0' || freq === '1') displayFreq = 'פעם בשבוע';
                else if (freq === '2.0' || freq === '2') displayFreq = 'פעמיים בשבוע';
                else if (freq === '3.0' || freq === '3') displayFreq = '3 פעמים בשבוע';
                else displayFreq = freq.replace('.0', ''); // Remove decimal

                scheduleStr = scheduleStr ? `${displayFreq}, ${scheduleStr}` : displayFreq;
            }
            
            if (!scheduleStr) scheduleStr = 'לפרטים נוספים';

            // 7. Categories & Tags (Parsing Python-style lists)
            const parseListStr = (str: string): string[] => {
                if (!str || str === 'nan' || str === '[]') return [];
                try {
                    // Simple regex parser for ['a', 'b'] style strings
                    const matches = str.match(/'([^']*)'/g);
                    if (matches) {
                        return matches.map(m => m.replace(/'/g, '').trim());
                    }
                    // Try JSON
                    return JSON.parse(str.replace(/'/g, '"'));
                } catch (e) {
                    return [str.replace(/[\[\]']/g, '')]; // Fallback cleanup
                }
            };

            const categories = parseListStr(getVal(colMap.categoriesApp));
            let appCategory = 'ספורט'; // Default
            if (categories.length > 0) {
                // Map specific terms to known app constants if needed, or take first
                appCategory = categories[0];
            }

            const tags = parseListStr(getVal(colMap.tags));

            // 8. Links & Contact
            const regLink = getVal(colMap.regLink);
            const sourceLink = getVal(colMap.source);
            const finalLink = (regLink && regLink !== 'nan') ? regLink : (sourceLink && sourceLink !== 'nan' ? sourceLink : '#');
            
            const instructor = getVal(colMap.instructor);
            const phone = getVal(colMap.phone);

            // Construct Activity Object
            const activity: Activity = {
                id: activityId,
                title: title,
                groupName: getVal(colMap.groupRaw) !== 'nan' ? getVal(colMap.groupRaw) : '',
                category: appCategory,
                description: description,
                imageUrl: '', 
                location: fullLocation,
                price: price,
                ageGroup: ageGroupDisplay,
                schedule: scheduleStr,
                instructor: (instructor && instructor !== 'nan') ? instructor : null,
                phone: (phone && phone !== 'nan') ? phone : null,
                detailsUrl: finalLink,
                minAge: !isNaN(minAge) ? minAge : undefined,
                maxAge: !isNaN(maxAge) ? maxAge : undefined,
                tags: tags, // Store for search
                ai_tags: tags, // Compatible with existing search logic
                isVisible: true,
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
                    alert('לא נמצאו נתונים תקינים בקובץ. וודא שהכותרות תואמות לפורמט החדש (activity_id, name, etc).');
                    return;
                }

                const confirmMsg = `נמצאו ${dataToImport.length} חוגים בקובץ.\n\nהאם לייבא אותם למערכת?`;

                if (window.confirm(confirmMsg)) {
                    setIsUploading(true);
                    await dbService.importActivities(dataToImport);
                    alert('הייבוא הסתיים בהצלחה! תמונות שוחזרו עבור חוגים קיימים.');
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
                        <h3 className="font-bold text-gray-800 text-lg">ייבוא נתונים (CSV)</h3>
                        <p className="text-sm text-gray-500">טעינת קובץ חדש תשמור על שיוך התמונות הקודם (לפי מזהה חוג)</p>
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
                        תומך בעמודות החדשות: activity_id, name, meetings_json, phone_clean, etc.
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
                        <span className="font-medium">מעבד נתונים ומשחזר תמונות...</span>
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
                        <p className="text-sm text-red-600/80">חובה לבצע לפני טעינת קובץ במבנה חדש לחלוטין!</p>
                    </div>
                </div>

                <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-red-100">
                    <div>
                        <h4 className="font-bold text-gray-800">מחיקת כל החוגים</h4>
                        <p className="text-sm text-gray-500">מוחק את כל הרשומות הקיימות.</p>
                    </div>
                    
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                        <input 
                            type="checkbox" 
                            checked={deleteImages}
                            onChange={(e) => setDeleteImages(e.target.checked)}
                            className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                        />
                        <div className="flex items-center gap-2 text-gray-700">
                            <ImageOff className="w-4 h-4 text-gray-500"/>
                            <span className="font-medium text-sm">מחק גם את זכרון התמונות (לא מומלץ אם תרצה לשחזר)</span>
                        </div>
                    </label>

                    <button 
                        onClick={handleDeleteAll}
                        disabled={isDeleting}
                        className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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
