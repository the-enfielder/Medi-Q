import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Activity, QrCode } from 'lucide-react';
import { io } from 'socket.io-client';
import toast, { Toaster } from 'react-hot-toast';

export default function TrackAppointment() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const socket = io('');
    
    socket.on('queue_update', () => {
      // If we are currently tracking someone, re-fetch their data silently
      if (phone && data) {
        fetch(`/api/appointments/track?query=${encodeURIComponent(phone)}`)
          .then(res => res.json())
          .then(result => {
            // Check if status changed for the most recent appointment to trigger a toast
            if (data.appointments && data.appointments[0] && result.appointments && result.appointments[0]) {
              const oldStatus = data.appointments[0].status;
              const newStatus = result.appointments[0].status;
              
              if (oldStatus !== newStatus) {
                if (newStatus === 'APPROVED') toast.success('Your appointment is APPROVED! Digital token generated.');
                if (newStatus === 'IN_QUEUE') toast.success('You are checked in! Please wait in the waiting room.');
                if (newStatus === 'CONSULTING') toast.success('It is your turn! Please proceed to the doctor.');
                if (newStatus === 'COMPLETED') toast.success('Consultation completed. Thank you!');
              }
            }
            setData(result);
          })
          .catch(console.error);
      }
    });

    return () => { socket.disconnect(); };
  }, [phone, data]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setData(null);

    try {
      const res = await fetch(`/api/appointments/track?query=${encodeURIComponent(phone)}`);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to fetch tracking data');
      }

      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'var(--color-primary)';
      case 'APPROVED': return 'var(--color-secondary)';
      case 'IN_QUEUE': return 'var(--color-teal)';
      case 'COMPLETED': return 'var(--color-text-secondary)';
      case 'CANCELLED': return 'var(--color-danger)';
      default: return 'var(--color-text)';
    }
  };

  return (
    <div className="container" style={{ padding: 'var(--space-8) var(--space-4)', maxWidth: '600px', margin: '0 auto' }}>
      <Toaster position="top-center" />
      <div className="glass" style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-xl)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <div className="icon-wrapper secondary" style={{ marginBottom: 'var(--space-4)' }}>
            <Search size={28} />
          </div>
          <h2>Track Your Appointment</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>Enter your mobile number or Token ID to see your status.</p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'var(--color-danger)', color: 'white', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-8)' }}>
          <input 
            type="text" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 9876543210 or GM-001"
            required
            style={{ flex: 1, padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-text-tertiary)', background: 'var(--color-surface)', color: 'var(--color-text)', fontFamily: 'var(--font-primary)' }}
          />
          <button type="submit" className="btn btn-primary shadow-hover" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {data && (
          <div className="animate-slide-in-left">
            <h3 style={{ marginBottom: 'var(--space-4)', fontSize: '1.5rem', fontWeight: 700 }}>Hello, {data.patient.firstName} 👋</h3>
            
            {data.appointments.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)' }}>You have no recorded appointments.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {data.appointments.map((app: any) => (
                  <div key={app.id} className="feature-card glass" style={{ padding: 'var(--space-6)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: getStatusColor(app.status) }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>{app.department.name}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                          {new Date(app.preferredDate).toLocaleDateString()} at {app.preferredTime}
                        </div>
                      </div>
                      <div className="badge animate-pulse" style={{ backgroundColor: `${getStatusColor(app.status)}20`, color: getStatusColor(app.status), border: `1px solid ${getStatusColor(app.status)}50`, fontWeight: 700 }}>
                        {app.status}
                      </div>
                    </div>
                    
                    {app.tokenNumber && (
                      <div>
                        <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid rgba(134,134,139,0.1)' }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '1px' }}>Token No.</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-secondary)' }}>{app.tokenNumber}</div>
                          </div>
                          {(app.status === 'IN_QUEUE' || app.status === 'APPROVED') && (
                            <div>
                              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '1px' }}>Queue Pos</div>
                              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>#{app.queuePosition || '-'}</div>
                            </div>
                          )}
                          {app.estimatedWait > 0 && (
                            <div>
                              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '1px' }}>Est. Wait</div>
                              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>~{app.estimatedWait} min</div>
                            </div>
                          )}
                        </div>
                        
                        {(app.status === 'APPROVED' || app.status === 'IN_QUEUE') && (
                          <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${app.tokenNumber}&color=000000&bgcolor=ffffff`} alt="QR Code" style={{ borderRadius: 'var(--radius-sm)' }} />
                            <div>
                              <h4 style={{ margin: '0 0 var(--space-2) 0', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><QrCode size={16} /> Digital Token</h4>
                              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                                {app.status === 'APPROVED' ? 'Present this QR code at the reception desk to check-in when you arrive.' : 'You are checked in! Please keep an eye on the waiting room TV.'}
                              </p>
                            </div>
                          </div>
                        )}

                        {app.status === 'COMPLETED' && app.queueLogs && app.queueLogs.find((l: any) => l.status === 'COMPLETED' && l.notes) && (
                          <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', backgroundColor: 'rgba(52, 199, 89, 0.1)', border: '1px solid rgba(52, 199, 89, 0.3)', borderRadius: 'var(--radius-md)' }}>
                            <h4 style={{ margin: '0 0 var(--space-3) 0', color: 'var(--color-teal)' }}>🩺 Digital Prescription</h4>
                            <div style={{ fontSize: '0.9rem', margin: 0, whiteSpace: 'pre-wrap', color: 'var(--color-text)', backgroundColor: 'rgba(255,255,255,0.05)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-teal)' }}>
                              {app.queueLogs.find((l: any) => l.status === 'COMPLETED' && l.notes).notes}
                            </div>
                            <button className="btn btn-outline" style={{ marginTop: 'var(--space-4)', width: '100%', fontSize: '0.875rem' }} onClick={() => window.print()}>
                              Download / Print Prescription
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <button onClick={() => navigate('/')} className="btn btn-outline" style={{ marginTop: 'var(--space-6)', width: '100%' }}>
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
