const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  doctorName: { type: String, required: true },
  date: { type: String, required: true }, // Format: "YYYY-MM-DD"
  seq: { type: Number, default: 0 }
});

counterSchema.index({ clinicId: 1, doctorName: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Counter', counterSchema);
