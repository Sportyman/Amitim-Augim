import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // Import Link

const Header: React.FC = () => {
  const [imageError, setImageError] = useState(false);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex items-center justify-between h-20"> 
          {/* Admin Link */}
          <div className="w-12 z-30 relative">
             <Link to="/login" className="text-xs text-gray-400 hover:text-sky-600 transition-colors font-medium">
                ניהול
             </Link>
          </div>

          {/* Centered Logo */}
          <div className="flex items-center justify-center z-30">
            <Link to="/" className="flex items-center justify-center">
              {!imageError ? (
                <img 
                  src="https://i.imgur.com/oOqtYCK.jpeg" 
                  alt="עמיתים" 
                  className="h-16 w-auto object-contain"
                  onError={() => setImageError(true)}
                />
              ) : (
                <span className="text-3xl font-bold text-sky-500 tracking-wide block">
                  עמיתים
                </span>
              )}
            </Link>
          </div>
          
           {/* Spacer to keep layout balanced */}
           <div className="w-12"></div>
        </div>
      </div>
    </header>
  );
};

export default Header;