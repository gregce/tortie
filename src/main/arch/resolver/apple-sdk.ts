/**
 * The Apple SDK module names the Swift and Objective-C arms answer `external`
 * for (Phase 180).
 *
 * WHY A COMPILED IN LIST IS ALLOWED HERE when ./answers.ts binds every arm to
 * "the repository has to have said so". These are the platform, not a
 * dependency: no manifest declares `Foundation` and every Apple repository may
 * import it, exactly as the script arm answers `external` for `node:fs` out of
 * Node's own builtin list and the Ruby arm answers out of Ruby's stdlib. The
 * list is checked AFTER the repository's own targets have had their chance at
 * the name, so a repository that declares its own `Charts` target wins over
 * Apple's Charts.
 *
 * THE LIMIT, STATED. This list is HAND WRITTEN and known to be incomplete:
 * Apple ships hundreds of frameworks and this holds the ones real repositories
 * import. A genuine SDK module missing from it answers `unresolved`, which is
 * grey and safe, never `external` by guesswork, and adding a name here is a
 * one line change a failing face makes obvious. Nothing here can run: these
 * are names compared against import specifiers and they reach no argv.
 */

/** Frameworks and modules Apple's SDKs ship, matched on the module head. */
export const APPLE_SDK_MODULES: ReadonlySet<string> = new Set([
  // The language's own runtime and the package manifest's own module.
  'Swift', 'PackageDescription', 'Darwin', 'Dispatch', 'ObjectiveC', 'simd',
  'os', 'OSLog', 'Observation', 'Testing', 'XCTest', 'XCUIAutomation',
  'Foundation', 'CoreFoundation', 'Combine', 'SwiftData', 'SwiftUI',
  // App kit and UI.
  'AppKit', 'UIKit', 'WatchKit', 'Cocoa', 'Carbon', 'TVUIKit',
  'WidgetKit', 'ActivityKit', 'AppIntents', 'TipKit', 'Charts',
  'UniformTypeIdentifiers', 'QuickLook', 'QuickLookThumbnailing',
  'PencilKit', 'PDFKit', 'SafariServices', 'WebKit', 'MessageUI', 'Messages',
  // Graphics, media and games.
  'CoreGraphics', 'CoreImage', 'CoreText', 'CoreAnimation', 'QuartzCore',
  'Metal', 'MetalKit', 'MetalPerformanceShaders', 'SceneKit', 'SpriteKit',
  'ARKit', 'RealityKit', 'RealityFoundation', 'GameKit', 'GameController',
  'GameplayKit', 'AVFoundation', 'AVFAudio', 'AVKit', 'AudioToolbox',
  'CoreAudio', 'CoreAudioKit', 'CoreMedia', 'CoreVideo', 'VideoToolbox',
  'ImageIO', 'Vision', 'VisionKit', 'ScreenCaptureKit', 'ReplayKit',
  'PhotosUI', 'Photos', 'MediaPlayer', 'MusicKit', 'ShazamKit',
  // Data, system and services.
  'CoreData', 'CloudKit', 'CoreServices', 'ApplicationServices', 'IOKit',
  'SystemConfiguration', 'Network', 'NetworkExtension', 'Security',
  'CryptoKit', 'LocalAuthentication', 'AuthenticationServices',
  'ServiceManagement', 'BackgroundTasks', 'UserNotifications',
  'NotificationCenter', 'JavaScriptCore', 'Accelerate', 'NaturalLanguage',
  'CoreML', 'CreateML', 'Speech', 'SoundAnalysis', 'Translation',
  // Sensors, location and people.
  'CoreLocation', 'MapKit', 'WeatherKit', 'CoreMotion', 'CoreBluetooth',
  'CoreHaptics', 'CoreNFC', 'SensorKit', 'HealthKit', 'HomeKit',
  'Contacts', 'ContactsUI', 'EventKit', 'EventKitUI', 'Intents', 'IntentsUI',
  'CallKit', 'PushKit', 'CarPlay', 'ClockKit', 'StoreKit', 'PassKit',
  'GroupActivities', 'MultipeerConnectivity', 'ExternalAccessory', 'Spatial',
  'DeviceActivity', 'FamilyControls', 'ManagedSettings', 'ExtensionKit',
  'OSAKit', 'Automator', 'AddressBook', 'Social', 'AdServices', 'AppTrackingTransparency'
]);
