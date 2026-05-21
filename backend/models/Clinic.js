const mongoose = require('mongoose');

const clinicSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  rating: { type: Number, default: 4.5 },
  // GeoJSON object for MongoDB 2dsphere indexing
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  doctors: [{ type: String }] // Array of doctor names for simplicity
});

// Create a 2dsphere index on the location field so we can query for nearby clinics
clinicSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Clinic', clinicSchema);
