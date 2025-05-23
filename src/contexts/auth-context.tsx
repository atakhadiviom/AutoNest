
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
  isAdmin?: boolean; // Added for admin privileges
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
              isAdmin: userData.isAdmin === true, // Check for isAdmin flag
            });
          } else {
            // This case might happen if a user was created via Firebase Auth console
            // but doesn't have a corresponding document in 'users' collection yet.
            // Or, if this is the very first sign-in after signup where Firestore write failed.
            await setDoc(userDocRef, { 
              email: firebaseUser.email, 
              credits: DEFAULT_CREDITS,
              createdAt: Timestamp.now(),
              isAdmin: false, // Default new users to not be admins
            });
            setUser({ 
              uid: firebaseUser.uid, 
              email: firebaseUser.email,
              credits: DEFAULT_CREDITS,
              isAdmin: false,
            });
            console.log("User document created in Firestore with default credits and isAdmin=false for existing Auth user.");
          }
        } catch (error) {
          console.error("Error fetching/creating user document in Firestore:", error);
          // Fallback to basic user object if Firestore interaction fails
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            credits: DEFAULT_CREDITS, // Fallback credits
            isAdmin: false, // Fallback isAdmin status
          });
          toast({
            title: "Firestore Error",
            description: "Could not load full user data. Using default values.",
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
      // onAuthStateChanged will handle fetching/setting user data from Firestore, including isAdmin.
      toast({
        title: "Logged In",
        description: "Successfully logged in!",
      });
      return { success: true };
    } catch (error: any) {
      console.error("Firebase login error: ", error);
      if (error.code === 'auth/invalid-credential') {
        console.warn("Login failed due to invalid credentials. Please ensure the email and password are correct and the user exists.");
        // Toast for invalid credentials is handled by AuthForm
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
        isAdmin: false, // New users are not admins by default
      });
      // onAuthStateChanged will set the user state, including the new isAdmin field.
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

    // THIS SHOULD BE A SERVER-SIDE OPERATION IN PRODUCTION FOR SECURITY
    console.warn("[AuthContext] deductCredits called client-side. In production, this must be a server-side operation via a Cloud Function.");
    const userDocRef = doc(db, "users", user.uid);
    try {
      await updateDoc(userDocRef, {
        credits: increment(-amount) 
      });
      
      const newCredits = user.credits - amount;
      setUser(prevUser => prevUser ? { ...prevUser, credits: newCredits } : null);
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

    const newCredits = user.credits + amount; // Calculate new credits for local state first

    if (updateFirestore) {
      // THIS SHOULD BE A SERVER-SIDE OPERATION IN PRODUCTION (triggered by verified payment)
      console.warn("[AuthContext] addCredits called client-side with Firestore update. In production, this should be server-side via a Cloud Function triggered by verified payment.");
      const userDocRef = doc(db, "users", user.uid);
      try {
        await updateDoc(userDocRef, {
          credits: increment(amount)
        });
         toast({ title: "Credits Added (Firestore Updated)", description: `${amount} credits added. New balance: ${(newCredits / 100).toFixed(2)}`});
      } catch (error) {
        console.error("Error adding credits in Firestore:", error);
        toast({ title: "Adding Credits Failed (DB)", description: "Could not update credits in the database.", variant: "destructive" });
        throw error; // Re-throw so the caller knows Firestore update failed
      }
    }

    // Update local state
    setUser(prevUser => prevUser ? { ...prevUser, credits: newCredits } : null);
    
    // If Firestore wasn't updated (e.g., server handled it), the caller might show its own success toast.
    // If Firestore was updated by this client-side call (simulation button), a toast is shown above.
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
