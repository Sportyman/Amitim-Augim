
import React from 'react';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
  // Use local path since the file exists in the public folder of the workspace
  const logoSrc = '/AmitimLogo.png';

  return (
    <header className="bg-white shadow-sm sticky top-0 z-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Thin Header Height h-16 */}
        <div className="flex items-center justify-between h-16"> 
          {/* Admin Link */}
          <div className="w-12 z-30 relative">
             <Link to="/login" className="text-xs text-gray-400 hover:text-sky-600 transition-colors font-medium">
                ניהול
             </Link>
          </div>

          {/* Centered Logo with Overflow (Badge Effect) */}
          {/* Centered absolutely in the middle of the header */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40">
            <Link to="/" className="flex items-center justify-center">
                <img 
                  src={logoSrc}
                  alt="עמיתים" 
                  // Large size to create badge effect over the thin header
                  className="h-32 w-auto object-contain drop-shadow-sm hover:opacity-90 transition-opacity"
                />
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
