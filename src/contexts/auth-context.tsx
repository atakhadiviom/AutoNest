
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
import { auth, db } from '@/lib/firebase'; // Import the initialized auth and db instances
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore"; // Firestore functions
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
  addCredits: (amount: number) => Promise<void>; // For billing page simulation
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_CREDITS = 100; // Default credits for new users

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
            // User exists in Auth, but not in Firestore users collection (e.g., old user or signup interrupted)
            // Create their document with default credits.
            await setDoc(userDocRef, { 
              email: firebaseUser.email, 
              credits: DEFAULT_CREDITS 
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
          // Fallback to Auth user data with default credits if Firestore interaction fails
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            credits: DEFAULT_CREDITS, // Fallback credits
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

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, [toast]);

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: any }> => {
    if (!password) {
        const err = new Error("Password is required for Firebase login.");
        toast({
            title: "Login Error",
            description: err.message,
            variant: "destructive",
          });
        setLoading(false); // Explicitly set loading false as we are not proceeding
        return { success: false, error: { code: 'auth/missing-password', message: err.message } };
    }
    setLoading(true); 
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle fetching/setting user data from Firestore.
      toast({
        title: "Logged In",
        description: "Successfully logged in!",
      });
      // onAuthStateChanged will eventually set setLoading(false) after user state is fully resolved.
      return { success: true };
    } catch (error: any) {
      console.error("Firebase login error: ", error);
      if (error.code === 'auth/invalid-credential') {
        console.warn("Login failed due to invalid credentials. Please ensure the email and password are correct and the user exists.");
        // No toast here for 'auth/invalid-credential'; AuthForm will handle it.
      } else {
        // For other types of login errors, show a generic toast.
        toast({
          title: "Login Failed",
          description: error.message || "Could not log in. Please check your credentials.",
          variant: "destructive",
        });
      }
      setLoading(false); // Error occurred, ensure loading is false.
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
      });
      toast({
        title: "Account Created",
        description: "Successfully signed up! Default credits added.",
      });
      // onAuthStateChanged will eventually set setLoading(false)
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

  const addCredits = async (amount: number) => {
    if (!user) {
      toast({ title: "Error", description: "User not found for adding credits.", variant: "destructive" });
      return; 
    }
    if (amount <= 0) {
        toast({ title: "Invalid Amount", description: "Credit amount must be positive.", variant: "destructive" });
        return;
    }

    const userDocRef = doc(db, "users", user.uid);
    try {
      await updateDoc(userDocRef, {
        credits: increment(amount)
      });

      const newCredits = user.credits + amount;
      setUser({ ...user, credits: newCredits });
      toast({ title: "Credits Added", description: `${amount} credits added. New balance: ${(newCredits / 100).toFixed(2)}`});
    } catch (error) {
      console.error("Error adding credits in Firestore:", error);
      toast({ title: "Adding Credits Failed", description: "Could not update credits in the database.", variant: "destructive" });
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
