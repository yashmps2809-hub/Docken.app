import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const BookAppointment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clinic, doctor } = location.state || { clinic: {name: 'Apollo', _id: '1'}, doctor: 'Dr. Priya Sharma' };

  // Fetch patient session
  const [patientSession, setPatientSession] = useState(() => {
    const saved = localStorage.getItem('patientSession');
    return saved ? JSON.parse(saved) : null;
  });

  const [name, setName] = useState(patientSession ? patientSession.name : '');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if not logged in
  React.useEffect(() => {
    if (!patientSession) {
      alert("Please login first to book an appointment");
      navigate('/login/patient');
    }
  }, [patientSession, navigate]);

  const handleBooking = async () => {
    if (!name || !phone) {
      alert('Please fill out all fields');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/queue/book', {
        patientName: name,
        patientPhone: phone,
        clinicId: clinic._id,
        doctorName: doctor
      });
      
      setLoading(false);
      alert('Booking Confirmed!');
      // Pass the booking data to the queue page
      navigate('/patient/queue', { state: { booking: res.data, clinicId: clinic._id, doctorName: doctor } });
    } catch (err) {
      console.error(err);
      alert('Failed to book appointment.');
      setLoading(false);
    }
  };

  return (
    <div className="page active">
      <div className="page-body">
        <h2 style={{margin: '0 0 20px 0', color: 'var(--accent)', fontSize: '2rem'}}>Book Appointment</h2>
        <div className="booking-form">
          
          <div className="form-group">
            <label>DOCTOR</label>
            <input className="form-input" value={doctor} disabled />
          </div>
          
          <div className="form-group">
            <label>CLINIC</label>
            <input className="form-input" value={clinic.name} disabled />
          </div>

          <div className="form-group">
            <label>DATE</label>
            <input type="date" className="form-input" />
          </div>

          <div className="form-group">
            <label>AVAILABLE SLOTS</label>
            <div className="time-slots">
              <div className="time-slot selected">09:00</div>
              <div className="time-slot">09:30</div>
              <div className="time-slot">10:00</div>
              <div className="time-slot disabled">10:30</div>
              <div className="time-slot">11:00</div>
              <div className="time-slot">11:30</div>
            </div>
          </div>

          <div className="form-group">
            <label>YOUR NAME</label>
            <input className="form-input" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
          </div>
          
          <div className="form-group">
            <label>PHONE</label>
            <input className="form-input" placeholder="+91 XXXXX XXXXX" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          
          <button className="btn btn-primary" style={{padding: '16px', fontSize: '1rem', width: '100%'}} onClick={handleBooking}>
            {loading ? 'Booking...' : 'Confirm Booking →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookAppointment;
