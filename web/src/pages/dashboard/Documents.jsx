import { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, Plus, Trash2, Calendar, FileText, Download, X, File, UploadCloud, Eye, ExternalLink, Pencil } from 'lucide-react';
import api from '../../services/api';
import { mediaUrl } from '../../services/mediaUrl';
import { AuthContext } from '../../context/AuthContext';
import useLivePoll from '../../hooks/useLivePoll';
import CreatorBadge, { confirmDeleteWithCreator } from '../../components/CreatorBadge';

export default function Documents() {
  const { user } = useContext(AuthContext);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDocument, setNewDocument] = useState({ title: '', description: '', fileUrl: '', fileSize: '1.5 MB', category: 'Policy' });
  const [uploadMethod, setUploadMethod] = useState('upload'); // 'upload' or 'url'
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [viewer, setViewer] = useState({ open: false, url: '', title: '' });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editDoc, setEditDoc] = useState(null);

  const canManage = user?.role === 'admin' || user?.role === 'moderator';

  useEffect(() => { fetchDocuments(); }, []);

  const fetchDocuments = async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const res = await api.get('/documents');
      setDocuments(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { if (!quiet) setLoading(false); }
  };

  useLivePoll(() => fetchDocuments(true), 8000);

  const docUrl = (fileUrl) => {
    if (!fileUrl) return '';
    return fileUrl.startsWith('http') ? fileUrl : mediaUrl(fileUrl);
  };

  const openDocument = (doc) => {
    const url = docUrl(doc.fileUrl);
    if (!url) return;
    setViewer({ open: true, url, title: doc.title || 'Document' });
  };

  const downloadDocument = async (doc) => {
    const url = docUrl(doc.fileUrl);
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      const ext = (doc.fileUrl || '').split('.').pop()?.split('?')[0] || 'pdf';
      a.download = `${(doc.title || 'document').replace(/[^\w.\- ]+/g, '_')}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Only PDF files are allowed.');
        setSelectedFile(null);
        return;
      }
      setError('');
      setSelectedFile(file);
      
      // Auto-fill title if it's currently empty
      if (!newDocument.title) {
        const cleanTitle = file.name.replace(/\.[^/.]+$/, "");
        setNewDocument(prev => ({ ...prev, title: cleanTitle }));
      }
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newDocument.title) return;

    let finalUrl = newDocument.fileUrl;
    let finalSize = newDocument.fileSize;

    try {
      setUploading(true);
      setError('');

      if (uploadMethod === 'upload') {
        if (!selectedFile) {
          setError('Please select a PDF file first.');
          setUploading(false);
          return;
        }
        const formData = new FormData();
        formData.append('file', selectedFile);

        const uploadRes = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        finalUrl = uploadRes.data.fileUrl;
        
        // Format actual file size nicely
        const bytes = uploadRes.data.size;
        if (bytes < 1024 * 1024) {
          finalSize = `${(bytes / 1024).toFixed(1)} KB`;
        } else {
          finalSize = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        }
      } else {
        if (!finalUrl) {
          setError('Please provide a document link URL.');
          setUploading(false);
          return;
        }
      }

      const res = await api.post('/documents', {
        ...newDocument,
        fileUrl: finalUrl,
        fileSize: finalSize
      });

      setDocuments([res.data.data, ...documents]);
      setIsModalOpen(false);
      setNewDocument({ title: '', description: '', fileUrl: '', fileSize: '1.5 MB', category: 'Policy' });
      setSelectedFile(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save document. Please make sure the backend is active.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!confirmDeleteWithCreator('document', doc.uploadedBy)) return;
    try {
      await api.delete(`/documents/${doc._id}`);
      setDocuments(documents.filter(d => d._id !== doc._id));
    } catch (err) { console.error(err); }
  };

  const openEditDoc = (doc) => {
    setEditDoc({
      _id: doc._id,
      title: doc.title || '',
      description: doc.description || '',
      category: doc.category || 'Other',
      uploadedBy: doc.uploadedBy
    });
    setIsEditOpen(true);
  };

  const handleEditDoc = async (e) => {
    e.preventDefault();
    if (!editDoc?._id) return;
    try {
      const res = await api.put(`/documents/${editDoc._id}`, {
        title: editDoc.title,
        description: editDoc.description,
        category: editDoc.category
      });
      setDocuments(documents.map(d => d._id === editDoc._id ? res.data.data : d));
      setIsEditOpen(false);
      setEditDoc(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update document');
    }
  };

  const getCategoryStyle = (cat) => {
    switch (cat) {
      case 'Budget':  return { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', icon: 'bg-emerald-500/15', border: 'border-emerald-500/20', grad: 'from-emerald-500 to-teal-500' };
      case 'Minutes': return { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10',  icon: 'bg-emerald-500/15',  border: 'border-emerald-500/20',  grad: 'from-emerald-500 to-violet-500' };
      case 'Policy':  return { color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-500/10',   icon: 'bg-amber-500/15',   border: 'border-amber-500/20',   grad: 'from-amber-500 to-orange-500' };
      default:        return { color: 'text-slate-600 dark:text-slate-400',    bg: 'bg-slate-500/10',   icon: 'bg-slate-500/15',   border: 'border-slate-500/20',   grad: 'from-slate-400 to-slate-500' };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FolderOpen className="text-teal-500" size={24} /> Document Library
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse and open district budgets, meeting minutes, and municipal policies.
          </p>
        </div>
        {canManage && (
          <button onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-xl font-semibold shadow-lg shadow-teal-500/25 transition-all text-sm hover:scale-[1.02] active:scale-[0.98]">
            <Plus size={18} /> New Document
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/10 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <FolderOpen className="text-emerald-400" size={28} />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">No documents uploaded yet.</p>
          <p className="text-slate-400 dark:text-slate-600 text-xs mt-1">Documents will appear here once they are added.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.map((doc, idx) => {
            const style = getCategoryStyle(doc.category);
              return (
                <motion.div key={doc._id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[24px] shadow-lg shadow-slate-200/50 dark:shadow-none relative group hover:shadow-xl hover:shadow-teal-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden">
                <div className={`h-1 w-full bg-gradient-to-r ${style.grad}`} />
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-3 mb-4">
                      <div className={`w-11 h-11 rounded-xl ${style.icon} flex items-center justify-center flex-shrink-0`}>
                        <FileText className={style.color} size={20} />
                      </div>
                        {canManage && (
                          <div className="flex gap-1">
                            <button onClick={() => openEditDoc(doc)}
                              className="p-1.5 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-teal-500 hover:text-white rounded-xl shadow-sm transition-all opacity-0 group-hover:opacity-100"
                              title="Edit">
                              <Pencil size={15} />
                            </button>
                            <button onClick={() => handleDelete(doc)}
                              className="p-1.5 bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl shadow-sm transition-all opacity-0 group-hover:opacity-100"
                              title="Delete">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                    </div>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${style.bg} ${style.color} border ${style.border}`}>
                      {doc.category}
                    </span>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 leading-snug mt-2 mb-1">{doc.title}</h3>
                    {doc.description && (
                      <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed line-clamp-2">{doc.description}</p>
                    )}
                  </div>
                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/60 flex flex-col gap-2">
                    <CreatorBadge name={doc.uploadedBy?.name} role={doc.uploadedBy?.role} label="Uploaded by" />
                    <div className="flex items-center justify-between gap-2">
                    <div className="text-[10px] text-slate-400 space-y-0.5 min-w-0">
                      <p className="flex items-center gap-1"><Calendar size={10} /> {new Date(doc.createdAt).toLocaleDateString()}</p>
                      <p>Size: <span className="font-medium text-slate-500">{doc.fileSize}</span></p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openDocument(doc)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-950 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400 rounded-xl font-semibold transition-all text-xs hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:scale-[1.03] active:scale-[0.97]"
                      >
                        <Eye size={12} /> Open
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadDocument(doc)}
                        className={`flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r ${style.grad} text-white rounded-xl font-semibold transition-all text-xs shadow-sm hover:opacity-90 hover:scale-[1.03] active:scale-[0.97]`}
                      >
                        <Download size={12} /> Download
                      </button>
                    </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Document Viewer Modal */}
      <AnimatePresence>
        {viewer.open && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col"
              style={{ height: '85vh' }}
            >
              <div className="h-1 w-full bg-gradient-to-r from-teal-500 to-cyan-500" />
              <div className="flex justify-between items-center px-6 py-3 border-b border-slate-100 dark:border-slate-800 gap-3">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm min-w-0">
                  <FileText size={16} className="text-teal-500 shrink-0" />
                  <span className="truncate">{viewer.title}</span>
                </h3>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={viewer.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    <ExternalLink size={12} /> New tab
                  </a>
                  <button
                    type="button"
                    onClick={() => setViewer({ open: false, url: '', title: '' })}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-slate-100 dark:bg-slate-950">
                <iframe
                  src={viewer.url}
                  className="w-full h-full border-0"
                  title={viewer.title || 'Document viewer'}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">
              <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-violet-500" />
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <File size={18} className="text-emerald-500" /> Upload New Document
                </h3>
                <button onClick={() => { setIsModalOpen(false); setSelectedFile(null); setError(''); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-xl text-xs font-semibold">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Document Title</label>
                  <input type="text" required value={newDocument.title}
                    onChange={e => setNewDocument({ ...newDocument, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 focus:outline-none transition-all"
                    placeholder="e.g. Banadir District Budget 2026" />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Category</label>
                    <select value={newDocument.category}
                      onChange={e => setNewDocument({ ...newDocument, category: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 focus:outline-none transition-all">
                      <option value="Policy">Policy</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Upload PDF File</label>
                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:border-teal-500/50 transition-all bg-slate-50/50 dark:bg-slate-950/20 relative">
                      <input type="file" accept=".pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      <UploadCloud className="mx-auto text-slate-400 dark:text-slate-600 mb-2" size={32} />
                      {selectedFile ? (
                        <div>
                          <p className="text-sm font-semibold text-teal-600 dark:text-teal-400">{selectedFile.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Click to upload or drag & drop</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">PDF files only (Max 10MB)</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Description (Optional)</label>
                  <textarea rows={3} value={newDocument.description}
                    onChange={e => setNewDocument({ ...newDocument, description: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 focus:outline-none resize-none transition-all"
                    placeholder="Brief description of this document..." />
                </div>
                <button type="submit" disabled={uploading}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 text-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed">
                  {uploading ? 'Saving & Uploading...' : 'Save Document'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditOpen && editDoc && (
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
                  <Pencil size={18} className="text-teal-500" /> Edit Document
                </h3>
                <button onClick={() => { setIsEditOpen(false); setEditDoc(null); }} className="text-slate-400 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleEditDoc} className="p-6 space-y-4">
                <CreatorBadge name={editDoc.uploadedBy?.name} role={editDoc.uploadedBy?.role} label="Uploaded by" />
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Title</label>
                  <input required value={editDoc.title}
                    onChange={e => setEditDoc({ ...editDoc, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:border-teal-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                  <select value={editDoc.category}
                    onChange={e => setEditDoc({ ...editDoc, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:border-teal-500 focus:outline-none">
                    <option value="Budget">Budget</option>
                    <option value="Minutes">Minutes</option>
                    <option value="Policy">Policy</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                  <textarea rows={3} value={editDoc.description}
                    onChange={e => setEditDoc({ ...editDoc, description: e.target.value })}
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
