import re

with open('JEC.html', 'r', encoding='utf-8') as f:
    html = f.read()

old_config = """const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};"""

new_config = """const firebaseConfig = {
  apiKey: "AIzaSyAr0H7ka8lvOdUUGq6_gsuYgDDfNmnKsAI",
  authDomain: "docken-67063.firebaseapp.com",
  projectId: "docken-67063",
  storageBucket: "docken-67063.firebasestorage.app",
  messagingSenderId: "591309839949",
  appId: "1:591309839949:web:dce463e3e9ed9e4486c604",
  measurementId: "G-HH9KJR1T5X"
};"""

html = html.replace(old_config, new_config)

with open('JEC.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Firebase keys injected successfully!")
