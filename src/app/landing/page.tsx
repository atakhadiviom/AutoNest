
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Award, Bot, Briefcase, Building, ChevronRight, Cpu, ArrowRight, TrendingUp, Users, Mail, Phone, MapPin, BarChart, LineChart, BrainCircuit } from "lucide-react";
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

const StatCard = ({ percentage, title, description }: { percentage: string, title: string, description: string }) => (
    <div className="text-left">
        <p className="text-5xl lg:text-6xl font-bold text-slate-800">{percentage}</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-700">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
);

const ServiceCard = ({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) => (
    <div className="bg-white/50 backdrop-blur-sm p-6 rounded-xl border border-white/30 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
        <div className="mb-4">
            <div className="w-12 h-12 rounded-full bg-white/70 flex items-center justify-center">
                <Icon className="w-6 h-6 text-indigo-500" />
            </div>
        </div>
        <h3 className="font-bold text-slate-800 text-lg mb-2">{title}</h3>
        <p className="text-slate-600 text-sm">{description}</p>
        <a href="#" className="text-indigo-600 text-sm font-semibold mt-4 inline-flex items-center group">
            Learn More <ArrowRight className="ml-1 w-4 h-4 transition-transform group-hover:translate-x-1" />
        </a>
    </div>
);

const TestimonialCard = ({ quote, name, role, imageSrc, featured = false }: { quote: string, name: string, role: string, imageSrc: string, featured?: boolean }) => (
    <Card className={cn(
        "border-white/30 shadow-md transition-all hover:shadow-lg",
        featured ? "bg-white/80 backdrop-blur-md" : "bg-white/40 backdrop-blur-sm"
    )}>
        <CardContent className="p-6">
            <p className="text-slate-700 mb-4">&ldquo;{quote}&rdquo;</p>
            <div className="flex items-center">
                <Image src={imageSrc} alt={name} width={40} height={40} className="rounded-full" data-ai-hint="person portrait" />
                <div className="ml-3">
                    <p className="font-semibold text-slate-800">{name}</p>
                    <p className="text-sm text-slate-500">{role}</p>
                </div>
            </div>
        </CardContent>
    </Card>
);

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <style jsx global>{`
        .algosol-gradient-bg {
          background-color: #f8f9fa;
          background-image:
            radial-gradient(at 4% 10%, hsla(289, 97%, 89%, 0.3) 0px, transparent 50%),
            radial-gradient(at 97% 12%, hsla(201, 95%, 83%, 0.3) 0px, transparent 50%),
            radial-gradient(at 74% 95%, hsla(347, 94%, 87%, 0.3) 0px, transparent 50%),
            radial-gradient(at 8% 95%, hsla(139, 93%, 88%, 0.3) 0px, transparent 50%);
        }
      `}</style>
      <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 algosol-gradient-bg">
        {/* Navigation */}
        <nav className="bg-white/30 backdrop-blur-md sticky top-0 z-50 border-b border-white/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/landing" className="text-2xl font-bold text-slate-800">
                  Algosol
                </Link>
              </div>
              <div className="hidden md:flex items-center space-x-6 text-sm font-medium">
                <Link href="#services" className="text-slate-600 hover:text-slate-900">Services</Link>
                <Link href="#about" className="text-slate-600 hover:text-slate-900">About Us</Link>
                <Link href="#contact" className="text-slate-600 hover:text-slate-900">Contact</Link>
              </div>
              <div className="hidden md:block">
                <div className="ml-4 flex items-center space-x-2">
                    <Button variant="ghost" asChild>
                        <Link href="/login">Login</Link>
                    </Button>
                    <Button asChild className="bg-slate-800 text-white hover:bg-slate-700">
                        <Link href="/signup">Get Started</Link>
                    </Button>
                </div>
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
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                <Link href="#services" className="block px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:text-slate-900 hover:bg-white/50">Services</Link>
                <Link href="#about" className="block px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:text-slate-900 hover:bg-white/50">About Us</Link>
                <Link href="#contact" className="block px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:text-slate-900 hover:bg-white/50">Contact</Link>
                <div className="border-t border-slate-200 mt-2 pt-2">
                    <Button variant="ghost" asChild className="w-full justify-start">
                        <Link href="/login">Login</Link>
                    </Button>
                    <Button asChild className="w-full mt-1 bg-slate-800 text-white hover:bg-slate-700">
                        <Link href="/signup">Get Started</Link>
                    </Button>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Hero Section */}
        <Section className="pt-24 pb-32 text-center">
            <div className="relative">
                <div className="absolute -top-20 -left-20 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-yellow-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
                
                <h1 className="text-8xl md:text-9xl font-black text-slate-800 tracking-tighter">TECH</h1>
                <div className="relative inline-block w-64 h-64 md:w-80 md:h-80 -mt-12 md:-mt-16">
                    <Image src="https://placehold.co/400x400.png" alt="AI Automation Abstract" width={400} height={400} className="w-full h-full" priority data-ai-hint="abstract AI head" />
                </div>
                <h2 className="text-6xl md:text-7xl font-bold text-slate-600 tracking-tight -mt-12 md:-mt-16">AI AUTOMATION</h2>

                <p className="max-w-xl mx-auto mt-6 text-slate-600">We fuse cutting-edge technology with business strategy to unlock unprecedented growth and efficiency.</p>
                
                <div className="mt-8">
                    <Button size="lg" asChild className="bg-slate-800 text-white hover:bg-slate-700 rounded-full shadow-lg">
                        <Link href="#services">Discover Services <ChevronRight className="ml-2 w-5 h-5" /></Link>
                    </Button>
                </div>
            </div>
        </Section>

        {/* Stats Section */}
        <Section id="about">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4 max-w-2xl">Impact your business with AI-driven predictive insights.</h2>
            <p className="text-slate-600 mb-12 max-w-2xl">Our tailored solutions translate data into decisions, fostering growth and a significant competitive edge in the market.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <StatCard percentage="96%" title="Client Satisfaction" description="Reflecting our commitment to excellence and results." />
                <StatCard percentage="20%" title="Efficiency Increase" description="Average boost in operational efficiency for our partners." />
                <StatCard percentage="51%" title="Market Growth" description="Accelerated market penetration for clients using our AI tools." />
                <StatCard percentage="44%" title="Cost Reduction" description="Significant savings through process automation and optimization." />
            </div>
        </Section>
        
        {/* Services Section */}
        <Section id="services" className="bg-white/20">
             <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Our Experts & AI-Driven Services</h2>
            <p className="text-slate-600 mb-12 max-w-2xl">From bespoke AI development to strategic process automation, we deliver solutions that redefine what's possible.</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <ServiceCard icon={BrainCircuit} title="Custom AI Solutions" description="Develop tailored AI models and platforms that address your unique business challenges and opportunities." />
                <ServiceCard icon={TrendingUp} title="Predictive Analytics" description="Harness the power of your data to forecast trends, understand customer behavior, and make informed decisions." />
                <ServiceCard icon={Bot} title="Workflow Automation" description="Automate repetitive tasks, streamline operations, and free up your team to focus on high-value work." />
            </div>
        </Section>

        {/* Showcase Sections */}
        <Section>
            <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                    <Image src="https://placehold.co/600x400.png" alt="AI Insights" width={600} height={400} className="rounded-xl shadow-lg" data-ai-hint="digital interface"/>
                </div>
                <div>
                    <h3 className="text-3xl font-bold text-slate-800 mb-4">AI-driven insights on demand.</h3>
                    <p className="text-slate-600 mb-6">We provide unparalleled clarity in a complex digital landscape, empowering you with the intelligence needed to innovate and lead.</p>
                    <ul className="space-y-3 text-slate-600">
                        <li className="flex items-center"><ChevronRight className="w-5 h-5 text-indigo-500 mr-2" /><span>Market Trend Analysis</span></li>
                        <li className="flex items-center"><ChevronRight className="w-5 h-5 text-indigo-500 mr-2" /><span>Customer Segmentation</span></li>
                        <li className="flex items-center"><ChevronRight className="w-5 h-5 text-indigo-500 mr-2" /><span>Operational Intelligence</span></li>
                    </ul>
                </div>
            </div>
        </Section>
        
        <Section className="bg-white/20">
            <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="md:order-2">
                    <Image src="https://placehold.co/600x400.png" alt="Business Innovation" width={600} height={400} className="rounded-xl shadow-lg" data-ai-hint="data cityscape" />
                </div>
                <div className="md:order-1">
                    <h3 className="text-3xl font-bold text-slate-800 mb-4">Empowering businesses through innovation.</h3>
                    <p className="text-slate-600">At Algosol, we're on a mission to drive business growth by transforming complex challenges into opportunities for innovation and success.</p>
                </div>
            </div>
        </Section>

        <Section>
            <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                    <Image src="https://placehold.co/600x400.png" alt="AI Automation" width={600} height={400} className="rounded-xl shadow-lg" data-ai-hint="robot future" />
                </div>
                <div>
                    <h3 className="text-3xl font-bold text-slate-800 mb-4">Supercharge your business with AI automation.</h3>
                    <p className="text-slate-600 mb-6">Let our advanced AI handle the heavy lifting, from data analysis to customer interactions, so you can focus on strategy.</p>
                    <Button asChild className="bg-slate-800 text-white hover:bg-slate-700">
                        <Link href="#contact">Get a Demo</Link>
                    </Button>
                </div>
            </div>
        </Section>

        {/* Testimonials */}
        <Section className="bg-white/20">
            <h2 className="text-center text-3xl md:text-4xl font-bold text-slate-800 mb-12">What people are saying</h2>
            <div className="grid md:grid-cols-3 gap-8">
                <TestimonialCard name="Sarah L." role="CEO, Innovate Inc." quote="Algosol's AI integration has completely revolutionized our workflow. We're more efficient and profitable than ever." imageSrc="https://placehold.co/100x100.png" />
                <TestimonialCard name="Mike R." role="Head of Marketing, Growth Co." quote="The predictive analytics tool is a game-changer. Our campaign targeting has improved by over 50%." imageSrc="https://placehold.co/100x100.png" featured />
                <TestimonialCard name="Jessica P." role="Founder, Creative Solutions" quote="Working with the Algosol team was a breeze. They understood our vision and delivered beyond our expectations." imageSrc="https://placehold.co/100x100.png" />
            </div>
        </Section>

        {/* Contact Section */}
        <Section id="contact">
            <Card className="bg-slate-800 text-white overflow-hidden lg:grid lg:grid-cols-2 lg:gap-4">
                <div className="p-8 md:p-12">
                    <h2 className="text-3xl font-bold mb-4">Get in Touch</h2>
                    <p className="text-slate-300 mb-8">Have a project in mind or just want to learn more? We&apos;d love to hear from you.</p>
                    <form className="space-y-4">
                        <Input type="text" placeholder="Your Name" className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400" />
                        <Input type="email" placeholder="Your Email" className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400" />
                        <Textarea placeholder="Your Message" className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400" />
                        <Button type="submit" className="w-full bg-white text-slate-800 hover:bg-slate-200">Send Message</Button>
                    </form>
                </div>
                 <div className="relative h-64 lg:h-full">
                    <Image src="https://placehold.co/600x800.png" alt="Contact Abstract" fill className="object-cover" data-ai-hint="developer coding" />
                </div>
            </Card>
        </Section>

        {/* Footer */}
        <footer className="bg-transparent text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                  <div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">Algosol</h3>
                      <p className="text-sm">Fusing technology and strategy for business growth.</p>
                  </div>
                  <div>
                      <h4 className="font-semibold text-slate-700 mb-3">Pages</h4>
                      <ul className="space-y-2 text-sm">
                          <li><Link href="#about" className="hover:text-slate-900">About</Link></li>
                          <li><Link href="#services" className="hover:text-slate-900">Services</Link></li>
                          <li><Link href="#contact" className="hover:text-slate-900">Contact</Link></li>
                      </ul>
                  </div>
                  <div>
                      <h4 className="font-semibold text-slate-700 mb-3">Contact</h4>
                      <ul className="space-y-2 text-sm">
                          <li className="flex items-center gap-2"><Mail className="w-4 h-4" /><span>hello@algosol.com</span></li>
                          <li className="flex items-center gap-2"><Phone className="w-4 h-4" /><span>(555) 123-4567</span></li>
                          <li className="flex items-center gap-2"><MapPin className="w-4 h-4" /><span>123 Tech Lane, CA</span></li>
                      </ul>
                  </div>
                  <div>
                      <h4 className="font-semibold text-slate-700 mb-3">Follow Us</h4>
                      <div className="flex space-x-4">
                          <a href="#" className="hover:text-slate-900"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd"></path></svg></a>
                          <a href="#" className="hover:text-slate-900"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.71v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path></svg></a>
                      </div>
                  </div>
              </div>
              <div className="border-t border-slate-200 mt-8 pt-8 text-center text-xs">
                  <p>&copy; {new Date().getFullYear()} Algosol. All rights reserved.</p>
              </div>
          </div>
        </footer>
      </div>
    </>
  );
}
