import { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Plus, Trash2, Calendar, MapPin, DollarSign, Send, MessageSquare, X, TrendingUp, Image, Upload, FileText, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import { mediaUrl } from '../../services/mediaUrl';
import { fileKind } from '../../utils/fileKind';
import { AuthContext } from '../../context/AuthContext';
import useLivePoll from '../../hooks/useLivePoll';
import StatusAudit from '../../components/StatusAudit';
import CreatorBadge, { confirmDeleteWithCreator } from '../../components/CreatorBadge';
import { PROJECT_FLOW, nextProjectStatus, autoProgress } from '../../utils/statusWorkflow';

export default function Projects() {
  const { user } = useContext(AuthContext);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [mainImgUploading, setMainImgUploading] = useState(false);
  const [fileViewer, setFileViewer] = useState({ open: false, url: '', title: '' });

  const [newProject, setNewProject] = useState({
    title: '', description: '', budget: '', location: '', imageUrl: '', imageMime: '', imageName: ''
  });

  const canManage = user?.role === 'admin' || user?.role === 'moderator';

  const openProjectFile = (e, url, title = 'Document') => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!url) return;
    const full = mediaUrl(url);
    if (!full) {
      alert('File URL is missing');
      return;
    }
    // Always open in-app viewer so the user gets immediate feedback
    setFileViewer({ open: true, url: full, title: title || 'Document' });
  };

  const ProjectFilePreview = ({ url, mime = '', name = '', height = 'h-40', rounded = 'rounded-t-3xl', clickable = false, title = 'Document' }) => {
    const kind = fileKind(url, mime, name);
    const href = mediaUrl(url);
    const canOpen = clickable && !!href;
    const isPdf = kind === 'pdf';
    const isImage = kind === 'image';

    if (isImage) {
      return (
        <div className={`w-full ${height} overflow-hidden ${rounded} relative`}>
          <img
            src={href}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              const fallback = e.target.nextSibling;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
          <button
            type="button"
            onClick={(e) => openProjectFile(e, url, name || title)}
            className={`w-full ${height} bg-gradient-to-br from-red-500/10 to-orange-500/10 items-center justify-center hidden flex-col gap-2 ${canOpen ? 'cursor-pointer' : ''}`}
          >
            <FileText size={36} className="text-red-400" />
            <span className="text-xs text-red-400 font-bold">Click to open file</span>
          </button>
        </div>
      );
    }

    const label = !canOpen
      ? (isPdf ? 'PDF uploaded' : 'Document uploaded')
      : (isPdf ? 'Click to open PDF' : 'Click to open file');
    const colors = isPdf
      ? 'bg-gradient-to-br from-red-500/10 via-red-400/5 to-orange-500/10 hover:from-red-500/20 hover:to-orange-500/10'
      : 'bg-gradient-to-br from-slate-500/10 via-slate-400/5 to-indigo-500/10 hover:from-slate-500/20 hover:to-indigo-500/10';
    const iconColor = isPdf ? 'text-red-400' : 'text-slate-500';
    const textColor = isPdf ? 'text-red-400' : 'text-slate-600 dark:text-slate-300';

    if (!canOpen) {
      return (
        <div className={`w-full ${height} flex flex-col items-center justify-center gap-2 ${rounded} ${colors}`}>
          <FileText size={40} className={iconColor} />
          <span className={`text-xs font-bold ${textColor}`}>{label}</span>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={(e) => openProjectFile(e, url, name || title)}
        className={`w-full ${height} flex flex-col items-center justify-center gap-2 ${rounded} ${colors} cursor-pointer transition-colors border-0`}
        title="Open file"
      >
        <FileText size={40} className={iconColor} />
        <span className={`text-xs font-bold ${textColor}`}>{label}</span>
        {name ? <span className="text-[10px] text-slate-400 max-w-[90%] truncate px-2">{name}</span> : null}
      </button>
    );
  };

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const refreshProjects = async () => {
    try {
      const res = await api.get('/projects');
      const list = res.data.data || [];
      setProjects(list);
      setSelectedProject(prev => {
        if (!prev) return prev;
        return list.find(p => p._id === prev._id) || prev;
      });
    } catch (err) { console.error(err); }
  };

  useLivePoll(refreshProjects, 8000);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newProject.title || !newProject.budget || !newProject.location) return;
    try {
      const payload = {
        title: newProject.title,
        description: newProject.description,
        budget: newProject.budget,
        location: newProject.location,
        imageUrl: newProject.imageUrl || '',
      };
      const res = await api.post('/projects', payload);
      setProjects(prev => [res.data.data, ...prev]);
      setIsModalOpen(false);
      setNewProject({ title: '', description: '', budget: '', location: '', imageUrl: '', imageMime: '', imageName: '' });
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (proj, e) => {
    e.stopPropagation();
    if (!confirmDeleteWithCreator('project', proj.creator)) return;
    try {
      await api.delete(`/projects/${proj._id}`);
      setProjects(prev => prev.filter(p => p._id !== proj._id));
      if (selectedProject?._id === proj._id) { setIsDetailsOpen(false); setSelectedProject(null); }
    } catch (err) { console.error(err); }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedProject) return;
    try {
      const res = await api.post(`/projects/${selectedProject._id}/comments`, { text: commentText });
      setSelectedProject(res.data.data);
      setProjects(prev => prev.map(p => p._id === selectedProject._id ? res.data.data : p));
      setCommentText('');
    } catch (err) { console.error(err); }
  };

  const handleAddPhoto = async (e, targetStatus) => {
    const file = e.target.files[0];
    if (!file || !selectedProject) return;

    const current = selectedProject.status;
    if (targetStatus === 'Completed' && current === 'Planning') {
      alert('Audit order: advance to In Progress before Completed.');
      e.target.value = '';
      return;
    }
    if (targetStatus === 'In Progress' && current === 'Completed') {
      alert('Completed projects cannot go back to In Progress.');
      e.target.value = '';
      return;
    }

    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = uploadRes.data.fileUrl;
      const photoRes = await api.post(`/projects/${selectedProject._id}/photos`, { url, status: targetStatus });
      const updated = photoRes.data.data;
      if (updated) {
        setSelectedProject(updated);
        setProjects(prev => prev.map(p => p._id === updated._id ? updated : p));
      } else {
        await refreshProjects();
      }
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to upload progress image');
    }
    finally { setPhotoUploading(false); e.target.value = ''; }
  };

  const handleMainImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMainImgUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setNewProject(prev => ({
        ...prev,
        imageUrl: res.data.fileUrl,
        imageMime: res.data.mimetype || file.type || '',
        imageName: file.name || res.data.filename || '',
      }));
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to upload file');
    }
    finally { setMainImgUploading(false); e.target.value = ''; }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Completed': return { badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20', bar: 'bg-emerald-500', label: 'Completed ✓' };
      case 'In Progress': return { badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20', bar: 'bg-amber-500', label: 'In Progress ▶' };
      default: return { badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20', bar: 'bg-blue-500', label: 'Planning ○' };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="text-teal-500" size={24} /> Community Projects
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track the progress of development projects in your district.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-xl font-semibold shadow-lg shadow-teal-500/25 transition-all text-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={18} /> New Project
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-br from-slate-50 to-amber-50/30 dark:from-slate-900 dark:to-amber-950/10 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <Briefcase className="text-amber-400" size={28} />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">No development projects registered yet.</p>
        </div>
      ) : (
        <>
        {/* Project Stats Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-blue-200/80 dark:border-blue-800/50 rounded-2xl p-4 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Briefcase size={18} className="text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{projects.filter(p => p.status === 'Planning').length}</p>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Planning</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-800/50 rounded-2xl p-4 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <TrendingUp size={18} className="text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{projects.filter(p => p.status === 'In Progress').length}</p>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">In Progress</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-800/50 rounded-2xl p-4 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Briefcase size={18} className="text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{projects.filter(p => p.status === 'Completed').length}</p>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Completed</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj, idx) => {
            const style = getStatusStyle(proj.status);
            const progressImgs = (proj.progressImages || []).filter(p => p.status === 'In Progress' || !p.status);
            const completeImgs = (proj.progressImages || []).filter(p => p.status === 'Completed');
            return (
              <motion.div
                key={proj._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-lg shadow-slate-200/50 dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col min-h-[380px]"
              >
                {(() => {
                  const hasMain = proj.imageUrl && proj.imageUrl.trim() !== '';
                  const hasProgress = progressImgs.length > 0;
                  const hasComplete = completeImgs.length > 0;
                  const mainImg = hasMain ? proj.imageUrl : (hasProgress ? progressImgs[progressImgs.length - 1].url : (hasComplete ? completeImgs[completeImgs.length - 1].url : null));

                  if (!mainImg) return (
                    <div
                      className="w-full h-40 bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-indigo-500/10 flex items-center justify-center rounded-t-3xl cursor-pointer"
                      onClick={() => { setSelectedProject(proj); setIsDetailsOpen(true); }}
                    >
                      <Briefcase size={36} className="text-teal-500/40" />
                    </div>
                  );

                  return (
                    <ProjectFilePreview
                      url={mainImg}
                      clickable
                      title={proj.title}
                    />
                  );
                })()}

                <div
                  className="p-5 flex-1 flex flex-col justify-between cursor-pointer"
                  onClick={() => { setSelectedProject(proj); setIsDetailsOpen(true); }}
                >
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${style.badge}`}>
                        {style.label}
                      </span>
                      {canManage && (
                        <button
                          onClick={(e) => handleDelete(proj, e)}
                          className="p-1.5 bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl shadow-sm transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base mb-2 group-hover:text-teal-500 transition-colors">{proj.title}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2 mb-4 leading-relaxed">{proj.description}</p>
                  </div>

                  <div>
                    {/* Progress bar */}
                    <div className="space-y-1.5 mb-3">
                      <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                        <span className="flex items-center gap-1"><TrendingUp size={10} /> Progress</span>
                        <span className="text-teal-500 font-bold">{proj.progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-teal-500 to-cyan-400" style={{ width: `${proj.progress}%` }} />
                      </div>
                    </div>

                    {/* Progress & Complete Thumbnails */}
                    {(progressImgs.length > 0 || completeImgs.length > 0) && (
                      <div className="space-y-2 mb-3">
                        {progressImgs.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1 mb-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Progress ({progressImgs.length})
                            </span>
                            <div className="flex gap-1.5 overflow-x-auto">
                              {progressImgs.slice(-4).map((photo, i) => (
                                <img key={i} src={mediaUrl(photo.url)} alt="" className="w-12 h-12 object-cover rounded-lg border border-amber-200 dark:border-amber-800 shrink-0" />
                              ))}
                            </div>
                          </div>
                        )}
                        {completeImgs.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1 mb-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Completed ({completeImgs.length})
                            </span>
                            <div className="flex gap-1.5 overflow-x-auto">
                              {completeImgs.slice(-4).map((photo, i) => (
                                <img key={i} src={mediaUrl(photo.url)} alt="" className="w-12 h-12 object-cover rounded-lg border border-emerald-200 dark:border-emerald-800 shrink-0" />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1"><MapPin size={12} className="text-teal-500" /> {proj.location}</span>
                      <CreatorBadge name={proj.creator?.name} role={proj.creator?.role} label="Created by" />
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-0.5 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                        <DollarSign size={11} className="text-emerald-500" /> {proj.budget?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        </>
      )}

      {/* Details / Comments Modal */}
      <AnimatePresence>
        {isDetailsOpen && selectedProject && (
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
                  <Briefcase className="text-teal-500" size={18} /> Project Details
                </h3>
                <button onClick={() => setIsDetailsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {(() => {
                  const hasMain = selectedProject.imageUrl && selectedProject.imageUrl.trim() !== '';
                  if (!hasMain) return null;
                  const url = selectedProject.imageUrl;
                  return (
                    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative">
                      <ProjectFilePreview
                        url={url}
                        height="h-48"
                        rounded=""
                        clickable
                        title={selectedProject.title}
                      />
                    </div>
                  );
                })()}

                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{selectedProject.title}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs mb-3">
                    <span className={`px-2.5 py-1 rounded-full font-bold ${getStatusStyle(selectedProject.status).badge}`}>
                      {getStatusStyle(selectedProject.status).label}
                    </span>
                    <span className="text-slate-400 flex items-center gap-1"><MapPin size={12} /> {selectedProject.location}</span>
                    <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                      <DollarSign size={11} className="text-emerald-500" /> {selectedProject.budget?.toLocaleString()}
                    </span>
                    <CreatorBadge name={selectedProject.creator?.name} role={selectedProject.creator?.role} label="Created by" />
                  </div>
                  <div className="mb-4 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Audit trail</p>
                    <StatusAudit steps={PROJECT_FLOW} current={selectedProject.status} />
                    {nextProjectStatus(selectedProject.status) && (
                      <p className="mt-2 text-xs text-teal-600 dark:text-teal-400 font-medium">
                        Next: → {nextProjectStatus(selectedProject.status)} (upload that stage to advance)
                      </p>
                    )}
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{selectedProject.description}</p>
                </div>

                {/* Progress */}
                <div className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-slate-950 dark:to-teal-950/20 rounded-2xl border border-teal-100 dark:border-teal-900/30">
                  <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">
                    <span className="flex items-center gap-1"><TrendingUp size={12} className="text-teal-500" /> Project Progress</span>
                    <span className="text-teal-500">{selectedProject.progress}%</span>
                  </div>
                  <div className="w-full h-3 bg-teal-100 dark:bg-teal-900/30 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full transition-all duration-700" style={{ width: `${selectedProject.progress}%` }} />
                  </div>
                </div>

                {/* Progress Photos */}
                {((selectedProject.progressImages && selectedProject.progressImages.length > 0) || canManage) && (
                  <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                    {/* In Progress Files */}
                    <div className="space-y-3">
                      <h4 className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> In Progress ({selectedProject.progressImages?.filter(p => p.status === 'In Progress' || !p.status).length || 0})
                      </h4>
                      {selectedProject.progressImages && selectedProject.progressImages.filter(p => p.status === 'In Progress' || !p.status).length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {selectedProject.progressImages.filter(p => p.status === 'In Progress' || !p.status).map((photo, i) => {
                            const isPdf = photo.url?.toLowerCase().endsWith('.pdf');
                            const fullUrl = mediaUrl(photo.url);
                            return (
                              <a key={i}
                                href={isPdf ? '#' : fullUrl}
                                target={isPdf ? undefined : '_blank'}
                                rel={isPdf ? undefined : 'noreferrer'}
                                onClick={isPdf ? (e) => { e.preventDefault(); setFileViewer({ open: true, url: fullUrl, title: `In Progress - ${i + 1}` }); } : undefined}
                              >
                                {isPdf ? (
                                  <div className="w-full h-32 rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 flex flex-col items-center justify-center gap-2 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/10 transition-all cursor-pointer">
                                    <FileText size={28} className="text-amber-500" />
                                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">Click to read</span>
                                  </div>
                                ) : (
                                  <>
                                    <img
                                      src={fullUrl}
                                      alt={`Progress ${i + 1}`}
                                      className="w-full h-32 object-cover rounded-xl border-2 border-amber-200 dark:border-amber-800 hover:scale-105 transition-transform"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const fallback = e.currentTarget.nextElementSibling;
                                        if (fallback) fallback.classList.remove('hidden');
                                      }}
                                    />
                                    <div className="hidden w-full h-32 rounded-xl border-2 border-amber-200 bg-amber-50 flex flex-col items-center justify-center gap-1">
                                      <Image size={22} className="text-amber-400" />
                                      <span className="text-[10px] text-amber-500 font-medium">Image unavailable</span>
                                    </div>
                                  </>
                                )}
                              </a>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No progress pictures uploaded yet.</p>
                      )}
                    </div>

                    {/* Completed Files */}
                    <div className="space-y-3">
                      <h4 className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" /> Completed ({selectedProject.progressImages?.filter(p => p.status === 'Completed').length || 0})
                      </h4>
                      {selectedProject.progressImages && selectedProject.progressImages.filter(p => p.status === 'Completed').length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {selectedProject.progressImages.filter(p => p.status === 'Completed').map((photo, i) => {
                            const isPdf = photo.url?.toLowerCase().endsWith('.pdf');
                            const fullUrl = mediaUrl(photo.url);
                            return (
                              <a key={i}
                                href={isPdf ? '#' : fullUrl}
                                target={isPdf ? undefined : '_blank'}
                                rel={isPdf ? undefined : 'noreferrer'}
                                onClick={isPdf ? (e) => { e.preventDefault(); setFileViewer({ open: true, url: fullUrl, title: `Completed - ${i + 1}` }); } : undefined}
                              >
                                {isPdf ? (
                                  <div className="w-full h-32 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 flex flex-col items-center justify-center gap-2 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/10 transition-all cursor-pointer">
                                    <FileText size={28} className="text-emerald-500" />
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Click to read</span>
                                  </div>
                                ) : (
                                  <>
                                    <img
                                      src={fullUrl}
                                      alt={`Completed ${i + 1}`}
                                      className="w-full h-32 object-cover rounded-xl border-2 border-emerald-200 dark:border-emerald-800 hover:scale-105 transition-transform"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const fallback = e.currentTarget.nextElementSibling;
                                        if (fallback) fallback.classList.remove('hidden');
                                      }}
                                    />
                                    <div className="hidden w-full h-32 rounded-xl border-2 border-emerald-200 bg-emerald-50 flex flex-col items-center justify-center gap-1">
                                      <Image size={22} className="text-emerald-400" />
                                      <span className="text-[10px] text-emerald-500 font-medium">Image unavailable</span>
                                    </div>
                                  </>
                                )}
                              </a>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No complete pictures uploaded yet.</p>
                      )}
                    </div>

                    {/* Upload Buttons — audit: only current/next stage */}
                    {canManage && selectedProject.status !== 'Completed' && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        {(selectedProject.status === 'Planning' || selectedProject.status === 'In Progress') && (
                          <label className="flex items-center gap-2 cursor-pointer px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors w-fit">
                            {photoUploading ? (
                              <span className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /> Uploading...</span>
                            ) : (
                              <span className="flex items-center gap-1.5"><Image size={14} /> {selectedProject.status === 'Planning' ? 'Advance → In Progress (upload)' : 'Upload Progress Picture'}</span>
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAddPhoto(e, 'In Progress')} disabled={photoUploading} />
                          </label>
                        )}
                        {selectedProject.status === 'In Progress' && (
                          <label className="flex items-center gap-2 cursor-pointer px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors w-fit">
                            {photoUploading ? (
                              <span className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> Uploading...</span>
                            ) : (
                              <span className="flex items-center gap-1.5"><Image size={14} /> Advance → Completed (upload)</span>
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAddPhoto(e, 'Completed')} disabled={photoUploading} />
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Comments Section */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
                    <MessageSquare size={16} className="text-teal-500" /> Community Comments & Feedback ({selectedProject.comments?.length || 0})
                  </h4>

                  <div className="space-y-3">
                    {selectedProject.comments?.map((comment) => (
                      <div key={comment._id} className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 rounded-2xl text-xs">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="font-bold text-slate-700 dark:text-slate-300">{comment.authorName}</span>
                          <span className="text-[10px] text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{comment.text}</p>
                      </div>
                    ))}
                    {(!selectedProject.comments || selectedProject.comments.length === 0) && (
                      <p className="text-xs text-slate-400 italic text-center py-4">No comments have been posted for this project yet.</p>
                    )}
                  </div>

                  {/* Add Comment */}
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      placeholder="Add your feedback about this project..."
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-xs focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 focus:outline-none transition-all"
                    />
                    <button type="submit" className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:opacity-90 shadow-md flex items-center gap-1.5 text-xs font-semibold">
                      <Send size={13} /> Send
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              <div className="h-1 w-full bg-gradient-to-r from-amber-500 to-orange-500" />
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Briefcase size={18} className="text-amber-500" /> Register New Project
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Project Title</label>
                  <input type="text" required value={newProject.title}
                    onChange={e => setNewProject({ ...newProject, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 focus:outline-none transition-all"
                    placeholder="e.g. First Avenue Bridge Construction" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">District / Location</label>
                    <input type="text" required value={newProject.location}
                      onChange={e => setNewProject({ ...newProject, location: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 focus:outline-none transition-all"
                      placeholder="e.g. Banadir" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Budget (USD)</label>
                    <input type="number" required value={newProject.budget}
                      onChange={e => setNewProject({ ...newProject, budget: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 focus:outline-none transition-all"
                      placeholder="e.g. 450000" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Audit Status</label>
                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                      <StatusAudit steps={PROJECT_FLOW} current="Planning" />
                      <p className="mt-2 text-[11px] text-slate-500">Starts at Planning — advances automatically in order.</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Auto Progress</label>
                    <div className="w-full px-4 py-2.5 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 text-sm font-bold">
                      {autoProgress('Planning')}% (auto)
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Project File (Optional)</label>
                  {newProject.imageUrl ? (
                    <div className="relative">
                      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                        <ProjectFilePreview
                          url={newProject.imageUrl}
                          mime={newProject.imageMime}
                          name={newProject.imageName}
                          height="h-32"
                          rounded="rounded-xl"
                          clickable
                          title={newProject.imageName || 'Document'}
                        />
                      </div>
                      <button type="button" onClick={() => setNewProject(p => ({...p, imageUrl: '', imageMime: '', imageName: ''}))}
                        className="absolute top-2 right-2 p-1 bg-rose-500 text-white rounded-full shadow"><X size={12} /></button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors text-xs text-slate-400 font-medium">
                      {mainImgUploading ? (
                        <><div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /> Uploading...</>
                      ) : (
                        <><Upload size={14} /> Click to upload image or PDF</>
                      )}
                      <input type="file" accept="image/*,.pdf,application/pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" className="hidden" onChange={handleMainImageUpload} disabled={mainImgUploading} />
                    </label>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Full Description</label>
                  <textarea rows={3} required value={newProject.description}
                    onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 focus:outline-none resize-none transition-all"
                    placeholder="Write a full description of the project goals..." />
                </div>

                <button type="submit"
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/20 text-sm transition-all hover:scale-[1.01] active:scale-[0.99]">
                  🏗️ Save Project
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* File Viewer Modal */}
      <AnimatePresence>
        {fileViewer.open && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setFileViewer({ open: false, url: '', title: '' })}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col"
              style={{ height: '85vh' }}
            >
              <div className="h-1 w-full bg-gradient-to-r from-red-500 to-orange-500" />
              <div className="flex justify-between items-center px-6 py-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm truncate pr-2">
                  <FileText size={16} className="text-red-500 shrink-0" /> {fileViewer.title}
                </h3>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={fileViewer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    Open in new tab
                  </a>
                  <a
                    href={fileViewer.url}
                    download
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                  >
                    Download
                  </a>
                  <button
                    type="button"
                    onClick={() => setFileViewer({ open: false, url: '', title: '' })}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-slate-100 dark:bg-slate-950 relative">
                <iframe
                  src={fileViewer.url}
                  className="w-full h-full border-0"
                  title="File Viewer"
                />
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] text-slate-500 bg-white/90 dark:bg-slate-900/90 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                  Haddii preview uusan muuqan, isticmaal <b>Open in new tab</b>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
