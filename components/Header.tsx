
import React from 'react';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
  // Using the stable Imgur URL provided by the user
  const logoSrc = 'https://i.imgur.com/yEav0G8.png';

  return (
    <header className="bg-white shadow-sm sticky top-0 z-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header Height h-16 */}
        <div className="flex items-center justify-between h-16"> 
          {/* Admin Link - Left Side (RTL context: Right) */}
          <div className="w-16 flex items-center justify-start z-30">
             <Link to="/login" className="text-xs text-gray-400 hover:text-sky-600 transition-colors font-medium">
                ניהול
             </Link>
          </div>

          {/* Centered Logo - Contained within header */}
          <div className="flex-grow flex justify-center items-center">
            <Link to="/" className="flex items-center justify-center">
                <img 
                  src={logoSrc}
                  alt="עמיתים" 
                  // h-14 fits nicely inside the h-16 header with 4px padding on top/bottom
                  className="h-14 w-auto object-contain"
                />
            </Link>
          </div>
          
           {/* Spacer to keep layout balanced (Right Side in RTL context: Left) */}
           <div className="w-16"></div>
        </div>
      </div>
    </header>
  );
};

export default Header;
