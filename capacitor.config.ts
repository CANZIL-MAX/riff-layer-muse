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
    hidesSafeAreaInsets: true,
    // iOS-specific permissions and settings
    entitlements: {
      'com.apple.developer.usernotifications.filtering': true
    },
    contentInsets: {
      top: 0,
      bottom: 0
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;