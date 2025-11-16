
import React from 'react';
import { SearchIcon } from './icons';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ searchTerm, onSearchChange, onSubmit, isLoading }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSubmit();
    }
  };

  return (
    <div className="relative w-full max-w-lg mx-auto">
      <input
        type="text"
        placeholder="חיפוש חופשי..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full px-5 py-3 pr-12 text-lg text-gray-700 bg-white border-2 border-gray-300 rounded-full focus:outline-none focus:border-orange-500 transition-colors duration-300"
      />
      <button
        onClick={onSubmit}
        disabled={isLoading}
        className="absolute inset-y-0 right-0 flex items-center justify-center w-14 text-gray-400 hover:text-orange-500 disabled:text-gray-300 disabled:cursor-not-allowed"
      >
        {isLoading ? (
            <svg className="animate-spin h-5 w-5 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        ) : (
            <SearchIcon className="w-6 h-6" />
        )}
      </button>
    </div>
  );
};

export default SearchBar;
