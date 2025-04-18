// components/SectorAnalysis.tsx
"use client";

import { useState, useEffect } from "react";

// Define allowed sector names
type Sector = "Technology" | "Energy" | "Healthcare" | "Financials";

// Mock data: performance summary for each sector
const mockedPerformanceData: Record<Sector, { performance: string }> = {
    Technology: { performance: "Positive growth over the last quarter. Strong performance in cloud and AI stocks." },
    Energy: { performance: "Declining performance due to global energy price fluctuations." },
    Healthcare: { performance: "Stable growth with minor fluctuations. Biotech stocks driving growth." },
    Financials: { performance: "Stable with small growth. Volatility due to interest rates." },
};

// Mock data: portfolio recommendations for each sector
const mockedPortfolioRecommendations: Record<Sector, string[]> = {
    Technology: [
        "Buy 40% in technology ETFs",
        "Increase exposure to AI and Cloud stocks",
        "Reduce exposure to semiconductor stocks due to short-term instability"
    ],
    Energy: [
        "Focus on renewable energy stocks",
        "Reduce exposure to traditional oil and gas ETFs"
    ],
    Healthcare: [
        "Invest in biotech ETFs",
        "Hold positions in major pharmaceutical companies"
    ],
    Financials: [
        "Increase exposure to fintech ETFs",
        "Reduce exposure to banks due to potential rate hikes"
    ],
};

// Props for this component: the sector name to analyze
type SectorAnalysisProps = {
    sectorName: string;
};

// Component showing performance and recommendations for a given sector
export default function SectorAnalysis({ sectorName }: SectorAnalysisProps) {
    // State for performance text
    const [sectorData, setSectorData] = useState<{ performance: string } | null>(null);
    // State for recommendations list
    const [sectorRecommendations, setSectorRecommendations] = useState<string[] | null>(null);
    // State to ensure code runs only on client side
    const [isClient, setIsClient] = useState(false);

    // On mount or when sectorName changes, load mock data
    useEffect(() => {
        // Indicate running on client
        setIsClient(true);

        // Convert passed name (e.g. "technology") to match our Sector keys
        const sectorKey = (sectorName.charAt(0).toUpperCase() + sectorName.slice(1).toLowerCase()) as Sector;
        // Load performance and recommendations from mocks
        setSectorData(mockedPerformanceData[sectorKey]);
        setSectorRecommendations(mockedPortfolioRecommendations[sectorKey]);
    }, [sectorName]);

    // If not yet on client, render nothing to avoid mismatch
    if (!isClient) return null;

    return (
        <div className="w-full flex flex-col items-center gap-8">
            <header className="text-center w-full max-w-4xl">
                {/* Intro description */}
                <p className="text-lg text-gray-500 font-medium">
                    Mocked Sector Performance and Portfolio Recommendations
                </p>
            </header>

            {/* Main card showing performance and recommendations */}
            <div className="w-full max-w-4xl bg-white border-2 border-accent rounded-lg shadow-lg p-6">
                <section className="mb-6">
                    {/* Section title */}
                    <p className="text-xl font-semibold text-black mb-2">Sector Performance</p>
                    {/* Performance text */}
                    <p className="text-gray-800">{sectorData?.performance}</p>
                </section>

                <section>
                    {/* Section title */}
                    <p className="text-xl font-semibold text-black mb-2">Portfolio Recommendations</p>
                    {/* List of recommendations */}
                    <ul className="list-disc list-inside space-y-1">
                        {sectorRecommendations?.map((rec, index) => (
                            <li key={index} className="text-gray-800">{rec}</li>
                        ))}
                    </ul>
                </section>
            </div>
        </div>
    );
}
