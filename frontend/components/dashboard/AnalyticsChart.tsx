"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Mock data: Monthly member registration trend
const data = [
  { month: "Jan", members: 65 },
  { month: "Feb", members: 85 },
  { month: "Mar", members: 120 },
  { month: "Apr", members: 95 },
  { month: "May", members: 150 },
  { month: "Jun", members: 180 },
  { month: "Jul", members: 210 },
  { month: "Aug", members: 250 },
  { month: "Sep", members: 230 },
  { month: "Oct", members: 280 },
  { month: "Nov", members: 310 },
  { month: "Dec", members: 340 },
];

export function AnalyticsChart() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 w-full">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900">Member Growth</h3>
        <p className="text-sm text-gray-500">
          Monthly registration trend for the current year
        </p>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 10,
              left: -20,
              bottom: 0,
            }}
          >
            {/* Subtle horizontal grid lines */}
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6B7280", fontSize: 12 }}
              dy={10}
            />
            
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6B7280", fontSize: 12 }}
            />
            
            <Tooltip
              cursor={{ fill: "#F3F4F6" }}
              contentStyle={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #E5E7EB",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                fontSize: "14px",
                color: "#111827",
              }}
              itemStyle={{ color: "#111827", fontWeight: 500 }}
            />
            
            <Bar
              dataKey="members"
              name="New Members"
              fill="#111827" // Using the gray-900 color from our design system
              radius={[4, 4, 0, 0]} // Rounded top corners
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}