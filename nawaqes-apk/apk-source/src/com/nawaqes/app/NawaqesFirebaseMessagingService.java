package com.nawaqes.app;

import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.util.Log;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

/**
 * Nawaqes Firebase Messaging Service
 * Handles incoming FCM messages when app is in background or foreground.
 */
public class NawaqesFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "NawaqesFCM";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Log.d(TAG, "From: " + remoteMessage.getFrom());

        // Check if message contains a data payload
        if (remoteMessage.getData().size() > 0) {
            Log.d(TAG, "Message data payload: " + remoteMessage.getData());
            String channel = remoteMessage.getData().get("channel");
            handleDataMessage(remoteMessage, channel);
        }

        // Check if message contains a notification payload
        if (remoteMessage.getNotification() != null) {
            Log.d(TAG, "Message Notification Body: " + remoteMessage.getNotification().getBody());
            handleNotificationMessage(remoteMessage);
        }
    }

    private void handleDataMessage(RemoteMessage remoteMessage, String channelId) {
        String title = remoteMessage.getData().get("title");
        String body = remoteMessage.getData().get("body");
        String url = remoteMessage.getData().get("url");

        if (title == null) title = "نواقص";
        if (body == null) body = "لديك إشعار جديد";
        if (url == null) url = "/";
        if (channelId == null) channelId = NawaqesApplication.CHANNEL_DEFAULT;

        NotificationHelper.showNotification(this, title, body, url, channelId);
    }

    private void handleNotificationMessage(RemoteMessage remoteMessage) {
        RemoteMessage.Notification notif = remoteMessage.getNotification();
        String title = notif.getTitle() != null ? notif.getTitle() : "نواقص";
        String body = notif.getBody() != null ? notif.getBody() : "";
        String url = "/";
        if (remoteMessage.getData().containsKey("url")) {
            url = remoteMessage.getData().get("url");
        }

        NotificationHelper.showNotification(
            this, title, body, url, NawaqesApplication.CHANNEL_DEFAULT
        );
    }

    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "Refreshed FCM token: " + token);
        // Send token to server via shared preferences / app event
        getSharedPreferences("nawaqes", Context.MODE_PRIVATE)
            .edit()
            .putString("fcm_token", token)
            .apply();

        // Broadcast token refresh event so the WebView can register it
        sendBroadcast(new android.content.Intent("nawaqes.fcm.token.refresh")
            .setPackage(getPackageName())
            .putExtra("token", token));
    }
}
