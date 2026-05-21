const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

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
app.use('/api/clinics', clinicRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/doctors', doctorRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'active', message: 'DOCKEN API is running' });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

module.exports = app;
