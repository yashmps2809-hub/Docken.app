const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');

// Save or Update Patient details
router.post('/save', async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    // Find patient by phone
    let patient = await Patient.findOne({ phone });
    if (patient) {
      patient.name = name || patient.name;
      patient.email = email || patient.email;
      await patient.save();
    } else {
      patient = new Patient({
        name: name || 'Guest Patient',
        phone,
        email: email || `${phone}@docken.app`
      });
      await patient.save();
    }
    
    res.json(patient);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
