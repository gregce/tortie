// The words the Sessions tab asks the Mac with, and the three it keeps
// (Phase 316.7, build/p3167/SPEC.md section 6.4.4, D3, D13).
//
// THE WORDS ARE THE CONTRACT'S. `show`, `group` and `sort` are closed lists in
// src/shared/ipc/pocket.ts (`POCKET_SESSIONS_SHOW`, `_GROUP`, `_SORT`), and each
// case's raw value below is one of those words, byte for byte. The door
// refuses a word it does not know (404), and the phone refuses an answer whose
// echoed word is not one of these (Door/Contract.swift `PocketSessionsAsked`).
// Main composes what each word keeps and in what order; the phone sends the
// words and lays the answer out (build/p316/SPEC.md section 4.0).
//
// WHAT THE PHONE KEEPS (D13). Show, Group by and Sort by, in `UserDefaults`,
// three keys, each read back into its closed enum and anything else reading
// the default. That is the only `UserDefaults` in the app (conformance:ios rule
// aa). The agent and machine filters, and every project he opened or closed,
// last for the app's life and are never stored, because a filter kept across
// launches would hide sessions behind a control he cannot see. Nothing the
// door answered is stored, and nothing is stored on the Mac. A planted value
// (`-tortie.sessions.show bogus`, UserDefaults' own argument domain) reads the
// default, so no DEBUG seam is needed to test it.

import Foundation

/// Which sessions the tab shows: the session manager's lifecycle segment.
/// The tab opens on Active (D8).
enum SessionsShow: String, CaseIterable, Sendable, Codable {
    case all
    case active
    case ended

    /// What an absent or unknown stored word reads.
    static let standard = SessionsShow.active
}

/// Under their projects, or one list (D7).
enum SessionsGroupBy: String, CaseIterable, Sendable, Codable {
    case project
    case none

    static let standard = SessionsGroupBy.project
}

/// The order main composes inside each project (D10).
enum SessionsSortBy: String, CaseIterable, Sendable, Codable {
    case recent
    case name
    case oldest

    static let standard = SessionsSortBy.recent
}

/// The words one `/v1/sessions` read asks with. The door echoes them back as
/// `asked`, and an answer to any other question is refused whole.
struct SessionsQuery: Equatable, Sendable {
    var show: SessionsShow
    var group: SessionsGroupBy
    var sort: SessionsSortBy
    /// An agent id, or nil for every agent.
    var agent: String?
    /// A machine id (`local` is this Mac), or nil for every machine.
    var machine: String?

    /// A fresh install's question: Active, under projects, recent first.
    static let standard = SessionsQuery(show: .standard, group: .standard, sort: .standard, agent: nil, machine: nil)
}

/// The three words the phone remembers across launches.
struct SessionsWords: Equatable, Sendable {
    var show: SessionsShow
    var group: SessionsGroupBy
    var sort: SessionsSortBy

    static let standard = SessionsWords(show: .standard, group: .standard, sort: .standard)
}

/// Where the three words are kept. The app's is `KeptSessionsWords`; a test
/// keeps them in memory.
protocol SessionsChoicesStore {
    func load() -> SessionsWords
    func save(_ words: SessionsWords)
}

/// The three words in `UserDefaults`: the one place in the app that names it.
struct KeptSessionsWords: SessionsChoicesStore {
    /// The three keys, spelled once.
    static let showKey = "tortie.sessions.show"
    static let groupKey = "tortie.sessions.group"
    static let sortKey = "tortie.sessions.sort"

    private let defaults: UserDefaults

    init(defaults: UserDefaults) {
        self.defaults = defaults
    }

    /// The phone's own, made each time the app makes the tab's model.
    static func onThisPhone() -> KeptSessionsWords {
        KeptSessionsWords(defaults: .standard)
    }

    /// Each word read back into its closed enum; anything else, a planted
    /// `bogus` included, reads the default.
    func load() -> SessionsWords {
        SessionsWords(
            show: SessionsShow(rawValue: defaults.string(forKey: Self.showKey) ?? "") ?? .standard,
            group: SessionsGroupBy(rawValue: defaults.string(forKey: Self.groupKey) ?? "") ?? .standard,
            sort: SessionsSortBy(rawValue: defaults.string(forKey: Self.sortKey) ?? "") ?? .standard
        )
    }

    /// The three words, each as its contract word.
    func save(_ words: SessionsWords) {
        defaults.set(words.show.rawValue, forKey: Self.showKey)
        defaults.set(words.group.rawValue, forKey: Self.groupKey)
        defaults.set(words.sort.rawValue, forKey: Self.sortKey)
    }
}
