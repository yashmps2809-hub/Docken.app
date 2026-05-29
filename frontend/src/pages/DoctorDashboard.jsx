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
  const [avgWait, setAvgWait] = useState(15);
  const [rating, setRating] = useState(4.8);

  const [prescriptionModal, setPrescriptionModal] = useState({ show: false, bookingId: null, text: '' });
  const [trackingModal, setTrackingModal] = useState({ show: false, booking: null });
  const [liveTelemetry, setLiveTelemetry] = useState(null);
  const [iframeUrl, setIframeUrl] = useState('');
  const [simulationActive, setSimulationActive] = useState(false);

  useEffect(() => {
    if (!trackingModal.show || !trackingModal.booking) {
      setIframeUrl('');
      return;
    }

    let intervalId = null;
    let lastCoords = null;

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371; // km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    const updateMapAndTelemetry = async () => {
      let bookingData = null;
      try {
        const res = await axios.get(`https://backend-nine-kappa-32.vercel.app/api/queue/booking/${trackingModal.booking._id}?t=${Date.now()}`);
        bookingData = res.data;
      } catch (err) {
        console.error("Telemetry fetch error, using local fallback:", err);
        // Fallback to local booking info and doctor clinic info
        bookingData = {
          ...trackingModal.booking,
          clinicId: doctorProfile?.clinicId
        };
      }

      if (!bookingData) return;

      try {
        const isCityHealth = (typeof bookingData.clinicId === 'object' && bookingData.clinicId?.name?.toLowerCase().includes("city health")) ||
                             (doctorProfile?.clinicId?.name?.toLowerCase().includes("city health"));
        const defaultCoords = isCityHealth ? [79.9411, 23.1685] : [79.9864, 23.1815]; // fallback (City Health vs Apollo Clinic)
        
        const clinicCoords = (typeof bookingData.clinicId === 'object' && bookingData.clinicId?.location?.coordinates) || defaultCoords; // [lng, lat]
        const clinicLat = clinicCoords[1];
        const clinicLng = clinicCoords[0];

        const patientLat = bookingData.patientLatitude;
        const patientLng = bookingData.patientLongitude;
        
        const hasPatientLocation = !!(patientLat && patientLng);

        // Fallback coordinates if location is not active yet (for initial render)
        const finalPatientLat = patientLat || (clinicLat + 0.003);
        const finalPatientLng = patientLng || (clinicLng + 0.003);

        const dist = calculateDistance(finalPatientLat, finalPatientLng, clinicLat, clinicLng);
        const etaVal = Math.max(1, Math.round((dist / 30) * 60)); // assume 30 km/h driving speed

        setLiveTelemetry({
          patientLat: finalPatientLat,
          patientLng: finalPatientLng,
          clinicLat,
          clinicLng,
          distance: dist.toFixed(2),
          eta: etaVal,
          active: hasPatientLocation
        });

        // Detect if patient coordinates changed significantly to update iframe without unnecessary flickering
        const threshold = 0.00015; // ~15-20 meters
        const isDifferent = !lastCoords || 
          Math.abs(lastCoords.lat - finalPatientLat) > threshold || 
          Math.abs(lastCoords.lng - finalPatientLng) > threshold ||
          lastCoords.active !== hasPatientLocation;

        if (isDifferent) {
          let url = '';
          if (hasPatientLocation) {
            // Displays a live route directions map between starting address (patient) and destination (clinic)
            url = `https://maps.google.com/maps?saddr=${patientLat},${patientLng}&daddr=${clinicLat},${clinicLng}&t=&z=14&ie=UTF8&iwloc=B&output=embed`;
          } else {
            // Displays the clinic location with a marker
            url = `https://maps.google.com/maps?q=${clinicLat},${clinicLng}&t=&z=14&ie=UTF8&iwloc=B&output=embed`;
          }
          setIframeUrl(url);
          lastCoords = { lat: finalPatientLat, lng: finalPatientLng, active: hasPatientLocation };
        }
      } catch (innerErr) {
        console.error("Telemetry processing error:", innerErr);
      }
    };

    updateMapAndTelemetry();
    intervalId = setInterval(updateMapAndTelemetry, 4000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [trackingModal]);

  const startLocationSimulation = async (booking) => {
    if (simulationActive) return;
    setSimulationActive(true);
    
    try {
      const res = await axios.get(`https://backend-nine-kappa-32.vercel.app/api/queue/booking/${booking._id}`);
      const clinicCoords = res.data.clinicId?.location?.coordinates || [79.9864, 23.1815]; // [lng, lat]
      const clinicLat = clinicCoords[1];
      const clinicLng = clinicCoords[0];

      // Starting point: ~1.2 km away
      const startLat = clinicLat + 0.008;
      const startLng = clinicLng + 0.008;
      let step = 0;
      const totalSteps = 15;

      const simInterval = setInterval(async () => {
        if (!localStorage.getItem('doctorSession')) { // if logged out or closed dashboard, stop
          clearInterval(simInterval);
          setSimulationActive(false);
          return;
        }

        const currentLat = startLat - (step * (startLat - clinicLat) / totalSteps);
        const currentLng = startLng - (step * (startLng - clinicLng) / totalSteps);

        try {
          await axios.put(`https://backend-nine-kappa-32.vercel.app/api/queue/location/${booking._id}`, {
            latitude: currentLat,
            longitude: currentLng
          });
        } catch (err) {
          console.error("Simulation upload error", err);
        }

        step++;
        if (step > totalSteps) {
          clearInterval(simInterval);
          setSimulationActive(false);
        }
      }, 4000);
    } catch (err) {
      console.error("Simulation setup error", err);
      setSimulationActive(false);
    }
  };

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
                  <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                    <button 
                      className="btn btn-secondary ripple" 
                      style={{padding: '7px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 'auto', background: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1'}}
                      onClick={() => setTrackingModal({ show: true, booking: b })}
                    >
                      📍 Track
                    </button>
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

        {/* Tracking Map Modal */}
        {trackingModal.show && trackingModal.booking && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
          }}>
            <div className="bottom-sheet" style={{ padding: '24px', maxWidth: '450px', background: '#fff', borderTopLeftRadius: '24px', borderTopRightRadius: '24px' }}>
              <div className="bottom-sheet-handle"></div>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '1.3rem', fontWeight: 900, color: 'var(--text)' }}>📍 Live Patient Tracking</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0 0 16px 0', fontWeight: 600 }}>
                Tracking <strong>{trackingModal.booking.patientName}</strong> (Token: {trackingModal.booking.tokenNumber})
              </p>
              
              {/* Map Iframe Container */}
              <div style={{ width: '100%', height: '280px', borderRadius: '16px', background: '#f8fafc', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '16px' }}>
                {iframeUrl ? (
                  <iframe 
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    scrolling="no" 
                    marginHeight="0" 
                    marginWidth="0" 
                    style={{ border: 0 }}
                    src={iframeUrl}
                    title="Live Patient Location Map"
                  ></iframe>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 600 }}>
                    ⏳ Initializing Google Map...
                  </div>
                )}
              </div>
              
              <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '16px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Estimated Distance</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text)' }}>{liveTelemetry?.distance || '--'} km</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>ETA to Clinic</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent)' }}>~{liveTelemetry?.eta || '--'} mins</div>
                </div>
              </div>

              {/* Zomato-Style Progress Bar */}
              <div style={{ marginTop: '16px', background: '#f0fdf4', borderRadius: '12px', padding: '12px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem', fontWeight: 800 }}>
                  <span style={{ color: 'var(--muted)' }}>Tracking Status:</span>
                  <span style={{ color: 'var(--accent)' }}>
                    {!liveTelemetry?.active ? 'WAITING FOR SIGNAL' : 
                     parseFloat(liveTelemetry?.distance) < 0.1 ? 'ARRIVED AT CLINIC' : 
                     parseFloat(liveTelemetry?.distance) < 0.5 ? 'ARRIVING SOON' : 'EN ROUTE'}
                  </span>
                </div>
                <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ 
                    height: '100%', 
                    background: 'var(--accent)', 
                    width: !liveTelemetry?.active ? '25%' : 
                           parseFloat(liveTelemetry?.distance) < 0.1 ? '100%' : 
                           parseFloat(liveTelemetry?.distance) < 0.5 ? '75%' : '50%',
                    transition: 'width 0.5s ease-in-out'
                  }}></div>
                </div>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: liveTelemetry?.active ? 'var(--accent)' : 'var(--danger)' }}>
                  <span className="live-dot" style={{ background: liveTelemetry?.active ? 'var(--accent)' : 'var(--danger)', display: 'inline-block' }}></span>
                  {liveTelemetry?.active ? 'GPS SIGNAL STABLE' : 'WAITING FOR SIGNAL...'}
                </div>
                
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '6px 12px', fontSize: '0.75rem', minWidth: 'auto', background: simulationActive ? '#fef3c7' : '#f1f5f9', color: simulationActive ? '#d97706' : '#475569', borderColor: simulationActive ? '#fcd34d' : '#cbd5e1' }}
                  onClick={() => startLocationSimulation(trackingModal.booking)}
                  disabled={simulationActive}
                >
                  {simulationActive ? '🛵 Simulating...' : '🛵 Simulate Movement'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button className="btn btn-primary ripple" style={{ flex: 1 }} onClick={() => setTrackingModal({ show: false, booking: null })}>Close Tracking</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorDashboard;
