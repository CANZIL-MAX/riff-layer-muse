# iOS AudioInputPlugin Setup Instructions

## The Problem
When you run `npx cap add ios`, it creates a fresh iOS project that doesn't know about our custom AudioInputPlugin files. These files exist in the repository but need to be properly added to the Xcode project.

## Solution: Proper Setup Steps

### Step 1: Clean Start
```bash
# Navigate to your project
cd ~/Documents/riff-layer-muse-main

# Make sure you have the latest code
git pull origin main

# Remove the broken iOS folder
rm -rf ios
```

### Step 2: Add iOS Platform
```bash
# Add iOS platform (creates fresh iOS project)
npx cap add ios

# Sync web assets
npx cap sync ios
```

### Step 3: Add Plugin Files to Xcode Project

The following files need to be manually added to your Xcode project:

1. **Open the project in Xcode:**
   ```bash
   npx cap open ios
   ```

2. **In Xcode, add the plugin files:**
   - Right-click on the `App` folder in the Project Navigator
   - Select "Add Files to 'App'..."
   - Navigate to `App/Plugins/` folder
   - Select BOTH files:
     - `AudioInputPlugin.swift`
     - `AudioInputPlugin.m`
   - Make sure "Copy items if needed" is UNCHECKED
   - Make sure "Add to targets" has "App" CHECKED
   - Click "Add"

3. **Set the Bridging Header:**
   - Click on the "App" project at the top of the Project Navigator
   - Select the "App" target
   - Go to "Build Settings" tab
   - Search for "bridging"
   - Find "Objective-C Bridging Header"
   - Set it to: `App/App-Bridging-Header.h`

4. **Clean and Rebuild:**
   - Menu: Product → Clean Build Folder (Shift + Cmd + K)
   - Delete Derived Data:
     ```bash
     rm -rf ~/Library/Developer/Xcode/DerivedData
     ```
   - Menu: Product → Build (Cmd + B)

5. **Run the App:**
   - Menu: Product → Run (Cmd + R)

### Expected Result
- ✅ No more "UNIMPLEMENTED" error
- ✅ AudioInputPlugin methods work correctly
- ✅ Native device selection works

### Verification
The logs should show:
```
🎧 AudioInputPlugin.getAvailableInputs called
🎧 Found X audio input devices
```

Instead of:
```
Error fetching native devices: {"code":"UNIMPLEMENTED"}
```

## Alternative: Use Existing iOS Project

If you want to avoid manual Xcode configuration, DON'T delete the iOS folder. Instead:

```bash
# Pull latest changes
git pull origin main

# Sync only
npx cap sync ios

# Clean
rm -rf ~/Library/Developer/Xcode/DerivedData

# Open and rebuild
npx cap open ios
```

This preserves the existing Xcode project configuration that already references the plugin files.
