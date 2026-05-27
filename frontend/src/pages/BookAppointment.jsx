import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const BookAppointment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { clinic, doctor, distance } = location.state || { clinic: null, doctor: null, distance: null };
  const [paymentStep, setPaymentStep] = useState(false);
  const [loading, setLoading] = useState(false);

  const [patientSession, setPatientSession] = useState(() => {
    const saved = localStorage.getItem('patientSession');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (!patientSession) {
      alert("Please login first to book an appointment");
      navigate('/login/patient');
    } else if (!doctor || !clinic) {
      alert("Please select a doctor first.");
      navigate('/patient/find');
    }
  }, [patientSession, doctor, clinic, navigate]);

  const handleBook = async () => {
    setLoading(true);
    try {
      const fcmToken = localStorage.getItem('fcmToken') || '';
      const res = await axios.post('https://backend-nine-kappa-32.vercel.app/api/queue/book', {
        clinicId: clinic._id,
        doctorName: doctor.name || doctor,
        patientName: patientSession.name,
        patientPhone: patientSession.phone || patientSession.email || '',
        distance,
        fcmToken // Sent for push notifications
      });
      
      const bookingData = { booking: res.data, clinicId: clinic._id, doctorName: doctor.name || doctor };
      localStorage.setItem('activeBooking', JSON.stringify(bookingData));
      
      navigate('/patient/queue', { state: bookingData });
    } catch (err) {
      console.error(err);
      alert('Error booking appointment');
      setLoading(false);
    }
  };

  if (!doctor || !clinic) return null;

  return (
    <div className="page active" style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div className="card fade-in" style={{width: '100%', maxWidth: '400px', padding: '30px', textAlign: 'center'}}>
        
        {!paymentStep ? (
          <>
            <h2 style={{color: 'var(--accent)', marginBottom: '10px'}}>Confirm Booking</h2>
            <div style={{background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px', textAlign: 'left'}}>
              <h3 style={{margin: '0 0 5px 0'}}>{doctor.name || doctor}</h3>
              <p style={{margin: '0 0 10px 0', fontSize: '0.9rem', color: 'gray'}}>
                {doctor.specialty || 'General Physician'} • {doctor.rating || '4.8'}⭐
              </p>
              <div style={{fontSize: '0.8rem'}}><strong>Clinic:</strong> {clinic.name}</div>
              <div style={{fontSize: '0.8rem'}}><strong>Location:</strong> {clinic.address}</div>
            </div>
            
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px', padding: '10px', borderTop: '1px solid #eee', borderBottom: '1px solid #eee'}}>
              <span>Consultation Fee</span>
              <strong>₹500</strong>
            </div>

            <button className="btn btn-primary" style={{width: '100%', marginBottom: '10px'}} onClick={() => setPaymentStep(true)}>
              Proceed to Pay
            </button>
            <button className="btn btn-secondary" style={{width: '100%'}} onClick={() => navigate(-1)}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <h2 style={{color: 'var(--accent)', marginBottom: '10px'}}>Secure Payment</h2>
            <p style={{color: 'gray', fontSize: '0.9rem', marginBottom: '20px'}}>Please pay ₹500 to secure your spot in the queue.</p>
            
            <div style={{background: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '20px'}}>
              <div style={{border: '1px dashed #ccc', padding: '20px', borderRadius: '8px', marginBottom: '10px', background: '#fff'}}>
                <span style={{fontSize: '2rem'}}>💳</span><br/>
                Mock Payment Gateway
              </div>
            </div>

            <button className="btn btn-primary" style={{width: '100%', marginBottom: '10px', background: '#16a34a'}} onClick={handleBook} disabled={loading}>
              {loading ? 'Processing...' : 'Pay ₹500 & Book'}
            </button>
            <button className="btn btn-secondary" style={{width: '100%'}} onClick={() => setPaymentStep(false)} disabled={loading}>
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default BookAppointment;
