const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  patientName: { type: String, required: true },
  patientPhone: { type: String, required: true },
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  doctorName: { type: String, required: true },
  tokenNumber: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['waiting', 'current', 'completed', 'cancelled'], 
    default: 'waiting' 
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
