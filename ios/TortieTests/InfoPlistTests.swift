import XCTest
@testable import Tortie

/// The app's BUILT `Info.plist`, read from inside the app. These tests are
/// hosted in Tortie.app (`TEST_HOST`), so `Bundle.main` is the shipping bundle
/// and not the test bundle, which is also why the ATS arm runs under the
/// shipping keys (build/p316/SPEC.md section 3.2, section 4 S2). Each test names
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

    /// Clause: "exactly one ATS exception for 100.64.0.0/10 with
    /// NSExceptionAllowsInsecureHTTPLoads" (section 3.2, measured). One key,
    /// one domain, one value, and nothing beside any of them: an added
    /// `NSAllowsArbitraryLoads`, `NSAllowsLocalNetworking`, second domain or
    /// `NSIncludesSubdomains` each fails here.
    func testExactlyOneTransportSecurityException() throws {
        let ats = try XCTUnwrap(info["NSAppTransportSecurity"] as? [String: Any])
        XCTAssertEqual(Set(ats.keys), ["NSExceptionDomains"])
        let domains = try XCTUnwrap(ats["NSExceptionDomains"] as? [String: Any])
        XCTAssertEqual(Set(domains.keys), ["100.64.0.0/10"])
        let tailnet = try XCTUnwrap(domains["100.64.0.0/10"] as? [String: Any])
        XCTAssertEqual(Set(tailnet.keys), ["NSExceptionAllowsInsecureHTTPLoads"])
        XCTAssertEqual(tailnet["NSExceptionAllowsInsecureHTTPLoads"] as? Bool, true)
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
    /// letterbox and no frame the probe reads is the device's).
    func testDarkPortraitIPhoneFromEighteenPointOne() {
        XCTAssertEqual(info["UIUserInterfaceStyle"] as? String, "Dark")
        XCTAssertEqual(info["UISupportedInterfaceOrientations"] as? [String], ["UIInterfaceOrientationPortrait"])
        XCTAssertEqual(info["UIDeviceFamily"] as? [Int], [1])
        XCTAssertEqual(info["MinimumOSVersion"] as? String, "18.1")
        XCTAssertNotNil(info["UILaunchScreen"] as? [String: Any])
    }

    /// Clause: the camera sentence is one sentence (the SPEC's Files table).
    func testTheCameraIsExplainedInOneSentence() throws {
        let sentence = try XCTUnwrap(info["NSCameraUsageDescription"] as? String)
        XCTAssertTrue(sentence.hasSuffix("."))
        XCTAssertEqual(sentence.filter { $0 == "." }.count, 1, sentence)
    }

    /// Clause (Phase 316.3): the node's direct path to a Mac on the same
    /// network is a local network send, so iOS asks, and the app says why in
    /// one sentence (research 128 section 2).
    func testTheLocalNetworkIsExplainedInOneSentence() throws {
        let sentence = try XCTUnwrap(info["NSLocalNetworkUsageDescription"] as? String)
        XCTAssertTrue(sentence.hasSuffix("."))
        XCTAssertEqual(sentence.filter { $0 == "." }.count, 1, sentence)
    }

    /// Clause (Phase 316.3): the BUILT app carries its own privacy manifest,
    /// tracking nothing and collecting nothing, and the embedded TailscaleKit
    /// carries its own at the framework's root with the two categories he
    /// decided (section 6 decision 8), read from the bundle that ships.
    func testBothPrivacyManifestsShipInTheBundle() throws {
        let app = try XCTUnwrap(Bundle.main.url(forResource: "PrivacyInfo", withExtension: "xcprivacy"))
        let own = try XCTUnwrap(PropertyListSerialization.propertyList(from: Data(contentsOf: app), format: nil) as? [String: Any])
        XCTAssertEqual(own["NSPrivacyTracking"] as? Bool, false)
        XCTAssertEqual((own["NSPrivacyCollectedDataTypes"] as? [Any])?.count, 0)

        let frameworks = try XCTUnwrap(Bundle.main.privateFrameworksURL)
        let kit = frameworks.appendingPathComponent("TailscaleKit.framework/PrivacyInfo.xcprivacy", isDirectory: false)
        let theirs = try XCTUnwrap(PropertyListSerialization.propertyList(from: Data(contentsOf: kit), format: nil) as? [String: Any])
        XCTAssertEqual(theirs["NSPrivacyTracking"] as? Bool, false)
        let types = try XCTUnwrap(theirs["NSPrivacyAccessedAPITypes"] as? [[String: Any]])
        var declared: [String: [String]] = [:]
        for entry in types {
            let category = try XCTUnwrap(entry["NSPrivacyAccessedAPIType"] as? String)
            declared[category] = try XCTUnwrap(entry["NSPrivacyAccessedAPITypeReasons"] as? [String])
        }
        XCTAssertEqual(declared, [
            "NSPrivacyAccessedAPICategoryFileTimestamp": ["C617.1"],
            "NSPrivacyAccessedAPICategorySystemBootTime": ["35F9.1"],
        ])
    }

    /// Clause: `Tortie.entitlements` is empty: no networking entitlement, no
    /// VPN, no push, no keychain group (section 4 S2, rule (f)).
    func testTheEntitlementsAreEmpty() throws {
        let data = try XCTUnwrap(StyleSource.text("ios/Tortie/Tortie.entitlements").data(using: .utf8))
        let plist = try PropertyListSerialization.propertyList(from: data, format: nil)
        let entitlements = try XCTUnwrap(plist as? [String: Any])
        XCTAssertTrue(entitlements.isEmpty, "\(entitlements.keys.sorted())")
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
