
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Hexagon, Zap, Brain, DollarSign, CheckCircle, ArrowRight, TrendingUp, Edit3, ShieldCheck, BookOpen, Search, Bot, Coins, LayoutDashboard, Lock, Menu as MenuIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const benefits = [
    {
      icon: <Zap className="h-10 w-10 text-primary mb-4" />,
      title: "Boost Efficiency",
      description: "Transform tedious manual tasks into automated workflows, saving you time and reducing errors with AI precision.",
    },
    {
      icon: <Brain className="h-10 w-10 text-primary mb-4" />,
      title: "AI-Powered Insights",
      description: "Leverage generative AI for keyword research, content creation, and data-driven decision making to stay ahead.",
    },
    {
      icon: <TrendingUp className="h-10 w-10 text-primary mb-4" />,
      title: "Scale Your Operations",
      description: "Automate repetitive processes and focus on strategic growth, allowing your business to scale effectively.",
    },
     {
      icon: <DollarSign className="h-10 w-10 text-primary mb-4" />,
      title: "Pay-As-You-Go",
      description: "Flexible credit-based system ensures you only pay for the resources you use, making powerful automation accessible.",
    },
  ];

  const featuresList = [
    { icon: <Bot className="h-8 w-8 text-primary mb-3" />, title: "AI Workflow Generation", description: "Automate complex processes with simple natural language commands using our AI builder." },
    { icon: <Edit3 className="h-8 w-8 text-primary mb-3" />, title: "Content Creation Tools", description: "Generate high-quality content in seconds with our advanced AI writing assistants." },
    { icon: <Search className="h-8 w-8 text-primary mb-3" />, title: "Keyword Research & SEO", description: "Discover valuable keywords and optimize your content with our SEO tools." },
    { icon: <Coins className="h-8 w-8 text-primary mb-3" />, title: "Credit-Based Usage", description: "Pay only for what you use with our flexible credit system." },
    { icon: <LayoutDashboard className="h-8 w-8 text-primary mb-3" />, title: "Admin Dashboard", description: "Track usage, manage users, and monitor workflows all in one place." },
    { icon: <Lock className="h-8 w-8 text-primary mb-3" />, title: "Secure Payments", description: "Integrated PayPal for credit purchases (PCI-compliant via PayPal)." },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm sticky top-0 z-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
                <div className="flex-shrink-0 flex items-center">
                    <Link href="/landing" className="flex items-center space-x-2 text-2xl font-bold text-primary">
                        <Hexagon className="h-7 w-7" />
                        <span>AutoNest</span>
                    </Link>
                </div>
                <div className="hidden md:block">
                    <div className="ml-4 flex items-center space-x-4">
                        <Button variant="ghost" asChild>
                            <Link href="/login">Login</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/signup">Sign Up Free</Link>
                        </Button>
                    </div>
                </div>
                <div className="md:hidden">
                    <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
                        <MenuIcon className="h-6 w-6" />
                    </Button>
                </div>
            </div>
        </div>
        {/* Mobile Menu */}
        {mobileMenuOpen && (
            <div className="md:hidden absolute top-16 left-0 right-0 bg-background shadow-lg z-40 border-b">
                <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                    <Button variant="ghost" asChild className="w-full justify-start">
                        <Link href="/login">Login</Link>
                    </Button>
                    <Button asChild className="w-full">
                        <Link href="/signup">Sign Up Free</Link>
                    </Button>
                </div>
            </div>
        )}
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary via-purple-600 to-pink-500 text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="md:flex md:items-center md:justify-between">
                <div className="md:w-1/2 mb-12 md:mb-0">
                    <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">Automate Your Workflows, <br/>Elevate Your Productivity</h1>
                    <p className="text-xl opacity-90 mb-8">Harness the power of AI to streamline manual processes, generate content, and gain valuable insights, all in one intuitive platform. Welcome to AutoNest.</p>
                    <Button size="lg" variant="secondary" asChild className="shadow-lg hover:bg-background hover:text-foreground transition-colors">
                        <Link href="/signup">
                            Get Started Free & Claim 500 Credits <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                    </Button>
                </div>
                <div className="md:w-1/2">
                    <Image 
                         src="https://images.unsplash.com/photo-1434725039720-aaAD693229e0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxiYWxhbmNlfGVufDB8fHx8MTc0ODM5ODQ1MXww&ixlib=rb-4.1.0&q=80&w=1080"
                         alt="AutoNest Workflow Automation - Balanced Rocks" 
                         width={600}
                         height={400}
                         className="rounded-lg shadow-xl w-full h-auto object-cover"
                         data-ai-hint="balanced zen rocks"
                         priority
                    />
                </div>
            </div>
        </div>
      </div>

      {/* Why Choose AutoNest */}
      <section className="bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-foreground mb-4">Why Choose AutoNest?</h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Unlock unparalleled efficiency and innovation.</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {benefits.map((benefit, index) => (
                    <Card key={index} className="text-center p-8 rounded-xl shadow-md transition-all hover:shadow-lg hover:-translate-y-1 bg-card">
                        <div className="flex justify-center items-center text-primary mb-4">
                            {benefit.icon}
                        </div>
                        <h3 className="text-xl font-semibold text-card-foreground mb-3">{benefit.title}</h3>
                        <p className="text-muted-foreground">{benefit.description}</p>
                    </Card>
                ))}
            </div>
        </div>
      </section>

      {/* Streamline Success Section */}
      <section className="bg-muted/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="md:flex md:items-center md:space-x-12">
                <div className="md:w-1/2 mb-12 md:mb-0">
                    <h2 className="text-3xl font-bold text-foreground mb-6">Streamline Your Success</h2>
                    <p className="text-xl text-muted-foreground mb-8">AutoNest provides intuitive tools to automate complex tasks. From AI-driven content generation to efficient workflow management, empower your team to focus on what matters most.</p>
                    
                    <ul className="space-y-4 mb-8">
                        <li className="flex items-start">
                            <CheckCircle className="text-primary mt-1 mr-3 flex-shrink-0 h-5 w-5" />
                            <span className="text-muted-foreground">AI Workflow Generation: Describe your process, let AI build it.</span>
                        </li>
                        <li className="flex items-start">
                            <CheckCircle className="text-primary mt-1 mr-3 flex-shrink-0 h-5 w-5" />
                            <span className="text-muted-foreground">Content Creation Tools: Generate blog posts and more.</span>
                        </li>
                        <li className="flex items-start">
                            <CheckCircle className="text-primary mt-1 mr-3 flex-shrink-0 h-5 w-5" />
                            <span className="text-muted-foreground">Keyword Research & SEO: Uncover valuable keywords and SEO insights.</span>
                        </li>
                    </ul>
                    
                    <Button asChild>
                        <Link href="/signup">
                            Discover More Features
                        </Link>
                    </Button>
                </div>
                <div className="md:w-1/2">
                    <div className="bg-card p-3 sm:p-6 rounded-xl shadow-lg">
                         <Image 
                              src="https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80"
                              alt="Dashboard preview - team working" 
                              width={600}
                              height={400}
                              className="rounded-lg w-full h-auto object-cover"
                              data-ai-hint="team collaboration"
                         />
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-foreground mb-4">Features At a Glance</h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Everything you need to automate your workflows</p>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuresList.map((feature, index) => (
                    <div key={index} className="bg-card p-6 rounded-lg shadow-md transition-all hover:shadow-lg">
                        <div className="mb-3">
                            {feature.icon}
                        </div>
                        <h3 className="text-xl font-semibold text-card-foreground mb-2">{feature.title}</h3>
                        <p className="text-muted-foreground">{feature.description}</p>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* Blog Section */}
      <section className="bg-muted/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-foreground mb-4">From Our Blog</h2>
                <p className="text-xl text-muted-foreground">Insights and updates from the AutoNest team.</p>
            </div>
            
            <div className="max-w-3xl mx-auto">
                <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow bg-card">
                    <Image 
                         src="https://images.unsplash.com/photo-1547658719-da2b51169166?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=764&q=80"
                         alt="Building AutoNest - Desk with computer" 
                         width={764}
                         height={400}
                         className="w-full h-64 object-cover"
                         data-ai-hint="desk computer"
                    />
                    <CardHeader className="p-6 sm:p-8">
                        <CardTitle className="text-2xl font-bold text-card-foreground mb-2">Building and Launching AutoNest: Our Journey</CardTitle>
                        <CardDescription className="text-muted-foreground mb-4">A look behind the scenes at how AutoNest was developed, from initial idea to deployed application. Dive into the conceptualization, development sprints, key features implementation like AI tools, billing, admin dashboards, and the lessons we learned along the way.</CardDescription>
                        <Button asChild variant="link" className="px-0 text-primary hover:text-primary/80">
                            <Link href="/blog/building-autonest" className="flex items-center">
                                Go to the blog post page <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardHeader>
                </Card>
            </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-primary via-purple-600 to-pink-500 text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Work?</h2>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">Join AutoNest today and experience the future of automation. Get started with 500 free credits and see the difference AI can make.</p>
            <Button size="lg" variant="secondary" asChild className="shadow-lg hover:bg-background hover:text-foreground transition-colors">
                <Link href="/signup">
                    Sign Up Now & Get Your Free Credits! <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
            </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card text-card-foreground border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                <div>
                    <div className="flex items-center space-x-2 mb-4">
                        <Hexagon className="h-7 w-7 text-primary" />
                        <span className="text-xl font-bold text-foreground">AutoNest</span>
                    </div>
                    <p className="text-muted-foreground text-sm">Harness the power of AI to streamline manual processes and gain valuable insights.</p>
                    {/* Social media icons can be added here if desired */}
                </div>
                <div>
                    <h4 className="text-lg font-semibold text-foreground mb-4">Product</h4>
                    <ul className="space-y-2 text-sm">
                        <li><Link href="/#features" className="text-muted-foreground hover:text-primary transition-colors">Features</Link></li>
                        <li><Link href="/billing" className="text-muted-foreground hover:text-primary transition-colors">Pricing</Link></li>
                        {/* <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">API</Link></li> */}
                        {/* <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">Integrations</Link></li> */}
                    </ul>
                </div>
                <div>
                    <h4 className="text-lg font-semibold text-foreground mb-4">Resources</h4>
                    <ul className="space-y-2 text-sm">
                        {/* <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">Documentation</Link></li> */}
                        <li><Link href="/blog/building-autonest" className="text-muted-foreground hover:text-primary transition-colors">Blog</Link></li>
                        {/* <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">Community</Link></li> */}
                        {/* <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">Support</Link></li> */}
                    </ul>
                </div>
                <div>
                    <h4 className="text-lg font-semibold text-foreground mb-4">Company</h4>
                    <ul className="space-y-2 text-sm">
                        {/* <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">About</Link></li> */}
                        {/* <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">Careers</Link></li> */}
                        <li><Link href="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link></li>
                        <li><Link href="/user-agreement" className="text-muted-foreground hover:text-primary transition-colors">User Agreement</Link></li>
                    </ul>
                </div>
            </div>
            <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} AutoNest. All rights reserved.</p>
            </div>
        </div>
      </footer>
    </div>
  );
}

    