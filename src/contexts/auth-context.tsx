
"use client";

import type { ReactNode} from "react";
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail, // Renamed for clarity
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, increment, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

interface User {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  credits: number;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: any }>;
  signup: (email: string, password?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>; // Added
  deductCredits: (amount: number) => Promise<void>;
  addCredits: (amount: number, updateFirestore?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_CREDITS = 500;

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
              displayName: firebaseUser.displayName || userData.displayName,
              photoURL: firebaseUser.photoURL || userData.photoURL,
              credits: userData.credits !== undefined ? userData.credits : DEFAULT_CREDITS,
              isAdmin: userData.isAdmin === true,
            });
          } else {
            // New user (either via email/password or social sign-in like Google)
            const newUserProfile = {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "User",
              photoURL: firebaseUser.photoURL,
              credits: DEFAULT_CREDITS,
              createdAt: Timestamp.now(),
              isAdmin: false,
            };
            await setDoc(userDocRef, newUserProfile);
            setUser({
              uid: firebaseUser.uid,
              ...newUserProfile
            });
            console.log("New user document created in Firestore with default credits and isAdmin=false.");
          }
        } catch (error) {
          console.error("Error fetching/creating user document in Firestore:", error);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            credits: DEFAULT_CREDITS,
            isAdmin: false,
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
      // Firestore document creation is now handled by onAuthStateChanged
      toast({
        title: "Account Created",
        description: `Successfully signed up! ${DEFAULT_CREDITS} credits ($${(DEFAULT_CREDITS/100).toFixed(2)}) will be added.`,
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

  const signInWithGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle Firestore document creation/update
      toast({
        title: "Signed In with Google",
        description: "Successfully signed in with Google!",
      });
    } catch (error: any) {
      console.error("Google sign-in error: ", error);
      let description = error.message || "Could not sign in with Google. Please try again.";
      if (error.code === 'auth/popup-closed-by-user') {
        description = "Google Sign-in popup was closed before completion.";
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        description = "An account already exists with this email address using a different sign-in method.";
      }
      toast({
        title: "Google Sign-In Failed",
        description,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const sendPasswordResetEmail = async (email: string) => {
    try {
      await firebaseSendPasswordResetEmail(auth, email);
      toast({
        title: "Password Reset Email Sent",
        description: "If an account exists for this email, a password reset link has been sent.",
      });
    } catch (error: any) {
      console.error("Firebase password reset error: ", error);
      toast({
        title: "Password Reset Failed",
        description: error.message || "Could not send password reset email. Please try again.",
        variant: "destructive",
      });
      throw error; // Re-throw to allow caller to handle if needed
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
    console.warn("[AuthContext] deductCredits called. In production, this must be a server-side operation.");
    const userDocRef = doc(db, "users", user.uid);
    try {
      await updateDoc(userDocRef, {
        credits: increment(-amount)
      });

      const newCredits = user.credits - amount;
      setUser(prevUser => prevUser ? { ...prevUser, credits: newCredits } : null);
      toast({ title: "Credits Deducted", description: `${amount} credits used. Remaining: $${(newCredits / 100).toFixed(2)}`});
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

    const newCredits = user.credits + amount;

    if (updateFirestore) {
      console.warn("[AuthContext] addCredits called with client-side Firestore update. In production, this should be server-side.");
      const userDocRef = doc(db, "users", user.uid);
      try {
        await updateDoc(userDocRef, {
          credits: increment(amount)
        });
         toast({ title: "Credits Added", description: `${amount} credits ($${(amount/100).toFixed(2)}) added. New balance: $${(newCredits / 100).toFixed(2)}`});
      } catch (error) {
        console.error("Error adding credits in Firestore:", error);
        toast({ title: "Adding Credits Failed (DB)", description: "Could not update credits in the database.", variant: "destructive" });
        throw error;
      }
    } else {
      // Firestore update was handled by server, just update local state and inform user if needed
      if (user.credits !== newCredits) { // Avoid toast if credits didn't actually change from server's perspective
         toast({ title: "Credits Updated", description: `Your credit balance has been updated. New balance: $${(newCredits / 100).toFixed(2)}`});
      }
    }
    setUser(prevUser => prevUser ? { ...prevUser, credits: newCredits } : null);
  };


  return (
    <AuthContext.Provider value={{ user, loading, login, signup, signInWithGoogle, logout, sendPasswordResetEmail, deductCredits, addCredits }}>
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
