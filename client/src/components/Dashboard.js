import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { MessageSquare, CheckSquare, FileText, TrendingUp, Calendar, Clock, Star } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
axios.defaults.baseURL = API_BASE_URL;

const Dashboard = () => {
  const { user, isManager, isEditor, isClient } = useAuth();
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    completedRequests: 0
  });
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch recent requests
        const requestsResponse = await axios.get('/api/requests/my-requests');
        setRecentRequests(requestsResponse.data.requests.slice(0, 5));

        // Calculate stats
        const requests = requestsResponse.data.requests;

        setStats({
          totalRequests: requests.length,
          pendingRequests: requests.filter(r => r.status === 'pending_manager_review').length,
          completedRequests: requests.filter(r => r.status === 'completed').length
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusStyle = (status) => {
    const styles = {
      'pending_manager_review': { 
        bg: 'bg-gradient-to-r from-amber-500 to-orange-600', 
        text: 'text-white',
        icon: Clock
      },
      'assigned_to_editor': { 
        bg: 'bg-gradient-to-r from-blue-500 to-indigo-600', 
        text: 'text-white',
        icon: CheckSquare // Change from Users to CheckSquare
      },
      'in_progress': { 
        bg: 'bg-gradient-to-r from-purple-500 to-pink-600', 
        text: 'text-white',
        icon: TrendingUp
      },
      'pending_client_review': { 
        bg: 'bg-gradient-to-r from-teal-500 to-cyan-600', 
        text: 'text-white',
        icon: Star
      },
      'completed': { 
        bg: 'bg-gradient-to-r from-emerald-500 to-green-600', 
        text: 'text-white',
        icon: CheckSquare
      },
      'rejected': { 
        bg: 'bg-gradient-to-r from-red-500 to-rose-600', 
        text: 'text-white',
        icon: Clock
      }
    };
    return styles[status] || styles.pending_manager_review;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-400 rounded-full animate-ping mx-auto"></div>
          </div>
          <p className="mt-4 text-slate-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-slate-600 mt-2 font-medium">
              Here's what's happening with your {isClient ? 'requests' : isEditor ? 'tasks' : 'agency'} today.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Total Requests</p>
                <p className="text-3xl font-bold text-slate-800">{stats.totalRequests}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Pending</p>
                <p className="text-3xl font-bold text-slate-800">{stats.pendingRequests}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Completed</p>
                <p className="text-3xl font-bold text-slate-800">{stats.completedRequests}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                <CheckSquare className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {isClient && (
                <>
                  <a 
                    href="/requests" 
                    className="group relative bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-3"
                  >
                    <MessageSquare className="h-6 w-6 group-hover:scale-110 transition-transform duration-200" />
                    New Request
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-200"></div>
                  </a>
                  <a 
                    href="/cc-list" 
                    className="group bg-white/50 hover:bg-white/70 text-slate-700 hover:text-slate-900 font-semibold py-4 px-6 rounded-xl border-2 border-slate-200 hover:border-slate-300 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-3"
                  >
                    <FileText className="h-6 w-6 group-hover:scale-110 transition-transform duration-200" />
                    View CC List
                  </a>
                </>
              )}
              
              {isManager && (
                <>
                  <a 
                    href="/cc-list" 
                    className="group relative bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-3"
                  >
                    <FileText className="h-6 w-6 group-hover:scale-110 transition-transform duration-200" />
                    Manage CC Lists
                  </a>
                </>
              )}
              
              {isEditor && (
                <>
                  <a 
                    href="/tasks" 
                    className="group relative bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-3"
                  >
                    <CheckSquare className="h-6 w-6 group-hover:scale-110 transition-transform duration-200" />
                    View Assigned Tasks
                  </a>
                  <a 
                    href="/cc-list" 
                    className="group bg-white/50 hover:bg-white/70 text-slate-700 hover:text-slate-900 font-semibold py-4 px-6 rounded-xl border-2 border-slate-200 hover:border-slate-300 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-3"
                  >
                    <FileText className="h-6 w-6 group-hover:scale-110 transition-transform duration-200" />
                    View CC List
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Recent Requests */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Recent Activity</h2>
          {recentRequests.length > 0 ? (
            <div className="space-y-4">
              {recentRequests.map(request => {
                const statusStyle = getStatusStyle(request.status);
                const StatusIcon = statusStyle.icon;
                
                return (
                  <div key={request.id} className="bg-white/50 rounded-xl p-4 border border-white/30 hover:bg-white/70 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800">{request.message}</h3>
                        <p className="text-sm text-slate-600 mt-1">
                          {request.content_type} • Created {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1 ${statusStyle.bg} ${statusStyle.text} rounded-full text-xs font-bold shadow-lg`}>
                        <StatusIcon className="w-3 h-3" />
                        {request.status.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No recent activity to show</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;