#!/usr/bin/env python3
"""
Nawaqes — Minimal WebView APK Generator
=========================================
Creates a complete Android Studio project that wraps the PWA in a WebView.
No Capacitor, no Cordova, no Bubblewrap — just pure Android Java + Gradle.

The output is a ready-to-build Android project that can be opened in
Android Studio OR built via Gradle from command line.

Usage:
    python3 generate-webview-apk.py
    # Output: /home/z/my-project/nawaqes-apk/webview-apk/
    # Open in Android Studio OR run:
    #   cd webview-apk && ./gradlew assembleDebug
"""

import os
import shutil
import json
from pathlib import Path

# Configuration
CONFIG = {
    "package": "com.nawaqes.app",
    "app_name": "نواقص",
    "app_name_en": "Nawaqes",
    "version_code": 1,
    "version_name": "2.0.0",
    "min_sdk": 24,
    "target_sdk": 34,
    "compile_sdk": 34,
    "pwa_url": "https://safwatkhokha-nawaqes.hf.space",
    "color_primary": "#DC2626",
    "color_primary_dark": "#B91C1C",
    "color_accent": "#F59E0B",
    "color_background": "#1E0C0C",
    "keystore_path": "nawaqes.keystore",
    "keystore_alias": "nawaqes",
    "keystore_password": "nawaqes123",
    "key_password": "nawaqes123",
}

BASE_DIR = Path("/home/z/my-project/nawaqes-apk/webview-apk")
ICONS_SRC = Path("/home/z/my-project/nawaqes-apk/apk-source/res")
ASSETS_SRC = Path("/home/z/my-project/nawaqes-apk/assets")


def write(path: Path, content: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding='utf-8')


def main():
    print(f"Generating WebView APK project at: {BASE_DIR}")

    # Clean previous output
    if BASE_DIR.exists():
        shutil.rmtree(BASE_DIR)
    BASE_DIR.mkdir(parents=True)

    pkg_path = CONFIG["package"].replace('.', '/')

    # ---- Root files ----
    write(BASE_DIR / "settings.gradle", f"""pluginManagement {{
    repositories {{
        google()
        mavenCentral()
        gradlePluginPortal()
    }}
}}
dependencyResolutionManagement {{
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {{
        google()
        mavenCentral()
    }}
}}
rootProject.name = "Nawaqes"
include ':app'
""")

    write(BASE_DIR / "build.gradle", f"""// Top-level build file
plugins {{
    id 'com.android.application' version '8.5.2' apply false
}}
""")

    write(BASE_DIR / "gradle.properties", f"""android.useAndroidX=true
android.nonTransitiveRClass=true
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
org.gradle.parallel=true
org.gradle.caching=true
""")

    # ---- App module ----
    app_dir = BASE_DIR / "app"

    write(app_dir / "build.gradle", f"""apply plugin: 'com.android.application'

android {{
    namespace '{CONFIG["package"]}'
    compileSdk {CONFIG["compile_sdk"]}

    defaultConfig {{
        applicationId "{CONFIG["package"]}"
        minSdk {CONFIG["min_sdk"]}
        targetSdk {CONFIG["target_sdk"]}
        versionCode {CONFIG["version_code"]}
        versionName "{CONFIG["version_name"]}"
        multiDexEnabled true
    }}

    signingConfigs {{
        release {{
            storeFile file('{CONFIG["keystore_path"]}')
            storePassword '{CONFIG["keystore_password"]}'
            keyAlias '{CONFIG["keystore_alias"]}'
            keyPassword '{CONFIG["key_password"]}'
        }}
    }}

    buildTypes {{
        release {{
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }}
        debug {{
            minifyEnabled false
            debuggable true
        }}
    }}

    compileOptions {{
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }}

    lint {{
        abortOnError false
        checkReleaseBuilds false
    }}
}}

dependencies {{
    implementation 'androidx.appcompat:appcompat:1.7.0'
    implementation 'androidx.core:core:1.13.1'
    implementation 'androidx.webkit:webkit:1.11.0'
    implementation 'androidx.swiperefreshlayout:swiperefreshlayout:1.1.0'
    implementation 'androidx.multidex:multidex:2.0.1'
    implementation 'com.google.android.material:material:1.12.0'

    // Firebase (push notifications)
    implementation platform('com.google.firebase:firebase-bom:33.1.2')
    implementation 'com.google.firebase:firebase-messaging:24.0.0'

    // WorkManager (for background sync)
    implementation 'androidx.work:work-runtime:2.9.1'
}}

if (file('google-services.json').exists()) {{
    apply plugin: 'com.google.gms.google-services'
}}
""")

    write(app_dir / "proguard-rules.pro", """# Keep WebView JS interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.nawaqes.app.** { *; }
-dontwarn com.google.firebase.**
""")

    # ---- AndroidManifest.xml ----
    manifest_dir = app_dir / "src" / "main"
    write(manifest_dir / "AndroidManifest.xml", f"""<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
        android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
        android:maxSdkVersion="29" />

    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.microphone" android:required="false" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:largeHeap="true"
        android:hardwareAccelerated="true"
        android:usesCleartextTraffic="false"
        android:networkSecurityConfig="@xml/network_security_config"
        android:theme="@style/AppTheme"
        tools:targetApi="34">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|layoutDirection|fontSize|smallestScreenSize|screenLayout|uiMode"
            android:windowSoftInputMode="adjustResize"
            android:theme="@style/SplashTheme">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            <intent-filter android:autoVerify="false">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="safwatkhokha-nawaqes.hf.space" />
                <data android:scheme="nawaqes" />
            </intent-filter>
        </activity>

        <service
            android:name=".NawaqesFirebaseMessagingService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>

        <meta-data android:name="com.google.firebase.messaging.default_notification_channel_id"
            android:value="nawaqes_default" />
        <meta-data android:name="com.google.firebase.messaging.default_notification_icon"
            android:resource="@mipmap/ic_launcher" />
        <meta-data android:name="com.google.firebase.messaging.default_notification_color"
            android:resource="@color/colorPrimary" />

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${{applicationId}}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>

    </application>
</manifest>
""")

    # ---- Java sources ----
    java_dir = manifest_dir / "java" / pkg_path
    write(java_dir / "MainActivity.java", f"""package {CONFIG["package"]};

import android.annotation.SuppressLint;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.NotificationManagerCompat;

public class MainActivity extends AppCompatActivity {{

    private WebView webView;
    private static final String REMOTE_URL = "{CONFIG["pwa_url"]}";
    private static final String CHANNEL_DEFAULT = "nawaqes_default";
    private static final String CHANNEL_MESSAGES = "nawaqes_messages";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {{
        setTheme(R.style.AppTheme);
        super.onCreate(savedInstanceState);

        // Setup notification channels
        createNotificationChannels();

        // Fullscreen layout
        FrameLayout layout = new FrameLayout(this);
        layout.setLayoutParams(new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT));

        webView = new WebView(this);
        webView.setLayoutParams(new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT));
        layout.addView(webView);
        setContentView(layout);

        // Configure WebView
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setGeolocationEnabled(true);

        // Enable cookie persistence
        android.webkit.CookieManager.getInstance().setAcceptCookie(true);
        android.webkit.CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        // WebView client (handles internal navigation)
        webView.setWebViewClient(new WebViewClient() {{
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {{
                String url = req.getUrl().toString();
                // Open external links (tel:, mailto:, external https) outside the app
                if (url.startsWith("tel:") || url.startsWith("mailto:") ||
                    url.startsWith("whatsapp:") || url.startsWith("intent:")) {{
                    try {{
                        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                        return true;
                    }} catch (Exception e) {{ return false; }}
                }}
                // Same-origin URLs load inside the WebView
                if (url.startsWith(REMOTE_URL) || url.startsWith("about:")) {{
                    return false;
                }}
                // External HTTP(S) links open in browser
                try {{
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                    return true;
                }} catch (Exception e) {{ return false; }}
            }}
        }});

        // Chrome client (handles permissions, fullscreen, file chooser)
        webView.setWebChromeClient(new WebChromeClient() {{
            @Override
            public void onPermissionRequest(final PermissionRequest request) {{
                runOnUiThread(() -> request.grant(request.getResources()));
            }}

            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {{
                // TODO: fullscreen video support
                super.onShowCustomView(view, callback);
            }}
        }});

        // Handle back button
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {{
            @Override
            public void handleOnBackPressed() {{
                if (webView != null && webView.canGoBack()) {{
                    webView.goBack();
                }} else {{
                    setEnabled(false);
                    onBackPressed();
                }}
            }}
        }});

        // Load URL (or deep link if launched from notification)
        String initialUrl = REMOTE_URL;
        Intent intent = getIntent();
        if (intent != null && intent.getData() != null) {{
            initialUrl = intent.getData().toString();
        }}
        webView.loadUrl(initialUrl);
    }}

    private void createNotificationChannels() {{
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;

        NotificationChannel defaultCh = new NotificationChannel(
            CHANNEL_DEFAULT, "إشعارات عامة", NotificationManager.IMPORTANCE_DEFAULT);
        defaultCh.setDescription("إشعارات التطبيق العامة");
        nm.createNotificationChannel(defaultCh);

        NotificationChannel messagesCh = new NotificationChannel(
            CHANNEL_MESSAGES, "الرسائل", NotificationManager.IMPORTANCE_HIGH);
        messagesCh.setDescription("إشعارات الرسائل الجديدة");
        messagesCh.enableVibration(true);
        messagesCh.setVibrationPattern(new long[]{{0, 200, 100, 200}});
        nm.createNotificationChannel(messagesCh);
    }}

    @Override
    protected void onSaveInstanceState(Bundle outState) {{
        super.onSaveInstanceState(outState);
        if (webView != null) webView.saveState(outState);
    }}

    @Override
    protected void onRestoreInstanceState(Bundle savedInstanceState) {{
        super.onRestoreInstanceState(savedInstanceState);
        if (webView != null && savedInstanceState != null) {{
            webView.restoreState(savedInstanceState);
        }}
    }}

    @Override
    protected void onNewIntent(Intent intent) {{
        super.onNewIntent(intent);
        setIntent(intent);
        if (intent != null && intent.getData() != null && webView != null) {{
            webView.loadUrl(intent.getData().toString());
        }}
    }}
}}
""")

    write(java_dir / "NawaqesFirebaseMessagingService.java", f"""package {CONFIG["package"]};

import android.app.PendingIntent;
import android.content.Intent;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class NawaqesFirebaseMessagingService extends FirebaseMessagingService {{

    private static final String TAG = "NawaqesFCM";
    private static int notifId = 1000;

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {{
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "From: " + remoteMessage.getFrom());

        String title = "نواقص";
        String body = "";
        String url = "/";
        String channelId = "nawaqes_default";

        if (remoteMessage.getNotification() != null) {{
            title = remoteMessage.getNotification().getTitle() != null
                ? remoteMessage.getNotification().getTitle() : title;
            body = remoteMessage.getNotification().getBody() != null
                ? remoteMessage.getNotification().getBody() : body;
        }}

        if (remoteMessage.getData().containsKey("title")) title = remoteMessage.getData().get("title");
        if (remoteMessage.getData().containsKey("body")) body = remoteMessage.getData().get("body");
        if (remoteMessage.getData().containsKey("url")) url = remoteMessage.getData().get("url");
        if (remoteMessage.getData().containsKey("channel")) channelId = remoteMessage.getData().get("channel");

        showNotification(title, body, url, channelId);
    }}

    private void showNotification(String title, String body, String url, String channelId) {{
        try {{
            Intent intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            intent.setData(Uri.parse(url));

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {{
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }}
            PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent, flags);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
                .setVibrate(new long[]{{0, 200, 100, 200}})
                .setContentIntent(pendingIntent)
                .setColor(getResources().getColor(R.color.colorPrimary))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body));

            NotificationManagerCompat.from(this).notify(notifId++, builder.build());
        }} catch (Exception e) {{
            Log.e(TAG, "showNotification failed", e);
        }}
    }}

    @Override
    public void onNewToken(String token) {{
        Log.d(TAG, "Refreshed FCM token: " + token);
        getSharedPreferences("nawaqes", MODE_PRIVATE)
            .edit().putString("fcm_token", token).apply();
    }}
}}
""")

    # ---- Resources ----
    res_dir = manifest_dir / "res"

    write(res_dir / "values" / "strings.xml", f"""<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">{CONFIG["app_name"]}</string>
    <string name="app_name_en">{CONFIG["app_name_en"]}</string>
    <string name="channel_default">إشعارات عامة</string>
    <string name="channel_messages">الرسائل</string>
</resources>
""")

    write(res_dir / "values" / "colors.xml", f"""<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">{CONFIG["color_primary"]}</color>
    <color name="colorPrimaryDark">{CONFIG["color_primary_dark"]}</color>
    <color name="colorAccent">{CONFIG["color_accent"]}</color>
    <color name="colorBackground">{CONFIG["color_background"]}</color>
    <color name="colorWhite">#FFFFFF</color>
</resources>
""")

    write(res_dir / "values" / "styles.xml", f"""<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
        <item name="colorAccent">@color/colorAccent</item>
        <item name="android:windowBackground">@color/colorBackground</item>
        <item name="android:statusBarColor">@color/colorPrimary</item>
        <item name="android:navigationBarColor">@color/colorBackground</item>
    </style>
    <style name="SplashTheme" parent="Theme.AppCompat.NoActionBar">
        <item name="android:windowBackground">@drawable/splash</item>
        <item name="android:statusBarColor">@color/colorBackground</item>
        <item name="android:windowFullscreen">true</item>
    </style>
</resources>
""")

    write(res_dir / "values-night" / "styles.xml", f"""<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.NoActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
        <item name="colorAccent">@color/colorAccent</item>
        <item name="android:windowBackground">@color/colorBackground</item>
        <item name="android:statusBarColor">@color/colorPrimary</item>
        <item name="android:navigationBarColor">@color/colorBackground</item>
    </style>
</resources>
""")

    write(res_dir / "values-ar" / "strings.xml", f"""<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">{CONFIG["app_name"]}</string>
</resources>
""")

    write(res_dir / "xml" / "network_security_config.xml", """<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">safwatkhokha-nawaqes.hf.space</domain>
        <domain includeSubdomains="true">huggingface.co</domain>
        <domain includeSubdomains="true">firebaseio.com</domain>
        <domain includeSubdomains="true">googleapis.com</domain>
    </domain-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
""")

    write(res_dir / "xml" / "file_paths.xml", """<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <cache-path name="cache" path="." />
    <files-path name="files" path="." />
    <external-path name="external" path="." />
</paths>
""")

    # ---- Copy icons ----
    for dpi, size in [("mipmap-mdpi", 48), ("mipmap-hdpi", 72),
                       ("mipmap-xhdpi", 96), ("mipmap-xxhdpi", 144),
                       ("mipmap-xxxhdpi", 192)]:
        src_dir = ICONS_SRC / dpi
        dst_dir = res_dir / dpi
        if src_dir.exists():
            dst_dir.mkdir(parents=True, exist_ok=True)
            for f in src_dir.iterdir():
                shutil.copy2(f, dst_dir / f.name)

    # Copy splash drawable
    drawable_dir = res_dir / "drawable"
    drawable_dir.mkdir(parents=True, exist_ok=True)
    if (ASSETS_SRC / "splash-1080x1920.png").exists():
        shutil.copy2(ASSETS_SRC / "splash-1080x1920.png", drawable_dir / "splash.png")

    # ---- gradle wrapper ----
    gradle_wrapper_dir = BASE_DIR / "gradle" / "wrapper"
    gradle_wrapper_dir.mkdir(parents=True, exist_ok=True)
    write(gradle_wrapper_dir / "gradle-wrapper.properties", f"""distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.7-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
""")

    # ---- README ----
    write(BASE_DIR / "README.md", f"""# Nawaqes — WebView APK Build

Generated project. Build APK from command line:

```bash
# Install Android SDK + JDK 17 first
cd /home/z/my-project/nawaqes-apk/webview-apk
./gradlew assembleDebug

# Output: app/build/outputs/apk/debug/app-debug.apk
```

Or open in Android Studio:
1. Open this folder in Android Studio
2. Wait for Gradle sync
3. Build > Build Bundle(s)/APK(s) > Build APK(s)

## Configuration

- App ID: `{CONFIG["package"]}`
- App name: `{CONFIG["app_name"]}`
- PWA URL: `{CONFIG["pwa_url"]}`
- Version: {CONFIG["version_name"]} ({CONFIG["version_code"]})
- Min SDK: {CONFIG["min_sdk"]} (Android 7.0)
- Target SDK: {CONFIG["target_sdk"]} (Android 14)

## Firebase Push Notifications

1. Download `google-services.json` from Firebase Console
2. Place it at: `app/google-services.json`
3. Rebuild APK

## Generate keystore for release builds

```bash
keytool -genkey -v -keystore nawaqes.keystore -alias nawaqes \\
  -keyalg RSA -keysize 2048 -validity 10000
```

## Build release APK

```bash
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk
```
""")

    print(f"\n✅ WebView APK project generated at: {BASE_DIR}")
    print(f"   To build: cd {BASE_DIR} && ./gradlew assembleDebug")
    print(f"   Output: {BASE_DIR}/app/build/outputs/apk/debug/app-debug.apk")


if __name__ == "__main__":
    main()
