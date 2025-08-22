import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  CheckSquare, 
  Clock, 
  Star,
  FileText,
  MessageSquare,
  Plus,
  Eye
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Dashboard = () => {
  const { user, isClient, isManager, isEditor } = useAuth();
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    completedRequests: 0,
    inProgressRequests: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in again');
        return;
      }

      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      // Use existing requests route
      const response = await axios.get('/api/requests/my-requests', config);
      const requests = response.data.requests || [];
      
      // Calculate stats from requests
      const totalRequests = requests.length;
      const pendingRequests = requests.filter(r => 
        r.status === 'pending_manager_review'
      ).length;
      const inProgressRequests = requests.filter(r => 
        r.status === 'assigned_to_editor' || r.status === 'submitted_for_review'
      ).length;
      const completedRequests = requests.filter(r => 
        r.status === 'completed' || r.status === 'client_approved'
      ).length;

      setStats({
        totalRequests,
        pendingRequests,
        inProgressRequests,
        completedRequests
      });

      // Recent activity
      const recentActivity = requests
        .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
        .slice(0, 3) // Show fewer items on mobile
        .map(request => ({
          message: request.message,
          description: `${request.content_type} request`,
          status: request.status,
          created_at: request.created_at
        }));

      setRecentActivity(recentActivity);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (error.response?.status === 401) {
        toast.error('Please log in again');
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    let greeting = 'Good evening';
    
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 18) greeting = 'Good afternoon';
    
    return `${greeting}, ${user?.name || 'User'}!`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pending_manager_review': 'bg-orange-100 text-orange-700 border border-orange-200',
      'assigned_to_editor': 'bg-blue-100 text-blue-700 border border-blue-200',
      'submitted_for_review': 'bg-purple-100 text-purple-700 border border-purple-200',
      'manager_approved': 'bg-green-100 text-green-700 border border-green-200',
      'manager_rejected': 'bg-red-100 text-red-700 border border-red-200',
      'client_approved': 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      'client_rejected': 'bg-orange-100 text-orange-700 border border-orange-200',
      'completed': 'bg-gray-100 text-gray-700 border border-gray-200'
    };
    return badges[status] || badges['pending_manager_review'];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          </div>
          <p className="mt-3 text-slate-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Mobile-Optimized Header - No Shadows */}
        <div className="mb-4 sm:mb-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm sm:text-base font-bold">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-800">{getWelcomeMessage()}</h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                  {isClient && 'Track your content requests'}
                  {isManager && 'Manage your team'}
                  {isEditor && 'View your tasks'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Stats Grid - No Shadows */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-white/20 p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600" />
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Total</p>
                <p className="text-lg sm:text-xl font-bold text-gray-800">{stats.totalRequests}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-white/20 p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Pending</p>
                <p className="text-lg sm:text-xl font-bold text-gray-800">{stats.pendingRequests}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-white/20 p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              <div>
                <p className="text-xs sm:text-sm text-gray-600">In Progress</p>
                <p className="text-lg sm:text-xl font-bold text-gray-800">{stats.inProgressRequests}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-white/20 p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <CheckSquare className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Completed</p>
                <p className="text-lg sm:text-xl font-bold text-gray-800">{stats.completedRequests}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Compact Quick Actions */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-white/20 p-4 sm:p-5">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Quick Actions</h2>
            <div className="space-y-2 sm:space-y-3">
              {isClient && (
                <button
                  onClick={() => window.location.href = '/requests'}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg flex items-center gap-2 sm:gap-3 transition-all duration-200 text-sm sm:text-base"
                >
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                  New Request
                </button>
              )}
              
              <button
                onClick={() => window.location.href = '/requests'}
                className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg flex items-center gap-2 sm:gap-3 transition-all duration-200 text-sm sm:text-base"
              >
                <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                View Requests
              </button>
              
              <button
                onClick={() => window.location.href = '/cc-list'}
                className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg flex items-center gap-2 sm:gap-3 transition-all duration-200 text-sm sm:text-base"
              >
                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                Content Calendar
              </button>
            </div>
          </div>

          {/* Compact Recent Activity */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md border border-white/20 p-4 sm:p-5">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Recent Activity</h2>
            {recentActivity.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50/50 rounded-lg">
                    <div className="flex-shrink-0 mt-0.5">
                      <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-gray-800 font-medium truncate">
                        {activity.message}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-500">
                          {activity.created_at && new Date(activity.created_at).toLocaleDateString()}
                        </p>
                        {activity.status && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getStatusBadge(activity.status)}`}>
                            {activity.status.replace(/_/g, ' ').replace(/pending manager/, 'pending').replace(/assigned to/, 'assigned')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <MessageSquare className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400 mx-auto mb-2 sm:mb-3" />
                <p className="text-xs sm:text-sm text-gray-500">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;