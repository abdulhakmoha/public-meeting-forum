import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calendar, MapPin, Users, Clock, FileText, CheckCircle, BarChart3, Plus, X, Vote, Trash2, Video, Bell, Edit, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { isMeetingEnded, meetingEndDate, meetingStartDate } from '../../utils/meetingTime';

const D = {
  bg:      'var(--color-bg-elevated)',
  surface: 'var(--color-bg-surface)',
  hover:   'var(--color-bg-hover)',
  border:  'var(--color-border)',
  borderS: 'var(--color-border-strong)',
  text:    'var(--color-text)',
  muted:   'var(--color-text-muted)',
  subtle:  'var(--color-text-subtle)',
  primary: 'var(--color-primary)',
};

const CARD = { background: D.bg, border: `1px solid ${D.border}`, borderRadius: '20px' };

export default function MeetingDetails() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [meeting, setMeeting] = useState(null);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [newPoll, setNewPoll] = useState({ question: '', options: ['', ''] });
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  // Edit / Cancel States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '09:00',
    endTime: '12:00',
    location: '',
    category: 'General',
    meetingType: 'physical',
  });

  const handleCancelMeeting = async () => {
    if (!window.confirm('Are you sure you want to cancel this meeting? This will notify all citizens.')) return;
    try {
      const res = await api.put(`/meetings/${id}`, { status: 'cancelled' });
      setMeeting(res.data.data);
      alert('Meeting has been cancelled and notifications have been sent!');
      fetchMeeting();
    } catch (error) {
      console.error('Error cancelling meeting:', error);
      alert('Failed to cancel meeting: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleUpdateMeeting = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    let submitData = { ...editFormData };
    if (submitData.meetingType === 'zoom') {
      submitData.location = 'Zoom';
    }

    if (!submitData.title || !submitData.description || !submitData.date || !submitData.location) {
      alert('Please fill in all fields');
      return;
    }
    
    // Past date validation
    const datePart = submitData.date.split('T')[0];
    const meetingDateTime = new Date(`${datePart}T${submitData.startTime}:00`);
    const oldMeetingDateTime = new Date(meeting.date);
    if (meeting.startTime) {
      const [h, min] = meeting.startTime.split(':');
      oldMeetingDateTime.setHours(h, min, 0, 0);
    }
    
    // Removed past date restriction per user request


    try {
      const res = await api.put(`/meetings/${id}`, submitData);
      setMeeting(res.data.data);
      setIsEditModalOpen(false);
      alert('Meeting updated successfully!');
      fetchMeeting();
    } catch (error) {
      console.error('Error updating meeting:', error);
      alert('Failed to update meeting: ' + (error.response?.data?.message || error.message));
    }
  };

  useEffect(() => { fetchMeeting(); fetchPolls(); }, [id]);

  const fetchMeeting = async () => {
    try {
      const res = await api.get(`/meetings/${id}`);
      setMeeting(res.data.data);
    } catch (error) {
      console.error('Error fetching meeting details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPolls = async () => {
    try {
      const res = await api.get(`/polls/meeting/${id}`);
      setPolls(res.data.data);
    } catch (error) {
      console.error('Error fetching polls:', error);
    }
  };

  const handleVote = async (pollId, optionId) => {
    setVotingId(pollId);
    try {
      await api.put(`/polls/${pollId}/vote`, { optionId });
      fetchPolls();
    } catch (error) {
      alert(error.response?.data?.message || 'Error voting in poll');
    } finally {
      setVotingId(null);
    }
  };

  const handleCreatePoll = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      const filteredOptions = newPoll.options.filter(opt => opt.trim() !== '');
      if (filteredOptions.length < 2) { alert('Please provide at least 2 options'); return; }
      await api.post('/polls', { meeting: id, question: newPoll.question, options: filteredOptions.map(opt => ({ text: opt })) });
      setIsPollModalOpen(false);
      setNewPoll({ question: '', options: ['', ''] });
      fetchPolls();
      alert('Poll created successfully!');
    } catch (error) {
      alert('Failed to create poll: ' + (error.response?.data?.message || error.message));
    }
  };

  const deletePoll = async (pollId) => {
    if (!window.confirm('Are you sure you want to delete this poll?')) return;
    try { await api.delete(`/polls/${pollId}`); fetchPolls(); } catch { alert('Error deleting poll'); }
  };

  const togglePollStatus = async (pollId) => {
    try { await api.put(`/polls/${pollId}/status`); fetchPolls(); } catch { alert('Error updating poll status'); }
  };

  const [notifying, setNotifying] = useState(false);

  const handleNotify = async () => {
    if (!window.confirm('Send Email + SMS notifications to all registered citizens about this meeting?')) return;
    setNotifying(true);
    try {
      const res = await api.post(`/notifications/meeting/${id}`, null, { timeout: 60000 });
      alert(res.data?.message || 'Email + SMS notifications are being sent to all citizens!');
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to send notifications. Please try again.';
      alert('Notification Error: ' + msg);
    } finally {
      setNotifying(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div style={{ borderTopColor: D.primary }} className="w-8 h-8 border-2 border-transparent rounded-full animate-spin" />
    </div>
  );

  if (!meeting) return (
    <div className="py-12 text-center">
      <h2 style={{ color: D.text }} className="text-2xl font-bold mb-2">Meeting Not Found</h2>
      <Link to="/dashboard/meetings" style={{ color: D.primary }} className="font-medium hover:underline">Return to Meetings</Link>
    </div>
  );

  const date = new Date(meeting.date);
  const isJoined = meeting.attendees.some(a => a._id === user?._id);
  const canManage = user?.role === 'admin' || user?.role === 'moderator';
  const now = new Date(nowTick);
  const endDate = meetingEndDate(meeting);
  const startDate = meetingStartDate(meeting);
  const isStarted = startDate && now >= startDate;
  const isPast = isMeetingEnded(meeting, now);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">

      {/* Back */}
      <Link to="/dashboard/meetings" style={{ color: D.muted }} className="inline-flex items-center text-sm font-bold hover:text-[var(--color-primary)] transition-colors">
        <ArrowLeft size={16} className="mr-2" /> Back to Meetings
      </Link>

      {/* Cancellation Banner */}
      {meeting.status === 'cancelled' && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }} className="p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <div>
            <h4 className="font-bold">This meeting has been cancelled</h4>
            <p className="text-sm opacity-90">All scheduled sessions and voting for this meeting are cancelled.</p>
          </div>
        </div>
      )}

      {/* Past Meeting Banner */}
      {isPast && meeting.status !== 'cancelled' && (
        <div style={{ background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.3)', color: '#94A3B8' }} className="p-4 rounded-xl flex items-center gap-3">
          <Clock className="w-6 h-6 shrink-0" />
          <div>
            <h4 className="font-bold">This meeting has ended</h4>
            <p className="text-sm opacity-90">This session is no longer active. You cannot join or create polls.</p>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div style={{ ...CARD, position: 'relative', overflow: 'hidden', opacity: isPast ? 0.72 : 1 }} className="p-8">
        <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', background: 'rgba(16,185,129,0.06)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />

        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-6">
          <div className="flex-1">
            <div className="flex gap-2 mb-4 flex-wrap">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isPast ? 'bg-slate-500/15 text-slate-400 border border-slate-500/30' :
                meeting.status === 'upcoming' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                meeting.status === 'ongoing'  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                meeting.status === 'cancelled' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
                'bg-slate-500/15 text-slate-400 border border-slate-500/30'
              }`}>{isPast && meeting.status !== 'cancelled' ? 'ENDED' : meeting.status}</span>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                {meeting.category || 'General'}
              </span>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30 uppercase tracking-wider">
                {meeting.meetingType || 'Physical'}
              </span>
            </div>

            <h1 style={{ color: D.text }} className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">{meeting.title}</h1>
            <p style={{ color: D.muted, fontSize: '16px', lineHeight: 1.7 }}>{meeting.description}</p>
          </div>

          {/* Info card */}
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: '16px' }} className="p-6 min-w-[250px] shrink-0">
            <div className="space-y-4">
              {[
                { icon: <Calendar size={18} />, text: date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
                { icon: <Clock size={18} />, text: meeting.startTime && meeting.endTime ? `${meeting.startTime} — ${meeting.endTime}` : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
                // Only show location if it's not a zoom meeting
                meeting.meetingType !== 'zoom' ? { 
                  icon: <MapPin size={18} />, 
                  text: meeting.location 
                } : null,
                { icon: <Users size={18} />, text: `${meeting.attendees.length} Attendees RSVP'd` },
              ].filter(Boolean).map((item, i) => (
                <div key={i} style={{ color: D.muted }} className="flex items-center gap-3 text-sm">
                  <span style={{ color: D.primary }}>{item.icon}</span>
                  <span className="font-semibold">{item.text}</span>
                </div>
              ))}

              <div className="pt-2">
                {meeting.status === 'cancelled' ? (
                  <button disabled style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', borderRadius: '12px', width: '100%', padding: '12px', fontWeight: 600, cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    Cancelled
                  </button>
                ) : isPast ? (
                  <button disabled style={{ background: D.surface, border: `1px solid ${D.border}`, color: D.subtle, borderRadius: '12px', width: '100%', padding: '12px', fontWeight: 600, cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Clock size={18} /> This meeting has ended
                  </button>
                ) : meeting.meetingType === 'zoom' ? (
                  // Only zoom meetings get the video button
                  (isStarted || canManage) ? (
                    <Link to={`/dashboard/meetings/${id}/live`}
                      style={{ background: 'linear-gradient(135deg,#10B981,#059669)', boxShadow: '0 4px 16px rgba(16,185,129,0.35)', borderRadius: '12px', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', textDecoration: 'none' }}>
                      <Video size={18} /> Join Live Meeting
                    </Link>
                  ) : (
                    <button disabled style={{ background: D.surface, border: `1px solid ${D.border}`, color: D.subtle, borderRadius: '12px', width: '100%', padding: '12px', fontWeight: 600, cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <Clock size={18} /> Starts at {meeting.startTime ? new Date(`1970-01-01T${meeting.startTime}:00`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : new Date(meeting.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </button>
                  )
                ) : (
                  // Physical meeting — show location info card
                  <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <MapPin size={18} style={{ color: '#10B981', flexShrink: 0 }} />
                    <div>
                      <p style={{ color: D.subtle, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Physical Meeting Location</p>
                      <p style={{ color: D.text, fontWeight: 700, fontSize: '14px' }}>{meeting.location}</p>
                    </div>
                  </div>
                )}
              </div>



              {user?.role === 'admin' && meeting.status !== 'cancelled' && !isPast && (
                <div className="pt-1">
                  <button onClick={handleNotify}
                    disabled={notifying}
                    style={{ background: notifying ? 'rgba(245,158,11,0.5)' : 'linear-gradient(135deg,#F59E0B,#D97706)', boxShadow: '0 4px 16px rgba(245,158,11,0.3)', borderRadius: '12px', color: '#fff', fontWeight: 700, width: '100%', padding: '12px', border: 'none', cursor: notifying ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'opacity 0.2s' }}
                    onMouseEnter={e => { if (!notifying) e.currentTarget.style.opacity = '0.9'; }} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                    {notifying ? (
                      <><svg style={{animation:'spin 1s linear infinite', width:'18px', height:'18px'}} viewBox="0 0 24 24" fill="none"><circle style={{opacity:0.25}} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path style={{opacity:0.75}} fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Sending...</>
                    ) : (
                      <><Bell size={18} /> Notify All Citizens</>
                    )}
                  </button>
                </div>
              )}

              {canManage && meeting.status !== 'cancelled' && !isPast && (
                <div className="pt-2 space-y-2 border-t border-[var(--color-border)] mt-4">
                  <button 
                    onClick={() => {
                      setEditFormData({
                        title: meeting.title,
                        description: meeting.description,
                        date: meeting.date ? meeting.date.substring(0, 10) : '',
                        startTime: meeting.startTime || '09:00',
                        endTime: meeting.endTime || '12:00',
                        location: meeting.location,
                        category: meeting.category || 'General',
                        meetingType: meeting.meetingType || 'physical',
                      });
                      setIsEditModalOpen(true);
                    }}
                    style={{ background: D.surface, border: `1px solid ${D.border}`, color: D.text, borderRadius: '12px', width: '100%', padding: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                  >
                    <Edit size={16} /> Edit Meeting
                  </button>
                  <button 
                    onClick={handleCancelMeeting}
                    style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)', boxShadow: '0 4px 12px rgba(239,68,68,0.2)', color: '#fff', borderRadius: '12px', width: '100%', padding: '10px', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    Cancel Meeting
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Agenda */}
          <div style={CARD} className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', borderRadius: '10px', padding: '8px' }}><FileText size={20} /></div>
              <h2 style={{ color: D.text }} className="text-2xl font-bold">Meeting Agenda</h2>
            </div>
            <p style={{ color: D.muted, lineHeight: 1.8 }} className="whitespace-pre-wrap">{meeting.description}</p>
          </div>

          {/* Polls */}
          <div style={CARD} className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', borderRadius: '10px', padding: '8px' }}><BarChart3 size={20} /></div>
                <h2 style={{ color: D.text }} className="text-2xl font-bold">Live Polls &amp; Voting</h2>
              </div>
              {canManage && !isPast && (
                <button onClick={() => setIsPollModalOpen(true)}
                  style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', borderRadius: '10px', padding: '8px 16px', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                  <Plus size={16} /> Create Poll
                </button>
              )}
            </div>

            <div className="space-y-6">
              {polls.length === 0 ? (
                <div style={{ border: `2px dashed ${D.border}`, borderRadius: '16px' }} className="text-center py-12">
                  <Vote size={48} style={{ color: D.subtle, margin: '0 auto 12px' }} />
                  <p style={{ color: D.muted }}>No polls have been created for this meeting yet.</p>
                </div>
              ) : (
                polls.map(poll => {
                  const hasVoted = poll.voters.includes(user?._id);
                  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
                  return (
                    <motion.div key={poll._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: '16px', position: 'relative' }}
                      className="p-6 group">

              {canManage && meeting.status !== 'cancelled' && !isPast && (
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => togglePollStatus(poll._id)}
                            style={{ padding: '6px', borderRadius: '8px', background: poll.status === 'open' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: poll.status === 'open' ? '#10B981' : '#F59E0B', border: 'none', cursor: 'pointer' }}
                            title={poll.status === 'open' ? 'Close Poll' : 'Open Poll'}>
                            <CheckCircle size={16} />
                          </button>
                          <button onClick={() => deletePoll(poll._id)}
                            style={{ padding: '6px', borderRadius: '8px', background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: 'none', cursor: 'pointer' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}

                      <div className="flex items-start gap-3 mb-5 pr-16">
                        <div style={{ marginTop: '6px', width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, background: poll.status === 'open' ? '#10B981' : D.subtle }} className={poll.status === 'open' ? 'animate-pulse' : ''} />
                        <h3 style={{ color: D.text, fontWeight: 700, fontSize: '16px' }}>{poll.question}</h3>
                      </div>

                      <div className="space-y-3">
                        {poll.options.map(option => {
                          const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
                          return (
                            <div key={option._id}>
                              {hasVoted || poll.status === 'closed' || meeting.status === 'cancelled' ? (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-sm font-bold px-1">
                                    <span style={{ color: D.muted }}>{option.text}</span>
                                    <span style={{ color: '#10B981' }}>{percentage}%</span>
                                  </div>
                                  <div style={{ background: 'rgba(16,185,129,0.1)', borderRadius: '100px', height: '8px', overflow: 'hidden' }}>
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                                      style={{ height: '100%', background: 'linear-gradient(90deg,#10B981,#8B5CF6)', borderRadius: '100px' }} />
                                  </div>
                                  <span style={{ color: D.subtle, fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px' }} className="px-1 uppercase">{option.votes} votes</span>
                                </div>
                              ) : (
                                <button onClick={() => handleVote(poll._id, option._id)} disabled={votingId === poll._id}
                                  style={{ width: '100%', textAlign: 'left', padding: '12px 16px', borderRadius: '12px', border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}
                                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.background = 'rgba(16,185,129,0.08)'; e.currentTarget.style.color = '#10B981'; }}
                                  onMouseLeave={e => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = D.muted; }}>
                                  {option.text}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ borderTop: `1px solid ${D.border}`, marginTop: '20px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: D.subtle, fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>{totalVotes} total votes</span>
                        <span style={{ color: D.subtle, fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                          Status: <span style={{ color: poll.status === 'open' ? '#10B981' : '#EF4444' }}>{poll.status}</span>
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Organizer */}
          <div style={CARD} className="p-6">
            <h3 style={{ color: D.text }} className="text-lg font-bold mb-4">Organizer</h3>
            <div className="flex items-center gap-4">
              <div style={{ background: 'linear-gradient(135deg,#10B981,#8B5CF6)', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '18px' }}>
                {meeting.organizer?.name?.charAt(0) || 'O'}
              </div>
              <div>
                <p style={{ color: D.text, fontWeight: 700 }} className="flex items-center gap-2">
                  {meeting.organizer?.name || 'Admin User'}
                  <span style={{ fontSize: '10px' }} className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold uppercase tracking-wider capitalize">
                    {meeting.organizer?.role || 'Admin'}
                  </span>
                </p>
                <p style={{ color: D.muted, fontSize: '13px' }}>{meeting.organizer?.email}</p>
              </div>
            </div>
          </div>

          {/* Attendees */}
          <div style={CARD} className="p-6">
            <h3 style={{ color: D.text }} className="text-lg font-bold mb-4 flex justify-between items-center">
              Attendees List
              <span style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '100px', padding: '2px 10px', fontSize: '12px', fontWeight: 700 }}>
                {meeting.attendees.length}
              </span>
            </h3>
            {meeting.attendees.length > 0 ? (
              <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {meeting.attendees.map(attendee => (
                  <li key={attendee._id}
                    style={{ borderRadius: '10px', padding: '10px 12px', transition: 'background 0.15s', cursor: 'default' }}
                    className="flex items-center gap-3"
                    onMouseEnter={e => e.currentTarget.style.background = D.hover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                      {attendee.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p style={{ color: D.text, fontWeight: 600, fontSize: '13px' }}>{attendee.name}</p>
                      <p style={{ color: D.subtle, fontSize: '11px' }}>{attendee.district || 'Citizen'}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: D.muted, fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No attendees have RSVP'd yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Create Poll Modal */}
      <AnimatePresence>
        {isPollModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{ background: D.bg, border: `1px solid ${D.border}`, borderRadius: '20px' }}
              className="p-8 max-w-lg w-full shadow-2xl">

              <div className="flex justify-between items-center mb-6">
                <h2 style={{ color: D.text }} className="text-2xl font-bold">Create New Poll</h2>
                <button onClick={() => setIsPollModalOpen(false)}
                  style={{ padding: '8px', borderRadius: '50%', background: D.surface, border: `1px solid ${D.border}`, color: D.muted, cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label style={{ color: D.muted }} className="block text-sm font-bold mb-2">Question</label>
                  <input type="text" value={newPoll.question} onChange={(e) => setNewPoll({...newPoll, question: e.target.value})}
                    placeholder="What would you like to ask?"
                    style={{ background: D.surface, border: `1px solid ${D.border}`, color: D.text, borderRadius: '12px', width: '100%', padding: '12px 16px', outline: 'none' }}
                    onFocus={e => { e.target.style.borderColor = '#10B981'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.2)'; }}
                    onBlur={e => { e.target.style.borderColor = D.border; e.target.style.boxShadow = 'none'; }} />
                </div>

                <div className="space-y-3">
                  <label style={{ color: D.muted }} className="block text-sm font-bold mb-1">Options</label>
                  {newPoll.options.map((opt, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input type="text" value={opt}
                        onChange={(e) => { const o = [...newPoll.options]; o[idx] = e.target.value; setNewPoll({...newPoll, options: o}); }}
                        placeholder={`Option ${idx + 1}`}
                        style={{ background: D.surface, border: `1px solid ${D.border}`, color: D.text, borderRadius: '10px', flex: 1, padding: '10px 14px', outline: 'none', fontSize: '14px' }}
                        onFocus={e => { e.target.style.borderColor = '#10B981'; }}
                        onBlur={e => { e.target.style.borderColor = D.border; }} />
                      {newPoll.options.length > 2 && (
                        <button type="button" onClick={() => { const o = newPoll.options.filter((_, i) => i !== idx); setNewPoll({...newPoll, options: o}); }}
                          style={{ padding: '10px', borderRadius: '10px', background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: 'none', cursor: 'pointer' }}>
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setNewPoll({...newPoll, options: [...newPoll.options, '']})}
                    style={{ color: D.primary, fontSize: '13px', fontfamily: 'inherit', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <Plus size={15} /> Add Option
                  </button>
                </div>

                <div style={{ paddingTop: '8px' }} className="flex gap-3">
                  <button type="button" onClick={() => setIsPollModalOpen(false)}
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', background: D.surface, border: `1px solid ${D.border}`, color: D.muted, fontWeight: 700, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleCreatePoll}
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}>
                    Create Poll
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Meeting Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{ background: D.bg, border: `1px solid ${D.border}`, borderRadius: '20px' }}
              className="p-8 max-w-lg w-full shadow-2xl overflow-hidden">

              <div className="flex justify-between items-center mb-6">
                <h2 style={{ color: D.text }} className="text-2xl font-bold">Edit Meeting Details</h2>
                <button onClick={() => setIsEditModalOpen(false)}
                  style={{ padding: '8px', borderRadius: '50%', background: D.surface, border: `1px solid ${D.border}`, color: D.muted, cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateMeeting} className="space-y-4 text-left">
                <div>
                  <label style={{ color: D.muted }} className="block text-sm font-bold mb-1">Title</label>
                  <input type="text" value={editFormData.title} onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                    style={{ background: D.surface, border: `1px solid ${D.border}`, color: D.text, borderRadius: '12px', width: '100%', padding: '10px 14px', outline: 'none' }} />
                </div>

                <div>
                  <label style={{ color: D.muted }} className="block text-sm font-bold mb-1">Description</label>
                  <textarea rows="3" value={editFormData.description} onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                    style={{ background: D.surface, border: `1px solid ${D.border}`, color: D.text, borderRadius: '12px', width: '100%', padding: '10px 14px', outline: 'none', resize: 'none' }} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={{ color: D.muted }} className="block text-sm font-bold mb-1">Meeting Type</label>
                    <select value={editFormData.meetingType} onChange={(e) => setEditFormData({...editFormData, meetingType: e.target.value})}
                      style={{ background: D.surface, border: `1px solid ${D.border}`, color: D.text, borderRadius: '12px', width: '100%', padding: '10px 14px', outline: 'none' }}>
                      <option value="physical">Physical</option>
                      <option value="zoom">Zoom</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ color: D.muted }} className="block text-sm font-bold mb-1">Region / Category</label>
                    <select value={editFormData.category} onChange={(e) => setEditFormData({...editFormData, category: e.target.value})}
                      style={{ background: D.surface, border: `1px solid ${D.border}`, color: D.text, borderRadius: '12px', width: '100%', padding: '10px 14px', outline: 'none' }}>
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
                    <label style={{ color: D.muted }} className="block text-sm font-bold mb-1">Date</label>
                    <input type="date" value={editFormData.date} onChange={(e) => setEditFormData({...editFormData, date: e.target.value})}
                      style={{ background: D.surface, border: `1px solid ${D.border}`, color: D.text, borderRadius: '12px', width: '100%', padding: '10px 14px', outline: 'none' }} />
                  </div>
                  {editFormData.meetingType !== 'zoom' && (
                    <div>
                      <label style={{ color: D.muted }} className="block text-sm font-bold mb-1">Location / Address</label>
                      <input type="text" value={editFormData.location} onChange={(e) => setEditFormData({...editFormData, location: e.target.value})}
                        placeholder="e.g., Banadir Community Hall"
                        style={{ background: D.surface, border: `1px solid ${D.border}`, color: D.text, borderRadius: '12px', width: '100%', padding: '10px 14px', outline: 'none' }} />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={{ color: D.muted }} className="block text-sm font-bold mb-1">Start Time</label>
                    <input type="time" value={editFormData.startTime} onChange={(e) => setEditFormData({...editFormData, startTime: e.target.value})}
                      style={{ background: D.surface, border: `1px solid ${D.border}`, color: D.text, borderRadius: '12px', width: '100%', padding: '10px 14px', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ color: D.muted }} className="block text-sm font-bold mb-1">End Time</label>
                    <input type="time" value={editFormData.endTime} onChange={(e) => setEditFormData({...editFormData, endTime: e.target.value})}
                      style={{ background: D.surface, border: `1px solid ${D.border}`, color: D.text, borderRadius: '12px', width: '100%', padding: '10px 14px', outline: 'none' }} />
                  </div>
                </div>

                <div style={{ paddingTop: '12px' }} className="flex gap-3">
                  <button type="button" onClick={() => setIsEditModalOpen(false)}
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', background: D.surface, border: `1px solid ${D.border}`, color: D.muted, fontWeight: 700, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit"
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}>
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
