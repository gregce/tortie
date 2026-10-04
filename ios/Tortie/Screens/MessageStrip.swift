// The message box, on one session (Phase 318, build/p318/SPEC.md section
// 5.7.4).
//
// docs/design/phone/Composer.html. Drawn ONLY while the Mac says the session
// can take a message (`reply.canSay`): a Claude Code or Codex session on this
// Mac, waiting for him at its own empty prompt (his ruling of 2026-10-02,
// "Only when idle at its prompt"). Never on a waiting question, never while
// the agent works, never on another machine, a shell or another agent. It
// sits above the End bar, both above the tab bar, and while the box has the
// keyboard the End bar is not drawn, so nothing destructive sits beside it.
//
// WHAT HE TYPED IS WHAT IS SENT. The box is a `UITextView` with smart quotes,
// smart dashes and smart insert off, because each rewrites what he typed (`--`
// becomes an em dash and `!git log --oneline` breaks; `/` and `!` reach the
// agent as typed, his ruling). Autocorrect and dictation stay as iOS has
// them. Nothing here trims, normalises or replaces the words.
//
// One line under the box: the Mac's sentence or `Sent` after a message,
// `Sending…` while one is on its way, and otherwise `Goes to this session as
// one message.` Send asks nothing first (his ruling, "Only for End").

import SwiftUI
import UIKit

/// The lengths Composer.html spells that the other mocks do not.
enum MessageFrame {
    /// Between the box and Send, and above the line under them (`gap: 6px`,
    /// `margin-top: 6px`).
    static let gap: CGFloat = 6
    /// The strip's top and bottom padding (`padding: 8px 16px`).
    static let stripVertical: CGFloat = 8
    /// Send (`width: 32px; height: 32px; border-radius: 50%`).
    static let send: CGFloat = 32
    /// The arrow inside it (`svg width="15"`).
    static let arrow: CGFloat = 15
    /// The box's corner (`border-radius: 4px`).
    static let fieldRadius: CGFloat = 4
    /// Where the words sit inside the box: `padding: 6px 8px` inside its
    /// 1 px border.
    static let fieldInset: CGFloat = 7
    static let fieldSideInset: CGFloat = 9
    /// One line of 17 pt and the box's padding and border (`min-height: 36px`).
    static let fieldMinHeight: CGFloat = 36
    /// Five of UIKit's 17 pt system lines (20.3 each) and the same padding
    /// and border; past it the box scrolls.
    static let fieldMaxHeight: CGFloat = 116
}

/// The strip: the box, Send, and the line under them.
struct MessageStrip: View {
    let model: ReplyModel
    /// Whether the box has the keyboard; the session screen hides End while
    /// it does.
    @Binding var focused: Bool
    let reread: @MainActor () async -> Bool

    /// The one line under the box.
    private var line: String {
        if let said = model.sayLine { return said }
        return model.phase == .sending ? Copy.sending : Copy.oneMessage
    }

    var body: some View {
        VStack(alignment: .leading, spacing: MessageFrame.gap) {
            HStack(alignment: .bottom, spacing: MessageFrame.gap) {
                field
                send
            }
            Words(line, .small, Tokens.textMuted, lines: nil)
                .accessibilityIdentifier(ID.sessionMessageLine)
        }
        .padding(.horizontal, Frame.gutter)
        .padding(.vertical, MessageFrame.stripVertical)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Tokens.bgSidebar.ignoresSafeArea(edges: .horizontal))
        .overlay(alignment: .top) { Hairline() }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.sessionMessageStrip)
        // A box that goes while it has the keyboard says so, so End returns.
        .onDisappear { focused = false }
    }

    /// The box, its placeholder drawn over it while it is empty.
    private var field: some View {
        MessageField(text: Binding(get: { model.text }, set: { model.edit($0) }), focused: $focused)
            .overlay(alignment: .topLeading) {
                if model.text.isEmpty {
                    Words(Copy.messagePlaceholder, .body, Tokens.textDisabled)
                        .padding(.horizontal, MessageFrame.fieldSideInset)
                        .padding(.vertical, MessageFrame.fieldInset)
                        .allowsHitTesting(false)
                        .accessibilityHidden(true)
                }
            }
            .background(
                RoundedRectangle(cornerRadius: MessageFrame.fieldRadius, style: .continuous)
                    .fill(Tokens.bgSurface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: MessageFrame.fieldRadius, style: .continuous)
                    .strokeBorder(Tokens.borderStrong, lineWidth: Frame.hairline)
            )
    }

    /// Send: on exactly when the box holds words and no write runs.
    private var send: some View {
        let on = !model.text.isEmpty && model.phase == .idle
        return Button {
            model.send(reread: reread)
        } label: {
            Image(systemName: "arrow.up")
                .font(.system(size: MessageFrame.arrow, weight: .semibold))
                .foregroundStyle(on ? Tokens.bgSidebar : Tokens.textDisabled)
                .frame(width: MessageFrame.send, height: MessageFrame.send)
                .background(Circle().fill(on ? Tokens.accent : Tokens.bgRaised))
                .contentShape(Circle())
        }
        .buttonStyle(.plain)
        .disabled(model.text.isEmpty || model.phase != .idle)
        .accessibilityLabel(Text(verbatim: Copy.send))
        .accessibilityIdentifier(ID.sessionMessageSend)
    }
}

/// The box: a `UITextView`, because SwiftUI's text fields cannot turn smart
/// quotes, smart dashes and smart insert off. It grows with what he types up
/// to five lines, then scrolls.
struct MessageField: UIViewRepresentable {
    @Binding var text: String
    @Binding var focused: Bool

    func makeCoordinator() -> Coordinator {
        Coordinator(text: $text, focused: $focused)
    }

    func makeUIView(context: Context) -> UITextView {
        let view = UITextView()
        // What he typed is what is sent: nothing rewrites it as he types.
        view.smartQuotesType = .no
        view.smartDashesType = .no
        view.smartInsertDeleteType = .no
        view.font = UIFont.systemFont(ofSize: Face.body.size)
        view.textColor = Token.textPrimary.uiColor
        view.tintColor = Token.accent.uiColor
        view.backgroundColor = nil
        view.keyboardAppearance = .dark
        view.textContainerInset = UIEdgeInsets(
            top: MessageFrame.fieldInset, left: MessageFrame.fieldSideInset,
            bottom: MessageFrame.fieldInset, right: MessageFrame.fieldSideInset
        )
        view.textContainer.lineFragmentPadding = 0
        view.isScrollEnabled = true
        view.accessibilityIdentifier = ID.sessionMessageField
        view.accessibilityLabel = Copy.messagePlaceholder
        view.text = text
        view.delegate = context.coordinator
        return view
    }

    func updateUIView(_ view: UITextView, context: Context) {
        context.coordinator.text = $text
        context.coordinator.focused = $focused
        // Compared as bytes: the box shows exactly the model's words.
        if !view.text.utf8.elementsEqual(text.utf8) {
            view.text = text
        }
    }

    func sizeThatFits(_ proposal: ProposedViewSize, uiView: UITextView, context: Context) -> CGSize? {
        guard let width = proposal.width, width.isFinite, width > 0 else { return nil }
        let fitting = uiView.sizeThatFits(CGSize(width: width, height: CGFloat.greatestFiniteMagnitude))
        let height = min(max(fitting.height, MessageFrame.fieldMinHeight), MessageFrame.fieldMaxHeight)
        return CGSize(width: width, height: height)
    }

    /// Hands the box's words and its focus back to SwiftUI.
    @MainActor
    final class Coordinator: NSObject, UITextViewDelegate {
        var text: Binding<String>
        var focused: Binding<Bool>

        init(text: Binding<String>, focused: Binding<Bool>) {
            self.text = text
            self.focused = focused
        }

        func textViewDidChange(_ view: UITextView) {
            text.wrappedValue = view.text
            view.invalidateIntrinsicContentSize()
        }

        func textViewDidBeginEditing(_ view: UITextView) {
            focused.wrappedValue = true
        }

        func textViewDidEndEditing(_ view: UITextView) {
            focused.wrappedValue = false
        }
    }
}
