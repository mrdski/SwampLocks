"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Pencil, Trash2 } from "lucide-react";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, BarChart, Legend, CartesianGrid, Bar, Cell } from "recharts";
import Link from "next/link";

// Interface for each holding in the user's portfolio
interface Holding {
    ticker: string;
    shares: number;
    sectorName: string;
    holdingId: number;
    stockPrice: number;
    isETF: boolean;
}

// Main component showing and managing user portfolio
export default function UserPortfolio({ userId }: { userId: string }) {
    // Base URLs from environment
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const ML_API_BASE_URL = process.env.NEXT_PUBLIC_ML_MODEL_BASE_URL;

    // State for holdings array and related UI/input values
    const [holdings, setHoldings] = useState<Holding[]>([]);
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
    const [shares, setShares] = useState<number>(0);
    const [isEditing, setIsEditing] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    // Data for sector allocation chart and portfolio totals (current and future)
    const [sectorData, setSectorData] = useState<{ name: string; value: number }[]>([]);
    const [totals, setTotals] = useState({ totalValue: 0, totalNonETFValue: 0, totalFutureValue: 0 });

    // Fetch autocomplete suggestions for ticker search
    useEffect(() => {
        if (!query) {
            setSuggestions([]);
            return;
        }
        async function fetchSuggestions() {
            try {
                const resp = await axios.get(
                    `${API_BASE_URL}/api/financials/stocks/autocomplete?query=${query}`
                );
                setSuggestions(resp.data);
            } catch {
                console.error("Error fetching suggestions");
                setSuggestions([]);
            }
        }
        fetchSuggestions();
    }, [query]);

    // When holdings change, recalculate portfolio totals (current vs predicted)
    useEffect(() => {
        async function calcTotals() {
            if (!holdings.length) return;
            const result = await getPortfolioTotalsWithFuture(holdings);
            setTotals(result);
        }
        calcTotals();
    }, [holdings]);

    // On mount or when userId changes, load holdings from API
    useEffect(() => {
        if (!userId) return;
        async function loadHoldings() {
            try {
                await loadAndMapHoldings();
            } catch (err) {
                console.error("Failed to load holdings:", err);
            }
        }
        loadHoldings();
    }, [userId]);

    // Helper to fetch holdings and their current prices, then set state
    const loadAndMapHoldings = async () => {
        try {
            const res = await axios.get(
                `${API_BASE_URL}/api/financials/user/holdings/${userId}/get-holdings`
            );
            // Map each raw holding to include latest price and ETF flag
            const mapped = await Promise.all(
                res.data.map(async (h: any) => {
                    const priceRes = await axios.get(
                        `${API_BASE_URL}/api/financials/stocks/${h.ticker}/latest-price`
                    );
                    return {
                        ticker: h.ticker,
                        shares: h.shares,
                        sectorName: h.stock?.sectorName || "Unknown",
                        holdingId: h.holdingId,
                        stockPrice: priceRes.data,
                        isETF: h.stock?.isETF || false,
                    };
                })
            );
            setHoldings(mapped);
            updateSectorAllocation(mapped);
        } catch (err) {
            console.error("Failed to map holdings:", err);
        }
    };

    // Update sectorData state to show allocation per sector
    const updateSectorAllocation = (list: Holding[]) => {
        const map: Record<string, number> = {};
        list.forEach(h => {
            const value = h.shares * h.stockPrice;
            map[h.sectorName] = (map[h.sectorName] || 0) + value;
        });
        setSectorData(Object.entries(map).map(([name, value]) => ({ name, value })));
    };

    // Compute current vs future totals using ML API predictions
    async function getPortfolioTotalsWithFuture(list: Holding[]) {
        let totalValue = 0, totalNonETFValue = 0, totalFutureValue = 0;
        for (const h of list) {
            const currVal = h.shares * h.stockPrice;
            totalValue += currVal;
            if (!h.isETF) totalNonETFValue += currVal;
            // Fetch predicted price
            try {
                const resp = await axios.get(
                    `${ML_API_BASE_URL}/api/MLModel?ticker=${h.ticker}`
                );
                const futurePrice = resp.data?.price ?? h.stockPrice;
                totalFutureValue += futurePrice * h.shares;
            } catch {
                console.error(`Error fetching prediction for ${h.ticker}`);
                totalFutureValue += currVal;
            }
        }
        return { totalValue, totalNonETFValue, totalFutureValue };
    }

    // Add new holding or update existing one
    const addOrUpdateHolding = async () => {
        if (!selectedTicker || shares <= 0) return;
        const payload = { userId, ticker: selectedTicker, shares };
        try {
            if (isEditing && editingIndex != null) {
                const holdingId = holdings[editingIndex].holdingId;
                await axios.put(`${API_BASE_URL}/api/financials/holdings/${holdingId}`, payload);
            } else {
                await axios.post(`${API_BASE_URL}/api/financials/holdings`, payload);
            }
            await loadAndMapHoldings();
            // reset form state
            setQuery(""); setSelectedTicker(null); setShares(0);
            setIsEditing(false); setEditingIndex(null);
        } catch (err) {
            console.error("Error saving holding:", err);
        }
    };

    // Delete a holding by index
    const deleteHolding = async (index: number) => {
        const id = holdings[index].holdingId;
        try {
            await axios.delete(`${API_BASE_URL}/api/financials/holdings/${id}`);
            await loadAndMapHoldings();
        } catch (err) {
            console.error("Error deleting holding:", err);
        }
    };

    // Begin editing a holding
    const editHolding = (index: number) => {
        const h = holdings[index];
        setQuery(h.ticker); setSelectedTicker(h.ticker); setShares(h.shares);
        setIsEditing(true); setEditingIndex(index);
    };

    // Prepare data for sector bubble chart
    const bubbleData = sectorData.map((d, i, arr) => {
        const max = Math.max(...arr.map(x => x.value));
        return {
            x: (i + 1) * (100 / (arr.length + 1)),
            y: 50,
            z: (d.value / max) * 800,
            name: d.name
        };
    });

    return (
        <div className="p-4 text-black max-w-6xl mx-auto flex flex-col gap-6">
            {/* Portfolio Totals Chart */}
            <div className="text-center">
                <h1 className="text-3xl font-bold">
                    Total Portfolio: ${totals.totalValue.toFixed(2)}
                </h1>
                <p className="text-sm text-gray-600">
                    Predictions only apply to non-ETF holdings.
                </p>
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={[
                        { name: 'Current', value: totals.totalNonETFValue, color: '#4B5563' },
                        { name: 'Predicted', value: totals.totalFutureValue, color: totals.totalFutureValue >= totals.totalNonETFValue ? '#16A34A' : '#DC2626' }
                    ]}>                    
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={val => `$${val.toFixed(2)}`} />
                        <Legend />
                        <Bar dataKey="value">
                            {[(totals.totalNonETFValue >= totals.totalFutureValue), (totals.totalFutureValue >= totals.totalNonETFValue)].map((isUp, i) => (
                                <Cell key={i} fill={i === 0 ? '#4B5563' : isUp ? '#16A34A' : '#DC2626'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="flex gap-8">
                {/* Holdings List and Form */}
                <div className="w-1/3">
                    <h2 className="text-2xl font-bold mb-4">Your Holdings</h2>
                    <ul className="space-y-2 mb-6">
                        {holdings.map((h, idx) => (
                            <li key={idx} className="flex justify-between bg-gray-100 p-2 rounded">
                                <Link href={`/stock/${h.ticker}`} className="font-semibold hover:underline">
                                    {h.ticker}
                                </Link>
                                <span>{h.shares} shares</span>
                                <div className="space-x-2">
                                    <button onClick={() => editHolding(idx)}>
                                        <Pencil size={18} />
                                    </button>
                                    <button onClick={() => deleteHolding(idx)}>
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>

                    {/* Add or Edit Holding Form */}
                    <div className="space-y-3">
                        <input
                            type="text"
                            placeholder="Search ticker..."
                            value={query}
                            onChange={e => { setQuery(e.target.value); setSelectedTicker(null); }}
                            className="w-full border p-2 rounded"
                        />
                        {suggestions.length > 0 && (
                            <ul className="border rounded max-h-40 overflow-y-auto">
                                {suggestions.map((s, i) => (
                                    <li
                                        key={i}
                                        onClick={() => { setQuery(s); setSelectedTicker(s); setSuggestions([]); }}
                                        className="p-2 hover:bg-gray-200 cursor-pointer"
                                    >{s}</li>
                                ))}
                            </ul>
                        )}
                        <input
                            type="number"
                            placeholder="Shares"
                            value={shares}
                            onChange={e => setShares(Number(e.target.value))}
                            className="w-full border p-2 rounded"
                        />
                        <button
                            onClick={addOrUpdateHolding}
                            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
                        >
                            {isEditing ? "Update Holding" : "Add to Portfolio"}
                        </button>
                    </div>
                </div>

                {/* Sector Allocation Bubble Chart */}
                <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-4">Sector Allocation</h2>
                    <ResponsiveContainer width="100%" height={400}>
                        <ScatterChart>
                            <XAxis type="number" dataKey="x" hide />
                            <YAxis type="number" dataKey="y" hide />
                            <ZAxis type="number" dataKey="z" range={[1000, 20000]} />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                            <Scatter data={bubbleData} fill="#808080" name="Sectors">
                                {bubbleData.map((entry, i) => (
                                    <Cell key={i} />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
