import re

with open('JEC.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace Firebase 9 compat with Firebase 8
html = html.replace(
    '<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>',
    '<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>'
)
html = html.replace(
    '<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>',
    '<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"></script>'
)

with open('JEC.html', 'w', encoding='utf-8') as f:
    f.write(html)
