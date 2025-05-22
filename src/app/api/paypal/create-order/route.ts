// This file is now obsolete as the logic has been moved to Firebase Cloud Functions
// in the /functions directory. It can be deleted.

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  return NextResponse.json({ error: 'This API route is obsolete. Use the Firebase Cloud Function endpoint.' }, { status: 410 });
}
