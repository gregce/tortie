// New session, drawn (Phase 346, build/p346/SPEC.md D21 and D22): the "+" on
// the Sessions title, and the sheet it opens.
//
// THE "+" sits at the trailing end of the Sessions title row of the Mac on
// screen, after the menu and Select, drawn ONLY while that Mac's latest
// sessions answer carries an offered start (a Mac that has not allowed Start
// yet draws nothing, D9) and off while End these takes taps. Not on a project
// header: Show opens on Active, so a project with nothing running has none.
//
// THE SHEET, laid out as his answers say, with just enough words: Project, a
// menu of the projects open in Tortie on that Mac and its machines (a project
// on a machine shows the machine; one Tortie is not connected to is listed
// dimmed, `Not connected`, and cannot be chosen); Agent, a row of the MARKS of
// exactly the agents installed where the chosen project lives (his answer 6,
// "ONLY the ones that are installed to save space"), the chosen one ringed,
// each named for VoiceOver, and the chosen agent's name once under them; the
// one `Starts with …` line when a sealed safeguard-off launch default applies;
// one line for the state; and Create (`Creating…` while it runs, `Try again`
// while a kept start holds). No Shell (his answer 7), no folder, no flag, no
// name, no login and no machine to choose. Nothing asks Face ID (his answer 5).
//
// Every word is Copy's or the Mac's, every colour a token, every element
// identified (Screens/Identifiers.swift).

import SwiftUI

// MARK: - The numbers

/// The sheet's own lengths, in points.
enum StartFrame {
    /// A mark's press (`44 × 44`, the smallest target iOS asks for).
    static let mark: CGFloat = 44
    /// The mark drawn inside it.
    static let glyph: CGFloat = 24
    /// Between two marks.
    static let markGap: CGFloat = 8
    /// A mark's corner.
    static let markRadius: CGFloat = 8
    /// The chosen mark's ring.
    static let chosenRing: CGFloat = 2
    /// Between the label and what it labels.
    static let labelGap: CGFloat = 6
    /// Between the sheet's parts.
    static let sectionGap: CGFloat = 20
    /// Create's press, in Scan code's shape.
    static let createHeight: CGFloat = 50
    /// The Project menu's press.
    static let menuHeight: CGFloat = 50
    /// How far the "+"'s PRESS reaches past its 18 × 16 pt glyph (the ruled
    /// round): 46 × 46 pt in all, over iOS's 44 pt smallest target. It
    /// reaches up 17 and down 13, because the Show control's capsule starts
    /// 13 pt under the glyph (y 104 under a glyph at 75 to 91 on an iPhone 16
    /// Pro), and 14 each side, which stops 2 pt short of Select's end.
    static let plusReach = EdgeInsets(top: 17, leading: 14, bottom: 13, trailing: 14)
    /// The same lengths given back to the layout OUTSIDE the Button, so the
    /// title row lays out exactly as it did with the bare glyph. Literals, so
    /// no arithmetic is done on them (rule (k)).
    static let plusGiveBack = EdgeInsets(top: -17, leading: -14, bottom: -13, trailing: -14)
}

// MARK: - The "+"

/// The "+" on the Sessions title (D21): an SF Symbol `plus`, spoken
/// `New session`. Where it is drawn, and when it is off, is the title's.
///
/// ITS PRESS IS 46 × 46 pt AROUND THE SAME GLYPH, ITS LAYOUT THE GLYPH'S (the
/// ruled round): the glyph alone was an 18 × 16 pt target. The Button's label
/// is the glyph padded out by `StartFrame.plusReach` with that whole rectangle
/// as its content shape, so the Button itself, its press and its element are
/// 46 × 46 pt with the glyph where it always was inside them; OUTSIDE the
/// Button the same lengths are given back (`plusGiveBack`), so the title row,
/// the menu, Select and the glyph lay out and draw where they always did. It
/// is one real Button, so `.disabled(` at the call site sets its own
/// not-enabled trait (rule (aa)(6)'s lesson) and VoiceOver reads it New
/// session. THREE EARLIER SHAPES FAILED, measured by probe:p316's NP12 on
/// 2026-10-16: the padding given back INSIDE the label pressed nothing past the
/// glyph (a Button's shape is its label's frame); a square as the Button's
/// background, and a square and the Button as two overlays of a hidden glyph,
/// each made the call site's identifier name a container with no label and
/// the square's frame. NP12 taps the square's corners around where the build
/// before drew the glyph, and reads every frame on the row against that build.
struct StartTitleControl: View {
    let open: () -> Void

    var body: some View {
        Button(action: open) {
            Image(systemName: "plus")
                .foregroundStyle(Tokens.accent)
                .padding(StartFrame.plusReach)
                .contentShape(Rectangle())
        }
        .accessibilityLabel(Text(verbatim: Copy.newSession))
        .padding(StartFrame.plusGiveBack)
    }
}

// MARK: - The sheet

struct StartSheet: View {
    let model: StartModel
    /// Reads the Sessions tab again.
    let reread: @MainActor () async -> Void
    /// Closes the sheet and opens the session the Mac made.
    let opened: @MainActor (_ id: String, _ name: String) -> Void
    /// Closes the sheet.
    let close: () -> Void

    var body: some View {
        let drawing = model.drawing
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: StartFrame.sectionGap) {
                    projectPart(drawing)
                    agentPart(drawing)
                    if let danger = drawing.danger {
                        Words(danger, .secondary, Tokens.textSecondary, lines: nil)
                            .accessibilityIdentifier(ID.startDanger)
                    }
                    if let line = model.line ?? drawing.state {
                        Words(line, .secondary, Tokens.textSecondary, lines: nil)
                            .accessibilityIdentifier(ID.startLine)
                    }
                    create
                }
                .padding(Frame.gutter)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .scrollIndicators(.hidden)
            .background(Tokens.bgSidebar.ignoresSafeArea())
            .navigationTitle(Copy.newSession)
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Tokens.bgSidebar, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(Copy.cancel, action: close)
                        .disabled(model.phase != .idle)
                        .accessibilityIdentifier(ID.startClose)
                }
            }
        }
        // A start under way keeps the sheet, so its line, and Try again
        // after an answer that did not come, are drawn where it was pressed.
        .interactiveDismissDisabled(model.phase != .idle)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.startSheet)
    }

    /// `Project`, and the menu of the projects the Mac offered.
    private func projectPart(_ drawing: StartDrawing) -> some View {
        VStack(alignment: .leading, spacing: StartFrame.labelGap) {
            RaisedLabel(Copy.groupProject)
            Menu {
                ForEach(drawing.projects) { row in
                    Button {
                        model.choose(project: row.id)
                    } label: {
                        Text(verbatim: row.title)
                        if let detail = row.detail {
                            Text(verbatim: detail)
                        }
                        if row.id == drawing.project?.id {
                            Image(systemName: "checkmark")
                        }
                    }
                    .disabled(!row.choosable)
                    .accessibilityAddTraits(row.id == drawing.project?.id ? .isSelected : [])
                    .accessibilityIdentifier(ID.startProjectChoice(row.id))
                }
            } label: {
                HStack(spacing: Frame.rowGap) {
                    VStack(alignment: .leading, spacing: Frame.rowLineGap) {
                        Words(drawing.project?.title ?? Copy.dash, .body, Tokens.textPrimary)
                        if let detail = drawing.project?.detail {
                            Words(detail, .small, Tokens.textMuted)
                        }
                    }
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.up.chevron.down")
                        .foregroundStyle(Tokens.textMuted)
                        .accessibilityHidden(true)
                }
                .padding(.horizontal, Frame.cardPadding)
                .frame(minHeight: StartFrame.menuHeight)
                .card()
                .contentShape(Rectangle())
            }
            .disabled(model.phase != .idle || drawing.projects.isEmpty)
            .accessibilityLabel(Text(verbatim: drawing.project?.title ?? Copy.groupProject))
            .accessibilityIdentifier(ID.startProject)
        }
    }

    /// `Agent`, the marks of the agents installed there, and the chosen one's
    /// name under them.
    private func agentPart(_ drawing: StartDrawing) -> some View {
        VStack(alignment: .leading, spacing: StartFrame.labelGap) {
            RaisedLabel(Copy.agent)
            LazyVGrid(
                columns: [GridItem(.adaptive(minimum: StartFrame.mark, maximum: StartFrame.mark), spacing: StartFrame.markGap)],
                alignment: .leading,
                spacing: StartFrame.markGap
            ) {
                ForEach(drawing.marks) { mark in
                    markButton(mark)
                }
            }
            if let name = drawing.agentName {
                Words(name, .body, Tokens.textPrimary)
                    .lineBox(.body)
                    .accessibilityIdentifier(ID.startAgentName)
            }
        }
    }

    /// One agent's mark: a 44 point press, the chosen one ringed in the
    /// accent and carrying the selected trait, named by the agent's name.
    private func markButton(_ mark: StartDrawing.Mark) -> some View {
        Button {
            model.choose(agent: mark.id)
        } label: {
            AgentMark(icon: mark.icon, color: mark.chosen ? Tokens.textPrimary : Tokens.textSecondary, size: StartFrame.glyph)
                .frame(width: StartFrame.mark, height: StartFrame.mark)
                .background(
                    RoundedRectangle(cornerRadius: StartFrame.markRadius, style: .continuous)
                        .fill(mark.chosen ? Tokens.bgRaised : Tokens.bgSurface)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: StartFrame.markRadius, style: .continuous)
                        .strokeBorder(mark.chosen ? Tokens.accent : Tokens.border, lineWidth: mark.chosen ? StartFrame.chosenRing : Frame.hairline)
                )
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(model.phase != .idle)
        .accessibilityLabel(Text(verbatim: mark.name))
        .accessibilityAddTraits(mark.chosen ? .isSelected : [])
        .accessibilityIdentifier(ID.startAgent(mark.id))
    }

    /// Create, Creating… or Try again: the accent on the raised fill, in Scan
    /// code's shape, the words muted while it cannot be pressed.
    private var create: some View {
        let on = model.canCreate
        return Button {
            model.create(reread: reread, opened: opened)
        } label: {
            Words(model.createWord, .body, on ? Tokens.accent : Tokens.textDisabled)
                .frame(maxWidth: .infinity)
                .frame(height: StartFrame.createHeight)
                .background(
                    RoundedRectangle(cornerRadius: Frame.cardRadius, style: .continuous)
                        .fill(Tokens.bgRaised)
                )
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(!on)
        .accessibilityIdentifier(ID.startCreate)
    }
}
