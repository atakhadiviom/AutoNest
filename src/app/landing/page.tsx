"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Play, Facebook, Twitter, Linkedin } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Helper components for structure and style, specific to this new design
const Section = ({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <section className={cn("py-12 sm:py-16 lg:py-20", className)} {...props}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  </section>
);

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <style jsx global>{`
        .autonest-gradient-bg-v2 {
          background-color: #f8f9fa;
          background-image:
            radial-gradient(at 4% 10%, hsla(289, 97%, 89%, 0.3) 0px, transparent 50%),
            radial-gradient(at 97% 12%, hsla(201, 95%, 83%, 0.3) 0px, transparent 50%);
        }
      `}</style>
      <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 autonest-gradient-bg-v2">
        {/* Navigation */}
        <header className="absolute top-0 left-0 right-0 z-50 bg-transparent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/landing" className="text-2xl font-bold text-slate-800">
                  AutoNest
                </Link>
              </div>
              <div className="hidden md:flex items-center space-x-8 text-sm font-medium">
                <Link href="#home" className="text-slate-600 hover:text-slate-900">Home</Link>
                <Link href="#about" className="text-slate-600 hover:text-slate-900">About Us</Link>
                <Link href="#services" className="text-slate-600 hover:text-slate-900">Services</Link>
                <Link href="#faq" className="text-slate-600 hover:text-slate-900">FAQ</Link>
              </div>
              <div className="hidden md:block">
                <Button asChild className="bg-slate-800 text-white hover:bg-slate-700 rounded-md">
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </div>
              <div className="md:hidden">
                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
                  <span className="sr-only">Open main menu</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
          {mobileMenuOpen && (
            <div className="md:hidden bg-white/90 backdrop-blur-sm">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                <Link href="#home" className="block px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:text-slate-900 hover:bg-white/50">Home</Link>
                <Link href="#about" className="block px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:text-slate-900 hover:bg-white/50">About</Link>
                <Link href="#services" className="block px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:text-slate-900 hover:bg-white/50">Services</Link>
                 <Link href="#faq" className="block px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:text-slate-900 hover:bg-white/50">FAQ</Link>
                <div className="border-t border-slate-200 mt-2 pt-2">
                    <Button asChild className="w-full mt-1 bg-slate-800 text-white hover:bg-slate-700">
                        <Link href="/signup">Sign Up</Link>
                    </Button>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Hero Section */}
        <main className="flex-grow flex items-center" id="home">
            <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="absolute inset-0">
                    <h1 className="text-[20vw] lg:text-[180px] font-black text-gray-200/80 leading-none text-center select-none" aria-hidden="true">
                        AI AUTOMATION
                    </h1>
                </div>

                <div className="relative grid grid-cols-12 gap-8 items-center py-16">
                   
                    <div className="col-span-12 lg:col-span-4">
                        <div className="text-left">
                            <h2 className="text-lg font-medium text-gray-700 uppercase tracking-widest mb-2">Unleash the Power of</h2>
                            <p className="text-gray-600 max-w-sm mb-8">
                                Unleash the true potential of your business through our advanced AI-driven solutions. Streamline workflows, optimize decision-making, and enhance customer experiences like never before.
                            </p>
                            <Button variant="link" asChild className="font-bold text-slate-800 p-0 hover:text-indigo-600">
                                <Link href="/signup">GET STARTED NOW!</Link>
                            </Button>
                        </div>
                    </div>
                    
                    <div className="col-span-12 lg:col-span-4 flex justify-center items-center">
                         <div className="relative w-72 h-72 md:w-96 md:h-96">
                             <Image 
                                src="/img/Illustration.png"
                                alt="AI Automation Abstract" 
                                fill
                                className="object-contain" 
                                priority 
                                data-ai-hint="automation illustration" 
                            />
                         </div>
                    </div>

                    <div className="col-span-12 lg:col-span-4">
                         <div className="text-left lg:text-right">
                            <h2 className="text-lg font-medium text-gray-700 uppercase tracking-widest mb-8">AI AUTOMATION</h2>

                            <div className="inline-block text-left">
                                <p className="text-sm text-gray-500 mb-2">Discover more about us!</p>
                                <div className="flex items-center space-x-2 mb-4">
                                    <button className="w-12 h-12 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700">
                                        <Play className="w-5 h-5 fill-current" />
                                    </button>
                                     <Image src="https://placehold.co/100x50.png" alt="Discover" width={100} height={50} className="rounded-md" data-ai-hint="person portrait" />
                                </div>
                                <div className="flex space-x-4">
                                    <a href="#" className="text-gray-500 hover:text-slate-800"><Facebook className="w-5 h-5"/></a>
                                    <a href="#" className="text-gray-500 hover:text-slate-800"><Twitter className="w-5 h-5"/></a>
                                    <a href="#" className="text-gray-500 hover:text-slate-800"><Linkedin className="w-5 h-5"/></a>
                                </div>
                            </div>
                         </div>
                    </div>

                     <div className="col-span-12 flex justify-center items-center absolute inset-0 -z-10 pointer-events-none">
                        <h1 className="text-[25vw] lg:text-[250px] font-black text-slate-800 leading-none select-none" aria-hidden="true">
                            TECH
                        </h1>
                    </div>
                </div>
            </div>
        </main>

        {/* Footer */}
        <footer className="bg-transparent text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="border-t border-slate-200 mt-8 pt-8 text-center text-xs">
                  <p>&copy; {new Date().getFullYear()} AutoNest. All rights reserved.</p>
              </div>
          </div>
        </footer>
      </div>
    </>
  );
}
