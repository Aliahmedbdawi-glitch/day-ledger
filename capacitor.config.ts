import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dayledger.app',
  appName: 'Day Ledger',
  webDir: 'dist',
  backgroundColor: '#0a0e16',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_notify',
      iconColor: '#7090FF',
    },
  },
};

export default config;
