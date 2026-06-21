// =====================================================
// Nawaqes — Capacitor Configuration
// =====================================================
// This configures how Capacitor wraps the React app into a native APK.
// Docs: https://capacitorjs.com/docs/config
// =====================================================

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nawaqes.app',
  appName: 'نواقص',
  webDir: 'dist',
  backgroundColor: '#1e0c0c',
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Required: server URL points to the deployed backend
    // When bundled as APK, the React app is loaded from the device
    // but it calls this remote server for all API/WebSocket traffic
  },
  server: {
    // Force the app to load from bundled assets (offline-capable UI)
    // but the app's fetch() calls hit the remote API URL
    androidScheme: 'https',
    // For debugging, you can switch to remote URL:
    // url: 'https://safwatkhokha-nawaqes.hf.space',
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#1e0c0c',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#DC2626',
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_launcher',
      iconColor: '#DC2626',
      sound: 'beep.wav',
    },
    Camera: {
      permissions: ['camera', 'photos'],
    },
    Geolocation: {
      permissions: ['location'],
    },
  },
  cordova: {},
};

export default config;
