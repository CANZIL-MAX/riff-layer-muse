#!/bin/bash

# Riff Layer Muse - Automated Setup Script
# This script automates the setup process after downloading a new ZIP from Lovable

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================================"
echo "  Riff Layer Muse - Automated Setup"
echo "================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found!${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Step 1: Initialize Git (if not already initialized)
echo -e "${YELLOW}[1/5] Initializing Git repository...${NC}"
if [ ! -d ".git" ]; then
    git init
    echo -e "${GREEN}✓ Git initialized${NC}"
else
    echo -e "${GREEN}✓ Git already initialized${NC}"
fi
echo ""

# Step 2: Connect to GitHub repository
echo -e "${YELLOW}[2/5] Connecting to GitHub repository...${NC}"
REPO_URL="https://github.com/CANZIL-MAX/riff-layer-muse.git"

# Remove existing remote if it exists
if git remote get-url origin > /dev/null 2>&1; then
    git remote remove origin
fi

git remote add origin "$REPO_URL"
echo -e "${GREEN}✓ Connected to $REPO_URL${NC}"
echo ""

# Step 3: Pull latest changes from GitHub
echo -e "${YELLOW}[3/5] Pulling latest changes from GitHub...${NC}"
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

# Step 4: Install dependencies
echo -e "${YELLOW}[4/5] Installing npm dependencies...${NC}"
echo "This may take a few minutes..."
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 5: Build the project
echo -e "${YELLOW}[5/5] Building and syncing...${NC}"
npm run build
npx cap sync ios
echo -e "${GREEN}✓ Project built and synced${NC}"
echo ""

# Success message
echo "================================================"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo "  1. Open Xcode: npx cap open ios"
echo "  2. Run on simulator/device from Xcode"
echo ""
echo "For development, run: npm run dev"
echo ""
