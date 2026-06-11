import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { Geolocation } from '@capacitor/geolocation';

// Helper to calculate distance in km between two sets of coordinates
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
  const [liveBooking, setLiveBooking] = useState(booking);

  // New States for maps and live telemetry tracking
  const [clinic, setClinic] = useState(null);
  const [liveTelemetry, setLiveTelemetry] = useState(null);
  const [iframeUrl, setIframeUrl] = useState('');
  const [simulationActive, setSimulationActive] = useState(false);

  // Fetch Clinic Info on Mount
  useEffect(() => {
    if (!clinicId) return;
    const fetchClinic = async () => {
      try {
        const res = await axios.get(`https://backend-nine-kappa-32.vercel.app/api/clinics/${clinicId}`);
        setClinic(res.data);
      } catch (err) {
        console.error("Failed to fetch clinic details:", err);
      }
    };
    fetchClinic();
  }, [clinicId]);

  // Compute Live Telemetry and Map Iframe URL
  useEffect(() => {
    if (!clinic || !liveBooking) return;

    try {
      const clinicCoords = clinic.location?.coordinates || [79.9864, 23.1815]; // [lng, lat]
      const clinicLat = clinicCoords[1];
      const clinicLng = clinicCoords[0];

      const patientLat = liveBooking.patientLatitude;
      const patientLng = liveBooking.patientLongitude;
      const hasPatientLocation = !!(patientLat && patientLng);

      // Fallback coordinates if location is not active yet (for initial render)
      const finalPatientLat = patientLat || (clinicLat + 0.003);
      const finalPatientLng = patientLng || (clinicLng + 0.003);

      const dist = calculateDistance(finalPatientLat, finalPatientLng, clinicLat, clinicLng);
      const etaVal = Math.max(1, Math.round((dist / 25) * 60)); // assume 25 km/h driving speed

      const initialDistance = typeof liveBooking.initialDistance === 'number' ? liveBooking.initialDistance : (liveBooking.distance || dist);
      const remainingDistance = dist;
      const distanceCovered = Math.max(0, initialDistance - remainingDistance);
      const progressPercent = initialDistance > 0 ? (distanceCovered / initialDistance) * 100 : 0;
      const clampedProgressPercent = Math.min(100, Math.max(0, progressPercent));

      setLiveTelemetry({
        patientLat: finalPatientLat,
        patientLng: finalPatientLng,
        clinicLat,
        clinicLng,
        distance: dist.toFixed(2),
        initialDistance: initialDistance.toFixed(2),
        distanceCovered: distanceCovered.toFixed(2),
        progressPercent: clampedProgressPercent.toFixed(0),
        eta: etaVal,
        active: hasPatientLocation
      });

      // Update maps directions iframe url
      let url = '';
      if (hasPatientLocation) {
        url = `https://maps.google.com/maps?saddr=${patientLat},${patientLng}&daddr=${clinicLat},${clinicLng}&t=&z=14&ie=UTF8&iwloc=B&output=embed`;
      } else {
        url = `https://maps.google.com/maps?q=${clinicLat},${clinicLng}&t=&z=14&ie=UTF8&iwloc=B&output=embed`;
      }
      setIframeUrl(url);
    } catch (e) {
      console.error("Patient telemetry processing error:", e);
    }
  }, [clinic, liveBooking]);

  // Request location permissions and start Geolocation tracking
  useEffect(() => {
    if (!booking || !clinicId) {
      alert("No active booking found. Please search for a doctor.");
      navigate('/patient');
      return;
    }

    let watchId = null;
    let lastUploadedCoords = null;
    let lastUploadTime = 0;

    (async () => {
      try {
        const permissions = await Geolocation.checkPermissions();
        if (permissions.location !== 'granted') {
          await Geolocation.requestPermissions();
        }
        
        watchId = await Geolocation.watchPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000
        }, async (position, err) => {
          if (err) {
            console.warn("watchPosition error:", err.message);
            return;
          }
          if (!position || !position.coords) return;

          // GPS jitter filter
          const accuracy = position.coords.accuracy;
          const speed = position.coords.speed; // speed in m/s
          const speedKmH = speed ? speed * 3.6 : 0;

          if (accuracy && accuracy > 40) {
            console.warn("Patient GPS update ignored: accuracy exceeds 40m limit", accuracy);
            return;
          }
          if (speedKmH > 120) {
            console.warn("Patient GPS update ignored: speed exceeds 120km/h limit", speedKmH);
            return;
          }

          const { latitude, longitude } = position.coords;
          const now = Date.now();

          // Throttling: upload location at most once every 10 seconds OR if patient moves >15 meters
          const timePassed = now - lastUploadTime > 10000;
          let movedNoticeably = true;
          if (lastUploadedCoords) {
            const dist = calculateDistance(latitude, longitude, lastUploadedCoords.lat, lastUploadedCoords.lng);
            movedNoticeably = dist > 0.015; // 15 meters
          }

          if (timePassed || movedNoticeably) {
            try {
              const locRes = await axios.put(`https://backend-nine-kappa-32.vercel.app/api/queue/location/${booking._id}`, {
                latitude,
                longitude
              });
              if (locRes.data) {
                setLiveBooking(locRes.data);
              }
              lastUploadedCoords = { lat: latitude, lng: longitude };
              lastUploadTime = now;
            } catch (locErr) {
              console.warn("Telemetry location upload error:", locErr.message);
            }
          }
        });
      } catch (err) {
        console.warn("Geolocation watch initialization failed", err);
      }
    })();

    pollQueue();
    // Reduce polling frequency to 7 seconds to conserve network resources and battery
    const interval = setInterval(pollQueue, 7000);
    
    return () => {
      if (watchId) Geolocation.clearWatch({ id: watchId });
      clearInterval(interval);
    };
  }, [booking, clinicId, navigate]);

  const pollQueue = async () => {
    try {
      // Fetch Live Queue & Stats in parallel via Promise.all to avoid HTTP waterfalls
      const [qRes, statsRes] = await Promise.all([
        axios.get(`https://backend-nine-kappa-32.vercel.app/api/queue/${clinicId}/${doctorName}?t=${Date.now()}`),
        axios.get(`https://backend-nine-kappa-32.vercel.app/api/queue/stats/${clinicId}/${doctorName}?t=${Date.now()}`)
      ]);

      setQueue(qRes.data);
      setStats(statsRes.data);

      // Find our booking in the list to retrieve the latest live data from backend calculations (avoiding a separate API call)
      const myBooking = qRes.data.find(b => b._id === booking._id);
      if (myBooking) {
        setLiveBooking(myBooking);
      }

      // If we are no longer in the queue (completed/cancelled), advance to dashboard
      const stillInQueue = qRes.data.some(b => b._id === booking._id);
      if (!stillInQueue) {
        localStorage.removeItem('activeBooking');
        
        // Fetch history to see if completed with prescription
        try {
          const patientSession = JSON.parse(localStorage.getItem('patientSession') || '{}');
          const phone = patientSession.phone || patientSession.email;
          if (phone) {
            const histRes = await axios.get(`https://backend-nine-kappa-32.vercel.app/api/queue/history/${phone}`);
            const myCompleted = histRes.data.find(b => b._id === booking._id && b.status === 'completed');
            if (myCompleted) {
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
    return queue.findIndex(b => b._id === booking._id);
  };

  const currentToken = queue.length > 0 && queue[0].status === 'current' ? queue[0].tokenNumber : (queue.length > 0 ? queue[0].tokenNumber : '--');
  const myPos = getMyPosition();
  const ahead = myPos > 0 ? myPos : 0;
  const eta = liveBooking?.estimatedWaitTime || (ahead * 15) + (stats?.delayedByMins || 0);

  const startLocationSimulation = async () => {
    if (simulationActive) return;
    setSimulationActive(true);

    try {
      const clinicCoords = clinic?.location?.coordinates || [79.9864, 23.1815]; // [lng, lat]
      const clinicLat = clinicCoords[1];
      const clinicLng = clinicCoords[0];

      // Starting point: ~1.2 km away
      const startLat = clinicLat + 0.008;
      const startLng = clinicLng + 0.008;
      let step = 0;
      const totalSteps = 15;

      const simInterval = setInterval(async () => {
        // If booking is no longer active, stop simulation
        if (!localStorage.getItem('activeBooking')) {
          clearInterval(simInterval);
          setSimulationActive(false);
          return;
        }

        const currentLat = startLat - (step * (startLat - clinicLat) / totalSteps);
        const currentLng = startLng - (step * (startLng - clinicLng) / totalSteps);

        try {
          const locRes = await axios.put(`https://backend-nine-kappa-32.vercel.app/api/queue/location/${booking._id}`, {
            latitude: currentLat,
            longitude: currentLng
          });
          if (locRes.data) {
            setLiveBooking(locRes.data);
          }
        } catch (err) {
          console.error("Patient simulation upload error", err);
        }

        step++;
        if (step > totalSteps) {
          clearInterval(simInterval);
          setSimulationActive(false);
        }
      }, 4000);
    } catch (err) {
      console.error("Patient simulation setup error", err);
      setSimulationActive(false);
    }
  };

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

        {/* Live Telemetry & Navigation Map Card */}
        <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '1.15rem', fontWeight: 900, color: 'var(--text)' }}>📍 Live Telemetry & Navigation</h3>
          
          {/* Google Maps Directions Embed */}
          <div style={{ width: '100%', height: '240px', borderRadius: '16px', background: '#f8fafc', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '14px' }}>
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
                title="Route to Clinic"
              ></iframe>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: '0.9rem' }}>
                ⏳ Initializing Map Telemetry...
              </div>
            )}
          </div>

          {/* 3-Column Stats Grid */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '16px', padding: '14px', marginBottom: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Distance</div>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text)', marginTop: '4px' }}>{liveTelemetry?.initialDistance || '--'} km</div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Covered</div>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--accent)', marginTop: '4px' }}>{liveTelemetry?.distanceCovered || '0.00'} km</div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Remaining</div>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text)', marginTop: '4px' }}>{liveTelemetry?.distance || '--'} km</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Travel ETA</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--accent)' }}>~{liveTelemetry?.eta || '--'} mins</span>
            </div>
          </div>

          {/* Zomato-Style Progress Bar */}
          <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '12px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.75rem', fontWeight: 800 }}>
              <span style={{ color: 'var(--muted)' }}>Transit Status:</span>
              <span style={{ color: 'var(--accent)' }}>
                {!liveTelemetry?.active ? 'WAITING FOR GPS' : 
                 parseFloat(liveTelemetry?.distance) < 0.1 ? 'ARRIVED AT CLINIC' : 
                 parseFloat(liveTelemetry?.distance) < 0.5 ? 'ARRIVING SOON' : `EN ROUTE (${liveTelemetry?.progressPercent || 0}%)`}
              </span>
            </div>
            <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
              <div style={{ 
                height: '100%', 
                background: 'var(--accent)', 
                width: !liveTelemetry?.active ? '0%' : `${liveTelemetry?.progressPercent || 0}%`,
                transition: 'width 0.5s ease-in-out'
              }}></div>
            </div>
          </div>

          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', fontWeight: 700, color: liveTelemetry?.active ? 'var(--accent)' : 'var(--danger)' }}>
              <span className="live-dot" style={{ background: liveTelemetry?.active ? 'var(--accent)' : 'var(--danger)', display: 'inline-block' }}></span>
              {liveTelemetry?.active ? 'GPS TRACKING ACTIVE' : 'WAITING FOR GPS SIGNAL...'}
            </div>
            
            <button 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '0.72rem', minWidth: 'auto', background: simulationActive ? '#fef3c7' : '#f1f5f9', color: simulationActive ? '#d97706' : '#475569', borderColor: simulationActive ? '#fcd34d' : '#cbd5e1' }}
              onClick={startLocationSimulation}
              disabled={simulationActive}
            >
              {simulationActive ? '🛵 Simulating...' : '🛵 Simulate Movement'}
            </button>
          </div>
        </div>

        {/* Live Token Waitlist Card */}
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
          
          {liveBooking?.travelTimeMins > 0 && (
            <div style={{ 
              marginTop: '12px', 
              background: '#f8fafc', 
              border: '1px solid var(--border)', 
              borderRadius: '12px',
              padding: '10px 14px', 
              fontSize: '0.8rem', 
              color: 'var(--muted)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              fontWeight: 600
            }}>
              🚗 <span>Travel Time: <strong>{liveBooking.travelTimeMins} mins</strong> (includes {liveBooking.trafficDelayMins} mins traffic delay)</span>
            </div>
          )}
          
          <div className="queue-list stagger-in">
            {queue.map((b, index) => {
              const isMe = b._id === booking._id;
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
