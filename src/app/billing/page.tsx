
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

// Ensure NEXT_PUBLIC_PAYPAL_CLIENT_ID is set in your .env.local or environment variables
// For production, this should be your LIVE PayPal Client ID.
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "YOUR_PLACEHOLDER_PAYPAL_CLIENT_ID"; // LIVE Client ID
// The PayPal SECRET KEY is NOT used in this client-side implementation.
// It is for server-to-server API calls only and must be kept secure on a backend.

const CREDITS_PER_DOLLAR = 100;

function PayPalPaymentButtons({
  creditsToPurchase,
  onPaymentSuccess,
  onPaymentError,
  onPaymentCancel,
  setPaymentProcessingParent,
  isParentProcessing
}: {
  creditsToPurchase: number,
  onPaymentSuccess: (details: any) => void,
  onPaymentError: (err: any) => void,
  onPaymentCancel: () => void,
  setPaymentProcessingParent: (isProcessing: boolean) => void,
  isParentProcessing: boolean
}) {
  const [{ isPending, isRejected, options: scriptOptionsFromReducer }, dispatch] = usePayPalScriptReducer();
  const { toast } = useToast();
  const dollarAmount = (creditsToPurchase / CREDITS_PER_DOLLAR).toFixed(2);

  useEffect(() => {
    if (isParentProcessing) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "A payment is in progress. Are you sure you want to leave?";
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }
  }, [isParentProcessing]);

  useEffect(() => {
    if (isRejected) {
      const detailedErrorMessage = "The PayPal payment system failed to load. This can be due to network issues, ad-blockers, or problems reaching PayPal's services. Please check your internet connection, disable any ad-blockers for this site, ensure your PayPal Client ID is correctly set, and try refreshing the page. If the problem persists, PayPal might be experiencing temporary issues.";
      console.error("[PayPalPaymentButtons] PayPal SDK script load failed (isRejected=true by PayPalScriptProvider). Options used by provider:", scriptOptionsFromReducer, "Propagating detailed error to parent.");
      onPaymentError(new Error(detailedErrorMessage));
    }
  }, [isRejected, onPaymentError, scriptOptionsFromReducer]);

  const createOrder: PayPalButtonsComponentProps['createOrder'] = (_data, actions) => {
    console.log("[PayPalButtons] createOrder called. Amount:", dollarAmount, "USD for", creditsToPurchase, "credits.");

    if (creditsToPurchase <= 0) {
      const errorMsg = "Invalid credit amount. Please enter a positive number of credits to purchase.";
      toast({
          title: "Invalid Amount",
          description: errorMsg,
          variant: "destructive",
      });
      console.error("[PayPalButtons] createOrder error:", errorMsg, "Credits:", creditsToPurchase);
      onPaymentError(new Error(errorMsg)); // Notify parent
      setPaymentProcessingParent(false); // Ensure parent processing state is reset
      return Promise.reject(new Error(errorMsg)); // Important to reject for PayPalButtons' onError
    }

    setPaymentProcessingParent(true);
    onPaymentError(null); // Clear previous errors

    const purchaseUnits = [{
      amount: {
        value: dollarAmount,
        currency_code: "USD"
      },
      description: `${creditsToPurchase} AutoNest Credits`
    }];

    console.log("[PayPalButtons] createOrder: Constructing purchase_units:", JSON.stringify(purchaseUnits, null, 2));

    // Logic to call backend to create order
    return fetch("/api/paypal/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ dollarAmount: parseFloat(dollarAmount), creditsToPurchase }),
    })
    .then((response) => {
      if (!response.ok) {
        return response.json().then(errData => {
          console.error("[PayPalButtons] Error from /api/paypal/create-order:", errData);
          throw new Error(errData.error || `Failed to create order on server. Status: ${response.status}`);
        });
      }
      return response.json();
    })
    .then((order) => {
      if (order.id) {
        console.log("[PayPalButtons] Order ID from server:", order.id);
        return order.id;
      } else {
        console.error("[PayPalButtons] Server did not return an order ID:", order);
        throw new Error("Server did not return a valid order ID.");
      }
    })
    .catch(err => {
      console.error("[PayPalButtons] Error in createOrder (fetching from /api/paypal/create-order or processing its response):", err);
      onPaymentError(err); // Notify parent of error
      setPaymentProcessingParent(false);
      throw err; // Re-throw to trigger PayPalButtons' onError
    });
  };
  
  const onApprove: PayPalButtonsComponentProps['onApprove'] = async (data, actions) => {
    console.log("[PayPalButtons] onApprove called. Data from PayPal (contains orderID):", data);
    try {
      // Call backend to capture payment
      const response = await fetch(`/api/paypal/capture-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderID: data.orderID, creditsToPurchase, userUID: user?.uid }),
      });

      const captureData = await response.json();

      if (!response.ok) {
        console.error("[PayPalButtons] Error from /api/paypal/capture-payment:", captureData);
        // Check for INSTRUMENT_DECLINED from server response if backend proxies this
        if (captureData?.details?.issue === "INSTRUMENT_DECLINED" || (typeof captureData.error === 'string' && captureData.error.toUpperCase().includes("INSTRUMENT_DECLINED"))) {
            toast({
                title: "Payment Method Declined",
                description: "Your payment method was declined. Please try a different funding source.",
                variant: "default",
            });
            return actions.restart();
        }
        throw new Error(captureData.error || `Failed to capture payment on server. Status: ${response.status}`);
      }
      
      console.log("PayPal Order Captured via server. Server Response:", JSON.stringify(captureData, null, 2));
      // `captureData` should contain the transaction details from server
      // e.g., captureData.paypalCaptureId, captureData.status
      onPaymentSuccess(captureData); // Pass server's capture details to parent
    } catch (error: any) {
      console.error("[PayPalButtons] Error during onApprove (calling /api/paypal/capture-payment or processing its response):", error);
      const errorMessage = typeof error.message === 'string' ? error.message.toUpperCase() : '';
      // Note: INSTRUMENT_DECLINED might be handled by the server now, but client-side restart can still be a fallback
      if (actions && errorMessage.includes("INSTRUMENT_DECLINED")) {
        console.warn("[PayPalButtons] INSTRUMENT_DECLINED reported during capture attempt. Attempting to restart payment on client.");
        toast({
            title: "Payment Method Declined",
            description: "Your payment method was declined. Please select a different funding source or try again.",
            variant: "default",
        });
        if (actions.restart) return actions.restart();
      }
      onPaymentError(error);
    }
    // setPaymentProcessingParent(false) is handled by onPaymentSuccess or onPaymentError in the parent
  };

  const onError: PayPalButtonsComponentProps['onError'] = (err) => {
    const errorMessage = typeof err === 'string' ? err : (err as Error)?.message || JSON.stringify(err);
    const lowerCaseErrorMessage = errorMessage.toLowerCase();
    console.error("[PayPal Buttons] onError triggered (This indicates an ERROR from PayPal before or during the payment flow). Raw error object:", err, "Error message:", errorMessage);

    if (lowerCaseErrorMessage.includes("window closed") || lowerCaseErrorMessage.includes("popup closed")) {
        console.log("[PayPal Buttons] onError: Detected PayPal window closed by user or popup interaction. Treating as cancellation.");
        onPaymentCancel();
    } else if (lowerCaseErrorMessage.includes("can not open popup window - blocked") || lowerCaseErrorMessage.includes("popup was blocked")) {
        console.error("[PayPal Buttons] onError: Detected popup blocker.");
        onPaymentError(new Error("PayPal popup window was blocked by your browser. Please disable popup blockers for this site and try again."));
    } else {
        console.error("[PayPal Buttons] onError (unexpected PayPal button error):", err);
        onPaymentError(err);
    }
    setPaymentProcessingParent(false);
  };

  const onCancel: PayPalButtonsComponentProps['onCancel'] = (_data, _actions) => {
    console.log("[PayPal Buttons] onCancel triggered (user closed window or cancelled payment). Data from PayPal:", _data);
    onPaymentCancel();
    setPaymentProcessingParent(false);
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center p-4">
        <Spinner size={32} />
        <p className="ml-2">Loading PayPal payment options...</p>
      </div>
    );
  }

  if (isRejected) {
    // Error display is handled by the parent BillingPage based on onPaymentError callback
    return null;
  }

  if (creditsToPurchase <= 0) {
    return <p className="text-sm text-destructive text-center py-2">Enter a valid amount of credits to purchase to see payment options.</p>;
  }
  const { user } = useAuth(); // Get user for passing UID

  return (
    <PayPalButtons
      key={dollarAmount} // Re-render if amount changes
      style={{
        shape: "pill", // Updated from sample
        layout: "vertical",
        color: "blue", // Updated from sample
        label: "paypal",
      }}
      createOrder={createOrder}
      onApprove={onApprove}
      onError={onError}
      onCancel={onCancel}
      disabled={creditsToPurchase <=0 || isPending || isParentProcessing}
    />
  );
}


export default function BillingPage() {
  const { user, loading: authLoading, addCredits } = useAuth();
  const { toast } = useToast();

  console.log("[BillingPage] Attempting to use PAYPAL_CLIENT_ID:", PAYPAL_CLIENT_ID);

  const [creditsToPurchase, setCreditsToPurchase] = useState<number>(100);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const dollarAmount = creditsToPurchase > 0 ? (creditsToPurchase / CREDITS_PER_DOLLAR) : 0;

  const handleCreditAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setCreditsToPurchase(isNaN(value) || value < 1 ? 1 : value);
    setPaymentError(null); // Clear error when amount changes
  };

  const handlePaymentSuccess = (details: any) => {
    // `details` here is now the response from our `/api/paypal/capture-payment` route
    addCredits(creditsToPurchase); // Assuming capture was successful on server and credits updated there or client updates based on server success
    toast({
      title: "Purchase Successful!",
      description: `${creditsToPurchase} credits purchase processed. Transaction ID: ${details.paypalCaptureId || details.id || 'N/A'}`,
    });
    setCreditsToPurchase(100); // Reset to default or clear
    setPaymentError(null);
    setPaymentProcessing(false);
  };

  const handlePaymentError = (err: any | null) => {
    if (err === null) { // Explicitly clear error if null is passed
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
    console.error("[BillingPage] handlePaymentError called with:", message, "Raw error:", err);


    if (message.startsWith("The PayPal payment system failed to load")) {
      setPaymentError(message); 
      toast({
        title: "PayPal Load Error",
        description: "Could not load PayPal services. Please see the message on the page for details.",
        variant: "destructive",
      });
    } else if (lowerCaseMessage.includes("popup window was blocked") || lowerCaseMessage.includes("can not open popup window - blocked")) {
      const popupBlockedMsg = "PayPal popup window was blocked. Please check your browser settings and disable popup blockers for this site, then try again.";
      setPaymentError(popupBlockedMsg);
      toast({
        title: "Popup Blocked",
        description: popupBlockedMsg,
        variant: "destructive",
      });
    } else if (lowerCaseMessage.includes("window closed") || lowerCaseMessage.includes("popup closed") || lowerCaseMessage.includes("order could not be captured")) {
        handlePaymentCancel(); // Treat as cancellation
    } else if (lowerCaseMessage.includes("invalid credit amount")){
      setPaymentError(message); 
    } else if (lowerCaseMessage.includes("payment method declined")) {
      setPaymentError(message); // Toast already shown by onApprove's catch block or by server response
    } else {
      const genericErrorMsg = `Payment Error: ${message}`;
      setPaymentError(genericErrorMsg);
      toast({
        title: "Payment Failed",
        description: `Could not process your payment. Details: ${message}`,
        variant: "destructive",
      });
    }
    setPaymentProcessing(false);
  };

  const handlePaymentCancel = () => {
    const cancelMsg = "Payment process was cancelled or the window was closed before completion.";
    setPaymentError(cancelMsg); // Display on page
    toast({
        title: "Payment Cancelled",
        description: "The payment window was closed before completion or the process was cancelled.",
        variant: "default", 
    });
    setPaymentProcessing(false);
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

  // Options for PayPalScriptProvider, aligning with latest sample
  const scriptProviderOptions = {
    "client-id": PAYPAL_CLIENT_ID,
    currency: "USD",
    "enable-funding": "card", // From user's latest HTML sample
    "disable-funding": "venmo,paylater", // From user's latest HTML sample
    "buyer-country": "US", // From user's latest HTML sample
    components: "buttons", // From user's latest HTML sample
    // "data-page-type": "product-details", // Keep if relevant
    // "data-sdk-integration-source": "developer-studio", // Keep if relevant
  };
  
  console.log("[BillingPage] PAYPAL_CLIENT_ID for Provider:", PAYPAL_CLIENT_ID);
  console.log("[BillingPage] scriptProviderOptions for Provider:", JSON.stringify(scriptProviderOptions, null, 2));


  const isPaypalConfigured = PAYPAL_CLIENT_ID && PAYPAL_CLIENT_ID !== "YOUR_PLACEHOLDER_PAYPAL_CLIENT_ID";

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
                    <p className="font-semibold text-2xl text-primary">
                      {displayedDollarValue}
                    </p>
                </div>
            </div>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Add Credits via PayPal</CardTitle>
            <CardDescription>
              Securely add credits to your account using PayPal. ({CREDITS_PER_DOLLAR} Credits = $1.00 USD)
            </CardDescription>
             {(!isPaypalConfigured) && (
                <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>PayPal Not Configured</AlertTitle>
                    <AlertDescription>
                    The PayPal Client ID is a placeholder or missing. Please set NEXT_PUBLIC_PAYPAL_CLIENT_ID in your environment variables to enable payments.
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
                  disabled={paymentProcessing || !isPaypalConfigured }
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

            {isPaypalConfigured ? (
              paymentProcessing && !paymentError ? ( 
                <div className="flex items-center justify-center p-4">
                  <Spinner size={32} />
                  <p className="ml-2">Processing payment...</p>
                </div>
              ) : !paymentError || (paymentError && creditsToPurchase > 0) ? ( 
                 <PayPalScriptProvider options={scriptProviderOptions}>
                    <PayPalPaymentButtons
                        creditsToPurchase={creditsToPurchase}
                        onPaymentSuccess={handlePaymentSuccess}
                        onPaymentError={handlePaymentError}
                        onPaymentCancel={handlePaymentCancel}
                        setPaymentProcessingParent={setPaymentProcessing}
                        isParentProcessing={paymentProcessing}
                    />
                </PayPalScriptProvider>
              ) : null
            ) : (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>PayPal Configuration Issue</AlertTitle>
                <AlertDescription>
                  PayPal Client ID is missing or invalid. Please set NEXT_PUBLIC_PAYPAL_CLIENT_ID in your environment variables to enable payments.
                </AlertDescription>
              </Alert>
            )}
             {paymentError && isPaypalConfigured && ( 
                <Button onClick={() => { setPaymentError(null); setPaymentProcessing(false); }} variant="outline" className="mt-2">
                    <RefreshCw className="mr-2 h-4 w-4"/> Retry Payment
                </Button>
            )}

          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
                Payments are processed using PayPal. For more information, visit <a href="https://developer.paypal.com/docs/api/overview/" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">PayPal Developer <ExternalLink className="inline h-3 w-3 ml-0.5"/></a>.
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


    