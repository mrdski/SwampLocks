import { useEffect, useState } from "react";
import axios from "axios";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    Legend
} from "recharts";
import { motion } from "framer-motion";

// Shape of the cash flow statement entries
interface CashFlowStatement {
    operatingCashFlow: number;
    cashFlowFromFinancing: number;
    cashFlowFromInvestment: number;
    netIncome: number;
    fiscalDateEnding: string;
    capitalExpenditures: number;
    dividendPayout: number;
    changeInCashAndCashEquivalents: number;
}

// Shape of the income statement entries
interface IncomeStatement {
    netIncome: number;
    grossProfit: number;
    operatingIncome: number;
    fiscalDateEnding: string;
}

// Shape of the balance sheet entries
interface BalanceSheet {
    fiscalYear: number;
    totalAssets: number;
    totalLiabilities: number;
    cashAndCashEquivalents: number;
    shortTermInvestments: number;
    inventory: number;
    propertyPlantEquipment: number;
    intangibleAssets: number;
    totalShareholderEquity: number;
}

// Shape of the earnings entries
interface EarningStatement {
    ticker: string;
    fiscalDateEnding: string;
    reportedDate: string;
    reportedEPS: number;
    estimatedEPS: number;
    surprise: number;
    suprisePercentage: number;
    reportTime: string;
}

// Generate simple insights based on cash flow, income, and balance sheet data
function generateInsights({
    cashFlowStatements,
    incomeStatements,
    balanceSheets
}: {
    cashFlowStatements: CashFlowStatement[];
    incomeStatements: IncomeStatement[];
    balanceSheets: BalanceSheet[];
}): string[] {
    const insights: string[] = [];

    // Compare operating cash flow between last two periods
    if (cashFlowStatements.length >= 2) {
        const latest = cashFlowStatements[0];
        const previous = cashFlowStatements[1];
        const change = ((latest.operatingCashFlow - previous.operatingCashFlow) / previous.operatingCashFlow) * 100;

        // Add message depending on increase or decrease
        if (change > 10) {
            insights.push(`Operating cash flow increased by ${change.toFixed(1)}% QoQ — a strong liquidity sign.`);
        } else if (change < -10) {
            insights.push(`Operating cash flow dropped by ${Math.abs(change).toFixed(1)}% QoQ — keep an eye on cash generation.`);
        }
    }

    // Compare net income between last two periods
    if (incomeStatements.length >= 2) {
        const netChange = incomeStatements[0].netIncome - incomeStatements[1].netIncome;
        if (netChange > 0) {
            insights.push(`Net income rose by $${(netChange / 1_000_000).toFixed(2)}M.`);
        } else {
            insights.push(`Net income declined by $${(Math.abs(netChange) / 1_000_000).toFixed(2)}M.`);
        }
    }

    // Analyze debt-to-equity ratio
    if (balanceSheets.length > 0) {
        const latestBS = balanceSheets[0];
        const ratio = latestBS.totalLiabilities / latestBS.totalShareholderEquity;
        if (ratio > 2) {
            insights.push(`High debt-to-equity ratio (${ratio.toFixed(2)}). Company is highly leveraged.`);
        } else if (ratio < 1) {
            insights.push(`Strong equity position with debt-to-equity ratio at ${ratio.toFixed(2)}.`);
        }
    }

    return insights;
}

// Main component that fetches and displays financial statements and charts
export default function FinancialStatements({ ticker }: { ticker: string }) {
    // State to hold fetched data for each financial statement
    const [cashFlowStatements, setCashFlowStatements] = useState<CashFlowStatement[]>([]);
    const [earnings, setEarnings] = useState<EarningStatement[]>([]);
    const [balanceSheets, setBalanceSheets] = useState<BalanceSheet[]>([]);
    const [incomeStatements, setIncomeStatements] = useState<IncomeStatement[]>([]);
    const [insights, setInsights] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Domain for Y-axis zoom control
    const [yAxisDomain, setYAxisDomain] = useState<[number, number]>([0, 5000]);

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

    // Generate insights once all key data is loaded
    useEffect(() => {
        if (cashFlowStatements.length && incomeStatements.length && balanceSheets.length) {
            const generated = generateInsights({ cashFlowStatements, incomeStatements, balanceSheets });
            setInsights(generated);
        }
    }, [cashFlowStatements, incomeStatements, balanceSheets]);

    // Fetch all financial data in parallel when ticker changes
    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [cf, bs, is, er] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/financials/cashflowstatements/${ticker}`),
                    axios.get(`${API_BASE_URL}/api/financials/balancesheets/${ticker}`),
                    axios.get(`${API_BASE_URL}/api/financials/incomestatements/${ticker}`),
                    axios.get(`${API_BASE_URL}/api/financials/earnings/${ticker}`)
                ]);
                setCashFlowStatements(cf.data);
                setBalanceSheets(bs.data);
                setIncomeStatements(is.data);
                setEarnings(er.data);
            } catch (err) {
                setError("Error loading financial data");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [ticker]);

    // Show loading or error state if needed
    if (loading) return <p>Loading financial statements...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    // Extract latest statements for summary values
    const latestCashFlow = cashFlowStatements[0];
    const latestIncome = incomeStatements[0];
    const latestBalance = balanceSheets[0];

    // Key ratios
    const debtToEquity = (latestBalance.totalLiabilities / latestBalance.totalShareholderEquity).toFixed(2);
    const returnOnAssets = (latestIncome.netIncome / latestBalance.totalAssets * 100).toFixed(1);
    const formatMillions = (num: number) => (num / 1_000_000).toFixed(2) + "M";

    // Prepare data for charts
    const assetBreakdown = [
        { name: "Cash & Equivalents", value: latestBalance.cashAndCashEquivalents / 1_000_000 },
        { name: "Short-Term Investments", value: latestBalance.shortTermInvestments / 1_000_000 },
        { name: "Inventory", value: latestBalance.inventory / 1_000_000 },
        { name: "Property & Equipment", value: latestBalance.propertyPlantEquipment / 1_000_000 },
        { name: "Intangible Assets", value: latestBalance.intangibleAssets / 1_000_000 }
    ];

    const cashFlowTrend = cashFlowStatements.map(stmt => ({
        fiscalDateEnding: new Date(stmt.fiscalDateEnding).toLocaleDateString(),
        operatingCashFlow: stmt.operatingCashFlow / 1_000_000,
        cashFlowFromFinancing: stmt.cashFlowFromFinancing / 1_000_000,
        cashFlowFromInvestment: stmt.cashFlowFromInvestment / 1_000_000,
        capitalExpenditures: stmt.capitalExpenditures / 1_000_000,
    })).sort((a, b) => new Date(a.fiscalDateEnding).getTime() - new Date(b.fiscalDateEnding).getTime());

    const combinedData = cashFlowStatements.map((cf, i) => ({
        fiscalDateEnding: new Date(cf.fiscalDateEnding).toLocaleDateString(),
        operatingCashFlow: cf.operatingCashFlow / 1_000_000,
        netIncome: incomeStatements[i]?.netIncome / 1_000_000 || 0,
        capitalExpenditures: cf.capitalExpenditures / 1_000_000,
    })).sort((a, b) => new Date(a.fiscalDateEnding).getTime() - new Date(b.fiscalDateEnding).getTime());

    // Zoom controls for bar charts
    const zoomIn = () => setYAxisDomain([yAxisDomain[0], yAxisDomain[1] * 0.8]);
    const zoomOut = () => setYAxisDomain([yAxisDomain[0], yAxisDomain[1] * 1.2]);

    return (
        <div className="bg-gray-100 p-4 rounded-lg shadow-md mb-6">
            {/* Display generated insights if any */}
            {insights.length > 0 && (
                <div className="p-4 mb-6 bg-white rounded">
                    <h3 className="font-bold mb-2">Key Insights</h3>
                    <ul className="list-disc pl-5">
                        {insights.map((text, idx) => <li key={idx}>{text}</li>)}
                    </ul>
                </div>
            )}

            {/* Summary of key financials */}
            <div className="bg-white p-4 rounded mb-6">
                <p><strong>Total Assets:</strong> ${formatMillions(latestBalance.totalAssets)}</p>
                <p><strong>Total Liabilities:</strong> ${formatMillions(latestBalance.totalLiabilities)}</p>
                <p><strong>Shareholder Equity:</strong> ${formatMillions(latestBalance.totalShareholderEquity)}</p>
                <p><strong>Operating Cash Flow:</strong> ${latestCashFlow ? formatMillions(latestCashFlow.operatingCashFlow) : 'N/A'}</p>
                <p><strong>Net Income:</strong> ${latestIncome ? formatMillions(latestIncome.netIncome) : 'N/A'}</p>
                <p><strong>Debt to Equity:</strong> {debtToEquity}</p>
                <p><strong>Return on Assets (ROA):</strong> {returnOnAssets}%</p>
            </div>

            {/* Pie chart for asset breakdown */}
            <h3 className="mb-2">Asset Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie data={assetBreakdown} dataKey="value" outerRadius={100}>
                        {assetBreakdown.map((entry, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>

            {/* Assets vs Liabilities Bar Chart */}
            <h3 className="mt-6 mb-2">Assets vs Liabilities Over Time</h3>
            <ResponsiveContainer width="100%" height={250}>
                <BarChart data={balanceSheets.map(bs => ({
                    fiscalYear: bs.fiscalYear,
                    totalAssets: bs.totalAssets / 1_000_000,
                    totalLiabilities: bs.totalLiabilities / 1_000_000
                })).sort((a, b) => a.fiscalYear - b.fiscalYear)}>
                    <XAxis dataKey="fiscalYear" />
                    <Tooltip formatter={val => `${val}M`} />
                    <Bar dataKey="totalAssets" fill="#2CCE2C" />
                    <Bar dataKey="totalLiabilities" fill="#FF0000" />
                </BarChart>
            </ResponsiveContainer>

            {/* Cash Flow Trend Line Chart */}
            <h3 className="mt-6 mb-2">Cash Flow Trends Over Time</h3>
            <ResponsiveContainer width="100%" height={250}>
                <LineChart data={cashFlowTrend}>
                    <XAxis dataKey="fiscalDateEnding" />
                    <YAxis />
                    <Tooltip formatter={val => `${val}M`} />
                    <Line dataKey="operatingCashFlow" dot={false} />
                </LineChart>
            </ResponsiveContainer>

            {/* Combined Cash Flow vs Net Income Bar Chart */}
            <h3 className="mt-6 mb-2">Cash Flow vs Net Income</h3>
            <ResponsiveContainer width="100%" height={250}>
                <BarChart data={combinedData}>
                    <XAxis dataKey="fiscalDateEnding" />
                    <Tooltip formatter={val => `${val}M`} />
                    <Bar dataKey="operatingCashFlow" fill="#00C49F" />
                    <Bar dataKey="netIncome" fill="#FF8042" />
                </BarChart>
            </ResponsiveContainer>

            {/* Earnings EPS Bar Chart */}
            <h3 className="mt-6 mb-2">Earnings Per Share</h3>
            <ResponsiveContainer width="100%" height={250}>
                <BarChart data={earnings}>
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="reportedEPS" fill="#4ade80" name="Reported EPS" />
                    <Bar dataKey="estimatedEPS" fill="#60a5fa" name="Estimated EPS" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
