import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider } from '../services/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { dbService } from '../services/dbService';
import { UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean; // True if role is not null
  userRole: UserRole | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const getMasterAdminEmail = () => {
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
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  const masterEmail = getMasterAdminEmail();

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!mounted) return;
      
      setUser(currentUser);
      
      if (currentUser && currentUser.email) {
          // 1. Check if Master Admin (Environment Variable) - Always Super Admin
          if (currentUser.email === masterEmail) {
              setUserRole('super_admin');
          } else {
              // 2. Check Firestore for other roles
              const role = await dbService.getUserRole(currentUser.email);
              setUserRole(role);
          }
      } else {
          setUserRole(null);
      }
      setLoading(false);
    });

    // Failsafe
    const failsafeTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("Auth check timed out.");
        setLoading(false);
      }
    }, 4000); // Increased timeout slightly for DB fetch

    return () => {
      mounted = false;
      unsubscribe();
      clearTimeout(failsafeTimeout);
    };
  }, [masterEmail]); 

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
      setUserRole(null);
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
    <AuthContext.Provider value={{ 
        user, 
        loading, 
        isAdmin: !!userRole, 
        userRole,
        signInWithGoogle, 
        logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};