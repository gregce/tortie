// Pairing: read the Mac's code, match the fingerprint, and wait for Allow
// (Phase 316.2; the phone off the tailnet since Phase 330; three steps and
// Scan code since Phase 333.1, build/p3331/SPEC.md D20 to D22).
//
// AT REST it is docs/design/phone/Pairing.html: the title, THREE NUMBERED
// STEPS (Get Tortie for Mac, Open Settings then Phone, Scan the code), each
// number its place in the list and never a word (`SetupStep`), then one
// button, Scan code. Step 1 is a button, the whole row, that opens Tortie's
// own site (Markdown/Links.swift, `SiteOpener`). AFTER SCAN CODE it is
// docs/design/phone/PairingScan.html: the camera's square where the steps
// were, the line under it, and the fingerprint card once a code is read.
//
// THE CAMERA IS BUILT ONLY AFTER SCAN CODE (`PairingModel.scanning`), so iOS
// asks for it after the press, in context, and never as the app opens. No
// code is typed instead ("Enter a code instead" is not drawn: the payload is
// several hundred characters and no short-code design exists).
//
// THE FOOT: "Nothing else to install on this phone." (since Phase 330 the
// phone reaches the Mac's public name as an ordinary TLS client, with no
// Tailscale, VPN or profile of its own), this screen's one line, `Pair again`
// once a pairing stopped, and Privacy · Support, two pages of Tortie's site.
//
// THE ORDER is Door/Pairing.swift's and the Mac's: read the code, draw the
// fingerprint of this phone's three new keys, present until the Mac answers,
// and be paired ONLY when the first SIGNED read comes back whole over the
// phone's new identity. This screen hands the app a reader only on
// `PairResult.paired`, which only that read produces.
//
// THE ALERT QUESTION (Phase 316.5) is asked only when the Mac this phone is
// presenting to says it can send an alert (research 136 section 9: alerts are
// the Apple push key holder's alone), so it comes after the fingerprint is
// drawn, while the Mac is asking him, and never on a phone pairing with a Mac
// that cannot. The presentation is the one way the Mac learns this phone's
// alert address. iOS shows its question only when it has none. A denial, an
// address that cannot be had or one outside the Mac's bounds presents with no
// address, and PAIRS: alerts are the phone's to refuse, and reading is not.
//
// THE PHONE ALWAYS DRAWS A SENTENCE (his no-key finding, build/p330/SPEC.md
// section 4.12.6). Pressing Pair on the Mac with its old key field empty showed
// nothing at all here, because the foot's line was nil while a pairing was
// under way. Now every step has its line, every way a pairing stops has its
// line, and `line` is never empty (conformance:ios rule v).
//
// THE CODE ARRIVES ONE OF TWO WAYS. The camera (AVFoundation), in every build,
// once Scan code was pressed. And, in a DEBUG build only, a launch argument,
// because the Simulator has no camera (`PairingDebugSeam`, Door/Pairing.swift;
// the app reads it once, in App/TortieApp.swift, inside `#if DEBUG`), which
// needs no press: the steps stay and the fingerprint card is drawn under them.
// A code that already stopped is not tried again until `Pair again` or a
// different code: the camera sees the same code many times a second.

@preconcurrency import AVFoundation
import SwiftUI
import UIKit

// MARK: - The model

@MainActor
@Observable
final class PairingModel {
    /// The fingerprint both screens show, once a code was read.
    private(set) var fingerprint: String?
    /// Where the pairing has got to, while one is under way.
    private(set) var step: PairingStep?
    /// The one line at the foot: not paired, where a pairing has got to, or
    /// why the last try stopped. Never empty.
    private(set) var line: String = Copy.notPaired
    /// True once a try stopped, so `Pair again` is offered.
    private(set) var stopped = false
    /// A line about the camera, drawn in the camera's box.
    private(set) var cameraLine: String?
    private(set) var busy = false
    /// True once Scan code was pressed: only then is the camera built, so iOS
    /// asks for it after the press, in context (Phase 333.1, D20). Nothing
    /// sets it back: a pairing that stopped keeps the camera.
    private(set) var scanning = false

    private let door: any PhoneDoor
    private let label: String
    /// Asked for this phone's alert address, at most once per pairing and
    /// only when the Mac says it can send.
    private let alerts: any PushAddressing
    private let paired: @MainActor (any DoorReading, PocketBlockedAnswer) -> Void
    /// The code that last stopped. The camera reports a code many times a
    /// second, so the same code is not presented again until he asks.
    private var spent: String?

    init(
        door: any PhoneDoor,
        label: String,
        alerts: any PushAddressing,
        paired: @escaping @MainActor (any DoorReading, PocketBlockedAnswer) -> Void
    ) {
        self.door = door
        self.label = label
        self.alerts = alerts
        self.paired = paired
    }

    /// A code, from the camera or the DEBUG launch argument.
    func read(_ payload: String) async {
        guard !busy, payload != spent else { return }
        busy = true
        defer { busy = false }
        let pending: PendingPairing
        do {
            pending = try door.begin(payload: payload, label: label)
        } catch {
            stop(error as? PairingFailure ?? .badCode, payload: payload)
            return
        }
        fingerprint = pending.fingerprint
        step = .presenting
        line = DoorWords.stepSentence(for: .presenting)
        stopped = false
        // The fingerprint is drawn. The Mac is presented to, and iOS is asked
        // for alerts only if the Mac says it can send them.
        let alerts = alerts
        let result = await door.pair(pending, askForAlerts: { await alerts.askForPairing() }) { [weak self] step in
            Task { @MainActor in self?.advance(step) }
        }
        switch result {
        case .paired(let reader, let first):
            step = nil
            paired(reader, first)
        case .failed(let failure):
            stop(failure, payload: payload)
        }
    }

    /// Scan code: the camera is built from here on. The one place `scanning`
    /// becomes true (conformance:ios av5).
    func startScanning() {
        scanning = true
    }

    /// The press after a try stopped: the next code is tried, even this one.
    func pairAgain() {
        spent = nil
        stopped = false
        fingerprint = nil
        step = nil
        line = Copy.notPaired
    }

    func camera(_ state: CameraState) {
        cameraLine = state == .denied ? Copy.cameraOff : nil
    }

    private func advance(_ next: PairingStep) {
        guard busy else { return }
        step = next
        line = DoorWords.stepSentence(for: next)
    }

    private func stop(_ failure: PairingFailure, payload: String) {
        step = nil
        fingerprint = nil
        line = DoorWords.pairingSentence(for: failure)
        // He left the screen: the not-paired line, and nothing is spent.
        guard failure != .cancelled else { return }
        spent = payload
        stopped = true
    }
}

/// `dump` and `Mirror` would show `spent`, the last code read, which carries
/// the one-shot secret: the model mirrors itself with nothing in it
/// (conformance:ios rule p).
extension PairingModel: CustomReflectable {
    nonisolated var customMirror: Mirror { Mirror(self, children: [:], displayStyle: .class) }
}

// MARK: - The steps (Phase 333.1, build/p3331/SPEC.md D20, D28)

/// The resting face's three steps, in the order they are drawn.
enum SetupStep: CaseIterable, Hashable {
    /// Get Tortie for Mac, which opens tortie.sh.
    case getMac
    /// Open Settings then Phone.
    case openPhone
    /// Scan the code.
    case scan

    /// Every step beside its place in the list, `1` to `3`: drawn from its
    /// position, never written as a word (rule b) and never computed (rule k).
    static var placed: [SetupPlace] {
        zip(1..., allCases).map { SetupPlace(place: String($0), step: $1) }
    }
}

/// A step and the place it is drawn at.
struct SetupPlace: Hashable {
    let place: String
    let step: SetupStep
}

// MARK: - The screen

struct PairingScreen: View {
    let model: PairingModel
    /// Tortie's own site. The app hands `SiteOpener`; a test hands its own.
    let site: any SiteOpening

    init(model: PairingModel, site: any SiteOpening = SiteOpener()) {
        self.model = model
        self.site = site
    }

    var body: some View {
        GeometryReader { outer in
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    heading
                    if model.scanning {
                        // The camera is built here and nowhere else, so iOS
                        // asks for it only after Scan code (conformance:ios av5).
                        scanner(QRScanner(active: !model.busy) { code in
                            Task { await model.read(code) }
                        } onCamera: { state in
                            model.camera(state)
                        })
                        Words(Copy.pairStepScan, .secondary, Tokens.textSecondary, lines: nil)
                            .accessibilityIdentifier(ID.pairingPoint)
                            .padding(Frame.gutter)
                    } else {
                        steps
                        scanButton
                    }
                    if let fingerprint = model.fingerprint {
                        match(fingerprint)
                    }
                    Spacer(minLength: Frame.gutter)
                    foot
                }
                .frame(maxWidth: .infinity, minHeight: outer.size.height, alignment: .topLeading)
            }
            .scrollIndicators(.hidden)
        }
        .background(Tokens.bgSidebar.ignoresSafeArea())
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.pairingScreen)
    }

    // MARK: Tortie's own site, one named press each (D21)

    /// Get Tortie for Mac: the Mac app's page.
    func openMacSite() {
        site.open(.home)
    }

    /// Privacy, at the foot.
    func openPrivacy() {
        site.open(.privacy)
    }

    /// Support, at the foot.
    func openSupport() {
        site.open(.support)
    }

    /// `padding: 24px 16px 0`: the title.
    private var heading: some View {
        Words(Copy.pairTitle, .title, Tokens.textPrimary)
            .lineBox(.title)
            .accessibilityAddTraits(.isHeader)
            .accessibilityIdentifier(ID.pairingTitle)
            .padding(.top, 24)
            .padding(.horizontal, Frame.gutter)
    }

    /// The three steps, 16 under the title, each at least 44 tall. The first
    /// is a button, the whole row, that opens Tortie for Mac's page.
    private var steps: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(SetupStep.placed, id: \.step) { placed in
                switch placed.step {
                case .getMac:
                    Button(action: openMacSite) {
                        stepRow(placed.place, Copy.setupGetMac, detail: Copy.joined([Copy.freeAtSite, Copy.appleSilicon, Copy.macVersion]))
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier(ID.pairingGetMac)
                case .openPhone:
                    stepRow(placed.place, Copy.setupOpenPhone, detail: nil)
                        .accessibilityElement(children: .combine)
                        .accessibilityIdentifier(ID.pairingStepOpen)
                case .scan:
                    stepRow(placed.place, Copy.setupScan, detail: nil)
                        .accessibilityElement(children: .combine)
                        .accessibilityIdentifier(ID.pairingStepScan)
                }
            }
        }
        .padding(.top, 16)
        .padding(.horizontal, Frame.gutter)
    }

    /// One step: its place, then its words 12 to the right, and the Mac app's
    /// facts under the first step's words.
    private func stepRow(_ place: String, _ words: String, detail: String?) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            Words(place, PairingFrame.place, Tokens.accent)
                .lineBox(PairingFrame.place)
            VStack(alignment: .leading, spacing: Frame.rowLineGap) {
                Words(words, .body, Tokens.textPrimary, lines: nil)
                if let detail {
                    Words(detail, .small, Tokens.textSecondary, lines: nil)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.vertical, Frame.rowVertical)
        .frame(minHeight: PairingFrame.pressHeight, alignment: .leading)
        .contentShape(Rectangle())
    }

    /// Scan code, the one button: the accent on the raised fill, in Pair
    /// again's shape. It opens the camera, and only then does iOS ask for it.
    private var scanButton: some View {
        Button {
            model.startScanning()
        } label: {
            Words(Copy.scanCode, .body, Tokens.accent)
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(
                    RoundedRectangle(cornerRadius: Frame.cardRadius, style: .continuous)
                        .fill(Tokens.bgRaised)
                )
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier(ID.pairingScanCode)
        .padding(.top, 24)
        .padding(.horizontal, Frame.gutter)
    }

    /// The camera's square, `margin: 24px 16px 0; border-radius: 10px`, with
    /// the accent reticle 40 in from each side. The camera itself is built by
    /// the caller, inside the Scan code branch.
    private func scanner(_ camera: QRScanner) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: Frame.cardRadius, style: .continuous)
                .fill(Tokens.bgSurface)
            camera
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .strokeBorder(Tokens.accent, lineWidth: 2)
                .padding(38)
                .accessibilityHidden(true)
            if let cameraLine = model.cameraLine {
                Words(cameraLine, .secondary, Tokens.textSecondary, lines: nil)
                    .multilineTextAlignment(.center)
                    .padding(48)
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: Frame.cardRadius, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Frame.cardRadius, style: .continuous)
                .strokeBorder(Tokens.border, lineWidth: Frame.hairline)
        )
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.pairingScanner)
        .padding(.top, 24)
        .padding(.horizontal, Frame.gutter)
    }

    /// The fingerprint card, `margin: 8px 16px 0`: the raised label, the six
    /// groups in monospace, and the promise that the Mac asks last.
    private func match(_ fingerprint: String) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            RaisedLabel(Copy.pairMatchLabel)
                .accessibilityIdentifier(ID.pairingMatch)
            Text(verbatim: fingerprint)
                .font(.system(size: Face.fingerprint.size, design: .monospaced))
                .monospacedDigit()
                .foregroundStyle(Tokens.textPrimary)
                .lineSpacing(Face.fingerprint.spacing)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityIdentifier(ID.pairingFingerprint)
                .padding(.top, 6)
            Words(Copy.pairMatchNote, .small, Tokens.textMuted, lines: nil)
                .accessibilityIdentifier(ID.pairingAllowOnMac)
                .padding(.top, 8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Frame.cardPadding)
        .card()
        .padding(.top, 8)
        .padding(.horizontal, Frame.gutter)
    }

    /// `padding: 0 16px 32px; gap: 12px`: the nothing-to-install line, the
    /// one line, then `Pair again` in the shape of the mock's button once a
    /// try stopped, then Privacy · Support.
    private var foot: some View {
        VStack(alignment: .leading, spacing: Frame.cardGap) {
            Words(Copy.pairNothingElse, .small, Tokens.textMuted, lines: nil)
                .accessibilityIdentifier(ID.pairingNothingElse)
            if model.busy, model.fingerprint != nil {
                ProgressView()
                    .tint(Tokens.textMuted)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            Words(model.line, .small, Tokens.textMuted, lines: nil)
                .accessibilityIdentifier(ID.pairingLine)
            if model.stopped {
                Button { model.pairAgain() } label: {
                    Words(Copy.pairAgain, .body, Tokens.textMuted)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(
                            RoundedRectangle(cornerRadius: Frame.cardRadius, style: .continuous)
                                .fill(Tokens.bgRaised)
                        )
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier(ID.pairingAgain)
            }
            sitePages
        }
        .padding(.horizontal, Frame.gutter)
        .padding(.bottom, 32)
    }

    /// Privacy · Support: two buttons, each at least 44 tall, and the Mac's
    /// separator between them, which is not pressable.
    private var sitePages: some View {
        HStack(spacing: 0) {
            Button(action: openPrivacy) {
                Words(Copy.privacy, .small, Tokens.textSecondary)
                    .frame(minHeight: PairingFrame.pressHeight)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier(ID.pairingPrivacy)
            Words(Copy.separator, .small, Tokens.textMuted)
                .accessibilityHidden(true)
            Button(action: openSupport) {
                Words(Copy.support, .small, Tokens.textSecondary)
                    .frame(minHeight: PairingFrame.pressHeight)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier(ID.pairingSupport)
        }
    }
}

/// The lengths the pairing screen spells that the other screens do not.
private enum PairingFrame {
    /// A row or link a person presses (Apple's 44 pt hit target).
    static let pressHeight: CGFloat = 44
    /// A step's place, `1`: the body's size and line, semibold and tabular.
    static let place = Face(17, .semibold, line: 22, tabular: true)
}

// MARK: - The camera

/// Why the camera shows nothing.
enum CameraState: Equatable {
    /// This device has no camera, which is the Simulator. Nothing to say.
    case none
    /// He turned the camera off for Tortie. One line says where to turn it on.
    case denied
}

/// The QR reader: AVFoundation's own metadata output, reporting `.qr` codes
/// as text. It reads codes and nothing else, keeps no frame and records
/// nothing. A device with no camera is never asked for permission, so the
/// Simulator shows no system prompt.
struct QRScanner: UIViewRepresentable {
    let active: Bool
    let onCode: @MainActor (String) -> Void
    let onCamera: @MainActor (CameraState) -> Void

    func makeUIView(context: Context) -> ScannerView {
        let view = ScannerView()
        view.onCode = onCode
        view.onCamera = onCamera
        return view
    }

    func updateUIView(_ view: ScannerView, context: Context) {
        view.onCode = onCode
        view.onCamera = onCamera
        if active { view.start() } else { view.stop() }
    }

    static func dismantleUIView(_ view: ScannerView, coordinator: ()) {
        view.stop()
    }
}

final class ScannerView: UIView, AVCaptureMetadataOutputObjectsDelegate {
    override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }

    var onCode: (@MainActor (String) -> Void)?
    var onCamera: (@MainActor (CameraState) -> Void)?

    private let session = AVCaptureSession()
    /// `startRunning` blocks, so it never runs on the main thread.
    private let queue = DispatchQueue(label: ID.pairingScanner)
    private var configured = false
    private var wanted = false

    private var preview: AVCaptureVideoPreviewLayer? { layer as? AVCaptureVideoPreviewLayer }

    func start() {
        guard !wanted else { return }
        wanted = true
        guard AVCaptureDevice.default(for: .video) != nil else {
            onCamera?(.none)
            return
        }
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            run()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                Task { @MainActor [weak self] in
                    guard let self else { return }
                    if granted { self.run() } else { self.onCamera?(.denied) }
                }
            }
        default:
            onCamera?(.denied)
        }
    }

    func stop() {
        wanted = false
        let session = session
        queue.async { if session.isRunning { session.stopRunning() } }
    }

    private func run() {
        guard wanted else { return }
        if !configured {
            guard let device = AVCaptureDevice.default(for: .video),
                  let input = try? AVCaptureDeviceInput(device: device),
                  session.canAddInput(input) else {
                onCamera?(.none)
                return
            }
            let output = AVCaptureMetadataOutput()
            session.beginConfiguration()
            session.addInput(input)
            guard session.canAddOutput(output) else {
                session.commitConfiguration()
                onCamera?(.none)
                return
            }
            session.addOutput(output)
            output.setMetadataObjectsDelegate(self, queue: .main)
            output.metadataObjectTypes = [.qr]
            session.commitConfiguration()
            preview?.session = session
            preview?.videoGravity = .resizeAspectFill
            configured = true
        }
        onCamera?(.none)
        let session = session
        queue.async { if !session.isRunning { session.startRunning() } }
    }

    nonisolated func metadataOutput(
        _ output: AVCaptureMetadataOutput,
        didOutput metadataObjects: [AVMetadataObject],
        from connection: AVCaptureConnection
    ) {
        guard let code = metadataObjects
            .compactMap({ ($0 as? AVMetadataMachineReadableCodeObject)?.stringValue })
            .first else { return }
        // The delegate queue is the main queue (`setMetadataObjectsDelegate`).
        MainActor.assumeIsolated {
            onCode?(code)
        }
    }
}
