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

    // Generate unique token numbers by counting all bookings created today for this doctor and clinic
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const count = await Booking.countDocuments({ 
      clinicId, 
      doctorName, 
      createdAt: { $gte: todayStart } 
    });
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

    // Fetch the doctor's delay
    const Doctor = require('../models/Doctor');
    const doctor = await Doctor.findOne({ name: doctorName, clinicId });
    const delay = doctor ? doctor.delayedByMins : 0;

    // Dynamically calculate estimatedWaitTime for each patient in the active queue
    const updatedQueue = queue.map((booking, index) => {
      const clinicObj = booking.toObject();
      const ahead = index; 

      const travelTime = clinicObj.travelTimeMins || 0;
      const trafficDelay = clinicObj.trafficDelayMins || 0;

      const queueWait = (ahead * 15) + delay;
      clinicObj.estimatedWaitTime = Math.max(queueWait, travelTime + trafficDelay);
      
      return clinicObj;
    });

    res.json(updatedQueue);
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

// Helper to calculate distance in km
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

// @route   PUT /api/queue/location/:bookingId
// @desc    Update patient live location coordinates, travel duration, traffic delays, and wait times
router.put('/location/:bookingId', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    // Find the booking and populate clinic coordinates
    const booking = await Booking.findById(req.params.bookingId).populate('clinicId');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const clinicCoords = booking.clinicId?.location?.coordinates || [79.9864, 23.1815]; // [lng, lat]
    const clinicLat = clinicCoords[1];
    const clinicLng = clinicCoords[0];

    // Calculate distance
    const dist = calculateDistance(latitude, longitude, clinicLat, clinicLng);
    
    // Calculate travel time and traffic delay (assuming average 25 km/h and 1.5 min delay/km)
    const travelTime = Math.round((dist / 25) * 60);
    const trafficDelay = Math.round(dist * 1.5);

    // Calculate patients waiting ahead
    const ahead = await Booking.countDocuments({
      clinicId: booking.clinicId?._id || booking.clinicId,
      doctorName: booking.doctorName,
      status: 'waiting',
      createdAt: { $lt: booking.createdAt }
    });

    // Get doctor's delayed notice
    const Doctor = require('../models/Doctor');
    const doctor = await Doctor.findOne({ name: booking.doctorName, clinicId: booking.clinicId?._id || booking.clinicId });
    const delay = doctor ? doctor.delayedByMins : 0;

    const queueWait = (ahead * 15) + delay;
    const estimatedWaitTime = Math.max(queueWait, travelTime + trafficDelay);

    // Save back to db
    booking.patientLatitude = latitude;
    booking.patientLongitude = longitude;
    booking.travelTimeMins = travelTime;
    booking.trafficDelayMins = trafficDelay;
    booking.estimatedWaitTime = estimatedWaitTime;
    await booking.save();

    res.json(booking);
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

    if (['completed', 'cancelled', 'skipped'].includes(booking.status)) {
      return res.json(booking);
    }

    // Calculate patients waiting ahead
    const ahead = await Booking.countDocuments({
      clinicId: booking.clinicId?._id || booking.clinicId,
      doctorName: booking.doctorName,
      status: 'waiting',
      createdAt: { $lt: booking.createdAt }
    });

    // Get doctor's delayed notice
    const Doctor = require('../models/Doctor');
    const doctor = await Doctor.findOne({ name: booking.doctorName, clinicId: booking.clinicId?._id || booking.clinicId });
    const delay = doctor ? doctor.delayedByMins : 0;

    const travelTime = booking.travelTimeMins || 0;
    const trafficDelay = booking.trafficDelayMins || 0;

    const queueWait = (ahead * 15) + delay;
    
    const bookingObj = booking.toObject();
    bookingObj.estimatedWaitTime = Math.max(queueWait, travelTime + trafficDelay);

    res.json(bookingObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   PUT /api/queue/skip/:bookingId
// @desc    Skip a patient (marks status as skipped and advances queue)
router.put('/skip/:bookingId', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Not found' });

    const wasCurrent = booking.status === 'current';
    booking.status = 'skipped';
    await booking.save();

    // If skipped patient was 'current', promote the next waiting patient
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

module.exports = router;
