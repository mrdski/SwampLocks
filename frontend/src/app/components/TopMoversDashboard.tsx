"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import CompactStockChart from "./CompactStockChart";
import CircularProgress from '@mui/material/CircularProgress';

// Register chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Shape of a market mover entry
interface MarketMover {
    ticker?: string;
    price?: number;
    change?: number;
    changePercent?: number;
    volume?: number;
}

// Component displaying top market movers in a table with mini charts
export default function TopMoversDashboard() {
    // State for list of market movers
    const [movers, setMovers] = useState<MarketMover[] | null>(null);
    // Loading and error states
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    // Fetch top movers from API on component mount
    useEffect(() => {
        async function fetchMovers() {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/financials/top_movers`);
                // Save data into state
                setMovers(response.data);
            } catch {
                // On error, show message
                setError("Failed to fetch market movers.");
            } finally {
                setLoading(false);
            }
        }
        fetchMovers();
    }, []); // Empty dependency means run once

    // Show spinner while loading
    if (loading) return <CircularProgress />;
    // Show error if fetch failed
    if (error) return <p className="text-center text-red-500">{error}</p>;
    // Show message if no data
    if (!movers || movers.length === 0) {
        return <p className="text-center text-gray-500">No market movers available.</p>;
    }

    // Prepare data for chart.js if needed (example for bar chart)
    const chartData = {
        labels: movers.map(m => m.ticker ?? "N/A"),
        datasets: [
            {
                label: "Change Percentage",
                data: movers.map(m => m.changePercent ?? 0),
                backgroundColor: movers.map(m =>
                    (m.change ?? 0) >= 0 ? "rgba(75, 192, 192, 0.6)" : "rgba(255, 99, 132, 0.6)"
                ),
                borderColor: "rgba(0, 0, 0, 0.2)",
                borderWidth: 1,
            },
        ],
    };

    return (
        <div className="overflow-hidden rounded-lg">
            {/* Scrollable table for top movers */}
            <div className="overflow-y-auto max-h-[540px]">
                <table className="min-w-full border border-gray-200 rounded shadow">
                    <thead className="bg-gray-700 text-white sticky top-0">
                        <tr>
                            <th className="px-4 py-2 text-left">Ticker</th>
                            <th className="px-4 py-2 text-left">Price</th>
                            <th className="px-4 py-2 text-left">Volume</th>
                            <th className="px-4 py-2 text-left">Change %</th>
                            <th className="px-4 py-2 text-left">Today's Chart</th>
                        </tr>
                    </thead>
                    <tbody>
                        {movers.map((mover, idx) => (
                            <tr key={idx} className="border-t">
                                {/* Ticker symbol */}
                                <td className="px-4 py-2">{mover.ticker ?? 'N/A'}</td>
                                {/* Latest price formatted */}
                                <td className="px-4 py-2">${mover.price?.toFixed(2) ?? 'N/A'}</td>
                                {/* Volume formatted with commas */}
                                <td className="px-4 py-2">{mover.volume?.toLocaleString() ?? 'N/A'}</td>
                                {/* Change percent colored green/red */}
                                <td className={
                                    `px-4 py-2 font-semibold ${
                                        (mover.change ?? 0) >= 0 ? 'text-green-800' : 'text-red-800'
                                    }`
                                }>
                                    {mover.changePercent?.toFixed(2) ?? 'N/A'}%
                                </td>
                                {/* Mini in-page chart for today's data */}
                                <td className="px-4 py-2">
                                    {mover.ticker ? <CompactStockChart ticker={mover.ticker} /> : 'N/A'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
