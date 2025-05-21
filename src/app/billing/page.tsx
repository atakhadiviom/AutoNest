
"use client";

import type { ChangeEvent} from "react";
import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CreditCard, DollarSign, PlusCircle, AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { Spinner, FullPageLoader } from "@/components/ui/loader";
import { useToast } from "@/hooks/use-toast";

// Extend window type for PayPal SDK
declare global {
  interface Window {
    paypal?: any;
  }
}

const PAYPAL_CLIENT_ID = "AZ3-_vosN0BKwL6cU8xa515oeNMdDhPY7zfJKufNH0DA9p1SloCNhF8yRhmSIHXLBlj71Km2ePeYQe2y";
const CREDITS_PER_DOLLAR = 100; // 1 credit = $0.01, so 100 credits = $1.00

export default function BillingPage() {
  const { user, loading: authLoading, addCredits } = useAuth();
  const { toast } = useToast();

  const [creditsToPurchase, setCreditsToPurchase] = useState<number>(100); // Default to purchasing 100 credits ($1.00)
  const [isPayPalSdkReady, setIsPayPalSdkReady] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paypalButtonKey, setPaypalButtonKey] = useState(Date.now()); // To force re-render PayPal button

  const dollarAmount = creditsToPurchase / CREDITS_PER_DOLLAR;

  // Function to load PayPal SDK
  useEffect(() => {
    if (window.paypal) {
      console.log("PayPal SDK already loaded.");
      setIsPayPalSdkReady(true);
      return;
    }

    const script = document.createElement("script");
    
    if (!PAYPAL_CLIENT_ID || PAYPAL_CLIENT_ID === "YOUR_SANDBOX_CLIENT_ID_PLACEHOLDER") { 
        console.warn("PayPal Client ID is a placeholder or missing. Please replace it with your actual Sandbox Client ID.");
        setPaymentError("PayPal integration is not fully configured. Please provide a Sandbox Client ID.");
        return;
    }

    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD&disable-funding=credit,card`;
    script.onload = () => {
      setIsPayPalSdkReady(true);
      console.log("PayPal SDK loaded.");
    };
    script.onerror = () => {
      console.error("Failed to load PayPal SDK.");
      setPaymentError("Failed to load PayPal SDK. Please check your internet connection or Client ID.");
      setIsPayPalSdkReady(false);
    };
    document.body.appendChild(script);

    return () => {
      // Basic cleanup
    };
  }, []);


  const renderPayPalButton = useCallback((buttonContainerElement: HTMLElement) => {
    console.log("[renderPayPalButton] Attempting to render. SDK Ready:", isPayPalSdkReady, "Processing:", paymentProcessing, "Credits:", creditsToPurchase);

    // Guard clauses at the beginning of the function
    if (paymentProcessing || !isPayPalSdkReady || !window.paypal || creditsToPurchase <= 0 || !PAYPAL_CLIENT_ID || PAYPAL_CLIENT_ID === "YOUR_SANDBOX_CLIENT_ID_PLACEHOLDER") {
      console.log("[renderPayPalButton] Conditions not met, skipping render. SDKReady:", isPayPalSdkReady, "Processing:", paymentProcessing, "CreditsToPurchase:", creditsToPurchase, "ClientID valid:", !!(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_ID !== "YOUR_SANDBOX_CLIENT_ID_PLACEHOLDER"));
      return;
    }
    setPaymentError(null); 

    // Clear previous buttons from the passed container
    buttonContainerElement.innerHTML = ''; 
    console.log("[renderPayPalButton] Container provided, proceeding to render PayPal buttons.");

    try {
        window.paypal.Buttons({
        createOrder: (_data: any, actions: any) => {
          console.log("[PayPal Buttons] createOrder called.");
          if (creditsToPurchase <= 0) {
            setPaymentError("Please enter a valid amount of credits to purchase.");
            return Promise.reject(new Error("Invalid credit amount"));
          }
          return actions.order.create({
            purchase_units: [{
              amount: {
                value: (creditsToPurchase / CREDITS_PER_DOLLAR).toFixed(2), 
                currency_code: "USD"
              },
              description: `${creditsToPurchase} AutoNest Credits`
            }]
          });
        },
        onApprove: async (_data: any, actions: any) => {
          console.log("[PayPal Buttons] onApprove called.");
          setPaymentProcessing(true);
          setPaymentError(null);
          try {
            const order = await actions.order.capture();
            console.log("PayPal Order Captured:", order);
            await addCredits(creditsToPurchase);
            toast({
              title: "Purchase Successful!",
              description: `${creditsToPurchase} credits have been added to your account. Transaction ID: ${order.id}`,
            });
            setCreditsToPurchase(100); // Reset to default
            setPaypalButtonKey(Date.now()); // Force re-render with a new key
          } catch (err: any) {
            console.error("[PayPal Buttons] Error processing PayPal payment (onApprove):", err);
            setPaymentError(`Payment failed: ${err.message || "Unknown error"}`);
            toast({
              title: "Payment Failed",
              description: `Could not process your payment. ${err.message || "Please try again."}`,
              variant: "destructive",
            });
          } finally {
            setPaymentProcessing(false);
          }
        },
        onCancel: () => {
            console.log("[PayPal Buttons] onCancel triggered (user closed window or cancelled).");
            setPaymentError("Payment process was cancelled by user.");
            toast({
                title: "Payment Cancelled",
                description: "You have cancelled the payment process.",
                variant: "default", 
            });
            setPaymentProcessing(false);
        },
        onError: (err: any) => {
          console.error("[PayPal Buttons] onError triggered. Raw error:", err); 
          const message = err.message ? String(err.message).toLowerCase() : "";
          
          if (message.includes("window closed") || message.includes("popup closed")) {
            console.log("[PayPal Buttons] onError: Detected window closed/popup closed. Treating as cancellation.");
            setPaymentError("Payment process was cancelled or the window was closed before completion.");
            toast({
              title: "Payment Cancelled",
              description: "The payment window was closed before completion.",
              variant: "default",
            });
          } else if (message.includes("can not open popup window - blocked")) {
            console.error("[PayPal Buttons] onError: Popup window blocked.");
            setPaymentError("PayPal popup window was blocked. Please check your browser settings and disable popup blockers for this site.");
            toast({
              title: "Popup Blocked",
              description: "PayPal popup window was blocked. Please disable popup blockers and try again.",
              variant: "destructive",
            });
          }
          else {
            console.error("[PayPal Buttons] onError: Non-cancellation/non-popup-block error:", err.message || err);
            setPaymentError(`PayPal Error: ${err.message || "An error occurred with PayPal."}`);
            toast({
              title: "PayPal Error",
              description: `An error occurred: ${err.message || "Please try again."}`,
              variant: "destructive",
            });
          }
          setPaymentProcessing(false); 
        },
        style: {
            layout: 'vertical',
            color:  'blue',
            shape:  'rect',
            label:  'paypal'
        }
      }).render(buttonContainerElement).catch((renderError: any) => { // Render to the passed element
        console.error("[renderPayPalButton] Error during PayPal Buttons .render():", renderError);
        setPaymentError("Failed to render PayPal buttons. This could be due to configuration or network issues.");
      });
      console.log("[renderPayPalButton] PayPal buttons .render() called.");
    } catch (error) {
        console.error("[renderPayPalButton] General error rendering PayPal buttons:", error);
        setPaymentError("Could not initialize PayPal buttons. Ensure SDK is loaded and configured correctly.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPayPalSdkReady, creditsToPurchase, addCredits, toast, paymentProcessing]);

  // Effect to render PayPal button when SDK is ready or creditsToPurchase changes, and not processing
  useEffect(() => {
    if (isPayPalSdkReady && !paymentProcessing && creditsToPurchase > 0 && PAYPAL_CLIENT_ID && PAYPAL_CLIENT_ID !== "YOUR_SANDBOX_CLIENT_ID_PLACEHOLDER") {
      console.log("[useEffect for renderPayPalButton] Conditions met. Key:", paypalButtonKey);
      const container = document.getElementById("paypal-button-container");
      if (container) {
        console.log("[useEffect for renderPayPalButton] Container found, calling renderPayPalButton.");
        renderPayPalButton(container); // Pass the container element
      } else {
        console.log("[useEffect for renderPayPalButton] Container not yet in DOM, will retry on next render if key changes or conditions update.");
      }
    } else {
      console.log("[useEffect for renderPayPalButton] Conditions NOT met, skipping renderPayPalButton. SDKReady:", isPayPalSdkReady, "Processing:", paymentProcessing, "Credits:", creditsToPurchase, "Key:", paypalButtonKey);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPayPalSdkReady, paymentProcessing, creditsToPurchase, paypalButtonKey, renderPayPalButton]);


  const handleCreditAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setCreditsToPurchase(isNaN(value) || value < 1 ? 1 : value); // Min 1 credit
  };

  // Refresh PayPal button if amount changes by updating the key
  const handleAmountBlur = () => {
    if (!paymentProcessing) { 
        setPaypalButtonKey(Date.now());
        console.log("[handleAmountBlur] paypalButtonKey updated to force re-render.");
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

  const displayedDollarValue = typeof user.credits === 'number' ? (user.credits / CREDITS_PER_DOLLAR).toFixed(2) : '0.00';

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
              Securely add credits to your account using PayPal Sandbox. (1 Credit = $0.01 USD)
            </CardDescription>
             {(!PAYPAL_CLIENT_ID || PAYPAL_CLIENT_ID === "YOUR_SANDBOX_CLIENT_ID_PLACEHOLDER") && (
                <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>PayPal Not Configured</AlertTitle>
                    <AlertDescription>
                    The PayPal Client ID is a placeholder or missing. This section will not function until a valid Sandbox Client ID is provided in the code.
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
                  onBlur={handleAmountBlur} 
                  min="1"
                  className="text-lg p-3"
                  disabled={paymentProcessing || !isPayPalSdkReady}
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
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{paymentError}</AlertDescription>
              </Alert>
            )}

            {isPayPalSdkReady && PAYPAL_CLIENT_ID && PAYPAL_CLIENT_ID !== "YOUR_SANDBOX_CLIENT_ID_PLACEHOLDER" ? (
              paymentProcessing ? (
                <div className="flex items-center justify-center p-4">
                  <Spinner size={32} />
                  <p className="ml-2">Processing payment...</p>
                </div>
              ) : (
                <div id="paypal-button-container" key={paypalButtonKey}>
                   {creditsToPurchase <= 0 && <p className="text-sm text-destructive text-center py-2">Enter a valid amount of credits.</p>}
                </div>
              )
            ) : (
              !isPayPalSdkReady && PAYPAL_CLIENT_ID && PAYPAL_CLIENT_ID !== "YOUR_SANDBOX_CLIENT_ID_PLACEHOLDER" && (
                <div className="flex items-center justify-center p-4">
                  <Spinner size={32} />
                  <p className="ml-2">Loading PayPal SDK...</p>
                </div>
              )
            )}
             {!isPayPalSdkReady && paymentError && (!PAYPAL_CLIENT_ID || PAYPAL_CLIENT_ID === "YOUR_SANDBOX_CLIENT_ID_PLACEHOLDER") && ( 
                <Button onClick={() => window.location.reload()} variant="outline">
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

        {/* Existing Payment Methods and History Cards - can be expanded later */}
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
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Payment Method (Soon)
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

    

    