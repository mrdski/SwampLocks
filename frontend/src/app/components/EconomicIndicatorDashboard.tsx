"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

// Define the shape of an economic indicator object
type Indicator = {
    name: string;
    interval: string;
    unit: string;
};

// Define the shape of a data point for charts
type DataPoint = {
    date: string;
    value: number;
};

// Main dashboard component for economic indicators
export default function EconomicIndicatorDashboard() {
    // List of available indicators
    const [indicators, setIndicators] = useState<Indicator[]>([]);
    // Currently selected indicator
    const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);
    // Data points for the selected indicator
    const [data, setData] = useState<DataPoint[]>([]);
    // Loading state when fetching data
    const [loading, setLoading] = useState(false);

    // Base URL for API from environment
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    
    // Fetch list of indicators on mount
    useEffect(() => {
        const fetchIndicators = async () => {
            setLoading(true);
            try {
                // Call API to get available indicators
                const response = await fetch(`${API_BASE_URL}/api/financials/economic_data/indicators`);
                const indicatorList: Indicator[] = await response.json();

                // Save indicator list to state
                setIndicators(indicatorList);

                // Automatically select the first indicator
                if (indicatorList.length > 0) {
                    setSelectedIndicator(indicatorList[0]);
                }
            } catch (error) {
                console.error("Error fetching indicators:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchIndicators();
    }, []); // Empty dependency array: run once on mount

    // Fetch data whenever selectedIndicator changes
    useEffect(() => {
        if (!selectedIndicator) return;

        const fetchIndicatorData = async () => {
            setLoading(true);
            try {
                // Call API for data of the selected indicator
                const response = await fetch(
                    `${API_BASE_URL}/api/financials/economic_data/${selectedIndicator.name}`
                );
                const indicatorData: DataPoint[] = await response.json();
                // Filter out points with zero value
                const filteredData = indicatorData.filter((dataPoint) => dataPoint.value !== 0);
                setData(filteredData);
            } catch (error) {
                console.error("Error fetching indicator data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchIndicatorData();
    }, [selectedIndicator]); // Re-run when a new indicator is selected

    // Decide which chart type to show based on indicator properties
    const getChartType = () => {
        if (!selectedIndicator || data.length === 0) return null;

        // Time-series intervals get a line chart
        if (["daily", "monthly", "quarterly", "annual"].includes(selectedIndicator.interval)) {
            return "line";
        } else if (
            // Percent units or unemployment get a bar chart
            selectedIndicator.unit.includes("percent") || selectedIndicator.name === "Unemployment"
        ) {
            return "bar";
        } else {
            // Otherwise show only the latest value
            return "single";
        }
    };

    // Determine chart type for rendering
    const chartType = getChartType();

    return (
        <div className="w-full max-w-5xl mx-auto p-6">
            {/* Dropdown to select an indicator */}
            <div className="mb-6 flex justify-center">
                <select
                    className="border border-gray-300 p-2 rounded-lg text-lg text-black"
                    value={selectedIndicator?.name || ""}
                    onChange={(e) => {
                        // Find the selected indicator object and update state
                        const indicator = indicators.find(ind => ind.name === e.target.value);
                        if (indicator) setSelectedIndicator(indicator);
                    }}
                >
                    {indicators.map((indicator) => (
                        <option key={indicator.name} value={indicator.name}>
                            {indicator.name} ({indicator.unit})
                        </option>
                    ))}
                </select>
            </div>

            {/* Container for the chosen chart */}
            <div className="p-6 bg-white shadow-lg rounded-lg">
                {loading ? (
                    // Show loading text during fetches
                    <p className="text-center text-gray-500">Loading data...</p>
                ) : chartType === "line" ? (
                    // Render line chart for time-series
                    <LineChartComponent data={data} indicator={selectedIndicator!.name} />
                ) : chartType === "bar" ? (
                    // Render bar chart for comparative data
                    <BarChartComponent data={data} indicator={selectedIndicator!.name} />
                ) : chartType === "single" ? (
                    // Show single latest value
                    <SingleValue data={data} indicator={selectedIndicator!.name} />
                ) : (
                    // Placeholder when no indicator is selected
                    <p className="text-center text-gray-500">Select an indicator to view data</p>
                )}
            </div>
        </div>
    );
}

/* Component to render a line chart */
const LineChartComponent = ({ data, indicator }: { data: DataPoint[]; indicator: string }) => (
    <div className="w-full">
        <h2 className="text-xl font-semibold text-center mb-4">{indicator} Trend</h2>
        <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#3182CE" strokeWidth={2} dot={{ r: 0.3 }} />
            </LineChart>
        </ResponsiveContainer>
    </div>
);

/* Component to render a bar chart */
const BarChartComponent = ({ data, indicator }: { data: DataPoint[]; indicator: string }) => (
    <div className="w-full">
        <h2 className="text-xl font-semibold text-center mb-4">{indicator} Overview</h2>
        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#34D399" />
            </BarChart>
        </ResponsiveContainer>
    </div>
);

/* Component to show a single latest value */
const SingleValue = ({ data, indicator }: { data: DataPoint[]; indicator: string }) => {
    // Use the last data point as the latest value
    const latestValue = data.length > 0 ? data[data.length - 1].value : "N/A";

    return (
        <div className="text-center p-6 bg-white shadow-lg rounded-lg">
            <h2 className="text-2xl font-bold">{indicator}</h2>
            <p className="text-4xl font-bold text-green-500 mt-2">{latestValue}</p>
        </div>
    );
};
