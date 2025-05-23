
"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { ReactNode} from "react";
import { useEffect } from "react";
import Navbar from "./navbar";
import { FullPageLoader } from "@/components/ui/loader";
import Link from "next/link"; // Added Link import

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return <FullPageLoader />;
  }

  if (!user) {
    // This case should ideally not be reached if useEffect redirect works quickly,
    // but it's a fallback.
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
