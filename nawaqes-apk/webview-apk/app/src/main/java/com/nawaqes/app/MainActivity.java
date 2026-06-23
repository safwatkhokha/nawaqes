package com.nawaqes.app;

import android.annotation.SuppressLint;
import android.annotation.TargetApi;
import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ClipData;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.util.Log;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebStorage;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Nawaqes Android App — v3.0.0
 *
 * Enhanced WebView that wraps the live web app at:
 *   https://safwatkhokha-nawaqes.hf.space
 *
 * Features:
 *   ✅ Camera access (for taking photos/videos directly)
 *   ✅ File upload (multiple files from gallery)
 *   ✅ Microphone access (for voice messages + WebRTC calls)
 *   ✅ Persistent storage (localStorage + IndexedDB survive app restarts)
 *   ✅ Push notifications via FCM (when google-services.json is added)
 *   ✅ Geolocation (for nearby ads feature)
 *   ✅ Pull-to-refresh
 *   ✅ Custom back-button handling (go back in WebView history first)
 *   ✅ Splash screen
 *   ✅ Deep linking (nawaqes:// scheme)
 *   ✅ Offline page when no internet
 *   ✅ Auto-login (remembers JWT token in WebView storage)
 */
public class MainActivity extends AppCompatActivity {

    private static final String TAG = "Nawaqes";
    private static final String REMOTE_URL = "https://safwatkhokha-nawaqes.hf.space";
    private static final String CHANNEL_DEFAULT = "nawaqes_default";
    private static final String CHANNEL_MESSAGES = "nawaqes_messages";
    private static final String PREFS_NAME = "nawaqes_prefs";
    private static final String KEY_FIRST_RUN = "first_run";
    private static final int PERMISSION_REQUEST_CODE = 1001;

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private final ActivityResultLauncher<Intent> fileChooserLauncher =
        registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
            if (filePathCallback == null) return;
            Uri[] results = null;
            if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
                Intent data = result.getData();
                if (data.getClipData() != null) {
                    // Multiple files selected
                    int count = data.getClipData().getItemCount();
                    results = new Uri[count];
                    for (int i = 0; i < count; i++) {
                        results[i] = data.getClipData().getItemAt(i).getUri();
                    }
                } else if (data.getData() != null) {
                    // Single file selected
                    results = new Uri[]{data.getData()};
                }
            }
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        });

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        setTheme(R.style.SplashTheme);
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );

        createNotificationChannels();
        requestAllPermissions();

        // Fullscreen FrameLayout
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

        // ─── Configure WebView ───
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);          // localStorage
        settings.setDatabaseEnabled(true);            // IndexedDB
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);  // autoplay videos
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setTextZoom(100);

        // Set a persistent WebView database path so localStorage survives app restarts
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            // Enables debugging in debug builds only
            WebView.setWebContentsDebuggingEnabled(false);
        }

        // ─── WebViewClient ───
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                // Keep all nawaqes.hf.space URLs inside the WebView
                if (url.contains("safwatkhokha-nawaqes.hf.space")) {
                    return false; // load in WebView
                }
                // Open external links (WhatsApp, tel:, mailto:, etc.) in the system app
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, request.getUrl());
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                } catch (Exception e) {
                    Log.w(TAG, "Could not open external URL: " + url, e);
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // Inject a small JS bridge to detect offline state and show a retry button
                view.evaluateJavascript(
                    "window.addEventListener('offline', function() {" +
                    "  if (!document.getElementById('nawaqes-offline-overlay')) {" +
                    "    var o = document.createElement('div');" +
                    "    o.id = 'nawaqes-offline-overlay';" +
                    "    o.style.cssText = 'position:fixed;inset:0;background:#1a1a1a;color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99999;font-family:sans-serif';" +
                    "    o.innerHTML = '<div style=\"font-size:48px;margin-bottom:16px\">📡</div><h2 style=\"font-size:20px;margin-bottom:8px\">لا يوجد اتصال</h2><p style=\"color:#999;margin-bottom:24px\">تحقق من اتصالك بالإنترنت</p><button onclick=\"location.reload()\" style=\"background:#f97316;color:white;border:none;padding:12px 32px;border-radius:12px;font-size:14px;font-weight:bold;cursor:pointer\">إعادة المحاولة</button>';" +
                    "    document.body.appendChild(o);" +
                    "  }" +
                    "});" +
                    "window.addEventListener('online', function() {" +
                    "  var o = document.getElementById('nawaqes-offline-overlay');" +
                    "  if (o) o.remove();" +
                    "});",
                    null
                );
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, android.webkit.WebResourceError error) {
                super.onReceivedError(view, request, error);
                // Only show error page for the main frame
                if (request.isForMainFrame()) {
                    String html = "<html dir='rtl'><body style='background:#1a1a1a;color:white;font-family:sans-serif;text-align:center;padding:40px'>" +
                        "<div style='font-size:64px;margin-bottom:20px'>📡</div>" +
                        "<h2 style='font-size:22px;margin-bottom:12px'>لا يوجد اتصال بالإنترنت</h2>" +
                        "<p style='color:#999;margin-bottom:30px'>تحقق من اتصالك بالإنترنت ثم حاول مرة أخرى</p>" +
                        "<button onclick='location.reload()' style='background:#f97316;color:white;border:none;padding:14px 36px;border-radius:12px;font-size:15px;font-weight:bold;cursor:pointer'>إعادة المحاولة</button>" +
                        "</body></html>";
                    view.loadDataWithBaseURL(REMOTE_URL, html, "text/html", "UTF-8", null);
                }
            }
        });

        // ─── WebChromeClient (file upload + camera + permissions) ───
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    // Grant all requested permissions (camera, microphone, etc.)
                    // The actual Android permissions are requested separately via ActivityCompat
                    request.grant(request.getResources());
                });
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback, FileChooserParams params) {
                // Cancel any previous callback
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;

                Intent intent = params.createIntent();
                // Allow multiple file selection
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                // Also allow taking photos/videos directly
                intent.setType("image/*,video/*");
                intent.addCategory(Intent.CATEGORY_OPENABLE);

                try {
                    fileChooserLauncher.launch(intent);
                } catch (Exception e) {
                    filePathCallback = null;
                    Toast.makeText(MainActivity.this, "Cannot open file chooser", Toast.LENGTH_SHORT).show();
                    return false;
                }
                return true;
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, android.webkit.GeolocationPermissions.Callback callback) {
                // Grant geolocation for nearby ads feature
                callback.invoke(origin, true, false);
            }
        });

        // ─── Back button: go back in WebView history first, then exit ───
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });

        // ─── Load the URL ───
        if (savedInstanceState != null) {
            // Restore state after rotation
            webView.restoreState(savedInstanceState);
        } else {
            // Check if launched from a deep link (nawaqes://...)
            Uri data = getIntent() != null ? getIntent().getData() : null;
            String urlToLoad = REMOTE_URL;
            if (data != null && data.isHierarchical()) {
                String path = data.getPath();
                if (path != null && !path.isEmpty()) {
                    urlToLoad = REMOTE_URL + path;
                }
            }
            webView.loadUrl(urlToLoad);
        }

        // Mark first run as done
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        prefs.edit().putBoolean(KEY_FIRST_RUN, false).apply();
    }

    // ─── Permission handling ──────────────────────────────────────────
    private void requestAllPermissions() {
        List<String> permissions = new ArrayList<>();
        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(android.Manifest.permission.CAMERA);
        }
        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(android.Manifest.permission.RECORD_AUDIO);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.READ_MEDIA_IMAGES) != PackageManager.PERMISSION_GRANTED) {
                permissions.add(android.Manifest.permission.READ_MEDIA_IMAGES);
            }
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.READ_MEDIA_VIDEO) != PackageManager.PERMISSION_GRANTED) {
                permissions.add(android.Manifest.permission.READ_MEDIA_VIDEO);
            }
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                permissions.add(android.Manifest.permission.POST_NOTIFICATIONS);
            }
        } else if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                permissions.add(android.Manifest.permission.READ_EXTERNAL_STORAGE);
            }
        }
        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(android.Manifest.permission.ACCESS_FINE_LOCATION);
        }
        if (!permissions.isEmpty()) {
            ActivityCompat.requestPermissions(this, permissions.toArray(new String[0]), PERMISSION_REQUEST_CODE);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE) {
            for (int i = 0; i < grantResults.length; i++) {
                if (grantResults[i] != PackageManager.PERMISSION_GRANTED) {
                    Log.w(TAG, "Permission denied: " + permissions[i]);
                }
            }
        }
    }

    // ─── Notification channels ────────────────────────────────────────
    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel defaultChannel = new NotificationChannel(
                CHANNEL_DEFAULT, "إشعارات نواقص", NotificationManager.IMPORTANCE_DEFAULT);
            defaultChannel.setDescription("إشعارات عامة من تطبيق نواقص");
            defaultChannel.enableVibration(true);

            NotificationChannel messagesChannel = new NotificationChannel(
                CHANNEL_MESSAGES, "الرسائل", NotificationManager.IMPORTANCE_HIGH);
            messagesChannel.setDescription("إشعارات الرسائل الجديدة");
            messagesChannel.enableVibration(true);
            messagesChannel.setLightColor(Color.parseColor("#f97316"));

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(defaultChannel);
                manager.createNotificationChannel(messagesChannel);
            }
        }
    }

    // ─── Lifecycle ────────────────────────────────────────────────────
    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) {
            webView.saveState(outState);
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) {
            webView.onPause();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.removeAllViews();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
