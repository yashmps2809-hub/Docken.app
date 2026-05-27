import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { Geolocation } from '@capacitor/geolocation';

const PatientLiveQueue = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [bookingState, setBookingState] = useState(() => {
    if (location.state) return location.state;
    const saved = localStorage.getItem('activeBooking');
    return saved ? JSON.parse(saved) : { booking: null, clinicId: null, doctorName: null };
  });
  
  const { booking, clinicId, doctorName } = bookingState;
  
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!booking || !clinicId) {
      alert("No active booking found. Please search for a doctor.");
      navigate('/patient');
      return;
    }

    // Request permissions once on mount
    (async () => {
      try {
        const permissions = await Geolocation.checkPermissions();
        if (permissions.location !== 'granted') {
          await Geolocation.requestPermissions();
        }
      } catch (err) {
        console.warn("Location permission check failed", err);
      }
    })();

    pollQueue();
    const interval = setInterval(pollQueue, 5000);
    return () => clearInterval(interval);
  }, [booking, clinicId, navigate]);

  const pollQueue = async () => {
    try {
      // 1. Fetch Live Queue & Stats
      const qRes = await axios.get(`https://backend-nine-kappa-32.vercel.app/api/queue/${clinicId}/${doctorName}?t=${Date.now()}`);
      setQueue(qRes.data);
      const statsRes = await axios.get(`https://backend-nine-kappa-32.vercel.app/api/queue/stats/${clinicId}/${doctorName}?t=${Date.now()}`);
      setStats(statsRes.data);

      // 2. Fetch and upload live location coordinates
      try {
        const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        const { latitude, longitude } = position.coords;
        await axios.put(`https://backend-nine-kappa-32.vercel.app/api/queue/location/${booking._id}`, {
          latitude,
          longitude
        });
      } catch (locErr) {
        console.warn("Telemetry location error:", locErr.message);
      }
      
      // If we are no longer in the queue (completed/cancelled), show result
      const stillInQueue = qRes.data.some(b => b.tokenNumber === booking.tokenNumber);
      if (!stillInQueue) {
        localStorage.removeItem('activeBooking');
        
        // Fetch our booking to check if it was completed (with prescription)
        try {
          const patientSession = JSON.parse(localStorage.getItem('patientSession') || '{}');
          const phone = patientSession.phone || patientSession.email;
          if (phone) {
            const histRes = await axios.get(`https://backend-nine-kappa-32.vercel.app/api/queue/history/${phone}`);
            const myCompleted = histRes.data.find(b => b.tokenNumber === booking.tokenNumber && b.status === 'completed');
            if (myCompleted) {
              // Store the completed consultation to show on dashboard
              localStorage.setItem('justCompleted', JSON.stringify(myCompleted));
              navigate('/patient/dashboard');
              return;
            }
          }
        } catch (e) { console.log('Could not fetch completion status'); }
        
        navigate('/patient/dashboard');
      }
    } catch (err) {
      console.error("Failed to fetch queue", err);
    }
  };

  const getMyPosition = () => {
    if (!booking) return -1;
    return queue.findIndex(b => b.tokenNumber === booking.tokenNumber);
  };

  const currentToken = queue.length > 0 && queue[0].status === 'current' ? queue[0].tokenNumber : (queue.length > 0 ? queue[0].tokenNumber : '--');
  const myPos = getMyPosition();
  const ahead = myPos > 0 ? myPos : 0;
  const eta = (ahead * 15) + (stats?.delayedByMins || 0);

  const handleCancel = async () => {
    if (window.confirm("Are you sure you want to cancel your appointment?")) {
      try {
        await axios.put(`https://backend-nine-kappa-32.vercel.app/api/queue/cancel/${booking._id}`);
        localStorage.removeItem('activeBooking');
        alert("Booking cancelled.");
        navigate('/patient/dashboard');
      } catch (err) {
        alert("Failed to cancel booking.");
      }
    }
  };

  return (
    <div className="page active">
      <div className="page-body">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
          <h2 style={{margin: 0, color: 'var(--accent)', fontSize: '2rem'}}>Live Queue</h2>
          <div className="live-badge">
            <div className="live-dot"></div>LIVE
          </div>
        </div>
        
        {stats?.delayedByMins > 0 && (
          <div style={{background: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px'}}>
            ⚠️ <strong>Delay Notice:</strong> The doctor is running approximately {stats.delayedByMins} mins late.
          </div>
        )}

        <div className="queue-card glass-card">
          <div className="queue-header">
            <div>
              <div style={{fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '4px', fontFamily: "'JetBrains Mono', monospace"}}>YOUR TOKEN</div>
              <div className="queue-num">{booking.tokenNumber}</div>
              <div className="queue-label">{doctorName}</div>
            </div>
            <div style={{textAlign: 'right'}}>
              <div style={{fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '4px'}}>EST. WAIT</div>
              <div style={{fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', color: 'var(--warn)'}}>~{eta} min</div>
              <div style={{fontSize: '0.75rem', color: 'var(--muted)'}}>{ahead} ahead of you</div>
            </div>
          </div>
          
          <div className="queue-list stagger-in">
            {queue.map((b, index) => {
              const isMe = b.tokenNumber === booking.tokenNumber;
              const isCurrent = b.status === 'current';
              
              let badgeClass = 'badge-muted';
              let badgeText = 'WAITING';
              if (isCurrent) { badgeClass = 'badge-green'; badgeText = 'CURRENT'; }
              else if (isMe) { badgeClass = 'badge-blue'; badgeText = 'MY TURN'; }
              
              return (
                <div key={b._id} className={`queue-row ${isCurrent ? 'current' : ''} ${isMe ? 'mine' : ''}`}>
                  <div>
                    <div className="q-token">{b.tokenNumber} {isMe && '← YOU'}</div>
                    <div className="q-eta">{isCurrent ? 'In Consultation' : `~${index * 15} min wait`}</div>
                  </div>
                  <span className={`q-badge ${badgeClass}`}>{badgeText}</span>
                </div>
              );
            })}
          </div>
        </div>
        <br />
        <div style={{display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
          <button className="btn btn-primary ripple" style={{flex: 1}} onClick={() => alert('Signal sent!')}>📡 Signal Doctor</button>
          <button className="btn btn-secondary ripple" style={{flex: 1}} onClick={handleCancel}>❌ Cancel Booking</button>
        </div>
      </div>
    </div>
  );
};

export default PatientLiveQueue;
