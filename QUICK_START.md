# 🚀 Quick Start Guide

Get Riff Layer Muse up and running in 5 minutes!

## Prerequisites

- macOS (for iOS development)
- Node.js 18+ ([Download](https://nodejs.org/))
- Git ([Download](https://git-scm.com/))
- Xcode 15+ ([Download from App Store](https://apps.apple.com/us/app/xcode/id497799835))

## One-Command Setup

```bash
# 1. Download and extract ZIP from Lovable
# 2. Navigate to the project directory
cd riff-layer-muse

# 3. Make setup script executable
chmod +x setup.sh

# 4. Run setup script
./setup.sh
```

The script will:
1. ✓ Clean up any duplicate files
2. ✓ Initialize Git repository
3. ✓ Connect to GitHub
4. ✓ Pull latest changes
5. ✓ Install dependencies
6. ✓ Build the project
7. ✓ Setup iOS platform
8. ✓ Run verification checks

## After Setup

Open and run in Xcode:

```bash
npx cap open ios
```

Then in Xcode:
1. Select your target device or simulator
2. Press `Cmd + R` to build and run

## Development Workflow

### For Code Changes

```bash
# 1. Make changes in Lovable or your IDE
# 2. Build the project
npm run build

# 3. Sync to native platform
npx cap sync ios

# 4. Build in Xcode (Cmd+R)
```

### For Native Plugin Changes

If you modify the AudioInputPlugin:

```bash
# 1. Clean Xcode derived data
rm -rf ~/Library/Developer/Xcode/DerivedData

# 2. Sync Capacitor
npx cap sync ios

# 3. Clean and build in Xcode
# Product > Clean Build Folder (Cmd+Shift+K)
# Product > Build (Cmd+B)
```

## Troubleshooting

### Build Errors

If you encounter build errors:

```bash
# Clean everything and rebuild
rm -rf ios
rm -rf node_modules
npm install
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

### Duplicate Plugin Files

The setup script automatically removes duplicates, but if you still see errors:

```bash
# Manually remove old plugin files
rm -f ios/App/App/Plugins/AudioInputPlugin.swift
rm -f ios/App/App/Plugins/AudioInputPlugin.m

# Sync again
npx cap sync ios
```

### CocoaPods Issues

```bash
# Update CocoaPods
cd ios/App
pod repo update
pod install
cd ../..
```

## Common Commands

```bash
# Development server (web preview)
npm run dev

# Build for production
npm run build

# Open in Xcode
npx cap open ios

# Sync after code changes
npx cap sync ios

# View Capacitor status
npx cap doctor

# Update Capacitor plugins
npm update
npx cap sync ios
```

## Project Structure

```
riff-layer-muse/
├── src/                         # React source code
│   ├── components/             # UI components
│   ├── services/               # Audio engine services
│   ├── plugins/                # Plugin exports
│   └── native-plugins/         # Native plugin packages
│       └── audio-input-plugin/ # iOS audio input plugin
├── ios/                        # iOS native project
│   └── App/                    # Xcode project
└── setup.sh                    # Automated setup script
```

## Getting Help

- 📖 [Full Setup Guide](PLUGIN_SETUP.md)
- 🔧 [Technical Details](RESTRUCTURE_SUMMARY.md)
- 🐛 Issues? Check [GitHub Issues](https://github.com/CANZIL-MAX/riff-layer-muse/issues)

## Next Steps

Once running:
1. Record your first track
2. Try the metronome and BPM controls
3. Layer multiple audio tracks
4. Export your project
5. Test Bluetooth audio device switching

Happy recording! 🎵
