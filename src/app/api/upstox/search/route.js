import { NextResponse } from 'next/server';
import https from 'https';
import zlib from 'zlib';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  
  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
  }

  return new Promise((resolve) => {
    const options = {
      hostname: 'assets.upstox.com',
      path: '/market-quote/instruments/exchange/MCX.csv.gz',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    };

    https.get(options, (res) => {
      if (res.statusCode !== 200) {
        resolve(NextResponse.json({ error: `Upstox CSV returned ${res.statusCode}` }, { status: 500 }));
        return;
      }
      
      const gunzip = zlib.createGunzip();
      res.pipe(gunzip);
      
      let data = '';
      gunzip.on('data', (chunk) => {
        data += chunk.toString();
      });
      
      gunzip.on('end', () => {
        const lines = data.split('\n');
        const matches = lines.filter(l => l.includes(query.toUpperCase()) && !l.includes('OPTFUT') && l.includes('FUT'));
        
        if (matches.length === 0) {
           resolve(NextResponse.json({ status: 'error', data: [] }));
           return;
        }

        // Format: instrument_key,exchange_token,tradingsymbol,name,last_price,expiry,strike,tick_size,lot_size,instrument_type,option_type,exchange
        const contracts = matches.slice(0, 10).map(l => {
          const parts = l.split(',');
          return {
             instrument_key: parts[0]?.replace(/"/g, ''),
             exchange_token: parts[1]?.replace(/"/g, ''),
             trading_symbol: parts[2]?.replace(/"/g, ''),
             name: parts[3]?.replace(/"/g, ''),
             segment: 'MCX_FO'
          };
        });

        resolve(NextResponse.json({ status: 'success', data: contracts }));
      });

      gunzip.on('error', (e) => {
        resolve(NextResponse.json({ error: e.message }, { status: 500 }));
      });
    }).on('error', (e) => {
      resolve(NextResponse.json({ error: e.message }, { status: 500 }));
    });
  });
}
