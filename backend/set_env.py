import subprocess
import os

mongodb_uri = "mongodb+srv://yashmps2809_db_user:Yashraj%402809@cluster0.ulmmk6l.mongodb.net/docken?retryWrites=true&w=majority"
process = subprocess.Popen(["npx", "vercel", "env", "add", "MONGODB_URI", "production"], 
                           stdin=subprocess.PIPE, 
                           stdout=subprocess.PIPE, 
                           stderr=subprocess.PIPE,
                           text=True,
                           cwd=r"C:\Users\suren\OneDrive\Documents\JEC APP\backend")

stdout, stderr = process.communicate(input=mongodb_uri + "\n")
print("STDOUT:", stdout)
print("STDERR:", stderr)
