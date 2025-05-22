"use client";

import type { ChangeEvent} from "react";
import { useState, useEffect, useCallback } from "react";
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer, type PayPalButtonsComponentProps } from "@paypal/react-paypal-js";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CreditCard, DollarSign, AlertTriangle, Loader2 } from "lucide-react"; // ExternalLink removed
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { FullPageLoader, Spinner } from "@/components/ui/loader";
import { useToast } from "@/hooks/use-toast";

const CREDITS_PER_DOLLAR = 100; // 100 credits = $1.00 USD, so 1 credit = $0.01

// Client ID for the PayPal JS SDK (loaded in the browser)
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "YOUR_PLACEHOLDER_PAYPAL_CLIENT_ID";
// The PayPal Secret Key is for SERVER-SIDE use ONLY (in Cloud Functions) and NEVER in client-side code.

const CLOUD_FUNCTION_BASE_URL = process.env.NEXT_PUBLIC_PAYPAL_FUNCTIONS_BASE_URL;

// This is a sub-component that will render the PayPal Buttons
function PayPalPaymentButtons({
  creditsToPurchase,
  dollarAmount,
  onPaymentSuccess,
  onPaymentError,
  onPaymentCancel,
  setPaymentProcessingParent,
  isParentProcessing,
}: {
  creditsToPurchase: number;
  dollarAmount: string;
  onPaymentSuccess: (details: any) => void;
  onPaymentError: (error: any) => void;
  onPaymentCancel: () => void;
  setPaymentProcessingParent: (isProcessing: boolean) => void;
  isParentProcessing: boolean;
}) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();
  const { toast } = useToast();
  const { user } = useAuth(); // For userUID

  useEffect(() => {
    if (isRejected) {
      const errorMessage = "The PayPal payment system failed to load. This can be due to network issues, ad-blockers, or problems reaching PayPal's services. Please check your internet connection, disable any ad-blockers for this site, ensure your PayPal Client ID is correctly set, and try refreshing the page. If the problem persists, PayPal might be experiencing temporary issues.";
      console.error("[PayPalButtons] SDK script loading failed (isRejected). Error message:", errorMessage);
      onPaymentError(new Error(errorMessage));
    }
  }, [isRejected, onPaymentError]);
  
  const createOrder: PayPalButtonsComponentProps['createOrder'] = async (data, actions) => {
    console.log("[PayPalButtons] createOrder called by SDK. Amount:", dollarAmount, "Credits:", creditsToPurchase);
    setPaymentProcessingParent(true);

    if (!CLOUD_FUNCTION_BASE_URL) {
        const errorMsg = "PayPal functions base URL is not configured. Cannot create order.";
        console.error("[PayPalButtons] Error in createOrder:", errorMsg);
        toast({ title: "Configuration Error", description: errorMsg, variant: "destructive" });
        onPaymentError(new Error(errorMsg));
        return Promise.reject(new Error(errorMsg));
    }

    if (creditsToPurchase <= 0) {
      const errorMsg = "Invalid credit amount. Please enter a positive number of credits.";
      console.error("[PayPalButtons] Error in createOrder:", errorMsg);
      toast({ title: "Invalid Amount", description: errorMsg, variant: "destructive" });
      onPaymentError(new Error(errorMsg));
      return Promise.reject(new Error(errorMsg));
    }

    try {
      console.log(`[PayPalButtons] Calling /create-order Cloud Function with amount: ${dollarAmount}, credits: ${creditsToPurchase}`);
      const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dollarAmount, creditsToPurchase }),
      });

      const orderData = await response.json();

      if (response.ok && orderData.orderID) {
        console.log("[PayPalButtons] Order ID created by Cloud Function:", orderData.orderID);
        return orderData.orderID;
      } else {
        const errorMessage = orderData.error || `Failed to create order via Cloud Function. Status: ${response.status}`;
        console.error("[PayPalButtons] Error from /create-order Cloud Function:", errorMessage, orderData);
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error("[PayPalButtons] Error in createOrder (calling Cloud Function):", err);
      const errorMessage = err.message || "Could not initiate PayPal Checkout via server. Please try again.";
      onPaymentError(err);
      throw new Error(errorMessage); // Re-throw to ensure PayPalButtons own onError might catch it
    }
  };

  const onApprove: PayPalButtonsComponentProps['onApprove'] = async (data, actions) => {
    console.log("[PayPalButtons] onApprove triggered by SDK. Data:", data);
    setPaymentProcessingParent(true);

    if (!user || !user.uid) {
      const errorMsg = "User not authenticated. Cannot capture payment.";
      console.error("[PayPalButtons] Error in onApprove:", errorMsg);
      toast({ title: "Authentication Error", description: errorMsg, variant: "destructive" });
      onPaymentError(new Error(errorMsg));
      return Promise.reject(new Error(errorMsg));
    }
    if (!CLOUD_FUNCTION_BASE_URL) {
        const errorMsg = "PayPal functions base URL is not configured. Cannot capture payment.";
        console.error("[PayPalButtons] Error in onApprove:", errorMsg);
        toast({ title: "Configuration Error", description: errorMsg, variant: "destructive" });
        onPaymentError(new Error(errorMsg));
        return Promise.reject(new Error(errorMsg));
    }

    try {
      console.log(`[PayPalButtons] Calling /capture-payment Cloud Function for orderID: ${data.orderID}`);
      const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}/capture-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            orderID: data.orderID,
            creditsToPurchase, // Send credits to purchase for server-side update
            userUID: user.uid // Send userUID for Firestore update
        }),
      });

      const captureDetails = await response.json();

      if (response.ok) {
        console.log("[PayPalButtons] Payment captured by Cloud Function and credits updated on server:", JSON.stringify(captureDetails, null, 2));
        onPaymentSuccess(captureDetails); // Call parent's success handler
        return Promise.resolve();
      } else {
         // Check for INSTRUMENT_DECLINED specifically from server response
        if (response.status === 402 && captureDetails.isInstrumentDeclined) {
            console.warn("[PayPalButtons] Instrument declined by server. Restarting payment flow.");
            toast({
                title: "Payment Method Declined",
                description: captureDetails.error || "Your payment method was declined. Please try a different one.",
                variant: "destructive",
            });
            if (actions.restart) {
               return actions.restart();
            } else {
                 const restartError = new Error("Payment method declined and restart is unavailable.");
                 onPaymentError(restartError);
                 throw restartError;
            }
        }
        const errorMessage = captureDetails.error || `Failed to capture payment via Cloud Function. Status: ${response.status}`;
        console.error("[PayPalButtons] Error from /capture-payment Cloud Function:", errorMessage, captureDetails);
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error("[PayPalButtons] Error during onApprove (calling Cloud Function):", error);
      // Let onPaymentError in parent handle the UI for general errors
      onPaymentError(error);
      return Promise.reject(error);
    }
  };
  
  const onError: PayPalButtonsComponentProps['onError'] = (err: any) => {
    console.error("[PayPal Buttons] onError triggered (This indicates an ERROR from PayPal before or during the payment flow). Raw error object:", err);
    let specificMessage = "An unexpected error occurred with PayPal. Please try again.";
    if (err && typeof err.message === 'string') {
        const messageLower = err.message.toLowerCase();
        if (messageLower.includes("window closed") || messageLower.includes("popup closed")) {
            console.log("[PayPal Buttons] onError: Detected PayPal window closed by user or popup interaction. Treating as cancellation.");
            onPaymentCancel();
            return;
        } else if (messageLower.includes("popup window was blocked") || messageLower.includes("can not open popup window - blocked")){
            specificMessage = "PayPal popup window was blocked. Please disable your popup blocker for this site and try again.";
        } else {
            specificMessage = err.message;
        }
    }
    onPaymentError(new Error(specificMessage));
  };

  const onCancel: PayPalButtonsComponentProps['onCancel'] = (data, actions) => {
    console.log("[PayPal Buttons] onCancel triggered. User cancelled the payment. Data:", data);
    onPaymentCancel();
  };

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-4">
        <Spinner size={32} />
        <p className="mt-2 text-sm text-muted-foreground">Loading PayPal...</p>
      </div>
    );
  }
  
  if (isRejected) {
      // Error is handled by useEffect calling onPaymentError, which sets parent's error state
      return null; 
  }

  return (
    <PayPalButtons
      key={dollarAmount} 
      style={{ 
        shape: "pill", // From new sample
        layout: "vertical", 
        color: "blue", // From new sample
        label: "paypal", 
      }}
      createOrder={createOrder}
      onApprove={onApprove}
      onError={onError}
      onCancel={onCancel}
      disabled={creditsToPurchase <=0 || isPending || isParentProcessing || !CLOUD_FUNCTION_BASE_URL}
    />
  );
}


export default function BillingPage() {
  const { user, loading: authLoading, addCredits } = useAuth();
  const { toast } = useToast();

  const [creditsToPurchase, setCreditsToPurchase] = useState<number>(100);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  useEffect(() => {
    console.log("[BillingPage] PAYPAL_CLIENT_ID for Provider:", PAYPAL_CLIENT_ID);
    console.log("[BillingPage] CLOUD_FUNCTION_BASE_URL:", CLOUD_FUNCTION_BASE_URL);
    if (!CLOUD_FUNCTION_BASE_URL) {
        setPaymentError("PayPal integration is not fully configured. Missing function URL. Please contact support.");
        toast({
            title: "Configuration Error",
            description: "The application is not properly configured for payments.",
            variant: "destructive",
        });
    }
  }, []);


  const handleCreditAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setCreditsToPurchase(isNaN(value) || value < 1 ? 1 : value);
    setPaymentError(null);
  };

  const handlePaymentSuccess = async (details: any) => {
    console.log("[BillingPage] PayPal Payment Processed by Server! Details:", details);
    setPaymentError(null);
    try {
      // The server has already updated credits in Firestore.
      // Call addCredits locally to update the AuthContext state for immediate UI reflection.
      await addCredits(creditsToPurchase, false); // Pass false to prevent double Firestore update
      toast({
        title: "Payment Successful!",
        description: `Server confirmed payment. ${creditsToPurchase} credits reflected. Order ID: ${details.captureData?.id || details.orderID || 'N/A'}.`,
      });
      setCreditsToPurchase(100); 
    } catch (error: any) {
      console.error("Error updating local credits state after server success:", error);
      toast({
        title: "UI Update Failed",
        description: error.message || "Payment was successful, but UI failed to update credits immediately.",
        variant: "destructive",
      });
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handlePaymentError = useCallback((error: any) => {
    console.error("[BillingPage] PayPal Payment Error Callback! Error:", error);
    let message = "An error occurred during the payment process. Please try again.";
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }
    
    if (message.toLowerCase().includes("paypal sdk failed to load")) {
        message = "The PayPal payment system failed to load. This can be due to network issues, ad-blockers, or problems reaching PayPal's services. Please check your internet connection, disable any ad-blockers for this site, ensure your PayPal Client ID is correctly set, and try refreshing the page. If the problem persists, PayPal might be experiencing temporary issues.";
    } else if (message.toLowerCase().includes("popup window was blocked") || message.toLowerCase().includes("can not open popup window - blocked")) {
        message = "PayPal's payment window was blocked. Please disable your popup blocker for this site and try again.";
    }

    setPaymentError(message);
    toast({
      title: "Payment Failed",
      description: message,
      variant: "destructive",
    });
    setPaymentProcessing(false);
  }, [toast]);

  const handlePaymentCancel = useCallback(() => {
    console.log("[BillingPage] PayPal Payment Cancelled by user.");
    setPaymentError("Payment was cancelled.");
    toast({
      title: "Payment Cancelled",
      description: "You have cancelled the payment process.",
      variant: "default",
    });
    setPaymentProcessing(false);
  }, [toast]);


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

  // Options for PayPalScriptProvider
  const scriptProviderOptions = {
    "client-id": PAYPAL_CLIENT_ID,
    currency: "USD",
    "enable-funding": "card", // From new sample
    "disable-funding": "venmo,paylater", // From new sample
    "buyer-country": "US", // From new sample
    components: "buttons", // From new sample
    // "data-page-type": "product-details", // Removed as it's less common for this direct SDK component
    // "data-sdk-integration-source": "developer-studio", // Typically for PayPal's own tools
  };
  
  console.log("[BillingPage] PAYPAL_CLIENT_ID for Provider:", PAYPAL_CLIENT_ID);
  console.log("[BillingPage] scriptProviderOptions for Provider:", scriptProviderOptions);

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

        {PAYPAL_CLIENT_ID === "YOUR_PLACEHOLDER_PAYPAL_CLIENT_ID" && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>PayPal Configuration Needed</AlertTitle>
              <AlertDescription>
                PayPal Client ID is not set correctly. Please update the <code>NEXT_PUBLIC_PAYPAL_CLIENT_ID</code> environment variable.
                Payment functionality will not work until this is resolved.
              </AlertDescription>
            </Alert>
        )}
         {!CLOUD_FUNCTION_BASE_URL && PAYPAL_CLIENT_ID !== "YOUR_PLACEHOLDER_PAYPAL_CLIENT_ID" && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Server Configuration Error</AlertTitle>
                <AlertDescription>
                The payment system is not fully configured (missing server URL). Please contact support or try again later.
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
                  disabled={paymentProcessing || PAYPAL_CLIENT_ID === "YOUR_PLACEHOLDER_PAYPAL_CLIENT_ID" || !CLOUD_FUNCTION_BASE_URL}
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
                <AlertTitle>Payment System Error</AlertTitle>
                <AlertDescription>{paymentError}</AlertDescription>
              </Alert>
            )}

            {PAYPAL_CLIENT_ID && PAYPAL_CLIENT_ID !== "YOUR_PLACEHOLDER_PAYPAL_CLIENT_ID" && CLOUD_FUNCTION_BASE_URL && (
              <PayPalScriptProvider options={scriptProviderOptions}>
                <PayPalPaymentButtons
                  creditsToPurchase={creditsToPurchase}
                  dollarAmount={dollarAmountToPay}
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentError={handlePaymentError}
                  onPaymentCancel={handlePaymentCancel}
                  setPaymentProcessingParent={setPaymentProcessing}
                  isParentProcessing={paymentProcessing}
                />
              </PayPalScriptProvider>
            )}
             {paymentProcessing && (
                <div className="flex items-center justify-center text-sm text-muted-foreground py-4">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/> Processing your payment...
                </div>
            )}

          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
                Payments are processed securely by PayPal.
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

