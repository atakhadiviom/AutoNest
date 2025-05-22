
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
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, increment, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

interface User {
  uid: string;
  email: string | null;
  credits: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: any }>;
  signup: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  deductCredits: (amount: number) => Promise<void>;
  addCredits: (amount: number, updateFirestore?: boolean) => Promise<void>; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_CREDITS = 100; 

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUser({ 
              uid: firebaseUser.uid, 
              email: firebaseUser.email,
              credits: userData.credits !== undefined ? userData.credits : DEFAULT_CREDITS,
            });
          } else {
            await setDoc(userDocRef, { 
              email: firebaseUser.email, 
              credits: DEFAULT_CREDITS,
              createdAt: Timestamp.now(),
            });
            setUser({ 
              uid: firebaseUser.uid, 
              email: firebaseUser.email,
              credits: DEFAULT_CREDITS,
            });
            console.log("User document created in Firestore with default credits for existing Auth user.");
          }
        } catch (error) {
          console.error("Error fetching/creating user document in Firestore:", error);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            credits: DEFAULT_CREDITS,
          });
          toast({
            title: "Firestore Error",
            description: "Could not load user data. Using default credits.",
            variant: "destructive",
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: any }> => {
    if (!password) {
        const err = new Error("Password is required for Firebase login.");
        toast({
            title: "Login Error",
            description: err.message,
            variant: "destructive",
          });
        setLoading(false); 
        return { success: false, error: { code: 'auth/missing-password', message: err.message } };
    }
    setLoading(true); 
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Logged In",
        description: "Successfully logged in!",
      });
      return { success: true };
    } catch (error: any) {
      console.error("Firebase login error: ", error);
      if (error.code === 'auth/invalid-credential') {
        console.warn("Login failed due to invalid credentials. Please ensure the email and password are correct and the user exists.");
      } else {
        toast({
          title: "Login Failed",
          description: error.message || "Could not log in. Please check your credentials.",
          variant: "destructive",
        });
      }
      setLoading(false); 
      return { success: false, error }; 
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
      const userDocRef = doc(db, "users", userCredential.user.uid);
      await setDoc(userDocRef, {
        email: userCredential.user.email,
        credits: DEFAULT_CREDITS,
        createdAt: Timestamp.now(), 
      });
      toast({
        title: "Account Created",
        description: "Successfully signed up! Default credits added.",
      });
    } catch (error: any) {
      console.error("Firebase signup error: ", error);
      toast({
        title: "Signup Failed",
        description: error.message || "Could not create account. Please try again.",
        variant: "destructive",
      });
      setLoading(false); 
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null); 
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
    if (!user) {
      toast({ title: "Error", description: "User not found for credit deduction.", variant: "destructive" });
      throw new Error("User not found");
    }
    if (user.credits < amount) {
      toast({ title: "Insufficient Credits", description: "Not enough credits to perform this action.", variant: "destructive" });
      throw new Error("Insufficient credits");
    }

    const userDocRef = doc(db, "users", user.uid);
    try {
       // THIS SHOULD BE A SERVER-SIDE OPERATION IN PRODUCTION
      console.warn("[AuthContext] deductCredits called client-side. In production, this must be a server-side operation.");
      await updateDoc(userDocRef, {
        credits: increment(-amount) 
      });
      
      const newCredits = user.credits - amount;
      setUser({ ...user, credits: newCredits });
      toast({ title: "Credits Deducted", description: `${amount} credits used. Remaining: ${(newCredits / 100).toFixed(2)}`});
    } catch (error) {
      console.error("Error deducting credits in Firestore:", error);
      toast({ title: "Credit Deduction Failed", description: "Could not update credits in the database.", variant: "destructive" });
      throw error; 
    }
  };

  const addCredits = async (amount: number, updateFirestore: boolean = true) => {
    if (!user) {
      toast({ title: "Error", description: "User not found for adding credits.", variant: "destructive" });
      throw new Error("User not found");
    }
    if (amount <= 0) {
        toast({ title: "Invalid Amount", description: "Credit amount must be positive.", variant: "destructive" });
        throw new Error("Credit amount must be positive");
    }

    if (updateFirestore) {
      // THIS SHOULD BE A SERVER-SIDE OPERATION IN PRODUCTION (triggered by verified payment)
      console.warn("[AuthContext] addCredits called client-side with Firestore update. In production, this should be server-side.");
      const userDocRef = doc(db, "users", user.uid);
      try {
        await updateDoc(userDocRef, {
          credits: increment(amount)
        });
        // Toast for successful Firestore update will be handled by the calling function (e.g., BillingPage)
      } catch (error) {
        console.error("Error adding credits in Firestore:", error);
        toast({ title: "Adding Credits Failed", description: "Could not update credits in the database.", variant: "destructive" });
        throw error; // Re-throw so the caller knows Firestore update failed
      }
    }

    // Update local state regardless of direct Firestore update here,
    // as the server-side call in production would be the source of truth.
    const newCredits = user.credits + amount;
    setUser(prevUser => prevUser ? { ...prevUser, credits: prevUser.credits + amount } : null);
    
    // Do not show a generic toast here if updateFirestore is false, 
    // as the calling function (e.g., BillingPage after server confirmation) will show a specific toast.
    if (updateFirestore) {
        // This path is for direct client-side addition (e.g., simulation button)
        toast({ title: "Credits Added (Client)", description: `${amount} credits added. New balance: ${(newCredits / 100).toFixed(2)}`});
    }
  };


  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, deductCredits, addCredits }}>
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

      