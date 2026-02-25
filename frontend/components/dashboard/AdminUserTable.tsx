"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  MoreVertical,
  Shield,
  User as UserIcon,
  Ban,
  CheckCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";

// Define the User interface based on expected API data
interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  status: "active" | "suspended";
  createdAt: string;
}

interface PaginatedResponse {
  data: User[];
  meta: {
    total: number;
    page: number;
    totalPages: number;
  };
}

export function AdminUserTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Debounce search input to avoid spamming the API
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get<PaginatedResponse>(
        "/dashboard/admin/users",
        {
          params: {
            search: debouncedSearch,
            page: currentPage,
            limit: 10,
          },
        },
      );

      setUsers(response.data.data);
      setTotalPages(response.data.meta.totalPages);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to load users";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, currentPage]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle outside click to close dropdowns
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Action Handlers
  const handleAction = async (
    action: string,
    userId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setOpenDropdownId(null);

    try {
      // Optimistic UI updates or API calls would go here
      // Example: await apiClient.patch(`/dashboard/admin/users/${userId}/${action}`);
      toast.success(`User ${action} action triggered successfully`);
      await fetchUsers(); // Refresh data
    } catch (error) {
      toast.error(`Failed to execute ${action} action`);
    }
  };

  const toggleDropdown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdownId(openDropdownId === id ? null : id);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header & Search */}
      <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">User Management</h2>
          <p className="text-sm text-gray-500">View and manage system users</p>
        </div>

        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors"
          />
        </div>
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-900 text-xs uppercase font-semibold border-b border-gray-200">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Joined Date</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <p>Loading users...</p>
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  No users found matching your criteria.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5">
                      {user.role === "admin" ? (
                        <Shield className="w-4 h-4 text-gray-700" />
                      ) : (
                        <UserIcon className="w-4 h-4 text-gray-500" />
                      )}
                      <span className="capitalize">{user.role}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        user.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button
                      onClick={(e) => toggleDropdown(user.id, e)}
                      className="p-1 rounded-md hover:bg-gray-200 text-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {/* Action Dropdown */}
                    {openDropdownId === user.id && (
                      <div className="absolute right-6 top-10 z-10 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 text-left">
                        <button
                          onClick={(e) =>
                            handleAction("toggle_role", user.id, e)
                          }
                          className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Shield className="w-4 h-4" />
                          Change Role
                        </button>

                        {user.status === "active" ? (
                          <button
                            onClick={(e) => handleAction("suspend", user.id, e)}
                            className="w-full px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2"
                          >
                            <Ban className="w-4 h-4" />
                            Suspend User
                          </button>
                        ) : (
                          <button
                            onClick={(e) =>
                              handleAction("activate", user.id, e)
                            }
                            className="w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Activate User
                          </button>
                        )}

                        <div className="border-t border-gray-100 my-1"></div>
                        <button
                          onClick={(e) => handleAction("delete", user.id, e)}
                          className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete User
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
        <p className="text-sm text-gray-500">
          Page <span className="font-medium text-gray-900">{currentPage}</span>{" "}
          of{" "}
          <span className="font-medium text-gray-900">{totalPages || 1}</span>
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || isLoading}
            className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={
              currentPage === totalPages || totalPages === 0 || isLoading
            }
            className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
