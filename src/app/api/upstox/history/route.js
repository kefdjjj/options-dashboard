import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const instrumentKey = searchParams.get('instrumentKey');
  const interval = searchParams.get('interval') || '5minute';

  if (!instrumentKey) {
    return NextResponse.json({ error: 'Missing instrumentKey parameter' }, { status: 400 });
  }

  const authHeader = request.headers.get('authorization');
  const clientToken = authHeader ? authHeader.replace('Bearer ', '') : null;
  const accessToken = clientToken || process.env.UPSTOX_ACCESS_TOKEN;

  if (!accessToken) {
    return NextResponse.json({ error: 'UPSTOX_ACCESS_TOKEN is not configured.' }, { status: 500 });
  }

  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(toDate.getDate() - 30); // last 30 days
  
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const toDateStr = formatDate(toDate);
  const fromDateStr = formatDate(fromDate);

  try {
    const headers = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    };

    const encodedKey = encodeURIComponent(instrumentKey);
    const [intradayRes, historicalRes] = await Promise.all([
      fetch(`https://api.upstox.com/v2/historical-candle/intraday/${encodedKey}/${interval}`, { method: 'GET', headers }),
      fetch(`https://api.upstox.com/v2/historical-candle/${encodedKey}/${interval}/${toDateStr}/${fromDateStr}`, { method: 'GET', headers })
    ]);

    const safeJson = async (res) => {
      try {
        const text = await res.text();
        return text ? JSON.parse(text) : null;
      } catch (e) {
        return null;
      }
    };

    const intradayData = await safeJson(intradayRes);
    const historicalData = await safeJson(historicalRes);

    if (!intradayData?.data?.candles && !historicalData?.data?.candles) {
      const errorMsg = intradayData?.errors?.[0]?.message || intradayData?.message || 'Failed to fetch history';
      return NextResponse.json({ error: errorMsg }, { status: intradayRes.status || 400 });
    }

    let combinedCandles = [];
    if (intradayData?.data?.candles) {
      combinedCandles = combinedCandles.concat(intradayData.data.candles);
    }
    if (historicalData?.data?.candles) {
      // Intraday contains today's candles. Historical contains up to yesterday.
      // Both are sorted descending (latest first).
      combinedCandles = combinedCandles.concat(historicalData.data.candles);
    }

    // Deduplicate candles by timestamp (index 0)
    const uniqueMap = new Map();
    combinedCandles.forEach(candle => {
      if (!uniqueMap.has(candle[0])) {
        uniqueMap.set(candle[0], candle);
      }
    });

    const finalCandles = Array.from(uniqueMap.values());
    finalCandles.sort((a, b) => new Date(b[0]) - new Date(a[0])); // ensure descending order

    return NextResponse.json({
      status: 'success',
      data: { candles: finalCandles }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
