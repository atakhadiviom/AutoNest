
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
  credits: number; // Added credits field
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  signup: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  deductCredits: (amount: number) => Promise<void>; // Added deductCredits function
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_CREDITS = 100; // Default credits for new users (for demo)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // In a real app, you'd fetch credits from your backend (e.g., Firestore)
        // For this demo, we'll assign default credits or keep existing if user re-logs.
        setUser(prevUser => ({ 
          uid: firebaseUser.uid, 
          email: firebaseUser.email,
          credits: prevUser?.uid === firebaseUser.uid ? prevUser.credits : DEFAULT_CREDITS,
        }));
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
      // onAuthStateChanged will handle setting the user and initial credits.
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
      // setLoading(false); // Handled by onAuthStateChanged
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will set up the user object with default credits.
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
      // setLoading(false); // Handled by onAuthStateChanged
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      router.push('/login'); 
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
  };

  const deductCredits = async (amount: number) => {
    // IMPORTANT: This is a client-side simulation.
    // In a real app, this MUST be a secure backend operation.
    setUser(currentUser => {
      if (!currentUser) {
        toast({ title: "Error", description: "User not found.", variant: "destructive" });
        return null;
      }
      if (currentUser.credits < amount) {
        toast({ title: "Insufficient Credits", description: "Not enough credits to perform this action.", variant: "destructive" });
        // throw new Error("Insufficient credits"); // Or handle more gracefully
        return currentUser; // Don't change if not enough
      }
      const newCredits = currentUser.credits - amount;
      toast({ title: "Credits Deducted", description: `${amount} credits used. Remaining: ${newCredits}`});
      return { ...currentUser, credits: newCredits };
    });
  };


  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, deductCredits }}>
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
