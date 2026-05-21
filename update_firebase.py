import re

with open('JEC.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update OTP inputs from 4 to 6
old_otp_inputs = '''<div class="otp-inputs">
        <input type="text" class="otp-input" maxlength="1" onkeyup="moveNext(this, 'otp2')" id="otp1">
        <input type="text" class="otp-input" maxlength="1" onkeyup="moveNext(this, 'otp3')" id="otp2">
        <input type="text" class="otp-input" maxlength="1" onkeyup="moveNext(this, 'otp4')" id="otp3">
        <input type="text" class="otp-input" maxlength="1" id="otp4">
      </div>'''

new_otp_inputs = '''<div class="otp-inputs">
        <input type="text" class="otp-input" maxlength="1" onkeyup="moveNext(this, 'otp2')" id="otp1">
        <input type="text" class="otp-input" maxlength="1" onkeyup="moveNext(this, 'otp3')" id="otp2">
        <input type="text" class="otp-input" maxlength="1" onkeyup="moveNext(this, 'otp4')" id="otp3">
        <input type="text" class="otp-input" maxlength="1" onkeyup="moveNext(this, 'otp5')" id="otp4">
        <input type="text" class="otp-input" maxlength="1" onkeyup="moveNext(this, 'otp6')" id="otp5">
        <input type="text" class="otp-input" maxlength="1" id="otp6">
      </div>'''

html = html.replace(old_otp_inputs, new_otp_inputs)

# Adjust CSS to fit 6 inputs (they might be too wide if we just add 2)
# The current CSS is: width: 60px; height: 75px; 
# Let's adjust to width: 45px; height: 60px; to fit 6 digits better.
html = re.sub(r'width: 60px; height: 75px;', r'width: 45px; height: 60px;', html)

# 2. Inject Firebase CDNs right before the final script tag
firebase_cdns = '''
<!-- FIREBASE SDKs -->
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>

<!-- RECAPTCHA CONTAINER -->
<div id="recaptcha-container"></div>

<script>'''

html = html.replace('<script>', firebase_cdns, 1) # Only replace the first instance, which is the main script

# 3. Inject Firebase init and modify sendOTP / verifyOTP
old_script_start = '''// ── AUTH & ROUTING ──
let pendingRole = 'patient';
let generatedOTP = '';

function sendOTP(role) {
  pendingRole = role;
  const inputId = role === 'doctor' ? 'doctor-phone' : 'patient-phone';
  const phone = document.getElementById(inputId).value;
  
  if(phone.length < 10) {
    showToast('⚠️ Please enter a valid 10-digit number');
    return;
  }
  
  // Generate real-time 4-digit OTP
  generatedOTP = Math.floor(1000 + Math.random() * 9000).toString();
  
  document.getElementById('otp-phone-display').innerText = '+91 ' + phone;
  showToast('📲 OTP sent to ' + phone);
  
  // Simulate SMS by showing an alert with the OTP
  setTimeout(() => {
    alert(`[SIMULATED SMS]\\nYour DOCKEN OTP is: ${generatedOTP}\\nDo not share this with anyone.`);
    showPage('otp-page');
    
    // Clear previous inputs
    document.querySelectorAll('.otp-input').forEach(inp => inp.value = '');
    const firstInput = document.querySelector('.otp-input');
    if (firstInput) firstInput.focus();
  }, 800);
}'''

new_script_start = '''// ── FIREBASE INIT ──
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase (wrapped in try/catch to prevent breaking if keys are invalid)
try {
  firebase.initializeApp(firebaseConfig);
} catch (e) {
  console.error("Firebase init error:", e);
}

// Initialize reCAPTCHA
window.onload = () => {
  try {
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
      'size': 'invisible'
    });
  } catch (e) {
    console.error("Recaptcha error:", e);
  }
};

// ── AUTH & ROUTING ──
let pendingRole = 'patient';
let confirmationResult = null;

function sendOTP(role) {
  pendingRole = role;
  const inputId = role === 'doctor' ? 'doctor-phone' : 'patient-phone';
  let phone = document.getElementById(inputId).value;
  
  if(phone.length < 10) {
    showToast('⚠️ Please enter a valid 10-digit number');
    return;
  }
  
  // Format for Firebase (+91 for India)
  if(!phone.startsWith('+91')) {
    phone = '+91' + phone;
  }
  
  document.getElementById('otp-phone-display').innerText = phone;
  showToast('⏳ Sending OTP...');
  
  const appVerifier = window.recaptchaVerifier;
  
  try {
    firebase.auth().signInWithPhoneNumber(phone, appVerifier)
      .then((result) => {
        confirmationResult = result;
        showToast('📲 OTP SMS sent to ' + phone);
        showPage('otp-page');
        
        // Clear previous inputs
        document.querySelectorAll('.otp-input').forEach(inp => inp.value = '');
        const firstInput = document.querySelector('.otp-input');
        if (firstInput) firstInput.focus();
      }).catch((error) => {
        console.error(error);
        showToast('❌ Failed to send OTP. Check console.');
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.render().then(function(widgetId) {
            grecaptcha.reset(widgetId);
          });
        }
      });
  } catch (e) {
    showToast('❌ Firebase not configured properly.');
    console.error(e);
  }
}'''

html = html.replace(old_script_start, new_script_start)

old_verify = '''function verifyOTP() {
  const inputs = document.querySelectorAll('.otp-input');
  let enteredOTP = '';
  inputs.forEach(inp => enteredOTP += inp.value);
  
  if (enteredOTP.length !== 4) {
    showToast('⚠️ Please enter the complete 4-digit OTP');
    return;
  }
  
  if (enteredOTP !== generatedOTP) {
    showToast('❌ Incorrect OTP. Please try again.');
    return;
  }

  showToast('✅ Verification successful!');
  setTimeout(() => {
    if (pendingRole === 'doctor') {
      showPage('doctor-page');
    } else {
      showPage('find-doctor');
    }
  }, 800);
}'''

new_verify = '''function verifyOTP() {
  const inputs = document.querySelectorAll('.otp-input');
  let enteredOTP = '';
  inputs.forEach(inp => enteredOTP += inp.value);
  
  if (enteredOTP.length !== 6) {
    showToast('⚠️ Please enter the complete 6-digit OTP');
    return;
  }
  
  if (!confirmationResult) {
    showToast('❌ Please request an OTP first.');
    return;
  }
  
  showToast('⏳ Verifying...');
  
  confirmationResult.confirm(enteredOTP).then((result) => {
    // User signed in successfully.
    const user = result.user;
    showToast('✅ Verification successful!');
    
    setTimeout(() => {
      if (pendingRole === 'doctor') {
        showPage('doctor-page');
      } else {
        showPage('find-doctor');
      }
    }, 800);
  }).catch((error) => {
    console.error(error);
    showToast('❌ Incorrect OTP. Please try again.');
  });
}'''

html = html.replace(old_verify, new_verify)

with open('JEC.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Firebase successfully integrated!")
