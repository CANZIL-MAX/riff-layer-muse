#!/bin/bash

# Riff Layer Muse - Complete Setup Script
# Automated setup for clean installation from ZIP

set -e  # Exit on any error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "======================================================="
echo "  🎵 Riff Layer Muse - Complete Setup"
echo "======================================================="
echo ""

# Check requirements
echo -e "${BLUE}Checking requirements...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: Git is not installed${NC}"
    echo "Please install Git from https://git-scm.com/"
    exit 1
fi

echo -e "${GREEN}✓ All requirements met${NC}"
echo ""

# Verify we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found!${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Step 1: Clean up any duplicate plugin files
echo -e "${YELLOW}[1/8] Cleaning up duplicate plugin files...${NC}"
if [ -f "ios/App/App/Plugins/AudioInputPlugin.swift" ]; then
    echo "  Removing old duplicate: ios/App/App/Plugins/AudioInputPlugin.swift"
    rm -f ios/App/App/Plugins/AudioInputPlugin.swift
fi
if [ -f "ios/App/App/Plugins/AudioInputPlugin.m" ]; then
    echo "  Removing old duplicate: ios/App/App/Plugins/AudioInputPlugin.m"
    rm -f ios/App/App/Plugins/AudioInputPlugin.m
fi
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

# Step 2: Initialize Git
echo -e "${YELLOW}[2/8] Initializing Git repository...${NC}"
if [ ! -d ".git" ]; then
    git init
    echo -e "${GREEN}✓ Git initialized${NC}"
else
    echo -e "${GREEN}✓ Git already initialized${NC}"
fi
echo ""

# Step 3: Connect to GitHub
echo -e "${YELLOW}[3/8] Connecting to GitHub repository...${NC}"
REPO_URL="https://github.com/CANZIL-MAX/riff-layer-muse.git"

if git remote get-url origin > /dev/null 2>&1; then
    git remote remove origin
fi

git remote add origin "$REPO_URL"
echo -e "${GREEN}✓ Connected to $REPO_URL${NC}"
echo ""

# Step 4: Pull latest changes
echo -e "${YELLOW}[4/8] Pulling latest changes from GitHub...${NC}"
echo -e "${RED}WARNING: This will overwrite any local changes!${NC}"
read -p "Continue? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 1
fi

git fetch origin main
git reset --hard origin/main
git branch --set-upstream-to=origin/main main

echo -e "${GREEN}✓ Latest changes pulled${NC}"
echo ""

# Step 5: Install dependencies
echo -e "${YELLOW}[5/8] Installing npm dependencies...${NC}"
echo "This may take a few minutes..."
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 6: Build the project
echo -e "${YELLOW}[6/8] Building the project...${NC}"
npm run build
echo -e "${GREEN}✓ Project built${NC}"
echo ""

# Step 7: Setup iOS platform
echo -e "${YELLOW}[7/8] Setting up iOS platform...${NC}"

# Remove corrupted iOS platform if it exists
if [ -d "ios" ]; then
    if [ ! -f "ios/App/App.xcodeproj/project.pbxproj" ]; then
        echo "  Detected corrupted iOS platform, removing..."
        rm -rf ios
    fi
fi

# Add iOS platform if not present
if [ ! -d "ios" ]; then
    echo "  Adding iOS platform..."
    npx cap add ios
fi

# Sync Capacitor
echo "  Syncing Capacitor..."
npx cap sync ios

echo -e "${GREEN}✓ iOS platform ready${NC}"
echo ""

# Step 8: Verification
echo -e "${YELLOW}[8/8] Running verification...${NC}"

VERIFICATION_PASSED=true

# Check for plugin files
if [ ! -f "plugins/audio-input-plugin/ios/Plugin/AudioInputPlugin.swift" ]; then
    echo -e "${RED}✗ Plugin file missing${NC}"
    VERIFICATION_PASSED=false
else
    echo -e "${GREEN}✓ Plugin files present${NC}"
fi

# Check for duplicate plugin files
if [ -f "ios/App/App/Plugins/AudioInputPlugin.swift" ]; then
    echo -e "${RED}✗ Duplicate plugin files detected${NC}"
    VERIFICATION_PASSED=false
else
    echo -e "${GREEN}✓ No duplicate plugin files${NC}"
fi

# Check for build output
if [ ! -d "dist" ]; then
    echo -e "${RED}✗ Build output missing${NC}"
    VERIFICATION_PASSED=false
else
    echo -e "${GREEN}✓ Build output present${NC}"
fi

# Check for iOS platform
if [ ! -f "ios/App/App.xcodeproj/project.pbxproj" ]; then
    echo -e "${RED}✗ iOS platform corrupted${NC}"
    VERIFICATION_PASSED=false
else
    echo -e "${GREEN}✓ iOS platform configured${NC}"
fi

echo ""

# Final status
if [ "$VERIFICATION_PASSED" = true ]; then
    echo "======================================================="
    echo -e "${GREEN}✓ Setup Complete - All Checks Passed!${NC}"
    echo "======================================================="
    echo ""
    echo "Next steps:"
    echo "  1. Open Xcode: ${BLUE}npx cap open ios${NC}"
    echo "  2. Clean build folder: ${BLUE}Product > Clean Build Folder${NC} (Cmd+Shift+K)"
    echo "  3. Build and run: ${BLUE}Product > Run${NC} (Cmd+R)"
    echo ""
    echo "For development:"
    echo "  Run dev server: ${BLUE}npm run dev${NC}"
    echo ""
    echo "The app will run natively on iOS with full plugin support!"
else
    echo "======================================================="
    echo -e "${RED}✗ Setup Completed with Warnings${NC}"
    echo "======================================================="
    echo ""
    echo "Some verification checks failed. Please review the errors above."
    echo "You may need to manually fix issues before building in Xcode."
fi
