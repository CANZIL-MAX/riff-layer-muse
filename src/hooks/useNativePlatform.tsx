import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export interface PlatformInfo {
  isNative: true; // Always true for iOS-only app
  platform: 'ios';
  isCapacitorAvailable: true;
  storageMode: 'native';
}

export const useNativePlatform = (): PlatformInfo => {
  const [platformInfo] = useState<PlatformInfo>({
    isNative: true,
    platform: 'ios',
    isCapacitorAvailable: true,
    storageMode: 'native'
  });

  useEffect(() => {
    // iOS-only app: Verify we're running on native iOS
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
      console.error('❌ iOS-only app: Must run on native iOS platform');
      throw new Error('This app requires iOS native environment');
    }
    console.log('✅ Running on native iOS');
  }, []);

  return platformInfo;
};