// Macs: every Mac this iPhone is paired with, and one tap to switch to one
// (Phase 345, build/p345/SPEC.md D3, D14; his answer of 2026-10-14, "you
// should be able to switch through via the bottom nav bar like they are
// completely separate").
//
// THE FOURTH TAB. With two or more Macs kept the bar gains one item at its
// right, named after the Mac on screen, and this screen is its root: the
// title (the system's large title over the iPhone's own bar since Phase 348,
// build/p348/SPEC.md §4.5, D15), then one card with a row per Mac in the
// phone's order (the first Mac paired, then the rest by when each was paired,
// D9). The Mac on screen is ticked. Under each name is its line: the sentence
// its last read said when that read failed, else `Needs your input (n)` with
// the waiting dot when something there waits on him, else nothing. A tap on
// a row switches the whole app to that Mac and lands on its Needs input,
// where he was in it (D4). With one Mac kept the tab is not drawn and this
// screen is never reached.
//
// IT DOES NO ARITHMETIC AND COMPOSES NOTHING. Each row's count is the count of
// the rows that Mac's own last answer called waiting, as its Needs input
// badge is; the order is the store's. It reads the Macs not on screen when it
// appears and every Mac on a pull, one `/v1/blocked` each (D7), and nothing
// else.
//
// Just enough words: the title is the one new word on it.

import SwiftUI

// MARK: - What a row draws, decided before anything is laid out

/// One Mac's row, as drawn. Pure, so the tests read every row with nothing
/// on screen.
struct MacRow: Equatable, Identifiable {
    /// The Mac's whole public name (D2).
    let id: String
    /// Its drawn name (D21).
    let name: String
    /// The Mac on screen.
    let chosen: Bool
    /// The sentence its last read said, `Needs your input (n)`, or nil.
    let line: String?
    /// Whether the line is the waiting count, which draws the waiting dot.
    let waiting: Bool

    /// What a Mac's list says on its row: the failure's sentence, the waiting
    /// count when something waits, or nothing while it reads or nothing waits.
    static func line(_ state: ListState) -> (line: String?, waiting: Bool) {
        switch state {
        case .loading:
            return (nil, false)
        case .failed(let sentence):
            return (sentence, false)
        case .loaded(let drawing):
            guard !drawing.waiting.isEmpty else { return (nil, false) }
            return (Copy.needsYourInput(drawing.waiting.count), true)
        }
    }

    /// Every Mac the app keeps, in its order.
    @MainActor
    static func rows(_ app: AppModel) -> [MacRow] {
        app.spaces.map { space in
            let said = line(space.list.state)
            return MacRow(
                id: space.id,
                name: app.drawnName(space),
                chosen: space.id == app.chosen?.id,
                line: said.line,
                waiting: said.waiting
            )
        }
    }
}

// MARK: - The screen

struct MacsScreen: View {
    let app: AppModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                macsCard(MacRow.rows(app))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, MacsFrame.underTitle)
            .padding(.bottom, Frame.gutter)
        }
        .scrollIndicators(.hidden)
        .background(Tokens.bgSidebar.ignoresSafeArea())
        .refreshable { await app.readAllMacs() }
        .task { await app.readOtherMacs() }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.macsScreen)
        .navigationTitle(Copy.macs)
        .navigationBarTitleDisplayMode(.large)
        .toolbarBackground(Tokens.bgSidebar, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
    }

    /// One card, a row per Mac, a hairline between two rows.
    private func macsCard(_ rows: [MacRow]) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(rows.enumerated()), id: \.element.id) { place, row in
                if place > 0 { Hairline() }
                macRow(row, place: place)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, Frame.cardPadding)
        .padding(.vertical, MacsFrame.cardVertical)
        .card()
        .padding(.horizontal, Frame.gutter)
    }

    /// One Mac: the tick on the Mac on screen (the same width blank on the
    /// others), its name whole, and its line under it. At least 44 tall; the
    /// whole row chooses it.
    private func macRow(_ row: MacRow, place: Int) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: Frame.rowGap) {
            tick(row, place: place)
            VStack(alignment: .leading, spacing: Frame.rowLineGap) {
                Words(row.name, .body, Tokens.textPrimary, lines: nil)
                    .accessibilityIdentifier(ID.macsRowName(place))
                if let line = row.line {
                    HStack(alignment: .center, spacing: Frame.rowGap) {
                        if row.waiting {
                            DotView(dot: .attention, title: Copy.needsInput)
                        }
                        Words(line, .secondary, Tokens.textSecondary, lines: nil)
                            .accessibilityIdentifier(ID.macsRowLine(place))
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.vertical, Frame.rowVertical)
        .frame(minHeight: MacsFrame.rowHeight, alignment: .leading)
        .contentShape(Rectangle())
        .onTapGesture { choose(row) }
        .accessibilityElement(children: .contain)
        .accessibilityAddTraits(row.chosen ? [.isButton, .isSelected] : .isButton)
        .accessibilityIdentifier(ID.macsRow(place))
        .accessibilityAction(.default) { choose(row) }
    }

    /// The accent tick on the Mac on screen; a blank of its width elsewhere,
    /// so every name starts at the same place.
    @ViewBuilder
    private func tick(_ row: MacRow, place: Int) -> some View {
        if row.chosen {
            Image(systemName: "checkmark")
                .font(Face.body.font)
                .foregroundStyle(Tokens.accent)
                .frame(width: MacsFrame.tick, alignment: .leading)
                .accessibilityIdentifier(ID.macsRowChosen(place))
        } else {
            Color.clear
                .frame(width: MacsFrame.tick, height: Frame.hairline)
                .accessibilityHidden(true)
        }
    }

    /// A row's press: the whole app switches to that Mac, on its Needs input.
    func choose(_ row: MacRow) {
        app.choose(row.id)
    }
}

/// The lengths the Macs screen spells that the other screens do not.
private enum MacsFrame {
    /// A row a person presses (Apple's 44 pt hit target).
    static let rowHeight: CGFloat = 44
    /// The tick's column, the same on every row.
    static let tick: CGFloat = 20
    /// A card that holds rows, as Settings' (`padding-top: 12px` less a row's 6).
    static let cardVertical: CGFloat = 6
    /// Between the large title and the card, as the title row's own
    /// `padding: 0 16px 8px` held it before the bar drew the title (Phase 348).
    static let underTitle: CGFloat = 8
}
