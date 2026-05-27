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

  const [todayTotal, setTodayTotal] = useState(0);
  const [totalSeen, setTotalSeen] = useState(0);
  const [avgWait, setAvgWait] = useState(5);
  const [rating, setRating] = useState(4.8);

  const [prescriptionModal, setPrescriptionModal] = useState({ show: false, bookingId: null, text: '' });

  const fetchQueue = async () => {
    if (!doctorProfile) return;
    try {
      const clinicId = typeof doctorProfile.clinicId === 'object' ? doctorProfile.clinicId._id : doctorProfile.clinicId;
      const res = await axios.get(`https://backend-nine-kappa-32.vercel.app/api/queue/${clinicId}/${doctorProfile.name}?t=${Date.now()}`);
      setQueue(res.data);

      const statsRes = await axios.get(`https://backend-nine-kappa-32.vercel.app/api/queue/stats/${clinicId}/${doctorProfile.name}?t=${Date.now()}`);
      setTodayTotal(statsRes.data.totalToday);
      setTotalSeen(statsRes.data.totalPatientsSeen);
      setAvgWait(statsRes.data.averageWaitTime);
      setRating(statsRes.data.rating);
    } catch (err) {
      console.error("Failed to fetch queue", err);
    }
  };

  const handleOpenPrescription = (bookingId) => {
    setPrescriptionModal({ show: true, bookingId, text: '' });
  };

  const handleNext = async () => {
    if (!prescriptionModal.bookingId) return;
    try {
      // 1. Save prescription if any
      if (prescriptionModal.text.trim()) {
        await axios.put(`https://backend-nine-kappa-32.vercel.app/api/queue/prescription/${prescriptionModal.bookingId}`, { 
          prescription: prescriptionModal.text 
        });
      }
      // 2. Mark as completed and advance queue
      await axios.put(`https://backend-nine-kappa-32.vercel.app/api/queue/next/${prescriptionModal.bookingId}`, { status: 'completed' });
      setPrescriptionModal({ show: false, bookingId: null, text: '' });
      fetchQueue();
    } catch (err) {
      alert('Error advancing queue');
    }
  };

  const toggleQueueLive = async () => {
    if (!doctorProfile) return;
    try {
      const res = await axios.put(`https://backend-nine-kappa-32.vercel.app/api/doctors/${doctorProfile._id}/toggle`);
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

  const handleLogout = () => {
    localStorage.removeItem('doctorSession');
    navigate('/login/doctor');
  };

  return (
    <div className="page active">
      <div className="page-body">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
          <div>
            <h2 style={{margin: 0, color: 'var(--accent)', fontSize: '2rem'}}>Welcome, {doctorProfile?.name}</h2>
            <div className="live-badge" style={{marginTop: '10px'}}>
              <div className="live-dot"></div>{isLive ? 'LIVE' : 'OFFLINE'}
            </div>
          </div>
          <button className="btn btn-secondary" style={{padding: '8px 16px', fontSize: '0.9rem'}} onClick={handleLogout}>Logout</button>
        </div>
        
        <div className="section-label" style={{marginBottom: '14px'}}>// ANALYTICS</div>
        <div className="stats-grid stagger-in">
          <div className="stat-card"><div className="s-num">{todayTotal}</div><div className="s-label">Today's Patients</div></div>
          <div className="stat-card"><div className="s-num">{queue.length}</div><div className="s-label">In Queue Now</div></div>
          <div className="stat-card"><div className="s-num">{rating}⭐</div><div className="s-label">Avg Rating</div></div>
          <div className="stat-card"><div className="s-num">{totalSeen}</div><div className="s-label">All-time Patients</div></div>
        </div>

        <div className="section-label" style={{marginBottom: '14px', marginTop: '20px'}}>// QUEUE CONTROLS</div>
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
        <div className="toggle-row" style={{marginTop: '15px'}}>
          <div className="toggle-info">
            <div className="toggle-label">Broadcast Delay</div>
            <div className="toggle-desc">Inform queue about emergencies</div>
          </div>
          <select 
            style={{padding: '5px', borderRadius: '5px', border: '1px solid #ccc'}}
            onChange={async (e) => {
              const mins = Number(e.target.value);
              try {
                await axios.put(`https://backend-nine-kappa-32.vercel.app/api/doctors/${doctorProfile._id}/delay`, { delayedByMins: mins });
                alert(`Broadcasted delay of ${mins} mins`);
              } catch (err) { alert('Failed to broadcast delay'); }
            }}
          >
            <option value="0">On Time</option>
            <option value="15">+15 Mins</option>
            <option value="30">+30 Mins</option>
            <option value="60">+1 Hour</option>
          </select>
        </div>
        
        <br />
        <div className="section-label" style={{marginBottom: '14px'}}>// LIVE QUEUE</div>
        <div className="queue-card glass-card">
          <div className="queue-list" style={{padding: '12px'}}>
            {queue.length === 0 && <p style={{color: '#9ca3af', padding: '10px'}}>{isLive ? 'Queue is empty.' : 'Go Live to accept patients.'}</p>}
            
            {queue.map((b, index) => {
              const isCurrent = b.status === 'current';
              return (
                <div key={b._id} className={`queue-row ${isCurrent ? 'current' : ''}`}>
                  <div>
                    <div className="q-token">
                      {b.tokenNumber} · {b.patientName} 
                      <span style={{fontSize: '0.7rem', color: 'var(--muted)', marginLeft: '10px'}}>
                        Booked: {new Date(b.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <div className="q-eta">
                      {isCurrent ? 'In Consultation' : `ETA: ${index * avgWait} min`}
                      {b.distance ? ` · ${b.distance} km away` : ''}
                    </div>
                  </div>
                  <div style={{display: 'flex', gap: '8px'}}>
                    {isCurrent ? (
                      <button className="btn btn-primary ripple" style={{padding: '7px 14px', fontSize: '0.75rem'}} onClick={() => handleOpenPrescription(b._id)}>Consultation Complete</button>
                    ) : (
                      <button className="btn btn-ghost ripple" style={{padding: '7px 12px', fontSize: '0.75rem'}} onClick={() => alert(`Skipped ${b.tokenNumber}`)}>Skip</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Prescription Modal */}
        {prescriptionModal.show && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
          }}>
            <div className="bottom-sheet" style={{padding: '20px'}}>
              <div className="bottom-sheet-handle"></div>
              <h3>Write Prescription / Notes</h3>
              <p style={{fontSize: '0.8rem', color: 'gray'}}>This will be securely saved to the patient's history.</p>
              <textarea 
                style={{width: '100%', height: '100px', padding: '10px', marginTop: '10px', border: '1px solid #ddd', borderRadius: '8px'}}
                placeholder="Rx: Paracetamol 500mg, 1-0-1 for 3 days..."
                value={prescriptionModal.text}
                onChange={e => setPrescriptionModal({...prescriptionModal, text: e.target.value})}
              ></textarea>
              <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                <button className="btn btn-secondary" style={{flex: 1}} onClick={() => setPrescriptionModal({ show: false, bookingId: null, text: '' })}>Cancel</button>
                <button className="btn btn-primary" style={{flex: 1}} onClick={handleNext}>Finish</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorDashboard;
