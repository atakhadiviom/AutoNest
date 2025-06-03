
"use client";

import Link from "next/link"; // Added Link import
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import { LogOut, User as UserIcon, Settings, MailWarning, Lightbulb } from "lucide-react"; 

export function UserNav() {
  const { user, logout, resendVerificationEmail } = useAuth();

  if (!user) {
    return null;
  }

  const getInitials = (email: string | null): string => {
    if (!email) return "??";
    const parts = email.split('@')[0];
    if (!parts) return email.substring(0,2).toUpperCase() || "??";
    return parts.substring(0, 2).toUpperCase();
  };
  
  const userEmail = user.email || "No email";

  const handleResendVerification = async () => {
    await resendVerificationEmail();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.photoURL || `https://placehold.co/40x40.png?text=${getInitials(user.email)}`} alt={userEmail} data-ai-hint="user avatar" />
            <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName || user.email?.split('@')[0] || "User"}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userEmail}
            </p>
            <p className={`text-xs leading-none ${user.emailVerified ? 'text-green-600' : 'text-amber-600'}`}>
              {user.emailVerified ? 'Email Verified' : 'Email Not Verified'}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
           <DropdownMenuItem asChild>
            <Link href="/suggest-tool">
              <Lightbulb className="mr-2 h-4 w-4" />
              <span>Suggest a Tool</span>
            </Link>
          </DropdownMenuItem>
          {!user.emailVerified && (
            <DropdownMenuItem onClick={handleResendVerification}>
              <MailWarning className="mr-2 h-4 w-4 text-amber-600" />
              <span>Resend Verification</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
