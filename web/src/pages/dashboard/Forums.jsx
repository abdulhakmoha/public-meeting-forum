import { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Search, Plus, Filter, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import useLivePoll from '../../hooks/useLivePoll';

export default function Forums() {
  const { user } = useContext(AuthContext);
  const [forums, setForums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('approved'); // 'approved' or 'pending'

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'General',
  });
  const [selectedFiles, setSelectedFiles] = useState([]);

  const categories = ['General', 'Infrastructure', 'Education', 'Healthcare', 'Security'];

  useEffect(() => {
    fetchForums();
  }, []);

  const fetchForums = async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const res = await api.get('/forums');
      setForums(res.data.data);
      if (!quiet) setLoading(false);
    } catch (error) {
      console.error('Error fetching forums:', error);
      if (!quiet) setLoading(false);
    }
  };

  useLivePoll(() => fetchForums(true), 8000);

  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  const handleCreateForum = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('title', formData.title);
    data.append('description', formData.description);
    data.append('category', formData.category);
    selectedFiles.forEach(file => {
      data.append('images', file);
    });

    try {
      await api.post('/forums', data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setIsModalOpen(false);
      fetchForums(); // Refresh list
      setFormData({ title: '', description: '', category: 'General' });
      setSelectedFiles([]);
      
      // If citizen, notify them it needs approval
      if (user?.role === 'citizen') {
        alert('Your discussion topic has been submitted and is pending approval by a moderator.');
      }
    } catch (error) {
      console.error('Error creating forum:', error);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.put(`/forums/${id}/approve`);
      fetchForums();
    } catch (error) {
      console.error('Error approving forum:', error);
    }
  };

  const handleReject = async (id) => {
    if (window.confirm('Are you sure you want to reject and delete this discussion?')) {
      try {
        await api.delete(`/forums/${id}`);
        fetchForums();
      } catch (error) {
        console.error('Error rejecting forum:', error);
      }
    }
  };

  const isModerator = user?.role === 'admin' || user?.role === 'moderator';

  // Filter logic
  const filteredForums = forums.filter(forum => {
    // Search & Category
    const matchesSearch = forum.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory ? forum.category === filterCategory : true;
    
    // Status (Approved vs Pending)
    const matchesStatus = activeTab === 'approved' ? forum.isApproved : !forum.isApproved;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const pendingCount = forums.filter(f => !f.isApproved).length;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 style={{ color: 'var(--color-text)' }} className="text-2xl font-bold tracking-tight">Community Forums</h1>
          <p style={{ color: 'var(--color-text-muted)' }} className="mt-1 text-sm">Join the conversation and share your ideas.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm shadow-emerald-500/20 hover:shadow-md hover:-translate-y-0.5"
        >
          <Plus size={18} /> Start Discussion
        </button>
      </div>

      {/* Tabs for Moderators */}
      {isModerator && (
        <div style={{ borderBottom: '1px solid var(--color-border)' }} className="flex">
          <button
            onClick={() => setActiveTab('approved')}
            style={activeTab === 'approved' ? { color: 'var(--color-primary)', borderBottom: '2px solid var(--color-primary)' } : { color: 'var(--color-text-muted)', borderBottom: '2px solid transparent' }}
            className="py-3 px-6 text-sm font-bold transition-colors"
          >
            Active Discussions
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            style={activeTab === 'pending' ? { color: '#EF4444', borderBottom: '2px solid #EF4444' } : { color: 'var(--color-text-muted)', borderBottom: '2px solid transparent' }}
            className="py-3 px-6 text-sm font-bold transition-colors flex items-center gap-2"
          >
            Pending Approval
            {pendingCount > 0 && (
              <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 py-0.5 px-2 rounded-full text-xs">{pendingCount}</span>
            )}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mt-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400" />
          </div>
          <input 
            type="text" 
            placeholder="Search discussions..." 
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
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            className="block w-full pl-10 pr-8 py-2.5 rounded-xl leading-5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all appearance-none"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Forums List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading forums...</div>
      ) : filteredForums.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
          <MessageSquare size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">
            {activeTab === 'pending' ? 'No pending discussions' : 'No discussions found'}
          </h3>
          <p className="text-slate-500 mt-1">
            {activeTab === 'pending' ? 'All citizen submissions have been reviewed.' : 'Try adjusting your search filters or start a new discussion.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredForums.map((forum) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={forum._id} 
              style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '16px', transition: 'border-color 0.2s, box-shadow 0.2s' }}
              className="p-5 flex flex-col sm:flex-row gap-4"
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-border-strong)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px' }} className="px-2.5 py-1 text-xs font-bold uppercase tracking-wide">
                    {forum.category}
                  </span>
                  <span style={{ background: 'var(--color-bg-surface)', color: 'var(--color-text-muted)', borderRadius: '6px' }} className="text-xs font-bold px-2 py-1">
                    Score: {(forum.upvotes?.length || 0) - (forum.downvotes?.length || 0)}
                  </span>
                  <span style={{ color: 'var(--color-text-subtle)' }} className="text-xs flex items-center">
                    <Clock size={14} className="mr-1" /> {new Date(forum.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 style={{ color: 'var(--color-text)' }} className="text-xl font-bold mb-1">
                  <Link to={`/dashboard/forums/${forum._id}`} className="hover:text-[var(--color-primary)] transition-colors">
                    {forum.title}
                  </Link>
                </h3>
                <p style={{ color: 'var(--color-text-muted)' }} className="text-sm line-clamp-2 mb-3 break-words break-all">{forum.description}</p>
                
                <div style={{ color: 'var(--color-text-muted)' }} className="flex items-center text-sm font-medium">
                  <div style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }} className="w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">
                    {forum.author?.name?.charAt(0) || 'U'}
                  </div>
                  {forum.author?.name || 'Unknown User'} 
                  <span className="mx-2" style={{ color: 'var(--color-border-strong)' }}>•</span>
                  <span style={{ color: 'var(--color-text-subtle)' }} className="capitalize">{forum.author?.role || 'Citizen'}</span>
                </div>
              </div>

              {/* Action area */}
              <div 
                className="w-full sm:w-40 flex items-center sm:flex-col justify-center gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-[var(--color-border)] pt-3 sm:pt-0 sm:pl-4"
              >
                {activeTab === 'pending' && isModerator ? (
                  <>
                    <button 
                      onClick={() => handleApprove(forum._id)}
                      className="w-full flex-1 flex items-center justify-center px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-lg font-bold text-sm transition-colors"
                    >
                      <CheckCircle size={16} className="mr-1.5" /> Approve
                    </button>
                    <button 
                      onClick={() => handleReject(forum._id)}
                      className="w-full flex-1 flex items-center justify-center px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-lg font-bold text-sm transition-colors"
                    >
                      <XCircle size={16} className="mr-1.5" /> Reject
                    </button>
                  </>
                ) : (
                  <Link 
                    to={`/dashboard/forums/${forum._id}`}
                    style={{ background: 'var(--color-bg-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                    className="w-full text-center px-4 py-2 rounded-lg font-bold text-sm transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  >
                    View Thread
                  </Link>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Forum Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '20px' }}
            className="shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div style={{ background: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border)' }} className="px-6 py-4 flex justify-between items-center">
              <h2 style={{ color: 'var(--color-text)' }} className="text-xl font-bold">Start a Discussion</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--color-text-muted)' }} className="hover:text-white text-xl">&times;</button>
            </div>
            
            <form onSubmit={handleCreateForum} className="p-6 space-y-4">
              <div>
                <label style={{ color: 'var(--color-text-muted)' }} className="block text-sm font-semibold mb-1">Topic Title</label>
                <input 
                  type="text" required
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  className="w-full px-3 py-2 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                  placeholder="What do you want to discuss?"
                />
              </div>
              <div>
                <label style={{ color: 'var(--color-text-muted)' }} className="block text-sm font-semibold mb-1">Category</label>
                <select 
                  value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                  style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  className="w-full px-3 py-2 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] outline-none appearance-none"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: 'var(--color-text-muted)' }} className="block text-sm font-semibold mb-1">Details</label>
                <textarea 
                  required rows="4"
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  className="w-full px-3 py-2 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] outline-none resize-none"
                  placeholder="Provide more context for the discussion..."
                ></textarea>
              </div>
              
              <div>
                <label style={{ color: 'var(--color-text-muted)' }} className="block text-sm font-semibold mb-1">Attachment (Any File)</label>
                <input 
                  type="file" multiple
                  onChange={handleFileChange}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-indigo-100"
                />
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 text-sm font-bold bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-xl transition-colors shadow-md shadow-emerald-500/20"
                >
                  Post Topic
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
