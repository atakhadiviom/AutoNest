
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
      console.log("PayPal SDK loaded successfully.");
    };
    script.onerror = () => {
      console.error("Failed to load PayPal SDK. Check Client ID and network.");
      setPaymentError("Failed to load PayPal SDK. Please check your internet connection or Client ID configuration.");
      setIsPayPalSdkReady(false);
    };
    document.body.appendChild(script);

    return () => {
      // Basic cleanup - consider removing the script if the component unmounts, though usually not critical
    };
  }, []);


  const renderPayPalButton = useCallback((buttonContainerElement: HTMLElement) => {
    console.log("[renderPayPalButton] Attempting to render. SDK Ready:", isPayPalSdkReady, "Processing:", paymentProcessing, "Credits:", creditsToPurchase, "Valid Client ID:", !!(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_ID !== "YOUR_SANDBOX_CLIENT_ID_PLACEHOLDER"));

    if (paymentProcessing || !isPayPalSdkReady || !window.paypal || creditsToPurchase <= 0 || !PAYPAL_CLIENT_ID || PAYPAL_CLIENT_ID === "YOUR_SANDBOX_CLIENT_ID_PLACEHOLDER") {
      console.log("[renderPayPalButton] Conditions not met, skipping render. SDKReady:", isPayPalSdkReady, "Processing:", paymentProcessing, "CreditsToPurchase:", creditsToPurchase, "ClientID valid:", !!(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_ID !== "YOUR_SANDBOX_CLIENT_ID_PLACEHOLDER"));
      if (creditsToPurchase <= 0 && document.getElementById("paypal-button-container")) { // only show this message if container exists
         buttonContainerElement.innerHTML = '<p class="text-sm text-destructive text-center py-2">Enter a valid amount of credits to purchase.</p>';
      }
      return;
    }
    setPaymentError(null); 

    buttonContainerElement.innerHTML = ''; 
    console.log("[renderPayPalButton] Container provided, proceeding to render PayPal buttons.");

    try {
        window.paypal.Buttons({
        createOrder: (_data: any, actions: any) => {
          console.log("[PayPal Buttons] createOrder called. Amount:", (creditsToPurchase / CREDITS_PER_DOLLAR).toFixed(2));
          if (creditsToPurchase <= 0) {
            setPaymentError("Please enter a valid amount of credits to purchase.");
            return Promise.reject(new Error("Invalid credit amount for PayPal order."));
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
          console.log("[PayPal Buttons] onApprove called. Data from PayPal:", _data);
          setPaymentProcessing(true);
          setPaymentError(null);
          try {
            const order = await actions.order.capture();
            console.log("PayPal Order Captured (This is the SUCCESS RESPONSE from PayPal after payment):", JSON.stringify(order, null, 2));
            await addCredits(creditsToPurchase);
            toast({
              title: "Purchase Successful!",
              description: `${creditsToPurchase} credits have been added to your account. Transaction ID: ${order.id}`,
            });
            setCreditsToPurchase(100); 
            setPaypalButtonKey(Date.now()); 
          } catch (err: any) {
            console.error("[PayPal Buttons] Error during actions.order.capture() (This is an ERROR RESPONSE/STATE from PayPal after approval attempt):", err);
            setPaymentError(`Payment failed during capture: ${err.message || "Unknown error during capture."}`);
            toast({
              title: "Payment Failed",
              description: `Could not process your payment after approval. ${err.message || "Please try again."}`,
              variant: "destructive",
            });
          } finally {
            setPaymentProcessing(false);
          }
        },
        onCancel: () => {
            console.log("[PayPal Buttons] onCancel triggered (user closed window or cancelled payment).");
            setPaymentError("Payment process was cancelled by user.");
            toast({
                title: "Payment Cancelled",
                description: "You have cancelled the payment process.",
                variant: "default", 
            });
            setPaymentProcessing(false);
        },
        onError: (err: any) => {
          console.error("[PayPal Buttons] onError triggered (This indicates an ERROR from PayPal before or during the payment flow). Raw error object:", err); 
          const message = err.message ? String(err.message).toLowerCase() : "";
          
          if (message.includes("window closed") || message.includes("popup closed")) {
            console.log("[PayPal Buttons] onError: Detected PayPal window closed by user or popup interaction. Treating as cancellation.");
            setPaymentError("Payment process was cancelled or the window was closed before completion.");
            toast({
              title: "Payment Cancelled",
              description: "The payment window was closed before completion.",
              variant: "default",
            });
          } else if (message.includes("can not open popup window - blocked")) {
            console.error("[PayPal Buttons] onError: Popup window blocked by browser.");
            setPaymentError("PayPal popup window was blocked. Please check your browser settings and disable popup blockers for this site, then try again.");
            toast({
              title: "Popup Blocked",
              description: "PayPal popup window was blocked. Please disable popup blockers and try again.",
              variant: "destructive",
            });
          }
          else {
            console.error("[PayPal Buttons] onError: Non-cancellation/non-popup-block error:", err.message || err);
            setPaymentError(`PayPal Error: ${err.message || "An unspecified error occurred with PayPal."}`);
            toast({
              title: "PayPal Error",
              description: `An error occurred with PayPal: ${err.message || "Please try again or contact support."}`,
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
      }).render(buttonContainerElement).catch((renderError: any) => {
        console.error("[renderPayPalButton] Error during PayPal Buttons .render() call:", renderError);
        setPaymentError("Failed to render PayPal buttons. This could be due to configuration, network issues, or an issue with the PayPal SDK itself. Check console for details.");
      });
      console.log("[renderPayPalButton] PayPal buttons .render() called on container:", buttonContainerElement);
    } catch (error) {
        console.error("[renderPayPalButton] General error trying to set up PayPal buttons:", error);
        setPaymentError("Could not initialize PayPal buttons. Ensure SDK is loaded and configured correctly, and check for browser console errors from PayPal.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPayPalSdkReady, creditsToPurchase, addCredits, toast, paymentProcessing]); // paymentProcessing added

  useEffect(() => {
    if (isPayPalSdkReady && !paymentProcessing && creditsToPurchase > 0 && PAYPAL_CLIENT_ID && PAYPAL_CLIENT_ID !== "YOUR_SANDBOX_CLIENT_ID_PLACEHOLDER") {
      console.log("[useEffect for renderPayPalButton] Conditions met. Key:", paypalButtonKey, "Attempting to find container...");
      const container = document.getElementById("paypal-button-container");
      if (container) {
        console.log("[useEffect for renderPayPalButton] Container 'paypal-button-container' found, calling renderPayPalButton.");
        renderPayPalButton(container);
      } else {
        console.warn("[useEffect for renderPayPalButton] Container 'paypal-button-container' NOT YET in DOM. PayPal buttons will not render yet. This can happen on initial load if amount is 0 or conditions change rapidly.");
      }
    } else {
      console.log("[useEffect for renderPayPalButton] Conditions NOT met for rendering PayPal button. SDKReady:", isPayPalSdkReady, "Processing:", paymentProcessing, "Credits:", creditsToPurchase, "Key:", paypalButtonKey);
       const container = document.getElementById("paypal-button-container");
        if (container && creditsToPurchase <= 0) {
             container.innerHTML = '<p class="text-sm text-destructive text-center py-2">Enter a valid amount of credits to purchase.</p>';
        } else if (container && (!PAYPAL_CLIENT_ID || PAYPAL_CLIENT_ID === "YOUR_SANDBOX_CLIENT_ID_PLACEHOLDER")) {
             // Error about client ID is handled by the main alert
        } else if (container && !isPayPalSdkReady && PAYPAL_CLIENT_ID && PAYPAL_CLIENT_ID !== "YOUR_SANDBOX_CLIENT_ID_PLACEHOLDER") {
            // SDK loading message is handled elsewhere
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPayPalSdkReady, paymentProcessing, creditsToPurchase, paypalButtonKey, renderPayPalButton]);


  const handleCreditAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setCreditsToPurchase(isNaN(value) || value < 1 ? 1 : value); 
  };

  const handleAmountBlur = () => {
    if (!paymentProcessing) { 
        console.log("[handleAmountBlur] Amount changed. Updating paypalButtonKey to force re-render PayPal button with new amount.");
        setPaypalButtonKey(Date.now());
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
                  disabled={paymentProcessing || !isPayPalSdkReady || !PAYPAL_CLIENT_ID || PAYPAL_CLIENT_ID === "YOUR_SANDBOX_CLIENT_ID_PLACEHOLDER"}
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
                <AlertTitle>Payment System Error</AlertTitle>
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
                // This container MUST exist for PayPal buttons to render. 
                // Its content is managed by renderPayPalButton or the useEffect that calls it.
                <div id="paypal-button-container" key={paypalButtonKey}>
                   {/* Placeholder content for when buttons aren't rendered yet by PayPal script */}
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
             {!isPayPalSdkReady && paymentError && PAYPAL_CLIENT_ID && PAYPAL_CLIENT_ID !== "YOUR_SANDBOX_CLIENT_ID_PLACEHOLDER" && ( 
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


    