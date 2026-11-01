package com.dayledger.app;

import android.content.Intent;
import android.widget.*;
import org.json.*;

public class LedgerWidgetService extends RemoteViewsService {
  @Override public RemoteViewsFactory onGetViewFactory(Intent intent) {
    return new RemoteViewsFactory() {
      JSONArray rows=new JSONArray();
      public void onCreate(){onDataSetChanged();}
      public void onDestroy(){}
      public void onDataSetChanged(){try{rows=WidgetData.rows(getApplicationContext());}catch(Exception e){rows=new JSONArray();android.util.Log.e("DayLedger","Widget refresh failed",e);}}
      public int getCount(){return rows.length();}
      public long getItemId(int p){return p;}
      public boolean hasStableIds(){return true;}
      public int getViewTypeCount(){return 1;}
      public RemoteViews getLoadingView(){return null;}
      public RemoteViews getViewAt(int p){
        RemoteViews v=new RemoteViews(getPackageName(),R.layout.ledger_widget_row);
        try {
          JSONObject row=rows.getJSONObject(p);
          WidgetTheme theme=new WidgetTheme(getApplicationContext());
          java.util.Calendar now=java.util.Calendar.getInstance();
          int minute=now.get(java.util.Calendar.HOUR_OF_DAY)*60+now.get(java.util.Calendar.MINUTE);
          boolean current=minute>=WidgetData.minutes(row.getString("startTime")) && minute<WidgetData.minutes(row.getString("endTime"));
          v.setTextColor(R.id.widget_time,current?theme.accent:theme.muted);
          v.setInt(R.id.widget_row,"setBackgroundColor",current?(0x26000000 | (theme.accent & 0x00ffffff)):android.graphics.Color.TRANSPARENT);
          v.setTextColor(R.id.widget_actions,theme.ink);
          v.setTextViewText(R.id.widget_time,row.getString("startTime"));
          v.setTextViewText(R.id.widget_actions,row.getString("actions").isEmpty()?"—":row.getString("actions"));
          Intent open=new Intent().putExtra("widgetAction","open");
          v.setOnClickFillInIntent(R.id.widget_row,open);
          v.setOnClickFillInIntent(R.id.widget_time,open);
          v.setOnClickFillInIntent(R.id.widget_actions,open);
          v.setOnClickFillInIntent(R.id.widget_habits,open);
          v.removeAllViews(R.id.widget_habits);
          JSONArray habits=row.getJSONArray("habits");
          for(int j=0;j<habits.length();j++) {
            JSONObject h=habits.getJSONObject(j); boolean done=h.getBoolean("done");
            RemoteViews item=new RemoteViews(getPackageName(),R.layout.ledger_widget_habit);
            item.setTextColor(R.id.widget_habit_label,done?theme.ink:theme.muted);
            item.setImageViewResource(R.id.widget_check,done?R.drawable.widget_checked:R.drawable.widget_unchecked);
            item.setInt(R.id.widget_check,"setColorFilter",done?theme.accent:theme.muted);
            item.setContentDescription(R.id.widget_check,h.getString("name")+(done?", completed. Tap to undo.":", not completed. Tap to complete."));
            item.setTextViewText(R.id.widget_habit_label,h.getString("name"));
            item.setOnClickFillInIntent(R.id.widget_habit,open);
            item.setOnClickFillInIntent(R.id.widget_check,new Intent().putExtra("widgetAction","toggle").putExtra("date",row.getString("date")).putExtra("startTime",row.getString("startTime")).putExtra("activityId",h.getString("activityId")).putExtra("done",!done));
            v.addView(R.id.widget_habits,item);
          }
        } catch(Exception e){android.util.Log.e("DayLedger","Widget row failed",e);}
        return v;
      }
    };
  }
}
