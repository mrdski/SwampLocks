"use client";

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

// Initial colors for example tickers
const initialColors: Record<string, string> = {
  AAPL: "#8884d8",
  GOOGL: "#82ca9d",
  MSFT: "#ff7300",
};

// Utility to generate a random hex color
function generateRandomColor(): string {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// Available timeframe options
const timeframes = [
  { label: "Today", value: "1d" },
  { label: "1W", value: "1w" },
  { label: "1M", value: "1mo" },
  { label: "YTD", value: "ytd" },
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
  { label: "5Y", value: "5y" },
  { label: "Max", value: "max" }
];

// Represent one row of merged date + prices
interface MergedRow {
  date: string;
  [ticker: string]: string | number;
}

// Main component for searching and charting multiple stocks
export default function MultiStockSearchChart() {
  // Search input state
  const [searchQuery, setSearchQuery] = useState("");
  // Autocomplete suggestions based on searchQuery
  const [suggestions, setSuggestions] = useState<string[]>([]);
  // List of tickers chosen by user
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  // Map of ticker to its display color
  const [tickerColors, setTickerColors] = useState<Record<string, string>>(initialColors);

  // Combined raw data by date and ticker
  const [mergedData, setMergedData] = useState<MergedRow[]>([]);
  // Data filtered by selected timeframe
  const [filteredData, setFilteredData] = useState<MergedRow[]>([]);
  // Current timeframe choice
  const [timeframe, setTimeframe] = useState("max");

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  // Fetch autocomplete suggestions when searchQuery changes
  useEffect(() => {
    async function fetchSuggestions() {
      if (!searchQuery) {
        setSuggestions([]);
        return;
      }
      try {
        const resp = await axios.get(
          `${API_BASE_URL}/api/financials/stocks/autocomplete?query=${searchQuery}`
        );
        setSuggestions(resp.data);
      } catch {
        setSuggestions([]);
      }
    }
    fetchSuggestions();
  }, [searchQuery, API_BASE_URL]);

  // Handle form submit to add ticker
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    addTicker(searchQuery);
  }

  // Add a ticker to the list, assign a color if new
  async function addTicker(ticker: string) {
    const uppercaseTicker = ticker.toUpperCase().trim();
    if (!uppercaseTicker) return;
    if (selectedTickers.includes(uppercaseTicker)) {
      setSearchQuery("");
      setSuggestions([]);
      return;
    }
    setError(null);
    if (!tickerColors[uppercaseTicker]) {
      setTickerColors(prev => ({
        ...prev,
        [uppercaseTicker]: generateRandomColor()
      }));
    }
    setSelectedTickers(prev => [...prev, uppercaseTicker]);
    setSearchQuery("");
    setSuggestions([]);
  }

  // Remove a ticker from the list
  function removeTicker(ticker: string) {
    setSelectedTickers(prev => prev.filter(t => t !== ticker));
  }

  // Fetch price data for all selected tickers whenever list changes
  useEffect(() => {
    if (selectedTickers.length === 0) {
      setMergedData([]);
      return;
    }
    let cancelled = false;
    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        const results = await Promise.all(
          selectedTickers.map(async (ticker) => {
            // Fetch historical filtered data and today's data
            const [respFiltered, respDaily] = await Promise.all([
              axios.get(`${API_BASE_URL}/api/financials/stocks/${ticker}/filtered_data`),
              axios.get(`${API_BASE_URL}/api/financials/stocks/${ticker}/todays_data`),
            ]);
            // Combine and normalize date format
            const combinedPoints = [...respFiltered.data, ...respDaily.data].map((item: any) => ({
              date: new Date(item.date).toISOString().slice(0, 10),
              price: item.closingPrice
            }));
            return { ticker, data: combinedPoints };
          })
        );

        if (cancelled) return;

        // Merge data by date into one object
        const dataMap: Record<string, any> = {};
        for (const { ticker, data } of results) {
          data.forEach(pt => {
            const d = pt.date;
            if (!dataMap[d]) dataMap[d] = { date: d };
            dataMap[d][ticker] = pt.price;
          });
        }
        // Convert map to sorted array
        const mergedArray = Object.values(dataMap).sort((a: any, b: any) => a.date.localeCompare(b.date)) as MergedRow[];
        setMergedData(mergedArray);
      } catch {
        if (!cancelled) setError("Error fetching multi-stock data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAll();
    return () => { cancelled = true; };
  }, [selectedTickers, API_BASE_URL]);

  // Filter mergedData by the selected timeframe
  useEffect(() => {
    function filterByTimeframe(tf: string, arr: MergedRow[]): MergedRow[] {
      if (tf === "max") return arr;
      const now = new Date();
      let result = [...arr];
      switch (tf) {
        case "1d":
          const today = new Date(); today.setHours(0,0,0,0);
          result = result.filter(item => new Date(item.date) >= today);
          break;
        case "1w":
          const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
          result = result.filter(item => new Date(item.date) >= weekAgo);
          break;
        case "1mo":
          const moAgo = new Date(now); moAgo.setMonth(now.getMonth() - 1);
          result = result.filter(item => new Date(item.date) >= moAgo);
          break;
        case "6mo":
          const sixMoAgo = new Date(now); sixMoAgo.setMonth(now.getMonth() - 6);
          result = result.filter(item => new Date(item.date) >= sixMoAgo);
          break;
        case "1y":
          const yrAgo = new Date(now); yrAgo.setFullYear(now.getFullYear() - 1);
          result = result.filter(item => new Date(item.date) >= yrAgo);
          break;
        case "5y":
          const fiveYrAgo = new Date(now); fiveYrAgo.setFullYear(now.getFullYear() - 5);
          result = result.filter(item => new Date(item.date) >= fiveYrAgo);
          break;
        case "ytd":
          const startYear = new Date(now.getFullYear(), 0, 1);
          result = result.filter(item => new Date(item.date) >= startYear);
          break;
      }
      return result;
    }
    setFilteredData(filterByTimeframe(timeframe, mergedData));
  }, [timeframe, mergedData]);

  // Standardize prices so first date = 100%
  const standardizedData = useMemo(() => {
    if (!filteredData.length) return [];
    const bases: Record<string, number> = {};
    filteredData[0] && Object.keys(filteredData[0]).forEach(key => {
      if (key !== 'date') bases[key] = Number(filteredData[0][key]);
    });
    return filteredData.map(row => {
      const out: any = { date: row.date };
      Object.keys(row).forEach(key => {
        if (key !== 'date') {
          const val = Number(row[key]);
          out[key] = bases[key] ? (val / bases[key]) * 100 : 0;
        }
      });
      return out;
    });
  }, [filteredData]);

  // Compute daily returns for correlation
  const returnsData = useMemo(() => {
    if (filteredData.length < 2) return [];
    const arr: any[] = [];
    for (let i = 1; i < filteredData.length; i++) {
      const prev = filteredData[i - 1];
      const curr = filteredData[i];
      const row: any = { date: curr.date };
      Object.keys(curr).forEach(key => {
        if (key !== 'date') {
          const p = Number(prev[key]);
          const c = Number(curr[key]);
          row[key] = p ? (c - p) / p : 0;
        }
      });
      arr.push(row);
    }
    return arr;
  }, [filteredData]);

  // Correlation helper
  function computeCorrelation(a: number[], b: number[]): number {
    const n = a.length;
    const meanA = a.reduce((s,v) => s+v,0)/n;
    const meanB = b.reduce((s,v) => s+v,0)/n;
    let num=0, denA=0, denB=0;
    for (let i=0; i<n; i++) {
      const da = a[i] - meanA;
      const db = b[i] - meanB;
      num += da*db;
      denA += da*da;
      denB += db*db;
    }
    return denA && denB ? num/Math.sqrt(denA*denB) : 0;
  }

  // Pairwise correlations between tickers
  const pairwiseCorr = useMemo(() => {
    const corr: Record<string, number> = {};
    if (!returnsData.length) return corr;
    const tickerList = Object.keys(returnsData[0]).filter(k => k !== 'date');
    const returnsMap: Record<string, number[]> = {};
    tickerList.forEach(t => returnsMap[t] = []);
    returnsData.forEach(row => tickerList.forEach(t => returnsMap[t].push(Number(row[t]))));
    for (let i=0; i<tickerList.length; i++) {
      for (let j=i+1; j<tickerList.length; j++) {
        const t1 = tickerList[i], t2 = tickerList[j];
        const key = [t1,t2].sort().join('-');
        corr[key] = computeCorrelation(returnsMap[t1], returnsMap[t2]);
      }
    }
    return corr;
  }, [returnsData]);

  // Determine Y-axis bounds for chart
  const allVals = standardizedData.flatMap(row =>
    Object.keys(row).filter(k => k!=='date').map(k => Number(row[k]))
  );
  const yMin = allVals.length ? Math.min(...allVals) : 0;
  const yMax = allVals.length ? Math.max(...allVals) : 100;

  // Compute overall % change
  const percentageChanges: Record<string, number> = {};
  if (standardizedData.length) {
    const first = standardizedData[0], last = standardizedData[standardizedData.length-1];
    Object.keys(first).filter(k=>'date'!==k).forEach(t => {
      const v0 = Number(first[t]), v1 = Number(last[t]);
      percentageChanges[t] = v0 ? ((v1-v0)/v0)*100 : 0;
    });
  }

  return (
    <div className="w-full flex flex-col gap-4 relative text-black">
      {/* Info icon with disclaimer */}
      <div className="absolute top-0 right-0 mt-2 mr-2 group inline-block cursor-pointer">
        <span className="border rounded-full px-2 py-1 bg-gray-100">i</span>
        <div className="absolute hidden group-hover:block bg-white border rounded p-2 w-60 text-xs right-0 mt-1">
          <p className="font-semibold">Disclaimer</p>
          <p>This chart is a correlation tool and does NOT reflect real price data.</p>
        </div>
      </div>

      {/* Search form */}
      <div className="relative w-full max-w-xl">
        <form onSubmit={handleSubmit} className="flex bg-gray-100 rounded">
          <input
            type="text"
            placeholder="Enter stock ticker..."
            className="flex-grow p-2 outline-none rounded-l text-black"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setError(null); }}
          />
          <button className="px-4 bg-gray-300 rounded-r" type="submit">Add</button>
        </form>
        {/* Show suggestions dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute bg-white border rounded w-full top-12 z-10 max-h-60 overflow-y-auto text-black">
            {suggestions.map(sugg => (
              <div
                key={sugg}
                className="p-2 hover:bg-gray-200 cursor-pointer"
                onClick={() => addTicker(sugg)}
              >{sugg}</div>
            ))}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && <div className="text-red-500">{error}</div>}

      {/* Show selected tickers with remove buttons */}
      {selectedTickers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTickers.map(t => (
            <div key={t} className="bg-gray-200 px-2 py-1 rounded flex items-center">
              {t}
              <button className="ml-2 text-red-600 font-bold" onClick={() => removeTicker(t)}>x</button>
            </div>
          ))}
        </div>
      )}

      {/* Timeframe buttons */}
      <div className="flex gap-2 mb-2">
        {timeframes.map(tf => (
          <button
            key={tf.value}
            className={`px-3 py-1 rounded ${timeframe===tf.value? 'bg-secondary':'bg-accent'}`} 
            onClick={() => setTimeframe(tf.value)}
          >{tf.label}</button>
        ))}
      </div>

      {/* Loading indicator */}
      {loading && <p>Loading...</p>}

      {/* Chart or prompt when no tickers */}
      {selectedTickers.length===0 && <p>No tickers added yet.</p>}
      {selectedTickers.length>0 && standardizedData.length>0 && (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={standardizedData}>
            <XAxis
              dataKey="date"
              tick={{ fill: "black" }}
              tickFormatter={tick => {
                const d=new Date(tick);
                return `${d.getMonth()+1}/${d.getDate()}`;
              }}
            />
            <YAxis domain={[yMin-5, yMax+5]} hide axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: "#fff" }} />
            {selectedTickers.map(t => (
              <Line
                key={t}
                dataKey={t}
                stroke={tickerColors[t]||"#000"}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Legend with net % change */}
      {selectedTickers.length>0 && standardizedData.length>0 && (
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <h3 className="font-bold">Stocks</h3>
            <ul className="flex gap-4">
              {selectedTickers.map(t => (
                <li key={t} className="flex items-center gap-2">
                  <div style={{width:20,height:4,backgroundColor:tickerColors[t]}} />
                  <span>{t} ({percentageChanges[t]?.toFixed(2)}%)</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Pairwise correlations list */}
          {Object.keys(pairwiseCorr).length>0 && (
            <div>
              <h3 className="font-bold">Pairwise Correlations</h3>
              <ul>
                {Object.entries(pairwiseCorr).map(([pair, corr]) => (
                  <li key={pair}>{pair}: {corr.toFixed(2)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
