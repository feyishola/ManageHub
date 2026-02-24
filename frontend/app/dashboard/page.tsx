import { buildMetadata } from "@/lib/seo";
import DashboardContent from "./DashboardContent";

export const metadata = buildMetadata({
  title: "Dashboard",
  description:
    "Manage your workspace, projects, and team collaboration efficiently",
  keywords: [
    "dashboard",
    "workspace",
    "projects",
    "management",
    "team",
    "collaboration",
  ],
});

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-[#faf9f7] dark:bg-gray-900 transition-colors">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Welcome back. Here is what's happening today.
          </p>
        </div>

        {/* The hardcoded static UI has been replaced by the DashboardContent 
          Client Component, which handles API data fetching and role-based views.
        */}
        <DashboardContent />
      </div>
    </main>
  );
}
