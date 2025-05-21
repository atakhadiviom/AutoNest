
"use client";

import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, DollarSign, PlusCircle } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context"; // Import useAuth
import { Spinner } from "@/components/ui/loader"; // Import Spinner

export default function BillingPage() {
  const { user, loading, addCredits } = useAuth(); // Get user, loading, and addCredits

  const handleAddCredits = () => {
    // In a real app, this would trigger a payment flow.
    // For simulation, we'll just add a fixed amount.
    addCredits(50); 
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <Spinner size={36} /> Loading billing information...
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="text-center py-10">
          <p>Please log in to view billing information.</p>
        </div>
      </AppLayout>
    );
  }
  
  // Format credits for display, ensuring it's a number
  const currentCredits = typeof user.credits === 'number' ? user.credits.toFixed(2) : '0.00';


  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
              <CreditCard className="mr-3 h-8 w-8 text-primary" />
              Billing & Payments
            </h1>
            <p className="text-muted-foreground">
              Manage your subscription, view payment history, and update your details.
            </p>
          </div>
          <Button size="lg" onClick={handleAddCredits}>
            <PlusCircle className="mr-2 h-5 w-5" /> Add 50 Credits (Simulated)
          </Button>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Current Plan & Credits</CardTitle>
            <CardDescription>Your active subscription details and credit balance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 border rounded-lg bg-muted/30">
              <div>
                <h3 className="font-semibold text-lg text-foreground">Pro Plan (Example)</h3>
                <p className="text-muted-foreground">Billed monthly at $49.00 (Example)</p>
              </div>
              <Button variant="outline" disabled>Change Plan (Soon)</Button>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">Next billing date: October 26, 2024 (Example)</p>
              <p className="font-semibold text-xl text-primary">${currentCredits} <span className="text-sm text-muted-foreground">Remaining Credits</span></p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Payment Methods</CardTitle>
            <CardDescription>Your saved payment options.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center">
                <Image src="https://placehold.co/40x25.png" alt="Visa" width={40} height={25} className="mr-3 rounded" data-ai-hint="credit card"/>
                <div>
                  <p className="font-medium text-foreground">Visa ending in 1234</p>
                  <p className="text-xs text-muted-foreground">Expires 12/2025</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" disabled>Edit (Soon)</Button>
            </div>
            <Button variant="outline" disabled>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Payment Method (Soon)
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Payment History</CardTitle>
            <CardDescription>Your past transactions and invoices.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Placeholder for payment history table */}
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No payment history yet.</p>
              <p className="text-sm text-muted-foreground">Your invoices will appear here once you make a payment.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
