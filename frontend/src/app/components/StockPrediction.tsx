"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Switch } from "@headlessui/react";

// Props for this component: the stock ticker symbol
type StockPredictionProps = {
    ticker: string;
};

// Component fetches current price and AI-predicted future price
const StockPrediction: React.FC<StockPredictionProps> = ({ ticker }) => {
    // Base URLs for our APIs from environment variables
    const ML_API_BASE_URL = process.env.NEXT_PUBLIC_ML_MODEL_BASE_URL;
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    // State to hold predicted price from the ML model
    const [predictedPrice, setPredictedPrice] = useState<number | null>(null);
    // State to hold the stock's current/latest price
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);
    // State for any error that occurs during fetch
    const [error, setError] = useState<string | null>(null);

    // Fetch current and predicted prices when ticker changes
    useEffect(() => {
        const fetchPrediction = async () => {
            try {
                // Get the latest actual price
                const responsePresent = await axios.get(
                    `${API_BASE_URL}/api/financials/stocks/${ticker}/latest-price`
                );
                // Call ML API to get next quarter's predicted price
                const responseFuture = await axios.get(
                    `${ML_API_BASE_URL}/api/MLModel?ticker=${ticker}`
                );

                // Save results into state
                setCurrentPrice(responsePresent.data);
                setPredictedPrice(responseFuture.data.price);
            } catch {
                // On error, show a message
                setError("Error fetching prediction");
            }
        };

        if (ticker) {
            fetchPrediction();
        }
    }, [ticker]); // Re-run if ticker prop changes

    // Decide which icon and text to show based on price change
    const getIndicator = () => {
        // If we don't have both prices yet, render nothing
        if (currentPrice === null || predictedPrice === null) return null;

        const diff = predictedPrice - currentPrice;
        const percentChange = (diff / currentPrice) * 100;

        // If predicted increase is more than 1%
        if (percentChange > 1) {
            return (
                <div className="flex items-center text-green-600">
                    <ArrowUpRight className="mr-1" />
                    <span>Up {percentChange.toFixed(2)}%</span>
                </div>
            );
        // If predicted drop is more than 1%
        } else if (percentChange < -1) {
            return (
                <div className="flex items-center text-red-600">
                    <ArrowDownRight className="mr-1" />
                    <span>Down {Math.abs(percentChange).toFixed(2)}%</span>
                </div>
            );
        // Otherwise, consider it stable
        } else {
            return (
                <div className="flex items-center text-gray-500">
                    <Minus className="mr-1" />
                    <span>Stable</span>
                </div>
            );
        }
    };

    // Render the component UI
    return (
        <div className="p-4 rounded-xl shadow-md bg-white dark:bg-gray-800">
            {/* Header with the ticker symbol */}
            <h2 className="text-xl font-semibold mb-2">
                Stock Forecast: {ticker.toUpperCase()}
            </h2>
            {/* Show any error message */}
            {error && <p className="text-red-500">{error}</p>}
            {/* Once we have prices, show predicted price and indicator */}
            {currentPrice !== null && predictedPrice !== null ? (
                <>
                    <p className="text-md mb-2">
                        Next Quarter's Predicted Price: <strong>${predictedPrice.toFixed(2)}</strong>
                    </p>
                    {getIndicator()}
                </>
            ) : (
                // While loading, show a switch as placeholder
                <div>
                    <Switch />
                </div>
            )}
        </div>
    );
};

export default StockPrediction;
