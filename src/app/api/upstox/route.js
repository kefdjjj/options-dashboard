import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const instrumentKey = searchParams.get('instrumentKey');
  // In a real implementation, you might pass 'index', 'strike', 'type' 
  // and map it to an instrumentKey here instead of relying on the client to know it.

  if (!instrumentKey) {
    return NextResponse.json({ error: 'Missing instrumentKey parameter' }, { status: 400 });
  }

  const accessToken = process.env.UPSTOX_ACCESS_TOKEN;

  if (!accessToken) {
    // We return a specific error code so the frontend knows to fallback to mock data
    // or display a warning to the user.
    return NextResponse.json({ 
      error: 'UPSTOX_ACCESS_TOKEN is not configured in .env.local',
      mock_fallback: true 
    }, { status: 500 });
  }

  try {
    // Example: Fetch market quote from Upstox
    const response = await fetch(`https://api.upstox.com/v2/market-quote/quotes?instrument_key=${instrumentKey}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.message || 'Failed to fetch from Upstox API' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
