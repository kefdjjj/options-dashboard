import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const instrumentKey = searchParams.get('instrumentKey') || 'NSE_INDEX|Nifty 50';
  const expiryDate = searchParams.get('expiryDate');

  if (!expiryDate) {
    return NextResponse.json({ error: 'Missing expiryDate parameter' }, { status: 400 });
  }

  const authHeader = request.headers.get('authorization');
  const clientToken = authHeader ? authHeader.replace('Bearer ', '') : null;
  const accessToken = clientToken || process.env.UPSTOX_ACCESS_TOKEN;

  if (!accessToken) {
    return NextResponse.json({ error: 'UPSTOX_ACCESS_TOKEN is not configured.' }, { status: 500 });
  }

  try {
    const response = await fetch(`https://api.upstox.com/v2/option/chain?instrument_key=${encodeURIComponent(instrumentKey)}&expiry_date=${encodeURIComponent(expiryDate)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.errors?.[0]?.message || data?.message || 'Failed to fetch option chain';
      return NextResponse.json({ error: errorMsg }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
