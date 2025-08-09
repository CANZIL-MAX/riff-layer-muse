import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.lovable.rifflayermuse',
  appName: 'riff-layer-muse',
  webDir: 'dist',
  // Removed server config for offline native app
  plugins: {
    Filesystem: {
      directory: 'Documents'
    },
    Share: {
      enabledPlatform: ['ios', 'android']
    },
    Haptics: {}
  },
  ios: {
    allowsLinkPreview: false,
    hidesSafeAreaInsets: true
  }
};

export default config;