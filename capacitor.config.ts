import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'app.lovable.4a9ac78c84494d96af5832ea95a4c29f',
  appName: 'riff-layer-muse',
  webDir: 'dist',
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