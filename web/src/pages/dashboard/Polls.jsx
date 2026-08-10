import { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Vote, CheckCircle, Plus, X, Trash2, ChevronRight, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import useLivePoll from '../../hooks/useLivePoll';

const D = {
  bg:      'var(--color-bg-elevated)',
  surface: 'var(--color-bg-surface)',
  hover:   'var(--color-bg-hover)',
  border:  'var(--color-border)',
  text:    'var(--color-text)',
  muted:   'var(--color-text-muted)',
  subtle:  'var(--color-text-subtle)',
  primary: 'var(--color-primary)',
};

export default function Polls() {
  const { user } = useContext(AuthContext);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState(null);
  const [filter, setFilter] = useState('all'); // all | open | closed
  
  // Create Poll States
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [newPoll, setNewPoll] = useState({ question: '', options: ['', ''] });

  const canManage = user?.role === 'admin' || user?.role === 'moderator';

  useEffect(() => { fetchPolls(); }, []);

  const fetchPolls = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await api.get('/polls');
      setPolls(res.data.data || []);
    } catch (err) {
      console.error('Error fetching polls:', err);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useLivePoll(() => fetchPolls(true), 8000);

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

  const handleDelete = async (pollId) => {
    if (!window.confirm('Delete this poll?')) return;
    try {
      await api.delete(`/polls/${pollId}`);
      fetchPolls();
    } catch { alert('Error deleting poll'); }
  };

  const toggleStatus = async (pollId) => {
    try { await api.put(`/polls/${pollId}/status`); fetchPolls(); }
    catch { alert('Error updating poll'); }
  };

  const handleCreatePoll = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      const filteredOptions = newPoll.options.filter(opt => opt.trim() !== '');
      if (filteredOptions.length < 2) { alert('Please provide at least 2 options'); return; }
      
      await api.post('/polls', {
        question: newPoll.question,
        options: filteredOptions.map(opt => ({ text: opt }))
      });
      
      setIsPollModalOpen(false);
      setNewPoll({ question: '', options: ['', ''] });
      fetchPolls();
      alert('Poll created successfully! 🗳️');
    } catch (error) {
      alert('Failed to create poll: ' + (error.response?.data?.message || error.message));
    }
  };

  const filtered = polls.filter(p => {
    if (filter === 'open') return p.status === 'open';
    if (filter === 'closed') return p.status === 'closed';
    return true;
  });

  const openCount   = polls.filter(p => p.status === 'open').length;
  const closedCount = polls.filter(p => p.status === 'closed').length;
  const totalVotes  = polls.reduce((s, p) => s + p.options.reduce((a, o) => a + o.votes, 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 style={{ color: D.text }} className="text-3xl font-extrabold tracking-tight">
            Live Polls &amp; Voting
          </h1>
          <p style={{ color: D.muted }} className="mt-1 text-sm">
            Participate in active community polls.
          </p>
        </div>
        {canManage && (
          <button onClick={() => setIsPollModalOpen(true)}
            style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', borderRadius: '12px', padding: '10px 20px', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
            <Plus size={16} /> Create Standalone Poll
          </button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Polls', value: polls.length, color: D.primary, bg: 'rgba(16,185,129,0.1)' },
          { label: 'Open / Active', value: openCount, color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Total Votes Cast', value: totalVotes, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
        ].map((s, i) => (
          <div key={i} style={{ background: D.bg, border: `1px solid ${D.border}`, borderRadius: '16px' }} className="p-4 text-center">
            <div style={{ color: s.color, background: s.bg, borderRadius: '10px', display: 'inline-flex', padding: '8px', marginBottom: '8px' }}>
              <BarChart3 size={20} />
            </div>
            <p style={{ color: D.text, fontSize: '24px', fontWeight: 800 }}>{s.value}</p>
            <p style={{ color: D.muted, fontSize: '12px', fontWeight: 600 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: '14px', padding: '6px', display: 'inline-flex', gap: '4px' }}>
        {[['all', 'All Polls'], ['open', '🟢 Open'], ['closed', '🔴 Closed']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            style={{
              padding: '8px 20px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: filter === val ? D.primary : 'transparent',
              color: filter === val ? '#fff' : D.muted,
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Polls List */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div style={{ borderTopColor: D.primary }} className="w-10 h-10 border-4 border-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: D.bg, border: `2px dashed ${D.border}`, borderRadius: '20px' }} className="text-center py-20">
          <Vote size={56} style={{ color: D.subtle, margin: '0 auto 16px' }} />
          <h3 style={{ color: D.text, fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>No polls found</h3>
          <p style={{ color: D.muted }}>Polls are created by admins and moderators.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map(poll => {
            const hasVoted    = poll.voters?.includes(user?._id);
            const totalVotes  = poll.options.reduce((s, o) => s + o.votes, 0);
            const meetingTitle = poll.meeting?.title;

            return (
              <motion.div key={poll._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ background: D.bg, border: `1px solid ${D.border}`, borderRadius: '20px', overflow: 'hidden' }}
                className="group">

                {/* Poll Header */}
                <div style={{ borderBottom: `1px solid ${D.border}` }} className="px-6 pt-5 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Status + Meeting link */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700,
                          background: poll.status === 'open' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                          color: poll.status === 'open' ? '#10B981' : '#EF4444',
                          border: `1px solid ${poll.status === 'open' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }}
                            className={poll.status === 'open' ? 'animate-pulse' : ''} />
                          {poll.status === 'open' ? 'OPEN' : 'CLOSED'}
                        </span>
                        {meetingTitle ? (
                          <Link to={`/dashboard/meetings/${poll.meeting?._id}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: D.primary, textDecoration: 'none' }}>
                            <Calendar size={11} /> {meetingTitle}
                            <ChevronRight size={11} />
                          </Link>
                        ) : (
                          <span style={{ color: D.subtle, fontSize: '11px', fontWeight: 600 }}>Standalone Poll</span>
                        )}
                      </div>
                      <h3 style={{ color: D.text, fontWeight: 700, fontSize: '16px', lineHeight: 1.4 }}>{poll.question}</h3>
                    </div>

                    {/* Admin controls */}
                    {canManage && (
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => toggleStatus(poll._id)}
                          style={{ padding: '7px', borderRadius: '9px', background: poll.status === 'open' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', color: poll.status === 'open' ? '#10B981' : '#F59E0B', border: 'none', cursor: 'pointer' }}
                          title={poll.status === 'open' ? 'Close Poll' : 'Open Poll'}>
                          <CheckCircle size={15} />
                        </button>
                        <button onClick={() => handleDelete(poll._id)}
                          style={{ padding: '7px', borderRadius: '9px', background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: 'none', cursor: 'pointer' }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Options */}
                <div className="px-6 py-4 space-y-3">
                  {poll.options.map(option => {
                    const pct = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
                    const showResults = hasVoted || poll.status === 'closed';
                    return (
                      <div key={option._id}>
                        {showResults ? (
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm font-bold px-1">
                              <span style={{ color: D.muted }}>{option.text}</span>
                              <span style={{ color: D.primary }}>{pct}%</span>
                            </div>
                            <div style={{ background: 'rgba(16,185,129,0.1)', borderRadius: '100px', height: '8px', overflow: 'hidden' }}>
                              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                                style={{ height: '100%', background: 'linear-gradient(90deg,#10B981,#6366F1)', borderRadius: '100px' }} />
                            </div>
                            <span style={{ color: D.subtle, fontSize: '10px', fontWeight: 600 }} className="px-1 uppercase">{option.votes} votes</span>
                          </div>
                        ) : (
                          <button disabled={poll.status === 'closed' || votingId === poll._id}
                            onClick={() => handleVote(poll._id, option._id)}
                            style={{ width: '100%', textAlign: 'left', padding: '11px 16px', borderRadius: '12px', border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, fontWeight: 500, cursor: 'pointer', transition: 'all 0.18s', opacity: poll.status === 'closed' ? 0.5 : 1 }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.background = 'rgba(16,185,129,0.08)'; e.currentTarget.style.color = '#10B981'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = D.muted; }}>
                            {option.text}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div style={{ borderTop: `1px solid ${D.border}`, padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: D.subtle, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {totalVotes} total votes
                  </span>
                  {hasVoted && (
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle size={12} /> You voted
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Poll Modal */}
      <AnimatePresence>
        {isPollModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{ background: D.bg, border: `1px solid ${D.border}`, borderRadius: '20px' }}
              className="p-8 max-w-lg w-full shadow-2xl">

              <div className="flex justify-between items-center mb-6">
                <h2 style={{ color: D.text }} className="text-2xl font-bold">Create Standalone Poll</h2>
                <button onClick={() => setIsPollModalOpen(false)}
                  style={{ padding: '8px', borderRadius: '50%', background: D.surface, border: `1px solid ${D.border}`, color: D.muted, cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreatePoll} className="space-y-5">
                <div>
                  <label style={{ color: D.muted }} className="block text-sm font-bold mb-2">Question</label>
                  <input type="text" value={newPoll.question} onChange={(e) => setNewPoll({...newPoll, question: e.target.value})}
                    placeholder="What would you like to ask?"
                    style={{ background: D.surface, border: `1px solid ${D.border}`, color: D.text, borderRadius: '12px', width: '100%', padding: '12px 16px', outline: 'none' }}
                    required
                  />
                </div>

                <div className="space-y-3">
                  <label style={{ color: D.muted }} className="block text-sm font-bold mb-1">Options</label>
                  {newPoll.options.map((opt, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input type="text" value={opt}
                        onChange={(e) => { const o = [...newPoll.options]; o[idx] = e.target.value; setNewPoll({...newPoll, options: o}); }}
                        placeholder={`Option ${idx + 1}`}
                        style={{ background: D.surface, border: `1px solid ${D.border}`, color: D.text, borderRadius: '10px', flex: 1, padding: '10px 14px', outline: 'none', fontSize: '14px' }}
                        required
                      />
                      {newPoll.options.length > 2 && (
                        <button type="button" onClick={() => { const o = newPoll.options.filter((_, i) => i !== idx); setNewPoll({...newPoll, options: o}); }}
                          style={{ padding: '10px', borderRadius: '10px', background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: 'none', cursor: 'pointer' }}>
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setNewPoll({...newPoll, options: [...newPoll.options, '']})}
                    style={{ color: D.primary, fontSize: '13px', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <Plus size={15} /> Add Option
                  </button>
                </div>

                <div style={{ paddingTop: '8px' }} className="flex gap-3">
                  <button type="button" onClick={() => setIsPollModalOpen(false)}
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', background: D.surface, border: `1px solid ${D.border}`, color: D.muted, fontWeight: 700, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit"
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}>
                    Create Poll
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
