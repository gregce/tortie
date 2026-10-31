// A session's name, typed (Phase 349, build/p349/SPEC.md §4.4 step 4, D5,
// D11, D18, D19).
//
// THE ONE FIELD. The Rename sheet and New session's Name are the app's ONE
// `UITextField`, here and nowhere else (conformance:ios rule bd1). A SwiftUI
// text field cannot turn smart punctuation off (Screens/MessageStrip.swift
// says why its box is a `UITextView`), so this field turns off smart quotes,
// smart dashes, smart insert, autocorrection, capitalisation and spell
// checking in `makeUIView` (bd2): `fix--auth` and `it's "x"` arrive as he
// typed them, as the Mac's own field takes them (`spellCheck={false}`,
// src/renderer/session-manager/InlinePanel.tsx).
//
// ITS NAME FOR XCUITEST AND VOICEOVER is set in `makeUIView` alone (D18):
// a SwiftUI `.accessibilityIdentifier` on this representable REPLACES the
// UIKit view's own (M3 measured it), so no caller attaches one (bd3).
//
// THE CAP. At most `NameRule.maxUnits` UTF-16 units, the Mac sheet's own
// `maxLength={120}`, held in `textField(_:shouldChangeCharactersIn:...)`, so
// typing, pasting or dictating can never grow it past the cap (bd4). A name
// the Mac sends longer than that is still prefilled whole, and its first
// focus selects it, so one keystroke replaces it; it can also be shortened a
// unit at a time, and never grown.
//
// THE FIRST FOCUS SELECTS THE WHOLE TEXT, so a prefilled name is replaced by
// what he types. Return calls `onReturn` and hides the keyboard: the Rename
// sheet saves whenever Save would, and New session's Name only hides the
// keyboard, because Create is pressed by itself (D19).
//
// THE RULE BESIDE IT, `NameRule`, is the Mac's `sessionNameRefusal`
// (src/shared/session-names.ts) in Swift: trimmed by ECMAScript's own `trim`,
// then refused, in the Mac's order, when nothing is left, when it holds more
// than 120 units, or at the first unit Tortie does not use, each with the
// Mac's own sentence. The shared vectors' `names` section, read off the Mac's
// functions one code unit at a time, holds the two together (rules j and bd6,
// `DoorVectorTests`). The Mac judges again whatever is sent; this decides
// only whether Save and Create can be pressed.

import SwiftUI
import UIKit

// MARK: - The rule

/// The Mac's one name rule, in Swift (D5).
enum NameRule {
    /// The most UTF-16 units a name may hold: the Mac's `SESSION_NAME_MAX_UNITS`.
    static let maxUnits = 120

    /// ECMAScript's white space and line terminators, the code points
    /// `String.prototype.trim` takes from both ends, which is how the Mac trims
    /// a name: 25 of them, each written out.
    static let trimmedAway: Set<UInt32> = [
        0x0009, 0x000A, 0x000B, 0x000C, 0x000D, 0x0020, 0x00A0, 0x1680,
        0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A,
        0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF
    ]

    /// Why a name is refused, the Mac's own three words.
    enum Reason: String, Equatable, Sendable {
        case empty, long, character
    }

    /// A refusal and the Mac's sentence for it.
    struct Refusal: Equatable, Sendable {
        let reason: Reason
        let sentence: String
    }

    /// `name` trimmed as the Mac trims it: every code point of `trimmedAway`
    /// taken from both ends, and nothing else.
    static func trimmed(_ name: String) -> String {
        let scalars = name.unicodeScalars
        guard let first = scalars.firstIndex(where: { !trimmedAway.contains($0.value) }),
              let last = scalars.lastIndex(where: { !trimmedAway.contains($0.value) }) else { return "" }
        return String(scalars[first...last])
    }

    /// Whether one code point is refused wherever it stands: a C0 control (TAB,
    /// LF and CR included), DEL, a C1 control, a bidi embedding, override or
    /// isolate, or a line or paragraph separator (D5). A Swift string never
    /// holds half of a surrogate pair, the Mac's last refusal, so there is none
    /// to read here: the vectors' rows that hold one are the Mac's alone.
    static func refuses(_ value: UInt32) -> Bool {
        switch value {
        case 0x0000...0x001F, 0x007F, 0x0080...0x009F, 0x202A...0x202E, 0x2066...0x2069, 0x2028, 0x2029:
            true
        default:
            false
        }
    }

    /// Why `name` is refused, in the Mac's order, or nil: read over the
    /// trimmed name, one code point at a time, with no pattern.
    static func refusal(_ name: String) -> Refusal? {
        let kept = trimmed(name)
        if kept.isEmpty { return Refusal(reason: .empty, sentence: Copy.nameEmpty) }
        if kept.utf16.count > maxUnits { return Refusal(reason: .long, sentence: Copy.nameTooLong) }
        for scalar in kept.unicodeScalars where refuses(scalar.value) {
            return Refusal(reason: .character, sentence: Copy.nameCharacter)
        }
        return nil
    }
}

// MARK: - The field

/// The app's ONE `UITextField` (bd1): a session's name.
struct NameField: UIViewRepresentable {
    @Binding var text: String
    /// Its accessibility identifier, set in `makeUIView` alone (D18).
    let identifier: String
    /// Its accessibility label, set in `makeUIView` alone.
    let label: String
    /// Whether it takes the keyboard as it appears: the Rename sheet's does,
    /// New session's does not (D19).
    let focusOnAppear: Bool
    /// What Return does before the keyboard is hidden.
    let onReturn: () -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(text: $text, onReturn: onReturn)
    }

    func makeUIView(context: Context) -> UITextField {
        let field = UITextField()
        // What he typed is what is sent: nothing rewrites it as he types (D11).
        field.smartQuotesType = .no
        field.smartDashesType = .no
        field.smartInsertDeleteType = .no
        field.autocorrectionType = .no
        field.autocapitalizationType = .none
        field.spellCheckingType = .no
        // Its names, here alone: one attached by a caller would replace them (D18).
        field.accessibilityIdentifier = identifier
        field.accessibilityLabel = label
        field.font = UIFont.systemFont(ofSize: Face.body.size)
        field.textColor = Token.textPrimary.uiColor
        field.tintColor = Token.accent.uiColor
        field.backgroundColor = nil
        field.keyboardAppearance = .dark
        field.returnKeyType = .done
        field.textAlignment = .natural
        field.text = text
        field.delegate = context.coordinator
        field.addTarget(context.coordinator, action: #selector(Coordinator.changed(_:)), for: .editingChanged)
        field.setContentHuggingPriority(.defaultLow, for: .horizontal)
        field.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        if focusOnAppear {
            // After the view is in a window, or UIKit refuses the keyboard.
            DispatchQueue.main.async { [weak field] in field?.becomeFirstResponder() }
        }
        return field
    }

    func updateUIView(_ field: UITextField, context: Context) {
        context.coordinator.text = $text
        context.coordinator.onReturn = onReturn
        field.isEnabled = context.environment.isEnabled
        // Compared as bytes: the field shows exactly the model's name.
        if !(field.text ?? "").utf8.elementsEqual(text.utf8) {
            field.text = text
            // A name the model replaced before he typed (the row's first read
            // came back whole) is selected whole again, as the first focus did.
            if field.isFirstResponder, !context.coordinator.edited { field.selectAll(nil) }
        }
    }

    /// Whether an edit of `current` at `range` by `replacement` stays inside
    /// the cap: the result holds at most `NameRule.maxUnits` UTF-16 units, or,
    /// for a name the Mac holds past the cap, no more units than it holds now,
    /// so it can be shortened a unit at a time but never grow (the fix round
    /// of 2026-10-30, the verify lens: a delete there was refused until the
    /// whole name was selected). A range that is not inside the text is no
    /// edit.
    static func takes(_ current: String, _ range: NSRange, _ replacement: String) -> Bool {
        let now = current as NSString
        guard range.location != NSNotFound, NSMaxRange(range) <= now.length else { return false }
        let after = now.replacingCharacters(in: range, with: replacement).utf16.count
        return after <= NameRule.maxUnits || after <= now.length
    }

    /// Hands the field's text back to SwiftUI, holds the cap, selects the
    /// whole name on the first focus and answers Return.
    @MainActor
    final class Coordinator: NSObject, UITextFieldDelegate {
        var text: Binding<String>
        var onReturn: () -> Void
        /// He changed the text himself.
        private(set) var edited = false
        /// The first focus has selected the whole text.
        private var selectedOnce = false

        init(text: Binding<String>, onReturn: @escaping () -> Void) {
            self.text = text
            self.onReturn = onReturn
        }

        @objc func changed(_ field: UITextField) {
            edited = true
            text.wrappedValue = field.text ?? ""
        }

        func textField(_ field: UITextField, shouldChangeCharactersIn range: NSRange, replacementString string: String) -> Bool {
            NameField.takes(field.text ?? "", range, string)
        }

        func textFieldDidBeginEditing(_ field: UITextField) {
            guard !selectedOnce else { return }
            selectedOnce = true
            // After UIKit places its own caret.
            DispatchQueue.main.async { [weak field] in field?.selectAll(nil) }
        }

        func textFieldShouldReturn(_ field: UITextField) -> Bool {
            onReturn()
            field.resignFirstResponder()
            return false
        }
    }
}
