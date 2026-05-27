const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  name: { type: String, default: 'Guest Patient' },
  phone: { type: String, required: true, unique: true },
  email: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Patient', patientSchema);
