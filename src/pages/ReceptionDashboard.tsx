import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Check, X, Clock, Users } from 'lucide-react';

export default function ReceptionDashboard() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user || (user.role !== 'RECEPTIONIST' && user.role !== 'ADMIN')) {
      navigate('/login');
      return;
    }
    fetchPending();
  }, [user, navigate]);

  const fetchPending = async () => {
    try {
      const res = await fetch('https://mediq-production-5791.up.railway.app/api/appointments/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setPending(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/appointments/${id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setPending(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/appointments/${id}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setPending(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  if (!user) return null;

  return (
    <div className="container" style={{ padding: 'var(--space-8) 0' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-8)' }}>
        <div>
          <h2>Reception Dashboard</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>Welcome back, {user.firstName}</p>
        </div>
        <button onClick={logout} className="btn btn-outline">Sign Out</button>
      </div>

      {/* Dashboard Stats */}
      <div className="stats">
        <div className="stat-card glass">
          <div className="icon-wrapper teal"><Clock /></div>
          <h2 style={{ fontSize: '2rem' }}>{pending.length}</h2>
          <p>Pending Requests</p>
        </div>
        <div className="stat-card glass">
          <div className="icon-wrapper primary"><Users /></div>
          <h2 style={{ fontSize: '2rem' }}>--</h2>
          <p>Today's Queue</p>
        </div>
      </div>

      <div className="glass" style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-4) var(--space-6)', borderBottom: '1px solid rgba(134,134,139,0.2)' }}>
          <h3>Pending Appointments</h3>
        </div>
        
        {loading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>Loading...</div>
        ) : pending.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No pending requests at the moment.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(134,134,139,0.2)' }}>
                  <th style={{ padding: 'var(--space-4) var(--space-6)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Patient</th>
                  <th style={{ padding: 'var(--space-4) var(--space-6)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Department</th>
                  <th style={{ padding: 'var(--space-4) var(--space-6)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Requested Time</th>
                  <th style={{ padding: 'var(--space-4) var(--space-6)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Reason</th>
                  <th style={{ padding: 'var(--space-4) var(--space-6)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map(app => (
                  <tr key={app.id} style={{ borderBottom: '1px solid rgba(134,134,139,0.1)' }}>
                    <td style={{ padding: 'var(--space-4) var(--space-6)' }}>
                      <div style={{ fontWeight: 600 }}>{app.patient.firstName} {app.patient.lastName}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{app.patient.phone}</div>
                    </td>
                    <td style={{ padding: 'var(--space-4) var(--space-6)' }}>{app.department.name}</td>
                    <td style={{ padding: 'var(--space-4) var(--space-6)' }}>
                      {new Date(app.preferredDate).toLocaleDateString()} {app.preferredTime}
                    </td>
                    <td style={{ padding: 'var(--space-4) var(--space-6)' }}>{app.reason}</td>
                    <td style={{ padding: 'var(--space-4) var(--space-6)' }}>
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button 
                          onClick={() => handleApprove(app.id)}
                          disabled={actionLoading === app.id}
                          className="btn"
                          style={{ backgroundColor: 'var(--color-secondary-light)', color: 'var(--color-secondary)', padding: 'var(--space-2)' }}
                          title="Approve & Generate Token"
                        >
                          <Check size={18} />
                        </button>
                        <button 
                          onClick={() => handleReject(app.id)}
                          disabled={actionLoading === app.id}
                          className="btn"
                          style={{ backgroundColor: '#ffe5e5', color: 'var(--color-danger)', padding: 'var(--space-2)' }}
                          title="Reject"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
