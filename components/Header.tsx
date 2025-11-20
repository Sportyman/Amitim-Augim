import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // Import Link

const Header: React.FC = () => {
  const [imageError, setImageError] = useState(false);

  // Primary: Local file (served from public/)
  // Fallback: Raw GitHub URL (in case local file isn't pulled yet)
  const localLogo = "/AmitimLogo.png";
  const remoteLogo = "https://raw.githubusercontent.com/Sportyman/Amitim-Augim/refs/heads/main/public/AmitimLogo.png";

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    if (target.src.includes(localLogo)) {
        // If local fails, try remote
        target.src = remoteLogo;
    } else {
        // If remote also fails, show text
        setImageError(true);
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex items-center justify-between h-16"> 
          {/* Admin Link */}
          <div className="w-12 z-30 relative">
             <Link to="/login" className="text-xs text-gray-400 hover:text-sky-600 transition-colors font-medium">
                ניהול
             </Link>
          </div>

          {/* Centered Logo with Overflow - Vertically Centered */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40">
            <Link to="/" className="flex items-center justify-center">
              {!imageError ? (
                <img 
                  src={localLogo} 
                  alt="עמיתים" 
                  className="h-32 w-auto object-contain drop-shadow-sm"
                  onError={handleImageError}
                />
              ) : (
                <span className="text-3xl font-bold text-sky-500 tracking-wide">
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