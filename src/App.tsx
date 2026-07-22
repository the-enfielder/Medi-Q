import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { 
  Stethoscope, 
  Clock, 
  Smartphone, 
  QrCode, 
  Users, 
  Activity,
  ArrowRight,
  ShieldCheck,
  CalendarCheck,
  Sun,
  Moon
} from 'lucide-react';

import { useTheme } from './context/ThemeContext';
import Login from './pages/Login';
import BookAppointment from './pages/BookAppointment';
import ReceptionDashboard from './pages/ReceptionDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import LiveTV from './pages/LiveTV';
import AdminDashboard from './pages/AdminDashboard';
import UnifiedDashboard from './pages/UnifiedDashboard';
import TrackAppointment from './pages/TrackAppointment';
import { useState } from 'react';

function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  
  const [scanToken, setScanToken] = useState('');
  const [scanStatus, setScanStatus] = useState({ loading: false, error: '', success: '' });

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setScanStatus({ loading: true, error: '', success: '' });
    
    try {
      const res = await fetch('https://mediq-production-5791.up.railway.app/api/appointments/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenNumber: scanToken.toUpperCase() })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to check-in');
      
      setScanStatus({ loading: false, error: '', success: `Success! You are now in the waiting room queue for ${scanToken.toUpperCase()}. Please check the Live TV.` });
      setScanToken('');
    } catch (err: any) {
      setScanStatus({ loading: false, error: err.message, success: '' });
    }
  };

  return (
    <div className="landing-page" style={{ transition: 'background-color var(--transition-normal)' }}>
      {/* Navigation */}
      <nav className="navbar container glass">
        <div className="nav-logo">
          <Activity color="var(--color-primary)" size={28} />
          <span>Medi <span style={{color: 'var(--color-primary)'}}>Q</span></span>
        </div>
        <div className="nav-links" style={{ alignItems: 'center' }}>
          <button 
            onClick={toggleTheme} 
            className="btn btn-outline" 
            style={{ borderRadius: '50%', padding: '8px', border: 'none' }}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <Link to="/live" className="btn" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Live TV</Link>
          <Link to="/track" className="btn" style={{ fontWeight: 600 }}>Track Status</Link>
          <Link to="/book" className="btn btn-primary">Book Appointment</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero container">
        <div className="hero-content animate-fade-in" style={{ animationDuration: '1s' }}>
          <div className="badge animate-float">Smart Queue Management</div>
          <h1 className="hero-title" style={{ animationDelay: '0.2s' }}>Healthcare without <span className="highlight">waiting.</span></h1>
          <p className="hero-subtitle">
            Experience the future of medical appointments. Real-time tracking, 
            smart queues, and zero overcrowding.
          </p>
          <div className="hero-actions">
            <Link to="/book" className="btn btn-primary btn-large shadow-hover">
              Book Appointment <ArrowRight size={20} />
            </Link>
            <Link to="/track" className="btn btn-outline btn-large">
              Track Status
            </Link>
            <Link to="/live" className="btn btn-outline btn-large" style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
              Waiting Room TV
            </Link>
          </div>
        </div>
      </header>



      {/* Features Section */}
      <section className="features container">
        <div className="section-header">
          <h2>Premium Care, Reimagined.</h2>
          <p>Our smart hospital OS ensures a calm, reassuring experience.</p>
        </div>
        
        <div className="feature-grid">
          <div className="feature-card glass">
            <div className="icon-wrapper teal"><CalendarCheck /></div>
            <h3>Online Booking</h3>
            <p>Find the perfect slot and book seamlessly from your phone.</p>
          </div>
          <div className="feature-card glass">
            <div className="icon-wrapper primary"><QrCode /></div>
            <h3>QR Check-In</h3>
            <p>Scan upon arrival for instant check-in and queue placement.</p>
          </div>
          <div className="feature-card glass">
            <div className="icon-wrapper secondary"><Users /></div>
            <h3>Live Waiting Time</h3>
            <p>Follow your position on the live TV display and your phone.</p>
          </div>
        </div>
      </section>


      {/* Self Check-in Section */}
      <section className="container" style={{ padding: 'var(--space-8) var(--space-4)', display: 'flex', justifyContent: 'center' }}>
        <div className="glass" style={{ padding: 'var(--space-8)', borderRadius: 'var(--radius-xl)', maxWidth: '600px', width: '100%', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
            <div className="icon-wrapper secondary" style={{ width: '64px', height: '64px' }}><QrCode size={32} /></div>
          </div>
          <h2 style={{ marginBottom: 'var(--space-2)' }}>Patient Self Check-in</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
            Arrived at the hospital? Enter your digital token number to instantly check yourself into the waiting room queue.
          </p>

          {scanStatus.error && <div className="animate-fade-in" style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-4)', padding: 'var(--space-3)', backgroundColor: 'rgba(255, 59, 48, 0.1)', borderRadius: 'var(--radius-md)' }}>{scanStatus.error}</div>}
          {scanStatus.success && <div className="animate-fade-in" style={{ color: 'var(--color-teal)', marginBottom: 'var(--space-4)', padding: 'var(--space-3)', backgroundColor: 'rgba(52, 199, 89, 0.1)', borderRadius: 'var(--radius-md)' }}>{scanStatus.success}</div>}

          <form onSubmit={handleScan} style={{ display: 'flex', gap: 'var(--space-4)' }}>
            <input 
              type="text" 
              value={scanToken}
              onChange={(e) => setScanToken(e.target.value)}
              placeholder="e.g. GM-001"
              required
              style={{ flex: 1, padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-text-tertiary)', background: 'var(--color-surface)', color: 'var(--color-text)', textTransform: 'uppercase', fontSize: '1.25rem', textAlign: 'center', letterSpacing: '2px' }}
            />
            <button type="submit" className="btn btn-primary btn-large shadow-hover" disabled={scanStatus.loading} style={{ minWidth: '150px' }}>
              {scanStatus.loading ? 'Checking In...' : 'Check In'}
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer container">
        <div className="footer-content glass">
          <div className="footer-brand">
            <Activity color="var(--color-primary)" size={24} />
            <h3>Medi Q</h3>
            <p>Revolutionizing hospital workflows.</p>
          </div>
          <div className="footer-links">
            <Link to="/login" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-text-secondary)' }}>Admin Login</Link>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/doctor-login" element={<Login />} />
      <Route path="/book" element={<BookAppointment />} />
      <Route path="/track" element={<TrackAppointment />} />
      <Route path="/reception" element={<ReceptionDashboard />} />
      <Route path="/doctor" element={<UnifiedDashboard />} />
      <Route path="/live" element={<LiveTV />} />
      <Route path="/admin" element={<UnifiedDashboard />} />
      <Route path="/dashboard" element={<UnifiedDashboard />} />
    </Routes>
  );
}

export default App;
