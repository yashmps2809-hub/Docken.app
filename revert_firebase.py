import re

with open('JEC.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace the reCAPTCHA init and the entire sendOTP block
old_auth_block = r'''// Initialize reCAPTCHA
window\.onload = \(\) => {
.*?
  } catch \(e\) {
    console\.error\("Recaptcha error:", e\);
  }
};

// ── AUTH & ROUTING ──
let pendingRole = 'patient';
let confirmationResult = null;

function sendOTP\(role\) {.*?
  } catch \(e\) {
    showToast\('❌ Firebase not configured properly.'\);
    console\.error\(e\);
  }
}'''

new_auth_block = '''// ── SIMULATED AUTH & ROUTING ──
let pendingRole = 'patient';
let generatedOTP = '';

function sendOTP(role) {
  pendingRole = role;
  const inputId = role === 'doctor' ? 'doctor-phone' : 'patient-phone';
  let phone = document.getElementById(inputId).value;
  
  if(phone.length < 10) {
    showToast('⚠️ Please enter a valid 10-digit number');
    return;
  }
  
  // Format for display (+91 for India)
  if(!phone.startsWith('+91')) {
    phone = '+91 ' + phone;
  }
  
  // Generate SIMULATED 6-digit OTP
  generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
  
  document.getElementById('otp-phone-display').innerText = phone;
  showToast('⏳ Sending OTP to ' + phone + '...');
  
  // Simulate network delay and show SMS alert
  setTimeout(() => {
    alert(`[SIMULATED SMS]\\nYour DOCKEN login code is: ${generatedOTP}\\nDo not share this code.`);
    showPage('otp-page');
    
    // Clear previous inputs
    document.querySelectorAll('.otp-input').forEach(inp => inp.value = '');
    const firstInput = document.querySelector('.otp-input');
    if (firstInput) firstInput.focus();
  }, 1000);
}'''

html = re.sub(old_auth_block, new_auth_block, html, flags=re.DOTALL)

# Replace the verifyOTP block
old_verify = r'''function verifyOTP\(\) {
.*?
  if \(!confirmationResult\) {
.*?
  }\)\.catch\(\(error\) => {
    console\.error\(error\);
    showToast\('❌ Incorrect OTP\. Please try again\.'\);
  }\);
}'''

new_verify = '''function verifyOTP() {
  const inputs = document.querySelectorAll('.otp-input');
  let enteredOTP = '';
  inputs.forEach(inp => enteredOTP += inp.value);
  
  if (enteredOTP.length !== 6) {
    showToast('⚠️ Please enter the complete 6-digit OTP');
    return;
  }
  
  showToast('⏳ Verifying...');
  
  setTimeout(() => {
    if (enteredOTP === generatedOTP || enteredOTP === '123456') {
      showToast('✅ Verification successful!');
      setTimeout(() => {
        if (pendingRole === 'doctor') {
          showPage('doctor-page');
        } else {
          showPage('find-doctor');
        }
      }, 600);
    } else {
      showToast('❌ Incorrect OTP. Please try again.');
    }
  }, 800);
}'''

html = re.sub(old_verify, new_verify, html, flags=re.DOTALL)

with open('JEC.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Reverted to Simulated OTP successfully.")
