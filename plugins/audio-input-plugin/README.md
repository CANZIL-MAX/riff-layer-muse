# Audio Input Plugin

A Capacitor plugin for iOS audio input device management.

## Installation

This is a local plugin. It's automatically installed when you run `npm install` in the project root.

## Usage

```typescript
import AudioInput from 'audio-input-plugin';

// Get available audio input devices
const { devices } = await AudioInput.getAvailableInputs();

// Get current input device
const { device } = await AudioInput.getCurrentInput();

// Set preferred input device
await AudioInput.setPreferredInput({ portUID: 'device-uid' });

// Listen for audio route changes
AudioInput.addListener('audioRouteChanged', (event) => {
  console.log('Audio route changed:', event.reason);
});
```

## API

### getAvailableInputs()

Returns a list of available audio input devices.

### getCurrentInput()

Returns the currently active audio input device.

### setPreferredInput(options)

Sets the preferred audio input device.

### addListener(eventName, callback)

Listens for audio route changes.
