
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <a href="/" className="text-2xl font-bold text-orange-500">
              עמיתים
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
