const express = require('express');
const router = express.Router();
const Clinic = require('../models/Clinic');

// @route   GET /api/clinics/nearby
// @desc    Fetch clinics near a given latitude and longitude
// @query   lat, lng, radius (in kilometers)
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Please provide lat and lng coordinates' });
    }

    const maxDistanceInMeters = radius * 1000;

    // Use MongoDB $near operator to automatically sort by closest distance
    const nearbyClinics = await Clinic.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)] // MongoDB expects [longitude, latitude]
          },
          $maxDistance: maxDistanceInMeters
        }
      }
    });

    // Populate the dynamic registered doctors for each clinic
    const clinicsWithDoctors = await Promise.all(nearbyClinics.map(async (clinic) => {
      const clinicObj = clinic.toObject();
      const Doctor = require('../models/Doctor');
      const dynamicDoctors = await Doctor.find({ clinicId: clinic._id, isLive: true });
      
      // Merge hardcoded for backwards compatibility + newly registered live doctors
      const registeredDoctorNames = dynamicDoctors.map(d => d.name);
      clinicObj.doctors = [...new Set([...clinicObj.doctors, ...registeredDoctorNames])];
      
      return clinicObj;
    }));

    res.json(clinicsWithDoctors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   POST /api/clinics/seed
// @desc    Helper route to insert some dummy data into the DB for testing
router.post('/seed', async (req, res) => {
  try {
    // Jabalpur Coordinates: 23.1815, 79.9864
    const dummyClinics = [
      {
        name: "Apollo Clinic, Jabalpur",
        address: "Napier Town, Jabalpur",
        rating: 4.8,
        location: { type: "Point", coordinates: [79.9864, 23.1815] },
        doctors: ["Dr. Priya Sharma", "Dr. Vikram Patel"]
      },
      {
        name: "City Health Centre",
        address: "Wright Town, Jabalpur",
        rating: 4.5,
        location: { type: "Point", coordinates: [79.9411, 23.1685] },
        doctors: ["Dr. Amit Kumar"]
      }
    ];

    await Clinic.insertMany(dummyClinics);
    res.json({ message: "Dummy clinics inserted successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to seed DB' });
  }
});

// @route   GET /api/clinics/:id
// @desc    Get clinic details by ID
router.get('/:id', async (req, res) => {
  try {
    const clinic = await Clinic.findById(req.params.id);
    if (!clinic) return res.status(404).json({ error: 'Clinic not found' });
    res.json(clinic);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
