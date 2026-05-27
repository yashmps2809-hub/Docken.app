const express = require('express');
const router = express.Router();
const Receptionist = require('../models/Receptionist');
const bcrypt = require('bcryptjs');

// @route   POST /api/receptionists/login
// @desc    Login for receptionist
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const rec = await Receptionist.findOne({ email }).populate('clinicId');
    if (!rec) return res.status(404).json({ error: 'Receptionist not found' });
    
    // Simple check for MVP
    if (rec.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.json(rec);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   POST /api/receptionists/register
// @desc    Register a new receptionist
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, clinicId } = req.body;
    let rec = await Receptionist.findOne({ email });
    if (rec) return res.status(400).json({ error: 'Receptionist already exists' });
    
    rec = new Receptionist({ name, email, password, clinicId });
    await rec.save();
    res.json(rec);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
