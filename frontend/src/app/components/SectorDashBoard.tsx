// components/SectorDashboard.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import SectorAnalysis from "./SectorAnalysis";
import Treemap from "./TreeMap";
import Footer from "./Footer";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

// Props for the dashboard: which sector to display
interface SectorPageProps {
    sectorName: string;
}

// Interface for stock data with market cap and percent change
interface StockWithChange {
    symbol: string;
    marketCap: number;
    change: number;
}

// Map URL slug to display name
const sectorMap: Record<string, { name: string }> = {
    "technology": { name: "Information Technology" },
    "energy": { name: "Energy" },
    "healthcare": { name: "Healthcare" },
    "financials": { name: "Financials" },
    "consumer-discretionary": { name: "Consumer Discretionary" },
    "consumer-staples": { name: "Consumer Staples" },
    "industrials": { name: "Industrials" },
    "materials": { name: "Materials" },
    "real-estate": { name: "Real Estate" },
    "utilities": { name: "Utilities" },
    "communication-services": { name: "Communication Services" },
};

// Colors for pie chart slices
const COLORS = ["#FF5733", "#33A1FF", "#33FF57", "#FFD700", "#8B4513", "#807513", "#0F7513"];

// Main sector dashboard component
e**xport default** function SectorDashboard({ sectorName }: SectorPageProps) {
    // Date picker state
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    // Control date picker visibility
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    // Loading indicator state
    const [loading, setLoading] = useState(true);
    // Forecasted growth percentage for next quarter
    const [sectorGrowth, setSectorGrowth] = useState<number | null>(null);
    // List of stocks with market cap and daily change
    const [stocks, setStocks] = useState<StockWithChange[]>([]);

    // Maximum number of items to show individually in charts
    const maxVisible = 20;

    // Sort stocks by market cap descending
    const sortedStocks = [...stocks].sort((a, b) => b.marketCap - a.marketCap);
    // Top N stocks for detailed display
    const topStocks = sortedStocks.slice(0, maxVisible);
    // Aggregate the rest as "Other"
    const otherValue = sortedStocks.slice(maxVisible)
        .reduce((sum, stock) => sum + stock.marketCap, 0);
    // Pie chart data merges top stocks plus one "Other" slice
    const pieData = [...topStocks, { symbol: "Other", marketCap: otherValue }];

    // Top movers by absolute percent change
    const topMovers = [...stocks]
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
        .slice(0, maxVisible);

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    // Fetch forecasted sector growth
    async function fetchSectorGrowth(): Promise<number | null> {
        try {
            const url = `${API_BASE_URL}/api/financials/sector-growth?sectorName=${sectorMap[sectorName].name}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to fetch sector growth");
            return response.json();
        } catch {
            console.error("Error fetching sector growth");
            return null;
        }
    }

    // Fetch top market-cap stocks and their daily change for selected date
    async function fetchTopMarketCapWithChange(): Promise<StockWithChange[]> {
        // Ensure we pick a weekday (skip weekends)
        let date = new Date(selectedDate);
        if (date.getDay() === 6) date.setDate(date.getDate() - 1);
        if (date.getDay() === 0) date.setDate(date.getDate() - 2);

        try {
            const url = `${API_BASE_URL}/api/financials/top-marketcap-with-change` +
                `?count=100&sectorName=${sectorMap[sectorName].name}` +
                `&date=${date.toISOString().split("T")[0]}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to fetch market cap data");
            return response.json();
        } catch {
            console.error("Error fetching stocks");
            return [];
        }
    }

    // On date change, load stocks and forecast
    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const stocksData = await fetchTopMarketCapWithChange();
            setStocks(stocksData);
            const growth = await fetchSectorGrowth();
            setSectorGrowth(growth);
            setLoading(false);
        }
        loadData();
    }, [selectedDate]);

    // Handle new date selection
    function handleDateChange(date: Date) {
        setSelectedDate(date);
        setIsCalendarOpen(false);
    }

    // Toggle calendar visibility
    function toggleCalendar() {
        setIsCalendarOpen(open => !open);
    }

    return (
        <div className="min-h-screen flex flex-col items-center p-8 bg-gray-50">
            {/* Back link to home */}
            <Link href="/" className="mb-6 text-blue-600 hover:underline">
                ← Back to Home
            </Link>

            {/* Sector title */}
            <h1 className="text-4xl font-semibold mb-8">
                {sectorMap[sectorName].name}
            </h1>

            {/* Date picker control */}
            <div className="mb-8 w-full">
                <button
                    onClick={toggleCalendar}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Date: {selectedDate.toLocaleDateString()}
                </button>
                {isCalendarOpen && (
                    <div className="absolute mt-2 bg-white p-4 shadow-lg rounded">
                        <DatePicker
                            selected={selectedDate}
                            onChange={date => date && handleDateChange(date)}
                            inline
                            maxDate={new Date()}
                        />
                    </div>
                )}
            </div>

            {/* Sector growth forecast */}
            <div className="mb-8 p-6 bg-white shadow rounded text-center w-full max-w-md">
                <h2 className="text-2xl font-semibold mb-2">
                    Sector Growth Forecast (Next Quarter)
                </h2>
                {loading ? (
                    <p className="text-gray-500">Loading forecast...</p>
                ) : (
                    <p className={
                        `text-xl font-bold ${
                            sectorGrowth! > 0 ? "text-green-600" : sectorGrowth! < 0 ? "text-red-500" : "text-gray-500"
                        }`
                    }>
                        {sectorGrowth! > 0 ? "▲" : sectorGrowth! < 0 ? "▼" : "–"}
                        {Math.abs(sectorGrowth!).toFixed(2)}%
                    </p>
                )}
            </div>

            {/* TreeMap heatmap of stocks */}
            <div className="w-full mb-8">
                <Treemap stocks={stocks} width={1200} height={800} />
            </div>

            {/* Top Movers and Market Cap sections side by side */}
            <div className="w-full grid md:grid-cols-2 gap-8">
                {/* Top Movers table */}
                <div className="bg-white p-6 shadow rounded overflow-x-auto">
                    <h2 className="text-2xl font-semibold mb-4">Top Movers</h2>
                    <p className="text-gray-500 mb-4">
                        Data for {selectedDate.toDateString()}
                    </p>
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-2 text-left">Symbol</th>
                                <th className="px-4 py-2 text-left">Market Cap</th>
                                <th className="px-4 py-2 text-left">% Change</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topMovers.map(stock => (
                                <tr key={stock.symbol} className="border-t">
                                    <td className="px-4 py-2">
                                        <Link href={`/stock/${stock.symbol}`} className="text-blue-600">
                                            {stock.symbol}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-2">${(stock.marketCap/1e9).toFixed(2)}B</td>
                                    <td className={
                                        `px-4 py-2 font-semibold ${stock.change >= 0 ? "text-green-600" : "text-red-500"}`
                                    }>
                                        {stock.change.toFixed(2)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pie chart of top market cap stocks */}
                <div className="bg-white p-6 shadow rounded flex justify-center">
                    <ResponsiveContainer width={800} height={600}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                outerRadius={360}
                                dataKey="marketCap"
                                nameKey="symbol"
                            >
                                {pieData.map((entry, idx) => (
                                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Footer component */}
            <Footer />
        </div>
    );
}
