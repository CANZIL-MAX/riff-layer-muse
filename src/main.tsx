import { Capacitor } from '@capacitor/core'

// iOS-only check BEFORE importing React and App to prevent module loading errors
if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; text-align: center; padding: 20px; background: #1a1a1a; color: white;">
        <div style="max-width: 500px;">
          <h1 style="color: #ef4444; font-size: 36px; margin-bottom: 20px; font-weight: 700;">📱 iOS Only</h1>
          <p style="color: #d1d5db; font-size: 18px; margin-bottom: 16px; line-height: 1.6;">
            This DAW is designed exclusively for iOS devices.
          </p>
          <p style="color: #9ca3af; font-size: 14px; margin-bottom: 24px;">
            Please build and run on an iOS device or simulator.
          </p>
          <div style="margin-top: 32px; padding: 20px; background: #374151; border-radius: 12px; text-align: left;">
            <p style="color: #f3f4f6; font-size: 14px; font-weight: 600; margin-bottom: 12px;">Build Steps:</p>
            <code style="color: #fbbf24; font-size: 13px; line-height: 2; display: block; font-family: 'SF Mono', Consolas, monospace;">
              1. git pull<br/>
              2. npm run build<br/>
              3. npx cap sync ios<br/>
              4. npx cap run ios
            </code>
          </div>
        </div>
      </div>
    `;
  }
  throw new Error('iOS-only app: Cannot run on web or other platforms');
}

// Import React and App AFTER iOS check passes
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('✅ iOS-only app starting on:', Capacitor.getPlatform());
createRoot(document.getElementById("root")!).render(<App />);
