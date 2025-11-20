
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
  // Logic to ensure logo always displays
  const [logoSrc, setLogoSrc] = useState('/AmitimLogo.png');

  const handleImageError = () => {
    if (logoSrc === '/AmitimLogo.png') {
        // Fallback 1: Try Direct GitHub Raw URL
        setLogoSrc('https://raw.githubusercontent.com/Sportyman/Amitim-Augim/main/public/AmitimLogo.png');
    } else if (logoSrc.includes('githubusercontent')) {
        // Fallback 2: Revert to Imgur (Known working state)
        setLogoSrc('https://i.imgur.com/oOqtYCK.jpeg');
    }
  };

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

          {/* Centered Logo with Overflow */}
          {/* Centered absolutely in the middle of the header */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40">
            <Link to="/" className="flex items-center justify-center">
                <img 
                  src={logoSrc}
                  onError={handleImageError}
                  alt="עמיתים" 
                  // h-28 is significantly larger than the h-16 header, creating the overlap effect
                  className="h-28 w-auto object-contain drop-shadow-sm transition-opacity duration-300"
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
