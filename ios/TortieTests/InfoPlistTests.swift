import UIKit
import XCTest
@testable import Tortie

/// The app's BUILT `Info.plist`, read from inside the app. These tests are
/// hosted in Tortie.app (`TEST_HOST`), so `Bundle.main` is the shipping bundle
/// and not the test bundle (build/p316/SPEC.md section 4 S2). Each test names
/// the clause it holds, and each fails when that clause is taken out.
final class InfoPlistTests: XCTestCase {
    private var info: [String: Any] {
        Bundle.main.infoDictionary ?? [:]
    }

    /// The tests read the app, not themselves.
    func testTheseTestsAreHostedInTheApp() {
        XCTAssertEqual(Bundle.main.bundleIdentifier, "com.itavero.tortie.phone")
        XCTAssertEqual(info["CFBundleDisplayName"] as? String, "Tortie")
    }

    /// Clause (Phase 330): no App Transport Security key at all. The one
    /// client is Network.framework over TLS 1.3 with its own pin, which ATS
    /// does not govern, so there is nothing for an exception to allow
    /// (research 132 section 9 condition 8).
    func testNoTransportSecurityKey() {
        XCTAssertNil(info["NSAppTransportSecurity"])
    }

    /// Clause (Phase 330): no local network string. The phone dials the Mac's
    /// public name and nothing on the Wi-Fi it is on, so iOS never asks.
    func testNoLocalNetworkString() {
        XCTAssertNil(info["NSLocalNetworkUsageDescription"])
    }

    /// Clause: no background mode, ever (section 7), and no arbitrary loads.
    func testNoBackgroundModeAndNoArbitraryLoads() {
        XCTAssertNil(info["UIBackgroundModes"])
        XCTAssertNil(info["NSAllowsArbitraryLoads"])
        XCTAssertNil(info["BGTaskSchedulerPermittedIdentifiers"])
    }

    /// Clause: the export compliance key is left out until he answers it in App
    /// Store Connect (section 6, decision 7).
    func testTheExportComplianceKeyIsLeftOut() {
        XCTAssertNil(info["ITSAppUsesNonExemptEncryption"])
    }

    /// Clause: "Dark only. iPhone, portrait. Deployment target 18.1" (section
    /// 4.0), full screen (a launch screen, without which iOS draws the app in a
    /// letterbox and no frame the probe reads is the device's). Since Phase
    /// 337 the plist lists portrait and BOTH landscapes and no upside down,
    /// because iOS rotates only to what it lists; App/AppDelegate.swift
    /// answers portrait for every screen but the Screen (D27, rule an).
    func testDarkPortraitIPhoneFromEighteenPointOne() {
        XCTAssertEqual(info["UIUserInterfaceStyle"] as? String, "Dark")
        XCTAssertEqual(
            info["UISupportedInterfaceOrientations"] as? [String],
            ["UIInterfaceOrientationPortrait", "UIInterfaceOrientationLandscapeLeft", "UIInterfaceOrientationLandscapeRight"]
        )
        XCTAssertEqual(info["UIDeviceFamily"] as? [Int], [1])
        XCTAssertEqual(info["MinimumOSVersion"] as? String, "18.1")
        XCTAssertNotNil(info["UILaunchScreen"] as? [String: Any])
    }

    /// Clause (Phase 337, rule an): landscape on the Screen alone. The app
    /// delegate answers portrait unless the Screen is on top, and then both
    /// landscapes too, never upside down.
    @MainActor
    func testLandscapeIsTheScreensAlone() {
        let delegate = AppDelegate()
        let was = OrientationGate.screenOnTop
        defer { OrientationGate.screenOnTop = was }
        OrientationGate.screenOnTop = false
        XCTAssertEqual(delegate.application(UIApplication.shared, supportedInterfaceOrientationsFor: nil), .portrait)
        OrientationGate.screenOnTop = true
        XCTAssertEqual(delegate.application(UIApplication.shared, supportedInterfaceOrientationsFor: nil), .allButUpsideDown)
        XCTAssertEqual(OrientationGate.allowed, .allButUpsideDown)
    }

    /// Clause: the camera sentence is one sentence (the SPEC's Files table).
    func testTheCameraIsExplainedInOneSentence() throws {
        let sentence = try XCTUnwrap(info["NSCameraUsageDescription"] as? String)
        XCTAssertTrue(sentence.hasSuffix("."))
        XCTAssertEqual(sentence.filter { $0 == "." }.count, 1, sentence)
    }

    /// Clause (Phase 317, research 136 section 13): Face ID's purpose string,
    /// which iOS requires before it asks, in its one sentence, saying what it
    /// is asked for and nothing else (his ruling: "Only for End").
    func testFaceIDIsExplainedInOneSentence() throws {
        let sentence = try XCTUnwrap(info["NSFaceIDUsageDescription"] as? String)
        XCTAssertEqual(sentence, "Tortie asks for Face ID before it ends a session on your Mac.")
        XCTAssertEqual(sentence.filter { $0 == "." }.count, 1, sentence)
    }

    /// Clause (Phase 316.3): the BUILT app carries its own privacy manifest,
    /// tracking nothing and collecting nothing; since Phase 330 it carries no
    /// framework of anybody else's, and so no second manifest. Since Phase
    /// 316.7 it declares the one required-reason API the app calls, the
    /// Sessions tab's three kept words, with exactly the app's-own-data reason.
    func testTheAppsPrivacyManifestShipsInTheBundle() throws {
        let app = try XCTUnwrap(Bundle.main.url(forResource: "PrivacyInfo", withExtension: "xcprivacy"))
        let own = try XCTUnwrap(PropertyListSerialization.propertyList(from: Data(contentsOf: app), format: nil) as? [String: Any])
        XCTAssertEqual(own["NSPrivacyTracking"] as? Bool, false)
        XCTAssertEqual((own["NSPrivacyCollectedDataTypes"] as? [Any])?.count, 0)
        let types = try XCTUnwrap(own["NSPrivacyAccessedAPITypes"] as? [[String: Any]])
        XCTAssertEqual(types.count, 1)
        XCTAssertEqual(types.first?["NSPrivacyAccessedAPIType"] as? String, "NSPrivacyAccessedAPICategoryUserDefaults")
        XCTAssertEqual(types.first?["NSPrivacyAccessedAPITypeReasons"] as? [String], ["CA92.1"])
        let frameworks = Bundle.main.privateFrameworksURL.map { $0.path(percentEncoded: false) } ?? ""
        let embedded = (try? FileManager.default.contentsOfDirectory(atPath: frameworks)) ?? []
        XCTAssertFalse(embedded.contains { $0.hasPrefix("TailscaleKit") }, "\(embedded)")
    }

    /// Clause (Phase 316.5): `Tortie.entitlements` holds exactly
    /// `aps-environment` = `development`, Xcode's own spelling, which his
    /// TestFlight export re-signs as production: no networking entitlement,
    /// no VPN, no time-sensitive or critical alerts, no keychain group
    /// (build/p3165/SPEC.md section 5.7, conformance:ios rule w).
    func testTheOnlyEntitlementIsApsEnvironment() throws {
        let data = try XCTUnwrap(StyleSource.text("ios/Tortie/Tortie.entitlements").data(using: .utf8))
        let plist = try PropertyListSerialization.propertyList(from: data, format: nil)
        let entitlements = try XCTUnwrap(plist as? [String: Any])
        XCTAssertEqual(entitlements.keys.sorted(), ["aps-environment"])
        XCTAssertEqual(entitlements["aps-environment"] as? String, "development")
    }

    /// Clause: "a test plan with screenshots OFF" (section 4.0: a screenshot is
    /// a photograph). No capture by default, attachments kept never, no
    /// configuration turning either back on, and no target run in parallel,
    /// because a parallel run clones Simulators the harness did not create.
    func testThePlanTakesNoPictures() throws {
        let data = try XCTUnwrap(StyleSource.text("ios/Tortie.xctestplan").data(using: .utf8))
        let plan = try XCTUnwrap(try JSONSerialization.jsonObject(with: data) as? [String: Any])
        let defaults = try XCTUnwrap(plan["defaultOptions"] as? [String: Any])
        XCTAssertEqual(defaults["uiTestingScreenshotsEnabled"] as? Bool, false)
        XCTAssertEqual(defaults["systemAttachmentLifetime"] as? String, "keepNever")
        XCTAssertEqual(defaults["userAttachmentLifetime"] as? String, "keepNever")
        let configurations = try XCTUnwrap(plan["configurations"] as? [[String: Any]])
        for configuration in configurations {
            let options = configuration["options"] as? [String: Any] ?? [:]
            XCTAssertNil(options["uiTestingScreenshotsEnabled"])
            XCTAssertNil(options["systemAttachmentLifetime"])
            XCTAssertNil(options["userAttachmentLifetime"])
        }
        let targets = try XCTUnwrap(plan["testTargets"] as? [[String: Any]])
        XCTAssertEqual(targets.count, 2)
        for target in targets {
            XCTAssertEqual(target["parallelizable"] as? Bool, false)
        }
    }

    /// Clause: the Simulator signs ad hoc with no team. Every Debug
    /// configuration in the committed project names no team and signs with
    /// `-`. (Phase 316.4 gives Release his team; Debug stays teamless.)
    func testDebugSignsAdHocWithNoTeam() throws {
        let project = try StyleSource.text("ios/Tortie.xcodeproj/project.pbxproj")
        let blocks = project.components(separatedBy: "isa = XCBuildConfiguration;").dropFirst()
        let debug = blocks.filter { $0.contains("name = Debug;") }
        XCTAssertEqual(debug.count, 4)
        for block in debug {
            let settings = block.components(separatedBy: "name = Debug;")[0]
            XCTAssertTrue(settings.contains("DEVELOPMENT_TEAM = \"\";"))
            XCTAssertTrue(settings.contains("CODE_SIGN_IDENTITY = \"-\";"))
            XCTAssertTrue(settings.contains("CODE_SIGN_STYLE = Manual;"))
        }
    }
}
