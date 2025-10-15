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
            // iOS-only DAW: Use .measurement mode to prioritize built-in mic quality
            // allowBluetoothA2DP: Bluetooth for OUTPUT only (AirPods/Bluetooth speakers)
            // This prevents iOS from routing INPUT to Bluetooth microphone
            // The iPhone's built-in mic will ALWAYS be used for recording
            try session.setCategory(.playAndRecord, mode: .measurement, options: [.allowBluetoothA2DP, .defaultToSpeaker])
            
            // Always prefer built-in microphone for input
            // This ensures high-quality recording even when AirPods are connected
            if let availableInputs = session.availableInputs,
               let builtInMic = availableInputs.first(where: { $0.portType == .builtInMic }) {
                try session.setPreferredInput(builtInMic)
                print("🎤 Built-in microphone set as preferred input (iPhone mic always used)")
            } else {
                print("⚠️ Built-in microphone not found in available inputs")
            }
            
            try session.setActive(true, options: [])
            isSessionConfigured = true
            print("✅ AudioInputPlugin: Audio session configured (Bluetooth A2DP for output, iPhone mic for input)")
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
        // iOS-only DAW: ALWAYS return built-in microphone
        // Even if iOS route shows AirPods, we force built-in mic
        let session = AVAudioSession.sharedInstance()
        
        if let availableInputs = session.availableInputs,
           let builtInMic = availableInputs.first(where: { $0.portType == .builtInMic }) {
            let device = [
                "portUID": builtInMic.uid,
                "portName": "iPhone Microphone (Built-in)",
                "portType": builtInMic.portType.rawValue,
                "isBluetooth": false
            ]
            call.resolve(["device": device])
            print("✅ [AudioInputPlugin] Returning built-in mic: \(builtInMic.portName)")
        } else {
            // Fallback - should never happen on iOS
            call.resolve(["device": NSNull()])
            print("⚠️ [AudioInputPlugin] Built-in mic not found in available inputs")
        }
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
