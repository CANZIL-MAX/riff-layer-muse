# ✅ Post-Download Checklist

After downloading the ZIP from Lovable, follow this checklist to ensure everything is set up correctly.

## 📋 Pre-Flight Checks

Before running any commands, verify:

- [ ] macOS (required for iOS development)
- [ ] Node.js 18+ installed (`node --version`)
- [ ] Git installed (`git --version`)
- [ ] Xcode 15+ installed (from App Store)
- [ ] CocoaPods installed (`pod --version`)
  - If not: `sudo gem install cocoapods`

## 🚀 Setup Steps

### 1. Extract and Navigate
```bash
# Extract the ZIP file
# Navigate to the project directory
cd riff-layer-muse
```

### 2. Verify Plugin Files Present
```bash
# Check that the plugin folder exists
ls -la src/native-plugins/audio-input-plugin/

# Should see:
# ├── AudioInputPlugin.podspec
# ├── README.md
# ├── package.json
# ├── ios/
# │   └── Plugin/
# │       ├── AudioInputPlugin.swift
# │       └── AudioInputPlugin.m
# └── src/
#     └── index.ts
```

✅ If you see these files, the plugin is correctly included!  
❌ If missing, re-download the ZIP from Lovable.

### 3. Run Automated Setup
```bash
# Make the script executable
chmod +x setup.sh

# Run the setup script
./setup.sh
```

The script will:
1. ✅ Clean up any duplicate plugin files
2. ✅ Initialize Git repository
3. ✅ Connect to GitHub
4. ✅ Pull latest changes
5. ✅ Install npm dependencies
6. ✅ Build the project
7. ✅ Setup iOS platform
8. ✅ Run verification checks

### 4. Open in Xcode
```bash
npx cap open ios
```

### 5. Build and Run
In Xcode:
1. Select your target device/simulator (top toolbar)
2. Clean Build Folder: `Product > Clean Build Folder` (Cmd+Shift+K)
3. Build: `Product > Build` (Cmd+B)
4. Run: `Product > Run` (Cmd+R)

## 🔍 Verification

### Check Xcode Console
After the app launches, verify in the Xcode console:

✅ **Expected Output:**
```
✅ Capacitor native filesystem available
🚀 App component rendering...
🎯 Native platform confirmed: ios
✅ Platform detection successful
📱 Native platform detected: true
✅ ProjectManager initialized successfully
✅ PlaybackEngine initialized successfully
✅ MetronomeEngine initialized successfully
```

❌ **Problem Indicators:**
```
❌ "Filesystem" plugin is not implemented on ios
❌ Error fetching native devices: {"code":"UNIMPLEMENTED"}
```

If you see error indicators, see [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) for solutions.

### Test Microphone Permissions
1. Tap "Allow Microphone Access" button
2. Grant permission in iOS dialog
3. Verify audio devices appear in the selector
4. Select a device (should show "Device Switched" toast)

### Test Basic Recording
1. Select a microphone/audio input device
2. Tap the Record button (red circle)
3. Record for a few seconds
4. Tap Stop (square button)
5. Verify waveform appears on the timeline
6. Tap Play to hear your recording

## 🐛 Troubleshooting

### Issue: Filesystem Plugin Not Working
```bash
npm install
npm run build
npx cap sync ios
# Rebuild in Xcode
```

### Issue: AudioInputPlugin Not Loading
```bash
chmod +x FIX_PLUGIN.sh
./FIX_PLUGIN.sh
# Follow the on-screen instructions
```

### Issue: CocoaPods Errors
```bash
cd ios/App
pod deintegrate
pod repo update
pod install --verbose
cd ../..
npx cap sync ios
```

### Issue: Build Failures
```bash
# Nuclear option - clean everything
rm -rf node_modules ios dist
npm install
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

## 📚 Documentation

Detailed guides:
- [QUICK_START.md](./QUICK_START.md) - Quick start guide
- [PLUGIN_SETUP.md](./PLUGIN_SETUP.md) - Plugin setup details
- [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) - Common issues and solutions
- [OPTIMIZATION_SUMMARY.md](./OPTIMIZATION_SUMMARY.md) - Performance details
- [RESTRUCTURE_SUMMARY.md](./RESTRUCTURE_SUMMARY.md) - Architecture overview

## 🎯 Success Criteria

You've successfully set up the project when:

✅ App builds without errors in Xcode  
✅ App launches on simulator/device  
✅ No "UNIMPLEMENTED" errors in console  
✅ Microphone permissions can be granted  
✅ Audio devices are listed and selectable  
✅ Recording and playback work correctly  
✅ Waveforms display on the timeline  
✅ Metronome plays when enabled  

## 🎉 Next Steps

Once everything is working:

1. **Explore Features:**
   - Try multi-track recording
   - Test the metronome and BPM controls
   - Experiment with track layering
   - Test Bluetooth device switching

2. **Development:**
   - Modify code in your preferred IDE
   - Run `npm run build` after changes
   - Run `npx cap sync ios` to sync to native
   - Rebuild in Xcode to test

3. **Share:**
   - Export projects using the Share button
   - Test on physical iOS devices
   - Build for TestFlight distribution

## 🆘 Getting Help

If you're stuck:

1. Check console logs (Xcode and browser)
2. Review [KNOWN_ISSUES.md](./KNOWN_ISSUES.md)
3. Run `npx cap doctor` to diagnose issues
4. Report issues on GitHub with console output

---

**Happy Recording! 🎵**
