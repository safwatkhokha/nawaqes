package com.nawaqes.app;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.BridgeActivity;

/**
 * Nawaqes Application class
 * Sets up notification channels on app launch.
 */
public class NawaqesApplication extends Application {

    public static final String CHANNEL_DEFAULT = "nawaqes_default";
    public static final String CHANNEL_MESSAGES = "nawaqes_messages";
    public static final String CHANNEL_MARKET = "nawaqes_market";
    public static final String CHANNEL_WALLET = "nawaqes_wallet";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannels();
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;

        // Default channel (general notifications)
        nm.createNotificationChannel(new NotificationChannel(
            CHANNEL_DEFAULT,
            getString(R.string.channel_default),
            NotificationManager.IMPORTANCE_DEFAULT
        ).setDescription(getString(R.string.channel_default_desc)));

        // Messages channel (high priority)
        NotificationChannel messagesCh = new NotificationChannel(
            CHANNEL_MESSAGES,
            getString(R.string.channel_messages),
            NotificationManager.IMPORTANCE_HIGH
        );
        messagesCh.setDescription(getString(R.string.channel_messages_desc));
        messagesCh.enableVibration(true);
        messagesCh.setVibrationPattern(new long[]{0, 200, 100, 200});
        nm.createNotificationChannel(messagesCh);

        // Market channel
        nm.createNotificationChannel(new NotificationChannel(
            CHANNEL_MARKET,
            getString(R.string.channel_market),
            NotificationManager.IMPORTANCE_DEFAULT
        ).setDescription(getString(R.string.channel_market_desc)));

        // Wallet channel
        nm.createNotificationChannel(new NotificationChannel(
            CHANNEL_WALLET,
            getString(R.string.channel_wallet),
            NotificationManager.IMPORTANCE_HIGH
        ).setDescription(getString(R.string.channel_wallet_desc)));

        Log.i("Nawaqes", "Notification channels created");
    }
}
