import Foundation
import Capacitor
import AVFoundation

@objc(AudioInputPlugin)
public class AudioInputPlugin: CAPPlugin {
    
    // Get all available audio input devices
    @objc func getAvailableInputs(_ call: CAPPluginCall) {
        print("🎧 AudioInputPlugin.getAvailableInputs called")
        let session = AVAudioSession.sharedInstance()
        
        // Ensure audio session is active before querying devices
        do {
            print("🎧 Setting audio session category to playAndRecord...")
            try session.setCategory(.playAndRecord, mode: .default, options: [.allowBluetooth, .defaultToSpeaker])
            print("🎧 Activating audio session...")
            try session.setActive(true)
            print("🎧 Audio session activated successfully")
        } catch {
            print("⚠️ Could not activate audio session: \(error.localizedDescription)")
            call.reject("Failed to activate audio session: \(error.localizedDescription)")
            return
        }
        
        guard let inputs = session.availableInputs else {
            print("⚠️ No audio inputs available. Session category: \(session.category.rawValue)")
            call.resolve(["devices": [], "error": "No inputs available"])
            return
        }
        
        print("🎧 Found \(inputs.count) audio input devices")
        
        let devices = inputs.map { input -> [String: Any] in
            print("  📱 Device: \(input.portName) (\(input.portType.rawValue))")
            return [
                "portUID": input.uid,
                "portName": input.portName,
                "portType": input.portType.rawValue,
                "isBluetooth": input.portType == .bluetoothHFP || input.portType == .bluetoothA2DP || input.portType == .bluetoothLE
            ]
        }
        
        call.resolve(["devices": devices])
    }
    
    // Get currently active input device
    @objc func getCurrentInput(_ call: CAPPluginCall) {
        let session = AVAudioSession.sharedInstance()
        
        // Ensure audio session is active
        do {
            try session.setActive(true)
        } catch {
            print("⚠️ Could not activate audio session: \(error.localizedDescription)")
        }
        
        guard let currentRoute = session.currentRoute.inputs.first else {
            print("⚠️ No current input route")
            call.resolve(["device": nil])
            return
        }
        
        print("🎤 Current input: \(currentRoute.portName)")
        
        let device: [String: Any] = [
            "portUID": currentRoute.uid,
            "portName": currentRoute.portName,
            "portType": currentRoute.portType.rawValue,
            "isBluetooth": currentRoute.portType == .bluetoothHFP || currentRoute.portType == .bluetoothA2DP || currentRoute.portType == .bluetoothLE
        ]
        
        call.resolve(["device": device])
    }
    
    // Set preferred input device
    @objc func setPreferredInput(_ call: CAPPluginCall) {
        print("🎧 AudioInputPlugin.setPreferredInput called")
        guard let portUID = call.getString("portUID") else {
            print("⚠️ Port UID required but not provided")
            call.reject("Port UID required")
            return
        }
        
        print("🎧 Attempting to set preferred input to: \(portUID)")
        let session = AVAudioSession.sharedInstance()
        
        // Find the input port matching the UID
        guard let inputs = session.availableInputs,
              let selectedInput = inputs.first(where: { $0.uid == portUID }) else {
            call.reject("Input device not found")
            return
        }
        
        do {
            try session.setPreferredInput(selectedInput)
            print("✅ Successfully set preferred input to: \(selectedInput.portName)")
            call.resolve([
                "success": true,
                "message": "Switched to \(selectedInput.portName)"
            ])
        } catch {
            print("⚠️ Failed to set preferred input: \(error.localizedDescription)")
            call.reject("Failed to set preferred input: \(error.localizedDescription)")
        }
    }
    
    // Listen for route changes (when devices connect/disconnect)
    @objc override public func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleRouteChange),
            name: AVAudioSession.routeChangeNotification,
            object: nil
        )
    }
    
    @objc func handleRouteChange(notification: Notification) {
        // Notify JavaScript when audio route changes
        guard let userInfo = notification.userInfo,
              let reasonValue = userInfo[AVAudioSessionRouteChangeReasonKey] as? UInt,
              let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else {
            return
        }
        
        var changeType = "unknown"
        switch reason {
        case .newDeviceAvailable:
            changeType = "deviceConnected"
        case .oldDeviceUnavailable:
            changeType = "deviceDisconnected"
        default:
            changeType = "routeChanged"
        }
        
        notifyListeners("audioRouteChanged", data: ["reason": changeType])
    }
}
