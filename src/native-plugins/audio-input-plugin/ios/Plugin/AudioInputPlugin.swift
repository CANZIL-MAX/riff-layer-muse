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
    
    public override func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleRouteChange),
            name: AVAudioSession.routeChangeNotification,
            object: nil
        )
    }
    
    @objc func getAvailableInputs(_ call: CAPPluginCall) {
        let session = AVAudioSession.sharedInstance()
        
        do {
            try session.setCategory(.playAndRecord, mode: .default, options: [])
            try session.setActive(true)
            
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
        } catch {
            call.reject("Failed to get available inputs: \(error.localizedDescription)")
        }
    }
    
    @objc func getCurrentInput(_ call: CAPPluginCall) {
        let session = AVAudioSession.sharedInstance()
        
        do {
            try session.setActive(true)
            
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
        } catch {
            call.reject("Failed to get current input: \(error.localizedDescription)")
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
        case .oldDeviceUnavailable:
            reasonString = "oldDeviceUnavailable"
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
        @unknown default:
            reasonString = "unknown"
        }
        
        notifyListeners("audioRouteChanged", data: ["reason": reasonString])
    }
}
