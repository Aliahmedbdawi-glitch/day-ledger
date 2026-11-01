package com.dayledger.app;
import android.content.Context;
import android.content.res.Configuration;
import android.graphics.Color;
import org.json.JSONObject;
final class WidgetTheme {
 final int background, ink, muted, accent;
 WidgetTheme(Context c) {
  String theme="system";
  try {theme=new JSONObject(WidgetData.prefs(c).getString("data","{}")).getJSONObject("settings").optString("theme","system");}catch(Exception ignored){}
  if(theme.equals("system"))theme=(c.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)==Configuration.UI_MODE_NIGHT_YES?"dark":"light";
  switch(theme) {
   case "light": background=R.drawable.widget_light;ink=Color.parseColor("#0D1320");muted=Color.parseColor("#5A6478");accent=Color.parseColor("#2F5BFF");break;
   case "dark": background=R.drawable.widget_dark;ink=Color.parseColor("#E7EBF3");muted=Color.parseColor("#8B95A9");accent=Color.parseColor("#7090FF");break;
   case "forest": background=R.drawable.widget_forest;ink=Color.parseColor("#173B2A");muted=Color.parseColor("#526E5E");accent=Color.parseColor("#25744C");break;
   case "sand": background=R.drawable.widget_sand;ink=Color.parseColor("#423323");muted=Color.parseColor("#806A50");accent=Color.parseColor("#99632B");break;
   default: background=R.drawable.widget_light;ink=Color.parseColor("#0D1320");muted=Color.parseColor("#5A6478");accent=Color.parseColor("#2F5BFF");
  }
 }
}
