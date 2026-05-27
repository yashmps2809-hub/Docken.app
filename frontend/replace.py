import os
import glob

pages_dir = r"C:\Users\suren\OneDrive\Documents\JEC APP\frontend\src\pages"
for filepath in glob.glob(os.path.join(pages_dir, "*.jsx")):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content.replace("http://localhost:5000", "https://backend-nine-kappa-32.vercel.app")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
        
print("Replacement complete.")
