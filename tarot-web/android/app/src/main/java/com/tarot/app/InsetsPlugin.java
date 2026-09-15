package com.tarot.app;

import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * 暴露系统栏 + 刘海的安全区尺寸给 WebView（09 R5）。
 * Android 16（targetSdk 36）起强制 edge-to-edge，WebView 内容会画到状态栏/导航栏之下，
 * 纯 CSS env(safe-area-inset-*) 在部分 ROM 的 WebView 上取不到值，故从原生侧取真实 insets。
 * 返回单位 dp（≈ CSS px）。
 */
@CapacitorPlugin(name = "Insets")
public class InsetsPlugin extends Plugin {

    @PluginMethod
    public void get(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                View root = getActivity().getWindow().getDecorView();
                WindowInsetsCompat compat = ViewCompat.getRootWindowInsets(root);
                int top = 0;
                int bottom = 0;
                if (compat != null) {
                    Insets insets = compat.getInsets(
                            WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
                    top = insets.top;
                    bottom = insets.bottom;
                }
                float density = getContext().getResources().getDisplayMetrics().density;
                // Capacitor 的 resolve 只接受 JSObject（不是 org.json.JSONObject）
                JSObject ret = new JSObject();
                ret.put("top", density > 0 ? (double) (top / density) : 0d);
                ret.put("bottom", density > 0 ? (double) (bottom / density) : 0d);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("failed to read insets", e);
            }
        });
    }
}
