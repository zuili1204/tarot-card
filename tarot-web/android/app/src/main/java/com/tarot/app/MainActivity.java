package com.tarot.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 自研插件：安全区尺寸（09 R5 / InsetsPlugin）
        registerPlugin(InsetsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
