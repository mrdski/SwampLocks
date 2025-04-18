"use client";
import React, { useState } from "react";

// Calculate weights for each sector based on performance and diversification
export function optimizePortfolio(
  items: { sector: string; performance: number }[],
  alpha: number
): Array<{ sector: string; performance: number; weight: number }> {
  const n = items.length;
  // If there are no items, return an empty list
  if (n === 0) return [];

  // If alpha is 1, focus only on performance: pick the best sector fully
  if (alpha === 1) {
    let maxIdx = 0;
    let maxPerf = items[0].performance;
    // Find the index of the sector with highest performance
    for (let i = 1; i < n; i++) {
      if (items[i].performance > maxPerf) {
        maxPerf = items[i].performance;
        maxIdx = i;
      }
    }
    // Set weight 1 for the best sector, 0 for others
    return items.map((x, i) => ({
      sector: x.sector,
      performance: x.performance,
      weight: i === maxIdx ? 1 : 0,
    }));
  }

  // Extract performance values into an array
  const r = items.map((x) => x.performance);
  // Initialize weights to zero
  let weights = new Array(n).fill(0);
  // Active list tracks which sectors still need weight adjustment
  let active = Array.from({ length: n }, (_, i) => i);

  // Iteratively solve for weights, removing any negative ones
  while (true) {
    const freeCount = active.length;
    // Stop if no active sectors
    if (freeCount === 0) break;

    // Sum of performances for active sectors
    const sumR = active.reduce((acc, i) => acc + r[i], 0);
    // Calculate lambda from alpha and sumR
    const lambda = (alpha * sumR - 2 * (1 - alpha)) / freeCount;

    let anyNegative = false;
    // Compute provisional weights for active sectors
    for (const i of active) {
      const w_i = (alpha * r[i] - lambda) / (2 * (1 - alpha));
      weights[i] = w_i;
      if (w_i < 0) anyNegative = true;
    }

    // If all provisional weights are non-negative, normalize and finish
    if (!anyNegative) {
      // Sum of provisional weights
      let sumW = 0;
      for (const i of active) sumW += weights[i];
      // If sumW is zero or negative, distribute evenly
      if (sumW <= 0) {
        for (const i of active) weights[i] = 1 / freeCount;
      } else {
        // Normalize weights so they sum to 1
        for (const i of active) weights[i] /= sumW;
      }
      break;
    }

    // Remove any sectors with negative weight and repeat
    const newActive: number[] = [];
    for (const i of active) {
      if (weights[i] > 0) newActive.push(i);
      else weights[i] = 0;
    }
    // If no change in active set, stop to avoid infinite loop
    if (newActive.length === active.length) break;
    active = newActive;
  }

  // Map results back to sectors with their computed weights
  return items.map((x, i) => ({
    sector: x.sector,
    performance: x.performance,
    weight: weights[i],
  }));
}

// Main component for portfolio optimization UI
export default function DiversityOptimizer() {
  // Example data from a model: sectors with their performance scores
  const [rows] = useState([
    { sector: "Tech", performance: 0.15 },
    { sector: "Healthcare", performance: 0.10 },
    { sector: "Energy", performance: 0.05 },
    { sector: "Utilities", performance: 0.03 },
    { sector: "Financials", performance: 0.09 },
    { sector: "Consumer Discretionary", performance: 0.12 },
    { sector: "Industrials", performance: 0.06 },
    { sector: "Materials", performance: 0.04 },
    { sector: "Real Estate", performance: 0.02 },
    { sector: "Communication", performance: 0.13 },
    { sector: "Automotive", performance: 0.07 },
  ]);

  // Alpha controls the balance between performance and diversification
  const [alpha, setAlpha] = useState(0.5);
  // Compute optimized weights whenever alpha changes
  const optimized = optimizePortfolio(rows, alpha);

  return (
    <div className="min-h-screen flex items-center justify-center p-8 text-black">
      <div className="bg-white shadow-2xl rounded-xl p-8 w-full max-w-4xl">
        <h1 className="text-3xl font-extrabold mb-6 text-center">
          Portfolio Optimizer
        </h1>
        <p className="mb-4 text-center text-lg">
          Optimize your portfolio by balancing performance against diversification.
          Adjust the slider to change the trade-off parameter <strong>α</strong>.
        </p>

        {/* Slider for alpha */}
        <div className="mb-6">
          <label htmlFor="alphaRange" className="block font-semibold mb-2">
            Alpha = {alpha.toFixed(2)}
          </label>
          <input
            id="alphaRange"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={alpha}
            onChange={(e) => setAlpha(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
          <p className="text-sm text-gray-600 mt-1">
            <strong>α=1</strong>: Focus solely on performance. <br />
            <strong>α=0</strong>: Focus solely on diversification.
          </p>
        </div>

        {/* Results Table */}
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2 text-left">Sector</th>
              <th className="border p-2 text-left">Performance</th>
              <th className="border p-2 text-left">Weight %</th>
            </tr>
          </thead>
          <tbody>
            {optimized.map((row, i) => (
              <tr key={i} className="hover:bg-gray-100 transition-colors">
                <td className="border p-2">{row.sector}</td>
                <td className="border p-2">{row.performance}</td>
                <td className="border p-2">
                  {(row.weight * 100).toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
