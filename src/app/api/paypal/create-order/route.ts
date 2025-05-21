
import { NextRequest, NextResponse } from 'next/server';
import paypal from '@paypal/checkout-server-sdk';

// Helper function to configure PayPal client
function getPayPalClient() {
  const clientId = process.env.PAYPAL_CLIENT_ID; // Server-side, no NEXT_PUBLIC_
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const environment = process.env.PAYPAL_ENVIRONMENT === 'live'
    ? new paypal.core.LiveEnvironment(clientId!, clientSecret!)
    : new paypal.core.SandboxEnvironment(clientId!, clientSecret!);
  
  if (!clientId || !clientSecret) {
    console.error('[API Create Order] PayPal Client ID or Secret not configured in server environment variables.');
    throw new Error('PayPal Client ID or Secret not configured.');
  }
  
  return new paypal.core.PayPalHttpClient(environment);
}

export async function POST(req: NextRequest) {
  try {
    const { dollarAmount, creditsToPurchase } = await req.json();

    if (!dollarAmount || typeof dollarAmount !== 'number' || dollarAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount specified.' }, { status: 400 });
    }
    if (!creditsToPurchase || typeof creditsToPurchase !== 'number' || creditsToPurchase <= 0) {
        return NextResponse.json({ error: 'Invalid creditsToPurchase specified.' }, { status: 400 });
    }

    const client = getPayPalClient();
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: dollarAmount.toFixed(2), // Ensure two decimal places
          },
          description: `${creditsToPurchase} AutoNest Credits`,
          // You could add more item details here if needed
          // custom_id: can be used to pass internal identifiers
        },
      ],
      // application_context: { // Optional: Can be used for branding, return URLs for server-side redirect flows
      //   brand_name: 'AutoNest',
      //   landing_page: 'LOGIN',
      //   user_action: 'PAY_NOW',
      // }
    });

    const response = await client.execute(request);
    console.log(`[API Create Order] PayPal Order Created: ${response.result.id}`);
    return NextResponse.json({ id: response.result.id });

  } catch (error: any) {
    console.error('[API Create Order] Error creating PayPal order:', error);
    // Check if it's a PayPal API error
    if (error.isAxiosError && error.response && error.response.data) { // PayPal SDK uses Axios-like errors
        console.error('[API Create Order] PayPal Error Details:', error.response.data);
        return NextResponse.json({ error: 'Failed to create PayPal order.', details: error.response.data.message || error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to create PayPal order.', details: error.message }, { status: 500 });
  }
}
