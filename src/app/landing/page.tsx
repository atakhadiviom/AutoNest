
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Menu, X, Quote, ChevronRight, Phone, Mail, MapPin } from "lucide-react";
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
    <p className={cn("mt-4 text-lg text-muted-foreground text-center max-w-2xl mx-auto", className)} {...props}>
        {children}
    </p>
);


// Page Component
export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "#services", label: "Services" },
    { href: "#testimonials", label: "Testimonials" },
    { href: "#team", label: "Team" },
    { href: "#contact", label: "Contact" },
  ];

  return (
    <>
      <style jsx global>{`
        .autonest-gradient-bg {
          background: radial-gradient(circle at 10% 20%, rgb(238, 238, 238) 0%, rgb(255, 255, 255) 90%);
        }
        .dark .autonest-gradient-bg {
          background: radial-gradient(circle at 10% 20%, rgb(30, 30, 40) 0%, rgb(17, 24, 39) 90%);
        }
        .testimonial-card:hover {
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.15);
        }
        .feature-card:hover {
            transform: translateY(-5px);
        }
        .stat-card {
            border-left: 2px solid hsl(var(--primary) / 0.5);
            padding-left: 1rem;
        }
      `}</style>
      <div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 autonest-gradient-bg">
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 z-50 bg-transparent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <Link href="/landing" className="text-2xl font-bold text-foreground">
                AutoNest
              </Link>
              <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
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
                <Button asChild className="bg-foreground text-background hover:bg-foreground/80">
                  <Link href="/signup">Get Quote</Link>
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
            <div className="md:hidden bg-background/95 backdrop-blur-sm mt-1">
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
                    <Button asChild className="w-full bg-foreground text-background hover:bg-foreground/80">
                      <Link href="/signup">Get Quote</Link>
                    </Button>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Hero Section */}
        <main className="pt-20">
          <Section className="text-center pt-24 md:pt-32 lg:pt-40">
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-foreground">TECH</h1>
            <div className="relative w-full max-w-sm md:max-w-md lg:max-w-lg mx-auto my-8 md:-my-12 lg:-my-16">
              <Image 
                src="/img/Illustration.png"
                alt="AI Automation Abstract Art"
                width={600}
                height={600}
                className="object-contain"
                priority
                data-ai-hint="abstract tech"
              />
            </div>
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground/80">AI AUTOMATION</h2>
            <p className="mt-8 text-lg text-muted-foreground max-w-xl mx-auto">
              Empowering businesses with cutting-edge AI solutions to automate workflows and drive growth.
            </p>
            <Button size="lg" asChild className="mt-10">
              <Link href="/dashboard">Discover More <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </Section>

          {/* Stats Section */}
          <Section>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
                <div className="stat-card">
                    <p className="text-5xl font-bold text-primary">96%</p>
                    <h3 className="text-lg font-semibold mt-2">Client Satisfaction</h3>
                    <p className="text-muted-foreground mt-1 text-sm">Achieved through dedicated support and impactful results.</p>
                </div>
                <div className="stat-card">
                    <p className="text-5xl font-bold text-primary">20%</p>
                    <h3 className="text-lg font-semibold mt-2">Efficiency Increase</h3>
                    <p className="text-muted-foreground mt-1 text-sm">Average increase in operational efficiency for our clients.</p>
                </div>
                <div className="stat-card">
                    <p className="text-5xl font-bold text-primary">51%</p>
                    <h3 className="text-lg font-semibold mt-2">Cost Reduction</h3>
                    <p className="text-muted-foreground mt-1 text-sm">Average reduction in operational costs after implementation.</p>
                </div>
                <div className="stat-card">
                    <p className="text-5xl font-bold text-primary">44%</p>
                    <h3 className="text-lg font-semibold mt-2">Growth Acceleration</h3>
                    <p className="text-muted-foreground mt-1 text-sm">Faster scaling and market entry for our partners.</p>
                </div>
            </div>
          </Section>

          {/* AI Driven Services Section */}
          <Section id="services" className="bg-muted/30 dark:bg-card/20 rounded-t-3xl">
            <Heading>AI-Driven Services</Heading>
            <SubHeading>We offer a suite of services designed to integrate seamlessly into your business operations.</SubHeading>
            <div className="mt-16 grid md:grid-cols-2 gap-12 items-center">
              <div>
                <Image src="https://placehold.co/600x500.png" alt="Person interacting with AI interface" width={600} height={500} className="rounded-2xl shadow-lg" data-ai-hint="futuristic interface"/>
              </div>
              <div className="space-y-6">
                {['Advanced AI Analytics', 'Custom Workflow Automation', 'Predictive Modeling', 'Natural Language Processing'].map((service) => (
                  <div key={service} className="p-4 rounded-lg hover:bg-background/80 dark:hover:bg-card transition-all">
                    <h3 className="text-xl font-semibold text-foreground">{service}</h3>
                    <p className="text-muted-foreground mt-1">Unlock deeper insights and automate complex tasks with our {service.toLowerCase()} solutions.</p>
                  </div>
                ))}
              </div>
            </div>
          </Section>
          
          {/* Empowering Businesses Section */}
          <Section>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-4">
                <h3 className="text-3xl font-bold">Empowering Businesses Through Innovation</h3>
                <p className="text-muted-foreground text-lg">At AutoNest, we're on a mission to drive business growth through intelligent automation and innovative AI solutions.</p>
                <ul className="space-y-2 pt-4">
                    {[
                        'Seamless integration with existing systems.',
                        'Scalable solutions that grow with your business.',
                        'Dedicated support from our team of AI experts.'
                    ].map(item => (
                        <li key={item} className="flex items-center gap-2">
                            <ChevronRight className="h-5 w-5 text-primary"/>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
              </div>
              <div>
                <Image src="https://placehold.co/600x400.png" alt="Abstract representation of innovation" width={600} height={400} className="rounded-2xl shadow-lg" data-ai-hint="innovation abstract"/>
              </div>
            </div>
          </Section>

          {/* Testimonials Section */}
          <Section id="testimonials" className="bg-muted/30 dark:bg-card/20">
            <Heading>What Our Clients Are Saying</Heading>
            <SubHeading>Real stories from businesses transformed by AutoNest.</SubHeading>
            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { name: 'Alex Johnson', title: 'CEO, Innovate Inc.', hint: 'man portrait', src: 'https://images.unsplash.com/photo-1624395213043-fa2e123b2656?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw2fHxtYW4lMjBwb3J0cmFpdHxlbnwwfHx8fDE3NTE2MjY0ODd8MA&ixlib=rb-4.1.0&q=80&w=1080' },
                { name: 'Samantha Lee', title: 'Marketing Director, Growth Co.', hint: 'woman portrait', src: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHx3b21hbiUyMHBvcnRyYWl0fGVufDB8fHx8fDE3NTE2OTgxNjJ8MA&ixlib=rb-4.1.0&q=80&w=1080' },
                { name: 'David Chen', title: 'CTO, Tech Solutions', hint: 'person portrait', src: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxwZXJzb24lMjBwb3J0cmFpdHxlbnwwfHx8fDE3NTE3MDY0NTJ8MA&ixlib=rb-4.1.0&q=80&w=1080' }
              ].map((testimonial) => (
                <div key={testimonial.name} className="bg-background dark:bg-card p-8 rounded-2xl shadow-lg transition-all testimonial-card">
                  <div className="flex items-center mb-4">
                    <Image src={testimonial.src} alt={testimonial.name} width={64} height={64} className="rounded-full object-cover h-16 w-16" data-ai-hint={testimonial.hint} />
                    <div className="ml-4">
                      <p className="font-semibold text-foreground">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.title}</p>
                    </div>
                  </div>
                  <Quote className="text-primary h-8 w-8 mb-2"/>
                  <p className="text-muted-foreground italic">"AutoNest revolutionized our workflow. We're more efficient and data-driven than ever before. A true game-changer for our team."</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Team Section */}
          <Section id="team">
              <Heading>Meet Our Creative Team</Heading>
              <SubHeading>The brilliant minds behind AutoNest's success.</SubHeading>
              <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                  {[
                      { name: 'Elena', role: 'Lead AI Strategist', hint: 'woman professional' },
                      { name: 'Marcus', role: 'Head of Engineering', hint: 'man professional' },
                      { name: 'John Doe', role: 'Product Manager', hint: 'person smiling' }
                  ].map(member => (
                      <div key={member.name} className="text-center group">
                          <div className="relative inline-block">
                              <Image src={`https://placehold.co/400x400.png`} alt={member.name} width={400} height={400} className="rounded-2xl shadow-lg transition-transform group-hover:scale-105" data-ai-hint={member.hint}/>
                          </div>
                          <h4 className="mt-4 text-xl font-semibold">{member.name}</h4>
                          <p className="text-primary">{member.role}</p>
                      </div>
                  ))}
              </div>
          </Section>
          
          {/* Contact Section */}
          <Section id="contact" className="bg-muted/30 dark:bg-card/20 rounded-b-3xl">
            <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 bg-background dark:bg-card p-8 md:p-12 rounded-2xl shadow-2xl">
                <div className="space-y-6">
                    <h3 className="text-3xl font-bold">Get In Touch</h3>
                    <p className="text-muted-foreground">Have a question or a project in mind? We'd love to hear from you. Fill out the form or use our contact details below.</p>
                    <div className="space-y-4">
                        <p className="flex items-center gap-3"><Mail className="h-5 w-5 text-primary"/> <span>support@autonest.site</span></p>
                        <p className="flex items-center gap-3"><Phone className="h-5 w-5 text-primary"/> <span>+1 (555) 123-4567</span></p>
                        <p className="flex items-center gap-3"><MapPin className="h-5 w-5 text-primary"/> <span>123 AI Avenue, Tech City</span></p>
                    </div>
                </div>
                <form className="space-y-4">
                    <div>
                        <label htmlFor="name" className="sr-only">Name</label>
                        <Input id="name" placeholder="Your Name" required/>
                    </div>
                    <div>
                        <label htmlFor="email" className="sr-only">Email</label>
                        <Input id="email" type="email" placeholder="Your Email" required/>
                    </div>
                    <div>
                        <label htmlFor="message" className="sr-only">Message</label>
                        <Textarea id="message" placeholder="Your Message" rows={4} required/>
                    </div>
                    <Button type="submit" className="w-full">Send Message</Button>
                </form>
            </div>
          </Section>
        </main>
        
        {/* Footer */}
        <footer className="bg-transparent">
          <div className="max-w-7xl mx-auto px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-1 space-y-4">
                <h3 className="text-xl font-bold text-foreground">AutoNest</h3>
                <p className="text-sm text-muted-foreground">AI-powered workflow automation to elevate your productivity.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Product</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link href="#services" className="text-muted-foreground hover:text-primary">Features</Link></li>
                  <li><Link href="/signup" className="text-muted-foreground hover:text-primary">Pricing</Link></li>
                  <li><Link href="#" className="text-muted-foreground hover:text-primary">API</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Company</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link href="#" className="text-muted-foreground hover:text-primary">About Us</Link></li>
                  <li><Link href="/blog/building-autonest" className="text-muted-foreground hover:text-primary">Blog</Link></li>
                   <li><Link href="/privacy-policy" className="text-muted-foreground hover:text-primary">Privacy Policy</Link></li>
                  <li><Link href="/user-agreement" className="text-muted-foreground hover:text-primary">Terms of Service</Link></li>
                </ul>
              </div>
               <div>
                <h4 className="font-semibold mb-3">Follow Us</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="text-muted-foreground hover:text-primary">Twitter / X</a></li>
                  <li><a href="#" className="text-muted-foreground hover:text-primary">LinkedIn</a></li>
                  <li><a href="#" className="text-muted-foreground hover:text-primary">Github</a></li>
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
