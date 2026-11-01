package com.dayledger.app;

import android.content.Context;
import org.json.*;
import java.text.SimpleDateFormat;
import java.util.*;

final class WidgetData {
  static final Object LOCK = new Object();
  static android.content.SharedPreferences prefs(Context c) { return c.getSharedPreferences("widget", Context.MODE_PRIVATE); }
  static JSONArray edits(Context c) throws JSONException { return new JSONArray(prefs(c).getString("edits", "[]")); }
  static String today() { return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date()); }
  static String time(int n) { return String.format(Locale.US, "%02d:%02d", n / 60, n % 60); }
  static int minutes(String t) { String[] p=t.split(":"); return Integer.parseInt(p[0])*60+Integer.parseInt(p[1]); }
  static JSONArray rows(Context c) throws JSONException {
    synchronized(LOCK) {
      JSONObject data = new JSONObject(prefs(c).getString("data", "{}"));
      JSONArray rows=new JSONArray();
      if (!data.has("settings")) return rows;
      String date=today();
      int interval=data.optJSONObject("dayIntervalMinutes").optInt(date, data.getJSONObject("settings").optInt("defaultIntervalMinutes",30));
      if(interval < 5 || interval > 60) interval=30;
      JSONArray acts=data.getJSONArray("activities"), habits=data.getJSONArray("habits"), logs=data.getJSONArray("logs"), pending=edits(c);
      Map<String,String> names=new HashMap<>();
      for(int i=0;i<acts.length();i++) { JSONObject a=acts.getJSONObject(i); names.put(a.getString("id"),a.getString("name")); }
      for(int start=0; start<1440; start+=interval) {
        String clock=time(start); Set<String> done=new LinkedHashSet<>();
        for(int i=0;i<logs.length();i++){JSONObject l=logs.getJSONObject(i); if(date.equals(l.optString("date")) && clock.equals(l.optString("startTime"))) { JSONArray ids=l.getJSONArray("activityIds"); for(int j=0;j<ids.length();j++)done.add(ids.getString(j)); }}
        for(int i=0;i<pending.length();i++){JSONObject e=pending.getJSONObject(i); if(date.equals(e.optString("date")) && clock.equals(e.optString("startTime"))) { if(e.getBoolean("done"))done.add(e.getString("activityId")); else done.remove(e.getString("activityId")); }}
        JSONObject row=new JSONObject().put("date",date).put("startTime",clock).put("endTime",time(Math.min(1440,start+interval)));
        JSONArray hs=new JSONArray();
        for(int i=0;i<habits.length();i++){JSONObject h=habits.getJSONObject(i); int m=minutes(h.getString("startTime")); String id=h.getString("activityId"); if(m>=start && m<start+interval && names.containsKey(id))hs.put(new JSONObject().put("activityId",id).put("name",names.get(id)).put("done",done.contains(id))); }
        Set<String> habitIds=new HashSet<>(); for(int i=0;i<hs.length();i++)habitIds.add(hs.getJSONObject(i).getString("activityId"));
        List<String> labels=new ArrayList<>(); for(String id:done) if(names.containsKey(id) && !habitIds.contains(id))labels.add(names.get(id));
        rows.put(row.put("actions",android.text.TextUtils.join(", ",labels)).put("habits",hs));
      }
      return rows;
    }
  }
}
