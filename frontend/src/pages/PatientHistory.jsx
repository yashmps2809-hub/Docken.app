import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const PatientHistory = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [patientSession, setPatientSession] = useState(() => {
    const saved = localStorage.getItem('patientSession');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (!patientSession) {
      alert("Please login first to view your history");
      navigate('/login/patient');
      return;
    }
    
    const fetchHistory = async () => {
      // Try phone first, then email as fallback identifier
      const identifier = patientSession.phone || patientSession.email;
      if (!identifier) {
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`https://backend-nine-kappa-32.vercel.app/api/queue/history/${identifier}`);
        setHistory(res.data);
      } catch (err) {
        console.error("Failed to fetch history", err);
      }
      setLoading(false);
    };
    
    fetchHistory();
  }, [patientSession, navigate]);

  return (
    <div className="page active">
      <div className="page-body">
        <div className="slide-up">
          <h2 style={{margin: '0 0 6px 0', color: 'var(--accent)', fontSize: '1.8rem'}}>Medical History</h2>
          <p style={{color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '20px'}}>Your past appointments and prescriptions</p>
        </div>
        
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="skeleton skeleton-card"></div>
            <div className="skeleton skeleton-card"></div>
            <div className="skeleton skeleton-card"></div>
          </div>
        ) : history.length === 0 ? (
          <div className="glass-card" style={{padding: '30px', textAlign: 'center'}}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📭</div>
            <p style={{ color: 'var(--muted)', fontWeight: 600 }}>No past appointments found.</p>
            <button className="btn btn-primary ripple" style={{marginTop: '12px'}} onClick={() => navigate('/patient')}>Find a Doctor</button>
          </div>
        ) : (
          <div className="stagger-in" style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
            {history.map(booking => (
              <div key={booking._id} className="glass-card haptic-press" style={{padding: '16px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px'}}>
                  <div>
                    <h3 style={{margin: '0 0 4px 0', fontSize: '1.1rem', color: 'var(--text)'}}>Dr. {booking.doctorName}</h3>
                    <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600}}>
                      {new Date(booking.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' at '}
                      {new Date(booking.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      {' · '}{booking.tokenNumber}
                    </p>
                  </div>
                  <span style={{ 
                    fontSize: '0.7rem', fontWeight: 800, 
                    color: booking.status === 'completed' ? 'var(--accent)' : 'var(--danger)', 
                    background: booking.status === 'completed' ? '#f0fdf4' : '#fef2f2',
                    padding: '4px 10px', borderRadius: '8px', textTransform: 'uppercase'
                  }}>
                    {booking.status === 'completed' ? '✅ Done' : '❌ Cancelled'}
                  </span>
                </div>
                
                {booking.status === 'completed' && booking.prescription ? (
                  <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '14px', border: '2px dashed var(--accent)', marginTop: '6px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent)', marginBottom: '6px', textTransform: 'uppercase' }}>💊 Prescription</div>
                    <div style={{ color: 'var(--text)', fontSize: '0.88rem', fontWeight: 600, whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                      {booking.prescription}
                    </div>
                  </div>
                ) : booking.status === 'completed' ? (
                  <p style={{fontSize: '0.82rem', color: 'var(--muted)', fontStyle: 'italic', margin: '6px 0 0'}}>No prescription provided.</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
        
        <br />
        <button className="btn btn-secondary ripple" style={{width: '100%'}} onClick={() => navigate('/patient/dashboard')}>← Back to Dashboard</button>
      </div>
    </div>
  );
};

export default PatientHistory;

