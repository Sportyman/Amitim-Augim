
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
          <div className="hidden md:flex md:items-center md:space-x-8 md:rtl:space-x-reverse">
            <a href="#" className="text-gray-500 hover:text-gray-700">חוגים</a>
            <a href="#" className="text-gray-500 hover:text-gray-700">סדנאות</a>
            <a href="#" className="text-gray-500 hover:text-gray-700">טיולים</a>
            <a href="#" className="text-gray-500 hover:text-gray-700">הרצאות</a>
          </div>
          <div className="flex items-center">
            <a
              href="#"
              className="bg-orange-500 text-white px-4 py-2 rounded-full hover:bg-orange-600 transition-colors duration-300"
            >
              הוספה לאתר
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;