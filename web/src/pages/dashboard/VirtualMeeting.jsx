import { useEffect, useContext, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { isMeetingEnded, meetingEndDate } from '../../utils/meetingTime';
import { ArrowLeft, MessageSquare, Users, Clock, AlertCircle, CheckCircle } from 'lucide-react';

export default function VirtualMeeting() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attendeeCount, setAttendeeCount] = useState(1);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPast, setIsPast] = useState(false);
  const [meetingEnded, setMeetingEnded] = useState(false);
  const [warningShown, setWarningShown] = useState(false);
  const jitsiContainerRef = useRef(null);
  const jitsiApi = useRef(null);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const endWatcherRef = useRef(null);
  const warningShownRef = useRef(false);

  useEffect(() => {
    fetchMeeting();
    return () => {
      if (jitsiApi.current) {
        try { jitsiApi.current.dispose(); } catch (e) {}
        jitsiApi.current = null;
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (endWatcherRef.current) clearInterval(endWatcherRef.current);
    };
  }, [id]);

  // Start end-time watcher once meeting is loaded
  useEffect(() => {
    if (!meeting || isPast) return;

    const getMeetingEndMs = () => meetingEndDate(meeting)?.getTime() || 0;

    const endMs = getMeetingEndMs();

    endWatcherRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = endMs - now;

      // 5-minute warning (fires once in the 5m10s → 4m50s window)
      if (remaining > 0 && remaining <= 5 * 60 * 1000 + 10000 && remaining >= 4 * 60 * 1000 + 50000) {
        if (!warningShownRef.current) {
          warningShownRef.current = true;
          setWarningShown(true);
          alert('⚠️ Warning: This meeting will end in 5 minutes. Please wrap up your discussion.');
        }
      }

      // Meeting has ended
      if (remaining <= 0) {
        clearInterval(endWatcherRef.current);
        if (jitsiApi.current) {
          try { jitsiApi.current.dispose(); } catch (e) {}
          jitsiApi.current = null;
        }
        if (timerRef.current) clearInterval(timerRef.current);
        setMeetingEnded(true);
      }
    }, 5000);

    return () => {
      if (endWatcherRef.current) clearInterval(endWatcherRef.current);
    };
  }, [meeting, isPast]);

  useEffect(() => {
    if (!meeting || jitsiApi.current || isPast || meetingEnded) return;

    const loadJitsiScript = () => {
      return new Promise((resolve) => {
        if (window.JitsiMeetExternalAPI) { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://jitsi.belnet.be/external_api.js';
        script.async = true;
        script.onload = resolve;
        document.body.appendChild(script);
      });
    };

    loadJitsiScript().then(() => {
      if (jitsiContainerRef.current && !jitsiApi.current) {
        const domain = 'jitsi.belnet.be';
        const options = {
          roomName: `PMCFMS-Meeting-${id}`,
          width: '100%',
          height: '100%',
          parentNode: jitsiContainerRef.current,
          userInfo: { displayName: user?.name || 'Citizen' },
          configOverwrite: {
            startWithAudioMuted: true,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            defaultLanguage: 'en',
            enableLobby: false,
            enableWelcomePage: false,
            enableInsecureRoomNameWarning: false,
            p2p: { enabled: true },
            disableNotifications: true,
            toolbarConfig: { alwaysVisibleButtons: [] },
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            TOOLBAR_ALWAYS_VISIBLE: false,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            TOOLBAR_BUTTONS: [
              'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
              'fodeviceselection', 'hangup', 'profile', 'chat',
              'raisehand', 'videoquality', 'filmstrip', 'tileview',
              'videobackgroundblur', 'mute-everyone'
            ],
          }
        };

        jitsiApi.current = new window.JitsiMeetExternalAPI(domain, options);

        const removeModeratorNotification = setInterval(() => {
          document.querySelectorAll('[id*="notification"]').forEach(el => {
            if (el.textContent && el.textContent.toLowerCase().includes('moderator')) {
              el.style.display = 'none';
            }
          });
        }, 500);
        setTimeout(() => clearInterval(removeModeratorNotification), 10000);

        jitsiApi.current.addEventListeners({
          videoConferenceJoined: () => {
            startTimeRef.current = Date.now();
            timerRef.current = setInterval(() => {
              setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }, 1000);
            setAttendeeCount(1);
          },
          participantJoined: () => setAttendeeCount(prev => prev + 1),
          participantLeft: () => setAttendeeCount(prev => Math.max(1, prev - 1)),
          videoConferenceLeft: () => {
            if (timerRef.current) clearInterval(timerRef.current);
            navigate(`/dashboard/meetings/${id}`);
          }
        });
      }
    });
  }, [meeting, id, user, isPast, meetingEnded]);

  const fetchMeeting = async () => {
    try {
      const res = await api.get(`/meetings/${id}`);
      const m = res.data.data;
      setMeeting(m);
      if (isMeetingEnded(m)) setIsPast(true);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching meeting:', error);
      setLoading(false);
    }
  };

  const formatDuration = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  if (loading) return (
    <div style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)' }} className="flex items-center justify-center h-screen font-bold">
      Loading Meeting Room...
    </div>
  );

  if (!meeting) return (
    <div style={{ background: 'var(--color-bg)', color: '#EF4444' }} className="text-center py-20 font-bold">Meeting not found</div>
  );

  // Show ended screen for past or just-ended meetings
  if (isPast || meetingEnded) {
    const endDate = new Date(meeting.date);
    if (meeting.endTime) {
      const [h, min] = meeting.endTime.split(':').map(Number);
      endDate.setHours(h, min, 0, 0);
    }
    const endTimeStr = meeting.endTime
      ? new Date(`1970-01-01T${meeting.endTime}:00`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      : endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endDateStr = endDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
      <div style={{ background: 'var(--color-bg)', minHeight: '60vh' }} className="flex items-center justify-center p-8">
        <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '24px' }} className="p-10 max-w-md w-full text-center shadow-2xl">
          <div style={{ background: 'rgba(16,185,129,0.12)', borderRadius: '50%', width: '88px', height: '88px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle size={40} style={{ color: '#10B981' }} />
          </div>
          <h2 style={{ color: 'var(--color-text)' }} className="text-2xl font-extrabold mb-2">Meeting Session Ended</h2>
          <p style={{ color: 'var(--color-text-muted)' }} className="mb-2 text-sm">
            <strong style={{ color: 'var(--color-text)' }}>{meeting.title}</strong>
          </p>
          <p style={{ color: 'var(--color-text-subtle)', fontSize: '13px' }} className="mb-6">
            This session ended at <strong style={{ color: '#10B981' }}>{endTimeStr}</strong> on {endDateStr}.<br />
            The meeting has been concluded and is no longer active.
          </p>
          <button
            onClick={() => navigate(`/dashboard/meetings/${id}`)}
            style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', borderRadius: '12px', padding: '12px 28px', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}
          >
            <ArrowLeft size={16} /> Back to Meeting Details
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col space-y-4">
      {/* 5-min warning banner */}
      {warningShown && (
        <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '12px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} style={{ color: '#F59E0B', flexShrink: 0 }} />
          <span style={{ color: '#F59E0B', fontWeight: 700, fontSize: '14px' }}>
            ⚠️ This meeting ends in less than 5 minutes. Please wrap up your discussion.
          </span>
        </div>
      )}

      {/* Header */}
      <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '16px' }} className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/dashboard/meetings/${id}`)}
            style={{ color: 'var(--color-text-muted)' }}
            className="p-2 hover:bg-[var(--color-bg-hover)] rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ color: 'var(--color-text)' }} className="text-lg font-bold">{meeting.title}</h1>
            <div style={{ color: 'var(--color-text-subtle)' }} className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 font-medium" style={{ color: 'var(--color-primary)' }}>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--color-primary)' }}></div> Live Session
              </span>
              <span>•</span>
              <span>Room ID: {id.substring(0, 8)}</span>
              {meeting.endTime && (
                <>
                  <span>•</span>
                  <span style={{ color: '#F59E0B', fontWeight: 600 }}>Ends at {meeting.endTime}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#F59E0B' }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold">
            <Users size={13} />
            <span>{attendeeCount} Participant{attendeeCount !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981' }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold">
            <Clock size={13} />
            <span>{elapsedSeconds > 0 ? formatDuration(elapsedSeconds) : 'Starting...'}</span>
          </div>
        </div>
      </div>

      {/* Video Container */}
      <div
        ref={jitsiContainerRef}
        className="flex-1 rounded-3xl overflow-hidden relative"
        style={{ background: '#0f172a', border: '4px solid var(--color-border)', minHeight: '400px' }}
        id="jitsi-container"
      />

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }} className="p-4 rounded-2xl flex items-center gap-3">
          <div style={{ background: 'var(--color-bg-elevated)', borderRadius: '12px' }} className="p-2 text-[#10B981] shadow-sm"><MessageSquare size={20} /></div>
          <div>
            <p style={{ color: '#10B981' }} className="text-xs font-medium uppercase tracking-wider">Chat</p>
            <p style={{ color: 'var(--color-text)' }} className="text-sm font-bold">In-meeting chat enabled</p>
          </div>
        </div>

        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }} className="p-4 rounded-2xl flex items-center gap-3">
          <div style={{ background: 'var(--color-bg-elevated)', borderRadius: '12px' }} className="p-2 text-[#F59E0B] shadow-sm"><Users size={20} /></div>
          <div>
            <p style={{ color: '#F59E0B' }} className="text-xs font-medium uppercase tracking-wider">Participants</p>
            <p style={{ color: 'var(--color-text)' }} className="text-sm font-bold">{attendeeCount} in session</p>
          </div>
        </div>

        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }} className="p-4 rounded-2xl flex items-center gap-3">
          <div style={{ background: 'var(--color-bg-elevated)', borderRadius: '12px' }} className="p-2 text-[#10B981] shadow-sm"><Clock size={20} /></div>
          <div>
            <p style={{ color: '#10B981' }} className="text-xs font-medium uppercase tracking-wider">Duration</p>
            <p style={{ color: 'var(--color-text)' }} className="text-sm font-bold">
              {elapsedSeconds > 0 ? formatDuration(elapsedSeconds) : 'Not started yet'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
