
"use client";

import type { ReactNode} from "react";
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
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
  emailVerified: boolean; 
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: any }>;
  signup: (email: string, password?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  deductCredits: (amount: number) => Promise<void>;
  addCredits: (amount: number, updateFirestore?: boolean) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
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
          let userDataFromDb;
          let needsCreditAward = false;

          if (userDocSnap.exists()) {
            userDataFromDb = userDocSnap.data();
            // Check if credits should be awarded: email verified AND (initialCreditsAwarded is false OR (is undefined AND credits are 0))
            if (firebaseUser.emailVerified && 
                (userDataFromDb.initialCreditsAwarded === false || 
                 (userDataFromDb.initialCreditsAwarded === undefined && userDataFromDb.credits === 0))) {
              needsCreditAward = true;
            }
          } else {
            // New user: Set initial credits to 0 and initialCreditsAwarded to false
            userDataFromDb = {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "User",
              photoURL: firebaseUser.photoURL,
              credits: 0, // Start with 0 credits
              createdAt: Timestamp.now(),
              isAdmin: false,
              initialCreditsAwarded: false, // New flag
            };
            await setDoc(userDocRef, userDataFromDb);
            console.log("New user document created in Firestore with 0 initial credits and initialCreditsAwarded=false.");
            
            // If user verified email very quickly (e.g. social provider, or fast click)
            if (firebaseUser.emailVerified) {
                needsCreditAward = true;
            }
            
            // Send verification email for new email/password users
            if (!firebaseUser.emailVerified && firebaseUser.providerData.some(p => p.providerId === 'password')) {
              try {
                await sendEmailVerification(firebaseUser);
                // Toast for verification link is primarily handled by the signup function.
              } catch (verificationError) {
                console.error("Error sending verification email from onAuthStateChanged for new user:", verificationError);
              }
            }
          }

          if (needsCreditAward) {
            await updateDoc(userDocRef, {
              credits: DEFAULT_CREDITS,
              initialCreditsAwarded: true,
            });
            userDataFromDb.credits = DEFAULT_CREDITS; // Update local copy
            userDataFromDb.initialCreditsAwarded = true; // Update local copy
            toast({
              title: "Email Verified & Credits Awarded!",
              description: `Your email is verified and ${DEFAULT_CREDITS} free credits have been added to your account.`,
              duration: 7000,
            });
          }

          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || userDataFromDb.displayName,
            photoURL: firebaseUser.photoURL || userDataFromDb.photoURL,
            credits: userDataFromDb.credits,
            isAdmin: userDataFromDb.isAdmin === true,
            emailVerified: firebaseUser.emailVerified,
          });

        } catch (error) {
          console.error("Error fetching/creating/updating user document in Firestore:", error);
          // Fallback user object on error
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            credits: 0, // Default to 0 credits on error during Firestore interaction
            isAdmin: false,
            emailVerified: firebaseUser.emailVerified,
          });
          toast({
            title: "Firestore Error",
            description: "Could not load/update full user data. Using default values.",
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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // User state (including credits and emailVerified status) will be updated by onAuthStateChanged
      toast({
        title: "Logged In",
        description: "Successfully logged in!",
      });
      if (userCredential.user && !userCredential.user.emailVerified) {
        toast({
          title: "Email Not Verified",
          description: "Please verify your email to access all features and receive your welcome credits. Check your inbox or spam folder. You can resend it from your user menu.",
          duration: 10000,
        });
      }
      // If email IS verified, onAuthStateChanged will handle credit awarding toast if applicable
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
      // Firestore document creation with 0 credits is handled by onAuthStateChanged
      await sendEmailVerification(userCredential.user);
      toast({
        title: "Account Created!",
        description: `A verification email has been sent to ${email}. Please check your inbox/spam folder to verify your account and receive ${DEFAULT_CREDITS} free credits.`,
        duration: 10000,
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
      const result = await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle Firestore document creation/update and credit awarding if applicable
      toast({
        title: "Signed In with Google",
        description: "Successfully signed in with Google!",
      });
       if (result.user && !result.user.emailVerified) {
         // This case is rare for Google but good to handle.
         // No need to resend verification here typically, as Google emails are usually verified.
         // But if not, onAuthStateChanged will reflect this.
         toast({
           title: "Verify Your Email",
           description: "Please ensure your Google account email is accessible.",
           duration: 7000,
         });
       }
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

  const resendVerificationEmail = async () => {
    if (!auth.currentUser) {
      toast({ title: "Not Logged In", description: "No user is currently logged in.", variant: "destructive" });
      return;
    }
    if (auth.currentUser.emailVerified) {
      toast({ title: "Already Verified", description: "Your email is already verified.", variant: "default" });
      return;
    }
    try {
      await sendEmailVerification(auth.currentUser);
      toast({ title: "Verification Email Sent", description: "A new verification email has been sent. Please check your inbox (and spam folder)." });
    } catch (error: any) {
      console.error("Error resending verification email:", error);
      toast({ title: "Error Sending Email", description: error.message || "Could not resend verification email.", variant: "destructive" });
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
    // console.warn("[AuthContext] deductCredits called. In production, this must be a server-side operation.");
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
      // console.warn("[AuthContext] addCredits called with client-side Firestore update. In production, this should be server-side.");
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
      if (user.credits !== newCredits) {
         toast({ title: "Credits Updated", description: `Your credit balance has been updated. New balance: $${(newCredits / 100).toFixed(2)}`});
      }
    }
    setUser(prevUser => prevUser ? { ...prevUser, credits: newCredits } : null);
  };


  return (
    <AuthContext.Provider value={{ user, loading, login, signup, signInWithGoogle, logout, sendPasswordResetEmail, deductCredits, addCredits, resendVerificationEmail }}>
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
