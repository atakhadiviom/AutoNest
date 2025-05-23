
"use client";

import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { useState, useEffect, useCallback } from "react";
import {
  PayPalScriptProvider,
  PayPalButtons,
  usePayPalScriptReducer,
  type PayPalButtonsComponentProps,
} from "@paypal/react-paypal-js";
import AppLayout from "@/components/layout/app-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CreditCard, DollarSign, AlertTriangle, Info, Loader2, RefreshCw } from "lucide-react";
// import Image from "next/image"; // Image component no longer needed for this page
import { useAuth } from "@/contexts/auth-context";
import { FullPageLoader, Spinner } from "@/components/ui/loader";
import { useToast } from "@/hooks/use-toast";

const CREDITS_PER_DOLLAR = 100;

// THIS IS THE PUBLIC PAYPAL CLIENT ID FOR THE FRONTEND JAVASCRIPT SDK
// IT IS READ FROM ENVIRONMENT VARIABLES. Next.js embeds this at build time.
// Ensure NEXT_PUBLIC_PAYPAL_CLIENT_ID is set correctly in your .env file
// AND THAT YOU RESTART YOUR NEXT.JS DEV SERVER AFTER CHANGING .env
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "YOUR_PLACEHOLDER_PAYPAL_CLIENT_ID";
// Note: The PayPal Secret Key is NOT used on the client-side. It's for server-side API calls only.

// This is the base URL for your Firebase Cloud Functions for PayPal.
// Ensure NEXT_PUBLIC_PAYPAL_FUNCTIONS_BASE_URL is set correctly in your .env file.
const CLOUD_FUNCTION_BASE_URL = process.env.NEXT_PUBLIC_PAYPAL_FUNCTIONS_BASE_URL;

interface PayPalPaymentButtonsProps {
  creditsToPurchase: number;
  dollarAmount: string;
  setPaymentProcessingParent: Dispatch<SetStateAction<boolean>>;
  onPaymentSuccess: (details: any) => void;
  onPaymentError: (error: any) => void;
  onPaymentCancel: () => void;
  isParentProcessing: boolean;
}

const PayPalPaymentButtons: React.FC<PayPalPaymentButtonsProps> = ({
  creditsToPurchase,
  dollarAmount,
  setPaymentProcessingParent,
  onPaymentSuccess,
  onPaymentError,
  onPaymentCancel,
  isParentProcessing,
}) => {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isRejected) {
      const errorMessage = "The PayPal payment system failed to load. This can be due to network issues, ad-blockers, or problems reaching PayPal's services. Please check your internet connection, disable any ad-blockers for this site, ensure your PayPal Client ID is correctly set, and try refreshing the page. If the problem persists, PayPal might be experiencing temporary issues.";
      console.error("[PayPalPaymentButtons] PayPal SDK script loading failed (isRejected).", errorMessage);
      onPaymentError(new Error(errorMessage));
    }
  }, [isRejected, onPaymentError]);

  const createOrder: PayPalButtonsComponentProps['createOrder'] = async (_data, actions) => {
    console.log("[PayPalButtons] createOrder called. Credits:", creditsToPurchase, "Amount:", dollarAmount);
    setPaymentProcessingParent(true);

    if (creditsToPurchase <= 0) {
      const errorMsg = "Invalid credit amount. Credits to purchase must be greater than zero.";
      toast({ title: "Invalid Amount", description: errorMsg, variant: "destructive" });
      console.error("[PayPalButtons] Error in createOrder (client-side validation):", errorMsg);
      onPaymentError(new Error(errorMsg));
      return Promise.reject(new Error(errorMsg));
    }
    if (!CLOUD_FUNCTION_BASE_URL) {
      const errorMsg = "Payment functions URL is not configured. Cannot create order.";
      console.error("[PayPalButtons] Error in createOrder (client-side validation):", errorMsg);
      onPaymentError(new Error(errorMsg));
      return Promise.reject(new Error(errorMsg));
    }

    try {
      const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dollarAmount, creditsToPurchase }),
      });

      const orderData = await response.json();
      if (!response.ok || !orderData.orderID) {
        const errorMsg = orderData.error || "Failed to create PayPal order via server.";
        console.error("[PayPalButtons] Server error creating order:", orderData);
        throw new Error(errorMsg);
      }
      console.log("[PayPalButtons] Order created successfully by server. Order ID:", orderData.orderID);
      return orderData.orderID;
    } catch (err: any) {
      console.error("[PayPalButtons] Error in createOrder calling server:", err);
      onPaymentError(err);
      return Promise.reject(err);
    }
  };

  const onApprove: PayPalButtonsComponentProps['onApprove'] = async (data, actions) => {
    console.log("[PayPalButtons] onApprove called. Data:", data);
    setPaymentProcessingParent(true);

    if (!user || !user.uid) {
      const errorMsg = "User not authenticated. Cannot process payment.";
      console.error("[PayPalButtons] Error in onApprove:", errorMsg);
      onPaymentError(new Error(errorMsg));
      return Promise.reject(new Error(errorMsg));
    }
    if (!CLOUD_FUNCTION_BASE_URL) {
      const errorMsg = "Payment functions URL is not configured. Cannot capture payment.";
      console.error("[PayPalButtons] Error in onApprove:", errorMsg);
      onPaymentError(new Error(errorMsg));
      return Promise.reject(new Error(errorMsg));
    }

    try {
      const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}/capture-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderID: data.orderID,
          creditsToPurchase,
          userUID: user.uid,
        }),
      });

      const captureData = await response.json();

      if (!response.ok) {
        if (response.status === 402 && captureData.isInstrumentDeclined) {
          console.warn("[PayPalButtons] Instrument declined by server. Restarting payment.", captureData);
          toast({ title: "Payment Method Declined", description: captureData.error || "Your payment method was declined. Please try another.", variant: "destructive"});
          onPaymentError(new Error(captureData.error || "Payment method declined. Please try another."));
          return actions.restart();
        }
        const errorMsg = captureData.error || `Server error capturing payment. Status: ${response.status}`;
        console.error("[PayPalButtons] Server error capturing payment:", captureData);
        throw new Error(errorMsg);
      }

      console.log("[PayPalButtons] Payment captured successfully by server:", captureData);
      onPaymentSuccess(captureData);
      return Promise.resolve();
    } catch (err: any) {
      console.error("[PayPalButtons] Error in onApprove calling server or processing response:", err);
      onPaymentError(err);
      return Promise.reject(err);
    }
  };

  const onError: PayPalButtonsComponentProps['onError'] = (err: any) => {
    let errorMessage = err.message || "An unknown PayPal error occurred.";
    console.error("[PayPalButtons] onError triggered (This indicates an ERROR from PayPal before or during the payment flow). Raw error object:", err);
    
    errorMessage = String(errorMessage).toLowerCase();

    if (errorMessage.includes("window closed") || errorMessage.includes("popup closed")) {
      console.log("[PayPalButtons] onError: Detected PayPal window closed by user or popup interaction. Treating as cancellation.");
      onPaymentCancel();
    } else if (errorMessage.includes("popup window was blocked") || errorMessage.includes("can not open popup window - blocked")) {
      console.warn("[PayPalButtons] onError: PayPal popup was blocked.");
      onPaymentError(new Error("PayPal popup window was blocked. Please disable your popup blocker for this site and try again."));
    } else {
      onPaymentError(new Error(`PayPal Processing Error: ${err.message || "Unknown PayPal Error"}`));
    }
  };

  const onCancel: PayPalButtonsComponentProps['onCancel'] = () => {
    console.log("[PayPalButtons] onCancel triggered - user cancelled the payment.");
    onPaymentCancel();
  };

  if (isPending) {
    return <div className="flex justify-center items-center py-4"><Spinner size={24} /> <span className="ml-2">Loading PayPal...</span></div>;
  }

  if (isRejected) {
    // Error message is displayed by the parent BillingPage component
    return null;
  }

  return (
    <PayPalButtons
      key={dollarAmount} // Re-render if amount changes
      style={{
        shape: "pill", // Changed from "rect"
        layout: "vertical",
        color: "blue", // Changed from "gold"
        label: "paypal",
      }}
      createOrder={createOrder}
      onApprove={onApprove}
      onError={onError}
      onCancel={onCancel}
      disabled={creditsToPurchase <=0 || isParentProcessing || isPending}
    />
  );
};


export default function BillingPage() {
  const { user, loading: authLoading, addCredits } = useAuth();
  const { toast } = useToast();

  const [creditsToPurchase, setCreditsToPurchase] = useState<number>(100);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const displayedDollarValue = user?.credits !== undefined ? (user.credits / CREDITS_PER_DOLLAR).toFixed(2) : "0.00";
  const dollarAmountToPay = (creditsToPurchase / CREDITS_PER_DOLLAR).toFixed(2);

  console.log("[BillingPage] PAYPAL_CLIENT_ID for Provider:", PAYPAL_CLIENT_ID);
  console.log("[BillingPage] CLOUD_FUNCTION_BASE_URL:", CLOUD_FUNCTION_BASE_URL);

  useEffect(() => {
    if (PAYPAL_CLIENT_ID === "YOUR_PLACEHOLDER_PAYPAL_CLIENT_ID" || !PAYPAL_CLIENT_ID) {
        const msg = "PayPal Client ID is not configured. Please set NEXT_PUBLIC_PAYPAL_CLIENT_ID in your environment variables.";
        setPaymentError(msg);
        console.error("[BillingPage] Configuration Error:", msg);
    }
    if (!CLOUD_FUNCTION_BASE_URL) {
        const msg = "Payment Functions URL (Cloud Functions base URL) is not configured. Please set NEXT_PUBLIC_PAYPAL_FUNCTIONS_BASE_URL.";
        setPaymentError((prev) => prev ? `${prev} Also, ${msg}` : msg);
        console.error("[BillingPage] Configuration Error:", msg);
    }
  }, []);


  const handleCreditAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setCreditsToPurchase(isNaN(value) || value < 1 ? 1 : value);
    setPaymentError(null); // Clear previous errors when amount changes
  };

  const handlePaymentSuccess = useCallback((details: any) => {
    console.log("[BillingPage] handlePaymentSuccess. Details from server/PayPal:", details);
    toast({
      title: "Payment Successful!",
      description: `${creditsToPurchase} credits have been added to your account.`,
    });
    // Server updated Firestore, AuthContext will sync or we tell it not to re-update
    addCredits(creditsToPurchase, false); 
    setCreditsToPurchase(100);
    setPaymentError(null);
    setPaymentProcessing(false);
  }, [creditsToPurchase, addCredits, toast]);

  const handlePaymentError = useCallback((error: any) => {
    let message = error.message || "An unexpected error occurred during payment.";
    console.error("[BillingPage] handlePaymentError. Error:", error);

    if (String(message).toLowerCase().includes("popup window was blocked") || String(message).toLowerCase().includes("can not open popup window - blocked")) {
      message = "PayPal popup window was blocked. Please disable your popup blocker for this site and try again.";
    } else if (String(message).toLowerCase().includes("paypal payment system failed to load") || String(message).toLowerCase().includes("paypal sdk failed to load")) {
       message = "The PayPal payment system failed to load. This can be due to network issues, ad-blockers, or problems reaching PayPal's services. Please check your internet connection, disable any ad-blockers for this site, ensure your PayPal Client ID is correctly set, and try refreshing the page. If the problem persists, PayPal might be experiencing temporary issues.";
    } else if (String(message).toLowerCase().includes("invalid credit amount")){
      // Toast already shown by createOrder
    }

    setPaymentError(message);
    if (!String(message).toLowerCase().includes("invalid credit amount")) { // Avoid duplicate toast
      toast({
        title: "Payment Failed",
        description: message,
        variant: "destructive",
      });
    }
    setPaymentProcessing(false);
  }, [toast]);

  const handlePaymentCancel = useCallback(() => {
    console.log("[BillingPage] handlePaymentCancel called.");
    setPaymentError("Payment was cancelled.");
    toast({
      title: "Payment Cancelled",
      description: "You have cancelled the payment process.",
      variant: "default",
    });
    setPaymentProcessing(false);
  }, [toast]);

  const handleSimulateAddCredits = async () => {
    if (!user) {
      toast({ title: "Authentication Error", description: "Please log in to add credits.", variant: "destructive" });
      return;
    }
    if (creditsToPurchase <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a positive number of credits.", variant: "destructive" });
      return;
    }
    setPaymentProcessing(true);
    setPaymentError(null);
    try {
      await addCredits(creditsToPurchase, true); // true: client updates Firestore for simulation
      toast({
        title: "Credits Added (Simulated)",
        description: `${creditsToPurchase} credits have been added to your account.`,
      });
      setCreditsToPurchase(100);
    } catch (error: any) {
      const errorMessage = error.message || "An unexpected error occurred while adding credits.";
      setPaymentError(errorMessage);
      toast({
        title: "Failed to Add Credits (Simulated)",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setPaymentProcessing(false);
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
  
  // Options for PayPalScriptProvider
  // Match the parameters from the HTML sample script tag
  const scriptProviderOptions = {
      "client-id": PAYPAL_CLIENT_ID, // This comes from process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
      currency: "USD",
      "enable-funding": "card", // From HTML sample
      "disable-funding": "venmo,paylater", // From HTML sample
      "buyer-country": "US", // From HTML sample
      components: "buttons", // From HTML sample
      "data-sdk-integration-source":"developer-studio" // From HTML sample
  };

  console.log("[BillingPage] PAYPAL_CLIENT_ID for Provider:", PAYPAL_CLIENT_ID);
  console.log("[BillingPage] scriptProviderOptions for Provider:", scriptProviderOptions);


  const isConfigError = (PAYPAL_CLIENT_ID === "YOUR_PLACEHOLDER_PAYPAL_CLIENT_ID" || !PAYPAL_CLIENT_ID) || !CLOUD_FUNCTION_BASE_URL;

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

        {isConfigError && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Configuration Error</AlertTitle>
                <AlertDescription>
                  {(PAYPAL_CLIENT_ID === "YOUR_PLACEHOLDER_PAYPAL_CLIENT_ID" || !PAYPAL_CLIENT_ID) && <div>PayPal Client ID (NEXT_PUBLIC_PAYPAL_CLIENT_ID) is not configured correctly. Please set it in your environment variables.</div>}
                  {!CLOUD_FUNCTION_BASE_URL && <div>Payment Functions URL (NEXT_PUBLIC_PAYPAL_FUNCTIONS_BASE_URL) is not configured. Please set it.</div>}
                   {((PAYPAL_CLIENT_ID === "YOUR_PLACEHOLDER_PAYPAL_CLIENT_ID" || !PAYPAL_CLIENT_ID) || !CLOUD_FUNCTION_BASE_URL) &&
                    <Button onClick={() => window.location.reload()} variant="outline" className="mt-2">
                        <RefreshCw className="mr-2 h-4 w-4"/> Try Reloading Page
                    </Button>
                   }
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
                  disabled={paymentProcessing || isConfigError}
                />
              </div>
              <div className="text-right sm:text-left">
                <p className="text-sm text-muted-foreground">Total Cost (USD)</p>
                <p className="text-2xl font-semibold text-foreground">
                  ${dollarAmountToPay}
                </p>
              </div>
            </div>

            {paymentProcessing && (
              <div className="flex justify-center items-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Processing your payment...</p>
              </div>
            )}

            {paymentError && !paymentProcessing && ( // Only show if not actively processing
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Payment System Error</AlertTitle>
                <AlertDescription>{paymentError}</AlertDescription>
                 {(paymentError.toLowerCase().includes("paypal client id") || paymentError.toLowerCase().includes("paypal payment system failed to load")) && (
                    <Button onClick={() => window.location.reload()} variant="outline" className="mt-2">
                        <RefreshCw className="mr-2 h-4 w-4"/> Try Reloading Page
                    </Button>
                )}
              </Alert>
            )}

            {!isConfigError && (
              <div className="mt-6">
                <PayPalScriptProvider options={scriptProviderOptions}>
                    <PayPalPaymentButtons
                        creditsToPurchase={creditsToPurchase}
                        dollarAmount={dollarAmountToPay}
                        setPaymentProcessingParent={setPaymentProcessing}
                        onPaymentSuccess={handlePaymentSuccess}
                        onPaymentError={handlePaymentError}
                        onPaymentCancel={handlePaymentCancel}
                        isParentProcessing={paymentProcessing}
                    />
                </PayPalScriptProvider>
              </div>
            )}
             {(!paymentProcessing && isConfigError) && (
                <Alert variant="warning" className="mt-6">
                    <Info className="h-4 w-4" />
                    <AlertTitle>PayPal Unavailable</AlertTitle>
                    <AlertDescription>
                        Live payments are currently unavailable due to a configuration issue. Please ensure NEXT_PUBLIC_PAYPAL_CLIENT_ID and NEXT_PUBLIC_PAYPAL_FUNCTIONS_BASE_URL are correctly set.
                    </AlertDescription>
                </Alert>
            )}

          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
                Payments are processed securely by PayPal.
            </p>
          </CardFooter>
        </Card>

        <Card className="shadow-sm border-dashed">
            <CardHeader>
                <CardTitle className="text-lg">Testing Only: Simulate Credits</CardTitle>
                <CardDescription>This button directly adds credits without payment for testing purposes.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button
                onClick={handleSimulateAddCredits}
                disabled={paymentProcessing || creditsToPurchase <= 0 }
                variant="secondary"
                >
                {paymentProcessing ? "Processing..." : `Simulate Adding ${creditsToPurchase} Credits ($${dollarAmountToPay})`}
                </Button>
            </CardContent>
        </Card>

        {/* Removed Payment Methods Card */}

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
