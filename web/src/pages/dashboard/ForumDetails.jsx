import { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageSquare, Clock, Send, ArrowBigUp, ArrowBigDown, FileText, Download, Image as ImageIcon, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { mediaUrl } from '../../services/mediaUrl';
import { AuthContext } from '../../context/AuthContext';
import { confirmDeleteWithCreator } from '../../components/CreatorBadge';

const D = {
  bg:       'var(--color-bg-elevated)',
  surface:  'var(--color-bg-surface)',
  border:   'var(--color-border)',
  text:     'var(--color-text)',
  muted:    'var(--color-text-muted)',
  subtle:   'var(--color-text-subtle)',
  primary:  'var(--color-primary)',
};

export default function ForumDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [forum, setForum] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canModerate = user?.role === 'admin' || user?.role === 'moderator';

  useEffect(() => { fetchForumDetails(); }, [id]);

  const fetchForumDetails = async () => {
    try {
      const res = await api.get(`/forums/${id}`);
      setForum(res.data.data);
      setComments(res.data.comments);
    } catch (error) {
      console.error('Error fetching forum details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (type) => {
    try {
      const res = await api.put(`/forums/${id}/${type}`);
      setForum(res.data.data);
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post(`/forums/${id}/comments`, { text: newComment });
      setNewComment('');
      fetchForumDetails();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!forum) return;
    if (!confirmDeleteWithCreator('forum topic', forum.author)) return;
    try {
      await api.delete(`/forums/${id}`);
      navigate('/dashboard/forums');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete forum');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div style={{ borderTopColor: D.primary }} className="w-8 h-8 border-2 border-transparent rounded-full animate-spin" />
    </div>
  );

  if (!forum) return (
    <div style={{ color: D.text }} className="py-12 text-center">
      <h2 className="text-2xl font-bold mb-2">Discussion Not Found</h2>
      <p style={{ color: D.muted }} className="mb-4">It may have been removed or is pending approval.</p>
      <Link to="/dashboard/forums" style={{ color: D.primary }} className="font-medium hover:underline">Return to Forums</Link>
    </div>
  );

  const score = (forum.upvotes?.length || 0) - (forum.downvotes?.length || 0);
  const hasUpvoted = forum.upvotes?.includes(user?._id);
  const hasDownvoted = forum.downvotes?.includes(user?._id);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">

      {/* Back + delete */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          to="/dashboard/forums"
          style={{ color: D.muted }}
          className="inline-flex items-center text-sm font-bold hover:text-[var(--color-primary)] transition-colors"
        >
          <ArrowLeft size={16} className="mr-2" /> Back to Forums
        </Link>
        {canModerate && (
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white transition-colors"
          >
            <Trash2 size={14} /> Delete topic
          </button>
        )}
      </div>

      {/* Original Post card */}
      <div
        style={{ background: D.bg, border: `1px solid ${D.border}`, borderRadius: '20px', position: 'relative', overflow: 'hidden' }}
        className="p-8"
      >
        {/* Decorative glow */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '120px', background: 'rgba(16,185,129,0.06)', borderBottomLeftRadius: '100%', pointerEvents: 'none' }} />

        {/* Meta row */}
        <div className="flex items-center gap-3 mb-4 relative z-10 flex-wrap">
          <span style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px' }}
            className="px-3 py-1 text-xs font-bold uppercase tracking-wide">
            {forum.category}
          </span>
          <span style={{ color: D.subtle }} className="text-sm flex items-center gap-1">
            <Clock size={14} /> {new Date(forum.createdAt).toLocaleString()}
          </span>
          {!forum.isApproved && (
            <span className="ml-auto px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide"
              style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}>
              Pending Approval
            </span>
          )}
        </div>

        {/* Title */}
        <h1 style={{ color: D.text }} className="text-2xl md:text-3xl font-extrabold mb-4 relative z-10">{forum.title}</h1>

        {/* Author */}
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div style={{ background: 'linear-gradient(135deg,#10B981,#8B5CF6)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '16px', overflow: 'hidden' }}>
            {forum.author?.profilePicture
              ? <img src={mediaUrl(forum.author.profilePicture)} className="w-full h-full object-cover" alt="" />
              : forum.author?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <p style={{ color: D.text }} className="font-bold">{forum.author?.name || 'Unknown User'}</p>
            <p style={{ color: D.primary, fontSize: '12px' }} className="capitalize">{forum.author?.role || 'Citizen'}</p>
          </div>
        </div>

        {/* Body */}
        <p style={{ color: D.muted, lineHeight: 1.8, fontSize: '16px' }} className="whitespace-pre-wrap break-words break-all relative z-10">
          {forum.description}
        </p>

        {/* Attachments — images shown inline, other files as download cards */}
        {forum.images && forum.images.length > 0 && (() => {
          const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
          const images = forum.images.filter(f => imageExts.some(ext => f.toLowerCase().endsWith('.' + ext)));
          const otherFiles = forum.images.filter(f => !imageExts.some(ext => f.toLowerCase().endsWith('.' + ext)));

          return (
            <div className="mt-8 space-y-4 relative z-10">
              {/* Image grid */}
              {images.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {images.map((img, idx) => (
                    <div key={idx} style={{ borderRadius: '12px', overflow: 'hidden', border: `1px solid ${D.border}` }} className="group cursor-pointer">
                      <img
                        src={mediaUrl(img)}
                        alt={`Attached image ${idx + 1}`}
                        className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Non-image file cards */}
              {otherFiles.length > 0 && (
                <div className="space-y-3">
                  <p style={{ color: D.subtle, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Attachments
                  </p>
                  {otherFiles.map((file, idx) => {
                    const url = mediaUrl(file);
                    const fileName = file.split('/').pop() || `File ${idx + 1}`;
                    const isPdf = file.toLowerCase().endsWith('.pdf');
                    const ext = fileName.split('.').pop().toUpperCase();
                    return (
                      <div key={idx} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px' }}>
                        <div style={{ background: isPdf ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.12)', borderRadius: '10px', padding: '10px', flexShrink: 0 }}>
                          <FileText size={22} style={{ color: isPdf ? '#EF4444' : '#6366F1' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: D.text, fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</p>
                          <p style={{ color: D.subtle, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>{ext} File</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                          {isPdf && (
                            <a href={url} target="_blank" rel="noopener noreferrer"
                              style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <ImageIcon size={13} /> View
                            </a>
                          )}
                          <a href={url} download={fileName}
                            style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Download size={13} /> Download
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Voting */}
        <div style={{ borderTop: `1px solid ${D.border}` }} className="mt-8 pt-6 flex items-center gap-6 relative z-10">
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: '16px' }} className="flex items-center p-1 gap-1">
            <button
              onClick={() => handleVote('upvote')}
              style={hasUpvoted
                ? { background: '#10B981', color: '#fff', borderRadius: '10px', padding: '8px', boxShadow: '0 4px 12px rgba(16,185,129,0.35)' }
                : { color: D.subtle, padding: '8px', borderRadius: '10px', transition: 'all 0.2s' }}
              onMouseEnter={e => { if (!hasUpvoted) e.currentTarget.style.color = '#10B981'; }}
              onMouseLeave={e => { if (!hasUpvoted) e.currentTarget.style.color = D.subtle; }}
            >
              <ArrowBigUp size={24} fill={hasUpvoted ? 'currentColor' : 'none'} />
            </button>
            <span style={{ color: score >= 0 ? '#10B981' : '#EF4444', fontWeight: 800, fontSize: '18px', padding: '0 8px' }}>
              {score}
            </span>
            <button
              onClick={() => handleVote('downvote')}
              style={hasDownvoted
                ? { background: '#EF4444', color: '#fff', borderRadius: '10px', padding: '8px', boxShadow: '0 4px 12px rgba(239,68,68,0.35)' }
                : { color: D.subtle, padding: '8px', borderRadius: '10px', transition: 'all 0.2s' }}
              onMouseEnter={e => { if (!hasDownvoted) e.currentTarget.style.color = '#EF4444'; }}
              onMouseLeave={e => { if (!hasDownvoted) e.currentTarget.style.color = D.subtle; }}
            >
              <ArrowBigDown size={24} fill={hasDownvoted ? 'currentColor' : 'none'} />
            </button>
          </div>
          <p style={{ color: D.subtle, fontSize: '12px', fontWeight: 500 }}>Community feedback helps prioritize important topics.</p>
        </div>
      </div>

      {/* Comments Section */}
      <div className="space-y-4">
        <h3 style={{ color: D.text }} className="text-xl font-bold flex items-center gap-2">
          <MessageSquare size={20} color={D.primary} /> Responses ({comments.length})
        </h3>

        {comments.length === 0 ? (
          <div style={{ background: D.bg, border: `1px dashed ${D.border}`, borderRadius: '16px' }} className="text-center py-10">
            <p style={{ color: D.muted }}>No responses yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment, index) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                key={comment._id}
                style={{ background: D.bg, border: `1px solid ${D.border}`, borderRadius: '14px' }}
                className="p-5 flex gap-4"
              >
                <div style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
                  {comment.author?.profilePicture
                    ? <img src={mediaUrl(comment.author.profilePicture)} className="w-full h-full object-cover" alt="" />
                    : comment.author?.name?.charAt(0) || 'U'}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-baseline mb-2">
                    <span style={{ color: D.text, fontWeight: 700 }}>{comment.author?.name || 'Unknown'}</span>
                    <span style={{ color: D.subtle, fontSize: '11px' }}>{new Date(comment.createdAt).toLocaleString()}</span>
                  </div>
                  <p style={{ color: D.muted, lineHeight: 1.7 }} className="whitespace-pre-wrap">{comment.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Comment Form */}
      {forum.isApproved ? (
        <form
          onSubmit={handlePostComment}
          style={{ background: D.bg, border: `1px solid ${D.border}`, borderRadius: '16px', position: 'sticky', bottom: '24px', zIndex: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}
          className="p-4 flex items-end gap-3"
        >
          <div className="flex-1">
            <textarea
              id="comment"
              rows="2"
              required
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              style={{ background: D.surface, border: `1px solid ${D.border}`, color: D.text, borderRadius: '12px', width: '100%', padding: '12px 16px', outline: 'none', resize: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
              placeholder="Write your response here..."
              onFocus={e => { e.target.style.borderColor = '#10B981'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.2)'; }}
              onBlur={e => { e.target.style.borderColor = D.border; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !newComment.trim()}
            style={{
              height: '52px', padding: '0 24px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: '#fff', borderRadius: '12px', fontWeight: 700,
              border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(16,185,129,0.35)',
              display: 'flex', alignItems: 'center', gap: '8px',
              opacity: (isSubmitting || !newComment.trim()) ? 0.5 : 1,
              transition: 'opacity 0.2s, transform 0.2s',
            }}
            onMouseEnter={e => { if (!isSubmitting) e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Send size={17} /> {isSubmitting ? 'Posting...' : 'Post'}
          </button>
        </form>
      ) : (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B', borderRadius: '12px' }} className="mt-6 p-4 text-center text-sm font-medium">
          Comments are disabled while this topic is pending approval.
        </div>
      )}
    </div>
  );
}
