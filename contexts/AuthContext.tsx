
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider } from '../services/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const getAdminEmail = () => {
  try {
    return (typeof process !== 'undefined' && process.env && process.env.ADMIN_EMAIL) 
      ? process.env.ADMIN_EMAIL 
      : 'shaykashay@gmail.com';
  } catch (e) {
    return 'shaykashay@gmail.com';
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const adminEmail = getAdminEmail();

  useEffect(() => {
    let mounted = true;

    // Setup Firebase listener
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!mounted) return;
      
      setUser(currentUser);
      if (currentUser && currentUser.email === adminEmail) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    // Failsafe: If Firebase doesn't respond within 2 seconds, allow app to load (as guest)
    const failsafeTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("Auth check timed out, allowing render as guest.");
        setLoading(false);
      }
    }, 2000);

    return () => {
      mounted = false;
      unsubscribe();
      clearTimeout(failsafeTimeout);
    };
  }, [adminEmail, loading]); // Added loading dependency to silence linter if needed, though logic is fine.

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
             <svg className="animate-spin h-10 w-10 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
