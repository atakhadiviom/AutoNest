
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/auth-context";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, MailWarning, CreditCard, ShieldCheck, LogOut, UserCog, Save, Palette } from "lucide-react";
import Link from "next/link";
import { FullPageLoader } from "@/components/ui/loader";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";


const profileFormSchema = z.object({
  displayName: z.string().max(50, "Display name must be 50 characters or less.").optional().or(z.literal('')),
  photoURL: z.string().url({ message: "Please enter a valid URL." }).max(2048, "URL too long").optional().or(z.literal('')),
});

export default function ProfilePage() {
  const { user, loading, resendVerificationEmail, logout, updateUserProfile } = useAuth();
  const { toast } = useToast();
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: "",
      photoURL: "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        displayName: user.displayName || "",
        photoURL: user.photoURL || "",
      });
    }
  }, [user, form]);

  if (loading) {
    return <FullPageLoader />;
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <p>Please log in to view your profile.</p>
        </div>
      </AppLayout>
    );
  }

  const getInitials = (email: string | null): string => {
    if (!email) return "??";
    const namePart = user?.displayName || email.split('@')[0];
    if (!namePart) return email.substring(0,2).toUpperCase() || "??";
    return namePart.substring(0, 2).toUpperCase();
  };

  const handleResendVerification = async () => {
    await resendVerificationEmail();
  };

  async function onProfileSubmit(values: z.infer<typeof profileFormSchema>) {
    setIsUpdatingProfile(true);
    try {
      // Filter out unchanged values to avoid unnecessary updates if fields are optional and empty
      const updates: { displayName?: string; photoURL?: string } = {};
      if (values.displayName !== (user?.displayName || "")) {
        updates.displayName = values.displayName;
      }
      if (values.photoURL !== (user?.photoURL || "")) {
        updates.photoURL = values.photoURL;
      }
      
      if (Object.keys(updates).length > 0) {
        await updateUserProfile(updates);
      } else {
        toast({ title: "No Changes", description: "Profile details are already up to date." });
      }
    } catch (error) {
      // Error toast is handled by updateUserProfile
    } finally {
      setIsUpdatingProfile(false);
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <Avatar className="h-24 w-24 mx-auto mb-4 border-2 border-primary p-1">
              <AvatarImage 
                src={user.photoURL || `https://placehold.co/128x128.png?text=${getInitials(user.email)}`} 
                alt={user.displayName || user.email || "User"}
                data-ai-hint="user avatar"
              />
              <AvatarFallback className="text-3xl">{getInitials(user.email)}</AvatarFallback>
            </Avatar>
            <CardTitle className="text-3xl">{user.displayName || user.email?.split('@')[0] || "User Profile"}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                <div className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-3 text-primary" />
                  <span className="font-medium">Credits Balance:</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-lg mr-2">{(user.credits / 100).toFixed(2)}</span>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/billing">Manage Credits</Link>
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                <div className="flex items-center">
                  <MailWarning className={`h-5 w-5 mr-3 ${user.emailVerified ? 'text-green-500' : 'text-amber-500'}`} />
                  <span className="font-medium">Email Verification:</span>
                </div>
                <Badge variant={user.emailVerified ? "default" : "destructive"}>
                  {user.emailVerified ? "Verified" : "Not Verified"}
                </Badge>
              </div>

              {!user.emailVerified && (
                <Button onClick={handleResendVerification} variant="secondary" className="w-full">
                  <MailWarning className="mr-2 h-4 w-4" /> Resend Verification Email
                </Button>
              )}

              {user.isAdmin && (
                <div className="flex items-center p-3 bg-muted/50 rounded-md">
                  <ShieldCheck className="h-5 w-5 mr-3 text-primary" />
                  <span className="font-medium">Account Type:</span>
                  <Badge variant="outline" className="ml-auto">Administrator</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <UserCog className="mr-3 h-5 w-5 text-primary" />
              Profile Settings
            </CardTitle>
            <CardDescription>Update your display name and profile photo URL.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onProfileSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your display name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="photoURL"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Photo URL</FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="https://example.com/your-photo.png" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="space-y-2">
                  <FormLabel className="flex items-center"><Palette className="mr-2 h-4 w-4 text-primary" /> Theme Preference</FormLabel>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                    <span>Toggle between light and dark mode.</span>
                    <ThemeToggleButton />
                  </div>
                </div>
                <Button type="submit" disabled={isUpdatingProfile} className="w-full sm:w-auto">
                  {isUpdatingProfile ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Settings
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <Separator />

        <div className="text-center">
            <Button onClick={logout} variant="destructive" className="w-full max-w-xs">
                <LogOut className="mr-2 h-4 w-4" /> Log Out
            </Button>
        </div>
      </div>
    </AppLayout>
  );
}
