package app.sleepville;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.media.AudioManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Bridge for what the WebView cannot do itself: stay alive with the screen off, react to the notification and to calls, close the app. */
@CapacitorPlugin(name = "Sleep")
public class SleepPlugin extends Plugin {

    static final String ACTION_TOGGLE = "app.sleepville.TOGGLE";
    static final String ACTION_CLOSE = "app.sleepville.CLOSE";

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable exit = this::exitNow;
    private boolean askedForNotifications;
    private Object modeListener; // AudioManager.OnModeChangedListener, kept untyped for API < 31

    private final BroadcastReceiver notificationActions = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (ACTION_CLOSE.equals(intent.getAction())) exitNow();
            else notifyListeners("toggle", new JSObject());
        }
    };

    @Override
    public void load() {
        IntentFilter filter = new IntentFilter(ACTION_TOGGLE);
        filter.addAction(ACTION_CLOSE);
        ContextCompat.registerReceiver(getContext(), notificationActions, filter, ContextCompat.RECEIVER_NOT_EXPORTED);

        // Calls are detected through the audio mode (ringing / in call), which needs no permission.
        // Audio focus is deliberately not requested: the mix should keep playing next to a podcast or a video.
        if (Build.VERSION.SDK_INT >= 31) {
            AudioManager.OnModeChangedListener listener = mode -> {
                JSObject data = new JSObject();
                data.put("active", mode != AudioManager.MODE_NORMAL);
                notifyListeners("call", data);
            };
            getContext().getSystemService(AudioManager.class).addOnModeChangedListener(getContext().getMainExecutor(), listener);
            modeListener = listener;
        }
    }

    @Override
    protected void handleOnDestroy() {
        getContext().unregisterReceiver(notificationActions);
        if (Build.VERSION.SDK_INT >= 31 && modeListener != null) {
            getContext().getSystemService(AudioManager.class).removeOnModeChangedListener((AudioManager.OnModeChangedListener) modeListener);
        }
    }

    /** state: "playing" | "paused" | "off". The notification texts arrive already translated. */
    @PluginMethod
    public void setState(PluginCall call) {
        Context context = getContext();
        Intent service = new Intent(context, PlaybackService.class);
        String state = call.getString("state", "off");
        if ("off".equals(state)) {
            context.stopService(service);
        } else {
            askForNotificationsOnce();
            service
                .putExtra("playing", "playing".equals(state))
                .putExtra("text", call.getString("text", ""))
                .putExtra("toggle", call.getString("toggle", ""))
                .putExtra("close", call.getString("close", ""));
            // an update may come while the app is in the background (pause pressed in the notification),
            // where starting a *new* foreground service is not allowed, but messaging a running one is
            if (PlaybackService.running) context.startService(service);
            else ContextCompat.startForegroundService(context, service);
        }
        call.resolve();
    }

    /** Backstop for the sleep timer: closes the app at `at` (epoch ms) even if page timers are throttled. 0 clears it. */
    @PluginMethod
    public void setExitAt(PluginCall call) {
        handler.removeCallbacks(exit);
        Long at = call.getLong("at", 0L);
        if (at != null && at > 0) handler.postDelayed(exit, Math.max(0, at - System.currentTimeMillis()));
        call.resolve();
    }

    @PluginMethod
    public void exit(PluginCall call) {
        call.resolve();
        handler.post(exit);
    }

    private void exitNow() {
        handler.removeCallbacks(exit);
        getContext().stopService(new Intent(getContext(), PlaybackService.class));
        getActivity().finishAndRemoveTask();
        // the WebView process would otherwise linger with the audio graph alive
        handler.postDelayed(() -> android.os.Process.killProcess(android.os.Process.myPid()), 400);
    }

    // The service runs without it; the permission only makes its notification visible.
    private void askForNotificationsOnce() {
        if (Build.VERSION.SDK_INT < 33 || askedForNotifications) return;
        askedForNotifications = true;
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(getActivity(), new String[] { Manifest.permission.POST_NOTIFICATIONS }, 1);
        }
    }
}
