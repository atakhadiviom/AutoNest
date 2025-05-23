
"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter, usePathname } from "next/navigation";
import type { ReactNode} from "react";
import { useEffect } from "react";
import Navbar from "./navbar";
import { FullPageLoader } from "@/components/ui/loader";
import Link from "next/link";

// Define paths that should be accessible without authentication
const PUBLIC_PATHS = ['/privacy-policy', '/user-agreement'];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      // Check if the current path is public
      const isPublicPath = PUBLIC_PATHS.includes(pathname);
      
      if (!user && !isPublicPath) {
        router.replace("/login");
      }
    }
  }, [user, loading, router, pathname]);

  if (loading && !PUBLIC_PATHS.includes(pathname)) {
    // Only show full page loader for non-public paths during auth loading
    return <FullPageLoader />;
  }

  if (!user && !PUBLIC_PATHS.includes(pathname)) {
    // This case should ideally not be reached if useEffect redirect works quickly,
    // but it's a fallback for protected routes. For public routes, we proceed.
    return <FullPageLoader />; 
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="py-6 md:px-8 md:py-0 bg-background border-t">
        <div className="container flex flex-col items-center justify-center gap-4 md:h-24 md:flex-row">
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
            © {new Date().getFullYear()} AutoNest. All rights reserved.
          </p>
          <div className="flex gap-4 items-center text-sm text-muted-foreground">
            <Link href="/privacy-policy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <span className="text-muted-foreground/50">|</span>
            <Link href="/user-agreement" className="hover:text-primary transition-colors">
              User Agreement
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
