import { Capacitor } from '@capacitor/core'

// iOS native app check - bundled assets, no web access
if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; text-align: center; padding: 20px; background: #1a1a1a; color: white;">
        <div style="max-width: 500px;">
          <h1 style="color: #ef4444; font-size: 36px; margin-bottom: 20px; font-weight: 700;">📱 iOS App Only</h1>
          <p style="color: #d1d5db; font-size: 18px; margin-bottom: 16px; line-height: 1.6;">
            This is a native iOS application.
          </p>
          <p style="color: #9ca3af; font-size: 14px;">
            Please open in the installed iOS app.
          </p>
        </div>
      </div>
    `;
  }
  throw new Error('iOS-only app: Must run on native iOS');
}

// Import React and App AFTER iOS check passes
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('✅ iOS app starting offline-capable');
createRoot(document.getElementById("root")!).render(<App />);
