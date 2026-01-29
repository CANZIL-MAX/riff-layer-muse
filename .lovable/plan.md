
# React Native Conversion Plan

## Overview

This plan outlines converting your current Capacitor-based iOS DAW app ("Riff Layer Muse") from a WebView hybrid app to a pure React Native application. This is a **complete rebuild** - the existing code cannot be directly reused, but the architecture and logic patterns will serve as a blueprint.

## Important Limitation

**Lovable cannot directly develop React Native apps.** React Native requires a different toolchain (Metro bundler, native iOS build system) that doesn't run in our web-based environment. This plan provides:
1. Project structure and configuration files
2. TypeScript component skeletons matching your current features
3. Guidance on native audio libraries
4. Step-by-step migration instructions

You will need to complete the development locally using Xcode.

---

## Phase 1: Project Setup (Local Machine)

### Step 1.1: Create React Native Project

Run these commands on your Mac:

```bash
# Create new React Native project with TypeScript
npx @react-native-community/cli init RiffLayerMuse --template react-native-template-typescript

# Navigate to project
cd RiffLayerMuse

# Install iOS dependencies
cd ios && pod install && cd ..
```

### Step 1.2: Install Required Dependencies

```bash
# Audio recording and playback (critical for DAW)
npm install react-native-audio-api
# Alternative: react-native-audio-recorder-player

# File system for project storage
npm install react-native-fs

# Haptic feedback
npm install react-native-haptic-feedback

# UI components
npm install react-native-reanimated react-native-gesture-handler

# Canvas for waveform drawing
npm install @shopify/react-native-skia

# Navigation (if needed)
npm install @react-navigation/native @react-navigation/stack
```

### Step 1.3: iOS Permissions

Update `ios/RiffLayerMuse/Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>This app needs access to your microphone to record audio tracks.</string>
<key>UIBackgroundModes</key>
<array>
    <string>audio</string>
</array>
```

---

## Phase 2: Architecture Mapping

Your current Capacitor app maps to React Native as follows:

```text
CURRENT (Capacitor/WebView)          →  REACT NATIVE (Pure Native)
─────────────────────────────────────────────────────────────────────
Web Audio API                        →  react-native-audio-api
                                        (or custom Swift AVAudioEngine)

MediaRecorder                        →  Native audio recording module

Canvas waveform rendering            →  @shopify/react-native-skia

CSS/Tailwind styling                 →  StyleSheet + react-native-reanimated

Touch events (React)                 →  react-native-gesture-handler

Capacitor Filesystem                 →  react-native-fs

AudioInputPlugin (custom Swift)      →  Native Module (Swift/Obj-C)

localStorage                         →  AsyncStorage or react-native-fs
```

---

## Phase 3: Core Component Structure

### File Structure

```
RiffLayerMuse/
├── src/
│   ├── App.tsx                    # Main app entry
│   ├── components/
│   │   ├── RecordingStudio.tsx    # Main screen
│   │   ├── DAWTimeline.tsx        # Timeline with tracks
│   │   ├── WaveformBlock.tsx      # Individual audio blocks (Skia canvas)
│   │   ├── TrackControls.tsx      # Mute/Solo/Volume
│   │   ├── MeasureRuler.tsx       # Beat markers
│   │   └── DeviceSelector.tsx     # Audio input selection
│   ├── services/
│   │   ├── AudioEngine.ts         # Native audio recording/playback
│   │   ├── PlaybackEngine.ts      # Multi-track synchronized playback
│   │   ├── ProjectManager.ts      # File-based project storage
│   │   └── MetronomeService.ts    # High-precision metronome
│   ├── hooks/
│   │   ├── useAudioRecorder.ts    # Recording hook
│   │   ├── useUndoRedo.ts         # State history
│   │   └── useTimeline.ts         # Timeline calculations
│   └── native/
│       └── AudioInputModule/      # Custom Swift module for device selection
├── ios/
│   └── RiffLayerMuse/
│       └── AudioInputModule.swift # Native device selection
└── package.json
```

---

## Phase 4: Key Component Implementations

### 4.1: RecordingStudio.tsx (Main Screen)

```typescript
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { DAWTimeline } from './components/DAWTimeline';
import { RecordingControls } from './components/RecordingControls';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { useProjectManager } from './hooks/useProjectManager';

export function RecordingStudio() {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  const { startRecording, stopRecording } = useAudioRecorder();
  const { saveProject, loadProject } = useProjectManager();

  // ... recording logic, playback logic, track management
  
  return (
    <SafeAreaView style={styles.container}>
      <RecordingControls 
        isRecording={isRecording}
        isPlaying={isPlaying}
        onRecord={handleRecord}
        onPlay={handlePlay}
        onStop={handleStop}
      />
      <DAWTimeline 
        tracks={tracks}
        currentTime={currentTime}
        onSeek={handleSeek}
        onTrackUpdate={handleTrackUpdate}
      />
    </SafeAreaView>
  );
}
```

### 4.2: WaveformBlock.tsx (Skia Canvas)

```typescript
import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';

interface WaveformBlockProps {
  track: AudioTrack;
  waveformData: Float32Array;
  width: number;
  height: number;
}

export function WaveformBlock({ track, waveformData, width, height }: WaveformBlockProps) {
  const translateX = useSharedValue(0);
  
  // Pan gesture for dragging blocks
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd(() => {
      // Commit position change
    });

  // Draw waveform using Skia
  const waveformPath = Skia.Path.Make();
  // ... convert waveformData to path

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={animatedStyle}>
        <Canvas style={{ width, height }}>
          <Path path={waveformPath} color="#4ade80" style="stroke" />
        </Canvas>
      </Animated.View>
    </GestureDetector>
  );
}
```

### 4.3: Native Audio Module (Swift)

Create `ios/RiffLayerMuse/AudioInputModule.swift`:

```swift
import Foundation
import AVFoundation

@objc(AudioInputModule)
class AudioInputModule: NSObject {
  
  @objc func getAvailableInputs(_ resolve: @escaping RCTPromiseResolveBlock, 
                                 rejecter reject: @escaping RCTPromiseRejectBlock) {
    let session = AVAudioSession.sharedInstance()
    
    guard let inputs = session.availableInputs else {
      resolve([])
      return
    }
    
    let devices = inputs.map { input in
      return [
        "portUID": input.uid,
        "portName": input.portName,
        "portType": input.portType.rawValue,
        "isBluetooth": input.portType == .bluetoothHFP || 
                       input.portType == .bluetoothA2DP
      ]
    }
    
    resolve(devices)
  }
  
  @objc func setPreferredInput(_ portUID: String,
                                resolver resolve: @escaping RCTPromiseResolveBlock,
                                rejecter reject: @escaping RCTPromiseRejectBlock) {
    // ... implementation matching your current AudioInputPlugin.swift
  }
}
```

---

## Phase 5: Audio Engine Choices

### Option A: react-native-audio-api (Recommended for DAW)

Low-level audio access similar to Web Audio API:

```typescript
import { AudioContext, GainNode } from 'react-native-audio-api';

class PlaybackEngine {
  private audioContext: AudioContext;
  private masterGain: GainNode;
  
  async initialize() {
    this.audioContext = new AudioContext();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);
  }
  
  async playTrack(audioData: ArrayBuffer) {
    const audioBuffer = await this.audioContext.decodeAudioData(audioData);
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.masterGain);
    source.start();
  }
}
```

### Option B: Custom Swift AVAudioEngine (Maximum Control)

For professional DAW features with lowest latency:

```swift
class NativeAudioEngine {
  private let engine = AVAudioEngine()
  private var playerNodes: [AVAudioPlayerNode] = []
  
  func playTracks(_ tracks: [[Float]], startTimes: [Double]) {
    // Direct AVAudioEngine implementation
    // Provides sample-accurate synchronization
  }
}
```

---

## Phase 6: Project Storage

Replace Capacitor Filesystem with react-native-fs:

```typescript
import RNFS from 'react-native-fs';

class ProjectManager {
  private projectsPath = `${RNFS.DocumentDirectoryPath}/projects`;
  
  async saveProject(project: Project): Promise<void> {
    const projectPath = `${this.projectsPath}/${project.id}`;
    await RNFS.mkdir(projectPath);
    
    // Save metadata
    await RNFS.writeFile(
      `${projectPath}/project.json`,
      JSON.stringify(project),
      'utf8'
    );
    
    // Save audio files separately (not base64 in JSON)
    for (const track of project.tracks) {
      if (track.audioPath) {
        // Audio already saved during recording
      }
    }
  }
  
  async loadProject(projectId: string): Promise<Project> {
    const projectPath = `${this.projectsPath}/${projectId}/project.json`;
    const content = await RNFS.readFile(projectPath, 'utf8');
    return JSON.parse(content);
  }
}
```

---

## Phase 7: Development Workflow

### Step 7.1: Initial Setup

```bash
# After creating project and installing deps
cd ios && pod install && cd ..

# Run on iOS simulator
npx react-native run-ios

# Run on physical device
npx react-native run-ios --device "Your iPhone Name"
```

### Step 7.2: Development Cycle

1. Edit TypeScript files in `src/`
2. Metro bundler hot-reloads changes
3. Native Swift changes require Xcode rebuild

### Step 7.3: Testing on Device

```bash
# Build release version for testing
npx react-native run-ios --configuration Release
```

---

## What I Can Provide in Lovable

While React Native cannot run here, I can help you with:

1. **Component Logic**: TypeScript business logic that works in both React and React Native
2. **Type Definitions**: AudioTrack, Project, and other TypeScript interfaces
3. **Algorithm Code**: Waveform generation, time calculations, snap-to-grid logic
4. **Documentation**: Detailed implementation guides for each component
5. **Native Swift Code**: The AudioInputModule and other native modules

---

## Technical Details

### Features to Rebuild

| Feature | Current Implementation | React Native Equivalent |
|---------|----------------------|------------------------|
| Audio recording | MediaRecorder API | react-native-audio-api or AVAudioRecorder |
| Multi-track playback | Web Audio API | react-native-audio-api or AVAudioEngine |
| Waveform display | HTML Canvas | @shopify/react-native-skia |
| Touch gestures | React touch events | react-native-gesture-handler |
| File storage | Capacitor Filesystem | react-native-fs |
| Haptic feedback | navigator.vibrate | react-native-haptic-feedback |
| Audio input selection | Custom Capacitor plugin | Native Swift module |

### Estimated Effort

- **Phase 1-2 (Setup)**: 1-2 days
- **Phase 3-4 (Core UI)**: 1-2 weeks
- **Phase 5-6 (Audio Engine)**: 2-3 weeks (most complex)
- **Phase 7 (Polish & Testing)**: 1 week

**Total estimated time**: 4-6 weeks for a complete, production-ready React Native DAW

---

## Next Steps

After you approve this plan, I can:
1. Create the TypeScript type definitions and interfaces
2. Write the algorithm/logic code that can be ported
3. Provide detailed Swift code for the native audio module
4. Create step-by-step implementation guides for each component

Would you like me to proceed with creating these foundation files?
