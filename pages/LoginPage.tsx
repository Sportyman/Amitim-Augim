import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const { user, isAdmin, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && isAdmin) {
      navigate('/admin');
    }
  }, [user, isAdmin, navigate]);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      alert("התחברות נכשלה. וודא שאתה מורשה כניסה.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="mb-6 flex justify-center">
             <img src="/logo.png" alt="עמיתים" className="h-16 w-auto" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">כניסת מנהלים</h2>
        <p className="text-gray-600 mb-8">אנא התחבר באמצעות חשבון הגוגל המורשה שלך כדי לנהל את המערכת.</p>
        
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          התחבר עם Google
        </button>
        
        <div className="mt-6 text-sm text-gray-400">
            רק למשתמשים מורשים.
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
