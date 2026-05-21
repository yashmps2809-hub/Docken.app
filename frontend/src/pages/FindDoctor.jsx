import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const FindDoctor = () => {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mapSrc, setMapSrc] = useState(
    "https://maps.google.com/maps?width=100%25&height=600&hl=en&q=Clinics%20in%20Jabalpur,%20Madhya%20Pradesh+(Docken%20Clinics)&t=&z=13&ie=UTF8&iwloc=B&output=embed"
  );

  const fetchLocationAndClinics = () => {
    setLoading(true);
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Update Map
        setMapSrc(`https://maps.google.com/maps?width=100%25&height=600&hl=en&q=${latitude},${longitude}+(Your%20Location)&t=&z=14&ie=UTF8&iwloc=B&output=embed`);
        
        try {
          // Fetch from MongoDB
          const res = await axios.get(`http://localhost:5000/api/clinics/nearby?lat=${latitude}&lng=${longitude}&radius=5`);
          setClinics(res.data);
          setLoading(false);
        } catch (error) {
          console.error("Error fetching clinics from Node API", error);
          setLoading(false);
        }
      },
      (error) => {
        alert('Please allow location access to find nearby clinics.');
        setLoading(false);
      }
    );
  };

  const selectDoctor = (clinic, doctor) => {
    // Navigate to book appointment and pass data
    navigate('/patient/book', { state: { clinic, doctor } });
  };

  return (
    <div className="page active">
      <div className="page-body">
        <h2 style={{margin: '0 0 20px 0', color: 'var(--accent)', fontSize: '2rem'}}>Find a Doctor</h2>
        <div className="search-bar">
          <input className="search-input" placeholder="Search name, specialty, area..." />
          <button className="btn btn-primary">Search</button>
        </div>
        
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
          <div className="section-label" style={{marginBottom: 0}}>// NEARBY CLINICS</div>
          <button className="btn btn-secondary" style={{padding: '8px 16px', fontSize: '0.85rem'}} onClick={fetchLocationAndClinics}>
            {loading ? '⏳ Locating...' : '📍 Locate Me'}
          </button>
        </div>
        
        <div className="map-container">
          <iframe 
            width="100%" 
            height="100%" 
            frameBorder="0" 
            scrolling="no" 
            marginHeight="0" 
            marginWidth="0" 
            src={mapSrc}>
          </iframe>
        </div>

        <div className="section-label">// DOCTORS NEARBY</div>
        <br />
        <div className="doctor-grid">
          {clinics.length === 0 && !loading && (
            <p style={{color: '#9ca3af'}}>Click "Locate Me" to fetch clinics from MongoDB within 5km.</p>
          )}
          
          {clinics.map(clinic => (
            clinic.doctors.map(doc => (
              <div key={`${clinic._id}-${doc}`} className="doctor-card fade-in">
                <div className="doc-header">
                  <div className="doc-avatar">👨‍⚕️</div>
                  <div>
                    <div className="doc-name">{doc}</div>
                    <div className="doc-spec">General Physician</div>
                  </div>
                </div>
                <div className="doc-info">
                  📍 {clinic.name}<br/>
                  ⭐ {clinic.rating}/5.0 · 3km away<br/>
                  <span style={{color: '#00A556'}}>Live Queue: 12 waiting</span>
                </div>
                <button className="btn btn-primary" style={{width: '100%', marginTop: '15px'}} onClick={() => selectDoctor(clinic, doc)}>
                  Select &amp; Book
                </button>
              </div>
            ))
          ))}
        </div>
      </div>
    </div>
  );
};

export default FindDoctor;
