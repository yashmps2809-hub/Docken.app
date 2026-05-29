import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Geolocation } from '@capacitor/geolocation';

const FindDoctor = () => {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [mapSrc, setMapSrc] = useState(
    "https://maps.google.com/maps?width=100%25&height=600&hl=en&q=Clinics%20in%20Jabalpur,%20Madhya%20Pradesh+(Docken%20Clinics)&t=&z=13&ie=UTF8&iwloc=B&output=embed"
  );

  // Haversine formula to calculate distance between two lat/lng coordinates in km
  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
  };

  const fetchLocationAndClinics = async () => {
    setLoading(true);
    
    // Default Jabalpur coordinates
    const fallbackLat = 23.1815;
    const fallbackLng = 79.9864;

    const fetchClinics = async (lat, lng) => {
      try {
        let res = await axios.get(`https://backend-nine-kappa-32.vercel.app/api/clinics/nearby?lat=${lat}&lng=${lng}&radius=15`);
        if (res.data.length === 0) {
          res = await axios.get(`https://backend-nine-kappa-32.vercel.app/api/clinics/nearby?lat=${lat}&lng=${lng}&radius=5000`);
        }
        setClinics(res.data);
      } catch (error) {
        console.error("Error fetching clinics from API", error);
        // If API fails, try to fetch all with default Jabalpur coordinates
        if (lat !== fallbackLat || lng !== fallbackLng) {
          await fetchClinics(fallbackLat, fallbackLng);
        }
      }
    };

    try {
      const permissions = await Geolocation.checkPermissions();
      if (permissions.location !== 'granted') {
        const req = await Geolocation.requestPermissions();
        if (req.location !== 'granted') {
          console.warn("Location permission denied, using Jabalpur fallback");
          setUserLocation({ lat: fallbackLat, lng: fallbackLng });
          setMapSrc(`https://maps.google.com/maps?width=100%25&height=600&hl=en&q=${fallbackLat},${fallbackLng}+(Apollo%20Clinic)&t=&z=14&ie=UTF8&iwloc=B&output=embed`);
          await fetchClinics(fallbackLat, fallbackLng);
          setLoading(false);
          return;
        }
      }

      // Set a reasonable timeout and fallback if GPS is weak
      const position = await Geolocation.getCurrentPosition({ 
        enableHighAccuracy: false, 
        timeout: 6000 
      });
      
      const { latitude, longitude } = position.coords;
      setUserLocation({ lat: latitude, lng: longitude });
      setMapSrc(`https://maps.google.com/maps?width=100%25&height=600&hl=en&q=${latitude},${longitude}+(Your%20Location)&t=&z=14&ie=UTF8&iwloc=B&output=embed`);
      await fetchClinics(latitude, longitude);
    } catch (error) {
      console.warn("Geolocation failed, using Jabalpur fallback:", error);
      setUserLocation({ lat: fallbackLat, lng: fallbackLng });
      setMapSrc(`https://maps.google.com/maps?width=100%25&height=600&hl=en&q=${fallbackLat},${fallbackLng}+(Apollo%20Clinic)&t=&z=14&ie=UTF8&iwloc=B&output=embed`);
      await fetchClinics(fallbackLat, fallbackLng);
    } finally {
      setLoading(false);
    }
  };

  const selectDoctor = (clinic, doctor) => {
    // Navigate to book appointment and pass data
    const distance = userLocation && clinic.location?.coordinates ? 
      getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, clinic.location.coordinates[1], clinic.location.coordinates[0]).toFixed(1) : null;
    navigate('/patient/book', { state: { clinic, doctor, distance } });
  };

  useEffect(() => {
    fetchLocationAndClinics();
  }, []);

  // Filter clinics and doctors based on search query
  const filteredClinics = clinics.map(clinic => {
    const matchingDoctors = clinic.doctors.filter(doc => 
      doc.toLowerCase().includes(searchQuery.toLowerCase()) || 
      clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clinic.address?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { ...clinic, doctors: matchingDoctors };
  }).filter(clinic => clinic.doctors.length > 0);

  const activeBookingJSON = localStorage.getItem('activeBooking');
  const activeBooking = activeBookingJSON ? JSON.parse(activeBookingJSON) : null;

  return (
    <div className="page active">
      <div className="page-body">
        {activeBooking && (
           <div style={{background: '#10b981', color: 'white', padding: '12px 15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)'}}>
             <span><span style={{marginRight: '8px'}}>🎫</span> You have an active booking!</span>
             <button onClick={() => navigate('/patient/queue', { state: activeBooking })} style={{background: 'white', color: '#10b981', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer'}}>Resume Queue</button>
           </div>
        )}
        
        <h2 style={{margin: '0 0 20px 0', color: 'var(--accent)', fontSize: '2rem'}}>Find a Doctor</h2>
        <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
          <div className="search-bar" style={{flex: 1, marginBottom: 0}}>
            <input 
              className="search-input" 
              placeholder="Search doctor, clinic name, or area..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary" style={{padding: '0 15px'}} onClick={() => navigate('/patient/history')}>📜 History</button>
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
        <div className="doctor-grid stagger-in">
          {filteredClinics.length === 0 && !loading && (
            <p style={{color: '#9ca3af'}}>No doctors found matching your search or location.</p>
          )}
          
          {filteredClinics.map(clinic => (
            clinic.doctors.map(doc => (
              <div key={`${clinic._id}-${doc}`} className="doctor-card glass-card fade-in haptic-press">
                <div className="doc-header">
                  <div className="doc-avatar">👨‍⚕️</div>
                  <div>
                    <div className="doc-name">{doc}</div>
                    <div className="doc-spec">General Physician</div>
                  </div>
                </div>
                <div className="doc-info">
                  📍 {clinic.name}<br/>
                  ⭐ {clinic.rating}/5.0 · {userLocation && clinic.location?.coordinates ? 
                    `${getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, clinic.location.coordinates[1], clinic.location.coordinates[0]).toFixed(1)} km away` 
                    : 'Distance unknown'}<br/>
                  <span style={{color: '#00A556'}}>Live Queue: 12 waiting</span>
                </div>
                <button className="btn btn-primary ripple" style={{width: '100%', marginTop: '15px'}} onClick={() => selectDoctor(clinic, doc)}>
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
