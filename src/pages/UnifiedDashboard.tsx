import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Clock, QrCode, Play, CheckCircle, BarChart3, Pill, Paperclip } from 'lucide-react';
import { io } from 'socket.io-client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

export default function UnifiedDashboard() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  
  // Admin State
  const [stats, setStats] = useState<any>(null);
  // Tabs State
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'pharmacy'>('overview');

  // Doctor State
  const [queue, setQueue] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [prescription, setPrescription] = useState('');

  // Analytics & Pharmacy State
  const [analytics, setAnalytics] = useState<any>(null);
  const [pharmacyQueue, setPharmacyQueue] = useState<any[]>([]);

  const fetchStats = () => {
    fetch('https://mediq-production-5791.up.railway.app/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error(err));
  };

  const fetchQueue = async () => {
    try {
      const res = await fetch('https://mediq-production-5791.up.railway.app/api/doctor/queue', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setQueue(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAnalyticsAndPharmacy = async () => {
    try {
      const [analyticsRes, pharmacyRes] = await Promise.all([
        fetch('https://mediq-production-5791.up.railway.app/api/admin/analytics', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('https://mediq-production-5791.up.railway.app/api/admin/pharmacy/pending', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (pharmacyRes.ok) setPharmacyQueue(await pharmacyRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    setShowHistory(true);
    try {
      const res = await fetch('https://mediq-production-5791.up.railway.app/api/admin/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setHistoryData(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !['ADMIN', 'DOCTOR'].includes(user.role)) {
      navigate('/login');
      return;
    }
    
    fetchStats();
    fetchQueue();
    fetchAnalyticsAndPharmacy();

    const socket = io('https://mediq-production-5791.up.railway.app');
    socket.on('queue_update', () => {
      fetchStats();
      fetchQueue();
      fetchAnalyticsAndPharmacy();
    });

    return () => {
      socket.disconnect();
    };
  }, [user, navigate, token]);

  const handleAction = async (id: string, action: 'start' | 'complete') => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/doctor/${action}/${id}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(action === 'complete' ? { notes: prescription } : {})
      });
      if (res.ok) {
        if (action === 'complete') setPrescription('');
        fetchQueue();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDispense = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/pharmacy/${id}/dispense`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchAnalyticsAndPharmacy();
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return null;

  const currentPatient = [...queue].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).find(q => q.status === 'CONSULTING');
  const waitingPatients = queue.filter(q => q.status === 'APPROVED' || q.status === 'IN_QUEUE');
  const completedPatients = queue.filter(q => q.status === 'COMPLETED');

  return (
    <div className="container" style={{ padding: 'var(--space-8) 0' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div className="icon-wrapper primary"><LayoutDashboard /></div>
          <div>
            <h2>Unified Staff Portal</h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              {user.role === 'DOCTOR' ? (user.firstName?.startsWith('Dr.') ? '' : 'Dr. ') + user.firstName + ' ' + user.lastName : 'Admin Control Center'}
            </p>
          </div>
        </div>
        <button onClick={logout} className="btn btn-outline">Sign Out</button>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-8)', borderBottom: '1px solid rgba(134,134,139,0.2)', paddingBottom: 'var(--space-4)' }}>
        <button className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('overview')}>
          <LayoutDashboard size={18} style={{ marginRight: 8 }} /> Overview
        </button>
        <button className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('analytics')}>
          <BarChart3 size={18} style={{ marginRight: 8 }} /> Analytics
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="animate-fade-in">

      {/* Admin Stats */}
      {stats && (
        <div className="stats animate-fade-in" style={{ marginBottom: 'var(--space-8)' }}>
          <div className="stat-card glass animate-float" style={{ animationDelay: '0.1s', cursor: 'pointer' }} onClick={fetchHistory}>
            <h2 style={{ fontSize: '2.5rem' }}>{stats.todayAppointments}</h2>
            <p style={{ fontWeight: 600 }}>Today's Appointments</p>
          </div>
          <div className="stat-card glass animate-float" style={{ animationDelay: '0.2s', borderColor: 'var(--color-secondary)' }}>
            <h2 style={{ fontSize: '2.5rem', color: 'var(--color-secondary)' }}>{stats.pendingAppointments}</h2>
            <p style={{ fontWeight: 600, color: 'var(--color-secondary)' }}>Pending Requests</p>
          </div>
          <div className="stat-card glass animate-float" style={{ animationDelay: '0.3s', cursor: 'pointer' }} onClick={fetchHistory}>
            <h2 style={{ fontSize: '2.5rem' }}>{stats.totalPatients}</h2>
            <p style={{ fontWeight: 600 }}>Total Patients</p>
          </div>
          <div className="stat-card glass animate-float" style={{ animationDelay: '0.4s' }}>
            <h2 style={{ fontSize: '2.5rem' }}>{stats.totalDoctors}</h2>
            <p style={{ fontWeight: 600 }}>Total Doctors</p>
          </div>
        </div>
      )}

      {/* Grid Layout */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-6)' }}>
        
        {/* Quick Links */}
        <div className="glass" style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-xl)', width: '100%', textAlign: 'center' }}>
          <h3 style={{ marginBottom: 'var(--space-4)' }}>Quick Actions</h3>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/reception')} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', padding: 'var(--space-4)', fontSize: '1.1rem' }}>
              <Clock style={{ marginRight: 'var(--space-3)' }} /> Open Reception Dashboard
            </button>
            <button onClick={() => window.open('/live', '_blank')} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', padding: 'var(--space-4)', fontSize: '1.1rem' }}>
              <Users style={{ marginRight: 'var(--space-3)' }} /> Open Live Waiting TV
            </button>
          </div>
        </div>
      </div>

      <h2 style={{ marginTop: 'var(--space-8)', marginBottom: 'var(--space-6)' }}>Consultation Queue</h2>

      {/* Doctor Queue Section */}
      <div className="animate-slide-in-left" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-6)' }}>
        
        {/* Main Consultation View */}
        <div>
          <div className="glass" style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-xl)', marginBottom: 'var(--space-6)' }}>
            <h3 style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: currentPatient ? 'var(--color-danger)' : 'var(--color-secondary)' }}></span>
              Current Consultation
            </h3>
            
            {currentPatient ? (
              <div>
                <h2 style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>
                  {currentPatient.patient.firstName} {currentPatient.patient.lastName}
                </h2>
                <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                  <div className="badge" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>Token: {currentPatient.tokenNumber}</div>
                  <div className="badge">{currentPatient.priority} Priority</div>
                </div>
                
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                  <strong>Reason/Symptoms:</strong> {currentPatient.reason}
                </p>

                {currentPatient.attachmentUrl && (
                  <div style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-primary-light)' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 var(--space-2) 0' }}>
                      <Paperclip size={16} /> Patient Uploaded File
                    </h4>
                    <a href={`${currentPatient.attachmentUrl}`} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ fontSize: '0.875rem' }}>
                      View Attachment
                    </a>
                  </div>
                )}

                <div style={{ marginBottom: 'var(--space-6)' }}>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 600 }}>Digital Prescription & Notes</label>
                  <textarea 
                    value={prescription}
                    onChange={(e) => setPrescription(e.target.value)}
                    placeholder="Type medicines, diagnosis, or advice here..."
                    style={{ width: '100%', minHeight: '120px', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-text-tertiary)', background: 'var(--color-surface)', color: 'var(--color-text)', fontFamily: 'var(--font-primary)', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                  <button 
                    onClick={() => handleAction(currentPatient.id, 'complete')}
                    disabled={!!actionLoading}
                    className="btn btn-primary btn-large shadow-hover"
                  >
                    <CheckCircle size={20} /> Complete Consultation
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-8) 0', color: 'var(--color-text-secondary)' }}>
                No active consultation. Start the next patient from the queue.
              </div>
            )}
          </div>

          <div className="glass" style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-xl)' }}>
            <h3 style={{ marginBottom: 'var(--space-4)' }}>Waiting Queue ({waitingPatients.length})</h3>
            {waitingPatients.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)' }}>Queue is empty.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {waitingPatients.map((patient, index) => (
                  <div key={patient.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4)', backgroundColor: 'var(--color-surface)', border: '1px solid rgba(134,134,139,0.1)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                        {index + 1}. {patient.patient.firstName} {patient.patient.lastName}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                        Token: {patient.tokenNumber} | Wait: ~{patient.estimatedWait} min
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleAction(patient.id, 'start')}
                      disabled={!!actionLoading || !!currentPatient}
                      className="btn"
                      style={{ backgroundColor: 'var(--color-teal-light)', color: 'var(--color-teal)' }}
                    >
                      <Play size={18} /> Start
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <div className="glass" style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-xl)' }}>
            <h3 style={{ marginBottom: 'var(--space-4)' }}>Completed Today ({completedPatients.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {completedPatients.map(p => (
                <div key={p.id} style={{ padding: 'var(--space-3)', borderBottom: '1px solid rgba(134,134,139,0.1)' }}>
                  <div style={{ fontWeight: 500 }}>{p.patient.firstName} {p.patient.lastName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Token: {p.tokenNumber}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
        </div>
      )}

      {activeTab === 'analytics' && analytics && (
        <div className="animate-fade-in glass" style={{ padding: 'var(--space-8)', borderRadius: 'var(--radius-xl)' }}>
          <h2 style={{ marginBottom: 'var(--space-8)' }}>Hospital Analytics</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)' }}>
            <div>
              <h3 style={{ marginBottom: 'var(--space-4)' }}>Department Load</h3>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.departmentChartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="name" stroke="var(--color-text-secondary)" />
                    <YAxis stroke="var(--color-text-secondary)" />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: 'none', borderRadius: '8px' }} />
                    <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <h3 style={{ marginBottom: 'var(--space-4)' }}>Patient Flow</h3>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.timeChartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="time" stroke="var(--color-text-secondary)" />
                    <YAxis stroke="var(--color-text-secondary)" />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: 'none', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="patients" stroke="var(--color-secondary)" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}


      {showHistory && (
        <div 
          onClick={() => setShowHistory(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass animate-fade-in" 
            style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-xl)', width: '90%', maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h2>Patient History</h2>
              <button onClick={() => setShowHistory(false)} className="btn btn-outline" style={{ padding: '4px 8px' }}>Close</button>
            </div>
            {historyLoading ? (
              <p>Loading history...</p>
            ) : (
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: 'var(--space-2)' }}>Date</th>
                    <th style={{ padding: 'var(--space-2)' }}>Token</th>
                    <th style={{ padding: 'var(--space-2)' }}>Patient</th>
                    <th style={{ padding: 'var(--space-2)' }}>Status</th>
                    <th style={{ padding: 'var(--space-2)' }}>Doctor</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.map(h => (
                    <tr key={h.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: 'var(--space-2)' }}>{new Date(h.createdAt).toLocaleString()}</td>
                      <td style={{ padding: 'var(--space-2)' }}>{h.tokenNumber || 'N/A'}</td>
                      <td style={{ padding: 'var(--space-2)' }}>{h.patient?.firstName} {h.patient?.lastName}</td>
                      <td style={{ padding: 'var(--space-2)' }}>
                        <span className="badge" style={{ backgroundColor: h.status === 'COMPLETED' ? 'var(--color-success)' : 'var(--color-surface)' }}>{h.status}</span>
                      </td>
                      <td style={{ padding: 'var(--space-2)' }}>{h.doctor?.user?.firstName || 'N/A'}</td>
                    </tr>
                  ))}
                  {historyData.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: 'var(--space-4)', textAlign: 'center' }}>No history found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
