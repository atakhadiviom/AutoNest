
"use client";

// IMPORTANT: To use this component, you need to install the @paypal/react-paypal-js library:
// npm install @paypal/react-paypal-js
// or
// yarn add @paypal/react-paypal-js

import type { ChangeEvent} from "react";
import { useState, useEffect, useCallback } from "react";
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer, type PayPalButtonsComponentProps } from "@paypal/react-paypal-js";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CreditCard, DollarSign, AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { Spinner, FullPageLoader } from "@/components/ui/loader";
import { useToast } from "@/hooks/use-toast";

const PAYPAL_CLIENT_ID = "AXphOTlKv9G2m2wdB1UUy5yLd9ld4NRW1bh40Zxq7h-O6Si1TehB5gYYmRtM5i2Y6MjzxZdwpQpG1vxX";
const CREDITS_PER_DOLLAR = 100; 

function PayPalPaymentButtons({ 
  creditsToPurchase, 
  onPaymentSuccess, 
  onPaymentError,
  onPaymentCancel,
  setPaymentProcessingParent 
}: { 
  creditsToPurchase: number, 
  onPaymentSuccess: (details: any) => void,
  onPaymentError: (err: any) => void,
  onPaymentCancel: () => void,
  setPaymentProcessingParent: (isProcessing: boolean) => void
}) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();
  const { toast } = useToast();
  const dollarAmount = (creditsToPurchase / CREDITS_PER_DOLLAR).toFixed(2);

  useEffect(() => {
    if (isRejected) {
      onPaymentError(new Error("PayPal SDK failed to load. Check your Client ID and network connection."));
    }
  }, [isRejected, onPaymentError]);

  const createOrder: PayPalButtonsComponentProps['createOrder'] = (_data, actions) => {
    console.log("[PayPalButtons] createOrder called. Amount:", dollarAmount);
    if (creditsToPurchase <= 0) {
      toast({
          title: "Invalid Amount",
          description: "Please enter a valid amount of credits to purchase.",
          variant: "destructive",
      });
      return Promise.reject(new Error("Invalid credit amount for PayPal order."));
    }
    return actions.order.create({
      purchase_units: [{
        amount: {
          value: dollarAmount,
          currency_code: "USD"
        },
        description: `${creditsToPurchase} AutoNest Credits`
      }]
    }).catch(err => {
      console.error("[PayPalButtons] Error in actions.order.create():", err);
      throw err; // Re-throw to be caught by onError or higher level
    });
  };

  const onApprove: PayPalButtonsComponentProps['onApprove'] = async (_data, actions) => {
    console.log("[PayPalButtons] onApprove called. Data from PayPal:", _data);
    setPaymentProcessingParent(true);
    onPaymentError(null); // Clear previous errors
    try {
      if (!actions.order) {
        throw new Error("PayPal actions.order is not available in onApprove");
      }
      const orderDetails = await actions.order.capture();
      console.log("PayPal Order Captured (This is the SUCCESS RESPONSE from PayPal after payment):", JSON.stringify(orderDetails, null, 2));
      onPaymentSuccess(orderDetails);
    } catch (err: any) {
      console.error("[PayPalButtons] Error during actions.order.capture() (This is an ERROR RESPONSE/STATE from PayPal after approval attempt):", err);
      onPaymentError(err);
    } finally {
      setPaymentProcessingParent(false);
    }
  };
  
  const onError: PayPalButtonsComponentProps['onError'] = (err) => {
    const errorMessage = typeof err === 'string' ? err : (err as Error)?.message || JSON.stringify(err);
    const lowerCaseErrorMessage = errorMessage.toLowerCase();

    if (lowerCaseErrorMessage.includes("window closed") || lowerCaseErrorMessage.includes("popup closed")) {
        // It's a "window closed" error, which we treat as a cancellation.
        // Log it for debugging but not as a severe application error that needs console.error.
        console.log("[PayPalButtons] onError (interpreted as cancellation): PayPal window was closed.", err);
        onPaymentCancel(); // Call the parent's cancellation handler
    } else {
        // It's some other PayPal button error. Log it as an error and pass it to the parent's error handler.
        console.error("[PayPalButtons] onError (unexpected PayPal button error):", err);
        onPaymentError(err); // Call the parent's generic error handler
    }
    setPaymentProcessingParent(false);
  };

  const onCancel: PayPalButtonsComponentProps['onCancel'] = () => {
    console.log("[PayPal Buttons] onCancel triggered (user closed window or cancelled payment).");
    onPaymentCancel();
    setPaymentProcessingParent(false);
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center p-4">
        <Spinner size={32} />
        <p className="ml-2">Loading PayPal buttons...</p>
      </div>
    );
  }
  
  if (isRejected) {
    // Error already handled by useEffect setting paymentError
    return null;
  }

  if (creditsToPurchase <= 0) {
    return <p className="text-sm text-destructive text-center py-2">Enter a valid amount of credits to purchase.</p>;
  }

  return (
    <PayPalButtons
      key={dollarAmount} // Force re-render if amount changes
      style={{ 
        shape: "rect",
        layout: "vertical",
        color: "gold", 
        label: "paypal",
      }}
      createOrder={createOrder}
      onApprove={onApprove}
      onError={onError}
      onCancel={onCancel}
      disabled={creditsToPurchase <=0}
    />
  );
}


export default function BillingPage() {
  const { user, loading: authLoading, addCredits } = useAuth();
  const { toast } = useToast();

  const [creditsToPurchase, setCreditsToPurchase] = useState<number>(100);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const dollarAmount = creditsToPurchase / CREDITS_PER_DOLLAR;

  const handleCreditAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setCreditsToPurchase(isNaN(value) || value < 1 ? 1 : value);
  };

  const handlePaymentSuccess = (details: any) => {
    addCredits(creditsToPurchase);
    toast({
      title: "Purchase Successful!",
      description: `${creditsToPurchase} credits have been added. Transaction ID: ${details.id}`,
    });
    setCreditsToPurchase(100); // Reset to default
  };

  const handlePaymentError = (err: any | null) => {
    if (err === null) { // Explicitly clear error
        setPaymentError(null);
        return;
    }

    let message = "An unknown error occurred during payment.";
    if (typeof err === 'string') {
        message = err;
    } else if (err instanceof Error) {
        message = err.message;
    } else if (err && typeof err.toString === 'function') {
        message = err.toString();
    }
    
    const lowerCaseMessage = message.toLowerCase();

    // Note: "window closed" specific handling is now primarily done within PayPalPaymentButtons' onError and onCancel.
    // This handler will deal with errors propagated from there, or other payment-related errors.
    if (lowerCaseMessage.includes("can not open popup window - blocked") || lowerCaseMessage.includes("popup was blocked")) {
      setPaymentError("PayPal popup window was blocked. Please check your browser settings and disable popup blockers for this site, then try again.");
      toast({
        title: "Popup Blocked",
        description: "PayPal popup window was blocked. Please disable popup blockers and try again.",
        variant: "destructive",
      });
    } else {
      // For generic errors or errors passed up from PayPalPaymentButtons that weren't "window closed".
      setPaymentError(`Payment Error: ${message}`);
      toast({
        title: "Payment Failed",
        description: `Could not process your payment. ${message}`,
        variant: "destructive",
      });
    }
  };

  const handlePaymentCancel = () => {
    // This is called when PayPalButtons' onCancel is triggered, or when its onError detects a "window closed" scenario.
    setPaymentError("Payment process was cancelled or the window was closed before completion.");
    toast({
        title: "Payment Cancelled",
        description: "The payment window was closed before completion or the process was cancelled.",
        variant: "default",
    });
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

  const displayedDollarValue = typeof user.credits === 'number' ? (user.credits / CREDITS_PER_DOLLAR).toFixed(2) : '0.00';
  
  const scriptProviderOptions = {
    "client-id": PAYPAL_CLIENT_ID,
    currency: "USD",
    "enable-funding": "venmo",
    "disable-funding": "", 
    "buyer-country": "US", 
    components: "buttons", 
    "data-page-type": "product-details", 
    "data-sdk-integration-source": "developer-studio", 
  };

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
              Manage your credits and view payment history.
            </p>
          </div>
          <Card className="p-4 bg-muted/30 shadow-sm">
            <div className="flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-primary" />
                <div>
                    <p className="text-xs text-muted-foreground">Current Balance</p>
                    <p className="font-semibold text-2xl text-primary">${displayedDollarValue}</p>
                </div>
            </div>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Add Credits via PayPal</CardTitle>
            <CardDescription>
              Securely add credits to your account using PayPal Sandbox. ({CREDITS_PER_DOLLAR} Credits = $1.00 USD)
            </CardDescription>
             {(!PAYPAL_CLIENT_ID || PAYPAL_CLIENT_ID.startsWith("YOUR_SANDBOX_CLIENT_ID") ) && (
                <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>PayPal Not Configured</AlertTitle>
                    <AlertDescription>
                    The PayPal Client ID is a placeholder or missing. This section will not function until a valid Sandbox Client ID is provided.
                    </AlertDescription>
                </Alert>
            )}
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
                  disabled={paymentProcessing || !PAYPAL_CLIENT_ID || PAYPAL_CLIENT_ID.startsWith("YOUR_SANDBOX_CLIENT_ID")}
                />
              </div>
              <div className="text-right sm:text-left">
                <p className="text-sm text-muted-foreground">Equivalent Cost (USD)</p>
                <p className="text-2xl font-semibold text-foreground">
                  ${dollarAmount.toFixed(2)}
                </p>
              </div>
            </div>

            {paymentError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Payment System Information</AlertTitle>
                <AlertDescription>{paymentError}</AlertDescription>
              </Alert>
            )}

            {PAYPAL_CLIENT_ID && !PAYPAL_CLIENT_ID.startsWith("YOUR_SANDBOX_CLIENT_ID") ? (
              paymentProcessing ? (
                <div className="flex items-center justify-center p-4">
                  <Spinner size={32} />
                  <p className="ml-2">Processing payment...</p>
                </div>
              ) : (
                 <PayPalScriptProvider options={scriptProviderOptions}>
                    <PayPalPaymentButtons 
                        creditsToPurchase={creditsToPurchase}
                        onPaymentSuccess={handlePaymentSuccess}
                        onPaymentError={handlePaymentError}
                        onPaymentCancel={handlePaymentCancel}
                        setPaymentProcessingParent={setPaymentProcessing}
                    />
                </PayPalScriptProvider>
              )
            ) : (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>PayPal Configuration Issue</AlertTitle>
                <AlertDescription>
                  PayPal Client ID is missing or invalid. Please ensure it is correctly set up.
                </AlertDescription>
              </Alert>
            )}
             {paymentError && PAYPAL_CLIENT_ID && !PAYPAL_CLIENT_ID.startsWith("YOUR_SANDBOX_CLIENT_ID") && ( 
                <Button onClick={() => window.location.reload()} variant="outline" className="mt-2">
                    <RefreshCw className="mr-2 h-4 w-4"/> Try Reloading Page
                </Button>
            )}

          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
                Payments are processed using PayPal's Sandbox environment for testing purposes. No real money is transferred.
                For more information, visit <a href="https://developer.paypal.com/docs/api/overview/" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">PayPal Developer <ExternalLink className="inline h-3 w-3 ml-0.5"/></a>.
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

