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
app.use('/api/patients', require('./routes/patientRoutes'));

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'active', message: 'DOCKEN API is running' });
});

// Diagnostic check for database connection
app.get('/api/diagnostic', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 2) {
      await new Promise((resolve) => {
        const checkState = () => {
          if (mongoose.connection.readyState !== 2) {
            resolve();
          } else {
            setTimeout(checkState, 100);
          }
        };
        checkState();
      });
    }

    const isConnected = mongoose.connection.readyState === 1;
    let clinicCount = 0;
    let errorMsg = null;

    if (isConnected) {
      const Clinic = require('./models/Clinic');
      try {
        clinicCount = await Clinic.countDocuments({});
      } catch (err) {
        errorMsg = err.message;
      }
    }

    res.json({
      readyState: mongoose.connection.readyState,
      readyStateText: isConnected ? 'Connected' : 'Not Connected',
      hasMongodbUri: !!process.env.MONGODB_URI,
      mongodbUriStart: process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 15) : 'none',
      clinicCount,
      queryError: errorMsg
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

module.exports = app;
