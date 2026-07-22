import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Play, CheckCircle } from 'lucide-react';
import { io } from 'socket.io-client';

export default function DoctorDashboard() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [prescription, setPrescription] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'DOCTOR') {
      navigate('/login');
      return;
    }
    
    fetchQueue();

    // Listen for queue updates from reception/other doctors
    const socket = io('https://mediq-production-5791.up.railway.app');
    socket.on('queue_update', () => {
      fetchQueue(); // Refresh queue when updated
    });

    return () => {
      socket.disconnect();
    };
  }, [user, navigate]);

  const fetchQueue = async () => {
    try {
      const res = await fetch('https://mediq-production-5791.up.railway.app/api/doctor/queue', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setQueue(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  if (!user) return null;

  const currentPatient = queue.find(q => q.status === 'IN_QUEUE');
  const waitingPatients = queue.filter(q => q.status === 'APPROVED');
  const completedPatients = queue.filter(q => q.status === 'COMPLETED');

  return (
    <div className="container" style={{ padding: 'var(--space-8) 0' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-8)' }}>
        <div>
          <h2>Doctor Dashboard</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {user.firstName?.startsWith('Dr.') ? '' : 'Dr. '}{user.firstName} {user.lastName}
          </p>
        </div>
        <button onClick={logout} className="btn btn-outline">Sign Out</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-6)' }}>
        
        {/* Main View */}
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
                
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
                  <strong>Reason/Symptoms:</strong> {currentPatient.reason}
                </p>

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
  );
}
