import { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, Plus, Trash2, Calendar, X, Pencil } from 'lucide-react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import useLivePoll from '../../hooks/useLivePoll';
import CreatorBadge, { confirmDeleteWithCreator } from '../../components/CreatorBadge';

export default function Announcements() {
  const { user } = useContext(AuthContext);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editAnn, setEditAnn] = useState(null);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', category: 'General', date: '' });

  const canManage = user?.role === 'admin' || user?.role === 'moderator';

  // Local calendar date as YYYY-MM-DD — past days disabled in the picker
  const todayStr = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const res = await api.get('/announcements');
      setAnnouncements(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { if (!quiet) setLoading(false); }
  };

  useLivePoll(() => fetchAnnouncements(true), 8000);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newAnnouncement.title || !newAnnouncement.content) return;
    if (newAnnouncement.date && newAnnouncement.date < todayStr) {
      alert('Past dates are not allowed. Please choose today or a future date.');
      return;
    }
    try {
      const res = await api.post('/announcements', newAnnouncement);
      setAnnouncements([res.data.data, ...announcements]);
      setIsModalOpen(false);
      setNewAnnouncement({ title: '', content: '', category: 'General', date: '' });
      alert(res.data?.message || 'Announcement published. Email + SMS are being sent to users.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to publish announcement');
      console.error(err);
    }
  };

  const handleDelete = async (ann) => {
    if (!confirmDeleteWithCreator('announcement', ann.creator)) return;
    try {
      await api.delete(`/announcements/${ann._id}`);
      setAnnouncements(announcements.filter(a => a._id !== ann._id));
    } catch (err) { console.error(err); }
  };

  const openEditAnn = (ann) => {
    setEditAnn({
      _id: ann._id,
      title: ann.title || '',
      content: ann.content || '',
      category: ann.category || 'General',
      date: ann.date ? String(ann.date).slice(0, 10) : '',
      creator: ann.creator
    });
    setIsEditOpen(true);
  };

  const handleEditAnn = async (e) => {
    e.preventDefault();
    if (!editAnn?._id) return;
    try {
      const res = await api.put(`/announcements/${editAnn._id}`, {
        title: editAnn.title,
        content: editAnn.content,
        category: editAnn.category,
        ...(editAnn.date ? { date: editAnn.date } : {})
      });
      setAnnouncements(announcements.map(a => a._id === editAnn._id ? res.data.data : a));
      setIsEditOpen(false);
      setEditAnn(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update announcement');
    }
  };

  const getCategoryStyle = (cat) => {
    switch (cat) {
      case 'Urgent':  return { badge: 'bg-red-500/12 text-red-500 border border-red-500/25',    bar: 'from-red-500 to-rose-500' };
      case 'Meeting': return { badge: 'bg-emerald-500/12 text-emerald-500 border border-emerald-500/25', bar: 'from-emerald-500 to-violet-500' };
      default:        return { badge: 'bg-teal-500/12 text-teal-500 border border-teal-500/25',  bar: 'from-teal-500 to-cyan-500' };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Megaphone className="text-teal-500" size={24} /> Community Announcements
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            View all official announcements and notices from the district authority.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-xl font-semibold shadow-lg shadow-teal-500/25 transition-all text-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={18} /> New Announcement
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-br from-slate-50 to-teal-50/30 dark:from-slate-900 dark:to-teal-950/10 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-teal-500/10 flex items-center justify-center">
            <Megaphone className="text-teal-400" size={28} />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">No announcements yet.</p>
          <p className="text-slate-400 dark:text-slate-600 text-xs mt-1">New announcements will appear here when posted.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {announcements.map((ann, idx) => {
            const style = getCategoryStyle(ann.category);
            return (
              <motion.div
                key={ann._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[24px] shadow-lg shadow-slate-200/50 dark:shadow-none relative group hover:shadow-xl hover:shadow-teal-500/10 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                >
                <div className={`h-1 w-full bg-gradient-to-r ${style.bar}`} />
                <div className="p-6">
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${style.badge}`}>
                        {ann.category}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar size={12} /> {new Date(ann.date || ann.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                      {canManage && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEditAnn(ann)}
                            className="p-1.5 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-teal-500 hover:text-white rounded-xl shadow-sm transition-all opacity-0 group-hover:opacity-100"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(ann)}
                            className="p-1.5 bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl shadow-sm transition-all opacity-0 group-hover:opacity-100"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">{ann.title}</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{ann.content}</p>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                    <CreatorBadge name={ann.creator?.name} role={ann.creator?.role} label="Posted by" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="h-1 w-full bg-gradient-to-r from-teal-500 to-cyan-500" />
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Megaphone size={18} className="text-teal-500" /> New Announcement
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Title</label>
                  <input type="text" required value={newAnnouncement.title}
                    onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 focus:outline-none transition-all"
                    placeholder="Enter announcement title..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Category</label>
                  <select value={newAnnouncement.category}
                    onChange={e => setNewAnnouncement({ ...newAnnouncement, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 focus:outline-none transition-all">
                    <option value="General">General</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Education">Education</option>
                    <option value="Security">Security</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Date (Optional)</label>
                  <input type="date" value={newAnnouncement.date}
                    min={todayStr}
                    onChange={e => {
                      const v = e.target.value;
                      if (v && v < todayStr) return;
                      setNewAnnouncement({ ...newAnnouncement, date: v });
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Content</label>
                  <textarea rows={4} required value={newAnnouncement.content}
                    onChange={e => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 focus:outline-none resize-none transition-all"
                    placeholder="Write the full announcement content..." />
                </div>
                <button type="submit"
                  className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/20 text-sm transition-all hover:scale-[1.01] active:scale-[0.99]">
                  Publish Announcement
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditOpen && editAnn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="h-1 w-full bg-gradient-to-r from-teal-500 to-cyan-500" />
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Pencil size={18} className="text-teal-500" /> Edit Announcement
                </h3>
                <button onClick={() => { setIsEditOpen(false); setEditAnn(null); }} className="text-slate-400 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleEditAnn} className="p-6 space-y-4">
                <CreatorBadge name={editAnn.creator?.name} role={editAnn.creator?.role} label="Posted by" />
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Title</label>
                  <input required value={editAnn.title}
                    onChange={e => setEditAnn({ ...editAnn, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:border-teal-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                  <select value={editAnn.category}
                    onChange={e => setEditAnn({ ...editAnn, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:border-teal-500 focus:outline-none">
                    <option value="General">General</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Education">Education</option>
                    <option value="Security">Security</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Content</label>
                  <textarea required rows={5} value={editAnn.content}
                    onChange={e => setEditAnn({ ...editAnn, content: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:border-teal-500 focus:outline-none resize-none" />
                </div>
                <button type="submit" className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-xl text-sm">
                  Save Changes
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
