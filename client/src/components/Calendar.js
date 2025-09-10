import React, { useState, useEffect } from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  FileText, 
  Zap, 
  Star, 
  Target,
  Users,
  Filter,
  Plus,
  Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../calendar.css';

// Setup moment localizer
const localizer = momentLocalizer(moment);

const Calendar = () => {
  const { user, isManager, isEditor } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clients, setClients] = useState([]);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [showAllClients, setShowAllClients] = useState(true);

  useEffect(() => {
    if (user?.role === 'manager' || user?.role === 'editor') {
      fetchClients();
    } else if (user?.role === 'client') {
      fetchCalendarData();
    }
  }, [user?.role]);

  useEffect(() => {
    if (selectedClient || user?.role === 'client') {
      fetchCalendarData();
    }
  }, [selectedClient, showAllClients]);

  const fetchClients = async () => {
    try {
      const response = await axios.get('/api/users/clients');
      const clientData = response.data.clients;
      
      const mappedClients = clientData.map(client => ({
        client_id: client.client_id || client.id,
        name: client.name,
        email: client.email,
        id: client.id
      }));
      
      setClients(mappedClients);
      
      if (mappedClients.length > 0) {
        setSelectedClient(mappedClients[0].client_id);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    }
  };

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      
      if (showAllClients && (isManager || isEditor)) {
        // Fetch all CC lists for all clients
        const allEvents = [];
        
        for (const client of clients) {
          try {
            const response = await axios.get(`/api/cc-list/${client.client_id}`);
            const ccList = response.data.ccList || [];
            
            const clientEvents = ccList
              .filter(item => item.scheduled_date)
              .map(item => ({
                id: item.id,
                title: item.title,
                start: new Date(item.scheduled_date),
                end: new Date(moment(item.scheduled_date).add(1, 'hour')),
                resource: {
                  ...item,
                  clientName: client.name,
                  clientId: client.client_id
                }
              }));
            
            allEvents.push(...clientEvents);
          } catch (error) {
            console.error(`Error fetching CC list for client ${client.name}:`, error);
          }
        }
        
        setEvents(allEvents);
      } else {
        // Fetch for specific client
        let clientId;
        if (user.role === 'client') {
          clientId = user.client_id;
        } else {
          clientId = selectedClient;
        }
        
        if (!clientId) return;
        
        const response = await axios.get(`/api/cc-list/${clientId}`);
        const ccList = response.data.ccList || [];
        
        const calendarEvents = ccList
          .filter(item => item.scheduled_date)
          .map(item => ({
            id: item.id,
            title: item.title,
            start: new Date(item.scheduled_date),
            end: new Date(moment(item.scheduled_date).add(1, 'hour')),
            resource: {
              ...item,
              clientName: user.role === 'client' ? user.name : clients.find(c => c.client_id === clientId)?.name,
              clientId: clientId
            }
          }));
        
        setEvents(calendarEvents);
      }
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const getEventStyle = (event) => {
    const { priority, content_type, status } = event.resource;
    
    let backgroundColor = '#3B82F6'; // Default blue
    
    // Priority-based colors
    if (priority === 'high') {
      backgroundColor = '#EF4444'; // Red
    } else if (priority === 'medium') {
      backgroundColor = '#F59E0B'; // Orange
    } else if (priority === 'low') {
      backgroundColor = '#10B981'; // Green
    }
    
    // Status-based opacity
    let opacity = 1;
    if (status === 'completed') {
      opacity = 0.6;
    } else if (status === 'inactive') {
      opacity = 0.4;
    }
    
    return {
      style: {
        backgroundColor,
        opacity,
        border: 'none',
        borderRadius: '6px',
        color: 'white',
        fontSize: '12px',
        fontWeight: '500'
      }
    };
  };

  const getContentTypeIcon = (contentType) => {
    const icons = {
      post: FileText,
      reel: Zap,
      story: Clock,
      carousel: Star
    };
    return icons[contentType] || FileText;
  };

  const getPriorityIcon = (priority) => {
    const icons = {
      high: Target,
      medium: Star,
      low: Clock
    };
    return icons[priority] || Star;
  };

  const EventComponent = ({ event }) => {
    const ContentIcon = getContentTypeIcon(event.resource.content_type);
    const PriorityIcon = getPriorityIcon(event.resource.priority);
    
    return (
      <div className="p-1">
        <div className="flex items-center gap-1 mb-1">
          <ContentIcon className="h-3 w-3" />
          <PriorityIcon className="h-3 w-3" />
        </div>
        <div className="text-xs font-medium truncate">
          {event.title}
        </div>
        {showAllClients && (
          <div className="text-xs opacity-75 truncate">
            {event.resource.clientName}
          </div>
        )}
      </div>
    );
  };

  const handleSelectEvent = (event) => {
    // You can implement a modal or navigation to show event details
    console.log('Selected event:', event);
    toast.success(`Selected: ${event.title}`);
  };

  const handleSelectSlot = (slotInfo) => {
    // You can implement creating new events on date selection
    console.log('Selected slot:', slotInfo);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-gray-400 rounded-full animate-ping mx-auto"></div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-6 md:mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl md:rounded-2xl border border-gray-200/60 p-4 md:p-8">
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Content Calendar
                </h1>
                <p className="text-slate-600 mt-1 md:mt-2 font-medium text-sm md:text-base">
                  View and manage scheduled content across all clients
                </p>
              </div>
              
              {/* Controls */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {/* Client Selection */}
                {(isManager || isEditor) && (
                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Client Filter
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedClient || ''}
                        onChange={(e) => setSelectedClient(e.target.value)}
                        className="flex-1 px-4 py-2 bg-white/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                        disabled={showAllClients}
                      >
                        <option value="">Select a client...</option>
                        {clients.map(client => (
                          <option key={client.client_id} value={client.client_id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setShowAllClients(!showAllClients)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                          showAllClients 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        <Users className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* View Controls */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setView('month')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      view === 'month' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setView('week')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      view === 'week' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setView('day')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      view === 'day' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Day
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Component */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-4 md:p-6">
          <div style={{ height: '600px' }}>
            <BigCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
              eventPropGetter={getEventStyle}
              components={{
                event: EventComponent
              }}
              views={['month', 'week', 'day']}
              step={60}
              timeslots={1}
              showMultiDayTimes
              popup
              popupOffset={{ x: 10, y: 10 }}
              style={{
                height: '100%',
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/60 p-4 md:p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Legend</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Priority Colors */}
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Priority</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-sm text-slate-600">High Priority</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded"></div>
                  <span className="text-sm text-slate-600">Medium Priority</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-sm text-slate-600">Low Priority</span>
                </div>
              </div>
            </div>

            {/* Content Types */}
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Content Types</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-600" />
                  <span className="text-sm text-slate-600">Post</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-slate-600" />
                  <span className="text-sm text-slate-600">Reel</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-600" />
                  <span className="text-sm text-slate-600">Story</span>
                </div>
              </div>
            </div>

            {/* Status */}
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Status</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded opacity-100"></div>
                  <span className="text-sm text-slate-600">Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded opacity-60"></div>
                  <span className="text-sm text-slate-600">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded opacity-40"></div>
                  <span className="text-sm text-slate-600">Inactive</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {events.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-12 max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-r from-slate-300 to-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CalendarIcon className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">
                No scheduled content
              </h3>
              <p className="text-slate-600 mb-6">
                {showAllClients 
                  ? 'No content has been scheduled across all clients yet.'
                  : 'No content has been scheduled for this client yet.'
                }
              </p>
              <button
                onClick={() => window.location.href = '/cc-list'}
                className="bg-black hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
              >
                Go to Content Calendar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar;
