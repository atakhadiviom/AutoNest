
// This file is now obsolete as PayPal logic has been removed.
// The functionality was previously moved to Firebase Cloud Functions,
// and now PayPal integration is entirely removed.
// This file can be deleted.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  console.warn("[Next.js API Route] /api/paypal/create-order called, but PayPal integration has been removed.");
  return NextResponse.json(
    { error: 'This API route is obsolete. PayPal functionality has been removed.' },
    { status: 410 } // 410 Gone
  );
}
