
import React, { useState } from 'react';

const Header: React.FC = () => {
  const [imageError, setImageError] = useState(false);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-20">
          <div className="flex-shrink-0">
            <a href="/" className="flex items-center justify-center">
              {!imageError ? (
                <img 
                  src="/logo.png" 
                  alt="עמיתים" 
                  className="h-16 w-auto object-contain"
                  onError={() => setImageError(true)}
                />
              ) : (
                <span className="text-3xl font-bold text-orange-500 tracking-wide">
                  עמיתים
                </span>
              )}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
