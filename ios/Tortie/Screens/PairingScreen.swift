// Pairing: read the Mac's code, match the fingerprint, and wait for Allow
// (Phase 316.2).
//
// docs/design/phone/Pairing.html, frame for frame, less one thing:
//
//   - "Enter a code instead" (build/p316/SPEC.md section 7: the payload is
//     several hundred characters and no short-code design exists). Its slot at
//     the foot draws this screen's one line instead, and `Pair again` in its
//     button's shape once a pairing stopped.
//
// "Tortie brings its own private network. There is nothing else to install."
// is drawn at the foot above that line since Phase 316.3, which carries the
// tailnet node inside the app (Tailnet/Node.swift); in 316.2 it was not true.
//
// THE ORDER is Door/Pairing.swift's and the Mac's: read the code, draw the
// fingerprint of this phone's new keys, present until the Mac answers, and be
// paired ONLY when the first SIGNED read comes back whole. The door answers
// `allowed` to any presenter from the allowed phone's address (316.1's nit
// P2b), so `allowed` alone is not success; this screen hands the app a reader
// only on `PairResult.paired`, which only that read produces.
//
// THE CODE ARRIVES ONE OF TWO WAYS. The camera (AVFoundation), in every build.
// And, in a DEBUG build only, a launch argument, because the Simulator has no
// camera (`PairingDebugSeam`, Door/Pairing.swift; the app reads it once, in
// App/TortieApp.swift, inside `#if DEBUG`). A code that already stopped is not
// tried again until `Pair again` or a different code: the camera sees the same
// code many times a second.

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
    /// The one line at the foot: not paired, or why the last try stopped.
    private(set) var line: String? = Copy.notPaired
    /// True once a try stopped, so `Pair again` is offered.
    private(set) var stopped = false
    /// A line about the camera, drawn in the camera's box.
    private(set) var cameraLine: String?
    private(set) var busy = false

    private let door: any PhoneDoor
    private let label: String
    private let paired: @MainActor (any DoorReading, PocketBlockedAnswer) -> Void
    /// The code that last stopped. The camera reports a code many times a
    /// second, so the same code is not presented again until he asks.
    private var spent: String?

    init(
        door: any PhoneDoor,
        label: String,
        paired: @escaping @MainActor (any DoorReading, PocketBlockedAnswer) -> Void
    ) {
        self.door = door
        self.label = label
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
        line = nil
        stopped = false
        let result = await door.pair(pending) { [weak self] step in
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
    }

    private func stop(_ failure: PairingFailure, payload: String) {
        step = nil
        fingerprint = nil
        guard let sentence = DoorWords.pairingSentence(for: failure) else {
            // He left the screen. Nothing to say, and nothing is spent.
            return
        }
        spent = payload
        stopped = true
        line = sentence
    }
}

/// `dump` and `Mirror` would show `spent`, the last code read, which carries
/// the tailnet key: the model mirrors itself with nothing in it
/// (conformance:ios rule p).
extension PairingModel: CustomReflectable {
    nonisolated var customMirror: Mirror { Mirror(self, children: [:], displayStyle: .class) }
}

// MARK: - The screen

struct PairingScreen: View {
    let model: PairingModel

    var body: some View {
        GeometryReader { outer in
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    heading
                    scanner
                    Words(Copy.pairStepScan, .secondary, Tokens.textSecondary, lines: nil)
                        .accessibilityIdentifier(ID.pairingPoint)
                        .padding(Frame.gutter)
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

    /// `padding: 24px 16px 0`: the title, then the step on the Mac 8 below.
    private var heading: some View {
        VStack(alignment: .leading, spacing: 8) {
            Words(Copy.pairTitle, .title, Tokens.textPrimary)
                .lineBox(.title)
                .accessibilityAddTraits(.isHeader)
                .accessibilityIdentifier(ID.pairingTitle)
            Words(Copy.pairStepOnMac, .body, Tokens.textSecondary, lines: nil)
                .accessibilityIdentifier(ID.pairingStep)
        }
        .padding(.top, 24)
        .padding(.horizontal, Frame.gutter)
    }

    /// The camera's square, `margin: 24px 16px 0; border-radius: 10px`, with
    /// the accent reticle 40 in from each side.
    private var scanner: some View {
        ZStack {
            RoundedRectangle(cornerRadius: Frame.cardRadius, style: .continuous)
                .fill(Tokens.bgSurface)
            QRScanner(active: !model.busy) { code in
                Task { await model.read(code) }
            } onCamera: { state in
                model.camera(state)
            }
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

    /// `padding: 0 16px 32px; gap: 12px`: the private network line, the one
    /// line, then `Pair again` in the shape of the mock's button once a try
    /// stopped.
    private var foot: some View {
        VStack(alignment: .leading, spacing: Frame.cardGap) {
            Words(Copy.pairPrivateNetwork, .small, Tokens.textMuted, lines: nil)
                .accessibilityIdentifier(ID.pairingNetwork)
            if model.busy, model.fingerprint != nil {
                ProgressView()
                    .tint(Tokens.textMuted)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            if let line = model.line {
                Words(line, .small, Tokens.textMuted, lines: nil)
                    .accessibilityIdentifier(ID.pairingLine)
            }
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
        }
        .padding(.horizontal, Frame.gutter)
        .padding(.bottom, 32)
    }
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
