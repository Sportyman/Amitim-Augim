
import React from 'react';

interface AgeRangeFilterProps {
  userAge: string;
  onUserAgeChange: (value: string) => void;
}

const AgeRangeFilter: React.FC<AgeRangeFilterProps> = ({ userAge, onUserAgeChange }) => {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 mb-3">סינון לפי גיל</h3>
      <div className="w-full">
        <label htmlFor="user-age" className="block text-sm font-medium text-gray-700 mb-1">
          בן/בת כמה את/ה?
        </label>
        <div className="relative">
          <input
            type="number"
            id="user-age"
            value={userAge}
            onChange={(e) => onUserAgeChange(e.target.value)}
            placeholder="הקלד גיל..."
            className="w-full px-4 py-2 pr-4 pl-10 text-base text-gray-700 bg-white border border-gray-300 rounded-full focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all duration-300"
            min="0"
            max="120"
            aria-label="הכנס גיל לסינון"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400 text-sm">שנים</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgeRangeFilter;
