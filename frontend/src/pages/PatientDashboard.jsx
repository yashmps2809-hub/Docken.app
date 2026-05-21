import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const PatientDashboard = () => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const navigate = useNavigate();

  // On mount, ask for GPS and fetch nearby clinics from Node Backend
  useEffect(() => {
    fetchNearbyClinics();
  }, []);

  const fetchNearbyClinics = () => {
    setLoading(true);
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Hit the brand new Node.js + MongoDB Geospatial Backend!
          const res = await axios.get(`http://localhost:5000/api/clinics/nearby?lat=${latitude}&lng=${longitude}&radius=5`);
          setClinics(res.data);
          setLoading(false);
        } catch (error) {
          console.error("Error fetching clinics from Node API", error);
          setLocationError('Failed to fetch clinics from server.');
          setLoading(false);
        }
      },
      (error) => {
        setLocationError('Please allow location access to find nearby clinics.');
        setLoading(false);
      }
    );
  };

  const handleBook = async (clinicId, doctorName) => {
    const name = prompt("Enter your Name:");
    const phone = prompt("Enter your Phone (+91):");
    
    if (!name || !phone) return;

    try {
      // POST booking to Node.js Backend Queue
      await axios.post('http://localhost:5000/api/queue/book', {
        patientName: name,
        patientPhone: phone,
        clinicId: clinicId,
        doctorName: doctorName
      });
      alert('Booking Confirmed! Moving to Live Queue...');
      navigate('/queue');
    } catch (error) {
      alert('Failed to book appointment.');
    }
  };

  return (
    <div className="app-container">
      <div className="header-glass">
        <h1 className="main-title">DOCKEN</h1>
        <p style={{color:'#6b7280'}}>React + Node + Mongo Integration</p>
      </div>

      <div style={{padding: '20px', marginTop: '80px'}}>
        <h2>Nearby Clinics (5km Radius)</h2>
        
        {loading && <p>Locating you via GPS and querying MongoDB...</p>}
        {locationError && <p style={{color:'red'}}>{locationError}</p>}

        <div className="list-container">
          {clinics.length === 0 && !loading && !locationError && (
            <p>No clinics found within 5km. (Did you run the seed script?)</p>
          )}

          {clinics.map(clinic => (
            <div key={clinic._id} className="card fade-in" style={{marginBottom: '15px'}}>
              <h3>{clinic.name}</h3>
              <p>📍 {clinic.address}</p>
              <p>⭐ {clinic.rating}/5.0</p>
              
              <div style={{marginTop: '10px'}}>
                <strong>Doctors Available:</strong>
                {clinic.doctors.map(doc => (
                  <button 
                    key={doc} 
                    className="btn btn-primary" 
                    style={{display: 'block', width: '100%', marginTop: '5px'}}
                    onClick={() => handleBook(clinic._id, doc)}
                  >
                    Book with {doc}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
