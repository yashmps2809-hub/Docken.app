import re
import os

with open('../JEC.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Extract content between <style> and </style>
match = re.search(r'<style>(.*?)</style>', html, re.DOTALL)
if match:
    css_content = match.group(1).strip()
    
    css_path = r'src\index.css'
    os.makedirs(os.path.dirname(css_path), exist_ok=True)
    
    with open(css_path, 'w', encoding='utf-8') as f:
        # Prepend some React specific resets
        f.write("/* Migrated DOCKEN CSS */\n")
        f.write("* { box-sizing: border-box; }\n")
        f.write("html, body, #root { margin: 0; padding: 0; height: 100%; width: 100%; overflow-x: hidden; }\n\n")
        f.write(css_content)
    
    print("CSS successfully extracted to src/index.css")
else:
    print("Could not find <style> block in JEC.html")
