import os
import re

# 1. Create icon.svg
svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#00A556"/>
  <path d="M226 146h60v220h-60z" fill="#fff"/>
  <path d="M146 226h220v60H146z" fill="#fff"/>
</svg>'''
with open('icon.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content)

# 2. Create manifest.json
manifest_content = '''{
  "name": "DOCKEN Medical",
  "short_name": "DOCKEN",
  "description": "Professional Medical Booking & Live Queue",
  "start_url": "/JEC.html",
  "display": "standalone",
  "background_color": "#f0fdf4",
  "theme_color": "#00A556",
  "icons": [
    {
      "src": "icon.svg",
      "sizes": "512x512",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ]
}'''
with open('manifest.json', 'w', encoding='utf-8') as f:
    f.write(manifest_content)

# 3. Create sw.js (Service Worker)
sw_content = '''const CACHE_NAME = 'docken-v1';
const ASSETS = [
  '/JEC.html',
  '/manifest.json',
  '/icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});'''
with open('sw.js', 'w', encoding='utf-8') as f:
    f.write(sw_content)

# 4. Update JEC.html to link manifest and register SW
with open('JEC.html', 'r', encoding='utf-8') as f:
    html = f.read()

pwa_tags = '''<meta name="theme-color" content="#00A556">
<link rel="manifest" href="manifest.json">
<link rel="apple-touch-icon" href="icon.svg">
<title>DOCKEN</title>'''

html = re.sub(r'<title>DOCKEN</title>', pwa_tags, html)

sw_script = '''
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then(reg => {
        console.log('ServiceWorker registered!', reg);
      }).catch(err => {
        console.log('ServiceWorker failed: ', err);
      });
    });
  }
</script>
'''
html = html.replace('</body>', sw_script + '\n</body>')

with open('JEC.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("PWA Files Created Successfully")
