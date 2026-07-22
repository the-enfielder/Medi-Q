import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Activity } from 'lucide-react';

export default function LiveTV() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchQueues = async (isUpdate = false) => {
    try {
      const res = await fetch('/api/departments/queues');
      if (res.ok) {
        const data = await res.json();
        
        // Voice Announcement Logic
        if (isUpdate && departments.length > 0) {
          data.forEach((newDept: any) => {
            const oldDept = departments.find(d => d.id === newDept.id);
            if (oldDept && newDept.current && (!oldDept.current || oldDept.current.id !== newDept.current.id)) {
              const msg = new SpeechSynthesisUtterance(`Token number ${newDept.current.tokenNumber}, please proceed to ${newDept.name}.`);
              msg.rate = 0.9;
              window.speechSynthesis.speak(msg);
            }
          });
        }
        
        setDepartments(data);
      }
    } catch (err) {
      console.error('Failed to fetch queues', err);
    }
  };

  useEffect(() => {
    fetchQueues(false);

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    const socket = io('');
    socket.on('queue_update', () => {
      fetchQueues(true);
    });

    return () => {
      socket.disconnect();
      clearInterval(timer);
    };
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: 'var(--space-8)' }}>
      <div className="animate-slide-in-left" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-8)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', margin: 0, fontSize: '3rem' }}>
          <Activity color="var(--color-primary)" size={56} />
          MediQueue <span style={{ fontWeight: 300 }}>Live</span>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
          <div style={{ fontSize: '2rem', opacity: 0.9, fontFamily: 'monospace', letterSpacing: '2px' }}>
            {currentTime.toLocaleTimeString()}
          </div>
          <button onClick={toggleFullScreen} className="btn btn-outline" style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
            Full Screen
          </button>
        </div>
      </div>

      <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 'var(--space-6)' }}>
        {departments.map((dept, index) => (
          <div key={dept.id} className="animate-float" style={{ animationDelay: `${index * 0.2}s`, animationDuration: '8s', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ backgroundColor: 'var(--color-primary)', padding: 'var(--space-4)', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,122,255,0.4)' }}>
              <h2 style={{ margin: 0, color: 'white', fontSize: '1.8rem', letterSpacing: '1px' }}>{dept.name}</h2>
            </div>
            
            <div style={{ padding: 'var(--space-8)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-8)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 'var(--space-6)' }}>
                <div>
                  <div style={{ textTransform: 'uppercase', fontSize: '1rem', letterSpacing: '2px', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>Now Serving</div>
                  <div className="animate-pulse" style={{ fontSize: '5.5rem', fontWeight: 800, lineHeight: 1, color: 'var(--color-secondary)', textShadow: '0 0 40px rgba(52, 199, 89, 0.4)' }}>
                    {dept.current ? dept.current.tokenNumber : '---'}
                  </div>
                </div>
                {dept.current && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Consulting Doctor</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>Dr. {dept.current.doctor?.firstName} {dept.current.doctor?.lastName}</div>
                  </div>
                )}
              </div>

              <div>
                <div style={{ textTransform: 'uppercase', fontSize: '0.875rem', letterSpacing: '1px', opacity: 0.7, marginBottom: 'var(--space-4)' }}>Next in Queue</div>
                <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                  {dept.waiting.length === 0 ? (
                    <div style={{ opacity: 0.5 }}>No one is waiting</div>
                  ) : (
                    dept.waiting.slice(0, 4).map((w: any) => (
                      <div key={w.id} style={{ padding: 'var(--space-3) var(--space-4)', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', fontSize: '1.25rem', fontWeight: 600 }}>
                        {w.tokenNumber}
                      </div>
                    ))
                  )}
                  {dept.waiting.length > 4 && (
                    <div style={{ padding: 'var(--space-3) var(--space-4)', opacity: 0.6, fontSize: '1.25rem' }}>
                      +{dept.waiting.length - 4} more
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
