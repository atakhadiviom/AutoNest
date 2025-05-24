
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Hexagon, Zap, Brain, DollarSign, CheckCircle, ArrowRight, TrendingUp, Edit3, ShieldCheck, BookOpen } from "lucide-react";
import Image from "next/image";

export default function LandingPage() {
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

  const features = [
    "AI Workflow Generation: Describe your process, let AI build it.",
    "Content Creation Tools: Generate blog posts and more with our Blog Factory.",
    "Keyword Research & SEO: Uncover valuable keywords and SEO insights.",
    "Credit-Based Usage: Transparent and flexible pricing.",
    "Admin Dashboard: Manage users and application settings (for admins).",
    "Secure Payments: Integrated PayPal for credit purchases.",
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-muted/30 text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
          <Link href="/landing" className="flex items-center space-x-2">
            <Hexagon className="h-7 w-7 text-primary" strokeWidth={1.5} />
            <span className="font-bold text-2xl text-foreground">
              AutoNest
            </span>
          </Link>
          <nav className="space-x-2 sm:space-x-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Sign Up Free</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-20 md:py-32 text-center bg-background">
          <div className="container">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
              Automate Your Workflows,
              <br />
              <span className="text-primary">Elevate Your Productivity</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
              Harness the power of AI to streamline manual processes, generate
              content, and gain valuable insights, all in one intuitive platform.
              Welcome to AutoNest.
            </p>
            <Button size="lg" asChild className="shadow-lg hover:shadow-primary/30 transition-shadow">
              <Link href="/signup">
                Get Started Free & Claim 500 Credits
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 md:py-24 bg-muted/40">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Why Choose AutoNest?
              </h2>
              <p className="text-lg text-muted-foreground mt-2">
                Unlock unparalleled efficiency and innovation.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {benefits.map((benefit, index) => (
                <Card key={index} className="text-center p-6 shadow-md hover:shadow-lg transition-shadow bg-card">
                  <div className="flex justify-center items-center">
                    {benefit.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-card-foreground mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground text-sm">{benefit.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
        
        {/* How it works / Visual Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="order-2 md:order-1">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Streamline Your Success</h2>
                <p className="text-muted-foreground mb-6 text-lg">
                  AutoNest provides intuitive tools to automate complex tasks. From AI-driven content generation to efficient workflow management, empower your team to focus on what matters most.
                </p>
                <ul className="space-y-3 text-muted-foreground">
                  {features.slice(0,3).map((feature, index) => (
                     <li key={index} className="flex items-center">
                       <CheckCircle className="h-5 w-5 text-primary mr-3 flex-shrink-0" />
                       <span>{feature}</span>
                     </li>
                  ))}
                </ul>
                <Button asChild className="mt-8 shadow-md">
                  <Link href="/signup">Discover More Features</Link>
                </Button>
              </div>
              <div className="order-1 md:order-2">
                <Image
                  src="https://placehold.co/600x450.png"
                  alt="AutoNest Workflow Illustration"
                  width={600}
                  height={450}
                  className="rounded-lg shadow-xl mx-auto"
                  data-ai-hint="workflow automation"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features At a Glance */}
         <section className="py-16 md:py-24 bg-muted/40">
          <div className="container text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Features At a Glance
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {features.map((feature, index) => (
                <div key={index} className="bg-card p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <p className="font-medium text-card-foreground text-sm sm:text-base">{feature.split(':')[0]}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Blog Post Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                From Our Blog
              </h2>
              <p className="text-lg text-muted-foreground mt-2">
                Insights and updates from the AutoNest team.
              </p>
            </div>
            <div className="flex justify-center">
              <Card className="max-w-2xl w-full shadow-lg hover:shadow-xl transition-shadow bg-card">
                <CardHeader>
                  <div className="flex items-center mb-2">
                    <BookOpen className="h-7 w-7 text-primary mr-3" />
                    <CardTitle className="text-2xl font-semibold text-card-foreground">
                      Building and Launching AutoNest: Our Journey
                    </CardTitle>
                  </div>
                  <CardDescription className="text-muted-foreground">
                    A look behind the scenes at how AutoNest was developed, from initial idea to deployed application.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm mb-4">
                    Dive into the conceptualization, development sprints, key features implementation like AI tools, billing, admin dashboards, and the lessons we learned along the way.
                  </p>
                  <Button asChild>
                    <Link href="/blog/building-autonest">
                      Go to the blog post page <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 md:py-32 text-center bg-primary text-primary-foreground">
          <div className="container">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Transform Your Work?
            </h2>
            <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto mb-10">
              Join AutoNest today and experience the future of automation. Get started with 500 free credits and see the difference AI can make.
            </p>
            <Button
              size="lg"
              variant="secondary"
              asChild
              className="shadow-xl hover:bg-background hover:text-foreground transition-colors"
            >
              <Link href="/signup">
                Sign Up Now & Get Your Free Credits!
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-border/40 bg-background">
        <div className="container text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} AutoNest. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <Link href="/privacy-policy" className="hover:text-primary">Privacy Policy</Link>
            <Link href="/user-agreement" className="hover:text-primary">User Agreement</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

