# Nawaqes — WebView APK Build

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

- App ID: `com.nawaqes.app`
- App name: `نواقص`
- PWA URL: `https://safwatkhokha-nawaqes.hf.space`
- Version: 2.0.0 (1)
- Min SDK: 24 (Android 7.0)
- Target SDK: 34 (Android 14)

## Firebase Push Notifications

1. Download `google-services.json` from Firebase Console
2. Place it at: `app/google-services.json`
3. Rebuild APK

## Generate keystore for release builds

```bash
keytool -genkey -v -keystore nawaqes.keystore -alias nawaqes \
  -keyalg RSA -keysize 2048 -validity 10000
```

## Build release APK

```bash
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk
```
