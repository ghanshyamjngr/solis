import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.solis.app',
  appName: 'Solis',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
