import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const QueueMonitor = () => {
  const { clinicId } = useParams();
  const navigate = useNavigate();
  const [clinic, setClinic] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [queues, setQueues] = useState({}); // doctorName -> activeQueue
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const prevServingTokensRef = useRef({}); // doctorName -> currentServingToken

  // Digital Clock Update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Clinic and Doctors List
  useEffect(() => {
    const fetchClinicData = async () => {
      try {
        setLoading(true);
        // Get Clinic details
        try {
          const clinicRes = await axios.get(`https://backend-nine-kappa-32.vercel.app/api/clinics/${clinicId}`);
          setClinic(clinicRes.data);
        } catch (err) {
          console.warn("Could not fetch clinic name, using fallback.", err);
        }

        // Get Doctors of this clinic
        const docsRes = await axios.get(`https://backend-nine-kappa-32.vercel.app/api/doctors/clinic/${clinicId}`);
        setDoctors(docsRes.data);
        setLoading(false);
      } catch (err) {
        console.error("Error loading monitor data:", err);
        setError("Failed to load clinic monitor. Please check your network connection.");
        setLoading(false);
      }
    };
    fetchClinicData();
  }, [clinicId]);

  // Synthesis Voice Announcer & Synth Chime
  const playAnnouncement = (doctorName, tokenNumber) => {
    if (!audioEnabled) return;

    try {
      // 1. Play Synthesized Chime (Ding-Dong)
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(783.99, audioCtx.currentTime); // G5 note
      gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.5);

      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.22); // E5 note
      gain2.gain.setValueAtTime(0, audioCtx.currentTime);
      gain2.gain.setValueAtTime(0.08, audioCtx.currentTime + 0.22);
      gain2.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.75);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(audioCtx.currentTime + 0.22);
      osc2.stop(audioCtx.currentTime + 0.75);

      // 2. Play Text to Speech after chime finishes
      setTimeout(() => {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel(); // stop current speech
          const text = `Token number ${tokenNumber}, please proceed to Dr. ${doctorName}'s cabin.`;
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          
          // Select a good voice if possible
          const voices = window.speechSynthesis.getVoices();
          const femaleVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Female') || v.name.includes('Zira')));
          if (femaleVoice) {
            utterance.voice = femaleVoice;
          }
          
          window.speechSynthesis.speak(utterance);
        }
      }, 750);
    } catch (e) {
      console.error("Announcement error:", e);
    }
  };

  // Poll Queues in Parallel every 5 seconds
  useEffect(() => {
    if (doctors.length === 0) return;

    const pollQueues = async () => {
      const newQueues = {};
      const promises = doctors.map(async (doc) => {
        try {
          const res = await axios.get(`https://backend-nine-kappa-32.vercel.app/api/queue/${clinicId}/${doc.name}`);
          newQueues[doc.name] = res.data;
        } catch (err) {
          console.error(`Error polling queue for Dr. ${doc.name}:`, err);
          newQueues[doc.name] = [];
        }
      });

      await Promise.all(promises);
      setQueues(newQueues);

      // Check for token changes and trigger voice announcements
      doctors.forEach((doc) => {
        const docQueue = newQueues[doc.name] || [];
        const currentServing = docQueue.find(b => b.status === 'current');
        const currentToken = currentServing ? currentServing.tokenNumber : null;
        
        const prevToken = prevServingTokensRef.current[doc.name];
        
        if (currentToken && currentToken !== prevToken) {
          // Trigger voice announcement
          playAnnouncement(doc.name, currentToken);
        }
        
        // Update ref
        prevServingTokensRef.current[doc.name] = currentToken;
      });
    };

    pollQueues(); // initial call
    const interval = setInterval(pollQueues, 5000);
    return () => clearInterval(interval);
  }, [doctors, clinicId, audioEnabled]);

  // Load voices list (safari/chrome load voices asynchronously)
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  if (loading) {
    return (
      <div style={styles.monitorContainer}>
        <div style={styles.loader}>Loading Live Monitor Display...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.monitorContainer}>
        <div style={styles.errorCard}>
          <h2>⚠️ Monitor Error</h2>
          <p>{error}</p>
          <button style={styles.backBtn} onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.monitorContainer}>
      {/* Top TV Bar */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.liveIndicator}>
            <span style={styles.liveDot}></span>
            <span>LIVE TV MONITOR</span>
          </div>
          <h1 style={styles.clinicTitle}>{clinic ? clinic.name : 'Docken Medical Center'}</h1>
        </div>
        
        <div style={styles.headerRight}>
          <button 
            style={{
              ...styles.audioToggleBtn,
              background: audioEnabled ? '#10b981' : '#4b5563',
              boxShadow: audioEnabled ? '0 0 15px rgba(16, 185, 129, 0.4)' : 'none'
            }}
            onClick={() => setAudioEnabled(!audioEnabled)}
          >
            {audioEnabled ? '🔈 Sound: ON (Click to Mute)' : '🔇 Sound: OFF (Click to Enable)'}
          </button>
          <div style={styles.clockBox}>
            <div style={styles.timeStr}>
              {currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div style={styles.dateStr}>
              {currentTime.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>
      </header>

      {/* Grid of Doctor TV Cards */}
      <main style={styles.mainGrid}>
        {doctors.length === 0 ? (
          <div style={styles.emptyMsg}>No doctors registered at this clinic yet.</div>
        ) : (
          doctors.map((doc) => {
            const docQueue = queues[doc.name] || [];
            const currentServing = docQueue.find(b => b.status === 'current');
            const waitingPatients = docQueue.filter(b => b.status === 'waiting');

            let statusColor = '#9ca3af';
            let statusText = 'INACTIVE';
            
            if (doc.isLive) {
              if (doc.isBreak) {
                statusColor = '#f59e0b';
                statusText = 'ON BREAK';
              } else {
                statusColor = '#10b981';
                statusText = 'ACTIVE';
              }
            }

            return (
              <div 
                key={doc._id} 
                style={{
                  ...styles.doctorCard,
                  borderColor: doc.isLive && !doc.isBreak ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255,255,255,0.06)'
                }}
              >
                {/* Doctor Head Info */}
                <div style={styles.cardHeader}>
                  <div>
                    <h2 style={styles.doctorName}>Dr. {doc.name}</h2>
                    <div style={styles.specialtyText}>{doc.specialty}</div>
                  </div>
                  <div style={{ ...styles.statusBadge, color: statusColor, borderColor: statusColor + '40', background: statusColor + '10' }}>
                    <span style={{ ...styles.statusDot, background: statusColor }}></span>
                    {statusText}
                  </div>
                </div>

                {/* Now Serving */}
                <div style={styles.servingSection}>
                  <div style={styles.servingLabel}>NOW SERVING</div>
                  {doc.isBreak ? (
                    <div style={{ ...styles.servingToken, color: '#f59e0b', fontSize: '3.5rem' }}>
                      TEA BREAK ☕
                    </div>
                  ) : currentServing ? (
                    <div style={styles.servingToken}>
                      TOKEN {currentServing.tokenNumber}
                      <div style={styles.patientNameStr}>
                        {currentServing.name}
                      </div>
                    </div>
                  ) : (
                    <div style={{ ...styles.servingToken, color: 'var(--muted)' }}>
                      --
                      <div style={{ ...styles.patientNameStr, color: 'var(--muted)' }}>
                        NO ACTIVE PATIENT
                      </div>
                    </div>
                  )}
                </div>

                {/* Up Next List */}
                <div style={styles.nextSection}>
                  <div style={styles.nextLabel}>UP NEXT IN LINE</div>
                  <div style={styles.nextGrid}>
                    {waitingPatients.length === 0 ? (
                      <div style={styles.noNextText}>No patients waiting</div>
                    ) : (
                      waitingPatients.slice(0, 4).map((p, idx) => (
                        <div key={p._id} style={styles.nextBadge}>
                          <span style={styles.nextIndex}>#{idx + 1}</span>
                          <span style={styles.nextToken}>TOKEN {p.tokenNumber}</span>
                          <span style={styles.nextName}>{p.name.split(' ')[0]}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Footer Info */}
      <footer style={styles.footer}>
        <div style={styles.footerLogo}>DOCKEN.APP</div>
        <div style={styles.footerNote}>Please watch this screen for token announcements. Keep your ticket handy.</div>
      </footer>
    </div>
  );
};

// Elegant Dark-Mode Styling optimized for TV Screens
const styles = {
  monitorContainer: {
    minHeight: '100vh',
    backgroundColor: '#0a0f1d',
    color: '#f3f4f6',
    fontFamily: '"Outfit", "Inter", sans-serif',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '2px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '20px',
    marginBottom: '24px',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  liveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.8rem',
    fontWeight: 800,
    color: '#ef4444',
    letterSpacing: '0.15em',
  },
  liveDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#ef4444',
    animation: 'pulse 1.5s infinite',
  },
  clinicTitle: {
    fontSize: '2rem',
    margin: 0,
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '-0.02em',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  audioToggleBtn: {
    padding: '12px 18px',
    borderRadius: '12px',
    border: 'none',
    color: 'white',
    fontSize: '0.9rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  clockBox: {
    textAlign: 'right',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  timeStr: {
    fontSize: '2rem',
    fontWeight: 900,
    fontFamily: 'monospace',
    color: '#ffffff',
    lineHeight: 1,
  },
  dateStr: {
    fontSize: '0.85rem',
    color: '#9ca3af',
    fontWeight: 600,
    marginTop: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  mainGrid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px',
    alignItems: 'start',
  },
  doctorCard: {
    backgroundColor: 'rgba(17, 24, 39, 0.6)',
    backdropFilter: 'blur(10px)',
    border: '2px solid',
    borderRadius: '24px',
    padding: '24px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    transition: 'border-color 0.3s ease',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  doctorName: {
    fontSize: '1.5rem',
    fontWeight: 800,
    margin: 0,
    color: '#ffffff',
  },
  specialtyText: {
    fontSize: '0.88rem',
    color: '#9ca3af',
    fontWeight: 600,
    marginTop: '2px',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '99px',
    fontSize: '0.75rem',
    fontWeight: 800,
    border: '1px solid',
    letterSpacing: '0.05em',
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  servingSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '20px',
    padding: '20px',
    textAlign: 'center',
  },
  servingLabel: {
    fontSize: '0.8rem',
    fontWeight: 850,
    color: '#00A556',
    letterSpacing: '0.15em',
    marginBottom: '8px',
  },
  servingToken: {
    fontSize: '4.5rem',
    fontWeight: 900,
    color: '#ffffff',
    lineHeight: 1.1,
    textShadow: '0 0 20px rgba(255,255,255,0.1)',
  },
  patientNameStr: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#10b981',
    marginTop: '6px',
    textTransform: 'uppercase',
  },
  nextSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  nextLabel: {
    fontSize: '0.78rem',
    fontWeight: 800,
    color: '#9ca3af',
    letterSpacing: '0.1em',
  },
  nextGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  nextBadge: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '0.95rem',
    border: '1px solid rgba(255, 255, 255, 0.02)',
  },
  nextIndex: {
    color: '#9ca3af',
    fontWeight: 800,
    marginRight: '12px',
  },
  nextToken: {
    fontWeight: 900,
    color: '#ffffff',
    marginRight: '16px',
  },
  nextName: {
    fontWeight: 600,
    color: '#d1d5db',
    textTransform: 'uppercase',
  },
  noNextText: {
    fontSize: '0.9rem',
    color: '#6b7280',
    fontStyle: 'italic',
    padding: '8px 0',
  },
  emptyMsg: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    fontSize: '1.2rem',
    color: '#6b7280',
    padding: '60px 0',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '16px',
    marginTop: '24px',
    fontSize: '0.8rem',
    color: '#4b5563',
    fontWeight: 700,
  },
  footerLogo: {
    letterSpacing: '0.1em',
    color: '#9ca3af',
  },
  footerNote: {
    textAlign: 'right',
  },
  loader: {
    textAlign: 'center',
    fontSize: '1.5rem',
    color: '#9ca3af',
    padding: '80px 0',
  },
  errorCard: {
    maxWidth: '500px',
    margin: '100px auto',
    backgroundColor: '#111827',
    border: '1px solid #374151',
    borderRadius: '20px',
    padding: '30px',
    textAlign: 'center',
  },
  backBtn: {
    marginTop: '20px',
    padding: '10px 20px',
    borderRadius: '10px',
    border: 'none',
    background: '#3b82f6',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer',
  }
};

export default QueueMonitor;
