import Foundation

// The text the style tests read: the checkout's own files, found from this
// file's compile-time path, and the three small readers they need.
//
// A Simulator process runs on this Mac and reads its files, so a test hosted in
// the app can read `src/renderer/styles/tokens.css` and the Mac modules that own
// each word, from the checkout the bundle was built from. That is the point:
// the phone is judged against the Mac's own bytes, never against a copy of them
// kept in the test.
//
// Pure Foundation, so the readers can also be compiled on the Mac by themselves.

enum StyleSource {
    /// The checkout root: this file is `<root>/ios/TortieTests/StyleSource.swift`.
    static let root: URL = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent()
        .deletingLastPathComponent()
        .deletingLastPathComponent()

    /// A checkout file as UTF-8 text.
    static func text(_ relativePath: String) throws -> String {
        try String(contentsOf: root.appendingPathComponent(relativePath), encoding: .utf8)
    }

    // MARK: - tokens.css

    /// Every `--name: #rrggbb;` declaration of the DARK base, which is the
    /// first `:root {` block of tokens.css and nothing after it. The light
    /// block repeats every name, and the file's own header says a reader must
    /// stop at the first block's closing brace.
    static func darkTokens(_ css: String) -> [String: UInt32] {
        var out: [String: UInt32] = [:]
        var inside = false
        for raw in css.components(separatedBy: "\n") {
            let line = raw.trimmingCharacters(in: .whitespaces)
            if !inside {
                if raw.hasPrefix(":root {") { inside = true }
                continue
            }
            if raw.hasPrefix("}") { break }
            guard line.hasPrefix("--"), let colon = line.firstIndex(of: ":") else { continue }
            let name = String(line[line.index(line.startIndex, offsetBy: 2)..<colon])
            let value = line[line.index(after: colon)...].trimmingCharacters(in: .whitespaces)
            guard value.hasPrefix("#"), value.count >= 8 else { continue }
            let digits = value.dropFirst().prefix(6)
            let after = value.dropFirst(7).first
            guard after == ";", digits.allSatisfy(\.isHexDigit),
                  let hex = UInt32(digits, radix: 16) else { continue }
            out[name] = hex
        }
        return out
    }

    /// `bgSidebar` to `bg-sidebar`, `graphLane3` to `graph-lane-3`: the token's
    /// own name from the Swift case that carries it.
    static func kebab(_ camel: String) -> String {
        var out = ""
        var previous: Character?
        for character in camel {
            if character.isUppercase {
                out += "-" + character.lowercased()
            } else if character.isNumber, let p = previous, p.isLetter {
                out += "-" + String(character)
            } else {
                out.append(character)
            }
            previous = character
        }
        return out
    }

    /// Every `#rrggbb` a mock's HTML spells, lower-cased.
    static func hexesSpelled(_ html: String) -> Set<UInt32> {
        var out = Set<UInt32>()
        let characters = Array(html)
        for i in characters.indices where characters[i] == "#" {
            let end = i + 7
            guard end <= characters.count else { continue }
            if end < characters.count, characters[end].isLetter || characters[end].isNumber { continue }
            let digits = characters[(i + 1)..<end]
            guard digits.allSatisfy(\.isHexDigit), let hex = UInt32(String(digits), radix: 16) else { continue }
            out.insert(hex)
        }
        return out
    }

    // MARK: - Copy.swift

    /// Who owns one word.
    enum Owner: Equatable {
        /// The Mac says it: `<file> ⟦<text>⟧`.
        case mac(path: String, needle: String)
        /// The phone says it, for this reason.
        case phone(reason: String)
    }

    /// One `static let` of Copy.swift, as written.
    struct Entry {
        let name: String
        let literal: String
        let owner: Owner?
        /// `/// Names: <file> ⟦<text>⟧` lines above a phone-owned line.
        let names: [(path: String, needle: String)]
        let line: Int
    }

    /// Reads Copy.swift the way its header says it is written. Every problem is
    /// a sentence naming the line, and the tests assert there are none.
    static func copyEntries(_ swift: String) -> (entries: [Entry], problems: [String]) {
        var entries: [Entry] = []
        var problems: [String] = []
        var block: [String] = []
        for (offset, raw) in swift.components(separatedBy: "\n").enumerated() {
            let number = offset + 1
            let line = raw.trimmingCharacters(in: .whitespaces)
            if line.hasPrefix("///") {
                block.append(line)
                continue
            }
            defer { block = [] }
            if line.hasPrefix("//") || !line.contains("\"") { continue }
            guard let entry = staticLet(line) else {
                problems.append("line \(number): a string literal outside a one line static let")
                continue
            }
            if entry.literal.contains("\\") || entry.literal.contains("\"") {
                problems.append("line \(number): \(entry.name) escapes or interpolates")
            }
            var owner: Owner?
            var names: [(path: String, needle: String)] = []
            var owners = 0
            for doc in block {
                let body = doc.dropFirst(3).trimmingCharacters(in: .whitespaces)
                if body.hasPrefix("Mac:") {
                    owners += 1
                    guard let (path, needle) = pathAndNeedle(String(body.dropFirst(4))) else {
                        problems.append("line \(number): \(entry.name) has a Mac line with no ⟦text⟧")
                        continue
                    }
                    owner = .mac(path: path, needle: needle)
                } else if body.hasPrefix("Phone:") {
                    owners += 1
                    let reason = body.dropFirst(6).trimmingCharacters(in: .whitespaces)
                    if reason.isEmpty {
                        problems.append("line \(number): \(entry.name) is the phone's with no reason")
                    }
                    owner = .phone(reason: reason)
                } else if body.hasPrefix("Names:") {
                    if let pair = pathAndNeedle(String(body.dropFirst(6))) {
                        names.append((path: pair.0, needle: pair.1))
                    } else {
                        problems.append("line \(number): \(entry.name) has a Names line with no ⟦text⟧")
                    }
                }
            }
            if owners != 1 {
                problems.append("line \(number): \(entry.name) says who owns it \(owners) times, not once")
            }
            entries.append(Entry(name: entry.name, literal: entry.literal, owner: owner, names: names, line: number))
        }
        return (entries, problems)
    }

    /// `static let name = "literal"`, and nothing else on the line.
    private static func staticLet(_ line: String) -> (name: String, literal: String)? {
        let lead = "static let "
        guard line.hasPrefix(lead), line.hasSuffix("\""),
              let equals = line.range(of: " = \"") else { return nil }
        let name = String(line[line.index(line.startIndex, offsetBy: lead.count)..<equals.lowerBound])
        guard !name.isEmpty, name.allSatisfy({ $0.isLetter || $0.isNumber }) else { return nil }
        let literal = String(line[equals.upperBound..<line.index(before: line.endIndex)])
        return (name, literal)
    }

    /// `src/x.ts ⟦text⟧` to the path and the text, byte for byte.
    private static func pathAndNeedle(_ body: String) -> (String, String)? {
        let trimmed = body.trimmingCharacters(in: .whitespaces)
        guard let open = trimmed.range(of: " ⟦"), trimmed.hasSuffix("⟧") else { return nil }
        let path = String(trimmed[..<open.lowerBound])
        let needle = String(trimmed[open.upperBound..<trimmed.index(before: trimmed.endIndex)])
        guard !path.isEmpty, !path.contains(" "), !needle.isEmpty else { return nil }
        return (path, needle)
    }

    /// Whether a phone word is the Mac's word inside `needle`, unchanged.
    ///
    /// A needle that quotes a word (`SHEET_TITLE = 'Sessions'`) owns exactly
    /// that word, so the phone's must equal it; the one allowance is dropping a
    /// full stop or a space the Mac composes AFTER it (`{'”. '}` owns `”`). A
    /// needle that quotes nothing is a template or a line of markup
    /// (`return \`read ${clock}\``), and the phone's word must sit inside it
    /// with no letter or digit touching either end, so a word cut short
    /// (`rea`, `Session`) is refused either way.
    static func macWordHolds(_ literal: String, in needle: String) -> Bool {
        if let word = quotedWord(needle) {
            if literal == word { return true }
            var trimmed = Substring(word)
            while let last = trimmed.last, last == "." || last == " " { trimmed = trimmed.dropLast() }
            return !trimmed.isEmpty && literal == String(trimmed)
        }
        var searchFrom = needle.startIndex
        while let found = needle.range(of: literal, range: searchFrom..<needle.endIndex) {
            let before = found.lowerBound == needle.startIndex ? nil : needle[needle.index(before: found.lowerBound)]
            let after = found.upperBound == needle.endIndex ? nil : needle[found.upperBound]
            let touches: (Character?) -> Bool = { $0.map { $0.isLetter || $0.isNumber } ?? false }
            if !touches(before), !touches(after) { return true }
            searchFrom = needle.index(after: found.lowerBound)
        }
        return false
    }

    /// The word a needle quotes: `BTN_PAIR = 'Pair'` quotes `Pair`.
    static func quotedWord(_ needle: String) -> String? {
        guard let first = needle.firstIndex(of: "'") else { return nil }
        let rest = needle[needle.index(after: first)...]
        guard let second = rest.firstIndex(of: "'") else { return nil }
        let word = String(rest[..<second])
        return word.isEmpty ? nil : word
    }
}
