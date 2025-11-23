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

    // --- CSV Parsing Logic ---
    const parseCSV = (csvText: string): Activity[] => {
        const lines = csvText.split(/\r\n|\n/);
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '')); // Remove quotes
        
        const activities: Activity[] = [];

        // Helper to map Hebrew CSV headers to English keys
        const getColumnIndex = (keywords: string[]) => {
            return headers.findIndex(h => keywords.some(k => h.includes(k)));
        };

        // Identify columns dynamically based on common Hebrew names
        const colMap = {
            title: getColumnIndex(['שם החוג', 'פעילות', 'שם חוג', 'כותרת']),
            groupName: getColumnIndex(['קבוצה', 'שם הקבוצה', 'שם קבוצה']),
            category: getColumnIndex(['קטגוריה', 'תחום', 'סוג']),
            description: getColumnIndex(['תיאור', 'פרטים', 'מידע נוסף']),
            location: getColumnIndex(['מיקום', 'מרכז', 'מקום']),
            price: getColumnIndex(['מחיר', 'עלות']),
            ageGroup: getColumnIndex(['גיל', 'קבוצת גיל', 'קהל יעד']),
            schedule: getColumnIndex(['יום', 'שעה', 'זמן', 'לו"ז']),
            instructor: getColumnIndex(['מדריך', 'מורה', 'מאמן']),
            phone: getColumnIndex(['טלפון', 'נייד'])
        };

        // Iterate rows (skip header)
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            // Handle commas inside quotes (Simple Regex Split)
            const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
            
            // Cleanup function for cell data
            const getVal = (idx: number) => {
                if (idx === -1 || !row[idx]) return '';
                return row[idx].replace(/^"|"$/g, '').trim().replace(/""/g, '"');
            };

            const title = getVal(colMap.title);
            if (!title) continue; // Skip empty rows

            // Fallback Logic
            let description = getVal(colMap.description);
            const phone = getVal(colMap.phone);
            if (phone && !description.includes(phone)) {
                description += ` ${phone}`;
            }

            // Construct Activity Object
            const activity: any = {
                id: i, // Temporary ID
                title: title,
                groupName: getVal(colMap.groupName), // The new field!
                category: getVal(colMap.category) || 'כללי',
                description: description,
                imageUrl: '', // CSV usually doesn't have images, default fallback will take over
                location: getVal(colMap.location) || 'הרצליה',
                price: parseInt(getVal(colMap.price).replace(/\D/g, '') || '0'),
                ageGroup: getVal(colMap.ageGroup) || 'רב גילאי',
                schedule: getVal(colMap.schedule),
                instructor: getVal(colMap.instructor) || null,
                detailsUrl: '#',
                createdAt: new Date()
            };

            activities.push(activity);
        }

        return activities;
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const isCSV = file.name.toLowerCase().endsWith('.csv');
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
                } else if (isCSV) {
                    dataToImport = parseCSV(content);
                }
                
                if (dataToImport.length === 0) {
                    alert('לא נמצאו נתונים תקינים בקובץ.');
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
                        <p className="text-sm text-gray-500">תומך בקבצי Excel (CSV) וקבצי JSON</p>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-blue-100 rounded-xl bg-blue-50/30 hover:bg-blue-50/50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="flex gap-4 mb-3">
                        <FileSpreadsheet className="w-10 h-10 text-green-500" />
                        <FileText className="w-10 h-10 text-orange-400" />
                    </div>
                    <p className="text-blue-900 font-medium text-lg">לחץ לבחירת קובץ (CSV או JSON)</p>
                    <p className="text-gray-500 text-sm mt-1">המערכת תזהה אוטומטית את העמודות בעברית</p>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".json,.csv" 
                        onChange={handleFileUpload} 
                    />
                </div>
                
                {isUploading && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-blue-600">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                        <span>מעבד ומעלה נתונים...</span>
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