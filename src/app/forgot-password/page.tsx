
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
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
import { Hexagon, Mail, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

export default function ForgotPasswordPage() {
  const { sendPasswordResetEmail } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setEmailSent(false);
    try {
      await sendPasswordResetEmail(values.email);
      setEmailSent(true);
      // Toast is handled by AuthContext
    } catch (error: any) {
      // Toast is handled by AuthContext
      console.error("Forgot password submission error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center text-primary">
            <Hexagon size={40} strokeWidth={1.5} />
            <span className="ml-2 text-3xl font-bold text-foreground">AutoNest</span>
          </div>
          <CardTitle className="text-2xl">Forgot Your Password?</CardTitle>
          <CardDescription>
            {emailSent
              ? "If an account with that email exists, a password reset link has been sent. Please check your inbox (and spam folder)."
              : "No worries! Enter your email address below and we'll send you a link to reset your password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!emailSent ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input placeholder="you@example.com" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            </Form>
          ) : (
            <Button onClick={() => setEmailSent(false)} variant="outline" className="w-full">
              Send to a different email
            </Button>
          )}
          <div className="mt-6 text-center">
            <Button variant="link" asChild className="text-sm text-muted-foreground hover:text-primary">
              <Link href="/login">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to Login
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
