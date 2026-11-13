package app.sleepville;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;

/**
 * Keeps the process alive while a mix is loaded, and the CPU awake while it plays,
 * so the sound survives a locked screen. Its notification carries play/pause and close.
 */
public class PlaybackService extends Service {

    private static final String CHANNEL = "playback";
    private static final int ID = 1;
    static boolean running;

    private PowerManager.WakeLock wakeLock;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }
        boolean playing = intent.getBooleanExtra("playing", false);
        NotificationManager manager = getSystemService(NotificationManager.class);
        manager.createNotificationChannel(new NotificationChannel(CHANNEL, getString(R.string.channel_playback), NotificationManager.IMPORTANCE_LOW));

        Notification notification = new NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_moon)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(intent.getStringExtra("text"))
            .setContentIntent(PendingIntent.getActivity(this, 0, new Intent(this, MainActivity.class), PendingIntent.FLAG_IMMUTABLE))
            .addAction(0, intent.getStringExtra("toggle"), broadcast(1, SleepPlugin.ACTION_TOGGLE))
            .addAction(0, intent.getStringExtra("close"), broadcast(2, SleepPlugin.ACTION_CLOSE))
            .setOngoing(playing)
            .setOnlyAlertOnce(true)
            .build();

        if (running) {
            manager.notify(ID, notification);
        } else if (Build.VERSION.SDK_INT >= 29) {
            startForeground(ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(ID, notification);
        }
        running = true;

        if (wakeLock == null) wakeLock = getSystemService(PowerManager.class).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "sleepville:playback");
        // bounded so a crash of the page can never drain a battery for days
        if (playing && !wakeLock.isHeld()) wakeLock.acquire(12 * 60 * 60 * 1000L);
        if (!playing && wakeLock.isHeld()) wakeLock.release();
        return START_NOT_STICKY;
    }

    private PendingIntent broadcast(int requestCode, String action) {
        return PendingIntent.getBroadcast(this, requestCode, new Intent(action).setPackage(getPackageName()), PendingIntent.FLAG_IMMUTABLE);
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        stopSelf();
    }

    @Override
    public void onDestroy() {
        running = false;
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
