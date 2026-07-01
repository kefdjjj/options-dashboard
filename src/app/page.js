"use client";

import React, { useState, useEffect, useRef, Component } from 'react';
import { createChart, CandlestickSeries, LineSeries, HistogramSeries, createSeriesMarkers } from 'lightweight-charts';
import { RSI, MACD, ADX, VWAP, SMA, ATR, EMA } from 'technicalindicators';
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
  const iezMarkersRef = useRef(null);
  
  const pvzMarkersRef = useRef(null);
  
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

    if (indicators.pvz) {
      seriesRefs.current.pvzUo = chart.addSeries(LineSeries, { lineWidth: 1, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
      seriesRefs.current.pvzUi = chart.addSeries(LineSeries, { lineWidth: 1, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
      seriesRefs.current.pvzLi = chart.addSeries(LineSeries, { lineWidth: 1, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
      seriesRefs.current.pvzLo = chart.addSeries(LineSeries, { lineWidth: 1, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
      seriesRefs.current.pvzEma = chart.addSeries(LineSeries, { color: 'gray', lineWidth: 2, title: 'PVZ EMA (50)', crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false });
    }


    seriesRefs.current.candle = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', downColor: '#ef4444', borderVisible: false, wickUpColor: '#22c55e', wickDownColor: '#ef4444'
    });

    let currentBottomOffset = 0;

    if (indicators.vwap) {
      seriesRefs.current.vwap = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 2, title: 'VWAP' });
      if (indicators.mavwap) {
        seriesRefs.current.mavwap = chart.addSeries(LineSeries, { color: '#a855f7', lineWidth: 2, lineStyle: 2, title: 'MAVWAP (30)' });
      }
    }

    if (indicators.rsi) {
      const margins = calculateSubpaneMargins(currentBottomOffset, 0.15);
      currentBottomOffset += 0.15;
      chart.priceScale('rsi').applyOptions({ scaleMargins: margins });
      seriesRefs.current.rsi = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 2, title: 'RSI (14)', priceScaleId: 'rsi' });
    }

    if (indicators.macd) {
      const margins = calculateSubpaneMargins(currentBottomOffset, 0.15);
      currentBottomOffset += 0.15;
      chart.priceScale('macd').applyOptions({ scaleMargins: margins });
      seriesRefs.current.hist = chart.addSeries(HistogramSeries, { priceScaleId: 'macd' });
    }

    if (indicators.adx) {
      const margins = calculateSubpaneMargins(currentBottomOffset, 0.15);
      currentBottomOffset += 0.15;
      chart.priceScale('adx').applyOptions({ scaleMargins: margins });
      seriesRefs.current.adx = chart.addSeries(LineSeries, { color: '#ec4899', lineWidth: 2, title: 'ADX (14)', priceScaleId: 'adx' });
    }

    if (indicators.ewo) {
      const margins = calculateSubpaneMargins(currentBottomOffset, 0.08); // Make EWO smaller (8%)
      currentBottomOffset += 0.08;
      chart.priceScale('ewo').applyOptions({ scaleMargins: margins });
      seriesRefs.current.ewo = chart.addSeries(HistogramSeries, { priceScaleId: 'ewo', title: 'EWO (5, 35)' });
    }

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

    if (indicators.vwap && seriesRefs.current.vwap) {
      const vwapResult = VWAP.calculate({ high: highs, low: lows, close: closes, volume: volumes });
      const vwapLineData = [];
      const offset = rawData.length - vwapResult.length;
      vwapResult.forEach((val, i) => { vwapLineData.push({ time: rawData[i + offset].time, value: val }); });
      seriesRefs.current.vwap.setData(vwapLineData);

      if (indicators.mavwap && seriesRefs.current.mavwap) {
        const mavwapInput = { period: 30, values: vwapResult };
        const mavwapResult = SMA.calculate(mavwapInput);
        const mavwapLineData = [];
        const maOffset = rawData.length - mavwapResult.length;
        mavwapResult.forEach((val, i) => { mavwapLineData.push({ time: rawData[i + maOffset].time, value: val }); });
        seriesRefs.current.mavwap.setData(mavwapLineData);
      }
    }

    if (indicators.rsi && seriesRefs.current.rsi) {
      const rsiData = [];
      const rsiResult = RSI.calculate({ period: 14, values: closes });
      const offset = rawData.length - rsiResult.length;
      rsiResult.forEach((val, i) => { if (!isNaN(val) && val !== null) rsiData.push({ time: rawData[i + offset].time, value: val }); });
      seriesRefs.current.rsi.setData(rsiData);
    }

    if (indicators.macd && seriesRefs.current.hist) {
      const macdResult = MACD.calculate({ fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false, values: closes });
      const histData = [];
      const offset = rawData.length - macdResult.length;
      macdResult.forEach((val, i) => {
        if (val && !isNaN(val.histogram) && val.histogram !== null) histData.push({ time: rawData[i + offset].time, value: val.histogram, color: val.histogram > 0 ? '#22c55e' : '#ef4444' });
      });
      seriesRefs.current.hist.setData(histData);
    }

    if (indicators.adx && seriesRefs.current.adx) {
      const adxResult = ADX.calculate({ high: highs, low: lows, close: closes, period: 14 });
      const adxLineData = [];
      const offset = rawData.length - adxResult.length;
      adxResult.forEach((val, i) => { if (val && !isNaN(val.adx) && val.adx !== null) adxLineData.push({ time: rawData[i + offset].time, value: val.adx }); });
      seriesRefs.current.adx.setData(adxLineData);
    }

    if (indicators.ewo && seriesRefs.current.ewo) {
      const sma5 = SMA.calculate({ period: 5, values: closes });
      const sma35 = SMA.calculate({ period: 35, values: closes });
      const ewoData = [];
      if (sma5.length > 0 && sma35.length > 0) {
        let prevVal = 0;
        const diffLen = sma5.length - sma35.length;
        const offset = rawData.length - sma35.length;
        sma35.forEach((val35, i) => {
          const val5 = sma5[i + diffLen];
          const ewoVal = val5 - val35;
          const color = ewoVal >= prevVal ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)';
          prevVal = ewoVal;
          if (!isNaN(ewoVal) && ewoVal !== null) {
             ewoData.push({ time: rawData[i + offset].time, value: ewoVal, color });
          }
        });
      }
      seriesRefs.current.ewo.setData(ewoData);
    }

    if (indicators.utbot && seriesRefs.current.candle) {
      if (!utbotLineRef.current) {
        utbotLineRef.current = chartInstance.current.addSeries(LineSeries, {
          lineWidth: 2, lineStyle: 2, title: 'UT Bot Stop', crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false,
        });
      }

      const atrResult = ATR.calculate({ high: highs, low: lows, close: closes, period: 10 });
      let prevStop = 0; let prevPos = 0; const utbotMarkers = [];
      const offset = rawData.length - atrResult.length;
      const stopLineData = [];
      
      for (let i = offset; i < rawData.length; i++) {
        const atrVal = atrResult[i - offset];
        if (isNaN(atrVal) || atrVal === null) continue;
        
        const nLoss = 2 * atrVal;
        const src = closes[i];
        const prevSrc = i > offset ? closes[i - 1] : src;
        
        let currentStop = prevStop;
        if (src > prevStop && prevSrc > prevStop) currentStop = Math.max(prevStop, src - nLoss);
        else if (src < prevStop && prevSrc < prevStop) currentStop = Math.min(prevStop, src + nLoss);
        else if (src > prevStop) currentStop = src - nLoss;
        else currentStop = src + nLoss;
        
        let currentPos = prevPos;
        if (prevSrc < prevStop && src > currentStop) currentPos = 1;
        else if (prevSrc > prevStop && src < currentStop) currentPos = -1;
        else if (prevPos === 0) currentPos = src > currentStop ? 1 : -1;
        
        if (currentPos === 1 && prevPos !== 1) utbotMarkers.push({ time: rawData[i].time, position: 'belowBar', color: '#22c55e', shape: 'arrowUp', text: 'BUY' });
        else if (currentPos === -1 && prevPos !== -1) utbotMarkers.push({ time: rawData[i].time, position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', text: 'SELL' });
        
        stopLineData.push({ time: rawData[i].time, value: currentStop, color: currentPos === 1 ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)' });

        prevStop = currentStop; prevPos = currentPos;
      }
      
      utbotLineRef.current.setData(stopLineData);
      if (!utbotMarkersRef.current) {
        utbotMarkersRef.current = createSeriesMarkers(seriesRefs.current.candle, utbotMarkers);
      } else {
        utbotMarkersRef.current.setMarkers(utbotMarkers);
      }
    } else {
      if (utbotLineRef.current) {
        chartInstance.current.removeSeries(utbotLineRef.current);
        utbotLineRef.current = null;
      }
      if (utbotMarkersRef.current) {
        utbotMarkersRef.current.setMarkers([]);
      }
    }

    if (indicators.utbot3 && seriesRefs.current.candle) {
      if (!utbot3LineRef.current) {
        utbot3LineRef.current = chartInstance.current.addSeries(LineSeries, {
          lineWidth: 2, lineStyle: 2, title: 'UT Bot (10, 3) Stop', crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false,
        });
      }

      const atrResult = ATR.calculate({ high: highs, low: lows, close: closes, period: 10 });
      let prevStop = 0; let prevPos = 0; const utbot3Markers = [];
      const offset = rawData.length - atrResult.length;
      const stopLineData = [];
      
      for (let i = offset; i < rawData.length; i++) {
        const atrVal = atrResult[i - offset];
        if (isNaN(atrVal) || atrVal === null) continue;
        
        const nLoss = 3 * atrVal;
        const src = closes[i];
        const prevSrc = i > offset ? closes[i - 1] : src;
        
        let currentStop = prevStop;
        if (src > prevStop && prevSrc > prevStop) currentStop = Math.max(prevStop, src - nLoss);
        else if (src < prevStop && prevSrc < prevStop) currentStop = Math.min(prevStop, src + nLoss);
        else if (src > prevStop) currentStop = src - nLoss;
        else currentStop = src + nLoss;
        
        let currentPos = prevPos;
        if (prevSrc < prevStop && src > currentStop) currentPos = 1;
        else if (prevSrc > prevStop && src < currentStop) currentPos = -1;
        else if (prevPos === 0) currentPos = src > currentStop ? 1 : -1;
        
        if (currentPos === 1 && prevPos !== 1) utbot3Markers.push({ time: rawData[i].time, position: 'belowBar', color: '#22c55e', shape: 'arrowUp', text: 'BUY (3)' });
        else if (currentPos === -1 && prevPos !== -1) utbot3Markers.push({ time: rawData[i].time, position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', text: 'SELL (3)' });
        
        stopLineData.push({ time: rawData[i].time, value: currentStop, color: currentPos === 1 ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)' });

        prevStop = currentStop; prevPos = currentPos;
      }
      
      utbot3LineRef.current.setData(stopLineData);
      if (!utbot3MarkersRef.current) {
        utbot3MarkersRef.current = createSeriesMarkers(seriesRefs.current.candle, utbot3Markers);
      } else {
        utbot3MarkersRef.current.setMarkers(utbot3Markers);
      }
    } else {
      if (utbot3LineRef.current) {
        chartInstance.current.removeSeries(utbot3LineRef.current);
        utbot3LineRef.current = null;
      }
      if (utbot3MarkersRef.current) {
        utbot3MarkersRef.current.setMarkers([]);
      }
    }

    if (indicators.fib) {
      if (fibLinesRef.current) {
        fibLinesRef.current.forEach(line => seriesRefs.current.candle.removePriceLine(line));
        fibLinesRef.current = [];
      }
      const lowPrice = Math.min(...lows.slice(-50));
      const highPrice = Math.max(...highs.slice(-50));
      const diff = highPrice - lowPrice;
      const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
      levels.forEach(lvl => {
        const price = lowPrice + (diff * lvl);
        fibLinesRef.current.push(seriesRefs.current.candle.createPriceLine({
            price, color: 'rgba(234, 179, 8, 0.6)', lineStyle: 2, lineWidth: 2, axisLabelVisible: true, title: `Fib ${lvl}`
        }));
      });
    } else {
        if (fibLinesRef.current) {
            fibLinesRef.current.forEach(line => seriesRefs.current.candle.removePriceLine(line));
            fibLinesRef.current = [];
        }
    }

    if (indicators.elliott && seriesRefs.current.candle) {
      if (!elliottLineRef.current) {
        elliottLineRef.current = chartInstance.current.addSeries(LineSeries, {
          color: '#8b5cf6', lineWidth: 2, lineStyle: 1, title: 'Elliott Wave',
        });
      }

      const ewAtrResult = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });
      const ewOffset = rawData.length - ewAtrResult.length;

      let lastPivot = { index: 0, val: rawData[0].close, type: 'start', time: rawData[0].time };
      let direction = 0;
      let pivots = [lastPivot];

      for (let i = 1; i < rawData.length; i++) {
         const candle = rawData[i];
         let deviationVal = i >= ewOffset && !isNaN(ewAtrResult[i - ewOffset]) 
             ? 2 * ewAtrResult[i - ewOffset] 
             : 0.05 * lastPivot.val;
         deviationVal = Math.max(deviationVal, 0.02 * lastPivot.val);

         if (direction === 0) {
             if (candle.high >= lastPivot.val + deviationVal) {
                 direction = 1;
                 lastPivot = { index: i, val: candle.high, type: 'high', time: candle.time };
                 pivots.push(lastPivot);
             } else if (candle.low <= lastPivot.val - deviationVal) {
                 direction = -1;
                 lastPivot = { index: i, val: candle.low, type: 'low', time: candle.time };
                 pivots.push(lastPivot);
             }
         } else if (direction === 1) {
             if (candle.high > lastPivot.val) {
                 lastPivot = { index: i, val: candle.high, type: 'high', time: candle.time };
                 pivots[pivots.length - 1] = lastPivot;
             } else if (candle.low <= lastPivot.val - deviationVal) {
                 direction = -1;
                 lastPivot = { index: i, val: candle.low, type: 'low', time: candle.time };
                 pivots.push(lastPivot);
             }
         } else if (direction === -1) {
             if (candle.low < lastPivot.val) {
                 lastPivot = { index: i, val: candle.low, type: 'low', time: candle.time };
                 pivots[pivots.length - 1] = lastPivot;
             } else if (candle.high >= lastPivot.val + deviationVal) {
                 direction = 1;
                 lastPivot = { index: i, val: candle.high, type: 'high', time: candle.time };
                 pivots.push(lastPivot);
             }
         }
      }

      const lineData = pivots.map(p => ({ time: p.time, value: p.val }));
      elliottLineRef.current.setData(lineData);

      const ewMarkers = [];
      const labels = ['1', '2', '3', '4', '5', 'A', 'B', 'C'];
      const startIdx = Math.max(1, pivots.length - 8);
      
      let labelIdx = 0;
      for (let i = startIdx; i < pivots.length; i++) {
         const p = pivots[i];
         const isHigh = p.type === 'high';
         ewMarkers.push({
             time: p.time,
             position: isHigh ? 'aboveBar' : 'belowBar',
             color: labelIdx < 5 ? '#3b82f6' : '#f59e0b',
             shape: 'circle',
             text: labels[labelIdx]
         });
         labelIdx++;
         if (labelIdx >= labels.length) break;
      }
      
      if (!elliottMarkersRef.current) {
         elliottMarkersRef.current = createSeriesMarkers(elliottLineRef.current, ewMarkers);
      } else {
         elliottMarkersRef.current.setMarkers(ewMarkers);
      }
    } else {
      if (elliottLineRef.current) {
        chartInstance.current.removeSeries(elliottLineRef.current);
        elliottLineRef.current = null;
      }
      if (elliottMarkersRef.current) {
        elliottMarkersRef.current.setMarkers([]);
      }
    }

    if (indicators.rsiDiv && seriesRefs.current.candle) {
      const rsiResult = RSI.calculate({ period: 14, values: closes });
      const offset = rawData.length - rsiResult.length;
      const syncedHighs = highs.slice(offset);
      const syncedLows = lows.slice(offset);
      
      const priceHighPivots = findPivots(syncedHighs, 5, true);
      const rsiHighPivots = findPivots(rsiResult, 5, true);
      const rsiLowPivots = findPivots(rsiResult, 5, false);
      
      const markers = [];
      
      for (let i = 1; i < rsiLowPivots.length; i++) {
        const pivot = rsiLowPivots[i];
        const currRsi = pivot.value;
        const currPriceLow = syncedLows[pivot.index];
        for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
          const prevPivot = rsiLowPivots[j];
          if (pivot.index - prevPivot.index > 60) break;
          const prevRsi = prevPivot.value;
          const prevPriceLow = syncedLows[prevPivot.index];
          if (currPriceLow < prevPriceLow && currRsi > prevRsi) {
            markers.push({ time: rawData[pivot.index + offset].time, position: 'belowBar', color: '#089981', shape: 'arrowUp', text: 'R' });
            break;
          } else if (currPriceLow > prevPriceLow && currRsi < prevRsi) {
            markers.push({ time: rawData[pivot.index + offset].time, position: 'belowBar', color: 'rgba(8, 153, 129, 0.5)', shape: 'arrowUp', text: 'H' });
            break;
          }
        }
      }
      
      for (let i = 1; i < rsiHighPivots.length; i++) {
        const pivot = rsiHighPivots[i];
        const currRsi = pivot.value;
        const currPriceHigh = syncedHighs[pivot.index];
        for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
          const prevPivot = rsiHighPivots[j];
          if (pivot.index - prevPivot.index > 60) break;
          const prevRsi = prevPivot.value;
          const prevPriceHigh = syncedHighs[prevPivot.index];
          if (currPriceHigh > prevPriceHigh && currRsi < prevRsi) {
            markers.push({ time: rawData[pivot.index + offset].time, position: 'aboveBar', color: '#f23645', shape: 'arrowDown', text: 'R' });
            break;
          } else if (currPriceHigh < prevPriceHigh && currRsi > prevRsi) {
            markers.push({ time: rawData[pivot.index + offset].time, position: 'aboveBar', color: 'rgba(242, 54, 69, 0.5)', shape: 'arrowDown', text: 'H' });
            break;
          }
        }
      }
      
      markers.sort((a, b) => a.time - b.time);
      if (!rsiDivMarkersRef.current) rsiDivMarkersRef.current = createSeriesMarkers(seriesRefs.current.candle, markers);
      else rsiDivMarkersRef.current.setMarkers(markers);
    } else {
      if (rsiDivMarkersRef.current) rsiDivMarkersRef.current.setMarkers([]);
    }

    if (indicators.pvz && seriesRefs.current.candle && seriesRefs.current.pvzUo) {
      const emaRes = EMA.calculate({ period: 50, values: closes });
      const atrRes = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });
      
      const emaData = []; const uoData = []; const uiData = []; const liData = []; const loData = [];
      const pvzMarkers = [];
      
      const offset = rawData.length - emaRes.length;
      const atrOffset = rawData.length - atrRes.length;
      
      for (let i = 0; i < rawData.length; i++) {
        if (i >= offset && i >= atrOffset) {
           const emaVal = emaRes[i - offset];
           const atrVal = atrRes[i - atrOffset];
           const time = rawData[i].time;
           
           const ui = emaVal + atrVal * 1.0;
           const li = emaVal - atrVal * 1.0;
           const uo = emaVal + atrVal * 2.0;
           const lo = emaVal - atrVal * 2.0;
           
           emaData.push({ time, value: emaVal });
           
           const close = closes[i];
           const open = rawData[i].open;
           const low = lows[i];
           const high = highs[i];
           
           const bullTrend = close > emaVal;
           
           const lineColor = bullTrend ? 'rgba(41, 98, 255, 0.6)' : 'rgba(239, 83, 80, 0.6)';
            
           uoData.push({ time, value: uo, color: lineColor });
           uiData.push({ time, value: ui, color: lineColor });
           liData.push({ time, value: li, color: lineColor });
           loData.push({ time, value: lo, color: lineColor });
           
           const bullPullback = bullTrend && low <= ui && close > emaVal && close > open;
           const bearPullback = !bullTrend && high >= li && close < emaVal && close < open;
        }
      }
      
      seriesRefs.current.pvzUo.setData(uoData);
      seriesRefs.current.pvzUi.setData(uiData);
      seriesRefs.current.pvzLi.setData(liData);
      seriesRefs.current.pvzLo.setData(loData);
      seriesRefs.current.pvzEma.setData(emaData);
      
      if (!pvzMarkersRef.current) {
        pvzMarkersRef.current = createSeriesMarkers(seriesRefs.current.candle, pvzMarkers);
      } else {
        pvzMarkersRef.current.setMarkers(pvzMarkers);
      }
    } else if (pvzMarkersRef.current) {
      pvzMarkersRef.current.setMarkers([]);
    }



    if (indicators.smc && overlayRef.current) {
      overlayRef.current.innerHTML = '';
      const fvgBlocks = []; const obBlocks = [];
      for (let i = 2; i < rawData.length - 1; i++) {
         let p0 = rawData[i - 2], p1 = rawData[i - 1], p2 = rawData[i];
         if (p2.low > p0.high) {
            fvgBlocks.push({ type: 'FVG', dir: 'bull', topPrice: p2.low, bottomPrice: p0.high, startTime: p1.time, endTime: null });
            if (p0.close < p0.open) obBlocks.push({ type: 'OB', dir: 'bull', topPrice: p0.high, bottomPrice: p0.low, startTime: p0.time, endTime: null });
         } else if (p2.high < p0.low) {
            fvgBlocks.push({ type: 'FVG', dir: 'bear', topPrice: p0.low, bottomPrice: p2.high, startTime: p1.time, endTime: null });
            if (p0.close > p0.open) obBlocks.push({ type: 'OB', dir: 'bear', topPrice: p0.high, bottomPrice: p0.low, startTime: p0.time, endTime: null });
         }
      }
      const allBlocks = [...fvgBlocks, ...obBlocks];
      for (let b of allBlocks) {
         let startIndex = rawData.findIndex(d => d.time === b.startTime);
         if (startIndex === -1) continue;
         let mitigated = false;
         for (let i = startIndex + 1; i < rawData.length; i++) {
            if (b.dir === 'bull' && rawData[i].low < b.bottomPrice) { mitigated = true; b.endTime = rawData[i].time; break; }
            if (b.dir === 'bear' && rawData[i].high > b.topPrice) { mitigated = true; b.endTime = rawData[i].time; break; }
         }
         if (!mitigated) { b.endTime = rawData[rawData.length - 1].time; b.active = true; }
      }
      
      const finalBlocks = allBlocks.filter(b => b.active || b.endTime);
      const newBlockElements = [];
      
      finalBlocks.forEach(block => {
         const div = document.createElement('div');
         div.style.position = 'absolute';
         if (block.type === 'OB') {
            div.style.backgroundColor = block.dir === 'bull' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';
            div.style.border = `1px solid ${block.dir === 'bull' ? '#22c55e' : '#ef4444'}`;
         } else {
            div.style.backgroundColor = block.dir === 'bull' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';
         }
         overlayRef.current.appendChild(div);
         newBlockElements.push({ div, block });
      });
      blockElementsRef.current = newBlockElements;

      const chart = chartInstance.current;
      blockElementsRef.current.forEach(({ div, block }) => {
         const yTop = seriesRefs.current.candle.priceToCoordinate(block.topPrice);
         const yBottom = seriesRefs.current.candle.priceToCoordinate(block.bottomPrice);
         let xStart = chart.timeScale().timeToCoordinate(block.startTime);
         let xEnd = chart.timeScale().timeToCoordinate(block.endTime);
         if (yTop === null || yBottom === null || xStart === null || xEnd === null) {
           div.style.display = 'none'; return;
         }
         div.style.display = 'block';
         div.style.top = `${Math.min(yTop, yBottom)}px`;
         div.style.height = `${Math.abs(yBottom - yTop)}px`;
         div.style.left = `${xStart}px`;
         div.style.width = `${xEnd - xStart}px`;
      });
    } else if (overlayRef.current) {
      overlayRef.current.innerHTML = '';
      blockElementsRef.current = [];
    }

    if (indicators.iez && seriesRefs.current.candle) {
      const highs = rawData.map(d => d.high);
      const lows = rawData.map(d => d.low);
      const closes = rawData.map(d => d.close);
      const opens = rawData.map(d => d.open);
      const iezAtr = ATR.calculate({ period: 14, high: highs, low: lows, close: closes });
      const iezAtrOffset = closes.length - iezAtr.length;
      let bullishZones = [];
      let bearishZones = [];
      const markers = [];
      for (let i = 20; i < closes.length; i++) {
        if (i < iezAtrOffset) continue;
        const currentAtr = iezAtr[i - iezAtrOffset];
        const body = Math.abs(closes[i] - opens[i]);
        if (closes[i] > opens[i] && body > 1.5 * currentAtr) {
          for (let j = i - 1; j > Math.max(0, i - 10); j--) {
            if (closes[j] < opens[j]) {
              bullishZones.push({ top: highs[j], bottom: lows[j], active: true, signalGiven: false, startIndex: j });
              break;
            }
          }
        }
        if (closes[i] < opens[i] && body > 1.5 * currentAtr) {
          for (let j = i - 1; j > Math.max(0, i - 10); j--) {
            if (closes[j] > opens[j]) {
              bearishZones.push({ top: highs[j], bottom: lows[j], active: true, signalGiven: false, startIndex: j });
              break;
            }
          }
        }
        bullishZones.forEach(z => {
          if (!z.active) return;
          if (closes[i] < z.bottom) z.active = false;
          else if (lows[i] <= z.top && !z.signalGiven && i > z.startIndex + 2) {
            z.signalGiven = true;
            markers.push({ time: rawData[i].time, position: 'belowBar', color: '#089981', shape: 'arrowUp', text: 'IEZ BUY' });
          }
        });
        bearishZones.forEach(z => {
          if (!z.active) return;
          if (closes[i] > z.top) z.active = false;
          else if (highs[i] >= z.bottom && !z.signalGiven && i > z.startIndex + 2) {
            z.signalGiven = true;
            markers.push({ time: rawData[i].time, position: 'aboveBar', color: '#f23645', shape: 'arrowDown', text: 'IEZ SELL' });
          }
        });
      }
      if (!iezMarkersRef.current) iezMarkersRef.current = createSeriesMarkers(seriesRefs.current.candle, markers);
      else iezMarkersRef.current.setMarkers(markers);
    } else {
      if (iezMarkersRef.current) iezMarkersRef.current.setMarkers([]);
    }

  }, [haData, rawData, indicators, chartType]);

  return <div ref={chartContainerRef} style={{ width: '100%', height: '100%', position: 'relative' }} />;
};

const formatHeikinAshi = (rawCandles) => {
  let prevHaOpen = null;
  let prevHaClose = null;

  return rawCandles.map((candle, index) => {
    const timeStr = candle[0];
    const time = Math.floor(new Date(timeStr).getTime() / 1000);
    
    const open = parseFloat(candle[1]);
    const high = parseFloat(candle[2]);
    const low = parseFloat(candle[3]);
    const close = parseFloat(candle[4]);

    const haClose = (open + high + low + close) / 4;
    const haOpen = index === 0 ? (open + close) / 2 : (prevHaOpen + prevHaClose) / 2;
    const haHigh = Math.max(high, haOpen, haClose);
    const haLow = Math.min(low, haOpen, haClose);

    prevHaOpen = haOpen;
    prevHaClose = haClose;

    return { time, open: parseFloat(haOpen.toFixed(2)), high: parseFloat(haHigh.toFixed(2)), low: parseFloat(haLow.toFixed(2)), close: parseFloat(haClose.toFixed(2)) };
  });
};

const extractRaw = (rawCandles) => {
  return rawCandles.map(candle => ({
    time: Math.floor(new Date(candle[0]).getTime() / 1000),
    open: parseFloat(candle[1]),
    high: parseFloat(candle[2]),
    low: parseFloat(candle[3]),
    close: parseFloat(candle[4]),
    volume: candle[5] ? parseFloat(candle[5]) : 0
  }));
};

const aggregateCandles = (candles1m, timeframe) => {
  if (timeframe === '1minute') return candles1m;
  
  const minutes = parseInt(timeframe.replace('minute', ''), 10);
  if (isNaN(minutes)) return candles1m;

  const aggregated = [];
  let currentGroup = [];
  let currentGroupTime = null;

  candles1m.forEach(candle => {
    const date = new Date(candle[0]);
    const h = date.getHours();
    const m = date.getMinutes();
    const minutesFromOpen = (h - 9) * 60 + m - 15;
    const groupIndex = Math.floor(minutesFromOpen / minutes);
    
    if (currentGroupTime === null || currentGroupTime !== groupIndex) {
      if (currentGroup.length > 0) {
        const groupOpen = currentGroup[0][1];
        const groupHigh = Math.max(...currentGroup.map(c => c[2]));
        const groupLow = Math.min(...currentGroup.map(c => c[3]));
        const groupClose = currentGroup[currentGroup.length - 1][4];
        const groupVol = currentGroup.reduce((sum, c) => sum + (c[5] ? parseFloat(c[5]) : 0), 0);
        const groupOi = currentGroup[currentGroup.length - 1][6] || 0;
        aggregated.push([currentGroup[0][0], groupOpen, groupHigh, groupLow, groupClose, groupVol, groupOi]);
      }
      currentGroup = [candle];
      currentGroupTime = groupIndex;
    } else {
      currentGroup.push(candle);
    }
  });

  if (currentGroup.length > 0) {
    const groupOpen = currentGroup[0][1];
    const groupHigh = Math.max(...currentGroup.map(c => c[2]));
    const groupLow = Math.min(...currentGroup.map(c => c[3]));
    const groupClose = currentGroup[currentGroup.length - 1][4];
    const groupVol = currentGroup.reduce((sum, c) => sum + (c[5] ? parseFloat(c[5]) : 0), 0);
    const groupOi = currentGroup[currentGroup.length - 1][6] || 0;
    aggregated.push([currentGroup[0][0], groupOpen, groupHigh, groupLow, groupClose, groupVol, groupOi]);
  }

  return aggregated;
};

const findPivots = (data, window = 5, isHigh = true) => {
  const pivots = [];
  for (let i = window; i < data.length - window; i++) {
    let isPivot = true;
    for (let j = i - window; j <= i + window; j++) {
      if (i === j) continue;
      if (isHigh && data[j] >= data[i]) { isPivot = false; break; }
      if (!isHigh && data[j] <= data[i]) { isPivot = false; break; }
    }
    if (isPivot) pivots.push({ index: i, value: data[i] });
  }
  return pivots;
};

const calculateSignals = (rawCandles) => {
  if (!rawCandles || rawCandles.length === 0) return { signals: null, values: null };
  const opens = []; const closes = []; const highs = []; const lows = []; const volumes = [];
  let totalVol = 0;
  rawCandles.forEach(c => { opens.push(parseFloat(c[1])); highs.push(parseFloat(c[2])); lows.push(parseFloat(c[3])); closes.push(parseFloat(c[4])); let v = c[5] ? parseFloat(c[5]) : 0; totalVol += v; volumes.push(v); });
  if (totalVol === 0) volumes.fill(1);
  const currentClose = closes[closes.length - 1];
  
  let newSignals = { rsi: 'NEUTRAL', macd: 'NEUTRAL', vwap: 'NEUTRAL', mavwap: 'NEUTRAL', adx: 'WEAK', ewo: 'NEUTRAL', utbot: 'NEUTRAL', rsiDiv: 'NEUTRAL', iez: 'NEUTRAL' };
  let newVals = { rsi: null, macd: null, vwap: null, mavwap: null, adx: null };
  
  const rsiRes = RSI.calculate({ values: closes, period: 14 });
  if (rsiRes.length > 0) { const curRsi = rsiRes[rsiRes.length - 1]; newVals.rsi = curRsi; if (curRsi > 60) newSignals.rsi = 'BULLISH'; else if (curRsi < 40) newSignals.rsi = 'BEARISH'; }

  const macdRes = MACD.calculate({ fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false, values: closes });
  if (macdRes.length > 0) { const curMacd = macdRes[macdRes.length - 1]; if (curMacd) { newVals.macd = curMacd.histogram; if (curMacd.histogram > 0) newSignals.macd = 'BULLISH'; else if (curMacd.histogram < 0) newSignals.macd = 'BEARISH'; } }

  const vwapRes = VWAP.calculate({ high: highs, low: lows, close: closes, volume: volumes });
  if (vwapRes.length > 0) { const curVwap = vwapRes[vwapRes.length - 1]; newVals.vwap = curVwap; if (currentClose > curVwap) newSignals.vwap = 'BULLISH'; else newSignals.vwap = 'BEARISH'; }

  const mavwapRes = SMA.calculate({ period: 30, values: vwapRes.filter(v => !isNaN(v) && v !== null) });
  if (mavwapRes.length > 0) { const curMavwap = mavwapRes[mavwapRes.length - 1]; newVals.mavwap = curMavwap; const curVwap = vwapRes[vwapRes.length - 1]; if (curVwap > curMavwap) newSignals.mavwap = 'BULLISH'; else newSignals.mavwap = 'BEARISH'; }

  const adxRes = ADX.calculate({ high: highs, low: lows, close: closes, period: 14 });
  if (adxRes.length > 0) { const curAdx = adxRes[adxRes.length - 1]; if (curAdx) { newVals.adx = curAdx.adx; if (curAdx.adx > 25) newSignals.adx = 'STRONG'; } }

  const ewo5 = SMA.calculate({ period: 5, values: closes });
  const ewo35 = SMA.calculate({ period: 35, values: closes });
  if (ewo5.length > 0 && ewo35.length > 0) {
     const curEwo = ewo5[ewo5.length - 1] - ewo35[ewo35.length - 1];
     const prevEwo = ewo5.length > 1 ? ewo5[ewo5.length - 2] - ewo35[ewo35.length - 2] : 0;
     if (curEwo > 0 && curEwo >= prevEwo) newSignals.ewo = 'STRONG UPWARD';
     else if (curEwo > 0 && curEwo < prevEwo) newSignals.ewo = 'WEAK UPWARD';
     else if (curEwo < 0 && curEwo < prevEwo) newSignals.ewo = 'STRONG DOWNWARD';
     else if (curEwo < 0 && curEwo >= prevEwo) newSignals.ewo = 'WEAK DOWNWARD';
  }
  
  const atrRes = ATR.calculate({ high: highs, low: lows, close: closes, period: 10 });
  let prevStop = 0; let prevPos = 0;
  const atrOffset = closes.length - atrRes.length;
  for (let i = atrOffset; i < closes.length; i++) {
     let atrVal = atrRes[i - atrOffset];
     if (isNaN(atrVal) || atrVal === null) continue;
     let src = closes[i]; let prevSrc = i > atrOffset ? closes[i-1] : src;
     let currentStop = prevStop;
     if (src > prevStop && prevSrc > prevStop) currentStop = Math.max(prevStop, src - atrVal);
     else if (src < prevStop && prevSrc < prevStop) currentStop = Math.min(prevStop, src + atrVal);
     else if (src > prevStop) currentStop = src - atrVal;
     else currentStop = src + atrVal;
     let currentPos = prevPos;
     if (prevSrc < prevStop && src > currentStop) currentPos = 1;
     else if (prevSrc > prevStop && src < currentStop) currentPos = -1;
     prevStop = currentStop; prevPos = currentPos;
  }
  newSignals.utbot = prevPos === 1 ? 'BUY' : prevPos === -1 ? 'SELL' : 'NEUTRAL';
  
  if (rsiRes.length > 20) {
    const recentHighs = highs.slice(-100);
    const recentLows = lows.slice(-100);
    const recentRsi = rsiRes.slice(-100);
    const rHighs = findPivots(recentRsi, 5, true);
    const rLows = findPivots(recentRsi, 5, false);
    
    for (let i = 1; i < rLows.length; i++) {
      const currPivot = rLows[i];
      if (currPivot.index <= 50) continue;
      const currRsi = currPivot.value;
      const currPriceLow = recentLows[currPivot.index];
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        const prevPivot = rLows[j];
        if (currPivot.index - prevPivot.index > 60) break;
        const prevRsi = prevPivot.value;
        const prevPriceLow = recentLows[prevPivot.index];
        if (currPriceLow < prevPriceLow && currRsi > prevRsi) {
          newSignals.rsiDiv = 'BULLISH';
          break;
        } else if (currPriceLow > prevPriceLow && currRsi < prevRsi) {
          newSignals.rsiDiv = 'BULLISH (HIDDEN)';
          break;
        }
      }
    }
    
    for (let i = 1; i < rHighs.length; i++) {
      const currPivot = rHighs[i];
      if (currPivot.index <= 50) continue;
      const currRsi = currPivot.value;
      const currPriceHigh = recentHighs[currPivot.index];
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        const prevPivot = rHighs[j];
        if (currPivot.index - prevPivot.index > 60) break;
        const prevRsi = prevPivot.value;
        const prevPriceHigh = recentHighs[prevPivot.index];
        if (currPriceHigh > prevPriceHigh && currRsi < prevRsi) {
          newSignals.rsiDiv = 'BEARISH';
          break;
        } else if (currPriceHigh < prevPriceHigh && currRsi > prevRsi) {
          newSignals.rsiDiv = 'BEARISH (HIDDEN)';
          break;
        }
      }
    }
  }

  const iezAtr = ATR.calculate({ period: 14, high: highs, low: lows, close: closes });
  const iezAtrOffset = closes.length - iezAtr.length;
  let bullishZones = [];
  let bearishZones = [];
  for (let i = 20; i < closes.length; i++) {
    if (i < iezAtrOffset) continue;
    const currentAtr = iezAtr[i - iezAtrOffset];
    const body = Math.abs(closes[i] - opens[i]);
    if (closes[i] > opens[i] && body > 1.5 * currentAtr) {
      for (let j = i - 1; j > Math.max(0, i - 10); j--) {
        if (closes[j] < opens[j]) {
          bullishZones.push({ top: highs[j], bottom: lows[j], active: true, signalGiven: false, startIndex: j });
          break;
        }
      }
    }
    if (closes[i] < opens[i] && body > 1.5 * currentAtr) {
      for (let j = i - 1; j > Math.max(0, i - 10); j--) {
        if (closes[j] > opens[j]) {
          bearishZones.push({ top: highs[j], bottom: lows[j], active: true, signalGiven: false, startIndex: j });
          break;
        }
      }
    }
    bullishZones.forEach(z => {
      if (!z.active) return;
      if (closes[i] < z.bottom) z.active = false;
      else if (lows[i] <= z.top && !z.signalGiven && i > z.startIndex + 2) {
        z.signalGiven = true;
        if (i >= closes.length - 2) newSignals.iez = 'BUY';
      }
    });
    bearishZones.forEach(z => {
      if (!z.active) return;
      if (closes[i] > z.top) z.active = false;
      else if (highs[i] >= z.bottom && !z.signalGiven && i > z.startIndex + 2) {
        z.signalGiven = true;
        if (i >= closes.length - 2) newSignals.iez = 'SELL';
      }
    });
  }

  return { signals: newSignals, values: newVals };
};

const SignalBoard = ({ title, signals, values }) => {
  if (!signals || !values) return null;
  return (
    <div className="signal-board" style={{ marginTop: '1rem' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)' }}>
        <Activity size={18} className="logo-icon" />
        {title} Technicals
      </h3>
      <div className="summary-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
        <div className="summary-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.1)', borderRadius: '6px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>RSI (14) {values.rsi !== null ? `(${values.rsi.toFixed(2)})` : ''}</span>
          <span className={`badge ${signals.rsi.toLowerCase()}`}>{signals.rsi}</span>
        </div>
        <div className="summary-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.1)', borderRadius: '6px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>MACD {values.macd !== null ? `(${values.macd.toFixed(2)})` : ''}</span>
          <span className={`badge ${signals.macd.toLowerCase()}`}>{signals.macd}</span>
        </div>
        <div className="summary-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.1)', borderRadius: '6px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>VWAP {values.vwap !== null ? `(${values.vwap.toFixed(2)})` : ''}</span>
          <span className={`badge ${signals.vwap.toLowerCase()}`}>{signals.vwap}</span>
        </div>
        <div className="summary-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.1)', borderRadius: '6px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>MAVWAP {values.mavwap !== null ? `(${values.mavwap.toFixed(2)})` : ''}</span>
          <span className={`badge ${signals.mavwap.toLowerCase()}`}>{signals.mavwap}</span>
        </div>
        <div className="summary-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.1)', borderRadius: '6px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>ADX {values.adx !== null ? `(${values.adx.toFixed(2)})` : ''}</span>
          <span className={`badge ${signals.adx.toLowerCase()}`}>{signals.adx}</span>
        </div>
        <div className="summary-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.1)', borderRadius: '6px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Elliott Wave</span>
          <span className={`badge ${signals.ewo.includes('UPWARD') ? 'bullish' : signals.ewo.includes('DOWNWARD') ? 'bearish' : 'neutral'}`}>{signals.ewo}</span>
        </div>
        <div className="summary-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.1)', borderRadius: '6px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>UT Bot</span>
          <span className={`badge ${signals.utbot === 'BUY' ? 'bullish' : signals.utbot === 'SELL' ? 'bearish' : 'neutral'}`}>{signals.utbot}</span>
        </div>
        <div className="summary-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.1)', borderRadius: '6px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>RSI Div</span>
          <span className={`badge ${signals.rsiDiv?.includes('BULLISH') ? 'bullish' : signals.rsiDiv?.includes('BEARISH') ? 'bearish' : 'neutral'}`}>{signals.rsiDiv}</span>
        </div>
        <div className="summary-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.1)', borderRadius: '6px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>IEZ</span>
          <span className={`badge ${signals.iez?.includes('BUY') ? 'bullish' : signals.iez?.includes('SELL') ? 'bearish' : 'neutral'}`}>{signals.iez}</span>
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
    rsi: true, macd: true, vwap: false, mavwap: false, utbot: false, utbot3: false, fib: false, elliott: false, pvz: false, smc: false, rsiDiv: false, iez: false
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
                <p className="subtitle">Premium ({timeframe.replace('minute', 'm')} {chartType})</p>
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
