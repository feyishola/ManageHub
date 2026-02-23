import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";


interface NavItem {
    label: string;
    href: string;
}

const DashboardSidebar: React.FC = () => {
    const pathname = usePathname();
    const router = useRouter();

    const { user, logout } = useAuthStore();

    const navItems: NavItem[] = [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Profile", href: "/dashboard/profile" },
        { label: "Settings", href: "/dashboard/settings" },
    ];

    const adminItems: NavItem[] = [
        { label: "Users", href: "/dashboard/admin/users" },
        { label: "Newsletter", href: "/dashboard/admin/newsletter" },
        { label: "System", href: "/dashboard/admin/system" },
    ];

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    const isActive = (href: string) =>
        pathname === href || pathname.startsWith(`${href}/`);

    return (
        <aside className="flex h-full flex-col bg-white">
            {/* User Info */}
            <div className="flex items-center gap-3 p-4 border-b">
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                        {user?.username ?? "User"}
                    </span>
                    <span className="text-xs text-gray-500">
                        {user?.email}
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`block rounded-md px-3 py-2 text-sm font-medium ${isActive(item.href)
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-600 hover:bg-gray-50"
                            }`}
                    >
                        {item.label}
                    </Link>
                ))}

                {/* Admin Section */}
                {user?.role === "admin" && (
                    <>
                        <div className="mt-6 mb-2 px-3 text-xs font-semibold text-gray-400 uppercase">
                            Admin
                        </div>
                        {adminItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`block rounded-md px-3 py-2 text-sm font-medium ${isActive(item.href)
                                    ? "bg-gray-100 text-gray-900"
                                    : "text-gray-600 hover:bg-gray-50"
                                    }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </>
                )}
            </nav>

            {/* Logout */}
            <div className="p-4 border-t">
                <button
                    onClick={handleLogout}
                    className="w-full rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                    Logout
                </button>
            </div>
        </aside>
    );
};

export default DashboardSidebar;