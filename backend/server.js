const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const admin = require('firebase-admin');

// Safe Firebase Admin Initialization (Plug-and-Play)
try {
  const serviceAccount = require('./firebase-adminsdk.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin SDK Initialized!');
} catch (error) {
  console.warn('⚠️ Firebase Admin SDK not initialized: Missing firebase-adminsdk.json file. Push Notifications disabled.');
}

const clinicRoutes = require('./routes/clinicRoutes');
const queueRoutes = require('./routes/queueRoutes');
const doctorRoutes = require('./routes/doctorRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/docken')
.then(() => console.log('✅ MongoDB Connected!'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// API Routes
app.use('/api/clinics', require('./routes/clinicRoutes'));
app.use('/api/doctors', require('./routes/doctorRoutes'));
app.use('/api/queue', require('./routes/queueRoutes'));
app.use('/api/receptionists', require('./routes/receptionistRoutes'));

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'active', message: 'DOCKEN API is running' });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

module.exports = app;
