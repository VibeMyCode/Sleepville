package app.sleepville;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SleepPlugin.class);
        super.onCreate(savedInstanceState);

        // Open sheets are history entries in the page: back closes them.
        // With nothing to close, back hides the app and the mix keeps playing.
        getOnBackPressedDispatcher()
            .addCallback(
                this,
                new OnBackPressedCallback(true) {
                    @Override
                    public void handleOnBackPressed() {
                        WebView webView = getBridge().getWebView();
                        if (webView.canGoBack()) webView.goBack();
                        else moveTaskToBack(true);
                    }
                }
            );
    }
}
