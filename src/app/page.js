"use client";

import React, { useState, useEffect, useRef, Component } from 'react';
import { createChart, CandlestickSeries, LineSeries, HistogramSeries, createSeriesMarkers } from 'lightweight-charts';
import { RSI, MACD, ADX, VWAP, SMA, ATR, EMA, SD } from 'technicalindicators';
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

const calculateSubpaneMargins = (currentBottom, paneHeight = 0.15) => {
  const top = 1 - (currentBottom + paneHeight);
  return { top, bottom: currentBottom };
};

const HeikinAshiChart = ({ haData, rawData, indicators, theme, chartType }) => {
  const chartContainerRef = useRef();
  const chartInstance = useRef(null);
  const seriesRefs = useRef({});
  const [drawMode, setDrawMode] = useState('none');
  const hLinesRef = useRef([]);
  const vLineDataRef = useRef([]);
  const overlayRef = useRef(null);
  const blockElementsRef = useRef([]);
  const fibLinesRef = useRef([]);
  const utbotMarkersRef = useRef(null);
  const elliottMarkersRef = useRef(null);
  const utbotLineRef = useRef(null);
  const utbot3MarkersRef = useRef(null);
  const utbot3LineRef = useRef(null);
  const elliottLineRef = useRef(null);
  const rsiDivMarkersRef = useRef(null);
  
  
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: 'solid', color: 'transparent' }, textColor: theme === 'light' ? '#334155' : '#94a3b8' },
      grid: { vertLines: { color: theme === 'light' ? '#e2e8f0' : '#1e293b' }, horzLines: { color: theme === 'light' ? '#e2e8f0' : '#1e293b' } },
      crosshair: { mode: 0 },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: theme === 'light' ? '#cbd5e1' : '#334155' },
      rightPriceScale: { borderColor: theme === 'light' ? '#cbd5e1' : '#334155' },
    });

    chartInstance.current = chart;
    seriesRefs.current = {};

    chart.priceScale('qqe').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
      visible: indicators.qqe,
    });

    if (indicators.qqe) {
      seriesRefs.current.qqeHist = chart.addSeries(HistogramSeries, { priceScaleId: 'qqe', priceFormat: { type: 'volume' } });
      seriesRefs.current.qqeLine = chart.addSeries(LineSeries, { color: '#ffffff', lineWidth: 1, priceScaleId: 'qqe', title: 'QQE Trend' });
    }





    seriesRefs.current.candle = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', downColor: '#ef4444', borderVisible: false, wickUpColor: '#22c55e', wickDownColor: '#ef4444'
    });

    let currentBottomOffset = 0;







    seriesRefs.current.vLines = chart.addSeries(HistogramSeries, {
      color: theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
      priceScaleId: 'vlines',
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    chart.priceScale('vlines').applyOptions({ visible: false, autoScale: false });

    if (!overlayRef.current) {
        const div = document.createElement('div');
        div.style.position = 'absolute'; div.style.top = '0'; div.style.left = '0'; div.style.width = '100%'; div.style.height = '100%'; div.style.pointerEvents = 'none'; div.style.zIndex = '10';
        chartContainerRef.current.appendChild(div);
        overlayRef.current = div;
    }

    const updateOverlays = () => {
         if (!indicators.smc || !seriesRefs.current.candle || !chartInstance.current) return;
         blockElementsRef.current.forEach(({ div, block }) => {
            const yTop = seriesRefs.current.candle.priceToCoordinate(block.topPrice);
            const yBottom = seriesRefs.current.candle.priceToCoordinate(block.bottomPrice);
            let xStart = chartInstance.current.timeScale().timeToCoordinate(block.startTime);
            let xEnd = chartInstance.current.timeScale().timeToCoordinate(block.endTime);
            
            if (yTop === null || yBottom === null || xStart === null || xEnd === null) {
              div.style.display = 'none'; return;
            }
            div.style.display = 'block';
            div.style.top = `${Math.min(yTop, yBottom)}px`;
            div.style.height = `${Math.abs(yBottom - yTop)}px`;
            div.style.left = `${xStart}px`;
            div.style.width = `${xEnd - xStart}px`;
         });
    };
    
    chart.timeScale().subscribeVisibleLogicalRangeChange(updateOverlays);
    chart.subscribeCrosshairMove(updateOverlays);

    let resizeFrame;
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        const w = chartContainerRef.current.clientWidth;
        const h = chartContainerRef.current.clientHeight;
        if (w > 0 && h > 0) {
          if (resizeFrame) cancelAnimationFrame(resizeFrame);
          resizeFrame = requestAnimationFrame(() => {
            try {
              chart.applyOptions({ width: w, height: h });
            } catch(e) {}
          });
        }
      }
    };
    
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    
    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      if (overlayRef.current) overlayRef.current.remove();
      overlayRef.current = null;
      utbotMarkersRef.current = null;
      elliottMarkersRef.current = null;
      utbotLineRef.current = null;
      utbot3MarkersRef.current = null;
      utbot3LineRef.current = null;
      elliottLineRef.current = null;
      rsiDivMarkersRef.current = null;
      iezMarkersRef.current = null;
      rbtMarkersRef.current = null;
      
      if (pvzMarkersRef.current) pvzMarkersRef.current.setMarkers([]);
      pvzMarkersRef.current = null;
    };
  }, [indicators, theme, chartType]);

  useEffect(() => {
    if (!seriesRefs.current.candle || haData.length === 0 || rawData.length === 0) return;
    
    const displayData = chartType === 'Candles' ? rawData : haData;
    seriesRefs.current.candle.setData(displayData);

    const closes = []; const highs = []; const lows = []; const volumes = [];
    let totalVol = 0;
    rawData.forEach(c => { highs.push(c.high); lows.push(c.low); closes.push(c.close); const v = c.volume || 0; totalVol += v; volumes.push(v); });
    if (totalVol === 0) volumes.fill(1);


    if (seriesRefs.current.vLines) {
      const vData = [];
      rawData.forEach(d => {
         if (vLineDataRef.current.includes(d.time)) {
            vData.push({ time: d.time, value: 1, color: theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)' });
         }
      });
      seriesRefs.current.vLines.setData(vData);
    }














    }

    if (indicators.qqe) {
      const qqeRes = calculateQQEMod(rawData);
      if (seriesRefs.current.qqeHist) seriesRefs.current.qqeHist.setData(qqeRes.histData);
      if (seriesRefs.current.qqeLine) seriesRefs.current.qqeLine.setData(qqeRes.lineData);




  }, [haData, rawData, indicators, chartType]);

  useEffect(() => {
    if (!chartInstance.current) return;
    const clickHandler = (param) => {
      if (!param.point || !param.time || drawMode === 'none') return;
      if (drawMode === 'horizontal' && seriesRefs.current.candle) {
        const price = seriesRefs.current.candle.coordinateToPrice(param.point.y);
        if (price !== null) {
          const line = seriesRefs.current.candle.createPriceLine({
            price: price, color: theme === 'dark' ? 'rgba(234, 179, 8, 0.8)' : 'rgba(202, 138, 4, 0.8)',
            lineWidth: 2, lineStyle: 2, axisLabelVisible: true,
          });
          hLinesRef.current.push(line);
        }
      } else if (drawMode === 'vertical') {
        if (!vLineDataRef.current.includes(param.time)) {
           vLineDataRef.current.push(param.time);
           const vData = [];
           rawData.forEach(d => {
             if (vLineDataRef.current.includes(d.time)) {
                vData.push({ time: d.time, value: 1, color: theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)' });
             }
           });
           if (seriesRefs.current.vLines) seriesRefs.current.vLines.setData(vData);
        }
      }
    };
    chartInstance.current.subscribeClick(clickHandler);
    return () => { if (chartInstance.current) chartInstance.current.unsubscribeClick(clickHandler); };
  }, [drawMode, theme, rawData]);

  const clearDrawings = () => {
    if (hLinesRef.current && seriesRefs.current.candle) {
      hLinesRef.current.forEach(line => seriesRefs.current.candle.removePriceLine(line));
      hLinesRef.current = [];
    }
    vLineDataRef.current = [];
    if (seriesRefs.current.vLines) seriesRefs.current.vLines.setData([]);
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, display: 'flex', gap: '5px', background: theme === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)', padding: '4px', borderRadius: '6px', backdropFilter: 'blur(4px)' }}>
        <button onClick={() => setDrawMode('none')} style={{ background: drawMode === 'none' ? '#3b82f6' : 'transparent', color: drawMode === 'none' ? '#fff' : (theme === 'dark' ? '#cbd5e1' : '#475569'), border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }} title="Cursor">👆</button>
        <button onClick={() => setDrawMode('horizontal')} style={{ background: drawMode === 'horizontal' ? '#3b82f6' : 'transparent', color: drawMode === 'horizontal' ? '#fff' : (theme === 'dark' ? '#cbd5e1' : '#475569'), border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }} title="H-Line">—</button>
        <button onClick={() => setDrawMode('vertical')} style={{ background: drawMode === 'vertical' ? '#3b82f6' : 'transparent', color: drawMode === 'vertical' ? '#fff' : (theme === 'dark' ? '#cbd5e1' : '#475569'), border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }} title="V-Line">|</button>
        <button onClick={clearDrawings} style={{ background: 'transparent', color: '#ef4444', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }} title="Clear">🗑️</button>
      </div>
      <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

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

    qqe: true