import { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar, MessageSquare, TrendingUp, Clock, PieChart as PieIcon, MapPin } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import useLivePoll from '../../hooks/useLivePoll';

const C = {
  bg: '#FFFFFF',
  bgSurface: '#F8FAFC',
  border: 'rgba(0,0,0,0.07)',
  borderStrong: 'rgba(16,185,129,0.4)',
  text: '#0F172A',
  muted: '#475569',
  subtle: '#94A3B8',
  primary: '#10B981',
};

const CARD_STYLE = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: '20px',
  boxShadow: '0 4px 24px rgba(0,0,0,0.03)',
};

const CHART_COLORS = ['#10B981', '#6366F1', '#F59E0B', '#10B981', '#EF4444'];



const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '10px 14px' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>{label}</p>
        <p style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '16px' }}>{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export default function DashboardOverview() {
  const [statsData, setStatsData] = useState({
    totalUsers: 0,
    activeMeetings: 0,
    openForums: 0,
    totalComments: 0,
    recentActivity: [],
    analytics: { usersByDistrict: [], forumsByCategory: [], monthlyMeetings: [] }
  });
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';

  const fetchStats = async (quiet = false) => {
    try {
      const res = await api.get('/dashboard/stats');
      setStatsData(res.data.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useLivePoll(() => fetchStats(true), 10000);

  const stats = [
    {
      title: 'Total Users', value: statsData.totalUsers,
      icon: <Users size={20} />,
      iconColor: '#10B981',
      iconBg: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.15))',
      cardBg: 'linear-gradient(135deg, #F0FDFA 0%, #CFFAFE 100%)',
      border: 'rgba(16,185,129,0.2)',
    },
    {
      title: 'Active Meetings', value: statsData.activeMeetings,
      icon: <Calendar size={20} />,
      iconColor: '#6366F1',
      iconBg: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))',
      cardBg: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
      border: 'rgba(99,102,241,0.2)',
    },
    {
      title: 'Open Forums', value: statsData.openForums,
      icon: <MessageSquare size={20} />,
      iconColor: '#F59E0B',
      iconBg: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.15))',
      cardBg: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
      border: 'rgba(245,158,11,0.2)',
    },
    {
      title: 'Total Comments', value: statsData.totalComments,
      icon: <TrendingUp size={20} />,
      iconColor: '#10B981',
      iconBg: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(52,211,153,0.15))',
      cardBg: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
      border: 'rgba(16,185,129,0.2)',
    },
  ];

  const visibleStats = isAdmin ? stats : stats.filter(s => s.title !== 'Total Users');


  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };
  const itemVariants = {
    hidden: { y: 16, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4 } }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div style={{ borderTopColor: 'var(--color-primary)' }} className="w-8 h-8 border-2 border-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 pb-12">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h1 style={{ color: C.text }} className="text-2xl font-bold tracking-tight">
            Dashboard Overview
          </h1>
          <p style={{ color: C.muted }} className="mt-1 text-sm">Welcome back! Here's what's happening today.</p>
        </div>
        <button
          style={{
            background: 'linear-gradient(135deg, #10B981, #059669)',
            boxShadow: '0 4px 16px rgba(16,185,129,0.35)',
            borderRadius: '12px',
            color: '#fff',
            fontWeight: 600,
            padding: '10px 20px',
            fontSize: '14px',
            border: 'none',
            cursor: 'pointer',
            transition: 'opacity 0.2s, transform 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          onClick={() => setShowReport(true)}
        >
          Generate Report
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {visibleStats.map((stat, index) => (
          <motion.div
            key={index}
            variants={itemVariants}
            style={{
              background: stat.cardBg,
              border: `1px solid ${stat.border}`,
              borderRadius: '20px',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            className="p-5 relative overflow-hidden cursor-default"
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 12px 32px rgba(0,0,0,0.08)`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ background: stat.iconBg, borderRadius: '12px', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.iconColor }}>
                {stat.icon}
              </div>
            </div>

            <h3 style={{ color: '#0F172A', fontSize: '30px', fontWeight: 800, lineHeight: 1, marginBottom: '4px' }}>{stat.value}</h3>
            <p style={{ color: '#64748B', fontSize: '13px', fontWeight: 500 }}>{stat.title}</p>
          </motion.div>
        ))}
      </div>


      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-2">
        {/* Area Chart */}
        <motion.div variants={itemVariants} style={CARD_STYLE} className="p-6 lg:col-span-2 flex flex-col" style={{ ...CARD_STYLE, minHeight: '380px' }}>
          <div className="flex justify-between items-center mb-6">
            <h3 style={{ color: C.text, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="#10B981" /> Meeting Growth
            </h3>
            <span style={{ color: C.subtle, fontSize: '11px', fontWeight: 700, letterSpacing: '1px' }}>SCHEDULED PER MONTH</span>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={statsData?.analytics?.monthlyMeetings || []}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(16,185,129,0.08)" />
                <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fill: '#4A6380', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4A6380', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="count" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#areaGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Pie Chart */}
        <motion.div variants={itemVariants} style={{ ...CARD_STYLE, padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ color: C.text, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <PieIcon size={18} color="#EF4444" /> Forums by Category
          </h3>
          <div className="flex-1" style={{ minHeight: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statsData?.analytics?.forumsByCategory || []}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={80}
                  paddingAngle={4}
                  dataKey="count" nameKey="_id"
                >
                  {(statsData?.analytics?.forumsByCategory || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', color: 'var(--color-text)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px', color: 'var(--color-text-muted)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar Chart */}
        <motion.div variants={itemVariants} style={{ ...CARD_STYLE, padding: '24px', display: 'flex', flexDirection: 'column', minHeight: '320px' }}>
          <h3 style={{ color: C.text, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <MapPin size={18} color="#10B981" /> Users by District
          </h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsData?.analytics?.usersByDistrict || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(16,185,129,0.07)" />
                <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fill: '#4A6380', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4A6380', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16,185,129,0.05)' }} />
                <Bar dataKey="count" fill="#10B981" radius={[6, 6, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={itemVariants} style={{ ...CARD_STYLE, padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ color: C.text, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <Clock size={18} color="#F59E0B" /> Recent Activity
          </h3>
          <div className="flex-1 space-y-4">
            {statsData.recentActivity.length === 0 ? (
              <p style={{ color: C.muted, fontSize: '14px', textAlign: 'center', padding: '32px 0' }}>No recent activity found.</p>
            ) : (
              statsData.recentActivity.map((activity) => (
                <div key={activity.id} className="flex gap-3 relative">
                  <div style={{ position: 'absolute', top: '28px', bottom: '-16px', left: '11px', width: '1px', background: C.border }} />
                  <div style={{ position: 'relative', zIndex: 10, marginTop: '4px' }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: activity.type === 'meeting' ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.15)',
                      border: `1px solid ${activity.type === 'meeting' ? 'rgba(16,185,129,0.4)' : 'rgba(139,92,246,0.4)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: activity.type === 'meeting' ? '#10B981' : '#8B5CF6' }} />
                    </div>
                  </div>
                  <div>
                    <p style={{ color: C.text, fontSize: '13px', fontWeight: 600 }}>{activity.action}</p>
                    <p style={{ color: C.muted, fontSize: '12px', marginTop: '2px' }} className="line-clamp-1">{activity.details}</p>
                    <p style={{ color: C.subtle, fontSize: '11px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={11} /> {activity.time}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>

      {/* Report Modal */}
      {showReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowReport(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '20px', maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}
          >
            {/* Report Header */}
            <div style={{ background: 'linear-gradient(135deg,#10B981,#059669)', padding: '28px 32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 800, margin: 0 }}>📊 PMCFMS System Report</h2>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', marginTop: '4px' }}>
                    Generated on {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => window.print()}
                    style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    🖨️ Print
                  </button>
                  <button onClick={() => setShowReport(false)}
                    style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', padding: '8px 12px', borderRadius: '10px', fontSize: '16px', cursor: 'pointer', fontWeight: 700 }}>
                    ✕
                  </button>
                </div>
              </div>
            </div>

            {/* Report Body */}
            <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Summary Stats */}
              <div>
                <h3 style={{ color: '#0F172A', fontWeight: 700, fontSize: '15px', marginBottom: '12px', borderBottom: '2px solid #E2E8F0', paddingBottom: '8px' }}>📋 Summary Statistics</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {isAdmin && (
                    <div style={{ background: '#F0FDFA', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px', padding: '14px 18px' }}>
                      <p style={{ color: '#475569', fontSize: '12px', fontWeight: 600, margin: 0 }}>TOTAL USERS</p>
                      <p style={{ color: '#0F172A', fontSize: '28px', fontWeight: 800, margin: '4px 0 0' }}>{statsData.totalUsers}</p>
                    </div>
                  )}
                  <div style={{ background: '#EEF2FF', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '12px', padding: '14px 18px' }}>
                    <p style={{ color: '#475569', fontSize: '12px', fontWeight: 600, margin: 0 }}>ACTIVE MEETINGS</p>
                    <p style={{ color: '#0F172A', fontSize: '28px', fontWeight: 800, margin: '4px 0 0' }}>{statsData.activeMeetings}</p>
                  </div>
                  <div style={{ background: '#FFFBEB', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '12px', padding: '14px 18px' }}>
                    <p style={{ color: '#475569', fontSize: '12px', fontWeight: 600, margin: 0 }}>OPEN FORUMS</p>
                    <p style={{ color: '#0F172A', fontSize: '28px', fontWeight: 800, margin: '4px 0 0' }}>{statsData.openForums}</p>
                  </div>
                  <div style={{ background: '#F0FDF4', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px', padding: '14px 18px' }}>
                    <p style={{ color: '#475569', fontSize: '12px', fontWeight: 600, margin: 0 }}>TOTAL COMMENTS</p>
                    <p style={{ color: '#0F172A', fontSize: '28px', fontWeight: 800, margin: '4px 0 0' }}>{statsData.totalComments}</p>
                  </div>
                </div>
              </div>

              {/* Monthly Meeting Trend */}
              {statsData.analytics?.monthlyMeetings?.length > 0 && (
                <div>
                  <h3 style={{ color: '#0F172A', fontWeight: 700, fontSize: '15px', marginBottom: '12px', borderBottom: '2px solid #E2E8F0', paddingBottom: '8px' }}>📅 Monthly Meeting Trend</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC' }}>
                        <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748B', fontWeight: 700, borderBottom: '1px solid #E2E8F0' }}>Month</th>
                        <th style={{ textAlign: 'right', padding: '10px 12px', color: '#64748B', fontWeight: 700, borderBottom: '1px solid #E2E8F0' }}>Meetings Scheduled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsData.analytics.monthlyMeetings.map((m, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '10px 12px', color: '#0F172A', fontWeight: 500 }}>{m._id}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#10B981', fontWeight: 700 }}>{m.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Recent Activity */}
              {statsData.recentActivity?.length > 0 && (
                <div>
                  <h3 style={{ color: '#0F172A', fontWeight: 700, fontSize: '15px', marginBottom: '12px', borderBottom: '2px solid #E2E8F0', paddingBottom: '8px' }}>🔔 Recent Activity</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {statsData.recentActivity.map((a, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F8FAFC', borderRadius: '10px', fontSize: '13px' }}>
                        <div>
                          <p style={{ color: '#0F172A', fontWeight: 600, margin: 0 }}>{a.action}</p>
                          <p style={{ color: '#64748B', margin: '2px 0 0', fontSize: '12px' }}>{a.details}</p>
                        </div>
                        <span style={{ color: '#94A3B8', fontSize: '11px', whiteSpace: 'nowrap', marginLeft: '16px' }}>{a.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ textAlign: 'center', paddingTop: '8px', borderTop: '1px solid #E2E8F0' }}>
                <p style={{ color: '#94A3B8', fontSize: '11px' }}>Public Meeting & Community Forum Management System (PMCFMS) — Confidential Report</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
