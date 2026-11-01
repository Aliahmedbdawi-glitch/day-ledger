package com.dayledger.app;

import android.content.Context;
import android.content.Intent;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class WidgetDeviceTest {
  @Test public void completionSurvivesReloadAndUndoPreservesActions() throws Exception {
    Context c=InstrumentationRegistry.getInstrumentation().getTargetContext();
    assertTrue("Only use isolated preview builds",c.getPackageName().endsWith(".preview"));
    String originalData=WidgetData.prefs(c).getString("data",null);
    String originalEdits=WidgetData.prefs(c).getString("edits",null);
    try {
      JSONObject data=new JSONObject("{\"settings\":{\"defaultIntervalMinutes\":30},\"dayIntervalMinutes\":{},\"activities\":[{\"id\":\"read\",\"name\":\"Reading\"},{\"id\":\"work\",\"name\":\"Work\"}],\"habits\":[{\"id\":\"h\",\"activityId\":\"read\",\"startTime\":\"10:00\"}],\"logs\":[]}");
      data.getJSONArray("logs").put(new JSONObject().put("date",WidgetData.today()).put("startTime","10:00").put("endTime","10:30").put("activityIds",new JSONArray().put("work")));
      assertTrue(WidgetData.prefs(c).edit().putString("data",data.toString()).putString("edits","[]").commit());
      assertEquals(48,WidgetData.rows(c).length());
      assertFalse(WidgetData.rows(c).getJSONObject(20).getJSONArray("habits").getJSONObject(0).getBoolean("done"));
      Intent tap=new Intent(c,LedgerWidget.class).setAction(LedgerWidget.TOGGLE).putExtra("date",WidgetData.today()).putExtra("startTime","10:00").putExtra("activityId","read").putExtra("done",true);
      new LedgerWidget().onReceive(c,tap);
      assertEquals(1,WidgetData.edits(c).length());
      assertTrue(WidgetData.rows(c).getJSONObject(20).getJSONArray("habits").getJSONObject(0).getBoolean("done"));
      assertEquals("Completed habits stay out of the actions column","Work",WidgetData.rows(c).getJSONObject(20).getString("actions"));
      new LedgerWidget().onReceive(c,tap.putExtra("done",false));
      JSONObject row=WidgetData.rows(c).getJSONObject(20);
      assertFalse(row.getJSONArray("habits").getJSONObject(0).getBoolean("done"));
      assertEquals("Work",row.getString("actions"));
      new LedgerWidget().onReceive(c,tap.putExtra("date","2000-01-01"));
      assertEquals("Stale-day taps must be ignored",2,WidgetData.edits(c).length());
    } finally {
      WidgetData.prefs(c).edit().putString("data",originalData).putString("edits",originalEdits).commit();
      LedgerWidget.refresh(c);
    }
  }
}
