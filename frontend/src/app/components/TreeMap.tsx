import React from "react";

// Shape of each stock item
interface Stock {
    symbol: string;
    marketCap: number;
    change: number;
}

// Treemap node extends Stock with layout coordinates and size
interface TreemapNode extends Stock {
    x: number;
    y: number;
    width: number;
    height: number;
}

// Recursive function to compute treemap layout by splitting items
function computeTreemap(
    items: Stock[],
    x: number,
    y: number,
    width: number,
    height: number,
    vertical: boolean
): TreemapNode[] {
    // Base case: no items
    if (items.length === 0) return [];
    // Single item fills the area
    if (items.length === 1) {
        return [{ ...items[0], x, y, width, height }];
    }

    // Sum total market cap
    const totalCap = items.reduce((sum, item) => sum + item.marketCap, 0);
    // Find index to split items into two groups of roughly equal cap
    let sum = 0;
    let splitIndex = 0;
    for (let i = 0; i < items.length; i++) {
        sum += items[i].marketCap;
        if (sum >= totalCap / 2) {
            splitIndex = i;
            break;
        }
    }

    // Divide items into two groups
    const group1 = items.slice(0, splitIndex + 1);
    const group2 = items.slice(splitIndex + 1);
    // Sum caps for each group
    const group1Cap = group1.reduce((s, item) => s + item.marketCap, 0);
    const group2Cap = group2.reduce((s, item) => s + item.marketCap, 0);

    let layout: TreemapNode[] = [];
    if (vertical) {
        // Split area vertically: group1 left, group2 right
        const width1 = width * (group1Cap / totalCap);
        layout = [
            ...computeTreemap(group1, x, y, width1, height, !vertical),
            ...computeTreemap(group2, x + width1, y, width - width1, height, !vertical)
        ];
    } else {
        // Split area horizontally: group1 top, group2 bottom
        const height1 = height * (group1Cap / totalCap);
        layout = [
            ...computeTreemap(group1, x, y, width, height1, !vertical),
            ...computeTreemap(group2, x, y + height1, width, height - height1, !vertical)
        ];
    }
    return layout;
}

// Determine font size that fits within a treemap cell
const getAdjustedFontSize = (cellWidth: number, cellHeight: number, text: string) => {
    // Base size is a quarter of the smaller dimension, min 8px
    const baseSize = Math.max(8, Math.min(cellWidth, cellHeight) / 4);
    // Don't exceed width or half the height
    const maxByWidth = cellWidth / (text.length * 0.6);
    const maxByHeight = cellHeight / 2;
    return Math.min(baseSize, maxByWidth, maxByHeight);
};

// Props: list of stocks plus optional canvas size
interface TreemapProps {
    stocks: Stock[];
    width?: number;
    height?: number;
}

// Main Treemap component
const Treemap: React.FC<TreemapProps> = ({ stocks, width = 600, height = 480 }) => {
    // Sort stocks by market cap descending
    const sortedStocks = [...stocks].sort((a, b) => b.marketCap - a.marketCap);
    // Compute layout, toggling split direction based on aspect ratio
    const layout = computeTreemap(sortedStocks, 0, 0, width, height, width >= height);

    // Choose background color based on percent change
    const getGradientColor = (change: number) => {
        const capped = Math.max(-5, Math.min(5, change));
        if (capped >= 0) {
            if (capped >= 2.5) return "#008000";
            if (capped >= 2)   return "#43a047";
            if (capped >= 1.5) return "#66bb6a";
            if (capped >= 0.5) return "#81c784";
            return "#a5d6a7";
        } else {
            if (capped <= -2.5) return "#e53935";
            if (capped <= -2)   return "#f44336";
            if (capped <= -1.5) return "#ef5350";
            if (capped <= -0.5) return "#ff7043";
            return "#ff8a65";
        }
    };

    return (
        <div
            className="relative mx-auto"
            style={{ width: `${width}px`, height: `${height}px` }}
        >
            {layout.map((node, idx) => {
                // Compute font sizes for symbol and percent
                const symbolSize = getAdjustedFontSize(node.width, node.height, node.symbol);
                const percent = `${node.change}%`;
                const percentSize = getAdjustedFontSize(node.width, node.height, percent);

                return (
                    <div
                        key={idx}
                        className="absolute flex flex-col items-center justify-center font-mono text-black border border-gray-600"
                        style={{
                            left: `${node.x}px`,
                            top: `${node.y}px`,
                            width: `${node.width}px`,
                            height: `${node.height}px`,
                            background: getGradientColor(node.change)
                        }}
                    >
                        {/* Stock symbol */}
                        <span style={{ fontSize: `${symbolSize}px`, lineHeight: 1.2 }}>
                            {node.symbol}
                        </span>
                        {/* Percent change */}
                        <span style={{ fontSize: `${percentSize}px`, lineHeight: 1.2 }}>
                            {percent}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

export default Treemap;
