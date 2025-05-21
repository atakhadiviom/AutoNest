import Link from "next/link";
import { MainNav } from "@/components/layout/main-nav";
import { UserNav } from "@/components/layout/user-nav";
import { Hexagon } from "lucide-react";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
          <Hexagon className="h-6 w-6 text-primary" strokeWidth={1.5}/>
          <span className="font-bold sm:inline-block text-xl">
            AutoNest
          </span>
        </Link>
        <MainNav className="hidden md:flex mx-6" />
        <div className="flex flex-1 items-center justify-end space-x-4">
          {/* Add mobile nav trigger here if needed */}
          <UserNav />
        </div>
      </div>
    </header>
  );
}
