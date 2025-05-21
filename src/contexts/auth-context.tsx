
"use client";

import type { ReactNode} from "react";
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  onAuthStateChanged, 
  User as FirebaseUser, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Import the initialized auth instance
import { useToast } from "@/hooks/use-toast";

interface User {
  uid: string;
  email: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  signup: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setUser({ uid: firebaseUser.uid, email: firebaseUser.email });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  const login = async (email: string, password?: string) => {
    if (!password) {
        toast({
            title: "Login Error",
            description: "Password is required for Firebase login.",
            variant: "destructive",
          });
        throw new Error("Password is required for Firebase login.");
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting the user.
      // Navigation is handled by page-level useEffect hooks.
      toast({
        title: "Logged In",
        description: "Successfully logged in!",
      });
    } catch (error: any) {
      console.error("Firebase login error: ", error);
      toast({
        title: "Login Failed",
        description: error.message || "Could not log in. Please check your credentials.",
        variant: "destructive",
      });
      throw error; 
    } finally {
      // setLoading(false); // setLoading(false) is handled by onAuthStateChanged effect
    }
  };

  const signup = async (email: string, password?: string) => {
    if (!password) {
        toast({
            title: "Signup Error",
            description: "Password is required for Firebase signup.",
            variant: "destructive",
          });
        throw new Error("Password is required for Firebase signup.");
    }
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting the user.
      // Navigation is handled by page-level useEffect hooks.
       toast({
        title: "Account Created",
        description: "Successfully signed up!",
      });
    } catch (error: any) {
      console.error("Firebase signup error: ", error);
      toast({
        title: "Signup Failed",
        description: error.message || "Could not create account. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      // setLoading(false); // setLoading(false) is handled by onAuthStateChanged effect
    }
  };

  const logout = async () => {
    // setLoading(true); // Not strictly needed as onAuthStateChanged will update loading
    try {
      await signOut(auth);
      // onAuthStateChanged will set user to null
      router.push('/login'); // Explicitly navigate after sign out
      toast({
        title: "Logged Out",
        description: "Successfully logged out.",
      });
    } catch (error: any) {
      console.error("Firebase logout error: ", error);
      toast({
        title: "Logout Failed",
        description: error.message || "Could not log out. Please try again.",
        variant: "destructive",
      });
    } 
    // finally { setLoading(false); } // setLoading(false) is handled by onAuthStateChanged
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
