import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [doctorProfile, setDoctorProfile] = useState(() => {
    if (location.state?.doctor) return location.state.doctor;
    const saved = localStorage.getItem('doctorSession');
    return saved ? JSON.parse(saved) : null;
  });

  const [queue, setQueue] = useState([]);
  const [isLive, setIsLive] = useState(doctorProfile ? doctorProfile.isLive : false);
  const [isBreak, setIsBreak] = useState(false);

  useEffect(() => {
    if (!doctorProfile) {
      navigate('/login/doctor');
      return;
    }
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [doctorProfile]);

  const fetchQueue = async () => {
    if (!doctorProfile) return;
    try {
      const res = await axios.get(`http://localhost:5000/api/queue/${doctorProfile.clinicId}/${doctorProfile.name}`);
      setQueue(res.data);
    } catch (err) {
      console.error("Failed to fetch queue", err);
    }
  };

  const handleNext = async (bookingId) => {
    try {
      await axios.put(`http://localhost:5000/api/queue/next/${bookingId}`, { status: 'completed' });
      fetchQueue();
    } catch (err) {
      alert('Error advancing queue');
    }
  };

  const toggleQueueLive = async () => {
    if (!doctorProfile) return;
    try {
      const res = await axios.put(`http://localhost:5000/api/doctors/${doctorProfile._id}/toggle`);
      setIsLive(res.data.isLive);
      // Update local storage
      const updatedProfile = { ...doctorProfile, isLive: res.data.isLive };
      setDoctorProfile(updatedProfile);
      localStorage.setItem('doctorSession', JSON.stringify(updatedProfile));
      alert(`Queue is now ${res.data.isLive ? 'LIVE' : 'CLOSED'}`);
    } catch (err) {
      alert('Failed to toggle queue state. Are you sure you are registered?');
    }
  };

  const ToggleSwitch = ({ label, desc, active, onClick }) => (
    <div className="toggle-row">
      <div className="toggle-info">
        <div className="toggle-label">{label}</div>
        <div className="toggle-desc">{desc}</div>
      </div>
      <div className={`toggle ${active ? 'on' : ''}`} onClick={onClick}></div>
    </div>
  );

  return (
    <div className="page active">
      <div className="page-body">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
          <h2 style={{margin: 0, color: 'var(--accent)', fontSize: '2rem'}}>Welcome, {doctorProfile?.name}</h2>
          <div className="live-badge">
            <div className="live-dot"></div>{isLive ? 'LIVE' : 'OFFLINE'}
          </div>
        </div>
        <div className="stats-grid">
          <div className="stat-card"><div className="s-num">12</div><div className="s-label">Today's Patients</div></div>
          <div className="stat-card"><div className="s-num">{queue.length}</div><div className="s-label">In Queue Now</div></div>
          <div className="stat-card"><div className="s-num">{doctorProfile?.rating}⭐</div><div className="s-label">Avg Rating</div></div>
        </div>

        <div className="section-label" style={{marginBottom: '14px'}}>// QUEUE CONTROLS</div>
        <ToggleSwitch 
          label="Go Live" 
          desc="Open queue — patients can join" 
          active={isLive} 
          onClick={toggleQueueLive} 
        />
        <ToggleSwitch 
          label="Take a Break" 
          desc="Pause — all patients auto notified" 
          active={isBreak} 
          onClick={() => { setIsBreak(!isBreak); alert(`Break mode ${!isBreak ? 'ON' : 'OFF'}`); }} 
        />
        
        <br />
        <div className="section-label" style={{marginBottom: '14px'}}>// LIVE QUEUE</div>
        <div className="queue-card">
          <div className="queue-list" style={{padding: '12px'}}>
            {queue.length === 0 && <p style={{color: '#9ca3af', padding: '10px'}}>{isLive ? 'Queue is empty.' : 'Go Live to accept patients.'}</p>}
            
            {queue.map((b, index) => {
              const isCurrent = index === 0;
              return (
                <div key={b._id} className={`queue-row ${isCurrent ? 'current' : ''}`}>
                  <div>
                    <div className="q-token">
                      {b.tokenNumber} · {b.patientName} 
                      <span style={{fontSize: '0.7rem', color: 'var(--muted)', marginLeft: '10px'}}>
                        Booked: {new Date(b.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <div className="q-eta">{isCurrent ? 'In Consultation · ~5 min' : `ETA: ${index * 6} min · Nearby`}</div>
                  </div>
                  <div style={{display: 'flex', gap: '8px'}}>
                    {isCurrent ? (
                      <button className="btn btn-primary" style={{padding: '7px 14px', fontSize: '0.75rem'}} onClick={() => handleNext(b._id)}>Next</button>
                    ) : (
                      <button className="btn btn-ghost" style={{padding: '7px 12px', fontSize: '0.75rem'}} onClick={() => alert(`Skipped ${b.tokenNumber}`)}>Skip</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
