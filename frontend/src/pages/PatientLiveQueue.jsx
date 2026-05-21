import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

const PatientLiveQueue = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { booking, clinicId, doctorName } = location.state || { booking: { tokenNumber: 'T-00' }, clinicId: '1', doctorName: 'Doctor' };
  
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    fetchQueue();
    // In a real app with Firebase/WebSockets, this would be a listener. 
    // Since we're using Mongo + Node, we poll every 5 seconds.
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchQueue = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/queue/${clinicId}/${doctorName}`);
      setQueue(res.data);
    } catch (err) {
      console.error("Failed to fetch queue", err);
    }
  };

  const getMyPosition = () => {
    return queue.findIndex(b => b.tokenNumber === booking.tokenNumber);
  };

  const currentToken = queue.length > 0 && queue[0].status === 'current' ? queue[0].tokenNumber : (queue.length > 0 ? queue[0].tokenNumber : '--');
  const myPos = getMyPosition();
  const ahead = myPos > 0 ? myPos : 0;
  const eta = ahead * 6; // 6 mins per patient

  return (
    <div className="page active">
      <div className="page-body">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
          <h2 style={{margin: 0, color: 'var(--accent)', fontSize: '2rem'}}>Live Queue</h2>
          <div className="live-badge">
            <div className="live-dot"></div>LIVE
          </div>
        </div>
        <div className="queue-card">
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
          
          <div className="queue-list">
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
                    <div className="q-eta">{isCurrent ? 'In Consultation' : `~${index * 6} min wait`}</div>
                  </div>
                  <span className={`q-badge ${badgeClass}`}>{badgeText}</span>
                </div>
              );
            })}
          </div>
        </div>
        <br />
        <div style={{display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
          <button className="btn btn-primary" style={{flex: 1}} onClick={() => alert('Signal sent!')}>📡 Signal Doctor</button>
          <button className="btn btn-secondary" onClick={() => alert('Smart alerts ON!')}>🔔 Smart Alerts</button>
        </div>
      </div>
    </div>
  );
};

export default PatientLiveQueue;
