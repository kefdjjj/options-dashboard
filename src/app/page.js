"use client";

import React, { useState, useEffect, useRef, Component } from 'react';
import { createChart, CandlestickSeries, LineSeries, HistogramSeries, createSeriesMarkers } from 'lightweight-charts';
import { RSI, SMA, EMA, SD } from 'technicalindicators';
import { TrendingUp, TrendingDown, Activity, DollarSign, Clock, BarChart3, ChevronDown, AlertCircle, Loader2, Settings, X, SlidersHorizontal, ListChecks, Sun, Moon, Maximize2, Minimize2, Search } from 'lucide-react';
import './dashboard.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { this.setState({ errorInfo }); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', margin: '1rem', fontFamily: 'monospace', zIndex: 9999, position: 'relative' }}>
          <h2>Dashboard Component Crashed</h2>
          <p><strong>{this.state.error && this.state.error.toString()}</strong></p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', marginTop: '1rem', background: '#fca5a5', padding: '1rem', borderRadius: '4px' }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', background: '#991b1b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '1rem' }}>Reload App</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const calculateQQEMod = (data) => {
  const close = data.map(d => d.close);
  const time = data.map(d => d.time);
  
  if (close.length < 50) return { histData: [], lineData: [] };
  
  const calcQQE = (rsiLen, smooth, factor) => {
    const wildersLen = rsiLen * 2 - 1;
    const rsiRaw = RSI.calculate({ period: rsiLen, values: close });
    const rsi = new Array(close.length - rsiRaw.length).fill(null).concat(rsiRaw);
    
    const rsiValid = rsi.filter(v => v !== null);
    const smoothedRsiRaw = EMA.calculate({ period: smooth, values: rsiValid });
    const smoothedRsi = new Array(close.length - smoothedRsiRaw.length).fill(null).concat(smoothedRsiRaw);
    
    const atrRsiRaw = [];
    for (let i = 1; i < smoothedRsi.length; i++) {
      if (smoothedRsi[i-1] !== null && smoothedRsi[i] !== null) {
        atrRsiRaw.push(Math.abs(smoothedRsi[i-1] - smoothedRsi[i]));
      } else {
        atrRsiRaw.push(null);
      }
    }
    const atrRsiValid = atrRsiRaw.filter(v => v !== null);
    const smoothedAtrRsiRaw = EMA.calculate({ period: wildersLen, values: atrRsiValid });
    const smoothedAtrRsi = new Array(close.length - smoothedAtrRsiRaw.length).fill(null).concat(smoothedAtrRsiRaw);
    
    const longBand = new Array(close.length).fill(null);
    const shortBand = new Array(close.length).fill(null);
    const trendDirection = new Array(close.length).fill(1);
    const qqeLine = new Array(close.length).fill(null);
    
    for (let i = 1; i < close.length; i++) {
      if (smoothedRsi[i] === null || smoothedAtrRsi[i] === null) continue;
      
      const dynamicAtr = smoothedAtrRsi[i] * factor;
      const newLongBand = smoothedRsi[i] - dynamicAtr;
      const newShortBand = smoothedRsi[i] + dynamicAtr;
      
      const prevLongBand = longBand[i-1] === null ? 0 : longBand[i-1];
      const prevShortBand = shortBand[i-1] === null ? 0 : shortBand[i-1];
      const prevRsi = smoothedRsi[i-1];
      
      longBand[i] = (prevRsi > prevLongBand && smoothedRsi[i] > prevLongBand) ? Math.max(prevLongBand, newLongBand) : newLongBand;
      shortBand[i] = (prevRsi < prevShortBand && smoothedRsi[i] < prevShortBand) ? Math.min(prevShortBand, newShortBand) : newShortBand;
      
      const x_short = (prevRsi < prevShortBand && smoothedRsi[i] > prevShortBand) || (prevRsi > prevShortBand && smoothedRsi[i] < prevShortBand);
      const x_long = (prevLongBand < prevRsi && prevLongBand > smoothedRsi[i]) || (prevLongBand > prevRsi && prevLongBand < smoothedRsi[i]);
      
      let td = trendDirection[i-1];
      if (x_short) td = 1;
      else if (x_long) td = -1;
      
      trendDirection[i] = td;
      qqeLine[i] = td === 1 ? longBand[i] : shortBand[i];
    }
    
    return { qqeLine, smoothedRsi };
  };
  
  const p = calcQQE(6, 5, 3.0);
  const s = calcQQE(6, 5, 1.61);
  
  const bbBase = p.qqeLine.map(v => v !== null ? v - 50 : null);
  const bbBaseValid = bbBase.filter(v => v !== null);
  
  const smaBaseRaw = SMA.calculate({ period: 50, values: bbBaseValid });
  const smaBase = new Array(close.length - smaBaseRaw.length).fill(null).concat(smaBaseRaw);
  
  const sdBaseRaw = SD.calculate({ period: 50, values: bbBaseValid });
  const sdBase = new Array(close.length - sdBaseRaw.length).fill(null).concat(sdBaseRaw);
  
  const histData = [];
  const lineData = [];
  
  for (let i = 0; i < close.length; i++) {
    if (s.qqeLine[i] === null || smaBase[i] === null || sdBase[i] === null) continue;
    
    const bUpper = smaBase[i] + 0.35 * sdBase[i];
    const bLower = smaBase[i] - 0.35 * sdBase[i];
    
    const pRsi50 = p.smoothedRsi[i] - 50;
    const sRsi50 = s.smoothedRsi[i] - 50;
    
    let color = 'rgba(112, 112, 112, 0.4)';
    if (sRsi50 > 3.0 && pRsi50 > bUpper) {
      color = '#00c3ff';
    } else if (sRsi50 < -3.0 && pRsi50 < bLower) {
      color = '#ff0062';
    }
    
    histData.push({ time: time[i], value: sRsi50, color });
    lineData.push({ time: time[i], value: s.qqeLine[i] - 50 });
  }
  
  return { histData, lineData };
};

const HeikinAshiChart = ({ data, timeFrame, setChartInstance }) => {
  const chartContainerRef = useRef(null);
  const chartInstance = useRef(null);
  const seriesRefs = useRef({});

  const [indicators, setIndicators] = useState({ qqe: true });

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: "solid", color: "#1e293b" }, textColor: "#94a3b8" },
      grid: { vertLines: { color: "rgba(51, 65, 85, 0.5)" }, horzLines: { color: "rgba(51, 65, 85, 0.5)" } },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: "#334155" },
    });
    chart.priceScale("right").applyOptions({ borderColor: "#334155", autoScale: true });

    chart.priceScale("qqe").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
      visible: indicators.qqe,
    });

    seriesRefs.current.candle = chart.addSeries(CandlestickSeries, { upColor: "#10b981", downColor: "#ef4444", borderVisible: false, wickUpColor: "#10b981", wickDownColor: "#ef4444" });

    if (indicators.qqe) {
      seriesRefs.current.qqeHist = chart.addSeries(HistogramSeries, { priceScaleId: "qqe", priceFormat: { type: "volume" } });
      seriesRefs.current.qqeLine = chart.addSeries(LineSeries, { color: "#ffffff", lineWidth: 1, priceScaleId: "qqe", title: "QQE Trend" });
    }

    const rawData = [];
    data.forEach((d) => {
      const t = Math.floor(new Date(d.timestamp).getTime() / 1000);
      rawData.push({ time: t, open: d.open, high: d.high, low: d.low, close: d.close, volume: d.volume });
    });

    seriesRefs.current.candle.setData(rawData);

    if (indicators.qqe) {
      const qqeRes = calculateQQEMod(rawData);
      if (seriesRefs.current.qqeHist) seriesRefs.current.qqeHist.setData(qqeRes.histData);
      if (seriesRefs.current.qqeLine) seriesRefs.current.qqeLine.setData(qqeRes.lineData);
    }

    chart.timeScale().fitContent();
    chartInstance.current = chart;
    if (setChartInstance) setChartInstance(chart);

    return () => chart.remove();
  }, [data, timeFrame, indicators]);

  const toggleIndicator = (ind) => setIndicators(prev => ({ ...prev, [ind]: !prev[ind] }));

  return (
    <div className="flex flex-col space-y-4">
      <div ref={chartContainerRef} className="w-full h-[600px] border border-slate-700 rounded-xl overflow-hidden" />
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3 flex items-center space-x-2"><SlidersHorizontal className="w-4 h-4" /><span>Indicators</span></h3>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={indicators.qqe} onChange={() => toggleIndicator("qqe")} className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" />
            <span>QQE MOD</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [selectedIndex, setSelectedIndex] = useState('NIFTY');
  const [underlyingKey, setUnderlyingKey] = useState('NSE_INDEX|Nifty 50');
  const [fullScreenChart, setFullScreenChart] = useState(null);
  
  const [contracts, setContracts] = useState([]);
  const [availableExpiries, setAvailableExpiries] = useState([]);
  const [availableStrikes, setAvailableStrikes] = useState([]);
  
  const [selectedExpiry, setSelectedExpiry] = useState('');
  const [selectedStrike, setSelectedStrike] = useState('');
  const [optionType, setOptionType] = useState('CE');
  const [timeframe, setTimeframe] = useState('1minute');
  const [chartType, setChartType] = useState('Heikin Ashi');
  
  const [chartData, setChartData] = useState([]);
  const [rawChartData, setRawChartData] = useState([]);
  const [currentPremium, setCurrentPremium] = useState(0);
  const [startPremium, setStartPremium] = useState(0);

  const [niftyData, setNiftyData] = useState([]);
  const [niftyRawData, setNiftyRawData] = useState([]);
  const [niftyPremium, setNiftyPremium] = useState(0);
    const [niftyChange, setNiftyChange] = useState(0);

  const [giftNiftyData, setGiftNiftyData] = useState([]);
  const [giftNiftyRawData, setGiftNiftyRawData] = useState([]);
  const [giftNiftyPremium, setGiftNiftyPremium] = useState(0);
  const [giftNiftyChange, setGiftNiftyChange] = useState(0);

  const [bankNiftyData, setBankNiftyData] = useState([]);
  const [bankNiftyRawData, setBankNiftyRawData] = useState([]);
  const [bankNiftyPremium, setBankNiftyPremium] = useState(0);
  const [bankNiftyChange, setBankNiftyChange] = useState(0);

  const [sensexData, setSensexData] = useState([]);
  const [sensexRawData, setSensexRawData] = useState([]);
  const [sensexPremium, setSensexPremium] = useState(0);
  const [sensexChange, setSensexChange] = useState(0);

  const [bankexData, setBankexData] = useState([]);
  const [bankexRawData, setBankexRawData] = useState([]);
  const [bankexPremium, setBankexPremium] = useState(0);
  const [bankexChange, setBankexChange] = useState(0);
  const [bankexSignals, setBankexSignals] = useState(null);
  const [bankexIndicatorValues, setBankexIndicatorValues] = useState(null);

  const [silverData, setSilverData] = useState([]);
  const [silverRawData, setSilverRawData] = useState([]);
  const [silverPremium, setSilverPremium] = useState(0);
  const [silverChange, setSilverChange] = useState(0);
  const [silverSignals, setSilverSignals] = useState(null);
  const [silverIndicatorValues, setSilverIndicatorValues] = useState(null);
  const [silverKey, setSilverKey] = useState('MCX_FO|SILVERMIC24AUGFUT');

  const [metrics, setMetrics] = useState({ oi: 0, iv: 0, delta: 0, theta: 0 });
  const [signals, setSignals] = useState({ rsi: 'NEUTRAL', macd: 'NEUTRAL', vwap: 'NEUTRAL', mavwap: 'NEUTRAL', adx: 'WEAK', ewo: 'NEUTRAL' });
  const [indicatorValues, setIndicatorValues] = useState({ rsi: null, macd: null, vwap: null, mavwap: null, adx: null });
  
  const [niftySignals, setNiftySignals] = useState(null);
  const [niftyIndicatorValues, setNiftyIndicatorValues] = useState(null);
  const [giftNiftySignals, setGiftNiftySignals] = useState(null);
  const [giftNiftyIndicatorValues, setGiftNiftyIndicatorValues] = useState(null);
  const [bankNiftySignals, setBankNiftySignals] = useState(null);
  const [bankNiftyIndicatorValues, setBankNiftyIndicatorValues] = useState(null);
  const [sensexSignals, setSensexSignals] = useState(null);
  const [sensexIndicatorValues, setSensexIndicatorValues] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [userToken, setUserToken] = useState('');
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showIndicatorModal, setShowIndicatorModal] = useState(false);
  const [tempTokenInput, setTempTokenInput] = useState('');
  
  const [indicators, setIndicators] = useState({
    rsi: true, macd: true, vwap: false, mavwap: false, adx: false, ewo: false, pvz: false, utbot: false, utbot3: false, fib: false, elliott: false, smc: false, rsiDiv: false, iez: false, rbt: false, ema: false, nw: false, ew: false, qqe: false
  });
  
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const savedToken = localStorage.getItem('upstoxToken');
    if (savedToken) { setUserToken(savedToken); setTempTokenInput(savedToken); }
    
    const savedTheme = localStorage.getItem('dashboardTheme');
    if (savedTheme) setTheme(savedTheme);
  }, []);

  const saveToken = () => { localStorage.setItem('upstoxToken', tempTokenInput); setUserToken(tempTokenInput); setShowTokenModal(false); setError(null); };
  
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('dashboardTheme', newTheme);
  };
  
  const toggleIndicator = (key) => setIndicators(prev => ({ ...prev, [key]: !prev[key] }));
  const getAuthHeaders = () => userToken ? { 'Authorization': `Bearer ${userToken}` } : {};

  useEffect(() => { setUnderlyingKey(selectedIndex === 'NIFTY' ? 'NSE_INDEX|Nifty 50' : selectedIndex === 'SENSEX' ? 'BSE_INDEX|SENSEX' : 'NSE_INDEX|Nifty Bank'); }, [selectedIndex]);

  useEffect(() => {
    const fetchContracts = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/upstox/contracts?underlyingKey=${encodeURIComponent(underlyingKey)}`, { headers: getAuthHeaders() });
        const result = await res.json();
        if (result.error) throw new Error(result.error);
        if (result.data) {
          setContracts(result.data);
          const expiries = [...new Set(result.data.map(c => c.expiry))].sort((a, b) => new Date(a) - new Date(b));
          setAvailableExpiries(expiries);
          if (expiries.length > 0) setSelectedExpiry(expiries[0]);
        }
      } catch (err) { setError(err.message); } finally { setLoading(false); }
    };
    fetchContracts();
  }, [underlyingKey, userToken]);

  const getStrike = (c) => {
    if (c.strike_price !== undefined && c.strike_price !== null) return parseFloat(c.strike_price);
    if (c.strike !== undefined && c.strike !== null) return parseFloat(c.strike);
    const str = c.trading_symbol || c.instrument_key || c.name || "";
    const match = str.match(/(\d+(?:\.\d+)?)\s*(CE|PE)/i);
    if (match) return parseFloat(match[1]);
    return undefined;
  };

  const isOptionType = (c, type) => {
    if (c.instrument_type === type) return true;
    if (c.option_type === type) return true;
    const str = c.trading_symbol || c.instrument_key || "";
    return new RegExp(`\\d+(?:\\.\\d+)?\\s*${type}`, 'i').test(str);
  };

  useEffect(() => {
    if (selectedExpiry && contracts.length > 0) {
      const strikes = [...new Set(contracts.filter(c => c.expiry === selectedExpiry).map(c => getStrike(c)).filter(s => s !== undefined))].sort((a, b) => a - b);
      setAvailableStrikes(strikes);
      if (strikes.length > 0 && !strikes.includes(Number(selectedStrike))) setSelectedStrike(strikes[Math.floor(strikes.length / 2)].toString());
    }
  }, [selectedExpiry, contracts]);

  const findSilverKey = async () => {
    if (!userToken) {
      setError("Please add your Upstox Token in settings first to search for active contracts.");
      return;
    }
    try {
      setSilverKey("Searching...");
      const res = await fetch(`/api/upstox/search?query=SILVER`, { headers: getAuthHeaders() });
      const result = await res.json();
      if (result.status === 'success' && result.data && result.data.length > 0) {
        setSilverKey(result.data[0].instrument_key);
      } else {
        setSilverKey("");
        setError("Could not find any active Silver Micro contracts.");
      }
    } catch (e) {
      setSilverKey("");
      setError("Search failed: " + e.message);
    }
  };

  useEffect(() => {
    if (!userToken) return;
    const fetchUnderlying = async () => {
      try {
        const fetchIndex = async (instrumentKey) => {
          if (!instrumentKey) return [];
          try {
            const res = await fetch(`/api/upstox/history?instrumentKey=${encodeURIComponent(instrumentKey)}&interval=1minute`, { headers: getAuthHeaders() });
            const result = await res.json();
            if (result.error) throw new Error(result.error);
            
            let lastPrice = null;
            try {
               const quoteRes = await fetch(`/api/upstox/quotes?instrumentKey=${encodeURIComponent(instrumentKey)}`, { headers: getAuthHeaders() });
               const quoteResult = await quoteRes.json();
               if (quoteResult?.data) {
                  const vals = Object.values(quoteResult.data);
                  if (vals.length > 0) lastPrice = vals[0].last_price;
               }
            } catch (e) { /* ignore quote error */ }

            if (result.data && result.data.candles) {
              const uniqueCandlesMap = new Map();
              result.data.candles.forEach(c => {
                 const t = Math.floor(new Date(c[0]).getTime() / 1000);
                 if (!uniqueCandlesMap.has(t)) uniqueCandlesMap.set(t, c);
              });
              const uniqueCandles = Array.from(uniqueCandlesMap.values());
              const sorted = uniqueCandles.sort((a, b) => new Date(a[0]) - new Date(b[0]));
              
              if (sorted.length > 0 && lastPrice) {
                 const lastCandle = sorted[sorted.length - 1];
                 lastCandle[4] = lastPrice;
                 lastCandle[2] = Math.max(lastCandle[2], lastPrice);
                 lastCandle[3] = Math.min(lastCandle[3], lastPrice);
              }
              return aggregateCandles(sorted, timeframe);
            }
            return [];
          } catch (e) {
            console.error(`Error fetching index ${instrumentKey}:`, e);
            return [];
          }
        };

        const [niftyDataRaw, sensexDataRaw, bankexDataRaw, silverDataRaw, giftNiftyDataRaw, bankNiftyDataRaw] = await Promise.all([fetchIndex('NSE_INDEX|Nifty 50'), fetchIndex('BSE_INDEX|SENSEX'), fetchIndex('BSE_INDEX|BANKEX'), fetchIndex(silverKey), fetchIndex('GLOBAL_INDEX|SGX NIFTY'), fetchIndex('NSE_INDEX|Nifty Bank')]);
        
        if (Array.isArray(niftyDataRaw) && niftyDataRaw.length > 0) {
          const rawCandles = niftyDataRaw;
          setNiftyData(formatHeikinAshi(rawCandles));
          setNiftyRawData(extractRaw(rawCandles));
          setNiftyPremium(parseFloat(rawCandles[rawCandles.length - 1][4]));
          if (rawCandles.length > 1) {
            setNiftyChange(((parseFloat(rawCandles[rawCandles.length-1][4]) - parseFloat(rawCandles[0][4])) / parseFloat(rawCandles[0][4]) * 100).toFixed(2));
          }
          const { signals: ns, values: nv } = calculateSignals(rawCandles);
          setNiftySignals(ns);
          setNiftyIndicatorValues(nv);
        }
        
        if (Array.isArray(bankNiftyDataRaw) && bankNiftyDataRaw.length > 0) {
          const rawCandles = bankNiftyDataRaw;
          setBankNiftyData(formatHeikinAshi(rawCandles));
          setBankNiftyRawData(extractRaw(rawCandles));
          setBankNiftyPremium(parseFloat(rawCandles[rawCandles.length - 1][4]));
          if (rawCandles.length > 1) {
            setBankNiftyChange(((parseFloat(rawCandles[rawCandles.length-1][4]) - parseFloat(rawCandles[0][4])) / parseFloat(rawCandles[0][4]) * 100).toFixed(2));
          }
          const { signals: ns, values: nv } = calculateSignals(rawCandles);
          setBankNiftySignals(ns);
          setBankNiftyIndicatorValues(nv);
        }
        
        if (Array.isArray(giftNiftyDataRaw) && giftNiftyDataRaw.length > 0) {
          const rawCandles = giftNiftyDataRaw;
          setGiftNiftyData(formatHeikinAshi(rawCandles));
          setGiftNiftyRawData(extractRaw(rawCandles));
          setGiftNiftyPremium(parseFloat(rawCandles[rawCandles.length - 1][4]));
          if (rawCandles.length > 1) {
            setGiftNiftyChange(((parseFloat(rawCandles[rawCandles.length-1][4]) - parseFloat(rawCandles[0][4])) / parseFloat(rawCandles[0][4]) * 100).toFixed(2));
          }
          const { signals: ns, values: nv } = calculateSignals(rawCandles);
          setGiftNiftySignals(ns);
          setGiftNiftyIndicatorValues(nv);
        }
        if (Array.isArray(sensexDataRaw) && sensexDataRaw.length > 0) {
          const rawCandles = sensexDataRaw;
          setSensexData(formatHeikinAshi(rawCandles));
          setSensexRawData(extractRaw(rawCandles));
          setSensexPremium(parseFloat(rawCandles[rawCandles.length - 1][4]));
          if (rawCandles.length > 1) {
            setSensexChange(((parseFloat(rawCandles[rawCandles.length-1][4]) - parseFloat(rawCandles[0][4])) / parseFloat(rawCandles[0][4]) * 100).toFixed(2));
          }
          const { signals: ss, values: sv } = calculateSignals(rawCandles);
          setSensexSignals(ss);
          setSensexIndicatorValues(sv);
        }
        if (Array.isArray(bankexDataRaw) && bankexDataRaw.length > 0) {
          const rawCandles = bankexDataRaw;
          setBankexData(formatHeikinAshi(rawCandles));
          setBankexRawData(extractRaw(rawCandles));
          setBankexPremium(parseFloat(rawCandles[rawCandles.length - 1][4]));
          if (rawCandles.length > 1) {
            setBankexChange(((parseFloat(rawCandles[rawCandles.length-1][4]) - parseFloat(rawCandles[0][4])) / parseFloat(rawCandles[0][4]) * 100).toFixed(2));
          }
          const { signals: bs, values: bv } = calculateSignals(rawCandles);
          setBankexSignals(bs);
          setBankexIndicatorValues(bv);
        }
        if (Array.isArray(silverDataRaw) && silverDataRaw.length > 0) {
          const rawCandles = silverDataRaw;
          setSilverData(formatHeikinAshi(rawCandles));
          setSilverRawData(extractRaw(rawCandles));
          setSilverPremium(parseFloat(rawCandles[rawCandles.length - 1][4]));
          if (rawCandles.length > 1) {
            setSilverChange(((parseFloat(rawCandles[rawCandles.length-1][4]) - parseFloat(rawCandles[0][4])) / parseFloat(rawCandles[0][4]) * 100).toFixed(2));
          }
          const { signals: sis, values: siv } = calculateSignals(rawCandles);
          setSilverSignals(sis);
          setSilverIndicatorValues(siv);
        }
      } catch (err) {
        if (!error) setError(`Index Data: ${err.message}`);
      }
    };

    fetchUnderlying();
    const intervalId = setInterval(fetchUnderlying, 5000);
    return () => clearInterval(intervalId);
  }, [userToken, timeframe, silverKey]);

  useEffect(() => {
    if (!selectedExpiry || !selectedStrike || !optionType || contracts.length === 0) return;

    if (!contracts.some(c => c.expiry === selectedExpiry)) return;
    const currentStrikes = contracts.filter(c => c.expiry === selectedExpiry).map(c => getStrike(c));
    if (!currentStrikes.includes(Number(selectedStrike))) return;

    const fetchLiveData = async () => {
      setLoading(true);
      setError(null);
      try {
        const optionContract = contracts.find(c => 
          c.expiry === selectedExpiry && 
          getStrike(c) == selectedStrike && 
          isOptionType(c, optionType)
        );
        if (!optionContract) throw new Error("Option contract not found");

        let lastPrice = null;
        try {
          const quoteRes = await fetch(`/api/upstox/quotes?instrumentKey=${encodeURIComponent(optionContract.instrument_key)}`, { headers: getAuthHeaders() });
          const quoteResult = await quoteRes.json();
          if (quoteResult?.data) {
             const vals = Object.values(quoteResult.data);
             if (vals.length > 0) lastPrice = vals[0].last_price;
          }
        } catch (e) { /* ignore quote error */ }

        const historyRes = await fetch(`/api/upstox/history?instrumentKey=${encodeURIComponent(optionContract.instrument_key)}&interval=1minute`, { headers: getAuthHeaders() });
        const historyResult = await historyRes.json();
        
        if (historyResult.error) throw new Error(historyResult.error);
        
        if (historyResult.data && historyResult.data.candles) {
          const uniqueCandlesMap = new Map();
          historyResult.data.candles.forEach(c => {
             const t = Math.floor(new Date(c[0]).getTime() / 1000);
             if (!uniqueCandlesMap.has(t)) uniqueCandlesMap.set(t, c);
          });
          const uniqueCandles = Array.from(uniqueCandlesMap.values()).sort((a, b) => new Date(a[0]) - new Date(b[0]));
          
          if (uniqueCandles.length > 0 && lastPrice) {
             const lastCandle = uniqueCandles[uniqueCandles.length - 1];
             lastCandle[4] = lastPrice;
             lastCandle[2] = Math.max(lastCandle[2], lastPrice);
             lastCandle[3] = Math.min(lastCandle[3], lastPrice);
          }
          const rawCandles = aggregateCandles(uniqueCandles, timeframe);
          
          if (rawCandles.length > 0) {
            setStartPremium(parseFloat(rawCandles[0][4]));
            setCurrentPremium(parseFloat(rawCandles[rawCandles.length - 1][4]));
            const { signals: optS, values: optV } = calculateSignals(rawCandles);
            if (optS && optV) {
              setSignals(optS);
              setIndicatorValues(optV);
            }
          }
          setChartData(formatHeikinAshi(rawCandles));
          setRawChartData(extractRaw(rawCandles));
        }

        const chainRes = await fetch(`/api/upstox/chain?instrumentKey=${encodeURIComponent(underlyingKey)}&expiryDate=${encodeURIComponent(selectedExpiry)}`, { headers: getAuthHeaders() });
        const chainResult = await chainRes.json();
        if (chainResult.data) {
          const chainItem = chainResult.data.find(item => item.strike_price == selectedStrike);
          if (chainItem) {
            const optData = optionType === 'CE' ? chainItem.call_options : chainItem.put_options;
            if (optData) setMetrics({ oi: optData.market_data?.oi || 0, iv: optData.option_greeks?.iv || 0, delta: optData.option_greeks?.delta || 0, theta: optData.option_greeks?.theta || 0 });
          }
        }
      } catch (err) { 
        setError(`Options Data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLiveData();
    const intervalId = setInterval(fetchLiveData, 5000);
    return () => clearInterval(intervalId);
  }, [selectedExpiry, selectedStrike, optionType, contracts, underlyingKey, userToken, timeframe]);

  const percentChange = startPremium ? (((currentPremium - startPremium) / startPremium) * 100).toFixed(2) : 0;
  const isPositive = percentChange >= 0;

  return (
    <ErrorBoundary>
      <div className={`dashboard-container ${theme === 'light' ? 'light-theme' : ''}`}>
        <header className="dashboard-header glass-panel">
        <div className="logo-area">
          <Activity className="logo-icon" />
          <h1>Options Pro</h1>
        </div>
        
        <div className="nav-controls">
          <div className="segmented-control">
            <button className={selectedIndex === 'NIFTY' ? 'active' : ''} onClick={() => setSelectedIndex('NIFTY')}>NIFTY 50</button>
            <button className={selectedIndex === 'BANKNIFTY' ? 'active' : ''} onClick={() => setSelectedIndex('BANKNIFTY')}>BANK NIFTY</button>
            <button className={selectedIndex === 'SENSEX' ? 'active' : ''} onClick={() => setSelectedIndex('SENSEX')}>SENSEX</button>
          </div>
        </div>

        <div className="user-area">
          <span className="live-status"><span className="dot"></span> Live Data</span>
          <button className="icon-btn" onClick={toggleTheme} title="Toggle Theme">
             {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button className="icon-btn" onClick={() => setShowIndicatorModal(true)} title="Indicators"><SlidersHorizontal size={20} /></button>
          <button className="icon-btn" onClick={() => setShowTokenModal(true)} title="API Settings"><Settings size={20} /></button>
        </div>
      </header>

      {error && (
        <div className="error-banner glass-panel" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', padding: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
          {error.includes('configured') && <button className="primary-btn small ml-auto" onClick={() => setShowTokenModal(true)}>Add Token</button>}
        </div>
      )}

      <main className="dashboard-main">
        <section className="controls-bar glass-panel">
          <div className="control-group">
            <label>Expiry</label>
            <div className="select-wrapper">
              <select value={selectedExpiry} onChange={(e) => setSelectedExpiry(e.target.value)} disabled={availableExpiries.length === 0}>
                {availableExpiries.map(exp => <option key={exp} value={exp}>{new Date(exp).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</option>)}
              </select>
              <ChevronDown className="select-icon" size={16} />
            </div>
          </div>

          <div className="control-group">
            <label>Strike Price</label>
            <div className="select-wrapper">
              <select value={selectedStrike} onChange={(e) => setSelectedStrike(e.target.value)} disabled={availableStrikes.length === 0}>
                {availableStrikes.map(strike => <option key={strike} value={strike}>{strike}</option>)}
              </select>
              <ChevronDown className="select-icon" size={16} />
            </div>
          </div>

          <div className="control-group">
            <label>Option Type</label>
            <div className="segmented-control small">
              <button className={`call-btn ${optionType === 'CE' ? 'active' : ''}`} onClick={() => setOptionType('CE')}>CALL (CE)</button>
              <button className={`put-btn ${optionType === 'PE' ? 'active' : ''}`} onClick={() => setOptionType('PE')}>PUT (PE)</button>
            </div>
          </div>

          <div className="control-group">
            <label>View</label>
            <div className="select-wrapper">
              <select value={chartType} onChange={(e) => setChartType(e.target.value)}>
                <option value="Heikin Ashi">Heikin Ashi</option>
                <option value="Candles">Normal Candles</option>
              </select>
            </div>
          </div>

          <div className="control-group">
            <label>Timeframe</label>
            <div className="segmented-control small">
              <button className={timeframe === '1minute' ? 'active' : ''} onClick={() => setTimeframe('1minute')}>1m</button>
              <button className={timeframe === '5minute' ? 'active' : ''} onClick={() => setTimeframe('5minute')}>5m</button>
              <button className={timeframe === '15minute' ? 'active' : ''} onClick={() => setTimeframe('15minute')}>15m</button>
              <button className={timeframe === '30minute' ? 'active' : ''} onClick={() => setTimeframe('30minute')}>30m</button>
              <button className={timeframe === 'day' ? 'active' : ''} onClick={() => setTimeframe('day')}>1D</button>
              <button className={timeframe === 'week' ? 'active' : ''} onClick={() => setTimeframe('week')}>1W</button>
            </div>
          </div>
        </section>

        <div className="content-grid">
          <section className="chart-section glass-panel">
            <div className="chart-header">
              <div>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {selectedIndex} {selectedStrike} {optionType} {loading && <Loader2 size={16} className="spinner" />}
                </h2>
                <p className="subtitle">Premium ({timeframe === 'day' ? '1D' : timeframe === 'week' ? '1W' : timeframe.replace('minute', 'm')} {chartType})</p>
              </div>
              <div className="price-display">
                <span className="current-price">₹{currentPremium.toFixed(2)}</span>
                <span className={`price-change ${isPositive ? 'positive' : 'negative'}`}>
                  {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {Math.abs(percentChange)}%
                </span>
              </div>
            </div>
            
            <div className="chart-container" style={{ width: '100%', height: 500, position: 'relative' }}>
              {chartData.length > 0 ? (
                <HeikinAshiChart haData={chartData} rawData={rawChartData} indicators={indicators} theme={theme} chartType={chartType} />
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading chart data...</div>
              )}
            </div>
          </section>

          <aside className="metrics-sidebar">
            <div className="summary-card glass-panel" style={{ flexGrow: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <SignalBoard title="Option" signals={signals} values={indicatorValues} />
            </div>

            <div className="metric-card glass-panel">
              <div className="metric-icon"><BarChart3 size={20} /></div>
              <div className="metric-info">
                <h3>Open Interest</h3>
                <p>{(metrics.oi || 0).toLocaleString()}</p>
              </div>
            </div>
            <div className="metric-card glass-panel">
              <div className="metric-icon"><Activity size={20} /></div>
              <div className="metric-info">
                <h3>Implied Volatility (IV)</h3>
                <p>{(metrics.iv * 100).toFixed(2)}%</p>
              </div>
            </div>
            <div className="metric-card glass-panel">
              <div className="metric-icon"><DollarSign size={20} /></div>
              <div className="metric-info">
                <h3>Delta</h3>
                <p>{(metrics.delta || 0).toFixed(4)}</p>
              </div>
            </div>
            <div className="metric-card glass-panel">
              <div className="metric-icon"><Clock size={20} /></div>
              <div className="metric-info">
                <h3>Theta</h3>
                <p>{(metrics.theta || 0).toFixed(4)}</p>
              </div>
            </div>
          </aside>
        </div>

        <section className="bottom-charts-grid">
          <div className={`chart-section glass-panel ${fullScreenChart === 'NIFTY' ? 'fullscreen-chart' : ''}`}>
            <div className="chart-header">
              <div>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  NIFTY 50
                  <button className="icon-btn" onClick={() => setFullScreenChart(fullScreenChart === 'NIFTY' ? null : 'NIFTY')}>
                    {fullScreenChart === 'NIFTY' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                </h2>
                <p className="subtitle">Underlying Index ({timeframe.replace('minute', 'm')} Heikin Ashi)</p>
              </div>
              <div className="price-display">
                <span className="current-price">₹{niftyPremium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className={`price-change ${niftyChange >= 0 ? 'positive' : 'negative'}`}>
                  {niftyChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {Math.abs(niftyChange)}%
                </span>
              </div>
            </div>
            <div className="chart-container" style={{ width: '100%', height: fullScreenChart === 'NIFTY' ? 'calc(100vh - 100px)' : 400, position: 'relative' }}>
              {niftyData.length > 0 ? <HeikinAshiChart haData={niftyData} rawData={niftyRawData} indicators={indicators} theme={theme} chartType={chartType} /> : <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading...</div>}
            </div>
            <SignalBoard title="NIFTY 50" signals={niftySignals} values={niftyIndicatorValues} />
          </div>

          <div className={`chart-section glass-panel ${fullScreenChart === 'BANKNIFTY' ? 'fullscreen-chart' : ''}`}>
            <div className="chart-header">
              <div>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  BANK NIFTY
                  <button className="icon-btn" onClick={() => setFullScreenChart(fullScreenChart === 'BANKNIFTY' ? null : 'BANKNIFTY')}>
                    {fullScreenChart === 'BANKNIFTY' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                </h2>
                <p className="subtitle">Underlying Index ({timeframe.replace('minute', 'm')} Heikin Ashi)</p>
              </div>
              <div className="price-display">
                <span className="current-price">₹{bankNiftyPremium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className={`price-change ${bankNiftyChange >= 0 ? 'positive' : 'negative'}`}>
                  {bankNiftyChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {Math.abs(bankNiftyChange)}%
                </span>
              </div>
            </div>
            <div className="chart-container" style={{ width: '100%', height: fullScreenChart === 'BANKNIFTY' ? 'calc(100vh - 100px)' : 400, position: 'relative' }}>
              {bankNiftyData.length > 0 ? <HeikinAshiChart haData={bankNiftyData} rawData={bankNiftyRawData} indicators={indicators} theme={theme} chartType={chartType} /> : <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading...</div>}
            </div>
            <SignalBoard title="BANK NIFTY" signals={bankNiftySignals} values={bankNiftyIndicatorValues} />
          </div>

          <div className={`chart-section glass-panel ${fullScreenChart === 'GIFT' ? 'fullscreen-chart' : ''}`}>
            <div className="chart-header">
              <div>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  GIFT NIFTY
                  <button className="icon-btn" onClick={() => setFullScreenChart(fullScreenChart === 'GIFT' ? null : 'GIFT')}>
                    {fullScreenChart === 'GIFT' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                </h2>
                <p className="subtitle">Global Index ({timeframe.replace('minute', 'm')} Heikin Ashi)</p>
              </div>
              <div className="price-display">
                <span className="current-price">₹{giftNiftyPremium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className={`price-change ${giftNiftyChange >= 0 ? 'positive' : 'negative'}`}>
                  {giftNiftyChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {Math.abs(giftNiftyChange)}%
                </span>
              </div>
            </div>
            <div className="chart-container" style={{ width: '100%', height: fullScreenChart === 'GIFT' ? 'calc(100vh - 100px)' : 400, position: 'relative' }}>
              {giftNiftyData.length > 0 ? <HeikinAshiChart haData={giftNiftyData} rawData={giftNiftyRawData} indicators={indicators} theme={theme} chartType={chartType} /> : <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading...</div>}
            </div>
            <SignalBoard title="GIFT NIFTY" signals={giftNiftySignals} values={giftNiftyIndicatorValues} />
          </div>

          <div className={`chart-section glass-panel ${fullScreenChart === 'SENSEX' ? 'fullscreen-chart' : ''}`}>
            <div className="chart-header">
              <div>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  SENSEX
                  <button className="icon-btn" onClick={() => setFullScreenChart(fullScreenChart === 'SENSEX' ? null : 'SENSEX')}>
                    {fullScreenChart === 'SENSEX' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                </h2>
                <p className="subtitle">Underlying Index ({timeframe.replace('minute', 'm')} Heikin Ashi)</p>
              </div>
              <div className="price-display">
                <span className="current-price">₹{sensexPremium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className={`price-change ${sensexChange >= 0 ? 'positive' : 'negative'}`}>
                  {sensexChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {Math.abs(sensexChange)}%
                </span>
              </div>
            </div>
            <div className="chart-container" style={{ width: '100%', height: fullScreenChart === 'SENSEX' ? 'calc(100vh - 100px)' : 400, position: 'relative' }}>
              {sensexData.length > 0 ? <HeikinAshiChart haData={sensexData} rawData={sensexRawData} indicators={indicators} theme={theme} chartType={chartType} /> : <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading...</div>}
            </div>
            <SignalBoard title="SENSEX" signals={sensexSignals} values={sensexIndicatorValues} theme={theme} />
          </div>

          <div className={`chart-section glass-panel ${fullScreenChart === 'BANKEX' ? 'fullscreen-chart' : ''}`}>
            <div className="chart-header">
              <div>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  BANKEX
                  <button className="icon-btn" onClick={() => setFullScreenChart(fullScreenChart === 'BANKEX' ? null : 'BANKEX')}>
                    {fullScreenChart === 'BANKEX' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                </h2>
                <p className="subtitle">Underlying Index ({timeframe.replace('minute', 'm')} Heikin Ashi)</p>
              </div>
              <div className="price-display">
                <span className="current-price">₹{bankexPremium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className={`price-change ${bankexChange >= 0 ? 'positive' : 'negative'}`}>
                  {bankexChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {Math.abs(bankexChange)}%
                </span>
              </div>
            </div>
            <div className="chart-container" style={{ width: '100%', height: fullScreenChart === 'BANKEX' ? 'calc(100vh - 100px)' : 400, position: 'relative' }}>
              {bankexData.length > 0 ? <HeikinAshiChart haData={bankexData} rawData={bankexRawData} indicators={indicators} theme={theme} chartType={chartType} /> : <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading...</div>}
            </div>
            <SignalBoard title="BANKEX" signals={bankexSignals} values={bankexIndicatorValues} theme={theme} />
          </div>

          <div className={`chart-section glass-panel ${fullScreenChart === 'SILVER' ? 'fullscreen-chart' : ''}`} style={fullScreenChart !== 'SILVER' ? { gridColumn: '1 / -1' } : {}}>
            <div className="chart-header">
              <div>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    value={silverKey} 
                    onChange={e => setSilverKey(e.target.value)} 
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'inherit', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '1rem', width: '250px' }}
                    title="Edit MCX Instrument Key"
                  />
                  <button className="icon-btn" onClick={findSilverKey} title="Auto-find active Silver contract">
                    <Search size={16} />
                  </button>
                  <button className="icon-btn" onClick={() => setFullScreenChart(fullScreenChart === 'SILVER' ? null : 'SILVER')}>
                    {fullScreenChart === 'SILVER' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                </h2>
                <p className="subtitle">Underlying Asset ({timeframe.replace('minute', 'm')} Heikin Ashi)</p>
              </div>
              <div className="price-display">
                <span className="current-price">₹{silverPremium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className={`price-change ${silverChange >= 0 ? 'positive' : 'negative'}`}>
                  {silverChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {Math.abs(silverChange)}%
                </span>
              </div>
            </div>
            <div className="chart-container" style={{ width: '100%', height: fullScreenChart === 'SILVER' ? 'calc(100vh - 100px)' : 400, position: 'relative' }}>
              {silverData.length > 0 ? <HeikinAshiChart haData={silverData} rawData={silverRawData} indicators={indicators} theme={theme} chartType={chartType} /> : <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Waiting for valid Instrument Key...</div>}
            </div>
            {silverSignals && <SignalBoard title="MCX SILVER" signals={silverSignals} values={silverIndicatorValues} theme={theme} />}
          </div>
        </section>
      </main>

      {/* Indicator Modal */}
      {showIndicatorModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h2>Technical Indicators</h2>
              <button className="icon-btn" onClick={() => setShowIndicatorModal(false)}><X size={20}/></button>
            </div>
            <div className="modal-body">
              <p className="modal-desc">Toggle mathematical indicators. These are computed natively from the live 5m Upstox data.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={indicators.vwap} onChange={() => toggleIndicator('vwap')} />
                  <span>VWAP (Volume Weighted Average Price)</span>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={indicators.mavwap} onChange={() => toggleIndicator('mavwap')} />
                  <span>MAVWAP (30-Period Moving Avg of VWAP)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={indicators.rsi} onChange={() => toggleIndicator('rsi')} />
                  <span>RSI (14-Period Relative Strength Index)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={indicators.rsiDiv} onChange={() => toggleIndicator('rsiDiv')} />
                  <span>RSI Divergence (Regular & Hidden)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={indicators.macd} onChange={() => toggleIndicator('macd')} />
                  <span>MACD (12, 26, 9)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={indicators.adx} onChange={() => toggleIndicator('adx')} />
                  <span>ADX (14-Period Average Directional Index)</span>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={indicators.ewo} onChange={() => toggleIndicator('ewo')} />
                  <span>Elliott Wave Oscillator (5, 35)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                  <input type="checkbox" checked={indicators.smc} onChange={() => toggleIndicator('smc')} />
                  <span style={{ fontWeight: 'bold', color: '#60a5fa' }}>SMC Blocks (Fair Value Gaps & Order Blocks)</span>
                </label>

                <label className="flex items-center space-x-3 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 p-2 rounded-lg transition-colors">
                  <input type="checkbox" checked={indicators.utbot} onChange={() => toggleIndicator('utbot')} className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">UT Bot Alert (10, 2)</span>
                </label>
                <label className="flex items-center space-x-3 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 p-2 rounded-lg transition-colors">
                  <input type="checkbox" checked={indicators.utbot3} onChange={() => toggleIndicator('utbot3')} className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">UT Bot Alert (10, 3)</span>
                </label>
                <label className="flex items-center space-x-3 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 p-2 rounded-lg transition-colors">
                  <input type="checkbox" checked={indicators.fib} onChange={() => toggleIndicator('fib')} className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Auto Fibonacci (50p)</span>
                </label>
                <label className="flex items-center space-x-3 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 p-2 rounded-lg transition-colors">
                  <input type="checkbox" checked={indicators.elliott} onChange={() => toggleIndicator('elliott')} className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Auto Elliott Wave</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Pullback Value Zone (PVZ)</span>
                  <input type="checkbox" checked={indicators.pvz} onChange={() => toggleIndicator('pvz')} className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" />
                </div>
                <label className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300">
                  <input type="checkbox" checked={indicators.iez} onChange={() => toggleIndicator('iez')} className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" />
                  <span>Institutional Engulfing</span>
                </label>
                <label className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300">
                  <input type="checkbox" checked={indicators.rbt} onChange={() => toggleIndicator('rbt')} className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" />
                  <span>Red Bar Theory (RBT)</span>
                </label>
                <label className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300">
                  <input type="checkbox" checked={indicators.ema} onChange={() => toggleIndicator('ema')} className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" />
                  <span>9 & 21 EMA</span>
                </label>
                <label className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300">
                  <input type="checkbox" checked={indicators.nw} onChange={() => toggleIndicator('nw')} className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" />
                  <span>Nadaraya-Watson (NW)</span>
                </label>
                <label className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300">
                  <input type="checkbox" checked={indicators.ew} onChange={() => toggleIndicator('ew')} className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" />
                  <span>Auto Fib & Elliott Wave</span>
                </label>
                <label className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300">
                  <input type="checkbox" checked={indicators.qqe} onChange={() => toggleIndicator('qqe')} className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" />
                  <span>QQE MOD</span>
                </label>
                <label className="flex items-center space-x-3 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 p-2 rounded-lg transition-colors">
                  <input type="checkbox" checked={indicators.iez} onChange={() => toggleIndicator('iez')} className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" />
                  <span className="font-medium text-slate-700 dark:text-slate-300" style={{ fontWeight: 'bold', color: '#a855f7' }}>Institutional Trading Zone (IEZ)</span>
                </label>

              </div>

            </div>
            <div className="modal-footer">
              <button className="primary-btn" onClick={() => setShowIndicatorModal(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Token Modal */}
      {showTokenModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h2>API Settings</h2>
              <button className="icon-btn" onClick={() => setShowTokenModal(false)}><X size={20}/></button>
            </div>
            <div className="modal-body">
              <p className="modal-desc">Enter your Upstox Access Token to fetch live market data. This is stored securely in your browser's local storage.</p>
              <div className="input-group">
                <label>Upstox Token</label>
                <input 
                  type="password" 
                  value={tempTokenInput} 
                  onChange={e => setTempTokenInput(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5c..."
                  className="token-input"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setShowTokenModal(false)}>Cancel</button>
              <button className="primary-btn" onClick={saveToken}>Save & Connect</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}
