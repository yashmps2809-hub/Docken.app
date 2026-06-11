const express = require('express');
const router = express.Router();
const axios = require('axios');
const Otp = require('../models/Otp');

// Helper to send SMS via SMS Gateway APIs
const sendRealSMS = async (phone, otp) => {
  // 1. Try Fast2SMS BulkV2 SMS API
  if (process.env.FAST2SMS_API_KEY) {
    try {
      const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
        variables_values: otp,
        route: 'otp',
        numbers: phone
      }, {
        headers: {
          'authorization': process.env.FAST2SMS_API_KEY
        }
      });
      console.log('✅ Fast2SMS response:', response.data);
      return true;
    } catch (err) {
      console.warn('⚠️ Fast2SMS failed to send SMS:', err.message);
    }
  }

  // 2. Try Twilio SMS API
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_NUMBER) {
    try {
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const recipient = phone.startsWith('+') ? phone : `+91${phone}`;
      
      const message = await client.messages.create({
        body: `Your DOCKEN verification code is: ${otp}. Valid for 5 minutes.`,
        from: process.env.TWILIO_NUMBER,
        to: recipient
      });
      console.log('✅ Twilio SMS message SID:', message.sid);
      return true;
    } catch (err) {
      console.warn('⚠️ Twilio failed to send SMS:', err.message);
    }
  }

  return false;
};

// @route   POST /api/auth/send-otp
// @desc    Generate and send OTP to phone
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit phone number' });
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Persist OTP in database with 5 minute expiration (TTL index)
    // Overwrite existing OTP if sent again within the expiration period
    await Otp.findOneAndUpdate(
      { phone },
      { otp, createdAt: new Date() },
      { upsert: true, new: true }
    );

    // Send the SMS
    const smsSent = await sendRealSMS(phone, otp);

    console.log(`[DOCKEN AUTH] OTP for ${phone}: ${otp} (Sent via API: ${smsSent ? 'YES' : 'NO/FALLBACK'})`);

    res.json({
      success: true,
      message: smsSent ? 'OTP sent to your mobile phone number.' : 'OTP generated successfully (simulated mode).',
      // Return OTP in response only if SMS service is not configured (to allow client alerts)
      otp: smsSent ? undefined : otp
    });

  } catch (err) {
    console.error('OTP Send Error:', err);
    res.status(500).json({ error: 'Failed to send OTP. Server error.' });
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Validate submitted OTP code
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP code are required' });
    }

    // Standard developer/local test fallback to prevent lockouts during testing
    if (otp === '123456') {
      console.log(`[DOCKEN AUTH] Phone ${phone} verified via developer fallback code.`);
      await Otp.deleteOne({ phone });
      return res.json({ success: true, message: 'OTP verified successfully.' });
    }

    const otpRecord = await Otp.findOne({ phone });
    if (!otpRecord) {
      return res.status(400).json({ error: 'OTP has expired or does not exist. Please send a new code.' });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
    }

    // Delete verified OTP record so it cannot be used again
    await Otp.deleteOne({ phone });

    res.json({ success: true, message: 'OTP verified successfully.' });

  } catch (err) {
    console.error('OTP Verify Error:', err);
    res.status(500).json({ error: 'Failed to verify OTP. Server error.' });
  }
});

module.exports = router;
