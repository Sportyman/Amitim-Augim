
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

        // Parse headers
        const headers = rows[0].map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
        
        const getColumnIndex = (keywords: string[]) => {
            let idx = headers.findIndex(h => keywords.includes(h));
            if (idx === -1) {
                idx = headers.findIndex(h => keywords.some(k => h.includes(k)));
            }
            return idx;
        };

        const colMap = {
            id: getColumnIndex(['activity_id']), 
            name: getColumnIndex(['name']), 
            centerName: getColumnIndex(['center_name']),
            address: getColumnIndex(['center_address_he']),
            instructor: getColumnIndex(['instructor_name']),
            phone: getColumnIndex(['phone_clean']),
            ageMin: getColumnIndex(['age_min']),
            ageMax: getColumnIndex(['age_max']),
            mainAgeGroup: getColumnIndex(['main_age_group']),
            frequency: getColumnIndex(['frequency_clean']),
            meetingsJson: getColumnIndex(['meetings_json']),
            daysList: getColumnIndex(['days_list']),
            price: getColumnIndex(['price_numeric']),
            descRaw: getColumnIndex(['description_raw']),
            descAuto: getColumnIndex(['description_auto']),
            groupRaw: getColumnIndex(['group_raw']),
            categoriesApp: getColumnIndex(['categories_app']),
            tags: getColumnIndex(['tags']),
            source: getColumnIndex(['source']),
            regLink: getColumnIndex(['reglink'])
        };

        const activities: Activity[] = [];

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

            const activityId = getVal(colMap.id) || `gen_${i}_${Date.now()}`;
            const title = getVal(colMap.name);
            if (!title) continue;

            const center = getVal(colMap.centerName);
            const address = getVal(colMap.address);
            let fullLocation = center;
            if (address && address !== center) fullLocation += `, ${address}`;
            if (!fullLocation) fullLocation = 'הרצליה';

            const priceVal = parseFloat(getVal(colMap.price));
            const price = (!isNaN(priceVal)) ? priceVal : 0;

            let description = getVal(colMap.descRaw);
            if (!description || description === 'nan' || description.length < 5) {
                description = getVal(colMap.descAuto);
            }
            if (description === 'nan') description = '';

            const minAge = parseFloat(getVal(colMap.ageMin));
            const maxAge = parseFloat(getVal(colMap.ageMax));
            const mainGroup = getVal(colMap.mainAgeGroup);
            
            let ageGroupDisplay = mainGroup;
            if (!ageGroupDisplay || ageGroupDisplay === 'nan') {
                if (!isNaN(minAge)) {
                    ageGroupDisplay = !isNaN(maxAge) ? `גילאי ${minAge}-${maxAge}` : `מגיל ${minAge}`;
                } else {
                    ageGroupDisplay = 'לכל המשפחה';
                }
            }

            // --- SCHEDULE PARSING FIXES ---
            let scheduleStr = '';
            const freqVal = getVal(colMap.frequency);
            const meetingsRaw = getVal(colMap.meetingsJson);
            const daysRaw = getVal(colMap.daysList);

            let jsonSuccess = false;
            if (meetingsRaw && meetingsRaw !== '[]' && meetingsRaw !== 'nan') {
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
                } catch (e) {
                    // JSON failed
                }
            }

            if (!jsonSuccess) {
                let displayFreq = '';
                let displayDays = '';
                let daysCount = 0;

                // Clean Days: Handle "['א'', 'ב'']" or "['א', 'ב']" or "['Thu']"
                if (daysRaw && daysRaw !== 'nan' && daysRaw !== '[]') {
                    // 1. Remove brackets
                    const cleanBrackets = daysRaw.replace(/[\[\]]/g, '');
                    // 2. Split by comma
                    const parts = cleanBrackets.split(',');
                    // 3. Clean each part
                    const cleanParts = parts.map(p => {
                        let s = p.trim();
                        // Remove surrounding quotes if present (e.g. "א'" -> א')
                        if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
                            s = s.slice(1, -1);
                        }
                        // Unescape backslashes if python escaped them (e.g. 'א\'')
                        s = s.replace(/\\/g, '');
                        return s.trim();
                    }).filter(s => s.length > 0);
                    
                    daysCount = cleanParts.length;
                    displayDays = cleanParts.join(', ');
                }

                // LOGIC FIX: If we have explicit days, use their count to determine frequency text
                // This overrides potential data inconsistencies in the CSV (e.g. freq=2 but only 1 day listed)
                if (daysCount > 0) {
                    switch (daysCount) {
                        case 1: displayFreq = 'פעם בשבוע'; break;
                        case 2: displayFreq = 'פעמיים בשבוע'; break;
                        case 3: displayFreq = '3 פעמים בשבוע'; break;
                        case 4: displayFreq = '4 פעמים בשבוע'; break;
                        case 5: displayFreq = '5 פעמים בשבוע'; break;
                        default: displayFreq = `${daysCount} פעמים בשבוע`;
                    }
                } else if (freqVal && freqVal !== 'nan') {
                    // Fallback to numeric frequency column only if days are missing
                    const freqNum = parseFloat(freqVal);
                    if (!isNaN(freqNum)) {
                        const roundedFreq = Math.round(freqNum);
                        switch (roundedFreq) {
                            case 1: displayFreq = 'פעם בשבוע'; break;
                            case 2: displayFreq = 'פעמיים בשבוע'; break;
                            default: displayFreq = `${roundedFreq} פעמים בשבוע`;
                        }
                    } else {
                        displayFreq = freqVal;
                    }
                }

                if (displayFreq && displayDays) {
                    scheduleStr = `${displayFreq}. ימים: ${displayDays}`;
                } else if (displayFreq) {
                    scheduleStr = displayFreq;
                } else if (displayDays) {
                    scheduleStr = `ימים: ${displayDays}`;
                }
            }
            
            if (!scheduleStr) scheduleStr = 'לפרטים נוספים';

            const parseListStr = (str: string): string[] => {
                if (!str || str === 'nan' || str === '[]') return [];
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
            if (categories.length > 0) {
                appCategory = categories[0];
            }

            const tags = parseListStr(getVal(colMap.tags));
            const regLink = getVal(colMap.regLink);
            const sourceLink = getVal(colMap.source);
            const finalLink = (regLink && regLink !== 'nan') ? regLink : (sourceLink && sourceLink !== 'nan' ? sourceLink : '#');
            const instructor = getVal(colMap.instructor);
            const phone = getVal(colMap.phone);

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
                    alert('לא נמצאו נתונים תקינים בקובץ.');
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
