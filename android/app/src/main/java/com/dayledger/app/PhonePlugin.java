package com.dayledger.app;

import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.*;

@CapacitorPlugin(name="Phone")
public class PhonePlugin extends Plugin {
  private static final java.util.concurrent.atomic.AtomicBoolean updating = new java.util.concurrent.atomic.AtomicBoolean(false);
  @PluginMethod public void sync(PluginCall call) {
    synchronized(WidgetData.LOCK) {
      try {
        String data=call.getString("data");
        if(data==null || !new JSONObject(data).has("settings")) {call.reject("Invalid timeline");return;}
        JSONArray ack=call.getData().optJSONArray("acknowledged");
        if(ack==null)ack=new JSONArray();
        java.util.Set<String> ids=new java.util.HashSet<>(); for(int i=0;i<ack.length();i++)ids.add(ack.getString(i));
        JSONArray pending=WidgetData.edits(getContext()), remaining=new JSONArray();
        for(int i=0;i<pending.length();i++)if(!ids.contains(pending.getJSONObject(i).getString("id")))remaining.put(pending.getJSONObject(i));
        boolean changed=!data.equals(WidgetData.prefs(getContext()).getString("data","")) || remaining.length()!=pending.length();
        if(changed && !WidgetData.prefs(getContext()).edit().putString("data",data).putString("edits",remaining.toString()).commit()) {call.reject("Unable to save widget data");return;}
        if(changed) LedgerWidget.refresh(getContext());
        JSObject result=new JSObject();result.put("edits",remaining);call.resolve(result);
      }catch(Exception e){call.reject("Widget sync failed",e);}
    }
  }
  @PluginMethod public void update(PluginCall call) {
    if(!updating.compareAndSet(false,true)){call.reject("An update is already in progress.");return;}
    new Thread(() -> {
      java.io.File apk=new java.io.File(getContext().getCacheDir(),"DayLedger-update.apk");
      try {
        java.net.HttpURLConnection connection=(java.net.HttpURLConnection)new java.net.URL("https://github.com/Aliahmedbdawi-glitch/day-ledger/releases/download/android-latest/DayLedger.apk").openConnection();
        connection.setConnectTimeout(30000);connection.setReadTimeout(30000);
        try {
          if(connection.getResponseCode()!=200)throw new java.io.IOException("Release download unavailable. Try again later.");
          try(java.io.InputStream in=connection.getInputStream();java.io.FileOutputStream out=new java.io.FileOutputStream(apk)) {
            byte[] buffer=new byte[32768];int count;long total=0;
            while((count=in.read(buffer))!=-1){ total+=count; if(total>150*1024*1024)throw new java.io.IOException("Update is too large");out.write(buffer,0,count); }
          }
        } finally {connection.disconnect();}
        android.content.pm.PackageManager pm=getContext().getPackageManager();
        android.content.pm.PackageInfo candidate=pm.getPackageArchiveInfo(apk.getAbsolutePath(),android.content.pm.PackageManager.GET_SIGNATURES);
        android.content.pm.PackageInfo installed=pm.getPackageInfo(getContext().getPackageName(),android.content.pm.PackageManager.GET_SIGNATURES);
        if(candidate==null || !installed.packageName.equals(candidate.packageName) || candidate.signatures==null || !java.util.Arrays.equals(installed.signatures,candidate.signatures))throw new SecurityException("Update signing certificate does not match this installation.");
        long current=android.os.Build.VERSION.SDK_INT>=28?installed.getLongVersionCode():installed.versionCode;
        long next=android.os.Build.VERSION.SDK_INT>=28?candidate.getLongVersionCode():candidate.versionCode;
        if(next<=current){apk.delete();JSObject result=new JSObject();result.put("message","You already have the latest available version.");call.resolve(result);return;}
        getActivity().runOnUiThread(() -> {
          try {
            JSObject result=new JSObject();
            if(android.os.Build.VERSION.SDK_INT>=26 && !pm.canRequestPackageInstalls()) {
              getActivity().startActivity(new android.content.Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,android.net.Uri.parse("package:"+getContext().getPackageName())));
              result.put("message","Allow updates from Day Ledger, return here, and tap Update again.");
            } else {
              android.net.Uri uri=androidx.core.content.FileProvider.getUriForFile(getContext(),getContext().getPackageName()+".fileprovider",apk);
              getActivity().startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW).setDataAndType(uri,"application/vnd.android.package-archive").addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION));
              result.put("message","Confirm the update in Android. Your history will be kept.");
            }
            call.resolve(result);
          }catch(Exception e){call.reject("Cannot open Android installer",e);}
        });
      } catch(Exception e){apk.delete();call.reject(e.getMessage(),e);}
      finally {updating.set(false);}
    },"day-ledger-update").start();
  }
}
