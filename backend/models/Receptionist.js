const mongoose = require('mongoose');

const receptionistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String }, // For custom login
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Receptionist', receptionistSchema);
