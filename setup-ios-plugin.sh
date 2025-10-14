#!/bin/bash

# iOS AudioInputPlugin Setup Script
# This script helps set up the custom AudioInputPlugin after running npx cap add ios

echo "🔧 iOS AudioInputPlugin Setup"
echo "=============================="
echo ""

# Check if we're in the right directory
if [ ! -f "capacitor.config.ts" ]; then
    echo "❌ Error: capacitor.config.ts not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Check if iOS platform exists
if [ ! -d "ios" ]; then
    echo "📱 iOS platform not found. Adding it now..."
    npx cap add ios
    echo "✅ iOS platform added"
else
    echo "✅ iOS platform found"
fi

# Sync Capacitor
echo ""
echo "🔄 Syncing Capacitor..."
npx cap sync ios
echo "✅ Sync complete"

# Check if plugin files exist
echo ""
echo "🔍 Checking plugin files..."

if [ ! -f "ios/App/App/Plugins/AudioInputPlugin.swift" ]; then
    echo "❌ AudioInputPlugin.swift not found!"
    echo "   Expected at: ios/App/App/Plugins/AudioInputPlugin.swift"
    exit 1
fi
echo "✅ AudioInputPlugin.swift found"

if [ ! -f "ios/App/App/Plugins/AudioInputPlugin.m" ]; then
    echo "❌ AudioInputPlugin.m not found!"
    echo "   Expected at: ios/App/App/Plugins/AudioInputPlugin.m"
    exit 1
fi
echo "✅ AudioInputPlugin.m found"

if [ ! -f "ios/App/App/App-Bridging-Header.h" ]; then
    echo "❌ App-Bridging-Header.h not found!"
    echo "   Expected at: ios/App/App/App-Bridging-Header.h"
    exit 1
fi
echo "✅ App-Bridging-Header.h found"

# Clean Derived Data
echo ""
echo "🧹 Cleaning Xcode Derived Data..."
rm -rf ~/Library/Developer/Xcode/DerivedData
echo "✅ Derived Data cleaned"

echo ""
echo "✅ Setup complete!"
echo ""
echo "⚠️  IMPORTANT: You must now add the plugin files to Xcode:"
echo ""
echo "1. Run: npx cap open ios"
echo "2. In Xcode, right-click 'App' folder → 'Add Files to App...'"
echo "3. Select: ios/App/App/Plugins/AudioInputPlugin.swift"
echo "4. Select: ios/App/App/Plugins/AudioInputPlugin.m"
echo "   (Make sure 'Copy items if needed' is UNCHECKED)"
echo "   (Make sure 'App' target is CHECKED)"
echo "5. Click 'Add'"
echo "6. Go to Build Settings → search 'bridging'"
echo "7. Set 'Objective-C Bridging Header' to: App/App-Bridging-Header.h"
echo "8. Clean Build Folder (Shift + Cmd + K)"
echo "9. Build and Run (Cmd + R)"
echo ""
echo "See SETUP_IOS_PLUGIN.md for detailed instructions"
