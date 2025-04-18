"use client";

import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import CircularProgress from '@mui/material/CircularProgress';

// Available timeframe options for the chart
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

// Data shape for each stock data point
type StockData = {
    date: string;
    price: number;
};

// Props for the StockChart component
type StockChartProps = {
    ticker: string;
};

// Main component to show a stock's price chart with timeframes
export default function StockChart({ ticker }: StockChartProps) {
    // Full historical data fetched from API
    const [data, setData] = useState<StockData[]>([]);
    // Today's intraday data
    const [dailyData, setDailyData] = useState<StockData[]>([]);
    // Data filtered by current timeframe
    const [filteredData, setFilteredData] = useState<StockData[]>([]);
    // Loading and error states
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Current timeframe and percentage change display
    const [timeframe, setTimeframe] = useState("max");
    const [percentageChange, setPercentageChange] = useState<number | null>(null);

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    // Compute percent change between first and last points when filteredData updates
    useEffect(() => {
        if (filteredData.length > 1) {
            const firstPrice = filteredData[0].price;
            const lastPrice = filteredData[filteredData.length - 1].price;
            setPercentageChange(((lastPrice - firstPrice) / firstPrice) * 100);
        }
    }, [filteredData]);

    // Fetch historical and daily data when the ticker changes
    useEffect(() => {
        async function fetchStockData() {
            setLoading(true);
            setError(null);
            try {
                // Get historical filtered data
                const response = await axios.get(
                    `${API_BASE_URL}/api/financials/stocks/${ticker}/filtered_data`
                );
                // Get today's data
                const dailyResponse = await axios.get(
                    `${API_BASE_URL}/api/financials/stocks/${ticker}/todays_data`
                );

                // Convert API raw data into our StockData format
                const processedData = response.data.map((item: any) => ({
                    date: new Date(item.date).toLocaleDateString(),
                    price: item.closingPrice
                }));
                const processedDaily = dailyResponse.data.map((item: any) => ({
                    date: new Date(item.date).toLocaleDateString(),
                    price: item.closingPrice
                }));

                // Save data and initialize filteredData to full history
                setData(processedData);
                setDailyData(processedDaily);
                setFilteredData(processedData);
            } catch (err) {
                setError("Stock data not found.");
                console.error("Error fetching stock data:", err);
            } finally {
                setLoading(false);
            }
        }

        if (ticker) fetchStockData();
    }, [ticker]);

    // Filter data based on selected timeframe
    function filterDataByTimeframe(tf: string) {
        const now = new Date();
        let result: StockData[] = [];

        if (tf === "1d") {
            // For 'Today', show yesterday's last point plus today's intraday
            const yesterday = data[data.length - 2];
            result = [yesterday, ...dailyData];
        } else {
            // Start with full history
            result = [...data];
            let cutoff: Date | null = null;

            // Determine cutoff date based on timeframe
            if (tf === "1w") cutoff = new Date(now.setDate(now.getDate() - 7));
            if (tf === "1mo") cutoff = new Date(now.setMonth(now.getMonth() - 1));
            if (tf === "6mo") cutoff = new Date(now.setMonth(now.getMonth() - 6));
            if (tf === "1y") cutoff = new Date(now.setFullYear(now.getFullYear() - 1));
            if (tf === "5y") cutoff = new Date(now.setFullYear(now.getFullYear() - 5));
            if (tf === "ytd") cutoff = new Date(new Date().getFullYear(), 0, 1);

            // Keep only points after the cutoff
            if (cutoff) {
                result = result.filter(item => new Date(item.date) >= cutoff);
            }
        }

        // Update filtered data
        setFilteredData(result);
    }

    // Choose line color based on overall price movement
    const lineColor = useMemo(() => {
        if (filteredData.length < 2) return "#8884d8";
        const change = filteredData[filteredData.length - 1].price - filteredData[0].price;
        return change >= 0 ? "#2CCE2C" : "#FF0000";
    }, [filteredData]);

    // Show loading spinner or error message if needed
    if (loading) return <div><CircularProgress /></div>;
    if (error) return <div className="text-red-500">{error}</div>;

    // Determine first and last prices for header display
    const firstPrice = filteredData[0]?.price;
    const lastPrice = filteredData[filteredData.length - 1]?.price;

    return (
        <div className="flex flex-col items-center p-8 w-full">
            {/* Header: ticker, current price, and percent change */}
            <div className="w-full flex flex-col items-start mb-4">
                <h2 className="text-2xl font-bold">{ticker.toUpperCase()} ${lastPrice}</h2>
                {percentageChange !== null && (
                    <p className={percentageChange >= 0 ? "text-green-500" : "text-red-500"}>
                        {percentageChange.toFixed(2)}%
                    </p>
                )}
            </div>

            {/* Timeframe buttons */}
            <div className="flex gap-2 mb-4">
                {timeframes.map(t => (
                    <button
                        key={t.value}
                        className={`px-3 py-1 rounded ${timeframe === t.value ? "bg-secondary text-black" : "bg-accent text-white"}`}
                        onClick={() => {
                            setTimeframe(t.value);
                            filterDataByTimeframe(t.value);
                        }}
                    >{t.label}</button>
                ))}
            </div>

            {/* Price line chart */}
            <ResponsiveContainer width="100%" height={400}>
                <LineChart data={filteredData}>
                    {/* X-axis hidden; dates formatted based on timeframe */}
                    <XAxis hide dataKey="date" tickFormatter={tick => tick} />
                    {/* Y-axis hidden; domain adjusts for short timeframes */}
                    <YAxis hide domain={['auto','auto']} />
                    {/* Dashed line at first price */}
                    {firstPrice !== undefined && (
                        <ReferenceLine y={firstPrice} stroke="gray" strokeDasharray="5 5" />
                    )}
                    <Tooltip />
                    {/* Price line */}
                    <Line type="linear" dataKey="price" stroke={lineColor} strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
