"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// Shape of an exchange rate entry
type ExchangeRate = {
    date: string;
    targetCurrency: string;
    rate: number;
};

// Shape of calculated rate statistics
type RateStats = {
    day: string;
    weekly: string;
    monthly: string;
    ytd: string;
    yoy: string;
};

// Main dashboard component for exchange rates
export default function ExRatesDashBoard() {
    // All fetched exchange rate entries
    const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
    // Latest rate for each currency
    const [latestRates, setLatestRates] = useState<Record<string, ExchangeRate>>({});
    // Historical rates for each currency
    const [historicalRates, setHistoricalRates] = useState<Record<string, ExchangeRate[]>>({});
    
    // Base API URL from environment variables
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    // Fetch exchange rate data on component mount
    useEffect(() => {
        const fetchExchangeRates = async () => {
            try {
                // Call the API to get all exchange rates
                const response = await fetch(`${API_BASE_URL}/api/financials/ex_rates`);
                const data: ExchangeRate[] = await response.json();
                
                // Group data by currency
                const ratesByCurrency: Record<string, ExchangeRate[]> = {};
                data.forEach(rate => {
                    if (!ratesByCurrency[rate.targetCurrency]) {
                        ratesByCurrency[rate.targetCurrency] = [];
                    }
                    ratesByCurrency[rate.targetCurrency].push(rate);
                });
                
                // Sort each currency's rates from newest to oldest
                Object.keys(ratesByCurrency).forEach(currency => {
                    ratesByCurrency[currency].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                });

                // Extract the latest rate for each currency
                const latest: Record<string, ExchangeRate> = {};
                Object.keys(ratesByCurrency).forEach(currency => {
                    latest[currency] = ratesByCurrency[currency][0];
                });

                // Update state with fetched and processed data
                setExchangeRates(data);
                setLatestRates(latest);
                setHistoricalRates(ratesByCurrency);
            } catch (error) {
                console.error("Error fetching exchange rates:", error);
            }
        };

        fetchExchangeRates();
    }, []); // Empty array ensures this runs only once

    // Calculate percentage changes for different time ranges
    const calculateStats = (currency: string): RateStats | undefined => {
        const rates = historicalRates[currency];
        // Need at least two data points to calculate changes
        if (!rates || rates.length < 2) return undefined;

        const latestRate = rates[0].rate;
        const previousDayRate = rates[1].rate;

        // Day-over-day change
        const dayChange = ((latestRate - previousDayRate) / previousDayRate) * 100;

        // Weekly, Monthly, YTD, and YoY changes
        const weeklyChange = ((latestRate - (rates[7]?.rate || latestRate)) / (rates[7]?.rate || latestRate)) * 100;
        const monthlyChange = ((latestRate - (rates[30]?.rate || latestRate)) / (rates[30]?.rate || latestRate)) * 100;
        const ytdChange = ((latestRate - (rates[365]?.rate || latestRate)) / (rates[365]?.rate || latestRate)) * 100;
        const yoyChange = ((latestRate - (rates[365 * 2]?.rate || latestRate)) / (rates[365 * 2]?.rate || latestRate)) * 100;

        return {
            day: dayChange.toFixed(2) + "%",
            weekly: weeklyChange.toFixed(2) + "%",
            monthly: monthlyChange.toFixed(2) + "%",
            ytd: ytdChange.toFixed(2) + "%",
            yoy: yoyChange.toFixed(2) + "%",
        };
    };

    // Choose a background color based on the size of the percentage change
    const getColorForChange = (change: number): string => {
        if (change >= 2.5) return "#008000";    // Strong positive (bright green)
        else if (change >= 2) return "#43a047"; // Good positive
        else if (change >= 1.5) return "#66bb6a"; // Moderate positive
        else if (change >= 0.5) return "#81c784"; // Small positive
        else if (change >= 0) return "#a5d6a7";  // Minimal positive
        else if (change <= -2.5) return "#e53935"; // Strong negative (bright red)
        else if (change <= -2) return "#f44336";  // Bad negative
        else if (change <= -1.5) return "#ef5350"; // Moderate negative
        else if (change <= -0.5) return "#ff7043"; // Small negative
        else return "#ff8a65";                  // Very small negative
    };

    // Render a table of latest rates and changes
    return (
        <div>
            <table className="min-w-full border-collapse text-black">
                <thead>
                    <tr className="text-white bg-black">
                        <th className="border px-4 py-2">Major</th>
                        <th className="border px-4 py-2">Price</th>
                        <th className="border px-4 py-2">Day</th>
                        <th className="border px-4 py-2">Weekly</th>
                        <th className="border px-4 py-2">Monthly</th>
                        <th className="border px-4 py-2">YTD</th>
                        {/* <th className="border px-4 py-2">YoY</th> */}
                        <th className="border px-4 py-2">Date</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.keys(latestRates).map(currency => {
                        const latest = latestRates[currency];
                        const stats = calculateStats(currency);
                        const formattedDate = new Date(latest.date).toLocaleDateString();

                        // Parse numeric changes for coloring
                        const dayChange = stats ? parseFloat(stats.day) : 0;
                        const weeklyChange = stats ? parseFloat(stats.weekly) : 0;
                        const monthlyChange = stats ? parseFloat(stats.monthly) : 0;
                        const ytdChange = stats ? parseFloat(stats.ytd) : 0;

                        return (
                            <tr key={currency} className="border-2 border-black">
                                {/* Currency code */}
                                <td className="border px-4 py-2" style={{ backgroundColor: "#f0f0f0" }}>
                                    {currency}
                                </td>
                                {/* Latest rate */}
                                <td className="border px-4 py-2" style={{ backgroundColor: "#f0f0f0" }}>
                                    {latest.rate.toFixed(5)}
                                </td>
                                {/* Day change cell */}
                                <td className="border px-4 py-2" style={{ backgroundColor: getColorForChange(dayChange) }}>
                                    {stats?.day}
                                </td>
                                {/* Weekly change cell */}
                                <td className="border px-4 py-2" style={{ backgroundColor: getColorForChange(weeklyChange) }}>
                                    {stats?.weekly}
                                </td>
                                {/* Monthly change */}
                                <td className="border px-4 py-2" style={{ backgroundColor: getColorForChange(monthlyChange) }}>
                                    {stats?.monthly}
                                </td>
                                {/* Year-to-date change */}
                                <td className="border px-4 py-2" style={{ backgroundColor: getColorForChange(ytdChange) }}>
                                    {stats?.ytd}
                                </td>
                                {/* Date of latest rate */}
                                <td className="border px-4 py-2" style={{ backgroundColor: "#f0f0f0" }}>
                                    {formattedDate}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
