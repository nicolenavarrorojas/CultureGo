import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'CultureGo',
  webDir: 'www',
  plugins: {
    SplashScreen: {
      launchShowDuration: 300,
      launchAutoHide: true,
      backgroundColor: '#6B4FA0',
      showSpinner: false,
    },
  },
};

export default config;
