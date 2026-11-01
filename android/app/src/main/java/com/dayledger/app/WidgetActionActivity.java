package com.dayledger.app;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

/** Routes collection clicks through a user-initiated activity PendingIntent. */
public class WidgetActionActivity extends Activity {
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    try {
      if ("toggle".equals(getIntent().getStringExtra("widgetAction"))) {
        Intent toggle = new Intent(this, LedgerWidget.class).setAction(LedgerWidget.TOGGLE);
        if (getIntent().getExtras() != null) toggle.putExtras(getIntent().getExtras());
        new LedgerWidget().onReceive(this, toggle);
      } else {
        startActivity(new Intent(this, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP));
      }
    } finally {
      finish();
    }
  }
}
