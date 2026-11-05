import UIKit
import XCTest
@testable import Tortie

/// The pull on a full-screen program (Phase 350, build/p350/SPEC.md D7, D8,
/// D21 and section 2.3, M3): `ScreenPull`'s rule over every reading M3
/// recorded off the scroll view's own pan, on an iPhone 16 Pro and an iPhone
/// SE (3rd generation), on iOS 26.3 and the 18.3 floor; each clause of the
/// rule on its own; and the scroll view's own pan driven through its target
/// with stand-in recognisers, so the state the pull keeps (where it began, the
/// most fingers, whether the pinch ran and a selection was held) and the one
/// `.ended` arm that asks the rule are held as they ship. Nothing reaches a
/// network. Each test names the clause it holds and fails when that clause is
/// taken out of Screens/ScreenScroller.swift.
@MainActor
final class ScreenPullTests: XCTestCase {
    private var window: UIWindow?
    private var pages: [ScreenKeyName] = []

    override func tearDown() async throws {
        window?.isHidden = true
        window?.rootViewController = nil
        window = nil
        pages = []
    }

    // MARK: M3's readings

    /// One reading M3 recorded when a drag ended: the drive's gesture, what
    /// the scroll view's own pan and offset reported, and the travel past
    /// each edge that M3's recorder computed by its own arithmetic
    /// (build/p350/SPEC.md section 2.3; the prototype's `m3Pulled(_:)`).
    struct Reading {
        let runtime: String
        let device: String
        let arm: String
        let translation: CGFloat
        let start: CGFloat
        let min: CGFloat
        let max: CGFloat
        let touches: Int
        let pinch: Bool
        let selection: Bool
        let pastTop: CGFloat
        let pastBottom: CGFloat

        var name: String { "\(runtime) \(device) \(arm)" }

        /// What the rule answers for this reading on a picture that offers
        /// a page.
        var page: ScreenKeyName? {
            ScreenPull.page(
                translation: translation, startOffset: start, minOffset: min, maxOffset: max,
                touches: touches, pinched: pinch, selected: selection, offered: true
            )
        }

        /// What M3's own numbers say a pull of D21's travel sends: nothing
        /// with a selection held, else Page Up past the top, Page Down past
        /// the bottom.
        var measured: ScreenKeyName? {
            if selection { return nil }
            if pastTop >= 44 { return .pageUp }
            if pastBottom >= 44 { return .pageDown }
            return nil
        }
    }

    /// Every pan record M3 kept, in the drive's order: 27 gestures on each of
    /// the four devices. On 26.3 the drive read the grid's value after each
    /// gesture (scratch/p350/spec/m3/out.json, one record per gesture whose
    /// count moved); on 18.3 the drive ran blind and the app's own records
    /// were read off each device before its teardown (outd.json and
    /// se183-app.json), because a value read of the grid ends the app there
    /// (section 2.3.1). Columns: runtime, device, gesture, the pan's
    /// translation, the offset where it began, the offset's minimum and
    /// maximum, the most fingers, a pinch seen, a selection held, the travel
    /// past the top and past the bottom.
    static let table = """
    26.3 16Pro ps16-down 144.33333333333337 -4 0 0 1 0 0 144.33333333333337 0
    26.3 16Pro ps16-up -144.33333333333343 3.6666666666666665 0 0 1 0 0 0 144.33333333333343
    26.3 16Pro down-12 2 -0.33333333333333337 0 0 1 0 0 2 0
    26.3 16Pro down-24 14 0 0 0 1 0 0 14 0
    26.3 16Pro down-40 30 -5.666666666666667 0 0 1 0 0 30 0
    26.3 16Pro down-60 50 -5.333333333333333 0 0 1 0 0 50 0
    26.3 16Pro down-90 80.00000000000006 -4.666666666666667 0 0 1 0 0 80.00000000000006 0
    26.3 16Pro down-140 129.99999999999994 -4 0 0 1 0 0 129.99999999999994 0
    26.3 16Pro up-12 -2 0.3333333333333333 0 0 1 0 0 0 2
    26.3 16Pro up-24 -14 0 0 0 1 0 0 0 14
    26.3 16Pro up-40 -30 5.666666666666667 0 0 1 0 0 0 30
    26.3 16Pro up-60 -50 5.333333333333333 0 0 1 0 0 0 50
    26.3 16Pro up-90 -80.00000000000006 4.666666666666667 0 0 1 0 0 0 80.00000000000006
    26.3 16Pro up-140 -130 4 0 0 1 0 0 0 130
    26.3 16Pro down-60-slow 49.99999999999994 -0.6666666666666667 0 0 1 0 0 49.99999999999994 0
    26.3 16Pro down-60-held 50 -2.3333333333333335 0 0 1 0 0 50 0
    26.3 16Pro swipe-down 160 0 0 0 1 0 0 160 0
    26.3 16Pro swipe-up -160 0 0 0 1 0 0 0 160
    26.3 16Pro drag-with-selection 129.99999999999994 -4 0 0 1 0 1 129.99999999999994 0
    26.3 16Pro zoomed-down-140 130 75.33333333333333 0 87.33333333333337 1 0 0 54.66666666666667 0
    26.3 16Pro zoomed-up-140 -129.9999999999999 7.333333333333333 0 87.33333333333337 1 0 0 0 49.999999999999844
    26.3 16Pro zoomed-up-600 -498.33333333333326 90 0 87.33333333333337 1 0 0 0 498.33333333333326
    26.3 16Pro zoomed-down-600 590 82.66666666666667 0 87.33333333333337 1 0 0 507.3333333333333 0
    26.3 16Pro landscape-down-80 69.99999999999991 203 0 212 1 0 0 0 0
    26.3 16Pro landscape-up-80 -70 9 0 212 1 0 0 0 0
    26.3 16Pro landscape-up-400 -354.99999999999983 214.66666666666666 0 212 1 0 0 0 354.99999999999983
    26.3 16Pro landscape-down-400 331 207 0 212 1 0 0 124 0
    26.3 SE ps16-down 99.5 33.5 0 41.5 1 0 0 66 0
    26.3 SE ps16-up -99.5 8 0 41.5 1 0 0 0 66
    26.3 SE down-12 2 41 0 41.5 1 0 0 0 0
    26.3 SE down-24 14 28.5 0 41.5 1 0 0 0 0
    26.3 SE down-40 30 14.5 0 41.5 1 0 0 15.5 0
    26.3 SE down-60 50 -5.5 0 41.5 1 0 0 50 0
    26.3 SE down-90 80 -4.5 0 41.5 1 0 0 80 0
    26.3 SE down-140 130 -4 0 41.5 1 0 0 130 0
    26.3 SE up-12 -2 0.5 0 41.5 1 0 0 0 0
    26.3 SE up-24 -14 2.5 0 41.5 1 0 0 0 0
    26.3 SE up-40 -30 47.5 0 41.5 1 0 0 0 30
    26.3 SE up-60 -50 47 0 41.5 1 0 0 0 50
    26.3 SE up-90 -80 46 0 41.5 1 0 0 0 80
    26.3 SE up-140 -130 45.5 0 41.5 1 0 0 0 130
    26.3 SE down-60-slow 50 40.5 0 41.5 1 0 0 9.5 0
    26.3 SE down-60-held 50 -2.5 0 41.5 1 0 0 50 0
    26.3 SE swipe-down 176 0 0 41.5 1 0 0 176 0
    26.3 SE swipe-up -160 0 0 41.5 1 0 0 0 118.5
    26.3 SE drag-with-selection 130 34 0 41.5 1 0 1 96 0
    26.3 SE zoomed-down-140 130 50.5 0 176.5 1 0 0 79.5 0
    26.3 SE zoomed-up-140 -130 7.5 0 176.5 1 0 0 0 0
    26.3 SE zoomed-up-600 -367 179 0 176.5 1 0 0 0 367
    26.3 SE zoomed-down-600 474.5 172 0 176.5 1 0 0 302.5 0
    26.3 SE landscape-down-80 70 -4.5 0 164 1 0 0 70 0
    26.3 SE landscape-up-80 -70 8.5 0 164 1 0 0 0 0
    26.3 SE landscape-up-400 -334.5 164 0 164 1 0 0 0 334.5
    26.3 SE landscape-down-400 304.5 158.5 0 164 1 0 0 146 0
    18.3 16Pro ps16-down 142.6666717529297 0 0 0 1 0 0 142.6666717529297 0
    18.3 16Pro ps16-up -142.6666717529297 0 0 0 1 0 0 0 142.6666717529297
    18.3 16Pro down-12 1.333343505859375 0 0 0 1 0 0 1.333343505859375 0
    18.3 16Pro down-24 13.666671752929688 0 0 0 1 0 0 13.666671752929688 0
    18.3 16Pro down-40 19.333343505859375 0 0 0 1 0 0 19.333343505859375 0
    18.3 16Pro down-60 40.333343505859375 0 0 0 1 0 0 40.333343505859375 0
    18.3 16Pro down-90 71.33334350585938 0 0 0 1 0 0 71.33334350585938 0
    18.3 16Pro down-140 112.33334350585938 0 0 0 1 0 0 112.33334350585938 0
    18.3 16Pro up-12 -1.333343505859375 0 0 0 1 0 0 0 1.333343505859375
    18.3 16Pro up-24 -13.666671752929688 0 0 0 1 0 0 0 13.666671752929688
    18.3 16Pro up-40 -19 0 0 0 1 0 0 0 19
    18.3 16Pro up-60 -40.333343505859375 0 0 0 1 0 0 0 40.333343505859375
    18.3 16Pro up-90 -71.33334350585938 0 0 0 1 0 0 0 71.33334350585938
    18.3 16Pro up-140 -122.66667175292966 0 0 0 1 0 0 0 122.66667175292966
    18.3 16Pro down-60-slow 49 0 0 0 1 0 0 49 0
    18.3 16Pro down-60-held 45.66667175292969 0 0 0 1 0 0 45.66667175292969 0
    18.3 16Pro swipe-down 160 0 0 0 1 0 0 160 0
    18.3 16Pro swipe-up -176 0 0 0 1 0 0 0 176
    18.3 16Pro drag-with-selection 122.66667175292969 0 0 0 1 0 1 122.66667175292969 0
    18.3 16Pro zoomed-down-140 122.66667175292969 75.33333333333333 0 75.33333333333337 1 0 0 47.33333841959636 0
    18.3 16Pro zoomed-up-140 -122.66667175292969 0 0 75.33333333333337 1 0 0 0 47.333338419596316
    18.3 16Pro zoomed-up-600 -484.3333282470703 75.33333333333333 0 75.33333333333337 1 0 0 0 484.33332824707026
    18.3 16Pro zoomed-down-600 585 75.33333333333333 0 75.33333333333337 1 0 0 509.6666666666667 0
    18.3 16Pro landscape-down-80 61 213 0 213 1 0 0 0 0
    18.3 16Pro landscape-up-80 -61 0 0 213 1 0 0 0 0
    18.3 16Pro landscape-up-400 -348.99999999999994 213 0 213 1 0 0 0 348.99999999999994
    18.3 16Pro landscape-down-400 326 213 0 213 1 0 0 113 0
    18.3 SE ps16-down 106.5 9 0 9 1 0 0 97.5 0
    18.3 SE ps16-up -106.5 0 0 9 1 0 0 0 97.5
    18.3 SE down-12 1.5 9 0 9 1 0 0 0 0
    18.3 SE down-24 14 7.5 0 9 1 0 0 6.5 0
    18.3 SE down-40 19 0 0 9 1 0 0 19 0
    18.3 SE down-60 40.5 0 0 9 1 0 0 40.5 0
    18.3 SE down-90 71.5 0 0 9 1 0 0 71.5 0
    18.3 SE down-140 122.5 0 0 9 1 0 0 122.5 0
    18.3 SE up-12 -1.5 0 0 9 1 0 0 0 0
    18.3 SE up-24 -14 1.5 0 9 1 0 0 0 6.5
    18.3 SE up-40 -19 9 0 9 1 0 0 0 19
    18.3 SE up-60 -40.5 9 0 9 1 0 0 0 40.5
    18.3 SE up-90 -71.5 9 0 9 1 0 0 0 71.5
    18.3 SE up-140 -122.5 9 0 9 1 0 0 0 122.5
    18.3 SE down-60-slow 49 9 0 9 1 0 0 40 0
    18.3 SE down-60-held 46 0 0 9 1 0 0 46 0
    18.3 SE swipe-down 176 0 0 9 1 0 0 176 0
    18.3 SE swipe-up -176 0 0 9 1 0 0 0 167
    18.3 SE drag-with-selection 112.5 9 0 9 1 0 1 103.5 0
    18.3 SE zoomed-down-140 122.5 65.5 0 144 1 0 0 57 0
    18.3 SE zoomed-up-140 -122.5 0 0 144 1 0 0 0 0
    18.3 SE zoomed-up-600 -371.5 144 0 144 1 0 0 0 371.5
    18.3 SE zoomed-down-600 486.5 144 0 144 1 0 0 342.5 0
    18.3 SE landscape-down-80 61.5 0 0 164 1 0 0 61.5 0
    18.3 SE landscape-up-80 -61.5 0 0 164 1 0 0 0 0
    18.3 SE landscape-up-400 -334.5 164 0 164 1 0 0 0 334.5
    18.3 SE landscape-down-400 299 164 0 164 1 0 0 135 0
    """

    /// The table read, one reading a line; a line that does not read is a
    /// failure of the test that asks for it, never a row skipped.
    static func readings() throws -> [Reading] {
        try table.split(separator: "\n").map { line in
            let f = line.split(separator: " ").map(String.init)
            guard f.count == 12 else { throw UnreadReading(line: String(line)) }
            let n = f[3...].compactMap(Double.init)
            guard n.count == 9 else { throw UnreadReading(line: String(line)) }
            return Reading(
                runtime: f[0], device: f[1], arm: f[2],
                translation: CGFloat(n[0]), start: CGFloat(n[1]), min: CGFloat(n[2]), max: CGFloat(n[3]),
                touches: Int(n[4]), pinch: n[5] != 0, selection: n[6] != 0,
                pastTop: CGFloat(n[7]), pastBottom: CGFloat(n[8])
            )
        }
    }

    /// One reading by its device and gesture.
    private func reading(_ runtime: String, _ device: String, _ arm: String) throws -> Reading {
        try XCTUnwrap(try Self.readings().first { $0.runtime == runtime && $0.device == device && $0.arm == arm }, "\(runtime) \(device) \(arm)")
    }

    /// Clause (D21, M3): over all 108 readings, 27 gestures on each of the
    /// four devices, the rule sends exactly what M3's own numbers say a pull
    /// of 44 pt past the edge sends: Page Up past the top, Page Down past the
    /// bottom, nothing with a selection held, nothing short of it.
    func testTheRuleAgreesWithEveryReadingM3Recorded() throws {
        let all = try Self.readings()
        XCTAssertEqual(all.count, 108)
        for runtime in ["26.3", "18.3"] {
            for device in ["16Pro", "SE"] {
                let these = all.filter { $0.runtime == runtime && $0.device == device }
                XCTAssertEqual(these.count, 27, "\(runtime) \(device)")
                let ups = these.filter { $0.page == .pageUp }.count
                let downs = these.filter { $0.page == .pageDown }.count
                print("P350_PULL|\(runtime)|\(device)|readings \(these.count)|up \(ups)|down \(downs)|none \(these.count - ups - downs)")
            }
        }
        for r in all {
            XCTAssertEqual(r.page, r.measured, r.name)
            XCTAssertEqual(r.touches, 1, "\(r.name): M3 recorded no pan with two fingers")
            XCTAssertFalse(r.pinch, "\(r.name): M3 recorded no pinch beginning the pan")
        }
    }

    /// Clause (D21, section 2.3): PS16's drag, which the probes pull with,
    /// pages on all four devices, at least 66 pt past the edge.
    func testPS16sDragPagesOnAllFourDevices() throws {
        for runtime in ["26.3", "18.3"] {
            for device in ["16Pro", "SE"] {
                let down = try reading(runtime, device, "ps16-down")
                let up = try reading(runtime, device, "ps16-up")
                XCTAssertEqual(down.page, .pageUp, down.name)
                XCTAssertEqual(up.page, .pageDown, up.name)
                XCTAssertGreaterThanOrEqual(down.pastTop, 66, down.name)
                XCTAssertGreaterThanOrEqual(up.pastBottom, 66, up.name)
            }
        }
    }

    /// Clause (D21, M3): a drag the pan read as 30 pt past the edge does not
    /// page and 50 pt does; on 18.3, where XCUITest's short drags read less,
    /// a requested 60 pt drag reads 40 pt (no page) and 49 pt (a page),
    /// either side of the 44.
    func testTheThresholdIsWhereM3PutIt() throws {
        XCTAssertEqual(try reading("26.3", "16Pro", "down-40").page, nil)
        XCTAssertEqual(try reading("26.3", "16Pro", "down-60").page, .pageUp)
        XCTAssertEqual(try reading("26.3", "16Pro", "up-40").page, nil)
        XCTAssertEqual(try reading("26.3", "16Pro", "up-60").page, .pageDown)
        XCTAssertEqual(try reading("18.3", "16Pro", "down-60").page, nil)
        XCTAssertEqual(try reading("18.3", "16Pro", "down-60-slow").page, .pageUp)
        XCTAssertEqual(try reading("18.3", "16Pro", "up-60").page, nil)
        for runtime in ["26.3", "18.3"] {
            for device in ["16Pro", "SE"] {
                for arm in ["down-12", "down-24", "up-12", "up-24"] {
                    XCTAssertNil(try reading(runtime, device, arm).page, "\(runtime) \(device) \(arm)")
                }
            }
        }
    }

    /// Clause (D21, M3 items d and 13): sideways, zoomed, and upright on the
    /// SE the rows pan first, and only what the offset could not absorb
    /// counts: a pull from mid-rows sideways sends nothing, and the SE's
    /// PS16 drag pages with its 33.5 pt of room absorbed first.
    func testTheRowsPanFirst() throws {
        XCTAssertNil(try reading("26.3", "16Pro", "landscape-down-80").page, "sideways from mid-rows the rows pan")
        XCTAssertNil(try reading("26.3", "16Pro", "landscape-up-80").page)
        XCTAssertEqual(try reading("26.3", "16Pro", "landscape-up-400").page, .pageDown)
        XCTAssertEqual(try reading("26.3", "16Pro", "landscape-down-400").page, .pageUp, "124 pt past the top after 207 of room")
        XCTAssertEqual(try reading("26.3", "16Pro", "zoomed-down-140").page, .pageUp, "55 pt past the top after 75 of room")
        XCTAssertNil(try reading("18.3", "SE", "zoomed-up-140").page, "zoomed on the SE the rows pan")
        XCTAssertNil(try reading("26.3", "SE", "down-40").page, "the SE's rows absorb 14.5 pt first")
        let se = try reading("26.3", "SE", "ps16-down")
        XCTAssertEqual(se.start, 33.5)
        XCTAssertEqual(se.pastTop, 66, "33.5 pt of the 99.5 absorbed by the rows")
        XCTAssertEqual(se.page, .pageUp)
    }

    /// Clause (D8, M3 item 14): a drag with a selection held DOES pan, 96 to
    /// 130 pt past the top on the four devices, and sends no page.
    func testASelectionHeldSendsNoPage() throws {
        for runtime in ["26.3", "18.3"] {
            for device in ["16Pro", "SE"] {
                let r = try reading(runtime, device, "drag-with-selection")
                XCTAssertTrue(r.selection, r.name)
                XCTAssertGreaterThanOrEqual(r.pastTop, 96, r.name)
                XCTAssertNil(r.page, r.name)
            }
        }
    }

    // MARK: The rule, clause by clause

    private func page(
        _ translation: CGFloat, start: CGFloat = 0, min: CGFloat = 0, max: CGFloat = 0, touches: Int = 1,
        pinched: Bool = false, selected: Bool = false, offered: Bool = true
    ) -> ScreenKeyName? {
        ScreenPull.page(
            translation: translation, startOffset: start, minOffset: min, maxOffset: max,
            touches: touches, pinched: pinched, selected: selected, offered: offered
        )
    }

    /// Clause (D21): the travel is 44 pt.
    func testTheTravelIsFortyFourPoints() {
        XCTAssertEqual(ScreenPull.travel, 44)
    }

    /// Clause (D21): exactly the travel past an edge pages, a point less does
    /// not, at either edge.
    func testExactlyTheTravelPages() {
        XCTAssertEqual(page(44), .pageUp)
        XCTAssertNil(page(43.999))
        XCTAssertEqual(page(-44), .pageDown)
        XCTAssertNil(page(-43.999))
        XCTAssertNil(page(0), "a tap that moved nothing")
    }

    /// Clause (D6, D8): nothing unless the picture offers a page.
    func testNothingUnlessOffered() {
        XCTAssertNil(page(144, offered: false))
        XCTAssertNil(page(-144, offered: false))
    }

    /// Clause (D8): exactly one finger: none counted, two and three send nothing.
    func testOneFingerOnly() {
        for touches in [0, 2, 3, 5] {
            XCTAssertNil(page(144, touches: touches), "\(touches) fingers")
            XCTAssertNil(page(-144, touches: touches), "\(touches) fingers")
        }
    }

    /// Clause (D7, D8): a pull the pinch ran during sends nothing.
    func testNothingWhenThePinchRan() {
        XCTAssertNil(page(144, pinched: true))
        XCTAssertNil(page(-144, pinched: true))
    }

    /// Clause (D8): a selection held sends nothing.
    func testNothingWithASelection() {
        XCTAssertNil(page(144, selected: true))
        XCTAssertNil(page(-144, selected: true))
    }

    /// Clause (D21): the room the offset had above where the pull began is
    /// absorbed before the top is passed, and the room below before the
    /// bottom; a start past either end (a bounce still settling) leaves no
    /// room, never a negative one.
    func testTheRoomIsAbsorbedFirst() {
        XCTAssertNil(page(143.9, start: 100, max: 300), "100 pt of room, 43.9 past the top")
        XCTAssertEqual(page(144, start: 100, max: 300), .pageUp)
        XCTAssertNil(page(-243.9, start: 100, max: 300), "200 pt of room below")
        XCTAssertEqual(page(-244, start: 100, max: 300), .pageDown)
        XCTAssertEqual(page(44, start: -4), .pageUp, "a start above the top is no room")
        XCTAssertEqual(page(-44, start: 214.67, max: 212), .pageDown, "a start past the bottom is no room")
        XCTAssertNil(page(40, start: -10), "a start above the top lends no travel")
        XCTAssertNil(page(-40, start: 222, max: 212), "a start past the bottom lends no travel")
        XCTAssertNil(page(44, start: 30, min: 0, max: 30), "30 pt of room above")
        XCTAssertEqual(page(44, start: 30, min: 30, max: 60), .pageUp, "the room is measured from the offset's minimum")
    }

    /// Clause (D7): a pull is one direction: down is Page Up only and up is
    /// Page Down only, whatever the room on the other side.
    func testDownIsPageUpAndUpIsPageDown() {
        for t in stride(from: CGFloat(44), through: 600, by: 37) {
            XCTAssertEqual(page(t, start: 0, max: 900), .pageUp)
            XCTAssertNotEqual(page(-t, start: 900, max: 900), .pageUp)
        }
    }

    /// Clause (a guard beside D21): a pull that went more sideways than up
    /// or down has no vertical travel, so a sideways pan along a zoomed
    /// program's rows never pages; a pull mostly down or up keeps its own.
    func testOnlyAMostlyVerticalPullTravels() {
        XCTAssertEqual(ScreenPull.vertical(CGPoint(x: 10, y: 144)), 144)
        XCTAssertEqual(ScreenPull.vertical(CGPoint(x: -30, y: -100)), -100)
        XCTAssertEqual(ScreenPull.vertical(CGPoint(x: 0, y: 44)), 44)
        XCTAssertEqual(ScreenPull.vertical(CGPoint(x: 200, y: 60)), 0, "a sideways pan")
        XCTAssertEqual(ScreenPull.vertical(CGPoint(x: -200, y: -60)), 0)
        XCTAssertEqual(ScreenPull.vertical(CGPoint(x: 80, y: 80)), 0, "a diagonal is not a pull")
        XCTAssertNil(page(ScreenPull.vertical(CGPoint(x: 200, y: 60))))
    }

    // MARK: The scroll view's own pan, driven

    /// The 16 Pro's Terminal on 26.3 as M3 measured it: 402 by 343 pt.
    private static let width: CGFloat = 402
    private static let height: CGFloat = 343

    /// A scroll view over `picture`, in a window of the host app's scene, its
    /// pages collected.
    private func mounted(_ picture: ScreenPicture) -> ScreenScrollView {
        window?.isHidden = true
        window?.rootViewController = nil
        let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
        let window = scene.map { UIWindow(windowScene: $0) } ?? UIWindow(frame: CGRect(x: 0, y: 0, width: Self.width, height: 874))
        window.frame = CGRect(x: 0, y: 0, width: Self.width, height: 874)
        let host = UIViewController()
        window.rootViewController = host
        window.makeKeyAndVisible()
        self.window = window
        let history = ScrollbackModel(door: ScriptedScreenDoor(), holds: { _ in true })
        let view = ScreenScrollView(scrollback: history)
        view.frame = CGRect(x: 0, y: 200, width: Self.width, height: Self.height)
        view.actions = ScreenScrollerActions(
            tap: { _ in }, select: { _ in }, copy: {}, overlap: { _ in },
            page: { [weak self] key in self?.pages.append(key) }
        )
        host.view.addSubview(view)
        history.picture(picture)
        view.picture = picture
        view.layoutIfNeeded()
        return view
    }

    /// Hand a recogniser to one of the view's own gesture actions by its
    /// Objective-C name, exactly as UIKit hands it.
    private func drive(_ view: ScreenScrollView, _ action: String, _ recogniser: UIGestureRecognizer) {
        XCTAssertTrue(view.responds(to: NSSelectorFromString(action)), "ScreenScrollView has no \(action)")
        _ = view.perform(NSSelectorFromString(action), with: recogniser)
    }

    /// One pull, as the scroll view's own pan reports it: began, changed
    /// half way, then `end` with the whole translation.
    private func pull(
        _ view: ScreenScrollView, _ translation: CGPoint, touches: Int = 1, touchesAfter: Int? = nil,
        end: UIGestureRecognizer.State = .ended, began: Bool = true, between: (() -> Void)? = nil
    ) {
        let pan = StandInPan()
        if began {
            pan.standTouches = touches
            pan.standState = .began
            drive(view, "pulled:", pan)
            pan.standTouches = touchesAfter ?? touches
            pan.standState = .changed
            pan.standTranslation = CGPoint(x: CGFloat(translation.x) / 2, y: CGFloat(translation.y) / 2)
            drive(view, "pulled:", pan)
        }
        between?()
        pan.standTouches = 0
        pan.standTranslation = translation
        pan.standState = end
        drive(view, "pulled:", pan)
    }

    /// Clause (D7, be1): the scroll view's own pan, through its target, pages
    /// on lift: a pull down past the top is ONE Page Up and a pull up past the
    /// bottom ONE Page Down, and the pull writes no offset.
    func testThePanPagesOnLift() {
        let view = mounted(PageSample.picture())
        XCTAssertEqual(view.maxOffsetY, 0, accuracy: 0.5, "30 rows fit the 16 Pro's view upright")
        let before = view.contentOffset
        pull(view, CGPoint(x: 0, y: 144))
        XCTAssertEqual(pages, [.pageUp])
        XCTAssertEqual(view.contentOffset, before, "the pull wrote the offset")
        pull(view, CGPoint(x: 0, y: -144))
        XCTAssertEqual(pages, [.pageUp, .pageDown])
        pull(view, CGPoint(x: 0, y: 30))
        XCTAssertEqual(pages, [.pageUp, .pageDown], "30 pt past the top is no page")
        XCTAssertEqual(view.contentOffset, before)
    }

    /// Clause (D7, be3): a page is asked on `.ended` alone: a pull still
    /// moving, one cancelled or failed, and an end with no beginning send
    /// nothing.
    func testOnlyTheEndedArmPages() {
        let fresh = mounted(PageSample.picture())
        pull(fresh, CGPoint(x: 0, y: 144), began: false)
        XCTAssertEqual(pages, [], "an end with no beginning counted no finger")
        pull(fresh, CGPoint(x: 0, y: 144), end: .changed)
        pull(fresh, CGPoint(x: 0, y: 144), end: .cancelled)
        pull(fresh, CGPoint(x: 0, y: -144), end: .failed)
        XCTAssertEqual(pages, [])
        pull(fresh, CGPoint(x: 0, y: 144))
        XCTAssertEqual(pages, [.pageUp], "the control")
    }

    /// Clause (D8, be4): two fingers at any point of the pull send nothing,
    /// and the next one-finger pull pages.
    func testTwoFingersSendNothing() {
        let view = mounted(PageSample.picture())
        pull(view, CGPoint(x: 0, y: 144), touches: 2)
        pull(view, CGPoint(x: 0, y: 144), touches: 1, touchesAfter: 2)
        XCTAssertEqual(pages, [])
        pull(view, CGPoint(x: 0, y: 144))
        XCTAssertEqual(pages, [.pageUp])
    }

    /// Clause (D8, be4): a pull the pinch ran during sends nothing, whether
    /// the pinch began before the pull or during it; once it ended, the next
    /// pull pages.
    func testAPinchRunSendsNothing() {
        let view = mounted(PageSample.picture())
        let pinch = StandInPinch()
        pinch.standState = .began
        drive(view, "pinched:", pinch)
        pull(view, CGPoint(x: 0, y: 144))
        XCTAssertEqual(pages, [], "a pull begun while the pinch ran")
        pinch.standState = .cancelled
        drive(view, "pinched:", pinch)
        pull(view, CGPoint(x: 0, y: 144), between: { [weak self] in
            pinch.standState = .began
            self?.drive(view, "pinched:", pinch)
            pinch.standState = .cancelled
            self?.drive(view, "pinched:", pinch)
        })
        XCTAssertEqual(pages, [], "a pinch that ran during the pull")
        pull(view, CGPoint(x: 0, y: 144))
        XCTAssertEqual(pages, [.pageUp], "the pinch over, the pull pages")
    }

    /// Clause (D8, be4): a selection held when the pull began or when it
    /// ended sends nothing.
    func testASelectionSendsNothing() {
        let view = mounted(PageSample.picture())
        let range = ScreenSelectionRange(start: ScreenPoint(row: 0, column: 0), end: ScreenPoint(row: 0, column: 3))
        view.selection = range
        pull(view, CGPoint(x: 0, y: 144))
        XCTAssertEqual(pages, [], "a selection held at the beginning")
        view.selection = nil
        pull(view, CGPoint(x: 0, y: 144), between: { view.selection = range })
        XCTAssertEqual(pages, [], "a selection made during the pull")
        view.selection = nil
        pull(view, CGPoint(x: 0, y: 144))
        XCTAssertEqual(pages, [.pageUp])
    }

    /// Clause (D6, D8, be4): the offer is the picture's: `pages`, typable and
    /// not asking, all three, or nothing is sent.
    func testThePictureMustOfferAPage() {
        for picture in [
            PageSample.picture(pages: false), PageSample.picture(pages: nil),
            PageSample.picture(typable: false), PageSample.picture(asking: true, dialog: "a1b2c3d4e5f6"),
        ] {
            let view = mounted(picture)
            pull(view, CGPoint(x: 0, y: 144))
            pull(view, CGPoint(x: 0, y: -144))
            XCTAssertEqual(pages, [], "pages \(picture.pages), typable \(picture.typable), asking \(picture.asking)")
        }
        let inline = mounted(ScreenSample.picture())
        pull(inline, CGPoint(x: 0, y: 144))
        XCTAssertEqual(pages, [], "an inline picture's pull pages its history, never the program")
    }

    /// Clause (D21): the room is the scroll view's own: rows taller than the
    /// view pan before a pull counts, measured from where the pull began to
    /// the offset's two ends.
    func testTheRoomIsTheScrollViewsOwn() throws {
        let view = mounted(PageSample.picture(rows: 60))
        let max = view.maxOffsetY
        XCTAssertGreaterThan(max, 100, "60 rows are taller than the view")
        view.contentOffset = CGPoint(x: 0, y: max)
        pull(view, CGPoint(x: 0, y: -50))
        XCTAssertEqual(pages, [.pageDown], "at the bottom, 50 pt up is past it")
        pull(view, CGPoint(x: 0, y: 144))
        XCTAssertEqual(pages, [.pageDown], "from the bottom the rows pan first")
        view.contentOffset = CGPoint(x: 0, y: 0)
        pull(view, CGPoint(x: 0, y: 50))
        XCTAssertEqual(pages, [.pageDown, .pageUp], "at the top, 50 pt down is past it")
        pull(view, CGPoint(x: 0, y: -60))
        XCTAssertEqual(pages, [.pageDown, .pageUp], "from the top the rows pan first")
    }

    /// Clause (a guard beside D21): a pan more sideways than down sends
    /// nothing; mostly down, it pages.
    func testASidewaysPanSendsNothing() {
        let view = mounted(PageSample.picture())
        pull(view, CGPoint(x: 200, y: 60))
        pull(view, CGPoint(x: -150, y: -90))
        XCTAssertEqual(pages, [])
        pull(view, CGPoint(x: 40, y: 144))
        XCTAssertEqual(pages, [.pageUp])
    }

    /// Clause (D10, be7): the pull adds no word, no identifier and no owner
    /// check; its file names no Copy word it did not before.
    func testThePullAddsNoWord() throws {
        let source = try StyleSource.text("ios/Tortie/Screens/ScreenScroller.swift")
        let start = try XCTUnwrap(source.range(of: "enum ScreenPull {"))
        let end = try XCTUnwrap(source.range(of: "// MARK: - The scroll view", range: start.upperBound..<source.endIndex))
        let rule = String(source[start.lowerBound..<end.lowerBound])
        for name in ["Copy.", "ID.", "OwnerCheck", "LAContext", "accessibilityIdentifier"] {
            XCTAssertFalse(rule.contains(name), "ScreenPull names \(name)")
        }
        let pulled = try XCTUnwrap(source.range(of: "@objc private func pulled("))
        let close = try XCTUnwrap(source.range(of: "\n    }\n", range: pulled.upperBound..<source.endIndex))
        let body = String(source[pulled.lowerBound..<close.upperBound])
        XCTAssertTrue(body.contains("ScreenPull.page("), "pulled(_:) asks no rule")
        for name in ["Copy.", "ID.", "contentOffset =", "setContentOffset", "OwnerCheck", "accessibility"] {
            XCTAssertFalse(body.contains(name), "pulled(_:) names \(name)")
        }
    }
}

/// A line of M3's table that does not read.
private struct UnreadReading: Error, CustomStringConvertible {
    let line: String
    var description: String { "an M3 reading that does not read: \(line)" }
}

/// The scroll view's pan as UIKit hands it to a target: its state, its
/// translation and its fingers, set by the test.
final class StandInPan: UIPanGestureRecognizer {
    var standState: UIGestureRecognizer.State = .possible
    var standTranslation = CGPoint.zero
    var standTouches = 0

    override var state: UIGestureRecognizer.State {
        get { standState }
        set { standState = newValue }
    }

    override var numberOfTouches: Int { standTouches }

    override func translation(in view: UIView?) -> CGPoint { standTranslation }
}

/// The pinch as UIKit hands it to its target: its state, a scale of 1 and a
/// point, set by the test.
final class StandInPinch: UIPinchGestureRecognizer {
    var standState: UIGestureRecognizer.State = .possible

    override var state: UIGestureRecognizer.State {
        get { standState }
        set { standState = newValue }
    }

    override var scale: CGFloat {
        get { 1 }
        set {}
    }

    override func location(in view: UIView?) -> CGPoint { CGPoint(x: 10, y: 10) }
}

/// Full-screen pictures, built field by field as `ScreenSample` builds a
/// screen, carrying the page offer the Mac's composer sets on one (`pages`
/// true only on the alternate screen that takes keys, build/p350/SPEC.md
/// D6). `pages: nil` leaves the key out, as a Mac older than 350 does.
enum PageSample {
    static func picture(
        rows: Int = 30, cols: Int = 80, pages: Bool? = true, typable: Bool = true, asking: Bool = false,
        dialog: String? = nil, revision: String = ScreenSample.revision, turn: String = ScreenSample.turn
    ) -> ScreenPicture {
        let lines: [[[String: Any]]] = (0..<rows).map { r in
            let text = "pi line " + String(format: "%04d", r + 1)
            return [["text": text, "style": 0, "cells": text.count]]
        }
        var screen = ScreenSample.screen(
            cols: cols, rows: rows, lines: lines, turn: turn, asking: asking, dialog: dialog, typable: typable, alternate: true
        )
        if let pages { screen["pages"] = pages }
        guard let read = try? ScreenSample.decode(ScreenSample.answer(screen: screen, revision: revision)), let drawn = read.screen else {
            fatalError("the page sample does not decode")
        }
        return ScreenPicture(drawn, revision: revision)
    }
}
