// The one way out of the app: a link in an answer (Phase 316.6,
// build/p3166/SPEC.md §5.5.5; `conformance:ios` rule (z)).
//
// THE 316.2 RULE MOVES HERE, IN WRITING. 316.2 drew every link as its words
// and never opened one, because an answer is somebody else's bytes read over a
// network. His ruling for 316.6 opens a link, and only like this:
//
//   1. Only an address `LinkPolicy.opens` accepts can be pressed at all:
//      `https`, written in lower case; no user, no password and no port; a
//      host of two or more labels of ASCII letters, digits and hyphens, none
//      punycode (`xn--`), whose last label holds a letter, is no number in any
//      spelling the URL Standard reads as one (`0x1`, so `127.0.0.0x1` is no
//      way round the rule), and is no name kept for one private network
//      (`local`, `internal`, `localdomain` and RFC 6762's list); and the
//      whole address printable ASCII of at most `MarkdownCaps.linkBytes`
//      bytes. Every other link is plain words, so `shortcuts://`, `tel:`,
//      `file:` and their kin start nothing.
//   2. A link whose words already SAY its address (a bare URL, an autolink,
//      `www.`, or a run Foundation joined to one) is never pressable:
//      `LinkPolicy.pressable`, which compares the two with the scheme, one
//      trailing `/`, percent escapes, case and every character that draws
//      nothing taken out. Inline.swift removes the address from every link
//      that is not pressable.
//   3. A press reaches the ONE `OpenURLAction`, installed by `linkGate()` on
//      the reading root. It asks the policy again, then shows the exact
//      address as the title of an alert (an alert, not a sheet, so a 2,048
//      byte address wraps whole), with Cancel and Open. Open asks the policy
//      a third time before the one `UIApplication.shared.open`.
//
// A link's words never decide where it goes: the alert says where. NAMED
// LIMITS: an `https` address an installed app claims as a universal link opens
// that app, not Safari (the spec's §3 row 3), and nothing short of an in-app
// browser, which rule (z) refuses, could force Safari; and no rule written on
// the address alone can tell where a NAME resolves (`127.0.0.1.nip.io` is a
// public name for this iPhone itself, and a name under the loopback name is
// not refused, because rule (d) lets no Release file spell that name), so the
// policy promises the address is plain and shown, never that it is far away.
//
// MARKDOWN IS OFF (his ruling of 2026-10-02): every answer is drawn as written
// (`MarkdownCaps.pieces` is 0), every link address removed, so no link reaches
// this gate and 316.2's rule holds again in practice: a link is drawn as its
// words and never opened. The gate stays installed, and this file stays as it
// is, for the later phase that switches markdown back on.

import Foundation
import SwiftUI
import UIKit

enum LinkPolicy {
    /// True only for an address the phone may hand to the system.
    static func opens(_ url: URL) -> Bool {
        guard url.scheme == "https",
              url.user == nil,
              url.password == nil,
              url.port == nil,
              let host = url.host(percentEncoded: true) else { return false }
        let address = url.absoluteString
        guard address.utf8.count <= MarkdownCaps.linkBytes,
              address.utf8.allSatisfy({ $0 >= 0x21 && $0 <= 0x7e }) else { return false }
        let labels = host.split(separator: ".", omittingEmptySubsequences: false)
        guard labels.count >= 2, labels.allSatisfy(plainLabel) else { return false }
        guard let last = labels.last, namesAPlace(last) else { return false }
        return true
    }

    /// True when the link may be pressed: the policy opens its address, and
    /// its words do not already say that address.
    static func pressable(_ url: URL, words: String) -> Bool {
        guard opens(url) else { return false }
        let address = said(bare(url.absoluteString))
        return !address.isEmpty && !said(Substring(words)).contains(address)
    }

    /// The names RFC 6762 (its Appendix G), RFC 8375 and ICANN keep for one
    /// network or one machine's own, refused as a host's last label: none
    /// names a place on the internet. The loopback name itself is not in the
    /// set, because rule (d) lets no Release file spell it; alone it is one
    /// label and refused above, and NAMED LIMIT, a name under it is not.
    private static let localNames: Set<String> = [
        "localdomain", "local", "internal", "intranet", "private", "corp", "home", "lan", "arpa"
    ]

    /// Whether a host's last label names a place on the internet: it holds a
    /// letter (so no dotted address and no number in decimal or octal), it is
    /// not `0x` and hex digits, which the URL Standard also reads as a number
    /// (`https://127.0.0.0x1/` is 127.0.0.1 to WebKit), and it is not a name
    /// kept for one machine or one network.
    private static func namesAPlace(_ label: Substring) -> Bool {
        guard label.utf8.contains(where: isLetter) else { return false }
        let lower = label.lowercased()
        if lower.hasPrefix("0x") && lower.utf8.dropFirst(2).allSatisfy(isHexDigit) { return false }
        return !localNames.contains(lower)
    }

    private static func isHexDigit(_ b: UInt8) -> Bool {
        (b >= UInt8(ascii: "0") && b <= UInt8(ascii: "9")) || (b >= UInt8(ascii: "a") && b <= UInt8(ascii: "f"))
    }

    /// One label of a plain host: 1 to 63 ASCII letters, digits and hyphens,
    /// no hyphen at either end, and no punycode.
    private static func plainLabel(_ label: Substring) -> Bool {
        let bytes = label.utf8
        guard let first = bytes.first, let last = bytes.last, bytes.count <= 63 else { return false }
        guard first != UInt8(ascii: "-"), last != UInt8(ascii: "-") else { return false }
        guard !label.lowercased().hasPrefix("xn--") else { return false }
        return bytes.allSatisfy { isLetter($0) || ($0 >= UInt8(ascii: "0") && $0 <= UInt8(ascii: "9")) || $0 == UInt8(ascii: "-") }
    }

    private static func isLetter(_ b: UInt8) -> Bool {
        (b >= UInt8(ascii: "a") && b <= UInt8(ascii: "z")) || (b >= UInt8(ascii: "A") && b <= UInt8(ascii: "Z"))
    }

    /// An address without a leading scheme and its `://` (`https://`, and
    /// the cleartext one Foundation gives `www.`, which rule (c) will not let
    /// this file spell) and one trailing `/`, for the comparison.
    private static func bare(_ text: String) -> Substring {
        var rest = Substring(text)
        if let mark = rest.range(of: "://") {
            let scheme = rest[..<mark.lowerBound]
            if !scheme.isEmpty && scheme.utf8.allSatisfy(isLetter) { rest = rest[mark.upperBound...] }
        }
        if rest.hasSuffix("/") { rest = rest.dropLast() }
        return rest
    }

    /// Text as a person reads it, for the comparison: percent escapes read,
    /// compatibility forms folded (a full-width letter or dot is its ASCII
    /// self), an ideographic full stop a dot, lower case, and every character
    /// that draws nothing (a zero-width space, a bidi control, a byte order
    /// mark) taken out. So `https://p3166.example/café` says the address
    /// `https://p3166.example/caf%C3%A9`, which the first build missed.
    private static func said(_ text: Substring) -> String {
        let read = (String(text).removingPercentEncoding ?? String(text)).precomposedStringWithCompatibilityMapping
        var out = String.UnicodeScalarView()
        for scalar in read.lowercased().unicodeScalars where !scalar.properties.isDefaultIgnorableCodePoint {
            out.append(scalar == "\u{3002}" ? "." : scalar)
        }
        return String(out)
    }
}

extension View {
    /// The one `OpenURLAction` and the alert that shows the address before
    /// anything opens. Applied once, to the reading root.
    func linkGate() -> some View {
        modifier(LinkGate())
    }
}

private struct LinkGate: ViewModifier {
    @State private var staged: URL?

    func body(content: Content) -> some View {
        content
            .environment(\.openURL, OpenURLAction { url in
                guard LinkPolicy.opens(url) else { return .discarded }
                staged = url
                return .handled
            })
            .alert(
                Text(verbatim: staged?.absoluteString ?? ""),
                isPresented: Binding(get: { staged != nil }, set: { shown in if !shown { staged = nil } }),
                presenting: staged
            ) { url in
                Button(Copy.cancel, role: .cancel) {}
                Button(Copy.open) {
                    if LinkPolicy.opens(url) {
                        UIApplication.shared.open(url)
                    }
                }
            }
    }
}
