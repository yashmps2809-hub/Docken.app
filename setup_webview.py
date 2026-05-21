import os
import shutil

# 1. Create assets folder and copy files
assets_dir = r"DockenAndroid\app\src\main\assets"
os.makedirs(assets_dir, exist_ok=True)
shutil.copy("JEC.html", os.path.join(assets_dir, "JEC.html"))
shutil.copy("icon.svg", os.path.join(assets_dir, "icon.svg"))

# 2. Update AndroidManifest.xml
manifest_path = r"DockenAndroid\app\src\main\AndroidManifest.xml"
with open(manifest_path, 'r', encoding='utf-8') as f:
    manifest = f.read()

permissions = '''
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
'''
if "android.permission.INTERNET" not in manifest:
    manifest = manifest.replace('<application', permissions + '\n    <application')

with open(manifest_path, 'w', encoding='utf-8') as f:
    f.write(manifest)

# 3. Update MainActivity.kt
main_activity_path = r"DockenAndroid\app\src\main\java\com\example\docken\MainActivity.kt"
kt_code = '''package com.example.docken

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.GeolocationPermissions
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.setGeolocationEnabled(true)
        
        webView.webViewClient = WebViewClient()
        webView.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(
                origin: String,
                callback: GeolocationPermissions.Callback
            ) {
                callback.invoke(origin, true, false)
            }
        }
        
        setContentView(webView)
        webView.loadUrl("file:///android_asset/JEC.html")
    }
}
'''
with open(main_activity_path, 'w', encoding='utf-8') as f:
    f.write(kt_code)

print("WebView wrapper configured successfully.")
