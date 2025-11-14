import React, { useState } from 'react';
import { scrapeAndStructureData } from '../services/geminiService.ts';
import { Activity } from '../types.ts';

interface DataImporterProps {
  currentActivities: Activity[];
}

const DataImporter: React.FC<DataImporterProps> = ({ currentActivities }) => {
  const [htmlInput, setHtmlInput] = useState('');
  const [jsonOutput, setJsonOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleScrape = async () => {
    setIsLoading(true);
    setError('');
    setJsonOutput('');
    try {
      const result = await scrapeAndStructureData(htmlInput);
      const formattedResult = JSON.stringify(JSON.parse(result), null, 2);
      setJsonOutput(formattedResult);
    } catch (e: any) {
      setError(e.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    try {
        const dataStr = JSON.stringify(currentActivities, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const linkElement = document.createElement('a');
        linkElement.href = url;
        linkElement.download = 'activities_export.json';
        document.body.appendChild(linkElement);
        linkElement.click();
        document.body.removeChild(linkElement);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Failed to export data:", err);
        alert("שגיאה בעת ייצוא הנתונים. בדוק את הקונסול לפרטים.");
    }
  };

  return (
    <section className="bg-white p-6 rounded-lg shadow-md mb-12 border-2 border-dashed border-orange-300">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">כלי ייבוא וייצוא נתונים (לאדמין בלבד)</h2>
      <p className="mb-4 text-gray-600">
        זהו כלי פיתוח זמני. כדי לעדכן חוגים, הדבק את קוד המקור המלא (View Page Source) של עמוד הפעילויות ולחץ על "חלץ נתונים".
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="htmlInput" className="block text-sm font-medium text-gray-700 mb-2">
            הדבק קוד מקור HTML כאן:
          </label>
          <textarea
            id="htmlInput"
            value={htmlInput}
            onChange={(e) => setHtmlInput(e.target.value)}
            placeholder="<html>...</html>"
            className="w-full h-64 p-3 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 font-mono text-sm"
          />
        </div>
        <div>
          <label htmlFor="jsonOutput" className="block text-sm font-medium text-gray-700 mb-2">
            תוצאת JSON (מוכנה להעתקה):
          </label>
          <textarea
            id="jsonOutput"
            readOnly
            value={isLoading ? 'מעבד נתונים, אנא המתן...' : error ? `שגיאה: ${error}` : jsonOutput}
            placeholder="[ { ... } ]"
            className="w-full h-64 p-3 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm"
          />
        </div>
      </div>
      <div className="mt-4 flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleScrape}
          disabled={isLoading || !htmlInput}
          className="px-6 py-2 bg-orange-500 text-white font-semibold rounded-lg shadow-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : 'חלץ נתונים'}
        </button>
        <button
          onClick={handleExport}
          className="px-6 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          ייצא נתונים נוכחיים (activities.json)
        </button>
      </div>
    </section>
  );
};

export default DataImporter;