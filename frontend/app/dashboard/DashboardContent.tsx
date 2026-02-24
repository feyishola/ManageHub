"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { 
  Users, 
  Activity, 
  TrendingUp, 
  Clock, 
  Plus, 
  Settings, 
  FileText, 
  BarChart3 
} from "lucide-react";

// Types based on expected API responses
interface DashboardStats {
  role: "admin" | "user"; // Assuming role comes with stats for this example
  totalUsers?: number;
  activeProjects: number;
  completionRate: number;
  recentLogins?: number;
}

interface ActivityItem {
  id: string;
  action: string;
  timestamp: string;
  description: string;
}

type TabType = "overview" | "users" | "analytics";

const DashboardContent = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        // Fetch stats and activity in parallel
        const [statsRes, activityRes] = await Promise.all([
          apiClient.get("/dashboard/stats"),
          apiClient.get("/dashboard/activity"),
        ]);

        setStats(statsRes.data);
        setActivities(activityRes.data);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Failed to load dashboard data";
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        {/* Loading skeleton for stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
        {/* Loading skeleton for main content area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-gray-200 rounded-xl"></div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const isAdmin = stats.role === "admin";

  // Shared Stats Cards Component
  const StatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div className="bg-gray-100 p-2 rounded-lg">
            <Activity className="w-5 h-5 text-gray-700" />
          </div>
        </div>
        <h3 className="text-gray-500 text-sm font-medium">Active Projects</h3>
        <p className="text-2xl font-bold text-gray-900">{stats.activeProjects}</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div className="bg-gray-100 p-2 rounded-lg">
            <TrendingUp className="w-5 h-5 text-gray-700" />
          </div>
        </div>
        <h3 className="text-gray-500 text-sm font-medium">Completion Rate</h3>
        <p className="text-2xl font-bold text-gray-900">{stats.completionRate}%</p>
      </div>

      {isAdmin && (
        <>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-gray-100 p-2 rounded-lg">
                <Users className="w-5 h-5 text-gray-700" />
              </div>
            </div>
            <h3 className="text-gray-500 text-sm font-medium">Total Users</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.totalUsers || 0}</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-gray-100 p-2 rounded-lg">
                <Clock className="w-5 h-5 text-gray-700" />
              </div>
            </div>
            <h3 className="text-gray-500 text-sm font-medium">Recent Logins</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.recentLogins || 0}</p>
          </div>
        </>
      )}
    </div>
  );

  // Shared Activity Feed Component
  const ActivityFeed = () => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-full">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Recent Activity</h3>
      {activities.length > 0 ? (
        <div className="space-y-6">
          {activities.map((item) => (
            <div key={item.id} className="flex gap-4">
              <div className="mt-1 flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-gray-400 mt-2"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{item.action}</p>
                <p className="text-sm text-gray-500">{item.description}</p>
                <span className="text-xs text-gray-400 mt-1 block">
                  {new Date(item.timestamp).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-8">No recent activity.</p>
      )}
    </div>
  );

  // Shared Quick Actions Component
  const QuickActions = () => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-4">
        <button className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100">
          <Plus className="w-6 h-6 text-gray-700 mb-2" />
          <span className="text-sm font-medium text-gray-900">New Project</span>
        </button>
        <button className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100">
          <FileText className="w-6 h-6 text-gray-700 mb-2" />
          <span className="text-sm font-medium text-gray-900">Reports</span>
        </button>
        <button className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100">
          <Settings className="w-6 h-6 text-gray-700 mb-2" />
          <span className="text-sm font-medium text-gray-900">Settings</span>
        </button>
      </div>
    </div>
  );

  // Admin View
  if (isAdmin) {
    return (
      <div>
        {/* Admin Tabs */}
        <div className="flex space-x-1 border-b border-gray-200 mb-8">
          {(["overview", "users", "analytics"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div>
            <StatsCards />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <ActivityFeed />
              </div>
              <div>
                <QuickActions />
              </div>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">User Management</h3>
            <p className="text-gray-500">User management features will be displayed here.</p>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">System Analytics</h3>
            <p className="text-gray-500">Detailed system analytics and charts will be displayed here.</p>
          </div>
        )}
      </div>
    );
  }

  // Regular User View
  return (
    <div>
      <StatsCards />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2">
          {/* Analytics Chart Placeholder */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-full flex flex-col justify-center items-center min-h-[300px]">
            <BarChart3 className="w-10 h-10 text-gray-300 mb-3" />
            <h3 className="text-md font-medium text-gray-900 mb-1">Your Performance</h3>
            <p className="text-sm text-gray-500">Analytics chart rendering here</p>
          </div>
        </div>
        <div>
          <QuickActions />
        </div>
      </div>
      <div className="grid grid-cols-1">
        <ActivityFeed />
      </div>
    </div>
  );
};

export default DashboardContent;