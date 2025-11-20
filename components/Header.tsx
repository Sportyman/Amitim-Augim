import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // Import Link

const Header: React.FC = () => {
  const [imageError, setImageError] = useState(false);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-24"> 
          {/* Empty div to balance flex layout if needed, or put login link here */}
          <div className="w-12">
             <Link to="/login" className="text-xs text-gray-300 hover:text-gray-500 transition-colors">
                ניהול
             </Link>
          </div>

          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center justify-center">
              {!imageError ? (
                <img 
                  src="https://i.imgur.com/oOqtYCK.jpeg" 
                  alt="עמיתים" 
                  className="h-20 w-auto object-contain"
                  onError={() => setImageError(true)}
                />
              ) : (
                <span className="text-3xl font-bold text-sky-500 tracking-wide">
                  עמיתים
                </span>
              )}
            </Link>
          </div>
          
           {/* Spacer to keep logo centered */}
           <div className="w-12"></div>
        </div>
      </div>
    </header>
  );
};

export default Header;