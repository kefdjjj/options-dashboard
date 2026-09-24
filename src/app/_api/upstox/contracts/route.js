import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const underlyingKey = searchParams.get('underlyingKey') || 'NSE_INDEX|Nifty 50'; // NSE_INDEX|Nifty 50 or BSE_INDEX|SENSEX

  const authHeader = request.headers.get('authorization');
  const clientToken = authHeader ? authHeader.replace('Bearer ', '') : null;
  const accessToken = clientToken || process.env.UPSTOX_ACCESS_TOKEN;

  if (!accessToken) {
    return NextResponse.json({ error: 'UPSTOX_ACCESS_TOKEN is not configured.' }, { status: 500 });
  }

  try {
    const response = await fetch(`https://api.upstox.com/v2/option/contract?instrument_key=${encodeURIComponent(underlyingKey)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.errors?.[0]?.message || data?.message || 'Failed to fetch contracts';
      return NextResponse.json({ error: errorMsg }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
