package com.nawaqes.app;

import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.webkit.CookieManager;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.content.Intent;
import android.net.Uri;
import android.annotation.SuppressLint;

import com.getcapacitor.BridgeActivity;

/**
 * Nawaqes Main Activity
 * Loads the React app via Capacitor's bridge.
 * Handles deep links, splash screen dismissal, and WebView configuration.
 */
public class MainActivity extends BridgeActivity {

    private static final String REMOTE_URL = "https://safwatkhokha-nawaqes.hf.space";

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    public void onCreate(Bundle savedInstanceState) {
        // Apply splash theme before content loads
        setTheme(R.style.AppTheme);
        super.onCreate(savedInstanceState);

        // Configure window
        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(getResources().getColor(R.color.colorPrimary));
        window.setNavigationBarColor(getResources().getColor(R.color.colorBackground));

        // Handle deep link intent
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    /**
     * Handle incoming deep links (nawaqes:// or https://safwatkhokha-nawaqes.hf.space)
     */
    private void handleIntent(Intent intent) {
        if (intent == null) return;
        Uri uri = intent.getData();
        if (uri == null) return;

        String url = uri.toString();
        // Pass URL to the WebView via JavaScript
        bridge.getWebView().post(() -> {
            bridge.getWebView().evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('nawaqes:deeplink', { detail: '" + url + "' }));",
                null
            );
        });
    }

    @Override
    public void onBackPressed() {
        WebView webView = bridge.getWebView();
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
