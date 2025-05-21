
import { NextRequest, NextResponse } from 'next/server';
import paypal from '@paypal/checkout-server-sdk';
import { auth as adminAuth, db as adminDb } from '@/lib/firebase-admin'; // Assuming admin SDK setup
import { FieldValue } from 'firebase-admin/firestore';


// Helper function to configure PayPal client
function getPayPalClient() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const environment = process.env.PAYPAL_ENVIRONMENT === 'live'
    ? new paypal.core.LiveEnvironment(clientId!, clientSecret!)
    : new paypal.core.SandboxEnvironment(clientId!, clientSecret!);

  if (!clientId || !clientSecret) {
    throw new Error('PayPal Client ID or Secret not configured in environment variables.');
  }

  return new paypal.core.PayPalHttpClient(environment);
}

export async function POST(req: NextRequest) {
  try {
    const { orderID, creditsToPurchase, userUID } = await req.json();

    if (!orderID) {
      return NextResponse.json({ error: 'Missing orderID.' }, { status: 400 });
    }
    if (!creditsToPurchase || typeof creditsToPurchase !== 'number' || creditsToPurchase <= 0) {
        return NextResponse.json({ error: 'Invalid creditsToPurchase specified.' }, { status: 400 });
    }
    if (!userUID) {
        return NextResponse.json({ error: 'Missing userUID for credit update.' }, { status: 400 });
    }


    const client = getPayPalClient();
    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    // @ts-ignore According to PayPal docs, requestBody can be an empty object for capture
    request.requestBody({}); 

    const response = await client.execute(request);
    const capture = response.result;

    console.log(`[API Capture Payment] PayPal Payment Captured. Status: ${capture.status}, ID: ${capture.id}`);

    if (capture.status === 'COMPLETED') {
      // **IMPORTANT: Securely update user credits in Firestore using Firebase Admin SDK**
      // The following uses the client-side 'db' for conceptual demonstration if Admin SDK is not set up.
      // In a production environment, you MUST use the Firebase Admin SDK initialized in your server environment
      // to update Firestore with elevated privileges, bypassing client-side security rules.
      
      // --- Firebase Admin SDK (Preferred and Required for Production) ---
      try {
        const userDocRef = adminDb.collection('users').doc(userUID);
        await userDocRef.update({
          credits: FieldValue.increment(creditsToPurchase)
        });
        console.log(`[API Capture Payment] Successfully updated credits for user ${userUID} by ${creditsToPurchase} via Admin SDK.`);
      } catch (adminError) {
        console.error(`[API Capture Payment] CRITICAL: Failed to update credits for user ${userUID} via Admin SDK after successful PayPal capture. Manual intervention required. Error:`, adminError);
        // Potentially, you might want to refund the PayPal transaction if credit update fails critically.
        // This is a complex part of production systems.
        // Example: Call the PayPal refund API here if needed.

        return NextResponse.json({
            error: 'Payment captured but failed to update credits. Please contact support.',
            // Provide more details about the specific database error if needed, but be cautious not to expose sensitive information.
            // adminError: adminError.message // Example: include error message
            paypalCaptureId: capture.id 
        }, { status: 500 });
      }
      // --- End Firebase Admin SDK ---
      
      // If not using Admin SDK (e.g. still prototyping the API route with client SDK for Firestore):
      // This is NOT secure for production credit updates as it relies on client-side rules.
      // The following commented-out code is for reference only and should NOT be used in production.
      // console.warn("[API Capture Payment] Attempting Firestore update with client SDK. THIS IS INSECURE FOR PRODUCTION CREDIT UPDATES.");
      // try {
      //    const { db } = await import('@/lib/firebase'); // Client SDK
      //    const { doc, updateDoc, increment } = await import('firebase/firestore');
      //    const userDocRef = doc(db, "users", userUID);
      //    await updateDoc(userDocRef, { credits: increment(creditsToPurchase) });
      //    console.log(`[API Capture Payment] Successfully updated credits for user ${userUID} by ${creditsToPurchase} (using client SDK - for dev).`);
      // } catch (firestoreError: any) {
      //     console.error(`[API Capture Payment] Failed to update credits for user ${userUID} using client SDK. Error:`, firestoreError);
      //     return NextResponse.json({ 
      //       error: 'Payment captured but failed to update credits (client SDK). Please contact support.', 
      //       paypalCaptureId: capture.id,
      //       firestoreErrorCode: firestoreError.code 
      //     }, { status: 500 });
      // }
      // For now, we will just return success and let the client call its addCredits function.
      // This keeps the credit update logic in one place (AuthContext) for this prototype stage.

      return NextResponse.json({ 
        message: 'Payment captured successfully and credits updated.',
        paypalCaptureId: capture.id,
        status: capture.status
      });

    } else {
      console.warn(`[API Capture Payment] PayPal payment captured but status is not COMPLETED. Status: ${capture.status}`);
      return NextResponse.json({ error: `Payment status: ${capture.status}`, details: capture }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[API Capture Payment] Error capturing PayPal payment:', error);
    if (error.isAxiosError && error.response && error.response.data) {
        console.error('[API Capture Payment] PayPal Error Details:', error.response.data);
        return NextResponse.json({ error: 'Failed to capture PayPal payment.', details: error.response.data.message || error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to capture PayPal payment.', details: error.message }, { status: 500 });
  }
}
