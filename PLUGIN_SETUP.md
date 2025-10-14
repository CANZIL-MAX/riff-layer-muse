# AudioInputPlugin Setup Guide

The AudioInputPlugin is a native iOS Capacitor plugin that provides audio input device management.

## Quick Setup (Recommended)

Use the automated setup script:

```bash
chmod +x setup.sh
./setup.sh
```

This handles everything automatically! Then just:

```bash
npx cap open ios  # Opens Xcode
# Build and run with Cmd+R
```

## Manual Setup Steps

If you prefer manual setup or need to troubleshoot:

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd riff-layer-muse
npm install
```

### 2. Build Project
```bash
npm run build
```

### 3. Setup iOS Platform

**First time only:**
```bash
npx cap add ios
```

**After code changes:**
```bash
npx cap sync ios
```

### 4. Open and Build in Xcode
```bash
npx cap open ios
```

In Xcode:
- Select your target device
- Press `Cmd + R` to build and run

## What Changed?

The plugin is structured as a proper Capacitor plugin with:
- ✅ Proper `package.json` with Capacitor configuration
- ✅ iOS Podspec for automatic dependency management
- ✅ Structured Swift/Objective-C files in `ios/Plugin/`
- ✅ TypeScript definitions in `src/index.ts`
- ✅ Automatic Xcode integration via `npx cap sync`

## After Updates

Whenever you pull new changes:
```bash
npm install          # Update dependencies
npm run build        # Build the project
npx cap sync ios     # Auto-configure in Xcode
```

Then build in Xcode - no manual configuration needed!

## Troubleshooting

### Build Errors in Xcode

```bash
# Clean Xcode derived data
rm -rf ~/Library/Developer/Xcode/DerivedData

# Reinstall pods
cd ios/App
pod deintegrate
pod install
cd ../..

# Sync again
npx cap sync ios
```

### Duplicate Plugin Files

If you see duplicate symbol errors:
```bash
# Check for old files
ls ios/App/App/Plugins/

# Should be empty! If not, remove them:
rm -rf ios/App/App/Plugins/*

# Sync again
npx cap sync ios
```

### Permission Issues

If recording doesn't work:
1. Open iOS Settings
2. Go to Privacy & Security → Microphone
3. Enable access for "Riff Layer Muse"
4. Restart the app

## Advanced

### Clean Installation

For a complete fresh start:
```bash
rm -rf ios
rm -rf node_modules
npm install
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

### Development Tips

- Always run `npm run build` before `npx cap sync`
- Use `npx cap doctor` to check for issues
- Check Capacitor logs in Xcode console
- Enable "Debug → Always Show Console" in Xcode
