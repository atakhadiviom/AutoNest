
"use client";

import type { ChangeEvent} from "react";
import { useState, useEffect } from "react";
// PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer, type PayPalButtonsComponentProps removed
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CreditCard, DollarSign, AlertTriangle, Info } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { FullPageLoader } from "@/components/ui/loader";
import { useToast } from "@/hooks/use-toast";

const CREDITS_PER_DOLLAR = 100;

// CLOUD_FUNCTION_BASE_URL is still relevant if direct calls to functions are made
const CLOUD_FUNCTION_BASE_URL = process.env.NEXT_PUBLIC_PAYPAL_FUNCTIONS_BASE_URL;

export default function BillingPage() {
  const { user, loading: authLoading, addCredits } = useAuth();
  const { toast } = useToast();

  const [creditsToPurchase, setCreditsToPurchase] = useState<number>(100);
  const [paymentError, setPaymentError] = useState<string | null>(null); // Kept for general errors or future payment methods
  const [isProcessing, setIsProcessing] = useState(false); // Kept for simulated add credits

  useEffect(() => {
    console.log("[BillingPage] CLOUD_FUNCTION_BASE_URL (for server-side PayPal):", CLOUD_FUNCTION_BASE_URL);
    if (!CLOUD_FUNCTION_BASE_URL) {
        // This check might still be relevant if you plan to call the functions directly
        // For now, we'll keep it to indicate server-side payment infra might not be configured
        console.warn("Payment functions base URL is not configured. Server-side payments will fail.");
    }
  }, []);

  const handleCreditAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setCreditsToPurchase(isNaN(value) || value < 1 ? 1 : value);
    setPaymentError(null);
  };

  // Simplified "Simulate Adding Credits" button logic
  const handleSimulateAddCredits = async () => {
    if (!user) {
      toast({ title: "Authentication Error", description: "Please log in to add credits.", variant: "destructive" });
      return;
    }
    if (creditsToPurchase <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a positive number of credits.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    setPaymentError(null);
    try {
      // In a real scenario with a non-SDK flow, this might call a Cloud Function that handles credit addition after payment
      // For now, it just updates Firestore via AuthContext
      await addCredits(creditsToPurchase, true); // true to update Firestore
      toast({
        title: "Credits Added (Simulated)",
        description: `${creditsToPurchase} credits have been added to your account.`,
      });
      setCreditsToPurchase(100); // Reset input
    } catch (error: any) {
      const errorMessage = error.message || "An unexpected error occurred while adding credits.";
      setPaymentError(errorMessage);
      toast({
        title: "Failed to Add Credits",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
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

  const displayedUserCredits = (user.credits / CREDITS_PER_DOLLAR).toFixed(2);
  const dollarAmountToPay = (creditsToPurchase / CREDITS_PER_DOLLAR).toFixed(2);

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
                    <p className="font-semibold text-2xl text-primary">{displayedUserCredits}</p>
                </div>
            </div>
          </Card>
        </div>

        {!CLOUD_FUNCTION_BASE_URL && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Server Configuration Error</AlertTitle>
                <AlertDescription>
                The payment system is not fully configured (missing server URL for PayPal Cloud Functions). Please contact support.
                </AlertDescription>
            </Alert>
        )}

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Purchase Credits</CardTitle>
            <CardDescription>
              Select the amount of credits you wish to purchase.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="credits-amount" className="text-base">Credits to Purchase</Label>
                <Input
                  id="credits-amount"
                  type="number"
                  value={creditsToPurchase}
                  onChange={handleCreditAmountChange}
                  min="1"
                  className="text-lg p-3"
                  disabled={isProcessing}
                />
              </div>
              <div className="text-right sm:text-left">
                <p className="text-sm text-muted-foreground">Total Cost (USD)</p>
                <p className="text-2xl font-semibold text-foreground">
                  ${dollarAmountToPay}
                </p>
              </div>
            </div>
            
            {paymentError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{paymentError}</AlertDescription>
              </Alert>
            )}
            
            {/* Placeholder for future payment buttons or methods */}
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertTitle>Payment System Update</AlertTitle>
              <AlertDescription>
                Our direct PayPal button integration is currently being updated. Please use the simulated credit addition for now if needed for testing.
                Real payments will be processed via our secure server-side integration.
              </AlertDescription>
            </Alert>

            {/* Simulate Adding Credits Button */}
            <Button
              onClick={handleSimulateAddCredits}
              disabled={isProcessing || creditsToPurchase <= 0}
              className="w-full sm:w-auto mt-4"
              variant="secondary"
            >
              {isProcessing ? "Processing..." : `Simulate Adding ${creditsToPurchase} Credits ($${dollarAmountToPay})`}
            </Button>


          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
                Payments will be processed securely.
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
