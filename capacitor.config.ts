import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.lovable.rifflayermuse',
  appName: 'riff-layer-muse',
  webDir: 'dist',
  // Native app configuration - no server for offline operation
  includePlugins: ['AudioInputPlugin'],
  plugins: {
    AudioInputPlugin: {
      // Local plugin configuration
    },
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