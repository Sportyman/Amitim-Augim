
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-20">
          <div className="flex-shrink-0">
            <a href="/">
              <img 
                src="/logo.png" 
                alt="עמיתים" 
                className="h-16 w-auto object-contain"
              />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
