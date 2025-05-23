
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
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { FullPageLoader, Spinner } from "@/components/ui/loader";
import { useToast } from "@/hooks/use-toast";

const CREDITS_PER_DOLLAR = 100;

// Read from environment variables
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "YOUR_PLACEHOLDER_PAYPAL_CLIENT_ID";
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
      console.error("[PayPalButtons] Error in createOrder:", errorMsg);
      onPaymentError(new Error(errorMsg)); // Notify parent
      return Promise.reject(new Error(errorMsg)); // Reject to inform PayPalButtons
    }
    if (!CLOUD_FUNCTION_BASE_URL) {
      const errorMsg = "Payment functions URL is not configured. Cannot create order.";
      console.error("[PayPalButtons] Error in createOrder:", errorMsg);
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
      onPaymentError(err); // Notify parent
      return Promise.reject(err); // Reject to inform PayPalButtons
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
          console.warn("[PayPalButtons] Instrument declined by server. Restarting payment.");
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
    const errorMessage = err.message || "An unknown PayPal error occurred.";
    console.error("[PayPalButtons] onError triggered. Raw error object:", err);
    
    if (errorMessage.toLowerCase().includes("window closed") || errorMessage.toLowerCase().includes("popup closed")) {
      console.log("[PayPal Buttons] onError: Detected PayPal window closed by user or popup interaction. Treating as cancellation.");
      onPaymentCancel();
    } else if (errorMessage.toLowerCase().includes("popup window was blocked") || errorMessage.toLowerCase().includes("can not open popup window - blocked")) {
      console.warn("[PayPalButtons] onError: PayPal popup was blocked.");
      onPaymentError(new Error("PayPal popup window was blocked. Please disable your popup blocker for this site and try again."));
    } else {
      onPaymentError(new Error(`PayPal Processing Error: ${errorMessage}`));
    }
  };

  const onCancel: PayPalButtonsComponentProps['onCancel'] = () => {
    console.log("[PayPal Buttons] onCancel triggered - user cancelled the payment.");
    onPaymentCancel();
  };

  if (isPending) {
    return <div className="flex justify-center items-center py-4"><Spinner size={24} /> <span className="ml-2">Loading PayPal...</span></div>;
  }

  // isRejected case is handled by the parent (BillingPage) via onPaymentError
  if (isRejected) {
    return null; 
  }

  return (
    <PayPalButtons
      key={dollarAmount} 
      style={{ 
        shape: "pill",
        layout: "vertical",
        color: "blue",
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

  const displayedDollarValue = (user?.credits !== undefined ? (user.credits / CREDITS_PER_DOLLAR) : 0).toFixed(2);
  const dollarAmountToPay = (creditsToPurchase / CREDITS_PER_DOLLAR).toFixed(2);
  
  useEffect(() => {
    console.log("[BillingPage] Component Mounted. PAYPAL_CLIENT_ID from env:", process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID);
    console.log("[BillingPage] Using PAYPAL_CLIENT_ID:", PAYPAL_CLIENT_ID);
    console.log("[BillingPage] Using CLOUD_FUNCTION_BASE_URL:", CLOUD_FUNCTION_BASE_URL);

    if (PAYPAL_CLIENT_ID === "YOUR_PLACEHOLDER_PAYPAL_CLIENT_ID" || !PAYPAL_CLIENT_ID) {
        setPaymentError("PayPal Client ID is not configured. Please set NEXT_PUBLIC_PAYPAL_CLIENT_ID in your environment variables.");
    }
    if (!CLOUD_FUNCTION_BASE_URL) {
        setPaymentError((prev) => 
            prev 
            ? `${prev} Also, Payment Functions URL (Cloud Functions base URL) is not configured. Please set NEXT_PUBLIC_PAYPAL_FUNCTIONS_BASE_URL.` 
            : "Payment Functions URL (Cloud Functions base URL) is not configured. Please set NEXT_PUBLIC_PAYPAL_FUNCTIONS_BASE_URL."
        );
    }
  }, []);


  const handleCreditAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setCreditsToPurchase(isNaN(value) || value < 1 ? 1 : value);
    setPaymentError(null); 
  };

  const handlePaymentSuccess = useCallback((details: any) => {
    console.log("[BillingPage] handlePaymentSuccess. Details from server/PayPal:", details);
    toast({
      title: "Payment Successful!",
      description: `${creditsToPurchase} credits have been added to your account.`,
    });
    addCredits(creditsToPurchase, false); // false to only update local state
    setCreditsToPurchase(100);
    setPaymentError(null);
    setPaymentProcessing(false);
  }, [creditsToPurchase, addCredits, toast]);

  const handlePaymentError = useCallback((error: any) => {
    const message = error.message || "An unexpected error occurred during payment.";
    console.error("[BillingPage] handlePaymentError. Error:", message, error);
    
    let displayMessage = message;
    if (message.toLowerCase().includes("popup window was blocked")) {
      displayMessage = "PayPal popup window was blocked. Please disable your popup blocker for this site and try again.";
    } else if (message.toLowerCase().includes("paypal sdk failed to load")) {
       displayMessage = "The PayPal payment system failed to load. This can be due to network issues, ad-blockers, or problems reaching PayPal's services. Please check your internet connection, disable any ad-blockers for this site, and try refreshing the page. If the problem persists, PayPal might be experiencing temporary issues.";
    }

    setPaymentError(displayMessage);
    toast({
      title: "Payment Failed",
      description: displayMessage,
      variant: "destructive",
    });
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
      await addCredits(creditsToPurchase, true); 
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

  const scriptProviderOptions = {
      "client-id": PAYPAL_CLIENT_ID,
      currency: "USD",
      "enable-funding": "card", 
      "disable-funding": "venmo,paylater", 
      "buyer-country": "US", 
      components: "buttons", 
      "data-sdk-integration-source":"developer-studio"
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
                    <p className="font-semibold text-2xl text-primary">{displayedDollarValue}</p>
                </div>
            </div>
          </Card>
        </div>
        
        {(PAYPAL_CLIENT_ID === "YOUR_PLACEHOLDER_PAYPAL_CLIENT_ID" || !PAYPAL_CLIENT_ID || !CLOUD_FUNCTION_BASE_URL) && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Configuration Error</AlertTitle>
                <AlertDescription>
                  {(PAYPAL_CLIENT_ID === "YOUR_PLACEHOLDER_PAYPAL_CLIENT_ID" || !PAYPAL_CLIENT_ID) && <div>PayPal Client ID is not configured. Please set NEXT_PUBLIC_PAYPAL_CLIENT_ID in your environment variables.</div>}
                  {!CLOUD_FUNCTION_BASE_URL && <div>Payment Functions URL (Cloud Functions base URL) is not configured. Please set NEXT_PUBLIC_PAYPAL_FUNCTIONS_BASE_URL.</div>}
                   {(PAYPAL_CLIENT_ID === "YOUR_PLACEHOLDER_PAYPAL_CLIENT_ID" || !PAYPAL_CLIENT_ID) && 
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
            
            {paymentProcessing && (
              <div className="flex justify-center items-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Processing your payment...</p>
              </div>
            )}

            {paymentError && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Payment Error</AlertTitle>
                <AlertDescription>{paymentError}</AlertDescription>
                 {paymentError.toLowerCase().includes("paypal client id is not configured") && (
                    <Button onClick={() => window.location.reload()} variant="outline" className="mt-2">
                        <RefreshCw className="mr-2 h-4 w-4"/> Try Reloading Page
                    </Button>
                )}
              </Alert>
            )}
            
            {PAYPAL_CLIENT_ID !== "YOUR_PLACEHOLDER_PAYPAL_CLIENT_ID" && PAYPAL_CLIENT_ID && CLOUD_FUNCTION_BASE_URL && !paymentProcessing && !paymentError && (
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
             {(!paymentProcessing && (PAYPAL_CLIENT_ID === "YOUR_PLACEHOLDER_PAYPAL_CLIENT_ID" || !PAYPAL_CLIENT_ID || !CLOUD_FUNCTION_BASE_URL)) && (
                <Alert variant="warning" className="mt-6">
                    <Info className="h-4 w-4" />
                    <AlertTitle>PayPal Unavailable</AlertTitle>
                    <AlertDescription>
                        Live payments are currently unavailable due to a configuration issue. Please ensure all required environment variables (PayPal Client ID and Functions Base URL) are correctly set.
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
