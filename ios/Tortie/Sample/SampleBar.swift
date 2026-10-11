// The Sample bar (Phase 333.3, build/p3333/SPEC.md section 5.2.6, D14): ONE
// strip at the top of the sample's root, above the three tabs, so every page of
// the sample says so, upright and sideways, and no list in it reads as the
// person's own Mac. `Sample` at the gutter, `Leave sample` at the trailing
// gutter, back to where See a sample was pressed (D15).

import SwiftUI

struct SampleBar: View {
    /// The least height of the bar and of Leave sample's hit area.
    static let height: CGFloat = 44

    let leave: () -> Void

    var body: some View {
        HStack(spacing: Frame.rowGap) {
            Words(Copy.sample, .small, Tokens.textSecondary)
                .lineBox(.small)
                .accessibilityIdentifier(ID.sampleLabel)
            Spacer(minLength: Frame.rowGap)
            Button(action: leave) {
                Words(Copy.leaveSample, .small, Tokens.accent)
                    .lineBox(.small, alignment: .trailing)
                    .frame(minWidth: Self.height, minHeight: Self.height, alignment: .trailing)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier(ID.sampleLeave)
        }
        .padding(.horizontal, Frame.gutter)
        .frame(maxWidth: .infinity, minHeight: Self.height)
        .background(Tokens.bgSidebar)
        .overlay(alignment: .bottom) { Hairline() }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.sampleBar)
    }
}
