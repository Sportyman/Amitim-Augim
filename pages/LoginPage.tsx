
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const { user, isAdmin, signInWithGoogle, logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');
  
  // Logic to ensure logo always displays
  const [logoSrc, setLogoSrc] = useState('/AmitimLogo.png');

  const handleImageError = () => {
    if (logoSrc === '/AmitimLogo.png') {
        setLogoSrc('https://raw.githubusercontent.com/Sportyman/Amitim-Augim/main/public/AmitimLogo.png');
    } else if (logoSrc.includes('githubusercontent')) {
        setLogoSrc('https://i.imgur.com/oOqtYCK.jpeg');
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      navigate('/admin');
    }
  }, [user, isAdmin, navigate]);

  const handleLogin = async () => {
    setError('');
    try {
      await signInWithGoogle();
      // If successful, useEffect will redirect if admin.
      // If not admin, we handle it in the render below.
    } catch (err: any) {
      console.error("Login Error:", err);
      let msg = "התחברות נכשלה. אנא נסה שנית.";
      
      if (err?.code === 'auth/popup-blocked') {
        msg = "הדפדפן חסם את החלון הקופץ. אנא אפשר חלונות קופצים לאתר זה ונסה שוב.";
      } else if (err?.code === 'auth/popup-closed-by-user') {
        msg = "החלון נסגר לפני סיום ההתחברות.";
      } else if (err?.code === 'auth/unauthorized-domain') {
        const currentDomain = window.location.hostname;
        msg = `הדומיין הנוכחי (${currentDomain}) אינו מורשה. יש להעתיק אותו ולהוסיף ב-Firebase Console תחת Authentication > Settings > Authorized domains.`;
      } else if (err?.message) {
        msg = `שגיאה: ${err.message}`;
      }
      
      setError(msg);
    }
  };

  const handleLogout = async () => {
    await logout();
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="mb-8 flex justify-center">
             <Link to="/">
                <img 
                  src={logoSrc}
                  onError={handleImageError}
                  alt="עמיתים" 
                  className="h-40 w-auto hover:opacity-90 transition-opacity object-contain" 
                />
             </Link>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">כניסת מנהלים</h2>
        <p className="text-gray-600 mb-6">מערכת ניהול חוגים ופעילויות</p>
        
        {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 break-words select-text">
                {error}
            </div>
        )}

        {user && !isAdmin ? (
            <div className="mb-6 p-4 bg-sky-50 text-sky-800 rounded-xl border border-sky-100">
                <p className="font-bold mb-2">אין הרשאת גישה</p>
                <p className="text-sm mb-4">
                    החשבון <strong>{user.email}</strong> אינו מוגדר כמנהל מערכת.
                </p>
                <button 
                    onClick={handleLogout}
                    className="text-sm underline font-semibold hover:text-sky-900"
                >
                    התנתק ונסה חשבון אחר
                </button>
            </div>
        ) : (
            <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md mb-6"
            >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            התחבר עם Google
            </button>
        )}
        
        <div className="border-t pt-6">
            <Link to="/" className="text-sm text-gray-500 hover:text-sky-500 transition-colors font-medium">
                ← חזרה לדף הבית
            </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
