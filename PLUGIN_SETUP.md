# Automated AudioInputPlugin Setup

The AudioInputPlugin is now structured as a proper Capacitor plugin and will auto-configure with Xcode.

## Setup Steps (Automated)

1. **Clone your repository:**
   ```bash
   git clone <your-repo-url>
   cd riff-layer-muse
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Add iOS platform (first time only):**
   ```bash
   npx cap add ios
   ```

4. **Build and sync:**
   ```bash
   npm run build
   npx cap sync ios
   ```

5. **Open and build in Xcode:**
   ```bash
   npx cap open ios
   ```
   Then press `Cmd + B` to build and `Cmd + R` to run.

## What Changed?

The plugin is now in `plugins/audio-input-plugin/` with:
- ✅ Proper `package.json` with Capacitor plugin configuration
- ✅ iOS Podspec for automatic dependency management
- ✅ Structured Swift/Objective-C files in `ios/Plugin/`
- ✅ TypeScript definitions in `src/index.ts`

## No Manual Steps Required!

Previously you had to:
- ❌ Manually add files to Xcode project
- ❌ Configure bridging header
- ❌ Update build settings

Now `npx cap sync ios` does all of this automatically! 🎉

## After Future Updates

Whenever you `git pull` new changes:
```bash
npm install          # Update dependencies
npm run build        # Build the project
npx cap sync ios     # Auto-configure in Xcode
```

Then just build in Xcode - no manual configuration needed!
