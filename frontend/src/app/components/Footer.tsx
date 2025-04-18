import React from "react";

const Footer: React.FC = () => {
    return (
        <footer className="mt-12 text-center text-secondary">
            <p>Powered by Rafael, Andres, Deep, Chandler, and Matthew</p>
            <p className="mt-2 text-sm">
                © {new Date().getFullYear()} SwampLocks. All rights reserved.
            </p>
        </footer>
    );
};

export default Footer;
