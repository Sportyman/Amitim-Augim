import React, { useState } from 'react';
import { Activity } from '../../types';
import { dbService } from '../../services/dbService';
import { enrichActivityMetadata } from '../../services/geminiService';
import { Sparkles, Play, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface AIEnrichmentToolProps {
    activities: Activity[];
    onRefresh: () => void;
}

const AIEnrichmentTool: React.FC<AIEnrichmentToolProps> = ({ activities, onRefresh }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, updated: 0 });
    const [logs, setLogs] = useState<string[]>([]);

    const runEnrichment = async () => {
        if (!window.confirm('פעולה זו תעבור על כל החוגים ותשלח אותם לניתוח ב-Gemini כדי לתקן גילאים, תגיות ומדריכים. זה עשוי לקחת מספר דקות. להמשיך?')) return;

        setIsProcessing(true);
        setLogs([]);
        setProgress({ current: 0, total: activities.length, updated: 0 });

        let updatedCount = 0;

        // Process in chunks to avoid rate limits, but essentially sequential for safety in this demo context
        for (let i = 0; i < activities.length; i++) {
            const activity = activities[i];
            setProgress(prev => ({ ...prev, current: i + 1 }));

            try {
                // Skip if already enriched heavily (optional check, here we force update to fix bad data)
                // const needsUpdate = !activity.minAge || !activity.ai_tags; 
                
                const updates = await enrichActivityMetadata(activity);
                
                if (Object.keys(updates).length > 0) {
                    await dbService.updateActivity(String(activity.id), updates);
                    updatedCount++;
                    setLogs(prev => [`עודכן: ${activity.title} (גילאים: ${updates.minAge}-${updates.maxAge})`, ...prev].slice(0, 5));
                }
            } catch (error) {
                console.error(`Failed to enrich activity ${activity.id}`, error);
            }
        }

        setProgress(prev => ({ ...prev, updated: updatedCount }));
        setIsProcessing(false);
        alert(`תהליך הסתיים! ${updatedCount} חוגים עודכנו ושוכללו.`);
        onRefresh();
    };

    return (
        <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-2xl shadow-sm border border-purple-100">
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                    <Sparkles className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-800 text-lg">אופטימיזציית נתונים חכמה (AI)</h3>
                    <p className="text-sm text-gray-500">סריקה, תיקון ותיוג אוטומטי של מסד הנתונים באמצעות Gemini</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-purple-100 mb-6 text-sm text-gray-600 space-y-2">
                <p className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    זיהוי טווחי גילאים מדויקים (למשל: המרה של "גיל הזהב" ל-60+)
                </p>
                <p className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    חילוץ שמות מדריכים מתוך תיאורים
                </p>
                <p className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    יצירת תגיות חיפוש נרדפות
                </p>
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-lg mt-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>מומלץ לבצע גיבוי לפני הרצה.</span>
                </div>
            </div>

            {!isProcessing ? (
                <button 
                    onClick={runEnrichment}
                    className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 flex items-center justify-center gap-2"
                >
                    <Play className="w-5 h-5" />
                    הפעל סריקה חכמה ({activities.length} חוגים)
                </button>
            ) : (
                <div className="space-y-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                            className="bg-purple-600 h-2.5 rounded-full transition-all duration-300" 
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-sm font-medium text-gray-600">
                        <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            מעבד חוג {progress.current} מתוך {progress.total}...
                        </span>
                        <span>עודכנו: {progress.updated}</span>
                    </div>
                    
                    {logs.length > 0 && (
                        <div className="bg-black/80 text-green-400 p-3 rounded-lg text-xs font-mono space-y-1 opacity-90">
                            {logs.map((log, i) => (
                                <div key={i}>{'>'} {log}</div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AIEnrichmentTool;