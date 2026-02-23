import React, { useState } from "react";

interface DashboardLayoutProps {
    sidebar: React.ReactNode;
    children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
    sidebar,
    children,
}) => {
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-white">
                {sidebar}
            </aside>

            {/* Mobile Drawer */}
            {isMobileOpen && (
                <div className="fixed inset-0 z-40 flex md:hidden">
                    {/* Overlay */}
                    <div
                        className="fixed inset-0 bg-black/40"
                        onClick={() => setIsMobileOpen(false)}
                    />

                    {/* Drawer */}
                    <aside className="relative z-50 w-64 bg-white shadow-lg">
                        {sidebar}
                    </aside>
                </div>
            )}

            {/* Main Content */}
            <div className="flex flex-col flex-1">
                {/* Mobile Header */}
                <header className="flex items-center justify-between px-4 py-3 bg-white border-b md:hidden">
                    <button
                        onClick={() => setIsMobileOpen(true)}
                        className="text-gray-600 focus:outline-none"
                    >
                        ☰
                    </button>
                    <span className="font-medium text-gray-800">Dashboard</span>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;