"use client";

import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, ReferenceLine } from "recharts";

// Define the shape of stock data points
type StockData = {
    date: string;
    price: number;
};

// Props for the compact chart: just the stock ticker
type StockChartProps = {
    ticker: string;
};

// Component that shows a simple line chart for today's stock prices
export default function CompactStockChart({ ticker }: StockChartProps) {
    // State for the fetched stock data
    const [data, setData] = useState<StockData[]>([]);
    // State to track loading status
    const [loading, setLoading] = useState(true);
    // State to hold any error message
    const [error, setError] = useState<string | null>(null);
    // Store the first price in the data to draw a reference line
    const firstPrice = data.length > 0 ? data[0].price : null;

    // Base URL for API from environment settings
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    // Fetch today's stock data whenever the ticker changes
    useEffect(() => {
        const fetchStockData = async () => {
            // Start loading and clear old errors
            setLoading(true);
            setError(null);
            try {
                // Call API for today's data for the given ticker
                const response = await axios.get(
                    `${API_BASE_URL}/api/financials/stocks/${ticker}/todays_data`
                );
                // Convert API response to StockData shape
                const processedData: StockData[] = response.data.map((item: any) => ({
                    date: new Date(item.date),
                    price: item.closingPrice,
                }));
                // Save converted data to state
                setData(processedData);
            } catch (err) {
                // If fetch fails, show a message
                setError("Stock data not found.");
                console.error("Error fetching stock data:", err);
            } finally {
                // Stop loading spinner
                setLoading(false);
            }
        };

        // Only fetch data if a ticker is provided
        if (ticker) {
            fetchStockData();
        }
    }, [ticker]);

    // Decide line color: green for gain, red for drop
    const lineColor = useMemo(() => {
        // If we don't have enough data, use a default color
        if (data.length < 2) return "#8884d8";

        // Compare last price to first price
        const lastPrice = data[data.length - 1]?.price;
        const priceChange = lastPrice - data[0]?.price;
        return priceChange >= 0 ? "#2CCE2C" : "#FF0000";
    }, [data]);

    // While loading, show a placeholder
    if (loading) return <div>...</div>;
    // If there was an error, show it in red text
    if (error) return <div className="text-red-500">{error}</div>;

    // Render the chart with a small height
    return (
        <div className="flex flex-col items-center w-full bg-transparent text-black">
            <ResponsiveContainer width="100%" height={100}>
                <LineChart data={data}>
                    {/* Hide the x-axis labels for compact view */}
                    {/* <XAxis dataKey="date" tick={false} /> */}
                    <YAxis 
                        hide  
                        domain={() => {
                            // Calculate min and max price for the y-axis
                            const min = Math.min(...data.map(item => item.price));
                            const max = Math.max(...data.map(item => item.price));
                            return [min, max];
                        }}
                    />
                    {/* Line showing price over time */}
                    <Line type="linear" dataKey="price" stroke={lineColor} strokeWidth={2} dot={false} />
                    {/* Reference line at the first price */}
                    {firstPrice !== null && (
                        <ReferenceLine y={firstPrice} stroke="gray" strokeDasharray="5 5" />
                    )}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
