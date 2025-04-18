"use client";

import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FaRegUser, FaRegUserCircle } from "react-icons/fa";
import { useUser } from "../context/UserContext";

// Component that handles user login/logout and session validation
const Login = () => {
    // Grab session info and status from NextAuth
    const { data: session, status } = useSession();
    // Get setUser function from our context to store user info
    const { setUser } = useUser();
    // Router for navigation
    const router = useRouter();
    // Base URL for API calls from environment variables
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    // When session changes, validate user on our backend
    useEffect(() => {
        if (session?.user) {
            validateUser(
                session.user.email ?? "UNKNOWN_EMAIL",
                session.user.name ?? "UNKNOWN_NAME"
            );
        }
    }, [session, setUser]);

    // Send user info to backend to get userId and store in context
    const validateUser = async (userEmail: string, name: string) => {
        if (!userEmail) return;
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/financials/login/${userEmail}/${name}`
            );

            if (response.ok) {
                const data = await response.json();
                console.log("User validated:", data);
                // Update user context with returned userId
                setUser({
                    email: session?.user?.email || null,
                    name: session?.user?.name || null,
                    userId: data.userId || null,
                });
            } else {
                console.error("Failed to validate user.");
            }
        } catch (error) {
            console.error("Error validating user:", error);
        }
    };

    // Trigger NextAuth logout
    const handleLogout = () => {
        signOut();
    };

    // Trigger NextAuth login
    const handleLogin = () => {
        signIn();
    };

    // Navigate to user info page
    const redirectToUserInfo = () => {
        router.push("/user_info");
    };

    // Render loading, logged-in, or logged-out states
    return (
        <div>
            {status === "loading" ? (
                // Show while auth state is loading
                <p>Loading...</p>
            ) : session ? (
                // If user is logged in, show icon and email
                <div>
                    {/* Circle user icon navigates to user info */}
                    <FaRegUserCircle
                        className="cursor-pointer hover:text-blue-500 h-12 w-12"
                        onClick={redirectToUserInfo}
                    />
                    <p>{session.user.email}</p>
                </div>
            ) : (
                // If not logged in, show login icon
                <div className="w-full h-full">
                    <button onClick={handleLogin}>
                        <FaRegUser className="cursor-pointer hover:text-blue-500 h-12 w-12" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default Login;
