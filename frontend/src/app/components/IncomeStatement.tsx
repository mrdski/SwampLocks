import { useEffect, useState } from "react";
import axios from "axios";

// Define the shape of the income statement data we expect
interface IncomeStatement {
    totalRevenue: number;
    netIncome: number;
    operatingIncome: number;
}

// Component to fetch and display key income statement metrics for a given ticker
export default function IncomeStatement({ ticker }: { ticker: string }) {
    // State to hold the fetched income statement data
    const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null);
    // Track loading status
    const [loading, setLoading] = useState(true);
    // Track any error message
    const [error, setError] = useState<string | null>(null);
    // Base URL for API calls, pulled from environment variables
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    // Fetch income statement whenever the ticker prop changes
    useEffect(() => {
        const fetchIncomeStatement = async () => {
            try {
                // Call the API endpoint for this ticker's income statement
                const response = await axios.get(
                    `${API_BASE_URL}/api/financials/incomestatements/${ticker}`
                );
                // Save the fetched data into state
                setIncomeStatement(response.data);
            } catch (err) {
                // If something goes wrong, show an error message
                setError("Failed to load income statement.");
                console.error(err);
            } finally {
                // Regardless of success or failure, stop the loading indicator
                setLoading(false);
            }
        };

        fetchIncomeStatement();
    }, [ticker]); // Re-run when ticker changes

    // Show a loading message while waiting for data
    if (loading) return <p>Loading income statement...</p>;
    // Show an error message if the fetch failed
    if (error) return <p className="text-red-500">{error}</p>;

    // Once data is loaded, display the key metrics
    return (
        <section className="mb-8">
            <h2 className="text-xl font-bold mb-2">Income Statement</h2>
            <div className="grid grid-cols-2 gap-4">
                {/* Total revenue formatted with commas */}
                <p>
                    <strong>Total Revenue:</strong>{' '}
                    ${incomeStatement?.totalRevenue.toLocaleString()}
                </p>
                {/* Net income formatted with commas */}
                <p>
                    <strong>Net Income:</strong>{' '}
                    ${incomeStatement?.netIncome.toLocaleString()}
                </p>
                {/* Operating income formatted with commas */}
                <p>
                    <strong>Operating Income:</strong>{' '}
                    ${incomeStatement?.operatingIncome.toLocaleString()}
                </p>
            </div>
        </section>
    );
}
