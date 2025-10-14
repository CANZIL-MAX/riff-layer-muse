# AudioInputPlugin

Capacitor plugin for iOS audio input device management.

## Features

- Get available audio input devices
- Get current audio input device
- Set preferred audio input device
- Listen to audio route changes

## Installation

This plugin is bundled with the app and automatically configured through Capacitor sync.

## Usage

```typescript
import AudioInput from '@/plugins/AudioInputPlugin';

// Get available devices
const { devices } = await AudioInput.getAvailableInputs();

// Get current device
const { device } = await AudioInput.getCurrentInput();

// Set preferred device
await AudioInput.setPreferredInput({ portUID: 'device-uid' });

// Listen to route changes
AudioInput.addListener('audioRouteChanged', (event) => {
  console.log('Audio route changed:', event.reason);
});
```
