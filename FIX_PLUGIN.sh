#!/bin/bash

# Fix AudioInputPlugin Not Loading Issue
# This script resolves the "UNIMPLEMENTED" error

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "======================================================="
echo "  🔧 Fixing AudioInputPlugin Loading Issue"
echo "======================================================="
echo ""

# Step 1: Clean everything
echo -e "${YELLOW}[1/6] Cleaning Xcode derived data...${NC}"
rm -rf ~/Library/Developer/Xcode/DerivedData
echo -e "${GREEN}✓ Cleaned${NC}"
echo ""

# Step 2: Clean iOS build
echo -e "${YELLOW}[2/6] Cleaning iOS build folder...${NC}"
if [ -d "ios/App/build" ]; then
    rm -rf ios/App/build
fi
echo -e "${GREEN}✓ Cleaned${NC}"
echo ""

# Step 3: Reinstall CocoaPods
echo -e "${YELLOW}[3/6] Reinstalling CocoaPods...${NC}"
cd ios/App

# Remove Pods completely
if [ -d "Pods" ]; then
    echo "  Removing old Pods..."
    rm -rf Pods
fi

if [ -f "Podfile.lock" ]; then
    echo "  Removing Podfile.lock..."
    rm Podfile.lock
fi

# Deintegrate if pod is available
if command -v pod &> /dev/null; then
    echo "  Deintegrating CocoaPods..."
    pod deintegrate 2>/dev/null || true
fi

# Update CocoaPods repo
echo "  Updating CocoaPods repo (this may take a minute)..."
pod repo update

# Install pods with verbose output
echo "  Installing pods..."
pod install --verbose

cd ../..
echo -e "${GREEN}✓ CocoaPods reinstalled${NC}"
echo ""

# Step 4: Verify plugin files
echo -e "${YELLOW}[4/6] Verifying plugin files...${NC}"

if [ ! -f "plugins/audio-input-plugin/ios/Plugin/AudioInputPlugin.swift" ]; then
    echo -e "${RED}✗ Plugin Swift file missing!${NC}"
    exit 1
fi

if [ ! -f "plugins/audio-input-plugin/AudioInputPlugin.podspec" ]; then
    echo -e "${RED}✗ Podspec missing!${NC}"
    exit 1
fi

# Check for duplicates
if [ -f "ios/App/App/Plugins/AudioInputPlugin.swift" ]; then
    echo -e "${RED}✗ Duplicate plugin file found!${NC}"
    echo "  Removing duplicate..."
    rm -f ios/App/App/Plugins/AudioInputPlugin.swift
    rm -f ios/App/App/Plugins/AudioInputPlugin.m
fi

echo -e "${GREEN}✓ Plugin files verified${NC}"
echo ""

# Step 5: Rebuild project
echo -e "${YELLOW}[5/6] Building project...${NC}"
npm run build
echo -e "${GREEN}✓ Built${NC}"
echo ""

# Step 6: Sync Capacitor
echo -e "${YELLOW}[6/6] Syncing Capacitor...${NC}"
npx cap sync ios
echo -e "${GREEN}✓ Synced${NC}"
echo ""

# Final instructions
echo "======================================================="
echo -e "${GREEN}✓ Fix Complete!${NC}"
echo "======================================================="
echo ""
echo "Next steps in Xcode:"
echo ""
echo "  1. ${BLUE}npx cap open ios${NC}"
echo ""
echo "  2. In Xcode menu:"
echo "     ${BLUE}Product > Clean Build Folder${NC} (Cmd+Shift+K)"
echo ""
echo "  3. Wait for cleaning to complete, then:"
echo "     ${BLUE}Product > Build${NC} (Cmd+B)"
echo ""
echo "  4. If build succeeds:"
echo "     ${BLUE}Product > Run${NC} (Cmd+R)"
echo ""
echo "  5. Check Xcode console for:"
echo "     ✓ Plugin loads without UNIMPLEMENTED error"
echo "     ✓ Audio devices are detected"
echo ""
echo "If still failing, check:"
echo "  - Xcode > Targets > App > Build Phases > Compile Sources"
echo "  - Should include AudioInputPlugin from Pods"
echo ""
