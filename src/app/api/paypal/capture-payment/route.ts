
import { NextRequest, NextResponse } from 'next/server';
import paypal from '@paypal/checkout-server-sdk';
// Use db and FieldValue from firebase-admin for server-side operations
import { db as adminDb, FieldValue as AdminFieldValue } from '@/lib/firebase-admin';


// Helper function to configure PayPal client
function getPayPalClient() {
  const clientId = process.env.PAYPAL_CLIENT_ID; // Server-side
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const environment = process.env.PAYPAL_ENVIRONMENT === 'live'
    ? new paypal.core.LiveEnvironment(clientId!, clientSecret!)
    : new paypal.core.SandboxEnvironment(clientId!, clientSecret!);

  if (!clientId || !clientSecret) {
    console.error('[API Capture Payment] PayPal Client ID or Secret not configured in server environment variables.');
    throw new Error('PayPal Client ID or Secret not configured.');
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
      try {
        // Ensure Firebase Admin SDK is initialized
        if (!adminDb.app) { // Check if admin app is initialized
            console.error("[API Capture Payment] CRITICAL: Firebase Admin SDK is not initialized. Cannot update credits.");
            // Potentially, you might want to refund the PayPal transaction here if credit update is absolutely critical
            // and cannot be reconciled later. This is a complex production decision.
            return NextResponse.json({
                error: 'Payment captured but failed to update credits due to server configuration issue. Please contact support.',
                paypalCaptureId: capture.id 
            }, { status: 500 });
        }

        const userDocRef = adminDb.collection('users').doc(userUID);
        await userDocRef.update({
          credits: AdminFieldValue.increment(creditsToPurchase)
        });
        console.log(`[API Capture Payment] Successfully updated credits for user ${userUID} by ${creditsToPurchase} via Admin SDK.`);
      } catch (adminError: any) {
        console.error(`[API Capture Payment] CRITICAL: Failed to update credits for user ${userUID} via Admin SDK after successful PayPal capture. Manual intervention required. Error:`, adminError);
        // Consider refunding or logging for manual reconciliation
        return NextResponse.json({
            error: 'Payment captured but failed to update credits. Please contact support.',
            paypalCaptureId: capture.id,
            adminErrorCode: adminError.code // Provide a hint of the admin error
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        message: 'Payment captured successfully and credits updated on server.',
        paypalCaptureId: capture.id,
        status: capture.status
      });

    } else {
      // Handle other capture statuses if necessary, e.g., PENDING
      console.warn(`[API Capture Payment] PayPal payment captured but status is not COMPLETED. Status: ${capture.status}`);
      // Potentially, if status is an error or requires user action, you might want to handle it differently
      // For INSTRUMENT_DECLINED, PayPal recommends actions.restart() on client, but this is server-side.
      // The client SDK should handle restart based on this response.
      return NextResponse.json({ 
        error: `Payment status: ${capture.status}`, 
        details: capture,
        paypalCaptureId: capture.id 
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[API Capture Payment] Error capturing PayPal payment:', error);
    let errorDetails = error.message;
    let statusCode = 500;

    if (error.isAxiosError && error.response && error.response.data) {
        console.error('[API Capture Payment] PayPal Error Details:', error.response.data);
        errorDetails = error.response.data.message || error.message;
        if(error.response.data.name === 'INSTRUMENT_DECLINED'){
            // For INSTRUMENT_DECLINED from PayPal, we can return a more specific error code.
            // The client-side can use this to prompt the user to try a different payment method.
            return NextResponse.json({ 
                error: 'Payment method declined by PayPal.', 
                paypalError: error.response.data, // Send full PayPal error
                details: error.response.data.details 
            }, { status: 402 }); // 402 Payment Required (or a custom code)
        }
        statusCode = error.response.status || 500;
    }
    
    return NextResponse.json({ error: 'Failed to capture PayPal payment.', details: errorDetails }, { status: statusCode });
  }
}
