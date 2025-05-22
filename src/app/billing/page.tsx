
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
import { CreditCard, DollarSign, AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { FullPageLoader, Spinner } from "@/components/ui/loader";
import { useToast } from "@/hooks/use-toast";

const CREDITS_PER_DOLLAR = 100; // 100 credits = $1.00 USD, so 1 credit = $0.01

// It's crucial to keep your Client ID in an environment variable for security and flexibility.
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "YOUR_PLACEHOLDER_PAYPAL_CLIENT_ID";
// The PayPal Secret Key is for SERVER-SIDE use ONLY and should NEVER be in client-side code.

// This is a sub-component that will render the PayPal Buttons
// It uses usePayPalScriptReducer to manage the SDK loading state
function PayPalPaymentButtons({
  creditsToPurchase,
  dollarAmount,
  onPaymentSuccess,
  onPaymentError,
  onPaymentCancel,
  setPaymentProcessingParent, // Callback to set parent's processing state
  isParentProcessing, // Parent's processing state
}: {
  creditsToPurchase: number;
  dollarAmount: string;
  onPaymentSuccess: (details: any) => void;
  onPaymentError: (error: any) => void;
  onPaymentCancel: () => void;
  setPaymentProcessingParent: (isProcessing: boolean) => void;
  isParentProcessing: boolean;
}) {
  const [{ options, isPending, isRejected, isResolved }] = usePayPalScriptReducer();
  const { toast } = useToast();

  useEffect(() => {
    if (isRejected) {
      const errorMessage = "The PayPal payment system failed to load. This can be due to network issues, ad-blockers, or problems reaching PayPal's services. Please check your internet connection, disable any ad-blockers for this site, ensure your PayPal Client ID is correctly set, and try refreshing the page. If the problem persists, PayPal might be experiencing temporary issues.";
      console.error("[PayPalButtons] SDK script loading failed (isRejected). Error message:", errorMessage);
      onPaymentError(new Error(errorMessage));
    }
  }, [isRejected, onPaymentError]);
  
  const createOrder: PayPalButtonsComponentProps['createOrder'] = async (data, actions) => {
    console.log("[PayPalButtons] createOrder called. Amount:", dollarAmount, "Credits:", creditsToPurchase);
    setPaymentProcessingParent(true);

    if (creditsToPurchase <= 0) {
      const errorMsg = "Invalid credit amount. Please enter a positive number of credits.";
      console.error("[PayPalButtons] Error in createOrder:", errorMsg);
      toast({ title: "Invalid Amount", description: errorMsg, variant: "destructive" });
      onPaymentError(new Error(errorMsg)); // Notify parent
      return Promise.reject(new Error(errorMsg)); // Reject to trigger PayPalButtons onError
    }

    try {
      const purchaseUnits = [{
        amount: {
          value: dollarAmount, // Total amount
          currency_code: "USD",
          breakdown: {
            item_total: {
              currency_code: "USD",
              value: dollarAmount,
            },
          },
        },
        description: `${creditsToPurchase} AutoNest Credits`,
        items: [{
          name: `AutoNest Credits Pack (${creditsToPurchase})`,
          quantity: "1",
          unit_amount: {
            currency_code: "USD",
            value: dollarAmount,
          },
          category: "DIGITAL_GOODS",
        }],
      }];
      console.log("[PayPalButtons] Creating order with purchase_units:", JSON.stringify(purchaseUnits, null, 2));

      const orderID = await actions.order.create({ purchase_units: purchaseUnits });
      console.log("[PayPalButtons] Order ID created by PayPal SDK:", orderID);
      if (!orderID) {
        throw new Error("PayPal SDK failed to create order ID.");
      }
      return orderID;
    } catch (err: any) {
      console.error("[PayPalButtons] Error in actions.order.create():", err);
      const errorMessage = err.message || "Could not initiate PayPal Checkout. Please try again.";
      onPaymentError(err); // Notify parent
      // Re-throw to ensure PayPalButtons own onError might catch it if needed, or just let the promise reject.
      throw new Error(errorMessage);
    }
  };

  const onApprove: PayPalButtonsComponentProps['onApprove'] = async (data, actions) => {
    console.log("[PayPalButtons] onApprove triggered. Data:", data);
    setPaymentProcessingParent(true); // Ensure processing state is true
    try {
      if (!actions.order) {
        throw new Error("PayPal actions.order is not available in onApprove. This usually indicates a problem with the PayPal SDK setup or an unexpected state.");
      }
      const orderDetails = await actions.order.capture();
      console.log("[PayPalButtons] PayPal Order Captured (This is the SUCCESS RESPONSE from PayPal after payment):", JSON.stringify(orderDetails, null, 2));
      onPaymentSuccess(orderDetails); // Call parent's success handler
      // setPaymentProcessingParent(false) is handled by onPaymentSuccess in parent
      return Promise.resolve(); // Ensure a promise is returned
    } catch (error: any) {
      console.error("[PayPalButtons] Error during actions.order.capture() (This is an ERROR RESPONSE/STATE from PayPal after approval attempt):", error);
      let errorMessage = "An error occurred while processing your payment with PayPal.";
      if (error && typeof error.message === 'string') {
        const messageLower = error.message.toUpperCase();
        if (messageLower.includes("INSTRUMENT_DECLINED")) {
          toast({
            title: "Payment Method Declined",
            description: "Your payment method was declined. Please try a different one.",
            variant: "destructive",
          });
          // Let PayPal SDK handle restart
           if (actions.restart) {
            return actions.restart();
          } else {
            // Fallback if restart is not available, treat as general error
            onPaymentError(new Error("Payment method declined and restart is unavailable."));
          }
        } else {
          errorMessage = error.message;
           onPaymentError(new Error(errorMessage));
        }
      } else {
         onPaymentError(error);
      }
      return Promise.reject(error); // Ensure a promise is returned for PayPal SDK
    }
  };
  
  const onError: PayPalButtonsComponentProps['onError'] = (err: any) => {
    console.error("[PayPalButtons] onError triggered (This indicates an ERROR from PayPal before or during the payment flow). Raw error object:", err);
    let specificMessage = "An unexpected error occurred with PayPal. Please try again.";
    if (err && typeof err.message === 'string') {
        const messageLower = err.message.toLowerCase();
        if (messageLower.includes("window closed") || messageLower.includes("popup closed")) {
            console.log("[PayPalButtons] onError: Detected PayPal window closed by user or popup interaction. Treating as cancellation.");
            onPaymentCancel(); // Call parent's cancel handler
            return;
        } else if (messageLower.includes("popup window was blocked") || messageLower.includes("can not open popup window - blocked")){
            specificMessage = "PayPal popup window was blocked. Please disable your popup blocker for this site and try again.";
        } else {
            specificMessage = err.message;
        }
    }
    onPaymentError(new Error(specificMessage)); // Call parent's error handler
  };

  const onCancel: PayPalButtonsComponentProps['onCancel'] = (data, actions) => {
    console.log("[PayPalButtons] onCancel triggered. User cancelled the payment. Data:", data);
    onPaymentCancel(); // Call parent's cancel handler
  };

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-4">
        <Spinner size={32} />
        <p className="mt-2 text-sm text-muted-foreground">Loading PayPal...</p>
      </div>
    );
  }
  
  // If SDK loading failed is handled by useEffect triggering onPaymentError, 
  // parent BillingPage will show the primary error. So this component can return null.
  if (isRejected) {
      return null; 
  }

  return (
    <PayPalButtons
      key={dollarAmount} // Re-render if amount changes, ensuring correct order value
      style={{ 
        shape: "rect", // "rect" or "pill"
        layout: "vertical", 
        color: "blue", // "gold", "blue", "silver", "white", "black"
        label: "paypal", // "paypal", "checkout", "buynow", "pay", "installment"
      }}
      createOrder={createOrder}
      onApprove={onApprove}
      onError={onError}
      onCancel={onCancel}
      disabled={creditsToPurchase <=0 || isPending || isParentProcessing} // Disable if also parent is processing
    />
  );
}


export default function BillingPage() {
  const { user, loading: authLoading, addCredits } = useAuth();
  const { toast } = useToast();

  const [creditsToPurchase, setCreditsToPurchase] = useState<number>(100); // Default to $1.00 (100 credits)
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  // Log environment variables for debugging SDK loading issues
  useEffect(() => {
    console.log("[BillingPage] PAYPAL_CLIENT_ID for Provider:", PAYPAL_CLIENT_ID);
  }, []);


  const handleCreditAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setCreditsToPurchase(isNaN(value) || value < 1 ? 1 : value);
    setPaymentError(null); // Clear previous errors when amount changes
  };

  const handlePaymentSuccess = async (details: any) => {
    console.log("[BillingPage] PayPal Payment Successful! Details:", details);
    setPaymentError(null);
    try {
      await addCredits(creditsToPurchase); // This already shows a success toast
      toast({
        title: "Payment Successful!",
        description: `Order ID: ${details.id}. ${creditsToPurchase} credits added.`,
      });
      setCreditsToPurchase(100); // Reset input
    } catch (error: any) {
      console.error("Error adding credits after PayPal success:", error);
      toast({
        title: "Credit Update Failed",
        description: error.message || "Payment was successful, but failed to update credits.",
        variant: "destructive",
      });
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handlePaymentError = useCallback((error: any) => {
    console.error("[BillingPage] PayPal Payment Error! Error:", error);
    let message = "An error occurred during the payment process. Please try again.";
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }
    
    // More specific error messages based on content
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

  const scriptProviderOptions = {
    "client-id": PAYPAL_CLIENT_ID,
    currency: "USD",
    "enable-funding": "card", 
    "disable-funding": "venmo,paylater", 
    "buyer-country": "US", 
    components: "buttons", 
  };
  
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
                  disabled={paymentProcessing || PAYPAL_CLIENT_ID === "YOUR_PLACEHOLDER_PAYPAL_CLIENT_ID"}
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

            {PAYPAL_CLIENT_ID && PAYPAL_CLIENT_ID !== "YOUR_PLACEHOLDER_PAYPAL_CLIENT_ID" && (
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
                Payments are processed securely by PayPal. You will be redirected to PayPal to complete your purchase.
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
