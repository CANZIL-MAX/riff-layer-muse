import UIKit
import Capacitor
import AVFoundation

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        
        // Configure audio session for music recording app
        do {
            let audioSession = AVAudioSession.sharedInstance()
            
            // Set category to allow recording and playback simultaneously
            try audioSession.setCategory(.playAndRecord, 
                                       mode: .default, 
                                       options: [.defaultToSpeaker, .allowBluetooth, .allowBluetoothA2DP])
            
            // Set preferred sample rate for better audio quality
            try audioSession.setPreferredSampleRate(44100.0)
            
            // Set preferred buffer duration for lower latency (especially important for AirPods)
            try audioSession.setPreferredIOBufferDuration(0.01) // 10ms buffer for low latency
            
            // Activate the audio session
            try audioSession.setActive(true)
            
            print("✅ Audio session configured successfully for recording app")
            print("📊 Sample rate: \(audioSession.sampleRate)")
            print("📊 IO buffer duration: \(audioSession.ioBufferDuration)")
            print("📊 Output latency: \(audioSession.outputLatency)")
            print("📊 Input latency: \(audioSession.inputLatency)")
            
        } catch {
            print("❌ Failed to configure audio session: \(error)")
        }
        
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits the application.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
        
        // Reactivate audio session when app becomes active
        do {
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setActive(true)
            print("✅ Audio session reactivated")
        } catch {
            print("❌ Failed to reactivate audio session: \(error)")
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
