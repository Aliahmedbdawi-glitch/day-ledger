package com.dayledger.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override public void onCreate(android.os.Bundle savedInstanceState) {
    registerPlugin(PhonePlugin.class);
    super.onCreate(savedInstanceState);
  }
}
