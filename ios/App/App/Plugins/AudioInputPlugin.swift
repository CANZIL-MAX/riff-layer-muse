import Foundation
import Capacitor
import AVFoundation

@objc(AudioInputPlugin)
public class AudioInputPlugin: CAPPlugin {
    
    // Get all available audio input devices
    @objc func getAvailableInputs(_ call: CAPPluginCall) {
        let session = AVAudioSession.sharedInstance()
        
        guard let inputs = session.availableInputs else {
            call.resolve(["devices": []])
            return
        }
        
        let devices = inputs.map { input -> [String: Any] in
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
        
        guard let currentRoute = session.currentRoute.inputs.first else {
            call.resolve(["device": nil])
            return
        }
        
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
        guard let portUID = call.getString("portUID") else {
            call.reject("Port UID required")
            return
        }
        
        let session = AVAudioSession.sharedInstance()
        
        // Find the input port matching the UID
        guard let inputs = session.availableInputs,
              let selectedInput = inputs.first(where: { $0.uid == portUID }) else {
            call.reject("Input device not found")
            return
        }
        
        do {
            try session.setPreferredInput(selectedInput)
            call.resolve([
                "success": true,
                "message": "Switched to \(selectedInput.portName)"
            ])
        } catch {
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
