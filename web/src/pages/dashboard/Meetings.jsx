import { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, MapPin, Search, Plus, Filter, Users, Clock, LayoutGrid, Trash2, Video } from 'lucide-react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './Calendar.css';
import { isMeetingEnded as meetingHasEnded } from '../../utils/meetingTime';

export default function Meetings() {
  const { user } = useContext(AuthContext);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [joiningId, setJoiningId] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '09:00',
    endTime: '12:00',
    location: '',
    category: 'General',
    meetingType: 'physical',
  });

  const districts = ['Banadir', 'Hargeisa', 'Garowe', 'Kismayo', 'Baidoa'];

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const res = await api.get('/meetings');
      setMeetings(res.data.data);
      if (!quiet) setLoading(false);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      if (!quiet) setLoading(false);
    }
  };

  useLivePoll(() => fetchMeetings(true), 8000);

  const handleCreateMeeting = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    let submitData = { ...formData };
    if (submitData.meetingType === 'zoom') submitData.location = 'Zoom';
    if (!submitData.title || !submitData.description || !submitData.date || !submitData.location) {
      alert('Please fill in all fields');
      return;
    }
    if (!submitData.startTime || !submitData.endTime) {
      alert('Please set both start and end times');
      return;
    }
    // Removed startTime >= endTime restriction so meetings can span past midnight
    const datePart = submitData.date.split('T')[0];
    const meetingDateTime = new Date(`${datePart}T${submitData.startTime}:00`);
    if (meetingDateTime < new Date()) {
      alert('Cannot schedule a meeting in the past');
      return;
    }

    try {
      const res = await api.post('/meetings', submitData);
      setIsModalOpen(false);
      fetchMeetings();
      setFormData({ title: '', description: '', date: '', startTime: '09:00', endTime: '12:00', location: '', category: 'General', meetingType: 'physical' });
      alert('Meeting scheduled successfully!');
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to create meeting.';
      alert('Failed to create meeting: ' + errorMsg);
    }
  };

  const handleJoinMeeting = async (id) => {
    setJoiningId(id);
    try {
      await api.post(`/meetings/${id}/join`);
      await fetchMeetings();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to join meeting');
    } finally {
      setJoiningId(null);
    }
  };

  const handleDeleteMeeting = async (id) => {
    if (!window.confirm('Are you sure you want to delete this meeting?')) return;
    try {
      await api.delete(`/meetings/${id}`);
      fetchMeetings();
      alert('Meeting deleted successfully');
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to delete meeting';
      alert('Failed to delete meeting: ' + msg);
    }
  };

  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = meeting.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDistrict = filterDistrict ? meeting.location.includes(filterDistrict) : true;
    return matchesSearch && matchesDistrict;
  });

  const canCreate = user?.role === 'admin' || user?.role === 'moderator';

  const upcomingMeetings = filteredMeetings.filter(m => {
    return !meetingHasEnded(m, new Date(nowTick)) || m.status === 'ongoing';
  });
  const pastMeetings = filteredMeetings.filter(m => {
    return meetingHasEnded(m, new Date(nowTick)) && m.status !== 'ongoing';
  });

  const getMeetingsForDate = (date) => {
    return meetings.filter(m => {
      const mDate = new Date(m.date);
      return mDate.getDate() === date.getDate() &&
             mDate.getMonth() === date.getMonth() &&
             mDate.getFullYear() === date.getFullYear();
    });
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateMeetings = getMeetingsForDate(date);
      if (dateMeetings.length > 0) {
        return (
          <div className="flex justify-center mt-1">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
          </div>
        );
      }
    }
    return null;
  };

  const renderMeetingCard = (meeting, isPast) => {
    const date = new Date(meeting.date);
    const isJoined = meeting.attendees.includes(user?._id);

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        key={meeting._id} 
        style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '16px', transition: 'border-color 0.2s, box-shadow 0.2s' }}
        className="p-6 group"
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-border-strong)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        <div className="flex justify-between items-start mb-4">
          <div 
            style={isPast ? {
              background: 'rgba(148, 163, 184, 0.12)', 
              border: '1px solid rgba(148, 163, 184, 0.25)', 
              color: '#94a3b8', 
              borderRadius: '10px'
            } : {
              background: 'rgba(16,185,129,0.15)', 
              border: '1px solid rgba(16,185,129,0.3)', 
              color: '#10B981', 
              borderRadius: '10px'
            }} 
            className="px-3 py-1.5 text-sm font-bold flex flex-col items-center"
          >
            <span className="text-xs uppercase">{date.toLocaleString('en-US', { month: 'short' })}</span>
            <span className="text-xl">{date.getDate()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span 
              style={isPast ? {
                background: 'rgba(148, 163, 184, 0.1)', 
                color: '#94a3b8', 
                border: '1px solid rgba(148, 163, 184, 0.2)', 
                borderRadius: '8px'
              } : {
                background: 'rgba(16,185,129,0.12)', 
                color: '#10B981', 
                border: '1px solid rgba(16,185,129,0.25)', 
                borderRadius: '8px'
              }} 
              className="px-2 py-0.5 text-xs font-bold uppercase tracking-wide"
            >
              {meeting.category || 'General'}
            </span>
            {isPast ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-slate-500/15 text-slate-400 border border-slate-500/30">ENDED</span>
            ) : (
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                meeting.status === 'upcoming' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                meeting.status === 'ongoing' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                meeting.status === 'cancelled' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
                'bg-slate-500/15 text-slate-400 border border-slate-500/30'
              }`}>
                {meeting.status}
              </span>
            )}
            {user?.role === 'admin' && (
              <button 
                onClick={(e) => { e.preventDefault(); handleDeleteMeeting(meeting._id); }}
                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                title="Delete Meeting"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
        
        <h3 style={{ color: isPast ? 'var(--color-text-subtle)' : 'var(--color-text)' }} className="text-xl font-bold mb-2 group-hover:text-[var(--color-primary)] transition-colors">
          {meeting.title}
        </h3>
        <p style={{ color: 'var(--color-text-muted)' }} className="text-sm mb-4 line-clamp-2">{meeting.description}</p>
        
        <div className="space-y-2 mb-6">
          <div style={{ color: 'var(--color-text-muted)' }} className="flex items-center text-sm">
            <Clock size={16} className="mr-2" style={{ color: 'var(--color-text-subtle)' }} />
            {meeting.startTime && meeting.endTime
              ? `${meeting.startTime} — ${meeting.endTime}`
              : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          </div>
          {meeting.meetingType !== 'zoom' && (
            <div style={{ color: 'var(--color-text-muted)' }} className="flex items-center text-sm">
              <MapPin size={16} className="mr-2" style={{ color: 'var(--color-text-subtle)' }} />
              <span>{meeting.location}</span>
            </div>
          )}
          <div style={{ color: 'var(--color-text-muted)' }} className="flex items-center text-sm">
            <Users size={16} className="mr-2" style={{ color: 'var(--color-text-subtle)' }} />
            {meeting.attendees.length} Attendees
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--color-border-strong)' }} className="flex items-center justify-between pt-4">
          <div style={{ color: 'var(--color-text-muted)' }} className="text-sm font-medium">
            By <span style={{ color: 'var(--color-text)' }}>{meeting.organizer?.name || 'Admin'}</span>
          </div>
          <div className="flex gap-2">
            <Link 
              to={`/dashboard/meetings/${meeting._id}`}
              style={{ background: 'var(--color-bg-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
              className="w-full text-center px-4 py-2 rounded-lg font-bold text-sm transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              View Details
            </Link>
            {!isPast && !isJoined && meeting.status === 'upcoming' ? (
              <button 
                onClick={() => handleJoinMeeting(meeting._id)}
                disabled={joiningId === meeting._id}
                className="px-4 py-2 text-sm font-bold bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg transition-colors shadow-md shadow-emerald-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {joiningId === meeting._id ? (
                  <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Joining...</>
                ) : 'RSVP Now'}
              </button>
            ) : !isPast && isJoined ? (
              <span style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }} className="px-4 py-2 text-sm font-bold rounded-lg">
                Going ✓
              </span>
            ) : isPast ? (
              <span style={{ color: 'var(--color-text-subtle)' }} className="px-4 py-2 text-sm font-medium rounded-lg">Ended</span>
            ) : null}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 style={{ color: 'var(--color-text)' }} className="text-2xl font-bold tracking-tight">Public Meetings</h1>
          <p style={{ color: 'var(--color-text-muted)' }} className="mt-1 text-sm">Discover and participate in community discussions.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px' }} className="p-1 flex gap-1">
            <button 
              onClick={() => setViewMode('list')}
              style={viewMode === 'list' ? { background: 'rgba(16,185,129,0.15)', color: '#10B981' } : { color: 'var(--color-text-muted)' }}
              className="p-1.5 rounded-lg transition-all"
              title="List View"
            >
              <LayoutGrid size={20} />
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              style={viewMode === 'calendar' ? { background: 'rgba(16,185,129,0.15)', color: '#10B981' } : { color: 'var(--color-text-muted)' }}
              className="p-1.5 rounded-lg transition-all"
              title="Calendar View"
            >
              <CalendarIcon size={20} />
            </button>
          </div>
          
          {canCreate && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm shadow-emerald-500/20 hover:shadow-md hover:-translate-y-0.5"
            >
              <Plus size={18} /> Schedule
            </button>
          )}
        </div>
      </div>

      {viewMode === 'list' ? (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-400" />
              </div>
              <input 
                type="text" 
                placeholder="Search meetings by title..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                className="block w-full pl-10 pr-3 py-2.5 rounded-xl leading-5 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              />
            </div>
            <div className="relative sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter size={18} style={{ color: 'var(--color-text-subtle)' }} />
              </div>
              <select 
                value={filterDistrict}
                onChange={(e) => setFilterDistrict(e.target.value)}
                style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                className="block w-full pl-10 pr-8 py-2.5 rounded-xl leading-5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all appearance-none"
              >
                <option value="">All Districts</option>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Meeting List */}
          {loading ? (
            <div style={{ color: 'var(--color-text-muted)' }} className="text-center py-12">Loading meetings...</div>
          ) : filteredMeetings.length === 0 ? (
            <div style={{ background: 'var(--color-bg-elevated)', border: '1px dashed var(--color-border)' }} className="text-center py-12 rounded-2xl">
              <CalendarIcon size={48} className="mx-auto mb-4" style={{ color: 'var(--color-text-subtle)' }} />
              <h3 style={{ color: 'var(--color-text)' }} className="text-lg font-medium">No meetings found</h3>
              <p style={{ color: 'var(--color-text-muted)' }} className="mt-1">Try adjusting your search filters.</p>
            </div>
          ) : (
            <>
              {upcomingMeetings.length > 0 && (
                <div className="mb-8">
                  <h2 style={{ color: 'var(--color-text-muted)' }} className="text-xs font-bold tracking-widest uppercase mb-4">Upcoming Meetings</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {upcomingMeetings.map((meeting) => renderMeetingCard(meeting, false))}
                  </div>
                </div>
              )}
              {pastMeetings.length > 0 && (
                <div>
                  <h2 style={{ color: 'var(--color-text-muted)' }} className="text-xs font-bold tracking-widest uppercase mb-4">Past Meetings</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 opacity-60">
                    {pastMeetings.map((meeting) => renderMeetingCard(meeting, true))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '24px' }} className="p-6 overflow-hidden">
              <Calendar 
                onChange={setSelectedDate} 
                value={selectedDate}
                tileContent={tileContent}
                tileDisabled={({ date }) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return date < today;
                }}
                className="w-full border-none shadow-none"
              />
            </motion.div>
          </div>
          
          <div className="space-y-6">
            <h3 style={{ color: 'var(--color-text)' }} className="font-bold flex items-center gap-2">
              <CalendarIcon size={18} style={{ color: 'var(--color-primary)' }} /> 
              Meetings on {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </h3>
            
            <div className="space-y-4">
              {getMeetingsForDate(selectedDate).length === 0 ? (
                <div style={{ background: 'var(--color-bg-surface)', border: '1px dashed var(--color-border)' }} className="p-8 text-center rounded-2xl">
                  <p style={{ color: 'var(--color-text-subtle)' }} className="text-sm">No meetings scheduled for this day.</p>
                </div>
              ) : (
                getMeetingsForDate(selectedDate).map(m => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={m._id} 
                    style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '16px', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                    className="p-4 group"
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-border-strong)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <Link to={`/dashboard/meetings/${m._id}`} className="block">
                      <h4 style={{ color: 'var(--color-text)' }} className="font-bold group-hover:text-[var(--color-primary)] transition-colors mb-2">{m.title}</h4>
                      <div style={{ color: 'var(--color-text-subtle)' }} className="flex items-center text-xs gap-3">
                        <span className="flex items-center gap-1"><Clock size={12} /> {m.startTime && m.endTime ? `${m.startTime} — ${m.endTime}` : new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {m.meetingType !== 'zoom' && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} /> 
                            <span className="truncate max-w-[120px]">{m.location}</span>
                          </span>
                        )}
                        <span style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '6px' }} className="px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide">
                          {m.category || 'General'}
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))
              )}
            </div>
            
            {canCreate && (
              <button 
                onClick={() => {
                  setFormData({ ...formData, date: selectedDate.toISOString().split('T')[0] + 'T09:00', startTime: '09:00', endTime: '12:00' });
                  setIsModalOpen(true);
                }}
                style={{ background: 'var(--color-bg-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                className="w-full py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              >
                <Plus size={18} /> Schedule for this day
              </button>
            )}
          </div>
        </div>
      )}

      {/* Create Meeting Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '20px' }}
            className="shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div style={{ background: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border)' }} className="px-6 py-4 flex justify-between items-center">
              <h2 style={{ color: 'var(--color-text)' }} className="text-xl font-bold">Schedule New Meeting</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--color-text-muted)' }} className="hover:text-white text-xl">&times;</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label style={{ color: 'var(--color-text-muted)' }} className="block text-sm font-semibold mb-1">Title</label>
                <input 
                  type="text"
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  className="w-full px-3 py-2 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                  placeholder="Meeting Title"
                />
              </div>
              <div>
                <label style={{ color: 'var(--color-text-muted)' }} className="block text-sm font-semibold mb-1">Description</label>
                <textarea 
                  rows="3"
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  className="w-full px-3 py-2 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] outline-none resize-none"
                  placeholder="What is this meeting about?"
                ></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={{ color: 'var(--color-text-muted)' }} className="block text-sm font-semibold mb-1">Meeting Type</label>
                  <select 
                    value={formData.meetingType} onChange={e => setFormData({...formData, meetingType: e.target.value})}
                    style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                    className="w-full px-3 py-2 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] outline-none appearance-none"
                  >
                    <option value="physical">Physical</option>
                    <option value="zoom">Zoom</option>
                  </select>
                </div>
                <div>
                  <label style={{ color: 'var(--color-text-muted)' }} className="block text-sm font-semibold mb-1">Region / Category</label>
                  <select 
                    value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                    style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                    className="w-full px-3 py-2 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] outline-none appearance-none"
                  >
                    <option value="General">General</option>
                    <option value="Banadir">Banadir</option>
                    <option value="Hargeisa">Hargeisa</option>
                    <option value="Garowe">Garowe</option>
                    <option value="Kismayo">Kismayo</option>
                    <option value="Baidoa">Baidoa</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={{ color: 'var(--color-text-muted)' }} className="block text-sm font-semibold mb-1">Date</label>
                  <input 
                    type="date"
                    value={formData.date ? formData.date.split('T')[0] : ''} onChange={e => {
                      const time = formData.startTime || '09:00';
                      setFormData({...formData, date: e.target.value + 'T' + time});
                    }}
                    min={new Date().toISOString().slice(0, 10)}
                    style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                    className="w-full px-3 py-2 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                  />
                </div>
                {formData.meetingType !== 'zoom' && (
                  <div>
                    <label style={{ color: 'var(--color-text-muted)' }} className="block text-sm font-semibold mb-1">Location / Address</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Banadir Community Hall"
                      value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}
                      style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                      className="w-full px-3 py-2 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={{ color: 'var(--color-text-muted)' }} className="block text-sm font-semibold mb-1">Start Time</label>
                  <input 
                    type="time"
                    value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})}
                    style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                    className="w-full px-3 py-2 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                  />
                </div>
                <div>
                  <label style={{ color: 'var(--color-text-muted)' }} className="block text-sm font-semibold mb-1">End Time</label>
                  <input 
                    type="time"
                    value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})}
                    style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                    className="w-full px-3 py-2 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                  />
                </div>
              </div>
              
              <div style={{ borderTop: '1px solid var(--color-border)' }} className="pt-4 flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  style={{ color: 'var(--color-text-muted)' }}
                  className="px-5 py-2.5 text-sm font-bold hover:bg-white/10 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleCreateMeeting}
                  className="px-5 py-2.5 text-sm font-bold bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-xl transition-colors shadow-md shadow-emerald-500/20"
                >
                  Create Meeting
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
