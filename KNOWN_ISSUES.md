# Known Issues & Solutions

This document covers known issues you might encounter and their solutions.

## 1. Filesystem Plugin "UNIMPLEMENTED" Error

### Symptom
```
❌ Init attempt 1 failed: "Filesystem" plugin is not implemented on ios
```

### Cause
The Capacitor Filesystem plugin needs to be properly synced to the native iOS project.

### Solution
```bash
# After downloading the ZIP, run:
npm install
npm run build
npx cap sync ios

# Then open Xcode
npx cap open ios

# Clean and build in Xcode
# Product > Clean Build Folder (Cmd+Shift+K)
# Product > Build (Cmd+B)
```

### Why This Happens
- The `ios/` folder is not included in ZIP exports (it's generated)
- `npx cap sync ios` creates the native project and links all Capacitor plugins
- Filesystem plugin must be properly linked for native file operations

## 2. AudioInputPlugin "UNIMPLEMENTED" Error

### Symptom
```
❌ Error fetching native devices: {"code":"UNIMPLEMENTED"}
```

### Cause
The AudioInputPlugin wasn't properly compiled into the iOS app, or CocoaPods didn't install correctly.

### Solution

**Quick Fix:**
```bash
chmod +x FIX_PLUGIN.sh
./FIX_PLUGIN.sh
```

**Manual Fix:**
```bash
# 1. Clean Xcode derived data
rm -rf ~/Library/Developer/Xcode/DerivedData

# 2. Reinstall CocoaPods
cd ios/App
pod deintegrate
pod repo update
pod install
cd ../..

# 3. Sync Capacitor
npx cap sync ios

# 4. Open in Xcode and clean build
npx cap open ios
# Then: Product > Clean Build Folder (Cmd+Shift+K)
# Then: Product > Build (Cmd+B)
```

### Verification
After building, check the Xcode console for:
- ✅ No "UNIMPLEMENTED" errors
- ✅ Plugin loads successfully
- ✅ Audio devices are detected

## 3. Missing Plugin Files After Download

### Symptom
```
✗ Plugin Swift file missing!
```

### Cause
The plugin was moved to `src/native-plugins/` to ensure it's included in ZIP exports.

### Solution
This should be fixed in the latest version. If you still see this:

```bash
# Verify plugin location
ls -la src/native-plugins/audio-input-plugin/ios/Plugin/

# Should show:
# AudioInputPlugin.swift
# AudioInputPlugin.m

# If missing, re-download the ZIP from Lovable
```

## 4. CocoaPods Installation Issues

### Symptom
```
pod: command not found
```

### Solution
Install CocoaPods:
```bash
sudo gem install cocoapods
pod setup
```

### Symptom
```
[!] Unable to find a specification for AudioInputPlugin
```

### Solution
```bash
cd ios/App
pod deintegrate
rm -rf Pods Podfile.lock
pod repo update
pod install --verbose
cd ../..
```

## 5. Build Errors in Xcode

### Symptom: Duplicate Symbols
```
Duplicate symbol '_OBJC_CLASS_$_AudioInputPlugin'
```

### Solution
```bash
# Remove old duplicate files
rm -rf ios/App/App/Plugins/*

# Sync again
npx cap sync ios
```

### Symptom: Missing Bridging Header
```
'Capacitor/Capacitor.h' file not found
```

### Solution
This should be auto-configured by Capacitor. If not:
```bash
npx cap sync ios
# Clean and rebuild in Xcode
```

## 6. Microphone Permission Issues

### Symptom
No audio devices found even after granting permissions.

### Solution
1. Open iOS Settings
2. Go to Privacy & Security → Microphone
3. Find "Riff Layer Muse" and toggle it ON
4. **Force quit the app** (not just background it)
5. Relaunch the app
6. Tap "Allow Microphone Access"

### Note
iOS caches permission states. Sometimes a full app restart is required.

## 7. Bluetooth Audio Devices Not Showing

### Symptom
Bluetooth headphones/AirPods connected but not appearing in device list.

### Solution
1. Ensure device is paired in iOS Bluetooth settings
2. Ensure device is connected (not just paired)
3. In the app, tap the refresh button in Device Selector
4. Wait 1-2 seconds for the audio session to update

### Technical Details
iOS audio session takes time to enumerate Bluetooth devices. The app waits 500ms after requesting permissions to allow the session to stabilize.

## 8. App Crashes on Launch (Native)

### Symptom
App crashes immediately when launched on device/simulator.

### Solution
Check Xcode console for specific error. Common causes:

**Missing Entitlements:**
```bash
# Verify ios/App/App/Info.plist has:
<key>NSMicrophoneUsageDescription</key>
<string>Required for recording audio tracks</string>
```

**Bundle ID Mismatch:**
- Check `capacitor.config.ts` appId matches Xcode project settings
- Should be: `com.lovable.rifflayermuse`

**Signing Issues:**
- In Xcode: Targets > App > Signing & Capabilities
- Select your Apple Developer Team
- Let Xcode automatically manage signing

## 9. Hot Reload Not Working (Development)

### Symptom
Changes in code don't appear in the app.

### Solution
```bash
# 1. Rebuild
npm run build

# 2. Sync
npx cap sync ios

# 3. Rebuild in Xcode
# Product > Clean Build Folder (Cmd+Shift+K)
# Product > Build (Cmd+B)
```

### For Faster Development
Use web preview during development:
```bash
npm run dev
# Open http://localhost:8080 in browser
```

Only build native when testing iOS-specific features.

## 10. "Source files not found" Error

### Symptom
```
error: Source files for CapacitorFilesystem could not be found
```

### Solution
```bash
# Reinstall dependencies
rm -rf node_modules
npm install

# Rebuild and sync
npm run build
npx cap sync ios
```

## Getting More Help

If you encounter issues not covered here:

1. **Check Setup Scripts:**
   - Run `./setup.sh` for automated fix
   - Run `./FIX_PLUGIN.sh` for plugin-specific issues

2. **Enable Verbose Logging:**
   - Check browser console (web)
   - Check Xcode console (iOS)
   - Look for errors starting with `❌` or `⚠️`

3. **Verify Installation:**
   ```bash
   # Check Capacitor status
   npx cap doctor
   
   # Should show:
   # ✅ Capacitor installed
   # ✅ iOS platform installed
   # ✅ All plugins configured
   ```

4. **Clean Installation:**
   ```bash
   # Nuclear option - start fresh
   rm -rf node_modules ios dist
   npm install
   npm run build
   npx cap add ios
   npx cap sync ios
   npx cap open ios
   ```

5. **Report Issue:**
   - Include Xcode console output
   - Include browser console output
   - Note iOS version and device type
   - Share steps to reproduce

## Prevention Tips

✅ Always run `npm run build` before `npx cap sync ios`  
✅ Always run `npx cap sync ios` after `git pull`  
✅ Keep CocoaPods updated: `sudo gem update cocoapods`  
✅ Clean Xcode derived data regularly  
✅ Close Xcode before running setup scripts  
✅ Use `./setup.sh` for fresh installations  

---

**Last Updated:** After moving plugin to `src/native-plugins/audio-input-plugin/`  
**Version:** 2.0 (Post-Restructure)
