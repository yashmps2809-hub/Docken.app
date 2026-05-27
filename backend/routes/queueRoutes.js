const express = require('express');
const router = express.Router();
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

// @route   POST /api/queue/book
// @desc    Book an appointment (Join the Queue)
router.post('/book', async (req, res) => {
  try {
    const { patientName, patientPhone, clinicId, doctorName, distance } = req.body;

    // Generate a simple token number (e.g. T-12)
    const count = await Booking.countDocuments({ clinicId, doctorName, status: { $in: ['waiting', 'current'] } });
    const tokenNumber = `T-${(count + 1).toString().padStart(2, '0')}`;
    
    const newBooking = new Booking({
      patientName,
      patientPhone,
      clinicId,
      doctorName,
      tokenNumber,
      distance,
      fcmToken: req.body.fcmToken || '',
      status: 'waiting' // ALWAYS START AS WAITING to prevent race conditions
    });

    await newBooking.save();

    // Atomically try to pull one waiting patient into the 'current' slot if none exists.
    const activeQueueCount = await Booking.countDocuments({ clinicId, doctorName, status: 'current' });
    if (activeQueueCount === 0) {
      await Booking.findOneAndUpdate(
        { clinicId, doctorName, status: 'waiting' },
        { status: 'current' },
        { sort: { createdAt: 1 } }
      );
      const updatedBooking = await Booking.findById(newBooking._id);
      return res.json(updatedBooking);
    }

    res.json(newBooking);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   GET /api/queue/:clinicId/:doctorName
// @desc    Get the live queue for a specific doctor
router.get('/:clinicId/:doctorName', async (req, res) => {
  try {
    const { clinicId, doctorName } = req.params;

    const queue = await Booking.find({ 
      clinicId, 
      doctorName, 
      status: { $in: ['waiting', 'current'] } 
    }).sort({ createdAt: 1 });

    res.json(queue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   GET /api/queue/stats/:clinicId/:doctorName
// @desc    Get stats for a specific doctor today
router.get('/stats/:clinicId/:doctorName', async (req, res) => {
  try {
    const { clinicId, doctorName } = req.params;
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const totalToday = await Booking.countDocuments({
      clinicId,
      doctorName,
      createdAt: { $gte: todayStart }
    });
    
    const Doctor = require('../models/Doctor');
    const doctor = await Doctor.findOne({ name: doctorName, clinicId });
    
    res.json({ 
      totalToday,
      totalPatientsSeen: doctor ? doctor.totalPatientsSeen : 0,
      averageWaitTime: doctor ? doctor.averageWaitTime : 15,
      rating: doctor ? doctor.rating : 4.8,
      delayedByMins: doctor ? doctor.delayedByMins : 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   PUT /api/queue/next/:bookingId
// @desc    Doctor advances the queue (marks booking as completed and next as current)
router.put('/next/:bookingId', async (req, res) => {
  try {
    const { status } = req.body; // usually 'completed'
    
    // Mark current as completed
    const updated = await Booking.findByIdAndUpdate(
      req.params.bookingId, 
      { status, completedAt: status === 'completed' ? new Date() : undefined }, 
      { new: true }
    );

    // If marked as completed, automatically make the next waiting person 'current'
    if (status === 'completed' && updated) {
      const nextBooking = await Booking.findOneAndUpdate(
        { clinicId: updated.clinicId, doctorName: updated.doctorName, status: 'waiting' },
        { status: 'current' },
        { sort: { createdAt: 1 }, new: true }
      );

      if (nextBooking) {
        // Notify the next patient
        if (nextBooking.fcmToken) {
          sendPushNotification(
            nextBooking.fcmToken, 
            "It's Your Turn! 🏥", 
            `Please proceed to the doctor's cabin. Your token is ${nextBooking.tokenNumber}.`
          );
        }
      }

      // Also update Doctor analytics (fire and forget)
      const Doctor = require('../models/Doctor');
      Doctor.findOneAndUpdate(
        { name: updated.doctorName, clinicId: updated.clinicId }, 
        { $inc: { totalPatientsSeen: 1 } }
      ).catch(err => console.log('Analytics update error', err));
    }
    
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   PUT /api/queue/prescription/:bookingId
// @desc    Doctor adds a prescription/note to a completed booking
router.put('/prescription/:bookingId', async (req, res) => {
  try {
    const { prescription } = req.body;
    const updated = await Booking.findByIdAndUpdate(
      req.params.bookingId,
      { prescription },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   GET /api/queue/history/:phone
// @desc    Get patient history by phone number
router.get('/history/:phone', async (req, res) => {
  try {
    const history = await Booking.find({ 
      patientPhone: req.params.phone,
      status: { $in: ['completed', 'cancelled'] }
    }).populate('clinicId', 'name').sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   PUT /api/queue/cancel/:bookingId
// @desc    Patient cancels their booking
router.put('/cancel/:bookingId', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Not found' });
    
    const wasCurrent = booking.status === 'current';
    booking.status = 'cancelled';
    await booking.save();

    // If the cancelled patient was 'current', the queue stalled!
    // We must promote the next waiting patient to 'current'
    if (wasCurrent) {
      const nextBooking = await Booking.findOneAndUpdate(
        { clinicId: booking.clinicId, doctorName: booking.doctorName, status: 'waiting' },
        { status: 'current' },
        { sort: { createdAt: 1 }, new: true }
      );

      if (nextBooking && nextBooking.fcmToken) {
        sendPushNotification(
          nextBooking.fcmToken, 
          "It's Your Turn! 🏥", 
          `Please proceed to the doctor's cabin. Your token is ${nextBooking.tokenNumber}.`
        );
      }
    }

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   PUT /api/queue/location/:bookingId
// @desc    Update patient live location coordinates
router.put('/location/:bookingId', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const updated = await Booking.findByIdAndUpdate(
      req.params.bookingId,
      { patientLatitude: latitude, patientLongitude: longitude },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   GET /api/queue/booking/:bookingId
// @desc    Get a single booking details (includes live location)
router.get('/booking/:bookingId', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate('clinicId');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
