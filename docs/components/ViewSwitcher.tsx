import React from 'react';
import { GridIcon, ListIcon } from './icons';

type ViewMode = 'grid' | 'list';

interface ViewSwitcherProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ currentView, onViewChange }) => {
  const baseClasses = "p-2 rounded-md transition-colors duration-200";
  const activeClasses = "bg-orange-100 text-orange-600";
  const inactiveClasses = "text-gray-400 hover:bg-gray-100 hover:text-gray-600";

  return (
    <div className="flex items-center space-x-1 rtl:space-x-reverse bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => onViewChange('grid')}
        className={`${baseClasses} ${currentView === 'grid' ? activeClasses : inactiveClasses}`}
        aria-label="Grid View"
        title="תצוגת רשת"
      >
        <GridIcon className="w-5 h-5" />
      </button>
      <button
        onClick={() => onViewChange('list')}
        className={`${baseClasses} ${currentView === 'list' ? activeClasses : inactiveClasses}`}
        aria-label="List View"
        title="תצוגת רשימה"
      >
        <ListIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ViewSwitcher;