import SwiftUI

// Every colour the phone draws, and the ONE file in the app where a colour is
// written (build/p316/SPEC.md section 4, S2; `conformance:ios` rule (a)).
//
// EACH NAME IS A `tokens.css` TOKEN. A case is the token's name in camelCase,
// `bgSidebar` for `--bg-sidebar` and `graphLane3` for `--graph-lane-3`, and its
// hex is the value the DARK base holds for that name: the first `:root` block
// of src/renderer/styles/tokens.css, byte for byte. The phone is dark only
// (section 4.0), so the light block near the end of that file is never read.
//
// Two tokens that hold one hex stay two names, because the name says what the
// colour is FOR. The working dot and a link are both `#4d9de8`, and neither is
// the other: a later accent retune moves `--accent` and not `--status-working`.
//
// THE FOURTEEN. The screens 316 draws are the approved mocks in
// docs/design/phone/ (Main, Session, Choice and Pairing), and every colour
// their CSS spells is one of the fourteen hexes below (section 3.9). Two of
// them, `borderStrong` and `textDisabled`, are spelled only by the message
// strip, which leaves the phone until Phase 318 (section 6, decision 2); they
// stay here so the one table the gate reads is the mocks' whole table.
//
// A screen writes `Tokens.textPrimary`, a `Color`. It never writes a hex, a
// `Color(red:green:blue:)`, a system colour or a `UIColor`.

/// A `tokens.css` token the phone draws, by its own name.
enum Token: CaseIterable, Sendable {
    // Grounds and lines.
    case bgSidebar
    case bgSurface
    case bgRaised
    case border
    case borderStrong

    // Text.
    case textPrimary
    case textSecondary
    case textMuted
    case textDisabled

    // The one accent: links and the back button.
    case accent

    // The five status dots (src/shared/status-words.ts names them).
    case statusAttention
    case statusWorking
    case statusIdle
    case statusExited
    case statusFailed

    // A machine's badge. The Mac draws a badge in one of six lane colours; the
    // door names the machine and not its colour, so the phone draws lane 3,
    // which is what Main.html draws.
    case graphLane3

    /// The dark base's value for this name, as `tokens.css` writes it.
    var hex: UInt32 {
        switch self {
        case .bgSidebar: 0x0e0f13 // --bg-sidebar
        case .bgSurface: 0x191b20 // --bg-surface
        case .bgRaised: 0x202329 // --bg-raised
        case .border: 0x25282e // --border
        case .borderStrong: 0x353943 // --border-strong
        case .textPrimary: 0xc9cacd // --text-primary
        case .textSecondary: 0x9ca1ab // --text-secondary
        case .textMuted: 0x838996 // --text-muted
        case .textDisabled: 0x565b66 // --text-disabled
        case .accent: 0x4d9de8 // --accent
        case .statusAttention: 0xf5b84a // --status-attention
        case .statusWorking: 0x4d9de8 // --status-working
        case .statusIdle: 0x8b93a1 // --status-idle
        case .statusExited: 0x8b93a1 // --status-exited
        case .statusFailed: 0xe5655e // --status-failed
        case .graphLane3: 0x56c2c0 // --graph-lane-3
        }
    }

    /// The colour, in sRGB and opaque, because `tokens.css` writes every one of
    /// these as a six digit sRGB hex with no alpha.
    var color: Color {
        Color(
            .sRGB,
            red: Double((hex >> 16) & 0xff) / 255,
            green: Double((hex >> 8) & 0xff) / 255,
            blue: Double(hex & 0xff) / 255,
            opacity: 1
        )
    }
}

/// What a screen writes. Each is its `Token`'s colour and nothing else.
enum Tokens {
    static let bgSidebar = Token.bgSidebar.color
    static let bgSurface = Token.bgSurface.color
    static let bgRaised = Token.bgRaised.color
    static let border = Token.border.color
    static let borderStrong = Token.borderStrong.color
    static let textPrimary = Token.textPrimary.color
    static let textSecondary = Token.textSecondary.color
    static let textMuted = Token.textMuted.color
    static let textDisabled = Token.textDisabled.color
    static let accent = Token.accent.color
    static let statusAttention = Token.statusAttention.color
    static let statusWorking = Token.statusWorking.color
    static let statusIdle = Token.statusIdle.color
    static let statusExited = Token.statusExited.color
    static let statusFailed = Token.statusFailed.color
    static let graphLane3 = Token.graphLane3.color
}
