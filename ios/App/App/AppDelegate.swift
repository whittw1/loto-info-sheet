import UIKit
import Capacitor
import Vision

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
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

// ============================================================================
// TextRecognition — custom Capacitor plugin using Apple's Vision framework
// ----------------------------------------------------------------------------
// Exposed to JS as `Capacitor.Plugins.TextRecognition`. Single method:
//
//   TextRecognition.recognizeText({ base64Image: string })
//      → { text: string, blocks: [{ text: string, confidence: number }] }
//
// `base64Image` is the raw base64 payload with or without a data-URL prefix
// (e.g. "data:image/jpeg;base64,..."). Returns concatenated text plus
// per-line blocks with confidence scores.
//
// Uses VNRecognizeTextRequest with .accurate recognition level and English
// language correction enabled. Runs on a background queue; resolves the
// CAPPluginCall when Vision completes. Auto-discovered by Capacitor at
// runtime via Objective-C class introspection (no project.pbxproj edits
// required, no external SDK, no model download — Vision is built into iOS).
// ============================================================================
@objc(TextRecognition)
public class TextRecognition: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TextRecognition"
    public let jsName = "TextRecognition"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "recognizeText", returnType: CAPPluginReturnPromise)
    ]

    @objc public func recognizeText(_ call: CAPPluginCall) {
        guard var base64String = call.getString("base64Image") else {
            call.reject("base64Image is required")
            return
        }

        // Strip a "data:image/...;base64," prefix if the caller included it
        if let commaIndex = base64String.firstIndex(of: ","),
           base64String[..<commaIndex].contains("base64") {
            base64String = String(base64String[base64String.index(after: commaIndex)...])
        }

        guard let imageData = Data(base64Encoded: base64String),
              let uiImage = UIImage(data: imageData),
              let cgImage = uiImage.cgImage else {
            call.reject("Could not decode image data")
            return
        }

        let orientation = CGImagePropertyOrientation(uiImage.imageOrientation)

        let request = VNRecognizeTextRequest { request, error in
            if let error = error {
                call.reject("Vision OCR error: \(error.localizedDescription)")
                return
            }
            let observations = (request.results as? [VNRecognizedTextObservation]) ?? []
            var lines: [String] = []
            var blocks: [[String: Any]] = []
            for obs in observations {
                guard let top = obs.topCandidates(1).first else { continue }
                lines.append(top.string)
                blocks.append([
                    "text": top.string,
                    "confidence": top.confidence
                ])
            }
            call.resolve([
                "text": lines.joined(separator: "\n"),
                "blocks": blocks
            ])
        }
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true
        if #available(iOS 16.0, *) {
            request.recognitionLanguages = ["en-US"]
        }

        let handler = VNImageRequestHandler(cgImage: cgImage, orientation: orientation, options: [:])
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                try handler.perform([request])
            } catch {
                DispatchQueue.main.async {
                    call.reject("Vision OCR perform failed: \(error.localizedDescription)")
                }
            }
        }
    }
}

// ============================================================================
// LotoBridgeViewController
// ----------------------------------------------------------------------------
// Capacitor 8's automatic plugin discovery via objc runtime scan picks up
// SwiftPM-packaged plugins (like @capacitor/camera, which is declared in
// CapApp-SPM/Package.swift) but does NOT reliably discover in-app Swift
// classes defined in the App target itself. Result: TextRecognition was
// compiled into the binary and registered with the ObjC runtime, but the
// Capacitor bridge never called registerPluginType on it, so JS calls
// failed with "plugin not loaded".
//
// Fix: subclass CAPBridgeViewController and explicitly register the
// TextRecognition instance once the bridge is ready. Main.storyboard
// points at this subclass instead of CAPBridgeViewController directly.
// ============================================================================
public class LotoBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(TextRecognition())
    }
}

// Bridge from UIImage.Orientation → CGImagePropertyOrientation so Vision can
// read the captured photo at the correct rotation regardless of how the
// device was held when the user tapped Scan.
private extension CGImagePropertyOrientation {
    init(_ uiOrientation: UIImage.Orientation) {
        switch uiOrientation {
        case .up: self = .up
        case .down: self = .down
        case .left: self = .left
        case .right: self = .right
        case .upMirrored: self = .upMirrored
        case .downMirrored: self = .downMirrored
        case .leftMirrored: self = .leftMirrored
        case .rightMirrored: self = .rightMirrored
        @unknown default: self = .up
        }
    }
}
