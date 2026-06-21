package com.nawaqes.app;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/**
 * Helper class for building and showing notifications.
 */
public class NotificationHelper {

    private static final String TAG = "NawaqesNotif";
    private static int notificationId = 1000;

    public static void showNotification(Context context, String title, String body,
                                         String url, String channelId) {
        try {
            // Intent to open the app at the specified URL
            Intent intent = new Intent(context, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            intent.setData(Uri.parse(url));

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 0, intent, flags
            );

            Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setSound(defaultSoundUri)
                .setVibrate(new long[]{0, 200, 100, 200})
                .setContentIntent(pendingIntent)
                .setColor(context.getResources().getColor(R.color.colorPrimary))
                .setColorized(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body));

            NotificationManagerCompat nm = NotificationManagerCompat.from(context);
            nm.notify(notificationId++, builder.build());
        } catch (Exception e) {
            Log.e(TAG, "showNotification failed", e);
        }
    }
}
