import Foundation
import Capacitor
import AVFoundation

@objc(AudioInputPlugin)
public class AudioInputPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AudioInputPlugin"
    public let jsName = "AudioInputPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getAvailableInputs", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCurrentInput", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setPreferredInput", returnType: CAPPluginReturnPromise)
    ]
    
    private var isSessionConfigured = false
    
    public override func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleRouteChange),
            name: AVAudioSession.routeChangeNotification,
            object: nil
        )
        
        // Configure session once on load
        configureAudioSession()
    }
    
    private func configureAudioSession() {
        guard !isSessionConfigured else { return }
        
        let session = AVAudioSession.sharedInstance()
        do {
            // Configure for recording with playback, allow Bluetooth
            try session.setCategory(.playAndRecord, mode: .default, options: [.allowBluetooth, .defaultToSpeaker])
            
            // Force built-in microphone as input when AirPods/Bluetooth are connected
            // This ensures audio output goes to AirPods but input comes from iPhone mic
            if let availableInputs = session.availableInputs {
                // Check if Bluetooth headphones are connected
                let hasBluetoothOutput = session.currentRoute.outputs.contains { output in
                    output.portType == .bluetoothA2DP || output.portType == .bluetoothHFP || output.portType == .bluetoothLE
                }
                
                if hasBluetoothOutput {
                    // Find and set built-in microphone as preferred input
                    if let builtInMic = availableInputs.first(where: { $0.portType == .builtInMic }) {
                        try session.setPreferredInput(builtInMic)
                        print("🎤 Forced built-in microphone as input (AirPods/Bluetooth detected for output)")
                    } else {
                        print("⚠️ Built-in microphone not found, using default input")
                    }
                } else {
                    print("🎤 Using default input routing (no Bluetooth output detected)")
                }
            }
            
            try session.setActive(true, options: [])
            isSessionConfigured = true
            print("✅ AudioInputPlugin: Audio session configured successfully")
        } catch {
            print("❌ AudioInputPlugin: Failed to configure audio session: \(error.localizedDescription)")
        }
    }
    
    @objc func getAvailableInputs(_ call: CAPPluginCall) {
        let session = AVAudioSession.sharedInstance()
        
        // Don't reactivate - session is already configured
        guard let availableInputs = session.availableInputs else {
            call.resolve(["devices": []])
            return
        }
        
        let devices = availableInputs.map { input in
            return [
                "portUID": input.uid,
                "portName": input.portName,
                "portType": input.portType.rawValue,
                "isBluetooth": input.portType == .bluetoothHFP || input.portType == .bluetoothA2DP || input.portType == .bluetoothLE
            ]
        }
        
        call.resolve(["devices": devices])
    }
    
    @objc func getCurrentInput(_ call: CAPPluginCall) {
        let session = AVAudioSession.sharedInstance()
        
        // Don't reactivate - session is already configured
        guard let currentInput = session.currentRoute.inputs.first else {
            call.resolve(["device": NSNull()])
            return
        }
        
        let device = [
            "portUID": currentInput.uid,
            "portName": currentInput.portName,
            "portType": currentInput.portType.rawValue,
            "isBluetooth": currentInput.portType == .bluetoothHFP || currentInput.portType == .bluetoothA2DP || currentInput.portType == .bluetoothLE
        ]
        
        call.resolve(["device": device])
    }
    
    @objc func setPreferredInput(_ call: CAPPluginCall) {
        guard let portUID = call.getString("portUID") else {
            call.reject("portUID is required")
            return
        }
        
        let session = AVAudioSession.sharedInstance()
        
        do {
            guard let availableInputs = session.availableInputs else {
                call.reject("No available inputs")
                return
            }
            
            guard let targetInput = availableInputs.first(where: { $0.uid == portUID }) else {
                call.reject("Input device not found")
                return
            }
            
            try session.setPreferredInput(targetInput)
            call.resolve(["success": true, "message": "Input device set successfully"])
        } catch {
            call.reject("Failed to set preferred input: \(error.localizedDescription)")
        }
    }
    
    @objc func handleRouteChange(notification: Notification) {
        guard let userInfo = notification.userInfo,
              let reasonValue = userInfo[AVAudioSessionRouteChangeReasonKey] as? UInt,
              let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else {
            return
        }
        
        var reasonString = "unknown"
        switch reason {
        case .newDeviceAvailable:
            reasonString = "newDeviceAvailable"
            // Re-configure audio session to ensure built-in mic stays as input
            isSessionConfigured = false
            configureAudioSession()
        case .oldDeviceUnavailable:
            reasonString = "oldDeviceUnavailable"
            // Re-configure audio session when devices disconnect
            isSessionConfigured = false
            configureAudioSession()
        case .categoryChange:
            reasonString = "categoryChange"
        case .override:
            reasonString = "override"
        case .wakeFromSleep:
            reasonString = "wakeFromSleep"
        case .noSuitableRouteForCategory:
            reasonString = "noSuitableRouteForCategory"
        case .routeConfigurationChange:
            reasonString = "routeConfigurationChange"
            // Re-configure to maintain built-in mic preference
            isSessionConfigured = false
            configureAudioSession()
        @unknown default:
            reasonString = "unknown"
        }
        
        notifyListeners("audioRouteChanged", data: ["reason": reasonString])
    }
}
