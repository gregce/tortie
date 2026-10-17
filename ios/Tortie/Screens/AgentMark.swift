// An agent's mark, the Mac's own (Phase 346, build/p346/SPEC.md D23).
//
// THE MARKS ARE THE MAC'S. The thirteen agents Tortie can launch each draw the
// mark the Mac draws for them (src/renderer/assets/agents), generated into
// AgentMarks.xcassets by build/p346/agent-marks.mjs as TEMPLATE vector images:
// every `currentColor` written black, droid's black plate dropped and its glyph
// kept, as the Mac drops omp's favicon plate, so every mark is ONE ink and is
// tinted here by a token. `agent-marks.mjs --check`, which conformance:ios
// runs, regenerates the catalog and compares it byte for byte, so the phone's
// marks cannot drift from the Mac's.
//
// THE TABLE BELOW IS THE ONE PLACE A MARK IS NAMED. A key the phone does not
// carry (a later Mac's new agent) draws SF Symbol `terminal`, as the Mac draws
// its codicon `terminal` for a shell or an agent it has no mark for.

import SwiftUI

struct AgentMark: View {
    /// The mark's key, the registry's `iconKey` as the offer carried it.
    let icon: String
    /// Its colour, a token.
    let color: Color
    /// Its edge, in points.
    let size: CGFloat

    /// Each mark the phone carries, by its key: the image set's name in
    /// AgentMarks.xcassets.
    nonisolated static let assets: [String: String] = [
        "antigravity": "agent-antigravity",
        "claude": "agent-claude",
        "codex": "agent-codex",
        "cursor": "agent-cursor",
        "deepseek": "agent-deepseek",
        "droid": "agent-droid",
        "gemini": "agent-gemini",
        "grok": "agent-grok",
        "muse": "agent-muse",
        "omp": "agent-omp",
        "opencode": "agent-opencode",
        "pi": "agent-pi",
        "qwen": "agent-qwen"
    ]

    /// The SF Symbol a key the phone does not carry draws.
    nonisolated static let fallback = "terminal"

    var body: some View {
        mark
            .foregroundStyle(color)
            .frame(width: size, height: size)
            .accessibilityHidden(true)
    }

    @ViewBuilder
    private var mark: some View {
        if let asset = Self.assets[icon] {
            Image(asset)
                .renderingMode(.template)
                .resizable()
                .scaledToFit()
        } else {
            Image(systemName: Self.fallback)
                .resizable()
                .scaledToFit()
        }
    }
}
