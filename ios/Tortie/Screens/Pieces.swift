// The small parts every screen draws with (Phase 316.2).
//
// THE MOCKS' CSS IS THE SOURCE OF EVERY NUMBER HERE. docs/design/phone/Main.html,
// Session.html, Choice.html and Pairing.html are 390 pt wide phones drawn in
// CSS pixels, and a CSS pixel is a point: a 16 px gutter is `Frame.gutter`, a
// 28 px section header is `Frame.headerHeight`, a row's `padding: 6px 16px` is
// `Frame.rowVertical` and `Frame.gutter`. `probe:p316` reads those frames back
// through XCUITest, so a number changed here moves a reading there.
//
// A LINE BOX, NOT A GLYPH BOX. CSS sets `line-height` and the text sits in the
// middle of it; SwiftUI sizes a Text to the font's own line height. So every
// single line of text is drawn in a frame of the mock's line height
// (`lineBox`), and a text that wraps gets the difference as line spacing
// (`Face.spacing`). A frame then reads what the mock's box model reads.
//
// Colours are `Tokens` and nothing else; words are `Copy` or the door's.

import SwiftUI
import UIKit

// MARK: - The numbers

/// Every length the mocks spell, once.
enum Frame {
    /// The side gutter on every screen (`padding: 0 16px`).
    static let gutter: CGFloat = 16
    /// A section header's height on the list (`.hdr { height: 28px }`).
    static let headerHeight: CGFloat = 28
    /// The gap above the second header (`margin-top: 20px`).
    static let headerGap: CGFloat = 20
    /// A row's top and bottom padding (`.row { padding: 6px 16px }`).
    static let rowVertical: CGFloat = 6
    /// The gap between a row's two lines (`.row { gap: 2px }`).
    static let rowLineGap: CGFloat = 2
    /// Between a row's dot, name, badge and age (`gap: 8px`).
    static let rowGap: CGFloat = 8
    /// A hairline (`border-bottom: 1px`).
    static let hairline: CGFloat = 1
    /// The status dot (`.dot { width: 10px; height: 10px }`).
    static let dot: CGFloat = 10
    /// A hollow dot's ring (`box-shadow: inset 0 0 0 2px`).
    static let dotRing: CGFloat = 2
    /// A card's corner and padding (`.card { border-radius: 10px; padding: 16px }`).
    static let cardRadius: CGFloat = 10
    static let cardPadding: CGFloat = 16
    /// Between two cards (`margin: 12px 16px 0`).
    static let cardGap: CGFloat = 12
    /// A choice row (`.opt { min-height: 54px; border-radius: 6px; padding: 8px 12px; gap: 12px }`).
    static let optionHeight: CGFloat = 54
    static let optionRadius: CGFloat = 6
    static let optionGap: CGFloat = 6
    /// The marker chip (`.chip { width: 24px; height: 24px; border-radius: 4px }`).
    static let chip: CGFloat = 24
    static let chipRadius: CGFloat = 4
    /// The row that opens something (`height: 54px`), as Session.html's hand-off row.
    static let linkRowHeight: CGFloat = 54
    /// A machine badge (`border-radius: 4px; padding: 0 4px`).
    static let badgeRadius: CGFloat = 4
    static let badgePadding: CGFloat = 4
}

/// One of the mocks' type styles: a size, a weight and a line height.
struct Face: Sendable {
    let size: CGFloat
    let weight: Font.Weight
    /// CSS `line-height`, in points.
    let lineHeight: CGFloat
    let tabular: Bool

    init(_ size: CGFloat, _ weight: Font.Weight = .regular, line: CGFloat, tabular: Bool = false) {
        self.size = size
        self.weight = weight
        self.lineHeight = line
        self.tabular = tabular
    }

    var font: Font {
        let font = Font.system(size: size, weight: weight)
        return tabular ? font.monospacedDigit() : font
    }

    /// The extra leading that turns the font's own line into the mock's.
    var spacing: CGFloat {
        max(0, lineHeight - UIFont.systemFont(ofSize: size, weight: weight.uiWeight).lineHeight)
    }

    // The faces the four mocks use. A CSS size with no `line-height` gets the
    // browser's `normal`, which for the system font is about 1.2.
    static let title = Face(28, .semibold, line: 34)       // the list and pairing titles
    static let name = Face(17, line: 22)                   // a row's name
    static let nameWaiting = Face(17, .medium, line: 22)   // a waiting row's name
    static let body = Face(17, line: 22)                   // a card's body, an option
    static let lead = Face(20, line: 25)                   // a card's first line
    static let count = Face(20, line: 25, tabular: true)   // a cell's big line
    static let secondary = Face(15, line: 20)              // a row's second line
    static let small = Face(13, line: 18)                  // notes under a card
    static let age = Face(13, line: 16, tabular: true)     // an age, the read clock
    static let header = Face(13, .medium, line: 16)        // a section header
    static let cellHeader = Face(13, line: 16)             // MESSAGES, THE AGENT
    static let badge = Face(11, line: 16)                  // a machine's name
    static let chipMarker = Face(15, line: 18, tabular: true)
    static let navTitle = Face(17, .semibold, line: 22)
    static let fingerprint = Face(20, line: 25)
}

private extension Font.Weight {
    var uiWeight: UIFont.Weight {
        switch self {
        case .medium: .medium
        case .semibold: .semibold
        case .bold: .bold
        default: .regular
        }
    }
}

/// `letter-spacing: 0.04em` on the raised labels.
enum Tracking {
    static func raised(_ face: Face) -> CGFloat { face.size * 0.04 }
}

extension View {
    /// One line of text in the mock's line box, so its frame is the box's.
    func lineBox(_ face: Face, alignment: Alignment = .leading) -> some View {
        frame(minHeight: face.lineHeight, maxHeight: face.lineHeight, alignment: alignment)
    }

    /// A card: `background: #191B20; border: 1px solid #25282E; border-radius: 10px`.
    func card(radius: CGFloat = Frame.cardRadius) -> some View {
        background(
            RoundedRectangle(cornerRadius: radius, style: .continuous)
                .fill(Tokens.bgSurface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: radius, style: .continuous)
                .strokeBorder(Tokens.border, lineWidth: Frame.hairline)
        )
    }
}

// MARK: - Text

/// A run of text a person reads, drawn VERBATIM. Every string on these screens
/// is either the door's (main's words, the person's words, the agent's words)
/// or `Copy`'s, and none of them is a localisation key or markdown. The one
/// place markdown is drawn is the agent's answer (`AnswerText`).
struct Words: View {
    let text: String
    let face: Face
    let color: Color
    var lines: Int? = 1

    init(_ text: String, _ face: Face, _ color: Color, lines: Int? = 1) {
        self.text = text
        self.face = face
        self.color = color
        self.lines = lines
    }

    var body: some View {
        Text(verbatim: text)
            .font(face.font)
            .foregroundStyle(color)
            .lineSpacing(face.spacing)
            .lineLimit(lines)
            .truncationMode(.tail)
            .fixedSize(horizontal: false, vertical: lines == nil)
    }
}

/// A raised label, `text-transform: uppercase; letter-spacing: 0.04em`. The
/// words stay as the Mac stores them (`the agent`), and the style raises them,
/// the way the Mac's stylesheet does; what XCUITest and VoiceOver read is the
/// stored words, unraised.
struct RaisedLabel: View {
    let text: String
    let face: Face

    init(_ text: String, _ face: Face = .cellHeader) {
        self.text = text
        self.face = face
    }

    var body: some View {
        Text(verbatim: text)
            .font(face.font)
            .tracking(Tracking.raised(face))
            .textCase(.uppercase)
            .foregroundStyle(Tokens.textSecondary)
            .lineLimit(1)
            .accessibilityLabel(Text(verbatim: text))
    }
}

// MARK: - The dot

extension StatusDot {
    /// The dot's colour. A name this build does not know gets no colour of its
    /// own: colour is spent on state, and an unknown state is not one.
    var color: Color {
        switch self {
        case .attention: Tokens.statusAttention
        case .working: Tokens.statusWorking
        case .idle: Tokens.statusIdle
        case .ended: Tokens.statusExited
        case .failed: Tokens.statusFailed
        case .unknown: Tokens.textMuted
        }
    }

    /// Ended, failed and unknown are rings; the rest are filled.
    var hollow: Bool {
        switch self {
        case .ended, .failed, .unknown: true
        case .attention, .working, .idle: false
        }
    }

    /// Only the waiting dot pulses. It is the loudest thing on every screen.
    var pulses: Bool { self == .attention }
}

/// The status dot. The attention dot pulses (`opacity 1 → 0.45`, 1.6 s) unless
/// Reduce Motion is on, exactly as the mocks' `prefers-reduced-motion` rule
/// says. Its accessible label is main's status title, so VoiceOver says the
/// word the Mac says.
struct DotView: View {
    let dot: StatusDot
    let title: String
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var dimmed = false

    var body: some View {
        Group {
            if dot.hollow {
                Circle().strokeBorder(dot.color, lineWidth: Frame.dotRing)
            } else {
                Circle().fill(dot.color)
            }
        }
        .frame(width: Frame.dot, height: Frame.dot)
        .opacity(dimmed ? 0.45 : 1)
        .onAppear {
            guard dot.pulses, !reduceMotion, !Self.heldStill else { return }
            withAnimation(.timingCurve(0.2, 0, 0, 1, duration: 0.8).repeatForever(autoreverses: true)) {
                dimmed = true
            }
        }
        .accessibilityElement()
        .accessibilityLabel(Text(verbatim: title))
    }

    /// True only in a DEBUG build launched with `MotionDebugSeam.stillArgument`.
    private static var heldStill: Bool {
        #if DEBUG
        return MotionDebugSeam.still
        #else
        return false
        #endif
    }
}

#if DEBUG
/// DEBUG ONLY: `-TortieDebugStill` holds the attention dot still, the way
/// Reduce Motion does for a person. XCUITest waits for the app to go idle
/// before and after every tap, and a pulse that repeats forever never lets it,
/// so `probe:p316`'s UI test launches with this. It changes an opacity and
/// nothing else: no frame, label or word the probe reads moves with it.
enum MotionDebugSeam {
    static let stillArgument = "-TortieDebugStill"
    static let still = ProcessInfo.processInfo.arguments.contains(stillArgument)
}
#endif

/// A machine's name, when the session runs somewhere else (`Mac Pro`).
struct MachineBadge: View {
    let name: String

    var body: some View {
        Text(verbatim: name)
            .font(Face.badge.font)
            .foregroundStyle(Tokens.graphLane3)
            .lineLimit(1)
            .padding(.horizontal, Frame.badgePadding)
            .frame(height: Face.badge.lineHeight)
            .overlay(
                RoundedRectangle(cornerRadius: Frame.badgeRadius, style: .continuous)
                    .strokeBorder(Tokens.graphLane3, lineWidth: Frame.hairline)
            )
            .fixedSize()
    }
}

/// A hairline between rows, below a header, above a foot.
struct Hairline: View {
    var body: some View {
        Rectangle()
            .fill(Tokens.border)
            .frame(height: Frame.hairline)
            .accessibilityHidden(true)
    }
}

/// The chevron at the end of a row that opens something (Session.html's
/// hand-off row: 9×15, a 1.8 stroke in `--text-muted`).
struct Chevron: View {
    var body: some View {
        Path { p in
            p.move(to: CGPoint(x: 1.5, y: 1.5))
            p.addLine(to: CGPoint(x: 7, y: 7.5))
            p.addLine(to: CGPoint(x: 1.5, y: 13.5))
        }
        .stroke(Tokens.textMuted, style: StrokeStyle(lineWidth: 1.8, lineCap: .butt, lineJoin: .miter))
        .frame(width: 9, height: 15)
        .accessibilityHidden(true)
    }
}

// MARK: - A read that did not come back

/// The one sentence a screen draws in place of its content when a read failed,
/// and the press that asks again. NO HALF-DRAWN SCREEN: a screen is its answer
/// or this, never a mixture, so what a person reads was all read together.
struct FailureView: View {
    let sentence: String
    let id: String
    let retry: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Frame.cardGap) {
            Words(sentence, .body, Tokens.textSecondary, lines: nil)
                .accessibilityIdentifier(id)
            Button(action: retry) {
                Words(Copy.tryAgain, .body, Tokens.accent)
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier(ID.retry(id))
        }
        .padding(.horizontal, Frame.gutter)
        .padding(.vertical, Frame.cardGap)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// The spinner while the first answer is on its way.
struct LoadingView: View {
    let id: String

    var body: some View {
        ProgressView()
            .tint(Tokens.textMuted)
            .padding(Frame.gutter)
            .frame(maxWidth: .infinity)
            .accessibilityIdentifier(id)
    }
}
