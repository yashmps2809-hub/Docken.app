const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Optional because Google/OTP might not set it
  phone: { type: String, required: false },
  specialty: { type: String, default: "General Physician" },
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  isLive: { type: Boolean, default: false },
  rating: { type: Number, default: 5.0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Doctor', doctorSchema);
