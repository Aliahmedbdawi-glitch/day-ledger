package com.dayledger.app;

import android.app.PendingIntent;
import android.appwidget.*;
import android.content.*;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;
import org.json.*;

public class LedgerWidget extends AppWidgetProvider {
  static final String REFRESH="com.dayledger.app.WIDGET_REFRESH";
  private static PendingIntent refreshIntent(Context c) {
    return PendingIntent.getBroadcast(c,0,new Intent(c,LedgerWidget.class).setAction(REFRESH),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  }
  static final String TOGGLE="com.dayledger.app.WIDGET_COMPLETE";
  static void refresh(Context c) {
    AppWidgetManager m=AppWidgetManager.getInstance(c);
    int[] ids=m.getAppWidgetIds(new ComponentName(c,LedgerWidget.class));
    new LedgerWidget().onUpdate(c,m,ids);
    m.notifyAppWidgetViewDataChanged(ids,R.id.widget_list);
  }
  @Override public void onUpdate(Context c,AppWidgetManager m,int[] ids) {
    for(int id:ids) {
      RemoteViews v=new RemoteViews(c.getPackageName(),R.layout.ledger_widget);
      WidgetTheme theme=new WidgetTheme(c);
      v.setInt(R.id.widget_root,"setBackgroundResource",theme.background);
      v.setTextColor(R.id.widget_title,theme.ink);
      v.setTextColor(R.id.widget_empty,theme.muted);
      v.setTextViewText(R.id.widget_title,"Day Ledger  ·  "+WidgetData.today());
      Intent adapter=new Intent(c,LedgerWidgetService.class).setData(Uri.parse("dayledger://widget/"+id));
      v.setRemoteAdapter(R.id.widget_list,adapter);
      v.setEmptyView(R.id.widget_list,R.id.widget_empty);
      PendingIntent open=PendingIntent.getActivity(c,0,new Intent(c,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
      v.setOnClickPendingIntent(R.id.widget_title,open);
      v.setOnClickPendingIntent(R.id.widget_root,open);
      v.setOnClickPendingIntent(R.id.widget_empty,open);
      int flags=PendingIntent.FLAG_UPDATE_CURRENT;
      if(Build.VERSION.SDK_INT>=31) flags|=PendingIntent.FLAG_MUTABLE;
      v.setPendingIntentTemplate(R.id.widget_list,PendingIntent.getActivity(c,id,new Intent(c,WidgetActionActivity.class).setAction("com.dayledger.app.WIDGET_CLICK"),flags));
      m.updateAppWidget(id,v);
    }
    if(ids.length>0) {
      try {
        JSONArray rows=WidgetData.rows(c);
        java.util.Calendar now=java.util.Calendar.getInstance();
        int minute=now.get(java.util.Calendar.HOUR_OF_DAY)*60+now.get(java.util.Calendar.MINUTE);
        int next=1440;
        for(int i=0;i<rows.length();i++){int end=WidgetData.minutes(rows.getJSONObject(i).getString("endTime"));if(end>minute){next=end;break;}}
        java.util.Calendar at=(java.util.Calendar)now.clone();at.set(java.util.Calendar.HOUR_OF_DAY,0);at.set(java.util.Calendar.MINUTE,0);at.set(java.util.Calendar.SECOND,0);at.set(java.util.Calendar.MILLISECOND,0);at.add(java.util.Calendar.MINUTE,next);
        android.app.AlarmManager alarms=(android.app.AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
        if(Build.VERSION.SDK_INT<31 || alarms.canScheduleExactAlarms()) alarms.setExact(android.app.AlarmManager.RTC,at.getTimeInMillis(),refreshIntent(c));
        else alarms.set(android.app.AlarmManager.RTC,at.getTimeInMillis(),refreshIntent(c));
      }catch(Exception e){android.util.Log.e("DayLedger","Widget refresh scheduling failed",e);}
    }
  }
  @Override public void onDisabled(Context c) { ((android.app.AlarmManager)c.getSystemService(Context.ALARM_SERVICE)).cancel(refreshIntent(c)); }
  @Override public void onReceive(Context c,Intent intent) {
    if(REFRESH.equals(intent.getAction())){refresh(c);return;}
    if(TOGGLE.equals(intent.getAction())) {
      synchronized(WidgetData.LOCK) {
        try {
          String date=intent.getStringExtra("date"), start=intent.getStringExtra("startTime"), activity=intent.getStringExtra("activityId");
          // Ignore stale views from a previous day or removed habits.
          if(!WidgetData.today().equals(date)) { refresh(c); return; }
          JSONArray rows=WidgetData.rows(c);
          for(int i=0;i<rows.length();i++) {
            JSONObject row=rows.getJSONObject(i);
            if(!row.getString("startTime").equals(start))continue;
            JSONArray habits=row.getJSONArray("habits");
            for(int j=0;j<habits.length();j++)if(habits.getJSONObject(j).getString("activityId").equals(activity)) {
              JSONArray edits=WidgetData.edits(c);
              edits.put(new JSONObject().put("id",java.util.UUID.randomUUID().toString()).put("date",date).put("startTime",start).put("endTime",row.getString("endTime")).put("index",i).put("activityId",activity).put("done",intent.getBooleanExtra("done",true)));
              if(!WidgetData.prefs(c).edit().putString("edits",edits.toString()).commit()) throw new IllegalStateException("Unable to save completion");
              refresh(c); return;
            }
          }
        }catch(Exception e){android.util.Log.e("DayLedger","Widget completion failed",e);}
      }
    } else super.onReceive(c,intent);
  }
}
