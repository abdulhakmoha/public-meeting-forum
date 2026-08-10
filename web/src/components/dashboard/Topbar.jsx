import { Search, Bell, Menu, LogOut, Check, Languages, Calendar, MessageSquare, User, Sun, Moon } from 'lucide-react';
import { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { mediaUrl } from '../../services/mediaUrl';

export default function Topbar({ setIsMobileOpen }) {
  const { user, logout } = useContext(AuthContext);
  const { lang, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ meetings: [], forums: [], users: [] });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const [isSearching, setIsSearching] = useState(false);

  // Theme: only explicit user choice (default light — same for every visitor)
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (user) fetchNotifications();
    
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setIsNotifOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setIsSearchOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);

    const poll = setInterval(() => {
      if (user) fetchNotifications();
    }, 8000);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearInterval(poll);
    };
  }, [user]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length > 1) {
        performSearch();
      } else {
        setSearchResults({ meetings: [], forums: [], users: [] });
        setIsSearchOpen(false);
      }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const performSearch = async () => {
    setIsSearching(true);
    setIsSearchOpen(true);
    try {
      const res = await api.get(`/quick-search?q=${searchQuery}`);
      setSearchResults(res.data.data);
    } catch (err) {
      console.error('Search Error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header style={{ background: 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text)' }} className="h-16 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 lg:px-8 z-20 sticky top-0">
      <div className="flex items-center flex-1">
        <button 
          onClick={() => setIsMobileOpen(true)}
          className="md:hidden mr-4 p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu size={20} />
        </button>
        
        <div className="relative max-w-md w-full hidden sm:block" ref={searchRef}>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className={`${isSearching ? 'animate-pulse text-emerald-500' : 'text-slate-400'}`} />
          </div>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.length > 1 && setIsSearchOpen(true)}
            placeholder={t('search')} 
            style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            className="block w-full pl-10 pr-3 py-2 rounded-xl leading-5 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all sm:text-sm"
          />

          {/* Search Results Dropdown */}
          {isSearchOpen && (
            <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }} className="absolute left-0 mt-2 w-full rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[80vh] overflow-y-auto animate-in fade-in slide-in-from-top-1">
              <div className="p-2 space-y-4">
                {/* Meetings */}
                {searchResults.meetings.length > 0 && (
                  <div>
                    <h4 className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Calendar size={12} /> Meetings
                    </h4>
                    {searchResults.meetings.map(m => (
                      <Link 
                        key={m._id} to={`/dashboard/meetings/${m._id}`} 
                        onClick={() => setIsSearchOpen(false)}
                        style={{ borderBottom: '1px solid var(--color-border)' }}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--color-bg-hover)] rounded-xl transition-colors group"
                      >
                        <div style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }} className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0">
                          <Calendar size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p style={{ color: 'var(--color-text)' }} className="text-sm font-bold truncate group-hover:text-[var(--color-primary)]">{m.title}</p>
                          <p style={{ color: 'var(--color-text-muted)' }} className="text-[11px]">{new Date(m.date).toLocaleDateString()} • {m.location}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Forums */}
                {searchResults.forums.length > 0 && (
                  <div>
                    <h4 className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <MessageSquare size={12} /> Discussions
                    </h4>
                    {searchResults.forums.map(f => (
                      <Link 
                        key={f._id} to={`/dashboard/forums/${f._id}`}
                        onClick={() => setIsSearchOpen(false)}
                        style={{ borderBottom: '1px solid var(--color-border)' }}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--color-bg-hover)] rounded-xl transition-colors group"
                      >
                        <div style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }} className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0">
                          <MessageSquare size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p style={{ color: 'var(--color-text)' }} className="text-sm font-bold truncate group-hover:text-[#10B981]">{f.title}</p>
                          <p style={{ color: 'var(--color-text-muted)' }} className="text-[11px]">{f.category}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Users */}
                {searchResults.users.length > 0 && (
                  <div>
                    <h4 className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <User size={12} /> People
                    </h4>
                    {searchResults.users.map(u => (
                      <div key={u._id} style={{ borderBottom: '1px solid var(--color-border)' }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--color-bg-hover)] rounded-xl transition-colors group">
                        <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }} className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 uppercase font-bold text-xs">
                          {u.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p style={{ color: 'var(--color-text)' }} className="text-sm font-bold truncate">{u.name}</p>
                          <p style={{ color: 'var(--color-text-muted)' }} className="text-[11px] capitalize">{u.role} • {u.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.meetings.length === 0 && searchResults.forums.length === 0 && searchResults.users.length === 0 && !isSearching && (
                  <div style={{ color: 'var(--color-text-subtle)' }} className="py-8 text-center text-sm">No results found</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button onClick={() => setIsDarkMode(!isDarkMode)} style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }} className="flex items-center justify-center p-2 hover:border-[var(--color-primary)] rounded-xl transition-all">
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button onClick={toggleLanguage} style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }} className="flex items-center gap-1 px-3 py-1.5 hover:border-[var(--color-primary)] rounded-xl transition-all text-xs font-bold">
          <Languages size={16} /> <span className="uppercase">{lang}</span>
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => setIsNotifOpen(!isNotifOpen)} className={`relative p-2 rounded-full transition-colors ${isNotifOpen ? 'text-[var(--color-primary)]' : 'text-slate-400 hover:text-[var(--color-text)]'}`}>
            {unreadCount > 0 && <span style={{ ringColor: 'var(--color-bg-elevated)' }} className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-rose-500 ring-2" />}
            <Bell size={20} />
          </button>
          {isNotifOpen && (
            <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }} className="absolute right-0 mt-2 w-80 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div style={{ background: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border)' }} className="p-4 flex justify-between items-center">
                <h3 style={{ color: 'var(--color-text)' }} className="text-sm font-bold">Notifications</h3>
                {unreadCount > 0 && <button onClick={markAllAsRead} className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-primary)] hover:opacity-80">Mark all read</button>}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? <div style={{ color: 'var(--color-text-subtle)' }} className="p-8 text-center text-sm">No notifications yet</div> : notifications.map(notif => (
                  <Link key={notif._id} to={notif.link || '#'} onClick={() => setIsNotifOpen(false)}
                    style={{ borderBottom: '1px solid var(--color-border)', background: !notif.isRead ? 'rgba(16,185,129,0.06)' : 'transparent' }}
                    className="block p-4 hover:bg-[var(--color-bg-hover)] transition-colors">
                    <div className="flex gap-3">
                      <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${!notif.isRead ? 'bg-[var(--color-primary)]' : 'bg-transparent'}`} />
                      <div>
                        <p style={{ color: 'var(--color-text)' }} className={`text-xs font-bold`}>{notif.title}</p>
                        <p style={{ color: 'var(--color-text-muted)' }} className="text-[11px] mt-0.5 line-clamp-2">{notif.message}</p>
                        <p style={{ color: 'var(--color-text-subtle)' }} className="text-[10px] mt-1 uppercase">{new Date(notif.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div style={{ background: 'var(--color-border)' }} className="h-8 w-px hidden sm:block"></div>
        
        <div className="flex items-center gap-3">
          <Link to="/dashboard/profile" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:shadow-md transition-shadow overflow-hidden">
              {user?.profilePicture ? (
                <img src={mediaUrl(user.profilePicture)} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <div className="hidden sm:block">
              <p style={{ color: 'var(--color-text)' }} className="text-sm font-medium capitalize group-hover:text-[var(--color-primary)] transition-colors">{user?.name || 'User'}</p>
              <p style={{ color: 'var(--color-text-muted)' }} className="text-xs capitalize">{user?.role || 'Citizen'}</p>
            </div>
          </Link>
          <button onClick={handleLogout} className="ml-2 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50/10 rounded-lg transition-colors"><LogOut size={18} /></button>
        </div>
      </div>
    </header>
  );
}
