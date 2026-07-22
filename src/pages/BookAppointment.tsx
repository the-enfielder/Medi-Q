import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, ArrowRight, User, Sparkles } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function BookAppointment() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    departmentId: '',
    reason: '',
    symptoms: '',
    priority: 'NORMAL',
    preferredDate: '',
    preferredTime: '',
    attachmentUrl: ''
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      toast.loading('Uploading file...', { id: 'upload' });
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setFormData(prev => ({ ...prev, attachmentUrl: data.fileUrl }));
        toast.success('File uploaded successfully!', { id: 'upload' });
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      toast.error('File upload failed', { id: 'upload' });
    }
  };

  const handleSmartTriage = () => {
    if (!formData.symptoms) {
      toast.error('Please describe your symptoms first.');
      return;
    }
    const sym = formData.symptoms.toLowerCase();
    let priority = 'NORMAL';
    let deptName = 'General Medicine';

    if (sym.includes('chest') || sym.includes('heart') || sym.includes('breath') || sym.includes('stroke')) {
      priority = 'EMERGENCY';
      deptName = 'Cardiology';
    } else if (sym.includes('headache') || sym.includes('dizzy') || sym.includes('blur') || sym.includes('seizure')) {
      priority = 'HIGH';
      deptName = 'Neurology';
    } else if (sym.includes('bone') || sym.includes('fracture') || sym.includes('fall') || sym.includes('pain')) {
      priority = 'HIGH';
      deptName = 'Orthopedics';
    } else if (sym.includes('fever') || sym.includes('cough') || sym.includes('cold')) {
      priority = 'NORMAL';
      deptName = 'General Medicine';
    }

    const dept = departments.find(d => d.name.toLowerCase().includes(deptName.toLowerCase()));
    const deptId = dept ? dept.id : (departments[0] ? departments[0].id : '');

    setFormData(prev => ({
      ...prev,
      priority,
      departmentId: deptId,
      reason: prev.symptoms
    }));

    if (priority === 'EMERGENCY') {
      toast.error(`CRITICAL: Routed to ${deptName} with EMERGENCY priority!`, { duration: 5000, icon: '🚨' });
    } else {
      toast.success(`AI Triage: Routed to ${deptName} (${priority})`);
    }
  };

  useEffect(() => {
    fetch('/api/departments')
      .then(res => res.json())
      .then(data => setDepartments(data))
      .catch(err => console.error(err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to book');
      }

      setStep(3); // Success step
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ padding: 'var(--space-8) var(--space-4)', maxWidth: '650px', margin: '0 auto', transition: 'all var(--transition-normal)' }}>
      <Toaster position="top-center" />
      
      {/* Progress Indicator */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: step >= 1 ? 'var(--color-primary)' : 'var(--color-surface)', color: step >= 1 ? '#fff' : 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, transition: 'all 0.3s' }}>1</div>
          <div style={{ width: '40px', height: '4px', backgroundColor: step >= 2 ? 'var(--color-primary)' : 'var(--color-text-tertiary)', borderRadius: 'var(--radius-full)', transition: 'all 0.3s' }} />
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: step >= 2 ? 'var(--color-primary)' : 'var(--color-surface)', color: step >= 2 ? '#fff' : 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, transition: 'all 0.3s' }}>2</div>
          <div style={{ width: '40px', height: '4px', backgroundColor: step >= 3 ? 'var(--color-primary)' : 'var(--color-text-tertiary)', borderRadius: 'var(--radius-full)', transition: 'all 0.3s' }} />
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: step >= 3 ? 'var(--color-secondary)' : 'var(--color-surface)', color: step >= 3 ? '#fff' : 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, transition: 'all 0.3s' }}>✓</div>
        </div>
      </div>

      <div className="glass" style={{ padding: 'var(--space-8)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <div className="icon-wrapper teal animate-float" style={{ marginBottom: 'var(--space-4)', width: '64px', height: '64px' }}>
            <CalendarCheck size={32} />
          </div>
          <h2 style={{ fontSize: '2rem' }}>Book an Appointment</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem' }}>Skip the queue. Book online in seconds.</p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'var(--color-danger)', color: 'white', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {step === 3 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
            <h3 style={{ color: 'var(--color-secondary)', marginBottom: 'var(--space-4)' }}>Appointment Requested!</h3>
            <p>Your request has been sent to the reception. You will receive an SMS shortly with your token and confirmation.</p>
            <button onClick={() => navigate('/')} className="btn btn-primary shadow-hover" style={{ marginTop: 'var(--space-6)' }}>
              Back to Home
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            
            {step === 1 && (
              <div className="animate-slide-in-left" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <h4 style={{ marginBottom: 'var(--space-2)', borderBottom: '1px solid rgba(134,134,139,0.2)', paddingBottom: 'var(--space-2)' }}>Patient Details</h4>
                <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem' }}>First Name</label>
                    <input type="text" name="firstName" required value={formData.firstName} onChange={handleChange} style={inputStyle} placeholder="John" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem' }}>Last Name</label>
                    <input type="text" name="lastName" required value={formData.lastName} onChange={handleChange} style={inputStyle} placeholder="Doe" />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem' }}>Mobile Number</label>
                  <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} style={inputStyle} placeholder="e.g. 9876543210" />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-slide-in-left" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <h4 style={{ marginBottom: 'var(--space-2)', borderBottom: '1px solid rgba(134,134,139,0.2)', paddingBottom: 'var(--space-2)' }}>Appointment Details</h4>
                
                <div style={{ backgroundColor: 'rgba(94, 92, 230, 0.1)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(94, 92, 230, 0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                      <Sparkles size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> 
                      Describe your symptoms
                    </label>
                    <button type="button" onClick={handleSmartTriage} className="btn" style={{ padding: 'var(--space-2) var(--space-3)', fontSize: '0.75rem', backgroundColor: 'var(--color-primary)', color: '#fff', borderRadius: 'var(--radius-full)' }}>
                      Auto-Triage
                    </button>
                  </div>
                  <textarea name="symptoms" value={formData.symptoms} onChange={handleChange} style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} placeholder="e.g. Severe chest pain and shortness of breath..." />
                </div>
                
                <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem' }}>Department</label>
                    <select name="departmentId" required value={formData.departmentId} onChange={handleChange} style={inputStyle}>
                      <option value="">Select a department...</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem' }}>Priority</label>
                    <select name="priority" required value={formData.priority} onChange={handleChange} style={inputStyle}>
                      <option value="LOW">Low</option>
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">High</option>
                      <option value="EMERGENCY">Emergency</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem' }}>Reason for Visit (Auto-filled)</label>
                  <input type="text" name="reason" required value={formData.reason} onChange={handleChange} style={inputStyle} placeholder="Briefly describe..." />
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem' }}>Preferred Date</label>
                    <input type="date" name="preferredDate" required value={formData.preferredDate} onChange={handleChange} style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem' }}>Preferred Time</label>
                    <input type="time" name="preferredTime" value={formData.preferredTime} onChange={handleChange} style={inputStyle} />
                  </div>
                </div>

                <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-primary)' }}>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 600 }}>Medical Records / Lab Reports (Optional)</label>
                  <input type="file" onChange={handleFileUpload} accept="image/*,.pdf" style={{ width: '100%', fontSize: '0.875rem' }} />
                  {formData.attachmentUrl && (
                    <div style={{ marginTop: 'var(--space-2)', fontSize: '0.75rem', color: 'var(--color-secondary)' }}>File attached!</div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-4)' }}>
              {step === 2 ? (
                <button type="button" onClick={() => setStep(1)} className="btn btn-outline">Back</button>
              ) : <div></div>}

              <button type="submit" className="btn btn-primary shadow-hover" disabled={loading}>
                {loading ? 'Processing...' : step === 1 ? 'Next Step' : 'Confirm Booking'} 
                {!loading && step === 1 && <ArrowRight size={18} />}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: 'var(--space-3)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-text-tertiary)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-primary)'
};
