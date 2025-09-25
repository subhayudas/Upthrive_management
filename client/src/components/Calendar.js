import React, { useState, useEffect } from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
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
  Eye,
  X,
  CalendarDays,
  User,
  Tag,
  CheckCircle,
  AlertCircle,
  Pause
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
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateEvents, setDateEvents] = useState([]);

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
      const result = await apiService.getClients();
      
      if (result.success) {
        const clientData = result.data.clients;
      
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
        
        if (result.source === 'supabase') {
          console.log('✅ Calendar clients loaded using Supabase fallback');
        }
      } else {
        console.error('Error fetching clients:', result.error);
        toast.error('Failed to load clients');
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    }
  };

  // Helper function to process events and handle multiple events per day
  const processEvents = (ccList, clientName, clientId) => {
    const eventsWithDates = ccList.filter(item => item.scheduled_date);
    
    // Group events by date
    const eventsByDate = {};
    eventsWithDates.forEach(item => {
      const dateKey = moment(item.scheduled_date).format('YYYY-MM-DD');
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }
      eventsByDate[dateKey].push(item);
    });
    
    // Process each date group
    const processedEvents = [];
    Object.keys(eventsByDate).forEach(dateKey => {
      const dayEvents = eventsByDate[dateKey];
      
      if (dayEvents.length > 1) {
        console.log(`📅 Found ${dayEvents.length} events on ${dateKey}:`, dayEvents.map(e => e.title));
      }
      
      dayEvents.forEach((item, index) => {
        const startDate = new Date(item.scheduled_date);
        
        // For multiple events on same day, distribute them throughout the day
        if (dayEvents.length > 1) {
          // Distribute events across the day (9 AM to 6 PM)
          const startHour = 9; // 9 AM
          const endHour = 18; // 6 PM
          const totalHours = endHour - startHour;
          const hourInterval = totalHours / dayEvents.length;
          const eventHour = startHour + (index * hourInterval);
          
          startDate.setHours(Math.floor(eventHour), (eventHour % 1) * 60, 0, 0);
        }
        
        processedEvents.push({
          id: item.id,
          title: item.title,
          start: startDate,
          end: new Date(moment(startDate).add(1, 'hour')),
          resource: {
            ...item,
            clientName: clientName,
            clientId: clientId
          }
        });
      });
    });
    
    return processedEvents;
  };

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      
      if (showAllClients && (isManager || isEditor)) {
        // Fetch all CC lists for all clients
        const allEvents = [];
        
        for (const client of clients) {
          try {
            const result = await apiService.getCCList(client.client_id);
            const ccList = result.success ? result.data.ccList || [] : [];
            
            const clientEvents = processEvents(ccList, client.name, client.client_id);
            allEvents.push(...clientEvents);
          } catch (error) {
            console.error(`Error fetching CC list for client ${client.name}:`, error);
          }
        }
        
        console.log(`📅 Processed ${allEvents.length} events across all clients`);
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
        
        const result = await apiService.getCCList(clientId);
        const ccList = result.success ? result.data.ccList || [] : [];
        
        const clientName = user.role === 'client' ? user.name : clients.find(c => c.client_id === clientId)?.name;
        const calendarEvents = processEvents(ccList, clientName, clientId);
        
        console.log(`📅 Processed ${calendarEvents.length} events for client: ${clientName}`);
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
      opacity = 0.7;
    } else if (status === 'inactive') {
      opacity = 0.5;
    }
    
    return {
      style: {
        backgroundColor,
        opacity,
        border: 'none',
        borderRadius: '8px',
        color: 'white',
        fontSize: '12px',
        fontWeight: '600',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        minHeight: '60px',
        padding: '4px'
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
    
    // Count how many events are on the same day
    const sameDayEvents = events.filter(e => 
      moment(e.start).format('YYYY-MM-DD') === moment(event.start).format('YYYY-MM-DD')
    );
    
    return (
      <div className="p-2 cursor-pointer hover:bg-white hover:bg-opacity-10 rounded transition-colors">
        <div className="flex items-center gap-1 mb-1">
          <ContentIcon className="h-3 w-3 flex-shrink-0" />
          <PriorityIcon className="h-3 w-3 flex-shrink-0" />
          {sameDayEvents.length > 1 && (
            <span className="text-xs bg-white bg-opacity-30 px-1 rounded text-white font-medium">
              {sameDayEvents.indexOf(event) + 1}/{sameDayEvents.length}
            </span>
          )}
        </div>
        <div className="text-xs font-semibold truncate leading-tight">
          {event.title}
        </div>
        {showAllClients && (
          <div className="text-xs opacity-90 truncate leading-tight">
            {event.resource.clientName}
          </div>
        )}
        <div className="text-xs opacity-90 leading-tight">
          {moment(event.start).format('h:mm A')}
        </div>
      </div>
    );
  };

  const handleSelectEvent = (event) => {
    // You can implement a modal or navigation to show event details
    console.log('Selected event:', event);
    toast.success(`Selected: ${event.title}`);
  };

  const handleSelectSlot = (slotInfo) => {
    const clickedDate = moment(slotInfo.start).format('YYYY-MM-DD');
    const eventsForDate = events.filter(event => 
      moment(event.start).format('YYYY-MM-DD') === clickedDate
    );
    
    setSelectedDate(slotInfo.start);
    setDateEvents(eventsForDate);
    setShowDateModal(true);
  };

  // Date Events Modal Component
  const DateEventsModal = () => {
    if (!showDateModal || !selectedDate) return null;

    const getStatusIcon = (status) => {
      switch (status) {
        case 'completed':
          return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'inactive':
          return <Pause className="h-4 w-4 text-gray-500" />;
        default:
          return <AlertCircle className="h-4 w-4 text-blue-500" />;
      }
    };

    const getPriorityColor = (priority) => {
      switch (priority) {
        case 'high':
          return 'text-red-600 bg-red-50 border-red-200';
        case 'medium':
          return 'text-orange-600 bg-orange-50 border-orange-200';
        case 'low':
          return 'text-green-600 bg-green-50 border-green-200';
        default:
          return 'text-blue-600 bg-blue-50 border-blue-200';
      }
    };

    const getContentTypeIcon = (contentType) => {
      switch (contentType) {
        case 'post':
          return <FileText className="h-4 w-4" />;
        case 'reel':
          return <Zap className="h-4 w-4" />;
        case 'story':
          return <Clock className="h-4 w-4" />;
        case 'carousel':
          return <Star className="h-4 w-4" />;
        default:
          return <FileText className="h-4 w-4" />;
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-black p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-6 w-6" />
                <div>
                  <h2 className="text-xl font-bold">
                    {moment(selectedDate).format('MMMM DD, YYYY')}
                  </h2>
                  <p className="text-black text-sm">
                    {dateEvents.length} {dateEvents.length === 1 ? 'event' : 'events'} scheduled
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDateModal(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {dateEvents.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  No events scheduled
                </h3>
                <p className="text-gray-500">
                  No content is scheduled for this date.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {dateEvents.map((event, index) => (
                  <div
                    key={event.id}
                    className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getContentTypeIcon(event.resource.content_type)}
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">
                            {event.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-600">
                              {moment(event.start).format('h:mm A')}
                            </span>
                            {showAllClients && (
                              <>
                                <span className="text-gray-400">•</span>
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3 text-gray-500" />
                                  <span className="text-sm text-gray-600">
                                    {event.resource.clientName}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(event.resource.status)}
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(event.resource.priority)}`}
                        >
                          {event.resource.priority} priority
                        </span>
                      </div>
                    </div>

                    {event.resource.description && (
                      <p className="text-gray-700 text-sm mb-3">
                        {event.resource.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Tag className="h-3 w-3" />
                        <span className="capitalize">{event.resource.content_type}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <span className="capitalize">Status: {event.resource.status}</span>
                      </div>
                      {event.resource.platform && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <span>Platform: {event.resource.platform}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <button
                onClick={() => setShowDateModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowDateModal(false);
                  window.location.href = '/cc-list';
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Manage Content
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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
      <DateEventsModal />
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
                event: EventComponent,
                showMore: ({ events, date }) => (
                  <div className="text-xs text-center p-2 bg-indigo-100 text-indigo-700 rounded-lg cursor-pointer hover:bg-indigo-200 transition-colors font-medium">
                    +{events.length} more events
                  </div>
                )
              }}
              views={['month', 'week', 'day']}
              step={30}
              timeslots={2}
              showMultiDayTimes
              popup
              popupOffset={{ x: 10, y: 10 }}
              doShowMoreDrillDown={true}
              max={view === 'month' ? 2 : undefined}
              style={{
                height: '100%',
                fontFamily: 'inherit'
              }}
              messages={{
                today: 'Today',
                previous: 'Previous',
                next: 'Next',
                month: 'Month',
                week: 'Week',
                day: 'Day',
                agenda: 'Agenda',
                date: 'Date',
                time: 'Time',
                event: 'Event',
                noEventsInRange: 'No events in this range',
                showMore: total => `+${total} more`
              }}
            />
          </div>
        </div>

        {/* Events Summary */}
        {events.length > 0 && (
          <div className="mt-6 bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/60 p-4 md:p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Events Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-600">{events.length}</div>
                <div className="text-sm text-blue-800">Total Events</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-600">
                  {new Set(events.map(e => moment(e.start).format('YYYY-MM-DD'))).size}
                </div>
                <div className="text-sm text-green-800">Days with Events</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-orange-600">
                  {Object.values(events.reduce((acc, event) => {
                    const date = moment(event.start).format('YYYY-MM-DD');
                    acc[date] = (acc[date] || 0) + 1;
                    return acc;
                  }, {})).filter(count => count > 1).length}
                </div>
                <div className="text-sm text-orange-800">Days with Multiple Events</div>
              </div>
            </div>
          </div>
        )}


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
