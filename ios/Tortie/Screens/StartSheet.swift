// New session, drawn (Phase 346, build/p346/SPEC.md D21 and D22): the "+" in
// the Sessions bar, and the sheet it opens.
//
// THE "+" sits alone at the trailing edge of the Sessions tab's bar of the
// Mac on screen (Phase 348, build/p348/SPEC.md D16, D56; `SessionsBar`), away
// from Select and the menu at the leading edge, drawn ONLY while that Mac's
// latest sessions answer carries an offered start (a Mac that has not allowed
// Start yet draws nothing, D9) and off while End these takes taps. Not on a
// project header: Show opens on Active, so a project with nothing running has
// none.
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
}

// MARK: - The "+"

/// The "+" in the Sessions bar (D21; Phase 348, D16, D56), spoken
/// `New session`. Where it is drawn, and when it is off, is the bar's
/// (`SessionsBar`, Screens/SessionsScreen.swift).
///
/// THE IPHONE'S OWN "+" ON EACH RUNTIME. On iOS 26 it is `plus` in the bar's
/// own prominent glass, tinted the accent; before it, `plus.circle.fill` in
/// the accent. ITS PRESS IS ITS LABEL'S FRAME: the label is framed once,
/// `SessionsFrame.plusPress` square, with that rectangle as its content shape,
/// and nothing is padded, because the bar presses exactly an item's own frame
/// and nothing past it. The bar holds no item taller than 36 pt on iOS 26.3,
/// so it presses 50 × 36 there, and 54 × 44 on 18.3 (build/p348/SPEC.md
/// §2.5.1). It is one real Button, so `.disabled(` at the call site sets its
/// own not-enabled trait (rule (aa)(6)'s lesson) and VoiceOver reads it New
/// session. Phase 346's ruled round padded a bare glyph out to 46 × 46 in the
/// title row and gave the same lengths back outside the Button; the bar draws
/// no title row, so both lengths went with it.
struct StartTitleControl: View {
    let open: () -> Void

    var body: some View {
        if #available(iOS 26, *) {
            Button(action: open) {
                Image(systemName: "plus")
                    .frame(width: SessionsFrame.plusPress, height: SessionsFrame.plusPress)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.glassProminent)
            .tint(Tokens.accent)
            .accessibilityLabel(Text(verbatim: Copy.newSession))
        } else {
            Button(action: open) {
                Image(systemName: "plus.circle.fill")
                    .foregroundStyle(Tokens.accent)
                    .frame(width: SessionsFrame.plusPress, height: SessionsFrame.plusPress)
                    .contentShape(Rectangle())
            }
            .accessibilityLabel(Text(verbatim: Copy.newSession))
        }
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
