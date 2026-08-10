import { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, AlertTriangle, Plus, Trash2, Calendar, MapPin, CheckCircle, Clock, X, Flag, ShieldCheck, MessageSquare, Send, Upload, Image } from 'lucide-react';
import api from '../../services/api';
import { mediaUrl } from '../../services/mediaUrl';
import { AuthContext } from '../../context/AuthContext';
import useLivePoll from '../../hooks/useLivePoll';

export default function Issues() {
  const { user } = useContext(AuthContext);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [updateData, setUpdateData] = useState({ status: 'Under Review', adminNotes: '' });
  const [imgUploading, setImgUploading] = useState(false);

  const [newIssue, setNewIssue] = useState({
    title: '', description: '', district: 'Banadir', imageUrl: ''
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'moderator';

  useEffect(() => { fetchIssues(); }, []);

  const fetchIssues = async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const res = await api.get('/issues');
      const list = res.data.data || [];
      setIssues(list);
      setSelectedIssue(prev => {
        if (!prev) return prev;
        return list.find(i => i._id === prev._id) || prev;
      });
    } catch (err) { console.error(err); }
    finally { if (!quiet) setLoading(false); }
  };

  useLivePoll(() => fetchIssues(true), 8000);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newIssue.title || !newIssue.description || !newIssue.district) return;
    try {
      const res = await api.post('/issues', newIssue);
      setIssues([res.data.data, ...issues]);
      setIsModalOpen(false);
      setNewIssue({ title: '', description: '', district: 'Banadir', imageUrl: '' });
    } catch (err) { console.error(err); }
  };

  const handleIssueImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImgUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setNewIssue(prev => ({ ...prev, imageUrl: res.data.fileUrl }));
    } catch (err) { console.error(err); }
    finally { setImgUploading(false); e.target.value = ''; }
  };

  const handleStatusUpdate = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedIssue) return;
    try {
      const res = await api.put(`/issues/${selectedIssue._id}/status`, updateData);
      setIssues(issues.map(i => i._id === selectedIssue._id ? res.data.data : i));
      setIsUpdateOpen(false);
      setSelectedIssue(null);
    } catch (err) { console.error(err); }
  };

  const handleRejectIssue = async (issueId) => {
    if (!window.confirm('Are you sure you want to reject this issue?')) return;
    try {
      const res = await api.put(`/issues/${issueId}/status`, { status: 'Rejected', adminNotes: 'This issue was rejected by the moderation team.' });
      setIssues(issues.map(i => i._id === issueId ? res.data.data : i));
      setIsUpdateOpen(false);
      setSelectedIssue(null);
      alert('Issue status changed to Rejected.');
    } catch (err) {
      console.error(err);
      alert('Failed to update status.');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedIssue) return;
    try {
      const res = await api.post(`/issues/${selectedIssue._id}/comments`, { text: commentText });
      setSelectedIssue(res.data.data);
      setIssues(issues.map(i => i._id === selectedIssue._id ? res.data.data : i));
      setCommentText('');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to add comment');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this issue?')) return;
    try {
      await api.delete(`/issues/${id}`);
      setIssues(issues.filter(i => i._id !== id));
    } catch (err) { console.error(err); }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Resolved':      return { badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20', icon: <CheckCircle size={11} className="inline mr-0.5" />, leftBar: 'bg-emerald-500' };
      case 'Under Review':  return { badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20', icon: <Clock size={11} className="inline mr-0.5" />, leftBar: 'bg-amber-500' };
      case 'Rejected':      return { badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20', icon: <X size={11} className="inline mr-0.5" />, leftBar: 'bg-rose-500' };
      default:              return { badge: 'bg-blue-500/10 text-blue-500 border border-blue-500/20', icon: <AlertCircle size={11} className="inline mr-0.5" />, leftBar: 'bg-blue-500' };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <AlertCircle className="text-teal-500" size={24} /> Public Issues & Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Submit your issue or view public reports that are resolved or in progress.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-xl font-semibold shadow-lg shadow-teal-500/25 transition-all text-sm hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={18} /> Submit Issue
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : issues.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-br from-slate-50 to-red-50/30 dark:from-slate-900 dark:to-red-950/10 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="text-red-400" size={28} />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">No issues have been reported yet.</p>
          <p className="text-slate-400 dark:text-slate-600 text-xs mt-1">Be the first! Report an issue you've observed.</p>
        </div>
      ) : (
        <>
        {/* Issue Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-800/50 rounded-2xl p-4 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Clock size={18} className="text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{issues.filter(i => i.status === 'Pending').length}</p>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Pending</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-blue-200/80 dark:border-blue-800/50 rounded-2xl p-4 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <AlertTriangle size={18} className="text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{issues.filter(i => i.status === 'Under Review').length}</p>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Under Review</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-800/50 rounded-2xl p-4 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle size={18} className="text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{issues.filter(i => i.status === 'Resolved').length}</p>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Resolved</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-800/50 rounded-2xl p-4 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <X size={18} className="text-rose-500" />
            </div>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{issues.filter(i => i.status === 'Rejected').length}</p>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Rejected</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {issues.map((issue, idx) => {
            const style = getStatusStyle(issue.status);
            return (
              <motion.div
                key={issue._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => { setSelectedIssue(issue); setIsDetailsOpen(true); }}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[24px] shadow-lg shadow-slate-200/50 dark:shadow-none relative group hover:shadow-xl hover:shadow-teal-500/10 hover:-translate-y-1 transition-all duration-300 flex overflow-hidden cursor-pointer"
              >
                {/* Left status bar */}
                <div className={`w-1 flex-shrink-0 ${style.leftBar} rounded-l-2xl`} />

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-3 mb-3">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${style.badge}`}>
                        {style.icon}{issue.status}
                      </span>
                      <div className="flex gap-1.5">
                        {isAdmin && issue.status !== 'Resolved' && issue.status !== 'Rejected' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedIssue(issue);
                              setUpdateData({ status: issue.status, adminNotes: issue.adminNotes || '' });
                              setIsUpdateOpen(true);
                            }}
                            className="text-[11px] px-3.5 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold rounded-xl shadow-md shadow-teal-500/20 hover:shadow-lg hover:shadow-teal-500/40 hover:scale-105 transition-all"
                          >
                            Manage
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(issue._id);
                            }}
                            className="p-1.5 bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl shadow-sm transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-2">{issue.title}</h3>
                    <p className="text-slate-600 dark:text-slate-300 text-xs mb-3 leading-relaxed line-clamp-3">{issue.description}</p>

                    {issue.adminNotes && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-500/10 rounded-xl text-xs mb-3">
                        <p className="font-bold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                          <ShieldCheck size={12} /> Admin Response:
                        </p>
                        <p className="text-slate-600 dark:text-slate-400">{issue.adminNotes}</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1"><MapPin size={10} className="text-teal-500" /> {issue.district}</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> {new Date(issue.createdAt).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1">
                      <Flag size={9} />
                      <span className="font-semibold text-slate-500">{issue.citizen?.name || 'Citizen'}</span>
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        </>
      )}

      {/* Report Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="h-1 w-full bg-gradient-to-r from-red-500 to-rose-500" />
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <AlertCircle size={18} className="text-red-500" /> Submit New Issue / Feedback
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Issue Title</label>
                  <input type="text" required value={newIssue.title}
                    onChange={e => setNewIssue({ ...newIssue, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 focus:outline-none transition-all"
                    placeholder="e.g. Broken water pipe on First Avenue" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">District / Neighborhood</label>
                  <input type="text" required value={newIssue.district}
                    onChange={e => setNewIssue({ ...newIssue, district: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 focus:outline-none transition-all"
                    placeholder="e.g. Banadir, Hodan, Waberi..." />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Issue Details</label>
                  <textarea rows={4} required value={newIssue.description}
                    onChange={e => setNewIssue({ ...newIssue, description: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 focus:outline-none resize-none transition-all"
                    placeholder="Write the issue details so authorities can address it..." />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Attach Photo (Optional)</label>
                  {newIssue.imageUrl ? (
                    <div className="relative">
                      <img src={mediaUrl(newIssue.imageUrl)} alt="preview" className="w-full h-32 object-cover rounded-xl border border-slate-200 dark:border-slate-700" />
                      <button type="button" onClick={() => setNewIssue(p => ({...p, imageUrl: ''}))}
                        className="absolute top-2 right-2 p-1 bg-rose-500 text-white rounded-full shadow"><X size={12} /></button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-teal-400 hover:bg-teal-50/50 dark:hover:bg-teal-900/10 transition-colors text-xs text-slate-400 font-medium">
                      {imgUploading ? (
                        <><div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /> Uploading...</>
                      ) : (
                        <><Upload size={14} /> Click to upload a photo of the issue</>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleIssueImageUpload} disabled={imgUploading} />
                    </label>
                  )}
                </div>

                <button type="submit"
                  className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/20 text-sm transition-all hover:scale-[1.01] active:scale-[0.99]">
                  📨 Submit Issue
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Status Update Modal */}
      <AnimatePresence>
        {isUpdateOpen && selectedIssue && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500" />
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-500" /> Issue Response & Management
                </h3>
                <button onClick={() => setIsUpdateOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleStatusUpdate} className="p-6 space-y-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Managing Issue:</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{selectedIssue.title}</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">New Status</label>
                  <select value={updateData.status}
                    onChange={e => setUpdateData({ ...updateData, status: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 focus:outline-none transition-all">
                    <option value="Pending">Pending</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Admin Response</label>
                  <textarea rows={4} value={updateData.adminNotes}
                    onChange={e => setUpdateData({ ...updateData, adminNotes: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 focus:outline-none resize-none transition-all"
                    placeholder="Write a report or response about this issue to the citizen..." />
                </div>

                <div className="flex gap-3">
                  <button type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 text-sm transition-all hover:scale-[1.01] active:scale-[0.99]">
                    ✅ Save Response
                  </button>
                  <button type="button"
                    onClick={() => handleRejectIssue(selectedIssue._id)}
                    className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg shadow-red-600/20 text-sm transition-all hover:scale-[1.01] active:scale-[0.99]">
                    ❌ Reject Issue
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Details / Comments Modal */}
      <AnimatePresence>
        {isDetailsOpen && selectedIssue && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]"
            >
              <div className="h-1 w-full bg-gradient-to-r from-teal-500 to-cyan-500" />
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <AlertCircle className="text-teal-500" size={18} /> Issue details
                </h3>
                <button onClick={() => setIsDetailsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{selectedIssue.title}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs mb-4">
                    <span className={`px-2.5 py-1 rounded-full font-bold ${getStatusStyle(selectedIssue.status).badge}`}>
                      {selectedIssue.status}
                    </span>
                    <span className="text-slate-400 flex items-center gap-1"><MapPin size={12} /> {selectedIssue.district}</span>
                    <span className="text-slate-400 flex items-center gap-1"><Clock size={12} /> {new Date(selectedIssue.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{selectedIssue.description}</p>
                  {selectedIssue.imageUrl && (
                    <div className="mt-4">
                      <a href={mediaUrl(selectedIssue.imageUrl)} target="_blank" rel="noreferrer">
                        <img
                          src={mediaUrl(selectedIssue.imageUrl)}
                          alt="Issue photo"
                          className="w-full max-h-60 object-cover rounded-2xl border border-slate-200 dark:border-slate-700 hover:opacity-90 transition-opacity"
                        />
                        <p className="text-xs text-teal-500 mt-1 text-center">Click to view full image</p>
                      </a>
                    </div>
                  )}
                </div>

                {selectedIssue.adminNotes && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-500/10 rounded-2xl">
                    <h4 className="font-bold text-emerald-600 dark:text-emerald-400 text-xs mb-1.5 flex items-center gap-1">
                      <ShieldCheck size={14} /> Official Response:
                    </h4>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">{selectedIssue.adminNotes}</p>
                  </div>
                )}

                {/* Comments Section */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
                    <MessageSquare size={16} className="text-teal-500" /> Discussion ({selectedIssue.comments?.length || 0})
                  </h4>

                  <div className="space-y-3">
                    {selectedIssue.comments?.map((comment) => (
                      <div key={comment._id} className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 rounded-2xl text-xs">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="font-bold text-slate-700 dark:text-slate-300">{comment.authorName}</span>
                          <span className="text-[10px] text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{comment.text}</p>
                      </div>
                    ))}
                    {(!selectedIssue.comments || selectedIssue.comments.length === 0) && (
                      <p className="text-xs text-slate-400 italic text-center py-4">No comments have been posted for this issue yet.</p>
                    )}
                  </div>

                  {/* Add Comment (Disabled if Under Review) */}
                  {selectedIssue.status === 'Under Review' ? (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-500/10 rounded-xl text-center text-xs text-amber-600 dark:text-amber-400 font-medium">
                      ⚠️ Comments are locked while this report is Under Review.
                    </div>
                  ) : selectedIssue.status === 'Rejected' ? (
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-center text-xs text-slate-400 italic">
                      Comments are disabled for rejected issues.
                    </div>
                  ) : (
                    <form onSubmit={handleAddComment} className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        placeholder="Share a details or update about this issue..."
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-xs focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 focus:outline-none transition-all"
                      />
                      <button type="submit" className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:opacity-90 shadow-md flex items-center gap-1.5 text-xs font-semibold">
                        <Send size={13} /> Send
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
