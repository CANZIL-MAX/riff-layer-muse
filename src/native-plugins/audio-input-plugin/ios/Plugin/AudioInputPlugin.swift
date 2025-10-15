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
            // iOS DAW: Use .videoRecording mode to allow Bluetooth mic input
            // allowBluetooth: Enables Bluetooth for both input AND output
            // allowBluetoothA2DP: High-quality Bluetooth audio output
            // Users can now choose between built-in mic (high quality) and AirPods (convenience)
            try session.setCategory(.playAndRecord, mode: .videoRecording, options: [.allowBluetooth, .allowBluetoothA2DP, .defaultToSpeaker])
            
            try session.setActive(true, options: [])
            isSessionConfigured = true
            print("✅ AudioInputPlugin: Audio session configured (Bluetooth enabled for input/output)")
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
        // Return the ACTUAL current input device (built-in or Bluetooth)
        let session = AVAudioSession.sharedInstance()
        
        // Check current route's input
        if let currentInput = session.currentRoute.inputs.first {
            let device = [
                "portUID": currentInput.uid,
                "portName": currentInput.portName,
                "portType": currentInput.portType.rawValue,
                "isBluetooth": currentInput.portType == .bluetoothHFP || currentInput.portType == .bluetoothA2DP || currentInput.portType == .bluetoothLE
            ]
            call.resolve(["device": device])
            print("✅ [AudioInputPlugin] Current input: \(currentInput.portName) (Bluetooth: \(device["isBluetooth"] ?? false))")
        } else {
            call.resolve(["device": NSNull()])
            print("⚠️ [AudioInputPlugin] No current input found")
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
