
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Menu, X, Quote, ChevronRight, Phone, Mail, MapPin, Zap, BrainCircuit, LineChart, CreditCard, Bot, PenFancy, Search, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Helper Components
const Section = ({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <section className={cn("py-16 sm:py-20 lg:py-24", className)} {...props}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  </section>
);

const Heading = ({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className={cn("text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-center", className)} {...props}>
        {children}
    </h2>
);

const SubHeading = ({ className, children, ...props }: React.HTMLAttributes<p>) => (
    <p className={cn("mt-4 text-lg text-muted-foreground text-center max-w-3xl mx-auto", className)} {...props}>
        {children}
    </p>
);


// Page Component
export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#testimonials", label: "Testimonials" },
    { href: "#blog", label: "Blog" },
    { href: "#contact", label: "Contact" },
  ];

  return (
    <>
      <style jsx global>{`
        .hero-gradient {
          background: linear-gradient(135deg, hsl(var(--primary)/0.8) 0%, hsl(var(--accent)/0.6) 100%);
        }
        .cta-gradient {
            background: linear-gradient(135deg, hsl(var(--primary)/0.9) 0%, hsl(var(--accent)/0.8) 100%);
        }
        .testimonial-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.1);
        }
        .feature-card:hover {
            transform: translateY(-5px);
        }
      `}</style>
      <div className="bg-background text-foreground">
        {/* Navigation */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/landing" className="text-2xl font-bold text-foreground">
                AutoNest
              </Link>
              <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
                {navLinks.map(link => (
                  <Link key={link.label} href={link.href} className="text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="hidden md:flex items-center space-x-2">
                <Button variant="ghost" asChild>
                    <Link href="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Sign Up Free</Link>
                </Button>
              </div>
              <div className="md:hidden">
                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                  {mobileMenuOpen ? <X/> : <Menu/>}
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </div>
            </div>
          </div>
          {mobileMenuOpen && (
            <div className="md:hidden bg-background/95 backdrop-blur-sm mt-px">
              <div className="px-4 pt-2 pb-4 space-y-2">
                {navLinks.map(link => (
                    <Link key={link.label} href={link.href} className="block py-2 text-muted-foreground hover:text-primary transition-colors" onClick={() => setMobileMenuOpen(false)}>
                        {link.label}
                    </Link>
                ))}
                <div className="border-t border-border pt-4 space-y-2">
                    <Button variant="outline" asChild className="w-full">
                        <Link href="/login">Login</Link>
                    </Button>
                    <Button asChild className="w-full">
                      <Link href="/signup">Sign Up Free</Link>
                    </Button>
                </div>
              </div>
            </div>
          )}
        </header>

        <main>
          {/* Hero Section */}
          <Section className="hero-gradient text-white pt-32 pb-24">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="text-center md:text-left">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
                  Automate Your Workflows, Elevate Your Productivity
                </h1>
                <p className="text-lg md:text-xl text-white/80 mb-8 max-w-xl mx-auto md:mx-0">
                  Harness the power of AI to streamline manual processes, generate content, and gain valuable insights, all in one intuitive platform. Welcome to AutoNest.
                </p>
                <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90 font-bold shadow-lg">
                  <Link href="/signup">
                    Get Started Free & Claim 500 Credits <ArrowRight className="ml-2" />
                  </Link>
                </Button>
              </div>
              <div>
                <Image 
                  src="https://images.unsplash.com/photo-1591696331111-ef9586a5b17a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyMHx8YXV0b21hdGV8ZW58MHx8fHwxNzQ5Mjk4NzIxfDA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="AI Automation Abstract"
                  width={600}
                  height={500}
                  className="rounded-2xl shadow-2xl object-cover"
                  priority
                  data-ai-hint="automation abstract"
                />
              </div>
            </div>
          </Section>

          {/* Why Choose AutoNest */}
          <Section>
            <Heading>Why Choose AutoNest?</Heading>
            <SubHeading>Unlock unparalleled efficiency and innovation.</SubHeading>
            <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { icon: Zap, title: "Boost Efficiency", desc: "Transform tedious manual tasks into automated workflows, saving you time and reducing errors with AI precision." },
                { icon: BrainCircuit, title: "AI-Powered Insights", desc: "Leverage generative AI for keyword research, content creation, and data-driven decision making to stay ahead." },
                { icon: LineChart, title: "Scale Your Operations", desc: "Automate repetitive processes and focus on strategic growth, allowing your business to scale effectively." },
                { icon: CreditCard, title: "Pay-As-You-Go", desc: "Flexible credit-based system ensures you only pay for the resources you use, making powerful automation accessible." }
              ].map(feature => (
                <div key={feature.title} className="feature-card bg-card p-8 rounded-xl shadow-md border transition-all">
                  <div className="text-primary mb-4">
                    <feature.icon className="h-10 w-10" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-card-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </Section>
          
          {/* Features At a Glance */}
          <Section id="features" className="bg-muted/30">
            <Heading>Features At a Glance</Heading>
            <SubHeading>Everything you need to automate your workflows.</SubHeading>
            <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { icon: Bot, title: "AI Workflow Generation", desc: "Automate complex processes with simple natural language commands using our AI builder." },
                  { icon: PenFancy, title: "Content Creation Tools", desc: "Generate high-quality content in seconds with our advanced AI writing assistants." },
                  { icon: Search, title: "Keyword Research & SEO", desc: "Discover valuable keywords and optimize your content with our SEO tools." },
                  { icon: CreditCard, title: "Credit-Based Usage", desc: "Pay only for what you use with our flexible credit system." },
                  { icon: LineChart, title: "Admin Dashboard", desc: "Track usage, manage team members, and monitor workflows all in one place." },
                  { icon: Lock, title: "Secure Payments", desc: "Secure, reliable payment processing to keep your data safe." }
                ].map(item => (
                    <div key={item.title} className="bg-card p-6 rounded-lg shadow-md transition-all hover:shadow-lg border">
                        <div className="text-primary mb-3">
                            <item.icon className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-card-foreground">{item.title}</h3>
                        <p className="text-muted-foreground">{item.desc}</p>
                    </div>
                ))}
            </div>
          </Section>

          {/* Testimonials Section */}
          <Section id="testimonials" className="bg-muted/30 dark:bg-card/20 py-24">
              <Heading className="text-foreground">What People Are Saying</Heading>
              <SubHeading className="text-muted-foreground">
                  Here are some testimonials from our satisfied customers.
              </SubHeading>
              <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 items-start">
                  {[
                      { 
                          name: 'Alex Johnson', 
                          title: 'CEO, Innovate Inc.', 
                          hint: 'man portrait', 
                          src: 'https://images.unsplash.com/photo-1624395213043-fa2e123b2656?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw2fHxtYW4lMjBwb3J0cmFpdHxlbnwwfHx8fDE3NTE2MjY0ODd8MA&ixlib=rb-4.1.0&q=80&w=1080',
                          quote: "I had been searching for a product like this for months and finally found it here. The team was extremely helpful and I was completely satisfied with my purchase."
                      },
                      { 
                          name: 'Samantha Lee', 
                          title: 'Marketing Director', 
                          hint: 'woman portrait', 
                          src: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHx3b21hbiUyMHBvcnRyYWl0fGVufDB8fHx8fDE3NTE2OTgxNjJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
                          quote: "AutoNest revolutionized our workflow. We're more efficient and data-driven than ever before. A true game-changer for our team."
                      },
      
                      { 
                          name: 'David Chen', 
                          title: 'CTO, Tech Solutions', 
                          hint: 'person portrait', 
                          src: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxwZXJzb24lMjBwb3J0cmFpdHxlbnwwfHx8fDE3NTE3MDY0NTJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
                          quote: "The AI-powered tools are incredibly intuitive and have saved us countless hours. The pay-as-you-go model is perfect for our scaling business."
                      }
                  ].map((testimonial) => (
                      <div key={testimonial.name} className="flex items-center testimonial-card">
                          <Image
                              src={testimonial.src}
                              alt={testimonial.name}
                              width={150}
                              height={150}
                              className="rounded-2xl object-cover h-28 w-28 md:h-32 md:w-32 flex-shrink-0 shadow-lg z-10"
                              data-ai-hint={testimonial.hint}
                          />
                          <div className="relative bg-background dark:bg-card p-6 rounded-2xl shadow-lg -ml-8">
                              <div className="pl-8">
                                  <Quote className="text-primary/20 h-10 w-10 absolute top-4 right-4" />
                                  <p className="text-muted-foreground text-sm italic mb-4">{testimonial.quote}</p>
                                  <div>
                                      <p className="font-bold text-foreground tracking-wider uppercase text-xs">{testimonial.name}</p>
                                      <p className="text-xs text-primary">{testimonial.title}</p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </Section>

          {/* Blog Section */}
          <Section id="blog">
              <div className="text-center mb-12">
                  <Heading>From Our Blog</Heading>
                  <SubHeading>Insights and updates from the AutoNest team.</SubHeading>
              </div>
              <div className="max-w-3xl mx-auto bg-card rounded-xl shadow-lg overflow-hidden border">
                  <Image 
                      src="https://placehold.co/800x400.png" 
                      alt="Building AutoNest"
                      width={800} height={400}
                      className="w-full h-64 object-cover"
                      data-ai-hint="tech office"
                      />
                  <div className="p-8">
                      <h3 className="text-2xl font-bold text-card-foreground mb-4">Building and Launching AutoNest: Our Journey</h3>
                      <p className="text-muted-foreground mb-6">A look behind the scenes at how AutoNest was developed, from initial idea to deployed application, and the lessons we learned along the way.</p>
                      <Button asChild variant="link" className="p-0 text-primary">
                        <Link href="/blog/building-autonest">
                            Go to the blog post page <ArrowRight className="ml-2" />
                        </Link>
                      </Button>
                  </div>
              </div>
          </Section>

          {/* CTA Section */}
          <Section className="cta-gradient text-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
                  <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Work?</h2>
                  <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">Join AutoNest today and experience the future of automation. Get started with 500 free credits and see the difference AI can make.</p>
                  <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90 font-bold shadow-lg">
                    <Link href="/signup">
                        Sign Up Now & Get Your Free Credits! <ArrowRight className="ml-2" />
                    </Link>
                  </Button>
              </div>
          </Section>

        </main>
        
        {/* Footer */}
        <footer className="bg-card border-t">
          <div className="max-w-7xl mx-auto px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-1 space-y-4">
                <h3 className="text-xl font-bold text-foreground">AutoNest</h3>
                <p className="text-sm text-muted-foreground">AI-powered workflow automation to elevate your productivity.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Product</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link href="#features" className="text-muted-foreground hover:text-primary">Features</Link></li>
                  <li><Link href="/signup" className="text-muted-foreground hover:text-primary">Pricing</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Company</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/blog/building-autonest" className="text-muted-foreground hover:text-primary">Blog</Link></li>
                  <li><Link href="/privacy-policy" className="text-muted-foreground hover:text-primary">Privacy Policy</Link></li>
                  <li><Link href="/user-agreement" className="text-muted-foreground hover:text-primary">Terms of Service</Link></li>
                </ul>
              </div>
               <div>
                <h4 className="font-semibold mb-3">Contact</h4>
                 <ul className="space-y-2 text-sm">
                  <li><a href="mailto:support@autonest.site" className="text-muted-foreground hover:text-primary">Email Support</a></li>
                  <li><a href="#contact" className="text-muted-foreground hover:text-primary">Contact Form</a></li>
                </ul>
              </div>
            </div>
            <div className="mt-12 border-t border-border pt-8 text-center text-sm text-muted-foreground">
              <p>&copy; {new Date().getFullYear()} AutoNest. All Rights Reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
