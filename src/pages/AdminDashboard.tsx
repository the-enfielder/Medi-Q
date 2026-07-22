import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Clock, QrCode } from 'lucide-react';

export default function AdminDashboard() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [scanToken, setScanToken] = useState('');
  const [scanStatus, setScanStatus] = useState({ loading: false, error: '', success: '' });

  const fetchStats = () => {
    fetch('https://mediq-production-5791.up.railway.app/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      navigate('/login');
      return;
    }
    fetchStats();
  }, [user, navigate, token]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setScanStatus({ loading: true, error: '', success: '' });
    
    try {
      const res = await fetch('https://mediq-production-5791.up.railway.app/api/admin/checkin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ tokenNumber: scanToken.toUpperCase() })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to check-in');
      
      setScanStatus({ loading: false, error: '', success: `Checked in patient for token ${scanToken.toUpperCase()}` });
      setScanToken('');
      fetchStats();
    } catch (err: any) {
      setScanStatus({ loading: false, error: err.message, success: '' });
    }
  };

  if (!user) return null;

  return (
    <div className="container" style={{ padding: 'var(--space-8) 0' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div className="icon-wrapper primary"><LayoutDashboard /></div>
          <div>
            <h2>Admin Control Center</h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>System overview</p>
          </div>
        </div>
        <button onClick={logout} className="btn btn-outline">Sign Out</button>
      </div>

      {stats && (
        <div className="stats" style={{ marginBottom: 'var(--space-8)' }}>
          <div className="stat-card glass">
            <h2 style={{ fontSize: '2rem' }}>{stats.todayAppointments}</h2>
            <p>Today's Appointments</p>
          </div>
          <div className="stat-card glass">
            <h2 style={{ fontSize: '2rem', color: 'var(--color-secondary)' }}>{stats.pendingAppointments}</h2>
            <p>Pending Requests</p>
          </div>
          <div className="stat-card glass">
            <h2 style={{ fontSize: '2rem' }}>{stats.totalPatients}</h2>
            <p>Total Patients</p>
          </div>
          <div className="stat-card glass">
            <h2 style={{ fontSize: '2rem' }}>{stats.totalDoctors}</h2>
            <p>Total Doctors</p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        
        {/* QR Scanner */}
        <div className="glass" style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <div className="icon-wrapper secondary"><QrCode size={20} /></div>
            <h3 style={{ margin: 0 }}>QR Check-in Scanner</h3>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
            Scan a patient's digital token QR code (or manually type the token) to check them into the waiting room queue.
          </p>

          {scanStatus.error && <div style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-4)', padding: 'var(--space-2)', backgroundColor: '#ffe5e5', borderRadius: 'var(--radius-sm)' }}>{scanStatus.error}</div>}
          {scanStatus.success && <div style={{ color: 'var(--color-teal)', marginBottom: 'var(--space-4)', padding: 'var(--space-2)', backgroundColor: '#e5fff5', borderRadius: 'var(--radius-sm)' }}>{scanStatus.success}</div>}

          <form onSubmit={handleScan} style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input 
              type="text" 
              value={scanToken}
              onChange={(e) => setScanToken(e.target.value)}
              placeholder="e.g. GM-001"
              required
              style={{ flex: 1, padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-text-tertiary)', background: 'var(--color-surface)', color: 'var(--color-text)', textTransform: 'uppercase' }}
            />
            <button type="submit" className="btn btn-primary" disabled={scanStatus.loading}>
              {scanStatus.loading ? '...' : 'Check In'}
            </button>
          </form>
        </div>

        {/* Quick Links / Actions */}
        <div className="glass" style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-xl)' }}>
          <h3 style={{ marginBottom: 'var(--space-4)' }}>Quick Actions</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <button onClick={() => navigate('/reception')} className="btn btn-outline" style={{ display: 'flex', justifyContent: 'flex-start', padding: 'var(--space-4)', fontSize: '1.1rem' }}>
              <Clock style={{ marginRight: 'var(--space-3)' }} /> Open Reception Dashboard
            </button>
            <button onClick={() => window.open('/live', '_blank')} className="btn btn-outline" style={{ display: 'flex', justifyContent: 'flex-start', padding: 'var(--space-4)', fontSize: '1.1rem' }}>
              <Users style={{ marginRight: 'var(--space-3)' }} /> Open Live Waiting TV
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
