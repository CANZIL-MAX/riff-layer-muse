import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import App from './App.tsx'
import './index.css'

// iOS-only app - verify environment
if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
  document.getElementById("root")!.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: system-ui; text-align: center; padding: 20px; background: #1a1a1a;">
      <div>
        <h1 style="color: #ef4444; font-size: 32px; margin-bottom: 16px; font-weight: bold;">📱 iOS Only</h1>
        <p style="color: #9ca3af; font-size: 18px; margin-bottom: 12px;">This DAW is designed exclusively for iOS devices.</p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">Please open in Xcode and run on an iOS device or simulator.</p>
        <div style="margin-top: 24px; padding: 16px; background: #374151; border-radius: 8px; max-width: 400px; margin-left: auto; margin-right: auto;">
          <p style="color: #d1d5db; font-size: 13px; line-height: 1.6;">
            <strong>Build Steps:</strong><br/>
            1. git pull<br/>
            2. npm run build<br/>
            3. npx cap sync ios<br/>
            4. npx cap run ios
          </p>
        </div>
      </div>
    </div>
  `;
  throw new Error('iOS-only app: Cannot run on web or other platforms');
}

console.log('✅ iOS-only app starting on:', Capacitor.getPlatform());
createRoot(document.getElementById("root")!).render(<App />);
