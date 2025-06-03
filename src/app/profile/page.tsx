
"use client";

import { useAuth } from "@/contexts/auth-context";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MailWarning, CreditCard, ShieldCheck, LogOut, UserCircle } from "lucide-react";
import Link from "next/link";
import { FullPageLoader } from "@/components/ui/loader";

export default function ProfilePage() {
  const { user, loading, resendVerificationEmail, logout } = useAuth();

  if (loading) {
    return <FullPageLoader />;
  }

  if (!user) {
    // AppLayout should handle redirecting to login, but as a fallback:
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
    const parts = email.split('@')[0];
    if (!parts) return email.substring(0,2).toUpperCase() || "??";
    return parts.substring(0, 2).toUpperCase();
  };

  const handleResendVerification = async () => {
    await resendVerificationEmail();
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <Avatar className="h-24 w-24 mx-auto mb-4 border-2 border-primary p-1">
              <AvatarImage 
                src={user.photoURL || `https://placehold.co/128x128.png?text=${getInitials(user.email)}`} 
                alt={user.email || "User"}
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
            
            <div className="mt-8 flex flex-col space-y-3">
                {/* Placeholder for future actions like "Edit Profile", "Change Password" */}
                <Button variant="outline" disabled className="w-full">Edit Profile (Coming Soon)</Button>
                 <Button onClick={logout} variant="destructive" className="w-full">
                    <LogOut className="mr-2 h-4 w-4" /> Log Out
                </Button>
            </div>

          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
