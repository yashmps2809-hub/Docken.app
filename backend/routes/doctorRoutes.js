const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Doctor = require('../models/Doctor');
const Clinic = require('../models/Clinic');
const Booking = require('../models/Booking');
const admin = require('firebase-admin');

// Helper to safely send push notifications
const sendPushNotification = async (fcmToken, title, body) => {
  if (!fcmToken || !admin.apps.length) return;
  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      android: { priority: 'high' }
    });
  } catch (err) {
    console.log('Failed to send push notification', err.message);
  }
};

// @route   POST /api/doctors/register
// @desc    Register a new doctor
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, specialty, clinicId, password } = req.body;

    // Check if doctor exists
    let doctor = await Doctor.findOne({ email });
    if (doctor) {
      return res.status(400).json({ error: 'Doctor already exists with this email' });
    }

    // Verify clinic exists
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) {
      return res.status(404).json({ error: 'Clinic not found' });
    }

    const doctorData = { name, email, phone, specialty, clinicId };
    if (password) {
      const salt = await bcrypt.genSalt(10);
      doctorData.password = await bcrypt.hash(password, salt);
    }

    doctor = new Doctor(doctorData);
    await doctor.save();

    // Optionally add the doctor name to the clinic's hardcoded array for backwards compatibility
    if (!clinic.doctors.includes(name)) {
      clinic.doctors.push(name);
      await clinic.save();
    }

    // Ensure password is not returned
    const docObj = doctor.toObject();
    delete docObj.password;
    res.json(docObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   POST /api/doctors/login
// @desc    Login a doctor with email and password
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check for doctor
    const doctor = await Doctor.findOne({ email }).populate('clinicId');
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // If doctor has no password (registered via Google/Phone without password)
    if (!doctor.password) {
      return res.status(400).json({ error: 'This account does not have a password. Please sign in with Google or Phone.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const docObj = doctor.toObject();
    delete docObj.password;
    res.json(docObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   PUT /api/doctors/:id/toggle
// @desc    Toggle a doctor's live queue status
router.put('/:id/toggle', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    doctor.isLive = !doctor.isLive;
    await doctor.save();

    res.json(doctor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   GET /api/doctors/clinic/:clinicId
// @desc    Get all registered doctors for a specific clinic
router.get('/clinic/:clinicId', async (req, res) => {
  try {
    const doctors = await Doctor.find({ clinicId: req.params.clinicId });
    res.json(doctors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   GET /api/doctors/email/:email
// @desc    Get doctor by email (for login)
router.get('/email/:email', async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ email: req.params.email }).populate('clinicId');
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    res.json(doctor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   PUT /api/doctors/:doctorId/delay
// @desc    Broadcast a delay to the queue
router.put('/:doctorId/delay', async (req, res) => {
  try {
    const { delayedByMins } = req.body;
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.doctorId,
      { delayedByMins },
      { new: true }
    );
    
    // Notify all waiting patients if delay > 0
    if (delayedByMins > 0 && doctor) {
      const waitingPatients = await Booking.find({ 
        clinicId: doctor.clinicId, 
        doctorName: doctor.name, 
        status: 'waiting',
        fcmToken: { $ne: '' }
      });
      
      for (const p of waitingPatients) {
        sendPushNotification(
          p.fcmToken,
          "Doctor Delay Notice ⚠️",
          `Dr. ${doctor.name} is running approximately ${delayedByMins} minutes late.`
        );
      }
    }
    
    res.json(doctor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
