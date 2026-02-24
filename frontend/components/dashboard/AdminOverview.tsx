"use client";

import React from "react";
import {
  Users,
  UserCheck,
  UserX,
  Mail,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export interface AdminOverviewProps {
  systemStats: {
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
  };
  newsletterStats: {
    totalSubscribers: number;
    verifiedSubscribers: number;
    unverifiedSubscribers: number;
  };
}

export function AdminOverview({
  systemStats,
  newsletterStats,
}: AdminOverviewProps) {
  return (
    <div className="space-y-8">
      {/* System Stats Group */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          System Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Users */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-gray-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-gray-700" />
              </div>
              <h4 className="text-gray-500 font-medium">Total Users</h4>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {systemStats.totalUsers}
            </p>
          </div>

          {/* Active Users */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-green-50 p-3 rounded-lg">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="text-gray-500 font-medium">Active Users</h4>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {systemStats.activeUsers}
            </p>
          </div>

          {/* Suspended Users */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-red-50 p-3 rounded-lg">
                <UserX className="w-6 h-6 text-red-600" />
              </div>
              <h4 className="text-gray-500 font-medium">Suspended Users</h4>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {systemStats.suspendedUsers}
            </p>
          </div>
        </div>
      </div>

      {/* Newsletter Stats Group */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Newsletter Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Subscribers */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-gray-100 p-3 rounded-lg">
                <Mail className="w-6 h-6 text-gray-700" />
              </div>
              <h4 className="text-gray-500 font-medium">Total Subscribers</h4>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {newsletterStats.totalSubscribers}
            </p>
          </div>

          {/* Verified Subscribers */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-teal-50 p-3 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-teal-600" />
              </div>
              <h4 className="text-gray-500 font-medium">Verified</h4>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {newsletterStats.verifiedSubscribers}
            </p>
          </div>

          {/* Unverified Subscribers */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-amber-50 p-3 rounded-lg">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <h4 className="text-gray-500 font-medium">
                Pending Verification
              </h4>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {newsletterStats.unverifiedSubscribers}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
