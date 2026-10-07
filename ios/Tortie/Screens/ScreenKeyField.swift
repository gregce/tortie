// The Screen's keyboard: a hidden text view, and the key bar above it (Phase
// 337, build/p337/SPEC.md D28 and section 5.8.5).
//
// A HIDDEN FIELD. A `UITextView` one point square and transparent, first
// responder while he types, because it is the one Apple text input that gives
// the system keyboard, IME composition and dictation without a web view or a
// `UITextInput` written by hand. Autocorrection, spell checking, smart quotes,
// smart dashes and smart insert are off, capitalisation is none, inline
// predictions are off and Writing Tools are off; the keyboard is the default
// one (an ASCII-capable one drops the globe key, which is how a person
// reaches another language's keyboard).
//
// WHAT IS SENT (`ScreenInputState`, pure). A committed append is sent as
// text; a CJK composition rewrite (Korean's syllable by syllable, a Chinese or
// Japanese reading replaced by its characters) is sent as Backspaces and the
// new text; any other replacement (an autocorrection the field still made) is
// swallowed, and the field stays off until it is emptied, because the
// session already holds text the field no longer describes. NOTHING IS SENT
// while text is marked (an IME composition in progress) or while dictation
// runs; dictation's text goes once, when it ends. Backspace is `BSpace`,
// even on an empty field. A replacement that is exactly a line break is
// `Enter`; ANY OTHER REPLACEMENT HOLDING A LINE BREAK IS SWALLOWED WHOLE, and
// the field takes NO PASTE AND NO DROP, so a block of lines can never arrive
// as lines and Returns, each run by a shell (§Attack A9). The field is
// emptied after each Return and once it holds 256 characters, never while
// text is marked.
//
// THE DESIGN IS PASEO'S (packages/app/src/terminal/native-renderer/
// terminal-input.native.tsx and terminal-key-events.ts at getpaseo/paseo
// 2f0cb2f54be5742d6fc7e9b85ba39808ac22ad93, Apache-2.0, by the Paseo authors),
// ported to Swift, and no Paseo code is copied: the hidden one-point input;
// autocorrect, spell check and capitalisation off; no ASCII-capable keyboard;
// the append, Backspace, Return and CJK composition rules; a change holding a
// line break swallowed whole; other replacements swallowed until a reset; and
// the arrows as named keys. Not taken: its guess at a composition from the
// committed script alone, because UIKit says when text is marked.
//
// THE KEY BAR (`ScreenKeyBar`) is the field's input accessory: esc, tab,
// ⇧tab, the four arrows, ctrl (one shot: the next letter, either case,
// becomes that control key, Ctrl-C included, and anything else is sent as
// typed), return, and one to put the keyboard away. No key repeats, and none
// asks Face ID (his ruling 3).

import SwiftUI
import UIKit

// MARK: - What is sent (pure, and tested)

/// The field's text, and what each change of it sends.
struct ScreenInputState: Equatable, Sendable {
    /// The field empties itself once it holds this many characters.
    static let resetAt = 256
    /// Dictation's input mode, as UIKit names it.
    static let dictationMode = "dictation"
    static let lineFeed = "\n"
    static let carriageReturn = "\r"
    /// The two scalars a line break is made of. A text is asked for them
    /// scalar by scalar, never Character by Character: "\r\n" is ONE
    /// Character, which neither "\n" nor "\r" equals, so `String.contains`
    /// asked for either missed a Windows line break and sent the block as one
    /// line of text (the fix round of 2026-10-06, D28).
    static let lineBreakScalars: Set<Unicode.Scalar> = Set(lineFeed.unicodeScalars).union(carriageReturn.unicodeScalars)

    /// Whether `text` holds a line feed or a carriage return anywhere.
    static func holdsLineBreak(_ text: String) -> Bool {
        text.unicodeScalars.contains { lineBreakScalars.contains($0) }
    }

    /// What the field held after the last change read.
    private(set) var previous = ""
    /// A replacement was swallowed: nothing but appends is sent until the
    /// field is emptied.
    private(set) var desynced = false
    /// Control is armed: the next letter is its control key.
    var controlArmed = false

    /// What one change sends, and whether the field empties after it.
    struct Change: Equatable, Sendable {
        var items: [KeyItem] = []
        var clear = false
    }

    /// A replacement the field is about to make (`shouldChangeTextIn`): a
    /// replacement that is exactly a line break is `Enter`, and the field
    /// empties; any other holding a line break is swallowed whole. Nil lets
    /// the field make it, to be read when it has.
    mutating func replacing(with text: String, marked: Bool) -> Change? {
        if text == Self.lineFeed, !marked {
            reset()
            return Change(items: [.key(.enter)], clear: true)
        }
        if Self.holdsLineBreak(text) {
            return Change()
        }
        return nil
    }

    /// The field changed to `text`. Nothing is sent while text is marked or
    /// dictation runs: the change is read when it ends.
    mutating func changed(to text: String, marked: Bool, dictating: Bool) -> Change {
        guard !marked, !dictating else { return Change() }
        if Self.holdsLineBreak(text) {
            reset()
            return Change(clear: true)
        }
        if text.isEmpty {
            previous = ""
            return Change()
        }
        var change = Change()
        if text.hasPrefix(previous) {
            change.items = typed(String(text.dropFirst(previous.count)))
        } else if !desynced, let rewrite = Self.composition(from: previous, to: text) {
            change.items = rewrite
        } else {
            desynced = true
        }
        previous = text
        change.clear = text.count >= Self.resetAt
        if change.clear { reset() }
        return change
    }

    /// Backspace (`deleteBackward`): `BSpace`, even on an empty field, and the
    /// field's last character forgotten, so the deletion that follows reads
    /// as no change. Nothing while text is marked: the IME edits its own.
    mutating func backspace(marked: Bool) -> Change {
        guard !marked else { return Change() }
        previous = String(previous.dropLast())
        return Change(items: [.key(.backspace)])
    }

    /// The field was emptied.
    mutating func reset() {
        previous = ""
        desynced = false
    }

    /// Typed text, with Control applied to its first letter when armed.
    private mutating func typed(_ text: String) -> [KeyItem] {
        guard !text.isEmpty else { return [] }
        var rest = Substring(text)
        var items: [KeyItem] = []
        if controlArmed, let first = rest.first {
            controlArmed = false
            if let control = ScreenKeyName.control(first) {
                items.append(.key(control))
                rest = rest.dropFirst()
            }
        }
        if let item = KeyItem.typed(String(rest)) { items.append(item) }
        return items
    }

    /// A CJK composition rewrite: the characters after the common prefix
    /// rubbed out with Backspace and the new ones sent, ONLY when the new ones
    /// hold a CJK script and something was both removed and inserted. Nil for
    /// any other replacement, which is swallowed.
    static func composition(from previous: String, to text: String) -> [KeyItem]? {
        let before = Array(previous)
        let after = Array(text)
        let common = zip(before, after).prefix { $0 == $1 }.count
        let removed = before.dropFirst(common)
        let inserted = String(after.dropFirst(common))
        guard !removed.isEmpty, !inserted.isEmpty, inserted.unicodeScalars.contains(where: isComposed),
              let typed = KeyItem.typed(inserted) else { return nil }
        var items = Array(repeating: KeyItem.key(.backspace), count: removed.count)
        items.append(typed)
        return items
    }

    /// U+FFFC, the object replacement character: dictation's placeholder, as
    /// a field's text holds it. Built from the code point.
    static let placeholderMark: UInt32 = 0xFFFC

    /// Whether `text` holds dictation's placeholder.
    static func holdsPlaceholder(_ text: String) -> Bool {
        text.unicodeScalars.contains { $0.value == placeholderMark }
    }

    /// Han, Hiragana, Katakana, Hangul and Bopomofo: the scripts an IME
    /// composes in place.
    static func isComposed(_ scalar: Unicode.Scalar) -> Bool {
        composedRanges.contains { $0.contains(scalar.value) }
    }

    private static let composedRanges: [ClosedRange<UInt32>] = [
        0x1100...0x11FF, 0x2E80...0x2FDF, 0x3040...0x30FF, 0x3100...0x312F, 0x3130...0x318F,
        0x31A0...0x31BF, 0x31F0...0x31FF, 0x3400...0x4DBF, 0x4E00...0x9FFF, 0xA960...0xA97F,
        0xAC00...0xD7AF, 0xD7B0...0xD7FF, 0xF900...0xFAFF, 0xFF65...0xFFDC, 0x20000...0x3FFFF,
    ]
}

// MARK: - The hidden field

/// The hidden text view: the keyboard's owner. It refuses paste and drop and
/// sends its changes through `ScreenInputState`.
final class ScreenTextView: UITextView {
    /// What a change sends.
    var onKeys: (([KeyItem]) -> Void)?
    /// The machine that reads each change.
    var state = ScreenInputState()

    override init(frame: CGRect, textContainer: NSTextContainer?) {
        super.init(frame: frame, textContainer: textContainer)
        autocorrectionType = .no
        spellCheckingType = .no
        smartQuotesType = .no
        smartDashesType = .no
        smartInsertDeleteType = .no
        autocapitalizationType = .none
        inlinePredictionType = .no
        writingToolsBehavior = .none
        pasteConfiguration = nil
        textDropDelegate = ScreenDropRefusal.shared
        isScrollEnabled = false
        backgroundColor = .clear
        tintColor = .clear
        textColor = .clear
        accessibilityIdentifier = ID.screenKeyField
    }

    required init?(coder: NSCoder) {
        nil
    }

    /// Whether dictation runs: its input mode, or its placeholder in the
    /// field, which UIKit holds there as an attachment, one U+FFFC in the
    /// field's text.
    var dictating: Bool {
        textInputMode?.primaryLanguage == ScreenInputState.dictationMode
            || ScreenInputState.holdsPlaceholder(text ?? "")
    }

    /// No paste of any kind, ever: the session gets what he types, key by
    /// key.
    override func canPerformAction(_ action: Selector, withSender sender: Any?) -> Bool {
        if Self.refused.contains(action) { return false }
        return super.canPerformAction(action, withSender: sender)
    }

    /// The paste actions this field refuses.
    static let refused: Set<Selector> = [
        #selector(UIResponderStandardEditActions.paste(_:)),
        #selector(UIResponderStandardEditActions.pasteAndMatchStyle(_:)),
        #selector(UIResponderStandardEditActions.pasteAndGo(_:)),
        #selector(UIResponderStandardEditActions.pasteAndSearch(_:)),
    ]

    override func paste(_ sender: Any?) {}

    override func deleteBackward() {
        let change = state.backspace(marked: markedTextRange != nil)
        super.deleteBackward()
        if !change.items.isEmpty { onKeys?(change.items) }
    }

    /// Dictation ended: what it left in the field is read once.
    func dictationEnded() {
        guard !dictating else { return }
        read()
    }

    /// Read the field as it is now.
    func read() {
        let change = state.changed(to: text ?? "", marked: markedTextRange != nil, dictating: dictating)
        if change.clear { text = "" }
        if !change.items.isEmpty { onKeys?(change.items) }
    }

    /// Empty the field.
    func empty() {
        text = ""
        state.reset()
    }
}

/// Nothing is dropped into the field.
@MainActor
final class ScreenDropRefusal: NSObject, UITextDropDelegate {
    static let shared = ScreenDropRefusal()

    func textDroppableView(_ textDroppableView: UIView & UITextDroppable, proposalForDrop drop: UITextDropRequest) -> UITextDropProposal {
        UITextDropProposal(operation: .cancel)
    }
}

// MARK: - The field, in SwiftUI

/// Whether Control is armed, drawn by the key bar and read by the field.
@MainActor
@Observable
final class ScreenKeyBarModel {
    var controlArmed = false
}

/// The hidden field behind the grid, holding the keyboard while `typing`.
struct ScreenKeyField: UIViewRepresentable {
    @Binding var typing: Bool
    let bar: ScreenKeyBarModel
    let onKeys: ([KeyItem]) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIView(context: Context) -> ScreenTextView {
        let field = ScreenTextView(frame: CGRect(x: 0, y: 0, width: 1, height: 1), textContainer: nil)
        field.delegate = context.coordinator
        field.onKeys = { [weak coordinator = context.coordinator] items in coordinator?.keys(items) }
        let host = UIHostingController(rootView: ScreenKeyBar(
            bar: bar,
            press: { [weak coordinator = context.coordinator] name in coordinator?.press(name) },
            hide: { [weak coordinator = context.coordinator] in coordinator?.hide() }
        ))
        host.view.backgroundColor = .clear
        host.sizingOptions = [.intrinsicContentSize]
        host.view.frame = CGRect(x: 0, y: 0, width: 1, height: ScreenKeyBar.height)
        host.view.autoresizingMask = [.flexibleWidth]
        field.inputAccessoryView = host.view
        context.coordinator.host = host
        context.coordinator.field = field
        NotificationCenter.default.addObserver(
            context.coordinator, selector: #selector(Coordinator.inputModeChanged),
            name: UITextInputMode.currentInputModeDidChangeNotification, object: nil
        )
        return field
    }

    func updateUIView(_ field: ScreenTextView, context: Context) {
        context.coordinator.parent = self
        // NEVER INSIDE SWIFTUI'S UPDATE (the 337.1 fix round). Becoming or
        // resigning first responder posts the keyboard's notifications and
        // SwiftUI's own focus change synchronously, and they write the page's
        // state (the keyboard's overlap, which hides the question tray) while
        // this update is still running: with the tray drawn that re-entered
        // the view graph in an AttributeGraph cycle and the app froze when he
        // tapped the terminal (the verifier's sample of its main thread, iOS
        // 26.3 and 18.3). The change is made on the next turn of the main
        // queue, against what `typing` says THEN.
        guard (typing && !field.isFirstResponder) || (!typing && field.isFirstResponder) else { return }
        let coordinator = context.coordinator
        DispatchQueue.main.async { [weak field] in
            guard let field else { return }
            coordinator.settle(field)
        }
    }

    static func dismantleUIView(_ field: ScreenTextView, coordinator: Coordinator) {
        NotificationCenter.default.removeObserver(coordinator)
        field.resignFirstResponder()
    }

    @MainActor
    final class Coordinator: NSObject, UITextViewDelegate {
        var parent: ScreenKeyField
        var host: UIHostingController<ScreenKeyBar>?
        weak var field: ScreenTextView?

        init(_ parent: ScreenKeyField) {
            self.parent = parent
        }

        /// What the field sends, with Control applied by the field's state.
        func keys(_ items: [KeyItem]) {
            parent.bar.controlArmed = field?.state.controlArmed ?? false
            parent.onKeys(items)
        }

        /// A key of the bar: Control arms the next letter, the rest are sent.
        func press(_ name: ScreenKeyName?) {
            guard let field else { return }
            guard let name else {
                field.state.controlArmed.toggle()
                parent.bar.controlArmed = field.state.controlArmed
                return
            }
            field.state.controlArmed = false
            parent.bar.controlArmed = false
            if name == .enter { field.empty() }
            parent.onKeys([.key(name)])
        }

        func hide() {
            parent.typing = false
        }

        /// The field takes or gives up the keyboard as `typing` says now,
        /// outside any SwiftUI update (`updateUIView` schedules it).
        func settle(_ field: ScreenTextView) {
            if parent.typing, !field.isFirstResponder {
                field.empty()
                field.becomeFirstResponder()
            } else if !parent.typing, field.isFirstResponder {
                field.resignFirstResponder()
            }
        }

        func textView(_ textView: UITextView, shouldChangeTextIn range: NSRange, replacementText text: String) -> Bool {
            guard let field = textView as? ScreenTextView else { return false }
            guard let change = field.state.replacing(with: text, marked: textView.markedTextRange != nil) else { return true }
            if change.clear { textView.text = "" }
            if !change.items.isEmpty { keys(change.items) }
            return false
        }

        func textViewDidChange(_ textView: UITextView) {
            (textView as? ScreenTextView)?.read()
        }

        func textViewDidEndEditing(_ textView: UITextView) {
            parent.typing = false
        }

        @objc func inputModeChanged() {
            field?.dictationEnded()
        }
    }
}

// MARK: - The key bar

/// The key bar above the keyboard (D28): esc, tab, ⇧tab, the arrows, ctrl,
/// return, and the button that puts the keyboard away.
struct ScreenKeyBar: View {
    static let height: CGFloat = 44

    let bar: ScreenKeyBarModel
    /// A key's press; nil is Control, which arms the next letter.
    let press: (ScreenKeyName?) -> Void
    let hide: () -> Void

    var body: some View {
        HStack(spacing: 2) {
            word(Copy.keyEsc, label: Copy.keyEscapeLabel, id: Short.esc, key: .escape)
            word(Copy.keyTab, label: Copy.keyTabLabel, id: Short.tab, key: .tab)
            word(Copy.keyBackTab, label: Copy.keyBackTabLabel, id: Short.backTab, key: .backTab)
            arrow(Symbol.left, label: Copy.keyLeftLabel, id: Short.left, key: .left)
            arrow(Symbol.up, label: Copy.keyUpLabel, id: Short.up, key: .up)
            arrow(Symbol.down, label: Copy.keyDownLabel, id: Short.down, key: .down)
            arrow(Symbol.right, label: Copy.keyRightLabel, id: Short.right, key: .right)
            control
            word(Copy.keyReturn, label: Copy.keyReturnLabel, id: Short.enter, key: .enter)
            Button(action: hide) {
                Image(systemName: Symbol.hide)
                    .foregroundStyle(Tokens.textSecondary)
                    .frame(minWidth: Self.keyWidth, minHeight: Self.keyHeight)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(Copy.hideKeyboard)
            .accessibilityIdentifier(ID.screenKey(Short.hide))
        }
        .padding(.horizontal, 4)
        .frame(maxWidth: .infinity, minHeight: Self.height)
        .background(Tokens.bgSurface)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.screenKeyBar)
    }

    private static let keyWidth: CGFloat = 30
    private static let keyHeight: CGFloat = 36

    private func word(_ text: String, label: String, id: String, key: ScreenKeyName) -> some View {
        Button { press(key) } label: {
            Text(verbatim: text)
                .font(.system(size: 15, weight: .medium, design: .monospaced))
                .foregroundStyle(Tokens.textPrimary)
                .frame(minWidth: Self.keyWidth, minHeight: Self.keyHeight)
                .padding(.horizontal, 2)
                .background(RoundedRectangle(cornerRadius: Frame.chipRadius, style: .continuous).fill(Tokens.bgRaised))
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityIdentifier(ID.screenKey(id))
    }

    private func arrow(_ symbol: String, label: String, id: String, key: ScreenKeyName) -> some View {
        Button { press(key) } label: {
            Image(systemName: symbol)
                .foregroundStyle(Tokens.textPrimary)
                .frame(minWidth: Self.keyWidth, minHeight: Self.keyHeight)
                .background(RoundedRectangle(cornerRadius: Frame.chipRadius, style: .continuous).fill(Tokens.bgRaised))
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityIdentifier(ID.screenKey(id))
    }

    /// Control, one shot: drawn in the accent while armed.
    private var control: some View {
        Button { press(nil) } label: {
            Text(verbatim: Copy.keyCtrl)
                .font(.system(size: 15, weight: .medium, design: .monospaced))
                .foregroundStyle(bar.controlArmed ? Tokens.bgSidebar : Tokens.textPrimary)
                .frame(minWidth: Self.keyWidth, minHeight: Self.keyHeight)
                .padding(.horizontal, 2)
                .background(
                    RoundedRectangle(cornerRadius: Frame.chipRadius, style: .continuous)
                        .fill(bar.controlArmed ? Tokens.accent : Tokens.bgRaised)
                )
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Copy.keyControlLabel)
        .accessibilityAddTraits(bar.controlArmed ? .isSelected : [])
        .accessibilityIdentifier(ID.screenKey(Short.control))
    }

    /// Each key's short name, for its identifier.
    enum Short {
        static let esc = "esc"
        static let tab = "tab"
        static let backTab = "btab"
        static let left = "left"
        static let up = "up"
        static let down = "down"
        static let right = "right"
        static let control = "ctrl"
        static let enter = "return"
        static let hide = "hide"
    }

    /// The SF Symbols the bar draws: images, never words.
    enum Symbol {
        static let left = "arrow.left"
        static let up = "arrow.up"
        static let down = "arrow.down"
        static let right = "arrow.right"
        static let hide = "keyboard.chevron.compact.down"
    }
}
