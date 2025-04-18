import { useEffect, useState } from "react";
import CircularProgress from '@mui/material/CircularProgress';
import axios from "axios";

// Define the shape of a news article object
interface Article {
    id: string;
    articleName: string;
    url: string;
    sentimentScore: number;
    date: string;
    ticker: string;
}

// Component to fetch and display articles for a given ticker
export default function Articles({ ticker }: { ticker?: string }) {
    // State to hold fetched articles
    const [articles, setArticles] = useState<Article[]>([]);
    // Loading state for the fetch
    const [loading, setLoading] = useState(true);
    // Error message state
    const [error, setError] = useState<string | null>(null);

    // Base URL for API calls from environment variables
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
   
    // Fetch articles when component mounts or ticker changes
    useEffect(() => {
        const fetchArticles = async () => {
            try {
                let url;
                // Use ticker-specific endpoint if a ticker is provided
                if (ticker) {
                    url = `${API_BASE_URL}/api/financials/stocks/${ticker}/articles`;
                } else {
                    // Otherwise, get all articles
                    url = `${API_BASE_URL}/api/financials/stocks/articles/all`;
                }
                const response = await axios.get(url);
                console.log("Articles: ", response);
                // Save the fetched data to state
                setArticles(response.data);
            } catch (err) {
                // Handle fetch errors
                setError("Failed to load articles.");
                console.error(err);
            } finally {
                // Turn off loading spinner
                setLoading(false);
            }
        };

        fetchArticles();
    }, [ticker]); // Re-run when ticker prop changes
    
    // Show loading spinner while fetching data
    if (loading) return <p><CircularProgress/></p>;
    // Show error message if fetch failed
    if (error) return <p className="text-red-500">{error}</p>;

    // Determine sentiment label from a numeric score
    const getSentimentLabel = (score: number) => {
        if (score >= 0.35) return "Bullish";
        if (score <= -0.35) return "Bearish";
        if (score >= 0.15 && score < 0.35) return "Somewhat Bullish";
        return "Somewhat Bearish";
    };
    
    // Sort articles by date, newest first
    const sortedArticles = articles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Render the list of articles
    return (
        <section className="min-w-full min-h-max">
            <div
                className="overflow-y-scroll h-full bg-gray-100 p-4 rounded-lg shadow-md mb-6"
                style={{ height: '2500px' }} // Set scrollable container height
            >
                {sortedArticles.length > 0 ? (
                    // Display each article
                    articles.map((article) => (
                        <div key={article.id} className="p-4 ">
                            {/* Link to the original article */}
                            <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                                <h3 className="text-lg font-bold">{article.articleName}</h3>
                                {/* Show ticker if listing all articles */}
                                <h4 className="text-gray-800">{ticker ? "" : article.ticker}</h4>
                            </a>
                            
                            {/* Sentiment label and score */}
                            <p className="mt-1 text-black">
                                <span
                                    className={`font-semibold ${
                                        article.sentimentScore > 0.1
                                            ? "text-green-500"
                                            : article.sentimentScore < -0.1
                                                ? "text-red-500"
                                                : "text-yellow-500"
                                    }`}
                                >
                                    {getSentimentLabel(article.sentimentScore)}
                                </span>
                                {" "} - Sentiment Score: {article.sentimentScore}
                            </p>
                            {/* Display formatted publication date */}
                            <p className="text-gray-500 text-sm">
                                Published on: {new Date(article.date).toLocaleDateString()}
                            </p>
                        </div>
                    ))
                ) : (
                    // Fallback if no articles to show
                    <p>No recent articles available.</p>
                )}
            </div>
        </section>
    );
}
