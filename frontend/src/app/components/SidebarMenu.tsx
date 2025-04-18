"use client";

import Link from "next/link";
import Login from "./Login";
import { SessionProvider } from "next-auth/react";

// Sidebar menu shown on all pages, includes login and navigation links
export default function SidebarMenu() {
    return (
        // Provide session context for authentication
        <SessionProvider>
            {/* Sidebar container fixed to left side */}
            <aside className="fixed top-0 left-0 h-full w-72 bg-gray-800 text-white p-8 flex flex-col shadow-lg">
                {/* Login button or user icon at top */}
                <div className="w-full h-15 pb-5">
                    <Login />
                </div>

                {/* App title linking back to home */}
                <Link href="/" className="mb-8">
                    <h2 className="text-3xl font-extrabold uppercase tracking-wide cursor-pointer hover:text-blue-500 transition-colors">
                        SwampLocks
                    </h2>
                </Link>

                {/* Navigation links for different pages */}
                <nav className="flex flex-col space-y-6 text-lg font-medium">
                    <Link href="/commodities" className="hover:text-blue-500">
                        Commodities
                    </Link>
                    <Link href="/economic_indicators_dashboard" className="hover:text-blue-500">
                        Economic Indicators
                    </Link>
                    <Link href="/ex_rates" className="hover:text-blue-500">
                        Ex Rates
                    </Link>
                </nav>
            </aside>
        </SessionProvider>
    );
}
