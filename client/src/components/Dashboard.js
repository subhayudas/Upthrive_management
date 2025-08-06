import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import {
  FileText,
  MessageSquare,
  CheckSquare,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Set axios base URL
axios.defaults.baseURL = API_BASE_URL;

const Dashboard = () => {
  const { user, isManager, isEditor, isClient } = useAuth();
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalUsers: 0
  });
  const [recentRequests, setRecentRequests] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch recent requests
        const requestsResponse = await axios.get('/api/requests/my-requests');
        setRecentRequests(requestsResponse.data.requests.slice(0, 5));

        // Fetch recent tasks
        const tasksResponse = await axios.get('/api/tasks/my-tasks');
        setRecentTasks(tasksResponse.data.tasks.slice(0, 5));

        // Calculate stats
        const requests = requestsResponse.data.requests;
        const tasks = tasksResponse.data.tasks;

        setStats({
          totalRequests: requests.length,
          pendingRequests: requests.filter(r => r.status === 'pending_manager_review').length,
          totalTasks: tasks.length,
          completedTasks: tasks.filter(t => t.status === 'completed').length,
          totalUsers: isManager ? (await axios.get('/api/users')).data.users.length : 0
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isManager]);

  const getStatusBadge = (status) => {
    const statusClasses = {
      'pending_manager_review': 'status-pending',
      'assigned_to_editor': 'status-in-progress',
      'submitted_for_review': 'status-pending',
      'manager_approved': 'status-approved',
      'manager_rejected': 'status-rejected',
      'client_approved': 'status-approved',
      'client_rejected': 'status-rejected',
      'completed': 'status-approved',
      'assigned': 'status-in-progress',
      'in_progress': 'status-in-progress'
    };

    return (
      <span className={`status-badge ${statusClasses[status] || 'status-pending'}`}>
        {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-gray-600 mt-1">
          Here's what's happening with your {user?.role} account.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <MessageSquare className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Requests</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalRequests}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending Requests</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pendingRequests}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckSquare className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Tasks</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalTasks}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completed Tasks</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.completedTasks}</p>
            </div>
          </div>
        </div>

        {isManager && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Requests */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Requests</h3>
          {recentRequests.length > 0 ? (
            <div className="space-y-4">
              {recentRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {request.message.substring(0, 50)}...
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No recent requests</p>
          )}
        </div>

        {/* Recent Tasks */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Tasks</h3>
          {recentTasks.length > 0 ? (
            <div className="space-y-4">
              {recentTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {task.request?.message?.substring(0, 50)}...
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(task.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusBadge(task.status)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No recent tasks</p>
          )}
        </div>
      </div>

      {/* Role-specific Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {isClient && (
            <a href="/requests" className="btn-primary">
              <MessageSquare className="h-5 w-5 mr-2" />
              New Request
            </a>
          )}
          
          {isManager && (
            <>
              <a href="/cc-list" className="btn-primary">
                <FileText className="h-5 w-5 mr-2" />
                Manage CC Lists
              </a>
              <a href="/users" className="btn-primary">
                <Users className="h-5 w-5 mr-2" />
                Manage Users
              </a>
            </>
          )}
          
          {isEditor && (
            <a href="/tasks" className="btn-primary">
              <CheckSquare className="h-5 w-5 mr-2" />
              View Assigned Tasks
            </a>
          )}
          
          {(isClient || isManager || isEditor) && (
            <a href="/cc-list" className="btn-secondary">
              <FileText className="h-5 w-5 mr-2" />
              View CC List
            </a>
          )}
          
          {(isEditor || isManager || isClient) && (
            <a href="/tasks" className="btn-secondary">
              <CheckSquare className="h-5 w-5 mr-2" />
              My Tasks
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;