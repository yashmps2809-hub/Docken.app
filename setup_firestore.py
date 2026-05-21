import re

with open('JEC.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Add Firestore SDK
html = html.replace(
    '<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"></script>',
    '<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"></script>\n<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js"></script>'
)

# 2. Add Firestore initialization
db_init = '''try {
  firebase.initializeApp(firebaseConfig);
} catch (e) {
  console.error("Firebase init error:", e);
}
const db = firebase.firestore(); // Initialize Firestore
'''
html = html.replace('''try {
  firebase.initializeApp(firebaseConfig);
} catch (e) {
  console.error("Firebase init error:", e);
}''', db_init)

# 3. Replace bookAppointment function
old_booking = r'''function bookAppointment\(\) \{.*?showToast\('✅ Appointment Confirmed! Check your queue status\.'\);.*?showPage\('live-queue'\);.*?\}'''

new_booking = '''function bookAppointment() {
  const name = document.getElementById('book-name').value;
  const phone = document.getElementById('book-phone').value;
  
  if(!name || !phone) {
    showToast('⚠️ Please enter your name and phone number');
    return;
  }
  
  showToast('⏳ Booking your appointment...');
  
  // Save to Firebase Firestore
  db.collection("bookings").add({
    name: name,
    phone: phone,
    clinic: 'Apollo Clinic, Banjara Hills',
    status: 'waiting',
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then((docRef) => {
    showToast('✅ Appointment Confirmed! Check your queue status.');
    showPage('live-queue');
  })
  .catch((error) => {
    console.error("Error adding document: ", error);
    showToast('❌ Database Error. Are you sure you enabled Firestore?');
    // Fallback to offline mode
    showPage('live-queue');
  });
}'''

# Ensure the HTML inputs in the booking form have the right IDs so the script can grab them
html = html.replace('<input class="form-input" placeholder="Full name">', '<input class="form-input" id="book-name" placeholder="Full name">')
html = html.replace('<input class="form-input" placeholder="+91 XXXXX XXXXX" type="tel">', '<input class="form-input" id="book-phone" placeholder="+91 XXXXX XXXXX" type="tel">')

# Let's replace the JS function using string matching if regex is too brittle
# Actually, the user doesn't have a `bookAppointment()` function in the JS block yet! 
# Let me check if bookAppointment exists in the script block. Wait! Let me check the HTML file. 
