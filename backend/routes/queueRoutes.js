const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');

// @route   POST /api/queue/book
// @desc    Book an appointment (Join the Queue)
router.post('/book', async (req, res) => {
  try {
    const { patientName, patientPhone, clinicId, doctorName } = req.body;

    // Generate a simple token number (e.g. T-12)
    const count = await Booking.countDocuments({ clinicId, doctorName, status: { $in: ['waiting', 'current'] } });
    const tokenNumber = `T-${(count + 1).toString().padStart(2, '0')}`;

    const newBooking = new Booking({
      patientName,
      patientPhone,
      clinicId,
      doctorName,
      tokenNumber
    });

    await newBooking.save();
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

// @route   PUT /api/queue/next/:bookingId
// @desc    Doctor advances the queue (marks booking as current/completed)
router.put('/next/:bookingId', async (req, res) => {
  try {
    const { status } = req.body; // 'current' or 'completed'
    
    const updated = await Booking.findByIdAndUpdate(
      req.params.bookingId, 
      { status }, 
      { new: true }
    );
    
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
