import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Shield, Plus, List } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[calc(100vh-160px)] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <p className="mt-4 text-lg">Loading admin dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-indigo-400" />
            <span className="text-indigo-400 font-medium">Admin Access</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Admin Card: Exercise Management */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:bg-gray-800/70 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Exercise Management</h3>
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Shield className="h-5 w-5 text-indigo-400" />
              </div>
            </div>
            <p className="text-gray-400 mb-6">
              Add, edit, and manage exercises for user workouts and fitness plans.
            </p>
            <div className="flex space-x-3">
              <Link
                to="/admin/exercises/add"
                className="flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Exercise
              </Link>
              <Link
                to="/admin/exercises"
                className="flex items-center justify-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <List className="h-4 w-4 mr-2" />
                View All
              </Link>
            </div>
          </div>

          {/* Admin Card: User Management */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:bg-gray-800/70 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">User Management</h3>
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Shield className="h-5 w-5 text-indigo-400" />
              </div>
            </div>
            <p className="text-gray-400 mb-6">
              Manage user accounts, permissions, and subscription status.
            </p>
            <div className="flex space-x-3">
              <Link
                to="/admin/users"
                className="flex items-center justify-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <List className="h-4 w-4 mr-2" />
                View Users
              </Link>
            </div>
          </div>

          {/* Admin Card: Analytics */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:bg-gray-800/70 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Analytics</h3>
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Shield className="h-5 w-5 text-indigo-400" />
              </div>
            </div>
            <p className="text-gray-400 mb-6">
              View platform analytics, user engagement, and performance metrics.
            </p>
            <div className="flex space-x-3">
              <Link
                to="/admin/analytics"
                className="flex items-center justify-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <List className="h-4 w-4 mr-2" />
                View Analytics
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
          <div className="space-y-4">
            <p className="text-gray-400">No recent activity to display.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
