"use client";

import { useState, useEffect } from "react";
import { ResponsiveContainer, LineChart, XAxis, YAxis, Tooltip, Line, Legend } from "recharts";
import Footer from "./Footer";

// Define the shape of commodity price data
type CommodityData = {
    date: string;
    price: number;
    commodityName: string;
};

// Define the shape of an indicator object
type Indicator = {
    name: string;
    interval: string;
    unit: string;
};

// List of colors to assign to each commodity line
const colorList = [
    "#FF5733", "#33A1FF", "#33FF57", "#FFD700", "#8B4513",
    "#FFA500", "#FF69B4", "#D2691E", "#654321", "#4B0082",
    "#A52A2A", "#20B2AA", "#DC143C", "#8A2BE2", "#32CD32"
];

// Map to hold assigned colors for each commodity by name
const assignedColors: Record<string, string> = {};

// Main component to display commodity charts
export default function CommodityPage() {
    // State to store fetched data for each commodity
    const [commodityData, setCommodityData] = useState<Record<string, CommodityData[]>>({});
    // State to store indicator metadata for each commodity
    const [indicators, setIndicators] = useState<Record<string, Indicator>>({});
    // Loading state while data is being fetched
    const [isLoading, setIsLoading] = useState(true);
    // Error message state if fetch fails
    const [error, setError] = useState<string | null>(null);
    
    // Base URL for API calls from environment variables
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    // Fetch commodity indicators and data on component mount
    useEffect(() => {
        async function fetchCommodityData() {
            try {
                // Get list of all commodity indicators
                const response = await fetch(`${API_BASE_URL}/api/financials/commodities/indicators`);
                const indicatorList: Indicator[] = await response.json();

                // Assign a color to each indicator name
                indicatorList.forEach((indicator, index) => {
                    assignedColors[indicator.name] = colorList[index % colorList.length];
                });

                // For each indicator, fetch its commodity data
                const dataPromises = indicatorList.map(async (indicator) => {
                    const res = await fetch(`${API_BASE_URL}/api/financials/commodities/${indicator.name}`);
                    if (!res.ok) return null;

                    const rawData: CommodityData[] = await res.json();
                    // Only include entries with valid price
                    const filteredData = rawData.filter((entry) => entry.price > 0);

                    return { name: indicator.name, unit: indicator.unit, data: filteredData };
                });

                // Wait for all fetches to complete and remove any that failed
                const results = (await Promise.all(dataPromises)).filter(
                    (res): res is { name: string; unit: string; data: CommodityData[] } => res !== null
                );

                // Build maps for data and indicators
                const dataMap: Record<string, CommodityData[]> = {};
                const indicatorMap: Record<string, Indicator> = {};

                results.forEach((result) => {
                    dataMap[result.name] = result.data;
                    // Preserve the indicator info including its interval and unit
                    indicatorMap[result.name] = {
                        name: result.name,
                        interval: indicatorList.find((ind) => ind.name === result.name)?.interval || "N/A",
                        unit: result.unit,
                    };
                });

                // Update state with fetched data
                setCommodityData(dataMap);
                setIndicators(indicatorMap);
            } catch (err) {
                // Capture any errors during fetch
                setError((err as Error).message);
            } finally {
                // Turn off loading state
                setIsLoading(false);
            }
        }

        fetchCommodityData();
    }, []); // Run only once on mount

    // Show loading message while fetching
    if (isLoading) return <p className="text-center text-gray-500">Loading...</p>;
    // Show error message if something went wrong
    if (error) return <p className="text-center text-red-500">{error}</p>;

    // Render charts for each commodity
    return (
        <div className="w-full max-w-7xl mx-auto p-6 bg-transparent">
            <h2 className="text-3xl text-black font-extrabold text-center mb-6">Commodities</h2>

            {/* Container for multiple commodity charts */}
            <div className="flex flex-col gap-6">
                {Object.entries(commodityData).map(([commodity, data]) => {
                    const indicator = indicators[commodity];

                    return (
                        <div key={commodity} className="bg-transparent p-4 rounded-md border-2 border-accent ">
                            {/* Title for each chart */}
                            <h3 className="text-xl text-secondary font-semibold text-center">{indicator.name}</h3>
                            {/* Responsive chart container */}
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={data}>
                                    <XAxis />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    {/* Line representing price over time */}
                                    <Line
                                        type="monotone"
                                        dataKey="price"
                                        stroke={assignedColors[commodity]}
                                        strokeWidth={2}
                                        name={indicator.unit}
                                        dot={{ r: 0.3 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    );
                })}
            </div>
            {/* Footer component at bottom of page */}
            <Footer />
        </div>
    );
}
