import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const isDoctorLogin = window.location.pathname === '/doctor-login';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('https://mediq-production-5791.up.railway.app/api/auth/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      login(data.user, data.token);
      
      if (data.user.role === 'ADMIN' || data.user.role === 'DOCTOR') {
        navigate('/dashboard');
      } else if (data.user.role === 'RECEPTIONIST') {
        navigate('/reception');
      } else {
        navigate('/');
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: 'var(--space-4)' }}>
      <div className="glass" style={{ padding: 'var(--space-8)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <div className="icon-wrapper primary" style={{ marginBottom: 'var(--space-4)' }}>
            <ShieldCheck size={28} />
          </div>
          <h2>{isDoctorLogin ? 'Doctor Login' : 'Admin Login'}</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {isDoctorLogin ? 'Sign in to access your consultations.' : 'Sign in to manage the hospital system.'}
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'var(--color-danger)', color: 'white', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Username or Email</label>
            <input 
              type="text" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your username or email"
              required
              style={{ width: '100%', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-text-tertiary)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ width: '100%', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-text-tertiary)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-large shadow-hover" disabled={loading} style={{ marginTop: 'var(--space-2)' }}>
            {loading ? 'Signing in...' : (
              <>Sign In <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-6)', paddingTop: 'var(--space-4)', borderTop: '1px solid rgba(134, 134, 139, 0.2)' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Are you a patient? <a href="/book" style={{ fontWeight: 600 }}>Book Appointment</a>
          </p>
        </div>
      </div>
    </div>
  );
}
