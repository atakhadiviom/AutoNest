
"use client";

import type { ChangeEvent} from "react";
import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Keep for potential future use
import { Label } from "@/components/ui/label"; // Keep for potential future use
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CreditCard, DollarSign, AlertTriangle, ExternalLink } from "lucide-react"; // RefreshCw removed
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { FullPageLoader } from "@/components/ui/loader"; // Spinner removed as it was PayPal specific
import { useToast } from "@/hooks/use-toast";

const CREDITS_PER_DOLLAR = 100;

export default function BillingPage() {
  const { user, loading: authLoading, addCredits } = useAuth(); // Removed creditsToPurchase logic here
  const { toast } = useToast();

  const [simulatedCreditsToAdd, setSimulatedCreditsToAdd] = useState<number>(500); // e.g., 500 credits = $5.00

  useEffect(() => {
    console.log("[BillingPage] PayPal integration has been removed.");
  }, []);

  const handleSimulatedCreditAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setSimulatedCreditsToAdd(isNaN(value) || value < 1 ? 1 : value);
  };

  const handleSimulateAddCredits = async () => {
    if (!user) {
      toast({ title: "Error", description: "Please log in to add credits.", variant: "destructive" });
      return;
    }
    if (simulatedCreditsToAdd <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a positive number of credits.", variant: "destructive" });
      return;
    }
    try {
      await addCredits(simulatedCreditsToAdd);
      // Toast for success is handled within addCredits in AuthContext
      setSimulatedCreditsToAdd(100); // Reset after adding
    } catch (error: any) {
      toast({
        title: "Credit Addition Failed",
        description: error.message || "Could not simulate adding credits.",
        variant: "destructive",
      });
    }
  };

  if (authLoading) {
    return <FullPageLoader />;
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

  const displayedDollarValue = (user.credits / CREDITS_PER_DOLLAR).toFixed(2);
  const simulatedDollarAmount = (simulatedCreditsToAdd / CREDITS_PER_DOLLAR).toFixed(2);

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
              <CreditCard className="mr-3 h-8 w-8 text-primary" />
              Billing & Credits
            </h1>
            <p className="text-muted-foreground">
              Manage your credits. ({CREDITS_PER_DOLLAR} Credits = $1.00 USD)
            </p>
          </div>
          <Card className="p-4 bg-muted/30 shadow-sm">
            <div className="flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-primary" />
                <div>
                    <p className="text-xs text-muted-foreground">Current Balance</p>
                    <p className="font-semibold text-2xl text-primary">{displayedDollarValue}</p>
                </div>
            </div>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Add Credits (Simulation)</CardTitle>
            <CardDescription>
              Payment system integration is currently unavailable. You can simulate adding credits for testing purposes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="grid sm:grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="credits-amount" className="text-base">Credits to Add (Simulated)</Label>
                <Input
                  id="credits-amount"
                  type="number"
                  value={simulatedCreditsToAdd}
                  onChange={handleSimulatedCreditAmountChange}
                  min="1"
                  className="text-lg p-3"
                />
              </div>
              <div className="text-right sm:text-left">
                <p className="text-sm text-muted-foreground">Equivalent Cost (USD)</p>
                <p className="text-2xl font-semibold text-foreground">
                  ${simulatedDollarAmount}
                </p>
              </div>
            </div>
            <Button onClick={handleSimulateAddCredits} className="w-full sm:w-auto">
              Simulate Adding {simulatedCreditsToAdd} Credits
            </Button>
            <Alert variant="default">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Payment System Status</AlertTitle>
                <AlertDescription>
                The live payment system (PayPal) has been removed. Credit addition is currently simulated.
                </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
                For actual purchases, a payment provider would be integrated here.
            </p>
          </CardFooter>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Payment Methods</CardTitle>
            <CardDescription>Your saved payment options (placeholder).</CardDescription>
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
               Add New Payment Method (Soon)
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Payment History</CardTitle>
            <CardDescription>Your past transactions and invoices (placeholder).</CardDescription>
          </CardHeader>
          <CardContent>
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
