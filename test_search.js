const https = require('https');
const zlib = require('zlib');
const query = 'SILVER';

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
    console.log('Failed:', res.statusCode);
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
    const matches = lines.filter(l => l.includes(query.toUpperCase()) && l.includes('FUT'));
    console.log('Matches length:', matches.length);
    if (matches.length > 0) {
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
      console.log(contracts[0]);
    }
  });
}).on('error', (e) => console.log('Error:', e));
