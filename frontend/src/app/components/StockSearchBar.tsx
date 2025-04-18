"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";
import CompactStockChart from "./CompactStockChart";

// Component for searching stock tickers with autocomplete and mini-chart previews
export default function StockSearchBar() {
    // Search input value
    const [query, setQuery] = useState("");
    // Suggestion list from API
    const [suggestions, setSuggestions] = useState<string[]>([]);
    // Next.js router to navigate to stock pages
    const router = useRouter();
    // Base URL for API calls
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    // Update query state when user types
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(event.target.value);
    };

    // When a suggestion is clicked, navigate to that stock's page
    const handleSuggestionClick = (ticker: string) => {
        setQuery(ticker);
        router.push(`/stock/${ticker}`);
    };

    // Fetch autocomplete suggestions whenever query changes
    useEffect(() => {
        if (!query) {
            setSuggestions([]);
            return;
        }
        async function fetchSuggestions() {
            try {
                const response = await axios.get(
                    `${API_BASE_URL}/api/financials/stocks/autocomplete?query=${query}`
                );
                setSuggestions(response.data);
            } catch (error) {
                console.error("Error fetching suggestions", error);
                setSuggestions([]);
            }
        }
        fetchSuggestions();
    }, [query]);

    // Handle form submission: check if ticker exists then navigate
    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        const ticker = query.trim().toUpperCase();
        if (!ticker) return;
        try {
            const response = await axios.get(
                `${API_BASE_URL}/api/financials/stocks/${ticker}/exists`
            );
            if (response.status === 200) {
                router.push(`/stock/${ticker}`);
            }
        } catch {
            alert("Stock not found. Please try a different symbol.");
        }
    };

    return (
        <div className="relative w-full">
            {/* Search input and icon */}
            <div className="flex items-center bg-gray-300 rounded-md p-2 hover:bg-gray-400 cursor-pointer">
                <Search className="text-gray-600" size={20} />
                <form onSubmit={handleSubmit} className="flex flex-grow">
                    <input
                        type="text"
                        placeholder="Enter stock ticker..."
                        value={query}
                        onChange={handleInputChange}
                        className="flex-grow bg-transparent px-2 text-black placeholder-gray-600 focus:outline-none"
                    />
                </form>
            </div>

            {/* Autocomplete suggestion dropdown */}
            {suggestions.length > 0 && (
                <div className="absolute bg-white border rounded-md mt-1 w-full max-h-60 overflow-y-auto z-10">
                    {suggestions.map((ticker) => (
                        <div
                            key={ticker}
                            className="flex items-center justify-between px-4 py-2 hover:bg-gray-200 cursor-pointer"
                            onClick={() => handleSuggestionClick(ticker)}
                        >
                            {/* Ticker symbol text */}
                            <span>{ticker}</span>
                            {/* Mini chart preview for this ticker */}
                            <div className="w-24 h-12">
                                <CompactStockChart ticker={ticker} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
