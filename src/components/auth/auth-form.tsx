
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { Eye, EyeOff, Hexagon } from "lucide-react";
import { Separator } from "@/components/ui/separator"; // Added for divider
import { useToast } from "@/hooks/use-toast";

interface AuthFormProps {
  mode: "login" | "signup";
}

// Simple Google Icon SVG
const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    <path d="M1 1h22v22H1z" fill="none" />
  </svg>
);


const formSchemaBase = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

const signupSchema = formSchemaBase.extend({
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
});

export function AuthForm({ mode }: AuthFormProps) {
  const { login, signup, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const currentSchema = mode === 'signup' ? signupSchema : formSchemaBase;

  const form = useForm<z.infer<typeof currentSchema>>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      email: "",
      password: "",
      ...(mode === 'signup' && { confirmPassword: "" }),
    },
  });

  async function onSubmit(values: z.infer<typeof currentSchema>) {
    setIsLoading(true);
    try {
      if (mode === "login") {
        const loginResult = await login(values.email, values.password);
        if (!loginResult.success && loginResult.error) {
          if (loginResult.error.code === 'auth/invalid-credential') {
            toast({
              title: "Login Failed",
              description: "Account not found or password incorrect. Redirecting to sign up...",
              variant: "destructive",
            });
            router.push('/signup');
          }
        }
      } else {
        const signupValues = values as z.infer<typeof signupSchema>;
        await signup(signupValues.email, signupValues.password);
      }
    } catch (error: any) {
      console.error("AuthForm submission error:", error.message);
    } finally {
      setIsLoading(false);
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Navigation on successful Google sign-in is handled by onAuthStateChanged in AuthContext
    } catch (error) {
      // Errors are handled by signInWithGoogle in AuthContext (shows a toast)
      console.error("AuthForm Google Sign-In error:", error);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center text-primary">
            <Hexagon size={40} strokeWidth={1.5} />
            <span className="ml-2 text-3xl font-bold text-foreground">AutoNest</span>
          </div>
          <CardTitle className="text-2xl">{mode === "login" ? "Welcome Back" : "Create an Account"}</CardTitle>
          <CardDescription>
            {mode === "login" ? "Sign in to continue to AutoNest." : "Enter your details to get started."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={togglePasswordVisibility}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {mode === "signup" && (
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                         <div className="relative">
                           <Input type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                           <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={toggleConfirmPasswordVisibility}
                          >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                {isLoading ? "Processing..." : (mode === "login" ? "Log In" : "Sign Up")}
              </Button>
            </form>
          </Form>

          <div className="my-6 flex items-center">
            <Separator className="flex-grow" />
            <span className="mx-4 text-xs uppercase text-muted-foreground">Or continue with</span>
            <Separator className="flex-grow" />
          </div>

          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleGoogleSignIn}
            disabled={isLoading || isGoogleLoading}
          >
            {isGoogleLoading ? (
              "Processing..."
            ) : (
              <>
                <GoogleIcon />
                Sign in with Google
              </>
            )}
          </Button>

          <div className="mt-6 text-center text-sm">
            {mode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="font-medium text-primary hover:underline">
                  Sign up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Log in
                </Link>
              </>
            )}
          </div>
          <div className="mt-4 text-center text-xs text-muted-foreground space-x-2">
            <Link href="/privacy-policy" className="hover:text-primary hover:underline">
              Privacy Policy
            </Link>
            <span>&bull;</span>
            <Link href="/user-agreement" className="hover:text-primary hover:underline">
              User Agreement
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
