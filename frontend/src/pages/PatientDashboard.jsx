import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const SkeletonLoader = () => (
  <div style={{ padding: '20px' }}>
    <div className="skeleton skeleton-title"></div>
    <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>
    <div className="skeleton skeleton-text" style={{ width: '50%' }}></div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px' }}>
      <div className="skeleton skeleton-card"></div>
      <div className="skeleton skeleton-card"></div>
    </div>
    <div className="skeleton skeleton-card" style={{ marginTop: '16px' }}></div>
  </div>
);

const PatientDashboard = () => {
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [activeBooking, setActiveBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [justCompleted, setJustCompleted] = useState(null);
  const [pastAppointments, setPastAppointments] = useState([]);

  useEffect(() => {
    (async () => {
      const session = localStorage.getItem('patientSession');
      if (!session) {
        navigate('/login/patient');
        return;
      }
      const patientData = JSON.parse(session);
      setPatient(patientData);

      // Check for active booking
      const savedBooking = localStorage.getItem('activeBooking');
      if (savedBooking) {
        const parsed = JSON.parse(savedBooking);
        try {
          const liveRes = await axios.get(`https://backend-nine-kappa-32.vercel.app/api/queue/booking/${parsed.booking._id}?t=${Date.now()}`);
          if (liveRes.data) {
            const updatedState = {
              ...parsed,
              booking: liveRes.data
            };
            if (['completed', 'cancelled'].includes(liveRes.data.status)) {
              localStorage.removeItem('activeBooking');
              setActiveBooking(null);
            } else {
              localStorage.setItem('activeBooking', JSON.stringify(updatedState));
              setActiveBooking(updatedState);
            }
          }
        } catch (err) {
          console.warn("Error verifying active booking:", err.message);
          setActiveBooking(parsed);
        }
      }

      // Check if user just finished a consultation (redirected from LiveQueue)
      const completed = localStorage.getItem('justCompleted');
      if (completed) {
        setJustCompleted(JSON.parse(completed));
        localStorage.removeItem('justCompleted');
      }

      // Fetch past appointment history
      const phone = patientData.phone || patientData.email;
      if (phone) {
        try {
          const histRes = await axios.get(`https://backend-nine-kappa-32.vercel.app/api/queue/history/${phone}`);
          if (histRes.data && histRes.data.length > 0) {
            setPastAppointments(histRes.data.slice(0, 5)); // Show last 5
          }
        } catch (e) { console.log('No history found'); }
      }

      setTimeout(() => setLoading(false), 500);
    })();
  }, [navigate]);

  useEffect(() => {
    if (!activeBooking?.booking?._id) return;
    
    const bookingId = activeBooking.booking._id;

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`https://backend-nine-kappa-32.vercel.app/api/queue/booking/${bookingId}?t=${Date.now()}`);
        if (res.data) {
          if (['completed', 'cancelled'].includes(res.data.status)) {
            localStorage.removeItem('activeBooking');
            setActiveBooking(null);
          } else {
            setActiveBooking(prev => {
              if (!prev) return null;
              const updated = {
                ...prev,
                booking: res.data
              };
              localStorage.setItem('activeBooking', JSON.stringify(updated));
              return updated;
            });
          }
        }
      } catch (err) {
        console.warn("Error polling active booking:", err.message);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [activeBooking?.booking?._id]);

  const handleCancelBooking = async () => {
    try {
      await axios.put(`https://backend-nine-kappa-32.vercel.app/api/queue/cancel/${activeBooking.booking._id}`);
      localStorage.removeItem('activeBooking');
      setActiveBooking(null);
      setShowCancelSheet(false);
      alert("Booking cancelled successfully.");
    } catch (err) {
      alert("Failed to cancel booking.");
    }
  };

  const handleResumeBooking = () => {
    navigate('/patient/queue');
  };

  const dismissCompleted = () => {
    setJustCompleted(null);
  };

  if (!patient) return null;
  if (loading) return <div className="page active"><div className="page-body"><SkeletonLoader /></div></div>;

  return (
    <div className="page active">
      <div className="page-body">
        
        {/* Header Greeting */}
        <div className="slide-up" style={{ marginBottom: '24px' }}>
          <h1 className="main-title" style={{ fontSize: '2.2rem', color: 'var(--text)', margin: 0, fontWeight: 900 }}>
            Hello, <span style={{ color: 'var(--accent)' }}>{patient.name}</span> 👋
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '1rem', fontWeight: 600, marginTop: '5px' }}>
            What would you like to do today?
          </p>
        </div>

        {/* 🎉 CONSULTATION JUST FINISHED BANNER */}
        {justCompleted && (
          <div className="slide-up" style={{ marginBottom: '24px' }}>
            <div className="glass-card" style={{ padding: '20px', border: '3px solid var(--accent)', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🎉</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>CONSULTATION COMPLETE</div>
                  <h3 style={{ fontSize: '1.3rem', margin: '6px 0', color: 'var(--text)' }}>Dr. {justCompleted.doctorName}</h3>
                  <div style={{ color: 'var(--muted)', fontSize: '0.82rem', fontWeight: 600 }}>
                    {new Date(justCompleted.completedAt || justCompleted.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <button onClick={dismissCompleted} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
              </div>

              {/* Prescription from doctor */}
              {justCompleted.prescription ? (
                <div style={{ background: '#fff', borderRadius: '12px', padding: '14px', border: '2px dashed var(--accent)', marginTop: '14px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', marginBottom: '6px', textTransform: 'uppercase' }}>💊 Doctor's Prescription</div>
                  <div style={{ color: 'var(--text)', fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {justCompleted.prescription}
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--muted)', fontSize: '0.85rem', fontStyle: 'italic', marginTop: '10px' }}>
                  No prescription was provided for this visit.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active Booking Widget */}
        {activeBooking && (
          <div className="glass-card pulse-glow slide-up" style={{ padding: '22px', marginBottom: '24px', border: '3px solid var(--accent)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>ACTIVE APPOINTMENT</div>
                <h2 style={{ fontSize: '1.4rem', margin: '4px 0', color: 'var(--text)' }}>Dr. {activeBooking.doctorName}</h2>
                <div style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '0.9rem' }}>Token: <span style={{ fontWeight: 900, color: 'var(--accent)', fontSize: '1.1rem' }}>{activeBooking.booking.tokenNumber}</span></div>
                <div style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '0.85rem', marginTop: '6px' }}>Est. Wait: <span style={{ fontWeight: 900, color: 'var(--warn)', fontSize: '0.95rem' }}>~{activeBooking.booking.estimatedWaitTime || 15} mins</span></div>
                {activeBooking.booking.travelTimeMins > 0 && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🚗 Travel: {activeBooking.booking.travelTimeMins} mins (inc. {activeBooking.booking.trafficDelayMins}m delay)
                  </div>
                )}
              </div>
              <div className="live-badge" style={{ transform: 'none' }}>
                <div className="live-dot"></div> LIVE
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary ripple" style={{ flex: 1 }} onClick={handleResumeBooking}>🚀 Resume Queue</button>
              <button className="btn btn-secondary ripple" style={{ flex: 1, background: '#fff', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => setShowCancelSheet(true)}>❌ Cancel</button>
            </div>
          </div>
        )}

        {/* Quick Actions Grid */}
        <div className="doctor-grid stagger-in">
          <div className="doctor-card glass-card haptic-press" style={{ textAlign: 'center', padding: '28px 18px', cursor: 'pointer' }} onClick={() => navigate('/patient')}>
            <div className="doc-avatar" style={{ margin: '0 auto 14px', background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)', fontSize: '1.5rem' }}>
              🔍
            </div>
            <div className="doc-name" style={{ fontSize: '1.05rem' }}>Find a Doctor</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.82rem', fontWeight: 600, marginTop: '6px' }}>Search clinics & book appointments</div>
          </div>

          <div className="doctor-card glass-card haptic-press" style={{ textAlign: 'center', padding: '28px 18px', cursor: 'pointer' }} onClick={() => navigate('/patient/history')}>
            <div className="doc-avatar" style={{ margin: '0 auto 14px', background: 'linear-gradient(135deg, #a855f7, #8b5cf6)', fontSize: '1.5rem' }}>
              📜
            </div>
            <div className="doc-name" style={{ fontSize: '1.05rem' }}>My History</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.82rem', fontWeight: 600, marginTop: '6px' }}>Past appointments & prescriptions</div>
          </div>
        </div>

        {/* Past Appointments */}
        {pastAppointments.length > 0 && (
          <div className="slide-up" style={{ marginTop: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div className="section-label" style={{ marginBottom: 0 }}>// RECENT APPOINTMENTS</div>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate('/patient/history')}>View All →</span>
            </div>
            <div className="stagger-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pastAppointments.map(appt => (
                <div key={appt._id} className="glass-card haptic-press" style={{ padding: '16px', cursor: 'pointer' }} onClick={() => navigate('/patient/history')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>Dr. {appt.doctorName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600, marginTop: '2px' }}>
                        {new Date(appt.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}
                        {appt.tokenNumber}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {appt.prescription && <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent)', background: '#f0fdf4', padding: '3px 8px', borderRadius: '6px' }}>💊 Rx</span>}
                      <span style={{ 
                        fontSize: '0.7rem', fontWeight: 800, 
                        color: appt.status === 'completed' ? 'var(--accent)' : 'var(--danger)', 
                        background: appt.status === 'completed' ? '#f0fdf4' : '#fef2f2',
                        padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase'
                      }}>
                        {appt.status === 'completed' ? '✅ Done' : '❌ Cancelled'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cancel Bottom Sheet */}
        {showCancelSheet && (
          <>
            <div className="bottom-sheet-overlay" onClick={() => setShowCancelSheet(false)}></div>
            <div className="bottom-sheet">
              <div className="bottom-sheet-handle"></div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text)', marginBottom: '8px' }}>Cancel Appointment?</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                This will remove you from Dr. {activeBooking?.doctorName}'s queue. You'll lose your spot.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary ripple" style={{ flex: 1 }} onClick={() => setShowCancelSheet(false)}>Keep Booking</button>
                <button className="btn btn-primary ripple" style={{ flex: 1, background: 'var(--danger)', boxShadow: '4px 4px 0px rgba(204, 37, 42, 0.6)' }} onClick={handleCancelBooking}>Yes, Cancel</button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default PatientDashboard;
